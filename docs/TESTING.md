# FOI-MeetAI — Testing & Hardening Checklist (Phases 1–5)

Run these after deployment, then after any prompt/router change.

## Phase 1 — Foundation smoke test

1. `GET /api/ai/chat` → `{"ok":true…}` (backend alive).
2. `GET /api/settings` → all providers show `⬜ not_configured` on a fresh deploy.
3. In the extension wizard: paste one Groq key → **Test Connection** → ✅.
4. Join a test Google Meet (two accounts, or play a YouTube Hindi/English
   interview in the captured tab as an audio source).
5. Start → recording badge `● REC` → popup line count grows every chunk.
6. Stop → Sheet link appears; tab `MOM_<Project>_<DDMMYY>` created with all
   sections; hidden `Transcript_…` tab present.

## Phase 2 — Multi-platform & fallback

- Repeat the smoke test on Zoom Web and Teams Web (platform printed in the
  extension debug log).
- **Fallback game** (the important one): in the wizard, temporarily break the
  primary provider's key (one character). Start a 1-minute meeting. Expected:
  the meeting still transcribes via provider #2 and the debug log shows
  `stt <primary> failed — auth | stt <secondary> success`. No user-facing error.
- Rate-limit simulation: set `GROQ_MODEL` to a nonexistent model while a second
  key exists → same silent failover; health table shows ⚠️/❌ states.
- Provider priority re-order (settings `sttPriority`/`llmPriority`) changes the
  order shown in the `attempts` array.

## Phase 3 — Accuracy pipeline

- Say a made-up-sounding statement in the meeting ("the client approved the
  gypsum rate of ₹95 per sqft"), then check the MOM: the Decisions/Action rows
  must quote that exact line in Source Quote. If audio was garbled, the row is
  yellow-flagged, not silently wrong.
- Say "I need this by end of week" → due date converts from the meeting date AND
  carries `(inferred from 'end of week' — confirm exact date)`.
- Leave owners vague ("someone should update the BOQ") → owner becomes
  "Unidentified Speaker — confirm owner", never a guessed name.
- Express mild disagreement politely → Client Concerns section stays EMPTY.
  Then say "this is the third time I'm saying this, it's unacceptable" → it
  appears with severity and verbatim-close quote.
- `POST /api/verify` with a deliberately fabricated MOM row → response drops or
  flags it (`verification.unsupported` non-empty).

## Phase 4 — Output polish

- Sheet styling matches `docs/SHEETS_TEMPLATE.md` (navy/gold, merges, Arial).
- Conditional formatting: add a test action due within 3 days → row turns RED;
  set its Status to Done (edit cell) → row turns GREEN.
- PDF downloads and matches the Sheet sections; logo renders if configured.
- Gmail draft exists in Drafts with the PDF attached; NOT sent.
- Kill your Wi-Fi for 60s mid-meeting → chunks queue (popup keeps counting on
  reconnect) — transcript contains no multi-minute hole.

## Phase 5 — Hardening

- **2+ hour meeting**: run on continuous music/podcast audio. Confirm chunk
  pagination keeps working (segments grow linearly; live analysis succeeds;
  final pass completes — backend splits nothing, the LLM receives the full
  chronological transcript text).
- Close the laptop lid for 3 minutes mid-meeting → on wake, recording resumes
  where Chrome resumes the tab; no panic error state in the popup.
- Kill the extension (reload in chrome://extensions) mid-meeting → reopen popup:
  state rehydrated from `chrome.storage.session` (recording shows again on the
  same tab reload; start again if Chrome revoked capture).
- Settings → debug panel (footer "debug log") shows the full attempt chain per
  call — useful only for the admin; end users never see provider errors.

## CI-style checks (for the coding agent / developer)

```bash
npm run typecheck   # tsc --noEmit  (must be clean)
npm run lint        # eslint        (no errors)
npm run build       # next build    (must succeed; all /api & /meetings routes listed)
node --check extension/content/*.js        # content scripts
node tools/make-icons.mjs                  # regenerate icons if brand changes
```
