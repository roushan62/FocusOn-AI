import {
  LLM_PROVIDERS,
  LLMRequest,
  LLMResult,
  VERIFIER_PROVIDERS,
  visionProviders,
} from "./llm";
import { callWithFallback, RoutedResult } from "./provider-router";
import {
  extractionSystemPrompt,
  extractionUserPrompt,
  roleInferencePrompt,
  verificationSystemPrompt,
  verificationUserPrompt,
  visionClassificationPrompt,
} from "./prompts";
import { UserKeyMap } from "./types";
import { ProviderError } from "./http";

/**
 * High-level pipeline orchestration (extract → verify → classify → tag).
 * All functions go through the ProviderRouter so a single provider outage
 * never kills the pipeline.
 */

export interface LlmCallOptions {
  userKeys: UserKeyMap;
  timeoutMs?: number;
  orderedIds?: string[];
}

const DEFAULT_TIMEOUT = 45000;

export function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
    throw new ProviderError("bad_response", "LLM did not return parseable JSON");
  }
}

export async function runExtraction(
  input: Parameters<typeof extractionUserPrompt>[0] & { systemOverride?: string },
  opts: LlmCallOptions
): Promise<RoutedResult<Record<string, unknown>>> {
  const req: LLMRequest = {
    systemPrompt: input.systemOverride ?? extractionSystemPrompt(),
    userPrompt: extractionUserPrompt(input),
    jsonResponse: true,
    maxTokens: 8192,
    temperature: 0.1,
  };
  const routed = await callWithFallback<LLMRequest, LLMResult>(
    "llm_extract",
    req,
    LLM_PROVIDERS,
    { userKeys: opts.userKeys, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT, orderedIds: opts.orderedIds }
  );
  return { ...routed, result: extractJsonObject(routed.result.text) };
}

export interface VerificationOutcome {
  unsupported: Array<{ section: string; index: number; reason: string; severity: "drop" | "flag" }>;
  overallNotes?: string;
  skipped: boolean;
}

/**
 * Independent second pass (spec Section 8.2). Uses a different provider
 * family first (Claude → GPT → Gemini → …). If only one provider is
 * configured the router still runs the check with it — a self-check is
 * weaker than a cross-model check but still catches dropped fields and
 * format drift, and the provenance block records what happened.
 */
export async function runVerification(
  transcript: string,
  momJson: Record<string, unknown>,
  opts: LlmCallOptions & { extractionProviderId?: string }
): Promise<{ routed: RoutedResult<VerificationOutcome> }> {
  const req: LLMRequest = {
    systemPrompt: verificationSystemPrompt(),
    userPrompt: verificationUserPrompt(transcript, JSON.stringify(momJson, null, 1)),
    jsonResponse: true,
    maxTokens: 4096,
    temperature: 0,
  };
  // Prefer a verifier different from the extractor when possible.
  const preferred = [...VERIFIER_PROVIDERS].sort((a, b) => {
    if (a.id === opts.extractionProviderId) return 1;
    if (b.id === opts.extractionProviderId) return -1;
    return 0;
  });
  const routed = await callWithFallback<LLMRequest, LLMResult>(
    "llm_verify",
    req,
    preferred,
    { userKeys: opts.userKeys, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT }
  );
  const parsed = extractJsonObject(routed.result.text) as {
    unsupported?: Array<{ section: string; index: number; reason: string; severity: string }>;
    overallNotes?: string;
  };
  const outcome: VerificationOutcome = {
    unsupported: (parsed.unsupported ?? []).map((u) => ({
      section: String(u.section),
      index: Number(u.index) || 0,
      reason: String(u.reason ?? "Not clearly supported by transcript"),
      severity: u.severity === "drop" ? "drop" : "flag",
    })),
    overallNotes: parsed.overallNotes,
    skipped: false,
  };
  return { routed: { ...routed, result: outcome } };
}

const VERIFY_MARKER = "⚠️ Please verify";

/** Apply verification verdicts to an extracted MOM JSON object, in place. */
export function applyVerification(
  momJson: Record<string, unknown>,
  outcome: VerificationOutcome
): Record<string, unknown> {
  const bySection = new Map<string, Array<{ index: number; reason: string; severity: string }>>();
  for (const item of outcome.unsupported) {
    const list = bySection.get(item.section) ?? [];
    list.push(item);
    bySection.set(item.section, list);
  }
  for (const [section, items] of bySection) {
    const arr = momJson[section];
    if (!Array.isArray(arr)) continue;
    // Process in reverse index order so "drop" removals don't shift indexes.
    for (const { index, reason, severity } of [...items].sort((a, b) => b.index - a.index)) {
      const entry = arr[index] as Record<string, unknown> | undefined;
      if (!entry) continue;
      if (severity === "drop") {
        arr.splice(index, 1);
      } else {
        entry.verificationFlag = `${VERIFY_MARKER} — ${reason}`.slice(0, 300);
        if (entry.confidence === "High") entry.confidence = "Medium";
      }
    }
  }
  return momJson;
}

export async function runVisionClassification(
  image: { base64: string; mimeType: string },
  opts: LlmCallOptions
): Promise<RoutedResult<string>> {
  const req: LLMRequest = {
    systemPrompt: visionClassificationPrompt(),
    userPrompt: "Classify this meeting screen.",
    image,
    maxTokens: 16,
    temperature: 0,
  };
  const routed = await callWithFallback<LLMRequest, LLMResult>(
    "vision",
    req,
    visionProviders(),
    { userKeys: opts.userKeys, timeoutMs: opts.timeoutMs ?? 20000 }
  );
  return { ...routed, result: routed.result.text.trim().split(/\s+/)[0] };
}

export interface RosterAssignment {
  name: string;
  role: string;
  organization?: string;
  evidence?: string;
}

export async function runRoleInference(
  names: Array<{ name: string; organization?: string; sampleQuotes?: string[] }>,
  opts: LlmCallOptions
): Promise<RosterAssignment[]> {
  const req: LLMRequest = {
    systemPrompt: roleInferencePrompt(),
    userPrompt: `PARTICIPANTS:\n${names
      .map((n) => `- ${n.name} (${n.organization ?? "org unknown"}) cues: ${(n.sampleQuotes ?? []).join(" / ").slice(0, 200) || "none"}`)
      .join("\n")}`,
    jsonResponse: true,
    maxTokens: 1024,
    temperature: 0,
  };
  try {
    const routed = await callWithFallback<LLMRequest, LLMResult>(
      "llm_extract",
      req,
      LLM_PROVIDERS,
      { userKeys: opts.userKeys, timeoutMs: 20000 }
    );
    const parsed = extractJsonObject(routed.result.text) as {
      assignments?: RosterAssignment[];
    };
    return parsed.assignments ?? [];
  } catch {
    return []; // role inference is best-effort; roster "unknown" is safe
  }
}
