import { NextRequest, NextResponse } from "next/server";
import { applyVerification, runVerification } from "@/lib/meetai/pipeline";
import { assertApiAuth, jsonError, keysFromRequest } from "@/lib/meetai/api-helpers";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/verify — the accuracy gate (spec Section 8.2).
 * Body: { transcriptText, momJson, extractionProviderId?, providerKeys? }
 * Returns the MOM JSON with unsupported items dropped or marked
 * "⚠️ Please verify", plus the verification outcome for the debug panel.
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      transcriptText?: string;
      momJson?: Record<string, unknown>;
      extractionProviderId?: string;
      providerKeys?: Record<string, string>;
    };
    if (!body.transcriptText?.trim()) {
      return NextResponse.json({ error: "transcriptText is required" }, { status: 400 });
    }
    if (!body.momJson || typeof body.momJson !== "object") {
      return NextResponse.json({ error: "momJson is required" }, { status: 400 });
    }

    const { routed } = await runVerification(body.transcriptText, body.momJson, {
      userKeys: keysFromRequest(req, body.providerKeys),
      extractionProviderId: body.extractionProviderId,
    });

    const verified = applyVerification(body.momJson, routed.result);

    return NextResponse.json({
      momJson: verified,
      verification: routed.result,
      verifierProvider: routed.providerId,
      attempts: routed.attempts,
    });
  } catch (err) {
    return jsonError(err);
  }
}
