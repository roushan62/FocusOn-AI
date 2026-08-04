/**
 * Gmail draft creator — builds an RFC822 message with the MOM PDF attached
 * and saves it to the user's Drafts (never auto-sends — spec Section 7).
 * Uses the OAuth token from chrome.identity (gmail.compose scope).
 */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8ToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

export async function createGmailDraft(input: {
  accessToken: string;
  to?: string[];
  subject: string;
  bodyText: string;
  pdfBase64: string;
  pdfFilename: string;
}): Promise<{ draftId: string }> {
  const boundary = "foi_meetai_boundary";
  const lines = [
    `To: ${(input.to ?? []).join(", ")}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    input.bodyText,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${input.pdfFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${input.pdfFilename}"`,
    "",
    input.pdfBase64,
    `--${boundary}--`,
  ];
  const raw = utf8ToBase64Url(lines.join("\r\n"));

  const res = await fetch(`${GMAIL}/drafts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Gmail authorization failed — sign in again from the extension popup."
        : `Gmail API error ${res.status}: ${body.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Gmail draft creation failed");
  return { draftId: data.id };
}
