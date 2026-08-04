import { NextRequest, NextResponse } from "next/server";
import { UserKeyMap } from "./types";

/** Shared plumbing for FOI-MeetAI API routes. */

/**
 * Optional shared-secret guard. When MEETAI_API_TOKEN is set, every
 * /api/meetai endpoint requires `Authorization: Bearer <token>` (the
 * extension stores it in chrome.storage — Settings screen). When unset the
 * deployment is an open workspace (consistent with this app's demo mode).
 */
export function assertApiAuth(req: NextRequest): NextResponse | null {
  const token = process.env.MEETAI_API_TOKEN;
  if (!token) return null;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${token}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Extension sends provider keys either as a JSON `providerKeys` body field
 *  or as an `x-foi-keys` JSON header (URL-safe base64 not required because
 *  keys are ASCII). */
export function keysFromRequest(req: NextRequest, bodyKeys?: unknown): UserKeyMap {
  if (bodyKeys && typeof bodyKeys === "object") {
    return bodyKeys as UserKeyMap;
  }
  const header = req.headers.get("x-foi-keys");
  if (header) {
    try {
      return JSON.parse(header) as UserKeyMap;
    } catch {
      /* ignore malformed header */
    }
  }
  return {};
}

export function jsonError(err: unknown, status = 500): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  const isAllFailed = (err as Error).name === "AllProvidersFailedError";
  return NextResponse.json(
    {
      error: message,
      kind: isAllFailed ? "all_providers_failed" : (err as { name?: string }).name ?? "error",
      attempts: (err as { attempts?: unknown }).attempts,
    },
    { status: isAllFailed ? 503 : status }
  );
}

/** Safe integer parsing. */
export function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
