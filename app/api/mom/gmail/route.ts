import { NextRequest, NextResponse } from "next/server";
import { createGmailDraft } from "@/lib/meetai/google/gmail";
import { buildMomPdf } from "@/lib/meetai/pdf";
import { assertApiAuth, jsonError } from "@/lib/meetai/api-helpers";
import { MomDocument } from "@/lib/meetai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/mom/gmail — creates (never sends) a Gmail draft with the MOM PDF
 * attached (spec Section 7). Token comes from chrome.identity
 * (gmail.compose scope) and is never stored.
 * Body: { googleAccessToken, to?: string[], mom, sheetUrl? }
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      googleAccessToken?: string;
      to?: string[];
      mom?: MomDocument;
      sheetUrl?: string;
    };
    if (!body.googleAccessToken || !body.mom) {
      return NextResponse.json(
        { error: "googleAccessToken and mom are required" },
        { status: 400 }
      );
    }

    const pdfBytes = buildMomPdf(body.mom);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const dateText = (body.mom.meetingDate ?? "").slice(0, 10);
    const project = body.mom.projectName || "Project";

    const draft = await createGmailDraft({
      accessToken: body.googleAccessToken,
      to: body.to ?? [],
      subject: `MOM — ${project} — ${dateText}`,
      bodyText: [
        "Dear All,",
        "",
        `Please find attached the Minutes of Meeting for ${project} held on ${dateText}.`,
        body.sheetUrl ? `\nOnline copy: ${body.sheetUrl}` : "",
        "",
        "Kindly review and share any corrections or additions.",
        "",
        "Regards,",
        "FocusOn Interiors",
        "",
        `(${body.mom.disclaimer})`,
      ].join("\n"),
      pdfBase64,
      pdfFilename: `MOM_${project.replace(/[^\w-]+/g, "-")}_${dateText}.pdf`,
    });

    return NextResponse.json({ draftId: draft.draftId });
  } catch (err) {
    return jsonError(err);
  }
}
