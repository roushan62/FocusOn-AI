import { NextRequest, NextResponse } from "next/server";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { getMeeting, upsertMeeting } from "@/lib/meetai/store";

export const runtime = "nodejs";

/** GET/PATCH /api/meetings/[id] — meeting detail with transcript + final MOM. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;
  try {
    const { id } = await params;
    const result = await getMeeting(id);
    if (!result.meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    await upsertMeeting({ id, ...body } as Parameters<typeof upsertMeeting>[0]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
