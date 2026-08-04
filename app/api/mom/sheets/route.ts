import { NextRequest, NextResponse } from "next/server";
import { writeMomToSheet } from "@/lib/meetai/google/sheets";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { MomDocument } from "@/lib/meetai/types";
import { upsertMeeting } from "@/lib/meetai/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/mom/sheets — writes the verified MOM into Google Sheets with the
 * exact Section 7 layout. The user's OAuth access token (chrome.identity,
 * spreadsheets scope) travels with the request and is never stored.
 * Body: { googleAccessToken, spreadsheetId?, mom, logoUrl?, meetingId? }
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      googleAccessToken?: string;
      spreadsheetId?: string;
      mom?: MomDocument;
      logoUrl?: string;
      meetingId?: string;
    };
    if (!body.googleAccessToken) {
      return NextResponse.json(
        { error: "googleAccessToken is required — sign in with Google from the extension." },
        { status: 400 }
      );
    }
    if (!body.mom) {
      return NextResponse.json({ error: "mom document is required" }, { status: 400 });
    }

    const result = await writeMomToSheet({
      accessToken: body.googleAccessToken,
      spreadsheetId: body.spreadsheetId,
      mom: body.mom,
      logoUrl: body.logoUrl,
    });

    if (body.meetingId) {
      void upsertMeeting({
        id: body.meetingId,
        title: `MOM ${body.mom.projectName ?? ""}`.trim(),
        ended_at: new Date().toISOString(),
        status: "done",
        spreadsheet_url: result.spreadsheetUrl,
        mom_json: body.mom,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err, (err as { status?: number }).status ?? 500);
  }
}
