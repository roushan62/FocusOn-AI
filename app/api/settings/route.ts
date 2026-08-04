import { NextRequest, NextResponse } from "next/server";
import { LLM_PROVIDERS } from "@/lib/meetai/llm";
import { STT_PROVIDERS } from "@/lib/meetai/stt";
import { resolveApiKey } from "@/lib/meetai/provider-router";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { readProviderHealth, readVaultKeys, saveVaultKey } from "@/lib/meetai/store";
import { encryptSecret, maskKey } from "@/lib/meetai/vault";
import { ProviderStatus } from "@/lib/meetai/types";

export const runtime = "nodejs";

/**
 * GET /api/settings — provider health table for the settings UI
 * (✅ working / ⚠️ rate-limited / ❌ invalid key / ⬜ not configured).
 * POST /api/settings — store a provider key (AES-256-GCM encrypted in
 * Supabase; requires KEY_VAULT_SECRET). Keys are never returned in full.
 */
export async function GET(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const vaultKeys = await readVaultKeys().catch((): Record<string, string> => ({}));
    const healthRows = await readProviderHealth();
    const healthMap = new Map(
      healthRows.map((h) => [`${h.task}:${h.provider_id}`, h])
    );

    const table = [...STT_PROVIDERS, ...LLM_PROVIDERS].map((provider) => {
      const ctx = { userKeys: vaultKeys, timeoutMs: 1000, task: "stt" as const };
      const configured = Boolean(resolveApiKey(provider, ctx));
      const task = STT_PROVIDERS.includes(provider as never) ? "stt" : "llm";
      const health = healthMap.get(`${task}:${provider.id}`) as
        | { status?: ProviderStatus; last_success_at?: string; last_failure_at?: string; last_error?: string; cooldown_until?: string }
        | undefined;
      let status: ProviderStatus = configured ? "working" : "not_configured";
      if (configured && health?.status && health.status !== "not_configured") {
        status = health.status;
      }
      return {
        id: provider.id,
        displayName: provider.displayName,
        task,
        configured,
        status,
        lastSuccessAt: health?.last_success_at ?? null,
        lastFailureAt: health?.last_failure_at ?? null,
        lastError: health?.last_error ?? null,
        cooldownUntil: health?.cooldown_until ?? null,
        maskedKey: configured && vaultKeys[provider.id] ? maskKey(vaultKeys[provider.id]) : null,
      };
    });

    return NextResponse.json({
      providers: table,
      vaultEnabled: Boolean(process.env.KEY_VAULT_SECRET),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as { providerId?: string; apiKey?: string };
    if (!body.providerId || !body.apiKey) {
      return NextResponse.json({ error: "providerId and apiKey are required" }, { status: 400 });
    }
    const known = [...STT_PROVIDERS, ...LLM_PROVIDERS].some((p) => p.id === body.providerId);
    if (!known) {
      return NextResponse.json({ error: "Unknown provider id" }, { status: 400 });
    }
    await saveVaultKey(body.providerId, encryptSecret(body.apiKey));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err, 400);
  }
}
