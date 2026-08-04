/** Shared HTTP + error plumbing for AI providers. */

export type ProviderErrorKind =
  | "rate_limit"
  | "quota"
  | "timeout"
  | "auth"
  | "bad_response"
  | "unavailable";

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;

  constructor(kind: ProviderErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export class AllProvidersFailedError extends Error {
  attempts: Array<{ providerId: string; error: string; kind?: string }>;

  constructor(
    task: string,
    attempts: Array<{ providerId: string; error: string; kind?: string }>
  ) {
    super(
      `All configured providers failed for task "${task}". ` +
        attempts.map((a) => `${a.providerId}: ${a.error}`).join(" | ")
    );
    this.name = "AllProvidersFailedError";
    this.attempts = attempts;
  }
}

export function classifyHttpError(status: number, body: string): ProviderError {
  if (status === 401 || status === 403) {
    return new ProviderError("auth", `Authentication failed (${status})`, status);
  }
  if (status === 429) {
    return new ProviderError("rate_limit", `Rate limited (${status})`, status);
  }
  if (status === 402 || /quota|insufficient/i.test(body)) {
    return new ProviderError("quota", `Quota exceeded (${status})`, status);
  }
  if (status >= 500) {
    return new ProviderError("unavailable", `Provider server error (${status})`, status);
  }
  return new ProviderError("bad_response", `HTTP ${status}: ${body.slice(0, 200)}`, status);
}

async function readBodySafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** fetch with a hard timeout. Throws ProviderError("timeout") on expiry. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ProviderError("timeout", `Timed out after ${timeoutMs}ms`);
    }
    throw new ProviderError(
      "unavailable",
      `Network error: ${(err as Error).message}`
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function postJson<T = unknown>(
  url: string,
  payload: unknown,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    },
    timeoutMs
  );
  if (!res.ok) throw classifyHttpError(res.status, await readBodySafe(res));
  try {
    return (await res.json()) as T;
  } catch {
    throw new ProviderError("bad_response", "Provider returned non-JSON response");
  }
}

export async function postForm<T = unknown>(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    { method: "POST", headers, body: form },
    timeoutMs
  );
  if (!res.ok) throw classifyHttpError(res.status, await readBodySafe(res));
  try {
    return (await res.json()) as T;
  } catch {
    throw new ProviderError("bad_response", "Provider returned non-JSON response");
  }
}
