import { defaultLogSink, getCooldownRemaining, recordFailure, recordSuccess } from "./provider-health";
import { AllProvidersFailedError, ProviderError } from "./http";
import { ProviderContext } from "./types";

/**
 * ProviderRouter — the reliability heart of FOI-MeetAI (spec Section 5.3).
 *
 * One generic router drives STT, extraction, verification and vision calls.
 * It walks a priority-ordered list of providers, skips ones without a key or
 * in cooldown, and never surfaces provider errors to the meeting flow — the
 * caller only sees the winning result (or one AllProvidersFailedError after
 * EVERY configured provider was exhausted).
 */

export interface Provider<Req, Res> {
  id: string;
  displayName: string;
  /** env var names, checked in order; ctx.userKeys[this.id] wins first */
  envKeys: string[];
  call(req: Req, apiKey: string, ctx: ProviderContext): Promise<Res>;
}

export function resolveApiKey(
  provider: { id: string; envKeys: string[] },
  ctx: Pick<ProviderContext, "userKeys">
): string {
  const fromUser = ctx.userKeys[provider.id];
  if (fromUser) return fromUser;
  for (const envName of provider.envKeys) {
    const val = process.env[envName];
    if (val) return val;
  }
  return "";
}

export interface RoutedResult<Res> {
  result: Res;
  providerId: string;
  attempts: Array<{ providerId: string; outcome: string; error?: string }>;
}

export async function callWithFallback<Req, Res>(
  task: ProviderContext["task"],
  payload: Req,
  providers: Array<Provider<Req, Res>>,
  ctx: Omit<ProviderContext, "task"> & { orderedIds?: string[] }
): Promise<RoutedResult<Res>> {
  const log = defaultLogSink({ ...ctx, task });
  const failures: Array<{ providerId: string; error: string; kind?: string }> = [];
  const attempts: Array<{ providerId: string; outcome: string; error?: string }> = [];

  // Optional user-defined priority order (list of provider ids); others keep
  // their built-in order afterwards.
  let ordered = providers;
  if (ctx.orderedIds?.length) {
    const rank = new Map(ctx.orderedIds.map((id, i) => [id, i]));
    ordered = [...providers].sort(
      (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)
    );
  }

  for (const provider of ordered) {
    const apiKey = resolveApiKey(provider, { userKeys: ctx.userKeys });
    const startedAt = Date.now();

    if (!apiKey) {
      attempts.push({ providerId: provider.id, outcome: "not_configured" });
      continue;
    }

    const remaining = getCooldownRemaining(provider.id, task);
    if (remaining > 0) {
      attempts.push({
        providerId: provider.id,
        outcome: "skipped_cooldown",
        error: `cooldown ${Math.ceil(remaining / 1000)}s remaining`,
      });
      log({
        at: new Date().toISOString(),
        task,
        providerId: provider.id,
        outcome: "skipped_cooldown",
        message: `${Math.ceil(remaining / 1000)}s remaining`,
      });
      continue;
    }

    try {
      const result = await provider.call(payload, apiKey, { ...ctx, task, log });
      recordSuccess(provider.id, task);
      const durationMs = Date.now() - startedAt;
      log({
        at: new Date().toISOString(),
        task,
        providerId: provider.id,
        outcome: "success",
        durationMs,
      });
      attempts.push({ providerId: provider.id, outcome: "success" });
      return { result, providerId: provider.id, attempts };
    } catch (err) {
      const kind = err instanceof ProviderError ? err.kind : "unavailable";
      const message = (err as Error).message;
      recordFailure(provider.id, task, kind, message);
      failures.push({ providerId: provider.id, error: message, kind });
      attempts.push({ providerId: provider.id, outcome: "failed", error: message });
      log({
        at: new Date().toISOString(),
        task,
        providerId: provider.id,
        outcome: "failed",
        errorKind: kind,
        message,
        durationMs: Date.now() - startedAt,
      });
      continue; // silently try the next provider
    }
  }

  throw new AllProvidersFailedError(task, failures.length ? failures : [
    { providerId: "(none)", error: "No provider API keys configured — add one in Settings." },
  ]);
}
