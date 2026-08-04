# FOI-MeetAI — Provider Guide

*"koi bhi API kaam karni chahiye — free, free-tier, ya paid."*
Every provider below is **optional**; the system runs with any ONE working key
per chain and gets more reliable with each additional key.

## Speech-to-Text chain (default order)

| # | Provider | Env var | Cost | Notes |
|---|---|---|---|---|
| 1 | Groq Whisper (`groq_whisper`) | `GROQ_API_KEY` | Free tier | Very fast. Shares the Groq key with the LLM chain. Model: `GROQ_WHISPER_MODEL` (default `whisper-large-v3-turbo`) |
| 2 | Deepgram (`deepgram`) | `DEEPGRAM_API_KEY` | Free tier + paid | Built-in **speaker diarization** via utterances. Model: `DEEPGRAM_MODEL` (default `nova-2`) |
| 3 | AssemblyAI (`assemblyai`) | `ASSEMBLYAI_API_KEY` | Free tier + paid | Diarization + auto Hindi/English detection. Polls for short chunks only (chunks are ≤30s, so this is fast) |
| 4 | OpenAI Whisper (`openai_whisper`) | `OPENAI_API_KEY` | Paid | `whisper-1` verbose JSON segments |
| 5 | Google Cloud STT (`google_stt`) | `GOOGLE_STT_API_KEY` | Free tier | `hi-IN` + `en-IN` alternatives by default |
| 6 | Local Whisper (`local_whisper`) | `LOCAL_WHISPER_URL` | Self-hosted | whisper.cpp server or any OpenAI-compatible `/v1/audio/transcriptions` endpoint (Runpod/local). The "key" is the base URL |

## LLM chain (extraction → and, re-ordered for verification)

| # | Provider | Env var | Cost | Notes |
|---|---|---|---|---|
| 1 | Google Gemini (`gemini`) | `GEMINI_API_KEY` | Generous free tier | JSON mode + vision (screenshot tagging). Model: `GEMINI_MODEL` (default `gemini-2.0-flash`) |
| 2 | Groq (`groq`) | `GROQ_API_KEY` | Free tier | `GROQ_MODEL` (default `llama-3.3-70b-versatile`). Already used by the ERP copilot in this repo |
| 3 | OpenRouter (`openrouter`) | `OPENROUTER_API_KEY` | Free + paid models through ONE key | `OPENROUTER_MODEL` (default `meta-llama/llama-3.3-70b-instruct`) — the wide safety net |
| 4 | Anthropic Claude (`anthropic`) | `ANTHROPIC_API_KEY` | Paid | `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`). **Preferred for the verification pass** when present |
| 5 | OpenAI (`openai`) | `OPENAI_API_KEY` | Paid | `OPENAI_MODEL` (default `gpt-4o-mini`) |
| 6 | DeepSeek (`deepseek`) | `DEEPSEEK_API_KEY` | Very cheap | `deepseek-chat` |
| 7 | Ollama (`ollama`) | `OLLAMA_BASE_URL` | Self-hosted | OpenAI-compatible `/v1/chat/completions`; `OLLAMA_MODEL` (default `llama3.1`). Works with zero paid APIs |

Verification deliberately re-orders the chain (**Claude → GPT-4o → Gemini → …**) so
the checker is not the same model that produced the extraction. If only one
provider is configured it still runs as a self-check and provenance records it.

## Router behaviour (implemented in `lib/meetai/provider-router.ts`)

```
for provider in chain (user priority first):
  skip if no key
  skip if in cooldown (rate-limit 5m · quota 6h · auth 24h · transient 30-60s)
  try call (hard timeout: STT 30s, LLM 45s, vision 20s)
  on success → return { result, providerId, attempts }
  on failure → record health, continue silently
raise AllProvidersFailedError only after the whole chain was exhausted
```

- Health is kept in-memory per instance AND upserted to
  `meet_provider_health` (Supabase) so the Settings UI shows
  ✅ working / ⚠️ rate-limited / ❌ invalid key / ⬜ not configured.
- The `attempts` array is returned by every endpoint and written to the
  extension debug log — full observability without user-facing noise.

## Where keys come from (precedence)

1. The incoming request (`providerKeys` from the extension's `chrome.storage`)
2. Backend environment variables (table above) — set once in Vercel
3. Encrypted Supabase vault (`meet_api_key_vault`, AES-256-GCM with
   `KEY_VAULT_SECRET`) readable server-side when present

## Optional shared-secret for the API

Set `MEETAI_API_TOKEN` in Vercel and put the same value in the extension's
Settings → "Shared API token". Every API route then requires
`Authorization: Bearer <token>`. Recommended when the backend URL is public.
