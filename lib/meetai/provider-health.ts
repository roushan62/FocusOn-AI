import {
  ProviderContext,
  ProviderHealthRecord,
  ProviderStatus,
  ProviderTask,
  RouteLog,
} from "./types";

/**
 * Provider health & cooldown tracking.
 *
 * Serverless instances are ephemeral, so health is kept in two tiers:
 *  1. An in-process map (fast path — survives for the life of the instance,
 *     which covers a whole meeting transcription session on Vercel).
 *  2. Best-effort persistence to Supabase `meet_provider_health` so the
 *     settings dashboard can show status across instances. This never throws.
 */

const COOLDOWN_MS: Record<string, number> = {
  rate_limit: 5 * 60 * 1000,
  quota: 6 * 60 * 60 * 1000,
  auth: 24 * 60 * 60 * 1000,
  unavailable: 60 * 1000,
  timeout: 30 * 1000,
  bad_response: 60 * 1000,
};

interface MemoryRecord extends ProviderHealthRecord {
  cooldownUntilMs?: number;
}

const memory = new Map<string, MemoryRecord>();
function keyOf(providerId: string, task: ProviderTask) {
  return `${task}:${providerId}`;
}

export function getCooldownRemaining(providerId: string, task: ProviderTask): number {
  const rec = memory.get(keyOf(providerId, task));
  if (!rec?.cooldownUntilMs) return 0;
  const remaining = rec.cooldownUntilMs - Date.now();
  if (remaining <= 0) {
    rec.cooldownUntilMs = undefined;
    rec.cooldownUntil = undefined;
    return 0;
  }
  return remaining;
}

function persist(record: ProviderHealthRecord) {
  // Fire-and-forget Supabase upsert. Dynamic import keeps this module usable
  // from edge contexts and safe when Supabase is not configured (mock mode).
  void (async () => {
    try {
      const { isUsingMockWorkspace, createServiceClient } = await import(
        "@/lib/supabase/client"
      );
      if (isUsingMockWorkspace()) return;
      const supabase = createServiceClient();
      await supabase.from("meet_provider_health").upsert(
        {
          provider_id: record.providerId,
          task: record.task,
          status: record.status,
          last_success_at: record.lastSuccessAt ?? null,
          last_failure_at: record.lastFailureAt ?? null,
          last_error: record.lastError ?? null,
          cooldown_until: record.cooldownUntil ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_id,task" }
      );
    } catch {
      /* never block the pipeline on health persistence */
    }
  })();
}

function update(
  providerId: string,
  task: ProviderTask,
  patch: Partial<MemoryRecord>
): ProviderHealthRecord {
  const existing = memory.get(keyOf(providerId, task)) ?? {
    providerId,
    task,
    status: "not_configured" as ProviderStatus,
  };
  const merged: MemoryRecord = { ...existing, ...patch, providerId, task };
  memory.set(keyOf(providerId, task), merged);
  const { cooldownUntilMs, ...record } = merged;
  void cooldownUntilMs;
  persist(record);
  return record;
}

export function recordSuccess(providerId: string, task: ProviderTask) {
  update(providerId, task, {
    status: "working",
    lastSuccessAt: new Date().toISOString(),
    lastError: undefined,
    cooldownUntil: undefined,
    cooldownUntilMs: undefined,
  });
}

export function recordFailure(
  providerId: string,
  task: ProviderTask,
  errorKind: string,
  message: string
) {
  const cooldownMs = COOLDOWN_MS[errorKind] ?? COOLDOWN_MS.unavailable;
  const status: ProviderStatus =
    errorKind === "auth"
      ? "invalid_key"
      : errorKind === "rate_limit" || errorKind === "quota"
        ? "rate_limited"
        : "unavailable";
  const cooldownUntilMs = errorKind === "auth" ? undefined : Date.now() + cooldownMs;
  update(providerId, task, {
    status,
    lastFailureAt: new Date().toISOString(),
    lastError: `${errorKind}: ${message}`.slice(0, 400),
    cooldownUntil: cooldownUntilMs ? new Date(cooldownUntilMs).toISOString() : undefined,
    cooldownUntilMs,
  });
}

export function markNotConfigured(providerId: string, task: ProviderTask) {
  if (!memory.has(keyOf(providerId, task))) {
    update(providerId, task, { status: "not_configured" });
  }
}

export function defaultLogSink(ctx: ProviderContext) {
  return (entry: RouteLog) => {
    ctx.log?.(entry);
    // Server-side structured log line — visible in Vercel logs, never to the user.
    console.log(
      `[FOI-MeetAI router] ${entry.task} ${entry.providerId} ${entry.outcome}` +
        (entry.message ? ` — ${entry.message}` : "")
    );
  };
}
