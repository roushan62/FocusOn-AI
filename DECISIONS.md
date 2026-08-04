# DECISIONS.md — FOI-MeetAI architectural decisions

Every non-obvious choice, why it was made, and what would change my mind.

## D1. Backend lives inside the existing FocusOn AI Next.js app (no separate /backend app)
The spec asked for a `/backend` Next.js app; this repository already IS the
FocusOn Next.js backend on Vercel. Splitting a second app would double deploys
and config for zero benefit — the meeting API routes (`/api/transcribe`,
`/api/analyze`, `/api/verify`, `/api/diarize`, `/api/vision`, `/api/mom/*`,
`/api/settings`, `/api/health`, `/api/meetings`) are additive modules under
`app/api/`, driven by `lib/meetai/*`. If the two products need independent
scaling later, `lib/meetai` is a self-contained package boundary.

## D2. Keys travel per request instead of only env vars
Users have a mix of free/paid keys, per person. Requiring env edits would
violate "zero-config for non-technical users". Keys are pasted once into the
extension wizard → `chrome.storage.local` → sent with each request
(`providerKeys`). Server env vars + an AES-256-GCM Supabase vault
(`KEY_VAULT_SECRET`) remain as org-wide defaults. Precedence: request → env →
vault. (Risk accepted: keys cross the wire to the user's own backend over TLS —
same exposure as any client of that backend.)

## D3. One generic ProviderRouter, not per-task bespoke retry logic
`lib/meetai/provider-router.ts` implements the spec's exact loop (priority
order, skip-no-key, skip-cooldown, record-success/failure, continue silently,
`AllProvidersFailedError` only at exhaustion). STT, extraction, verification
and vision all reuse it, so a fix improves every path. Cooldowns differ by
error kind (rate-limit 5m, quota 6h, auth 24h). Health dual-writes to memory
and Supabase `meet_provider_health` (best-effort; serverless instances are
ephemeral).

## D4. Stateless-by-default pipeline; Supabase strictly additive
The extension holds meeting state and resends context (transcript windows,
extraction-so-far) with each call. Every API route works from its payload
alone, so the entire product runs on a bare Vercel deploy — matching "complete
project, nothing else required". Supabase migration 007 adds durable meeting
history/transcript archive/health/vault; all writes are fire-and-forget so a
DB outage can never lose a meeting.

## D5. Audio chunking by recorder restart, not `timeslice`
MediaRecorder `timeslice` emits non-decodable continuation fragments. We stop
and restart the recorder every ~18s (`chunkSeconds` configurable 10–30), so
each chunk is a complete WebM that any STT provider can decode independently.
Cost: a sub-100ms gap per chunk — acceptable against the alternative of
provider-specific stitchers.

## D6. Offscreen document uploads directly; SW orchestrates
MV3: audio capture must live in an offscreen document (reason `USER_MEDIA`)
using `tabCapture.getMediaStreamId`. Uploads happen there (FormData + retry +
IndexedDB offline queue), because the service worker can be suspended mid-meeting
and `chrome.runtime.sendMessage` cannot carry Blobs. Results are messaged back
to the SW for accumulation; the session snapshot is mirrored to
`chrome.storage.session` every few chunks for crash recovery.

## D7. Google auth via extension `chrome.identity`, not a server OAuth dance
The token (Sheets + gmail.compose scopes) is obtained client-side and relayed
to `/api/mom/sheets` per call; the server never stores it. This removes the
OAuth callback/cookie/session plumbing entirely and passes Web Store review
more easily. Trade-off: `manifest.json` needs the user's OAuth client ID — a
one-time paste documented in SETUP.md, unavoidable for unpacked extensions.

## D8. Verification pass prefers a different model family
`/api/verify` reorders the chain Claude → GPT-4o → Gemini → Groq → … and
prefers any provider ≠ the extractor. A second model is far more sceptical of
the first model's quotes than the first model re-reading itself. If only one
key exists, it still runs (self-check beats no check) and provenance records it.

## D9. Accuracy = anchor-or-drop + visible flags (the honest "100%")
Extraction prompt hard-requires `sourceTimestamp`+`sourceQuote` per item;
items that can't cite are instructed to be dropped; the verifier independently
drops/`⚠️`-flags; inferred dates and unconfirmed attendees are labelled in the
Sheet cells themselves; low-confidence rows are yellow, never hidden; raw
transcript lives in a hidden tab + Supabase. Rationale in docs/ACCURACY.md.

## D10. Sheets layout generated via REST batchUpdate (no client library)
`lib/meetai/google/sheets.ts` composes Section 7's layout as
`batchUpdate` request objects (merges, navy/gold styling, Arial, conditional
formatting via custom formulas `AND(Status="Pending", due<=TODAY()+3)` red,
`Status="Done"` green) + one `values.put` — no `googleapis` dependency, keeping
the serverless bundle small. Transcript archived as one line per cell in a
hidden tab (10M-cell limit respected by slicing).

## D11. Live analysis is incremental-with-memory
Every ~2 min the SW calls `/api/analyze` over the full transcript-so-far plus
the previous extraction (the prompt instructs "merge and improve"), instead of
extracting per-window and stitching — stitching structured JSON reliably is
much harder. Final pass (`final:true`) reprocesses the entire transcript once
for de-duplication and chronology, per spec.

## D12. DOM adapters fail soft; captions enrich, never replace, STT
Meet/Zoom/Teams selectors are layered arrays per platform behind one adapter
interface. DOM changes (they happen monthly) degrade enrichment (names,
captions), never the transcript — audio timestamps are the source of truth.
Captions are merged as additional `(caption)` transcript lines so platform
captions can backstop low-quality mic/tab audio.

## D13. jsPDF for the branded PDF (server-side)
Already a dependency; builds the Section-7 structure with navy/gold branding
and returns bytes directly (also base64 JSON variant for the Gmail-draft flow).

## D14. Optional bearer token rather than required auth
`MEETAI_API_TOKEN` gates all meeting routes when set; unset → open workspace,
consistent with this repo's existing no-signup concept. Internal tool + token
optional = least friction; production deployments should set it (documented).

## D15. No framework in the extension
MV3 + Web Store review favors plain, auditable JS. Shared settings/fetch live in
`lib/config.js` (ES module for SW/offscreen/popup/options); content scripts use
the classic global-namespace pattern because content scripts can't be ESM.
