# FOI-MeetAI — Plain-Language Setup Guide (for non-technical users)

> Hand this page to whoever installs the tool. Nothing here requires coding knowledge.
> Total time: **about 20 minutes once**, then every meeting is one click.

---

## What you need (collect first)

1. A **Google account** (the one whose Google Drive will hold the MOM sheet).
2. The **backend URL** — whoever deployed this project to Vercel gives you a link like
   `https://focuson-ai.vercel.app`. (If that's you, see `docs/DEPLOYMENT.md` — one click.)
3. **At least one AI API key.** Free is fine. Easiest free options:
   - **Groq** (recommended for free): sign up at <https://console.groq.com> → "API Keys" → Create. This single key powers BOTH speech-to-text and fast MOM generation.
   - **Google Gemini**: <https://aistudio.google.com/apikey> → Create API key.
   - **Deepgram**: <https://console.deepgram.com> (free credit, best speaker separation).
4. Google Chrome on the computer used in meetings.

---

## A. Deploy the backend (one time, free)

If the backend is already deployed, skip this — you just need its URL.

1. Go to <https://vercel.com>, sign in with GitHub, click **Add New → Project**, pick this repository, press **Deploy**. No settings needed.
2. Copy the URL it gives you (e.g. `https://focuson-ai.vercel.app`). That's your **Backend URL**.

## B. Install the Chrome extension (5 minutes, one time)

1. Unzip/copy this repository's `extension/` folder somewhere permanent (don't delete it later).
2. In Chrome, type `chrome://extensions` in the address bar.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select the `extension/` folder.
5. The microphone-shaped **FOI icon** appears in the toolbar. Pin it (📌).
6. Copy the **Extension ID** shown under the extension name (looks like `abcdefghijklmnopqrstuvwxyzabcdef`). You need it for Step C.

## C. Create the Google connection (one time, ~7 minutes)

This lets the tool write your Minutes directly into Google Sheets.

1. Go to <https://console.cloud.google.com> and create a project (name: `FOI-MeetAI`, anything works).
2. **APIs & Services → Library**: enable these two APIs:
   - **Google Sheets API**
   - **Gmail API**
3. **APIs & Services → OAuth consent screen** → choose **External** → fill app name (`FOI-MeetAI`) and your email → Save through the defaults → add your Gmail as a **Test user** (important).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Chrome Extension**
   - Item ID: paste the **Extension ID** from Step B-6.
5. Copy the created **Client ID** (ends with `.apps.googleusercontent.com`).
6. Open the `extension/manifest.json` file in any text editor, find
   `"client_id": "PASTE_YOUR_GOOGLE_OAUTH_CLIENT_ID…"` and replace it with your real Client ID. Save.
7. Back in `chrome://extensions`, click ⟳ (reload) on the extension.

> Do this once per Chrome profile. You never have to think about it again.

## D. Extension setup wizard (one time, 3 minutes)

1. Click the extension icon → **⚙ Settings & Provider Keys** (or it opens automatically on first install).
2. **Backend URL**: paste your Vercel URL → **Test backend** → expect ✅.
3. **Company profile**: company name (pre-filled), your name ("Prepared By"), optional logo URL.
4. **Speech-to-Text keys**: paste what you have (e.g. Groq key) → **Test Connection** → expect ✅.
5. **LLM keys**: paste what you have (e.g. Gemini key) → **Test Connection** → ✅.
6. **Save all settings**. Done — setup is finished forever.

---

## Using it in a meeting (everyday flow — 30 seconds of effort)

1. Join your meeting in the browser: **Google Meet**, **Zoom (web)**, or **Teams (web)**.
2. Click the FOI icon → type the **project/client name** (e.g. "Sodexo — Gurugram Fit-out").
3. (Optional, 10 seconds) Click **↻ Scan call participants** and pick each person's role
   (Client / PMC / Contractor / Architect / Vendor / FocusOn). Skip it if busy — the AI will
   leave unconfirmed speakers flagged instead of guessing.
4. Press **● Start Meeting Assistant**. Chrome may show a one-time "Share this tab's audio" prompt — allow it.
   The toolbar badge turns red **REC**.
5. Run your meeting normally. Talk naturally — Hindi, English, Hinglish all fine.
6. When done, click the icon → **■ Stop & Generate MOM**. Wait ~30–90 seconds.
7. You get:
   - 📄 **Google Sheet link** — the formatted MOM (new tab in "FocusOn MOM Log").
   - ⬇ **PDF download** for circulation.
   - ✉️ **Gmail draft** (with the PDF attached) sitting in your Drafts — review and send.

**Always read the MOM before circulating** — anything the AI was unsure about is
already highlighted in yellow with a ⚠️ note, so checking takes two minutes.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "This tab is not a meeting" | Start the recording while the meeting tab is focused. |
| Transcription empty | Check Settings → Test Connection on your STT key; add a second provider as backup. |
| "Sign in with Google" button appears after Stop | Normal on first run — click it and approve. Your MOM then writes to Sheets. |
| Rate-limited warnings | The system is already using the next provider. Adding one more free key (e.g. OpenRouter) removes this almost entirely. |
| Nothing happens on Stop | Open the popup → footer → "debug log" and share it with whoever deployed the tool. |

## Privacy notes

- Audio chunks are sent only to your own backend URL and the AI providers whose keys you added.
- API keys live only in your browser storage (and optionally, encrypted, in your Supabase vault) — never in the code.
- The Gmail integration creates drafts only. **Nothing is ever auto-sent.**
