import { NextRequest, NextResponse } from "next/server";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { listMeetings, upsertMeeting } from "@/lib/meetai/store";

export const runtime = "nodejs";

/**
 * GET  /api/meetings — list recorded meetings (dashboard).
 * POST /api/meetings — register/update a meeting session from the extension.
 */
export async function GET(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;
  try {
    return NextResponse.json({ meetings: await listMeetings() });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;
  try {
    const body = (await req.json()) as {
      id?: string; title?: string; project_name?: string; platform?: string;
      started_at?: string; ended_at?: string; status?: "recording" | "processing" | "done" | "error";
    };
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await upsertMeeting({
      id: body.id,
      title: body.title ?? "Meeting",
      project_name: body.project_name,
      platform: body.platform,
      started_at: body.started_at ?? new Date().toISOString(),
      ended_at: body.ended_at,
      status: body.status ?? "recording",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
