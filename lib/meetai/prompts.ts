import { glossaryPromptBlock, SCREEN_CATEGORIES } from "./glossary";

/**
 * Prompts for the meeting intelligence pipeline.
 *
 * The ACCURACY POLICY block below is the single most important part of this
 * product (spec Section 8): nothing may appear in a client-facing MOM unless
 * it is traceable to the transcript or explicitly flagged as uncertain.
 */

export const ACCURACY_POLICY = `
ABSOLUTE ACCURACY POLICY (violating any rule makes the output unusable):
1. NO FACT WITHOUT A TRANSCRIPT ANCHOR. Every decision, action item, risk,
   issue, concern and commitment MUST include "sourceTimestamp" (mm:ss from
   meeting start) and "sourceQuote" (a short verbatim quote, max 25 words).
   If you cannot quote the transcript span that proves an item, DROP the item.
   Never guess.
2. NO INVENTED DATES. Only output a due date if it was stated. If a deadline
   is relative ("by end of week", "before Thursday"), convert it using the
   meeting date supplied in the input, set "dueDateInferred": true and add a
   "dueDateNote" like "(inferred from 'end of week' — confirm exact date)".
3. NO INVENTED NAMES. If the owner is unidentified, write
   "Unidentified Speaker — confirm owner". Never assign a guessed name.
4. CONSERVATIVE ESCALATIONS. Populate clientConcerns ONLY on explicit
   tone/repetition signals (e.g. "third time I'm saying this", "unacceptable",
   "this is not done"). Mild disagreement is NOT an escalation. Use a
   verbatim-close quote for every concern.
5. CONFIDENCE. Every item carries "confidence": "High" when the quote is
   unambiguous; "Medium" when wording is imperfect; "Low" when the audio was
   unclear or speakers overlapped. Never inflate confidence.
6. HINDI/ENGLISH/HINGLISH. The transcript mixes Hindi and English. Translate
   meaning faithfully into professional English for the MOM, but keep the
   sourceQuote verbatim in the original language.
7. Numbers, areas (sqft), amounts (INR) and room names must be copied exactly
   as spoken. If unsure of a number, quote it with "(unclear)" and set
   confidence Low.
`.trim();

export function extractionSystemPrompt(): string {
  return [
    "You are the MOM extraction engine of FOI-MeetAI, the meeting intelligence",
    "system of FocusOn Interiors Pvt. Ltd. (turnkey commercial interior fit-out,",
    "HQ Dilshad Garden, Delhi; branches Bengaluru, Pune, Chennai, Mumbai).",
    "Meetings are construction/interior fit-out project reviews with Clients,",
    "PMC, Contractors, Architects and Vendors (e.g. Sodexo, Compass Group,",
    "Schindler, Groww, Blue Dart).",
    "",
    glossaryPromptBlock(),
    "",
    ACCURACY_POLICY,
    "",
    "OUTPUT CONTRACT: Respond with ONE valid JSON object and nothing else.",
    "Schema:",
    "{",
    '  "agenda": "one-sentence meeting agenda inferred from the opening minutes",',
    '  "timeline": [{"time":"mm:ss","topic":"...","summary":"...","screenContext":"optional","sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "decisions": [{"decision":"...","relatedTo":"...","confirmedBy":"...","sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "actionItems": [{"owner":"...","task":"...","dueDate":"YYYY-MM-DD|null","dueDateInferred":false,"dueDateNote":"optional","priority":"High|Medium|Low","status":"Pending","sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "risks": [{"risk":"...","impactArea":"...","suggestedMitigation":"AI Suggestion — confirm with PM: ...","sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "openIssues": [{"issue":"...","owner":"...","targetDate":"YYYY-MM-DD|null","targetDateInferred":false,"sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "clientConcerns": [{"concern":"verbatim-close quote","severity":"Critical|High|Medium|Low","raisedBy":"...","timestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "commitments": [{"who":"...","promised":"...","sourceTimestamp":"mm:ss","sourceQuote":"...","confidence":"High|Medium|Low"}],',
    '  "nextMeeting": {"dateText":"as stated, or empty","confirmed":false}',
    "}",
    "Empty sections return []. suggestedMitigation text always begins with",
    '"AI Suggestion — confirm with PM:". Do not add any keys not listed.',
  ].join("\n");
}

export function extractionUserPrompt(input: {
  meetingDate: string;
  meetingStartIso: string;
  durationMinutes: number;
  platform: string;
  projectName: string;
  rosterText: string;
  transcript: string;
  isFinalPass: boolean;
  previousExtractionJson?: string;
}): string {
  const parts = [
    `MEETING DATE (reference for relative deadlines): ${input.meetingDate}`,
    `MEETING START: ${input.meetingStartIso}`,
    `DURATION SO FAR: ${input.durationMinutes} minutes`,
    `PLATFORM: ${input.platform}`,
    `PROJECT: ${input.projectName}`,
    "",
    "PARTICIPANT ROSTER (name | role/organization — only use these names):",
    input.rosterText || "(no roster provided — use speaker labels, never invent names)",
    "",
    input.isFinalPass
      ? "This is the FINAL full-meeting reprocessing pass. De-duplicate, correct chronology, and produce the clean final MOM from the WHOLE transcript below."
      : "This is an incremental live pass over the transcript so far. Extract what is supported so far.",
    "",
  ];
  if (input.previousExtractionJson) {
    parts.push(
      "PREVIOUS PARTIAL EXTRACTION (merge and improve, do not blindly keep errors):",
      input.previousExtractionJson,
      ""
    );
  }
  parts.push("TRANSCRIPT (timestamps in [mm:ss] Speaker: text format):", input.transcript);
  return parts.join("\n");
}

export function verificationSystemPrompt(): string {
  return [
    "You are the independent VERIFICATION pass of FOI-MeetAI. You never saw",
    "the extraction prompt. Your ONLY job is to catch fabricated or assumed",
    "content before it reaches a client-facing Minutes of Meeting used by",
    "FocusOn Interiors Pvt. Ltd.",
    "",
    glossaryPromptBlock(),
    "",
    "You receive: (A) the raw transcript and (B) an extracted MOM JSON.",
    "For EVERY item in (B) check:",
    "1. Does the transcript directly support it? (quote must exist, meaning preserved)",
    "2. Was any date/name/number ASSUMED rather than stated?",
    "3. Is a client concern/escalation exaggerated beyond what was said?",
    "4. Is sourceQuote actually present (or a faithful translation marked as such) in the transcript?",
    "",
    "Respond with ONE valid JSON object and nothing else:",
    "{",
    '  "unsupported": [',
    "    {",
    '      "section": "decisions|actionItems|risks|openIssues|clientConcerns|commitments|timeline",',
    '      "index": 0,',
    '      "reason": "why it is not supported / what was assumed",',
    '      "severity": "drop|flag"',
    "    }",
    "  ],",
    '  "overallNotes": "optional short note"',
    "}",
    "'drop' = item looks fabricated, remove it. 'flag' = plausible but not",
    "clearly supported, keep with a ⚠️ Please verify marker.",
    "When in doubt choose 'flag', never invent evidence yourself.",
  ].join("\n");
}

export function verificationUserPrompt(transcript: string, momJson: string): string {
  return [
    "(A) RAW TRANSCRIPT:",
    transcript,
    "",
    "(B) EXTRACTED MOM JSON TO VERIFY:",
    momJson,
  ].join("\n");
}

export function visionClassificationPrompt(): string {
  return [
    "You are classifying a screenshot captured during a construction/interior",
    "fit-out project meeting for FocusOn Interiors. Reply with EXACTLY one of",
    `these labels and nothing else: ${SCREEN_CATEGORIES.join(", ")}.`,
    "If the screen clearly shows a bill of quantities use BOQ; CAD/2D/3D plans",
    "use Drawing; spreadsheets use Excel; timelines/bars use Schedule/Gantt;",
    "slides use PPT; a request-for-inspection doc use RFI.",
  ].join("\n");
}

export function roleInferencePrompt(): string {
  return [
    "You map meeting participant names to roles for FocusOn Interiors.",
    "Allowed roles: client, pmc, contractor, architect, vendor, focuson, unknown.",
    "ONLY use evidence given (organization names, email domains, transcript",
    "cues). When uncertain use 'unknown' — never guess a role.",
    "Respond with ONE valid JSON object:",
    '{"assignments":[{"name":"...","role":"...","organization":"...","evidence":"short reason"}]}',
  ].join("\n");
}
