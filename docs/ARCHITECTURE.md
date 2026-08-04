# FOI-MeetAI — Architecture

```
┌─ Chrome Extension (MV3) ─────────────────────────────────────────────┐
│ popup  →  service-worker.js  ←→  content scripts (Meet/Zoom/Teams)   │
│              │                        DOM events: participants,      │
│              │ tabCapture             active speaker, captions       │
│              ▼                                                     │
│        offscreen document   MediaRecorder, 15–30s chunks,           │
│        (audio bleed-through IndexedDB offline queue                  │
│         kept audible)                                               │
└──────────────│──────────────────────────────────────────────────────┘
               │ HTTPS (multipart audio · JSON · screenshots)
               ▼
┌─ Next.js backend (this repo, Vercel) ────────────────────────────────┐
│ /api/transcribe → ProviderRouter → STT chain                         │
│ /api/analyze    → ProviderRouter → LLM extraction chain              │
│ /api/verify     → ProviderRouter → independent verifier chain        │
│ /api/diarize    → roster + DOM cues + LLM role inference            │
│ /api/vision     → screenshot → screen-tag (BOQ/Drawing/…)           │
│ /api/mom/sheets → Google Sheets v4 (user OAuth token, never stored)  │
│ /api/mom/pdf    → jsPDF branded minutes                              │
│ /api/mom/gmail  → Gmail draft w/ PDF attachment (never auto-send)   │
│ /api/settings   → health table + encrypted key vault                 │
│ /api/health     → 1-packet "Test Connection" probes                  │
│ /api/meetings   → session registry + transcript archive (Supabase)   │
│ Dashboard /meetings → history, transcript viewer, provider health UI │
└──────────────────────────────────────────────────────────────────────┘
```

## Design principles

1. **The meeting flow never hard-fails on one provider.** Every AI call goes through
   `lib/meetai/provider-router.ts`. Providers are tried in priority order; rate-limit,
   quota, timeout and auth errors mark the provider for cooldown and the chain
   continues silently. The user only sees "Processing…" — provider errors live in
   the debug log and the settings health table.

2. **Stateless-by-default backend.** The extension owns meeting state (transcript
   accumulation, live extraction). Every backend route works on the payload it is
   given, so the whole pipeline functions on a bare Vercel deploy with zero
   database. Supabase (`database/migrations/007_meetai.sql`) adds durable history,
   the transcript archive, provider health across instances and the optional key
   vault — all writes are best-effort and never block the meeting.

3. **Accuracy as a pipeline, not a promise.** Extraction prompt forces
   `sourceTimestamp` + `sourceQuote` for every item; an independent verification
   pass (`/api/verify`, preferring a different model family) drops or marks
   unsupported items `⚠️ Please verify`; inferred dates and unconfirmed attendees
   are labelled, not hidden. See `docs/ACCURACY.md`.

4. **Keys travel with requests.** Free/paid keys are pasted once in the extension
   wizard, stored in `chrome.storage.local`, and sent per-request — so one build
   works for any teammate without editing env vars. Server-side env vars and the
   encrypted Supabase vault act as org-wide defaults and backup.

## Data flow (one meeting)

1. Popup "Start" → SW registers session (`POST /api/meetings`), gets
   `tabCapture` stream id, spawns the offscreen recorder.
2. Content scripts stream DOM context events (participants / speaking / captions).
3. Offscreen recorder produces an WebM chunk every ~18s → `POST /api/transcribe`
   → STT router → timestamped segments → SW accumulates + mirrors replies to
   `chrome.storage.session` every few chunks (crash safety).
4. Every 2 min: incremental `POST /api/analyze` keeps a live structured extraction.
5. Every ~45 s: `captureVisibleTab` → `POST /api/vision` → screen tag attached
   to the meeting clock (BOQ/Drawing/Excel/Schedule/PPT/RFI/Other).
6. "Stop": flush audio → `/api/diarize` (names + roles) → final full-transcript
   `/api/analyze?final` (de-duplicated, chronological) → `/api/verify` gate →
   assemble `MomDocument` → OAuth token (`chrome.identity`) →
   `POST /api/mom/sheets` (Section-7 layout + hidden raw-transcript tab) →
   optional PDF + Gmail draft → notification with links.

## Failure semantics

| Component | Failure | Behaviour |
|---|---|---|
| STT provider down/quota | next STT provider in chain (6 total, incl. local whisper) | seamless |
| Network drop mid-meeting | chunks parked in IndexedDB; flushed on reconnect | no loss |
| All STT providers down | chunk flagged failed, recording continues | gap, not crash |
| Live analysis fails | retried next tick with accumulated transcript | recovery |
| Verify pass unavailable | extraction kept; low-confidence rows still flagged | degraded, explicit |
| Google auth missing | MOM kept in extension; "Sign in" retry button re-runs ONLY the Sheet step | no reprocessing |

## Multi-platform notes

Platform is detected from the tab URL. DOM scraping per platform lives behind
`window.FOI.adapter` adapters (`meetAdapter.js`, `zoomAdapter.js`,
`teamsAdapter.js`) implementing one interface. DOM vendors change markup often;
every selector lookup fails soft — audio timestamps remain the source of truth
and captions merely enrich the transcript.
