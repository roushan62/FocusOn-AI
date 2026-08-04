import { NextRequest, NextResponse } from "next/server";
import { runVisionClassification } from "@/lib/meetai/pipeline";
import { assertApiAuth, jsonError, keysFromRequest, asInt } from "@/lib/meetai/api-helpers";
import { SCREEN_CATEGORIES } from "@/lib/meetai/glossary";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/vision — screen-context tagging (spec Section 6.4).
 * Body: { imageBase64, mimeType, atMs, providerKeys }
 * Returns { category } one of: BOQ, Drawing, Excel, Schedule/Gantt, PPT, RFI, Other.
 * On any failure returns { category: "Other" } — screen tagging must never
 * interrupt transcription.
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      imageBase64?: string;
      mimeType?: string;
      atMs?: number;
      providerKeys?: Record<string, string>;
    };
    if (!body.imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }
    const routed = await runVisionClassification(
      { base64: body.imageBase64, mimeType: body.mimeType ?? "image/jpeg" },
      { userKeys: keysFromRequest(req, body.providerKeys) }
    );
    const matched = SCREEN_CATEGORIES.find(
      (c) => c.toLowerCase() === routed.result.toLowerCase()
    );
    return NextResponse.json({
      category: matched ?? "Other",
      atMs: asInt(body.atMs, 0),
      provider: routed.providerId,
    });
  } catch (err) {
    if ((err as Error).name === "AllProvidersFailedError") {
      return NextResponse.json({ category: "Other", atMs: 0, degraded: true });
    }
    return jsonError(err);
  }
}
