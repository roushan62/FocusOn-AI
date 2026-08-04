import { NextRequest, NextResponse } from "next/server";
import { buildMomPdf } from "@/lib/meetai/pdf";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { MomDocument } from "@/lib/meetai/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/mom/pdf — branded PDF export of the verified MOM.
 * Body: { mom, logoDataUrl?, format? } — format "base64" returns JSON for the
 * Gmail-draft flow; anything else streams application/pdf.
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      mom?: MomDocument;
      logoDataUrl?: string;
      format?: string;
    };
    if (!body.mom) {
      return NextResponse.json({ error: "mom document is required" }, { status: 400 });
    }
    const bytes = buildMomPdf(body.mom, body.logoDataUrl);
    const safeProject = (body.mom.projectName || "Meeting").replace(/[^\w-]+/g, "-").slice(0, 40);
    const filename = `MOM_${safeProject}_${body.mom.meetingDate?.slice(0, 10) ?? ""}.pdf`;

    if (body.format === "base64") {
      return NextResponse.json({
        base64: Buffer.from(bytes).toString("base64"),
        filename,
      });
    }
    return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
