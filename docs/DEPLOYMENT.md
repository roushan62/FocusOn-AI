# Deployment Guide

## 1. Backend → Vercel (one click)

1. Push this repository to GitHub (done — you're reading it).
2. In Vercel: **Add New → Project → Import** this repo → **Deploy**.
   No build settings needed (Next.js is auto-detected).
3. Optional env vars (Vercel → Project → Settings → Environment Variables):

   | Variable | Required | Purpose |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Connect Supabase (adds meeting history, health table, key vault) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-side writes for the meeting pipeline |
   | `KEY_VAULT_SECRET` | Optional | Enables the encrypted server-side API-key vault |
   | `MEETAI_API_TOKEN` | Recommended if URL is public | Extension must send this bearer token |
   | Provider keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, …) | Optional | Org-wide fallback keys — see `docs/PROVIDERS.md` |

   **The system works with zero env vars** as long as each user's extension has at
   least one STT key + one LLM key pasted into its Settings screen (keys travel
   per request). Env vars exist for convenience/org-wide defaults.

4. Supabase (optional): create a project, run `database/migrations/001…007` in
   order in the SQL editor. Without it, the app uses its local adapter and the
   meeting flow simply skips durable history.

Health-check: open `https://<your-app>/api/ai/chat` → expect `{"ok":true,…}`,
and `GET /api/settings` → the provider table JSON.

## 2. Chrome extension

Internal use (recommended now): **Load unpacked** — steps in `docs/SETUP.md` §B.
Remember to put your OAuth Client ID into `extension/manifest.json` (`oauth2.client_id`).

Chrome Web Store (later): fill the listing, keep `<all_urls>` host permissions
justification handy (the backend URL is user-configurable, which is why broad
host access is requested — narrow it to your Vercel domain + the three meeting
platforms before publishing if you prefer a faster review).

## 3. OAuth notes

- Google OAuth client type must be **Chrome Extension** with the exact extension ID;
- if you publish to the Web Store the ID becomes stable — update the OAuth client then.
- Sheets + Gmail calls go directly from the browser extension to Google using the
  user's token; the backend only relays Sheets API writes server-side with that
  same token (never stored).

## 4. Verifying the deployment

Run the walkthrough in `docs/TESTING.md`: a 2-minute simulated meeting verifies
capture → transcribe → analyze → verify → Sheet end-to-end, and the kill-switch
game (turning off each provider) verifies the fallback chain.
