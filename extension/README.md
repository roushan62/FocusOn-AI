# FOI-MeetAI Chrome Extension (MV3)

Observes Google Meet / Zoom Web / Teams Web meetings, captures tab audio,
streams chunks to the FocusOn AI backend, and on Stop writes a verified
Minutes of Meeting into Google Sheets (plus branded PDF + Gmail draft).

## Files

```
manifest.json                 MV3 manifest (MV3 service worker, offscreen, identity)
background/service-worker.js  Conductor: capture orchestration, live analysis,
                              screenshot tagging, stop→verify→Sheet pipeline,
                              badge + notifications, crash-safe session mirror
content/platform-base.js      Adapter interface + DOM helpers
content/adapters/meetAdapter.js   Google Meet DOM adapter
content/adapters/zoomAdapter.js   Zoom Web DOM adapter
content/adapters/teamsAdapter.js  MS Teams Web DOM adapter
content/content-main.js       Watches DOM → streams participants/speaking/captions
offscreen/offscreen.html|js   tabCapture stream + MediaRecorder; uploads chunks;
                              IndexedDB offline queue for dropped connections
popup/popup.html|js           Per-meeting UI: project name, who's-who roster,
                              Start/Stop, progress, Sheet/PDF/Gmail links
options/options.html|js       One-time wizard: backend URL, company profile,
                              provider keys + "Test Connection", defaults
lib/config.js                 chrome.storage settings + authenticated fetch helper
icons/                        Generated brand icons (tools/make-icons.mjs)
```

## Load unpacked (internal use)

1. `chrome://extensions` → Developer mode ON → **Load unpacked** → choose this folder.
2. Put your Google OAuth Client ID (Chrome Extension type) in `manifest.json → oauth2.client_id`.
3. Click the toolbar icon → **⚙ Settings** → complete the wizard (backend URL + at
   least one STT key + one LLM key) → Save.
4. Full non-technical walkthrough: `../docs/SETUP.md`.

## Platform detection

`popup.js#detectPlatform` maps the tab URL to `google_meet | zoom | ms_teams`.
The matching content-script adapter (declared per-host in the manifest) scrapes
participant names, active-speaker hints and captions; everything fails soft —
audio timestamps remain the source of truth if a platform changes its markup.

## Permissions rationale

| Permission | Why |
|---|---|
| `tabCapture` | The only reliable tab-audio source in MV3 |
| `offscreen` | MediaRecorder must live in an offscreen document in MV3 |
| `identity` | Google OAuth token for Sheets/Gmail (user-consented, revocable) |
| `activeTab`, `tabs` | `captureVisibleTab` screenshots for screen tagging |
| `alarms` | Live analysis ticks + service-worker keep-alive while recording |
| `storage` (local+session) | Settings, crash-safe session mirror |
| `notifications` | "MOM ready" toast with the Sheet link |
| `<all_urls>` host | Backend URL is user-configurable per deployment |

## Privacy

Audio chunks go only to the configured backend + the user's own AI providers.
API keys live only in `chrome.storage.local` (plus optional encrypted server
vault). Gmail scope only creates drafts — nothing is ever auto-sent.
