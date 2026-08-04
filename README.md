# FocusOn AI — AI Interior Fit-Out ERP

FocusOn AI is a fast, open-workspace **Construction Copilot** for commercial interior fit-out teams. It brings estimating, procurement, site execution, documents, accounts and AI assistance into one Vercel-ready Next.js app.

## What works

- **AI Construction Copilot** — streaming BOQ, quotation, site-plan and email answers through `/api/ai/chat`
- **BOQ & estimating** — material + labour line items, AI-reviewed draft import, versions and INR totals
- **Quotations** — GST, discount, margin calculation, approval status and print/PDF workflow
- **Projects & clients** — fit-out scope, location, area, budget and delivery dates
- **Purchase orders** — vendor workflow, line items, GST totals and draft → approval → issue states
- **Vendors & materials** — reusable supplier and material database
- **Inventory** — received/consumed/available quantities with low-stock alerts
- **Site DPR** — daily progress, labour count, issues, delays and weather notes
- **Documents** — Supabase Storage uploads for drawings, BOQs, contracts and invoices
- **Accounts** — invoices, receipts/payments, outstanding balances and expenses
- **Reports** — project revenue, expenses, outstanding receivables and profitability
- **Open workspace** — demo data works immediately with localStorage; Supabase can be connected without adding a sign-up wall (the Reset demo control is shown only for local demo data)
- **Responsive shell** — mobile navigation, keyboard-friendly modals and low-overhead client data fetching

## Stack

- Next.js 16 App Router + TypeScript + Tailwind CSS 4
- Supabase PostgreSQL / Storage (optional; local open-workspace adapter is included)
- Groq SDK for server-side AI calls
- Vercel-compatible Node.js route handler with SSE streaming

## Vercel setup

1. Import the repository into Vercel.
2. Add these variables in **Project → Settings → Environment Variables** for Preview and Production:

   | Variable | Required | Purpose |
   |---|---:|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Public Supabase key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-only admin integrations; never expose it |
   | `GROQ_API_KEY` | Recommended | Enables live Groq responses; the app has a local fallback without it |
   | `GROQ_MODEL` | Optional | Defaults to `llama-3.3-70b-versatile` |

3. Redeploy after changing environment variables. Never prefix a secret with `NEXT_PUBLIC_`.
4. Check the deployment with:

   ```text
   https://YOUR-DOMAIN.vercel.app/api/ai/chat
   ```

   A healthy response reports `ok: true` and the active provider (`groq` or `fallback`). The chat UI requests SSE streaming automatically, so the first tokens appear without waiting for the complete answer.

### Supabase database and storage

Run the SQL migrations in `database/migrations/` in numerical order:

```text
001_core_tables.sql
002_boq_quotation.sql
003_purchase_inventory.sql
004_site_accounts_docs_ai.sql
005_no_signup_open_concept.sql
006_documents_storage.sql
```

Migration 006 creates the public `documents` Storage bucket and its open-workspace policies. If you do not connect Supabase, the app uses the built-in localStorage database and mock storage automatically.

> The no-signup mode is intentionally an open demo workspace. Use authenticated Supabase policies and a tenant-aware company model before using it with confidential production data.

## Local development

```bash
npm install
cp .env.example .env.local   # optional; fill in real keys when available
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```

## API contract

`POST /api/ai/chat`

```json
{
  "stream": true,
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "Generate a BOQ for 5000 sqft" }
  ]
}
```

- `stream: true` returns Server-Sent Events: `{ "delta": "..." }` followed by `[DONE]`.
- `stream: false` returns `{ "response": "...", "provider": "groq" }`.
- `GET /api/ai/chat` is a safe health check and never returns the API key.
- Requests are validated, bounded to a practical conversation size and guarded against accidental request loops.
- If Groq is missing or temporarily unavailable, a useful local interior-fit-out fallback keeps the feature usable.

## License

Proprietary — all rights reserved.
