# FocusOn AI — AI Interior Fit-Out ERP (No-Signup Open Concept)

A production-grade **AI Interior Fit-Out ERP** (Construction Copilot) for commercial interior fit-out companies. Built with Next.js 16+, TypeScript, Tailwind CSS, and AI Copilot capabilities.

## ✨ Why "No-Signup Open Concept"?
FocusOn AI is designed with an **Instant Open Workspace** concept. No login, no registration, and no authentication hurdles are required.
- **Zero-Friction Access**: Open the app and you are immediately in the live ERP Dashboard preloaded with realistic commercial interior fit-out demo data (Bangalore/Mumbai corporate offices, BOQs, quotations, site reports, and accounts).
- **Offline & Zero-Config Capable**: Works 100% out of the box using our built-in Open Workspace database engine (`localStorage` + in-memory fallback), even without Supabase environment variables!
- **Real Backend Compatible**: If you connect a real Supabase database, run `/database/migrations/005_no_signup_open_concept.sql` to enable open workspace access on PostgreSQL without login requirements.
- **Reset Demo Data**: Easily reset to the pristine default dataset anytime using the "Reset Demo Data" button in the header.

## Features

- 🤖 **AI Copilot** — natural-language BOQ, quotation, and email generation
- 📋 **BOQ Generator** — structured bill of quantities with material & labour estimation
- 📄 **Quotation Generator** — professional PDF/DOCX/Excel exports with GST & margins
- 📊 **Purchase Orders** — vendor management with approval workflow
- 📦 **Inventory Management** — stock tracking, AI-powered alerts
- 🏗️ **Site Management** — daily progress reports, photo uploads, attendance
- 👁️ **AI Vision** — site photo & drawing analysis
- 💰 **Accounts** — invoices, payments, outstanding tracker, profit per project
- 📈 **Analytics Dashboard** — live KPIs for owners

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Database/Auth/Storage:** Supabase (PostgreSQL, RLS, Auth, Storage)
- **AI:** Groq API (`llama-3.3-70b-versatile` + vision models)

## Environment Variables (Set in Vercel Dashboard)

> ⚠️ **Important:** This app uses Vercel environment variables — there is no local `.env` file in production.  
> Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret — never expose) |
| `GROQ_API_KEY` | Groq API key for AI features |

## Database Setup

Run the SQL migration files in `/database/migrations/` in your Supabase SQL Editor, in numerical order.

## CI/CD

- Every push to `main` auto-deploys to Vercel production
- Every PR gets a unique preview URL
- GitHub Actions runs `lint` + `build` on every push/PR

## Getting Started (Local Dev)

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

## License

Proprietary — all rights reserved.
