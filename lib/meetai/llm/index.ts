import { postJson, ProviderError } from "../http";
import { Provider } from "../provider-router";

/**
 * LLM providers in built-in fallback order (spec Section 5.2). The order of
 * the exported array defines the default chain; users can re-prioritize via
 * settings (orderedIds passed to the router).
 */

export interface LLMMessageImage {
  base64: string;
  mimeType: string;
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  /** ask the model for strict JSON output where the API supports it */
  jsonResponse?: boolean;
  image?: LLMMessageImage;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResult {
  text: string;
  model: string;
}

type LLMProvider = Provider<LLMRequest, LLMResult> & { visionCapable: boolean };

/* ------------------------------- OpenAI-style ---------------------------- */

function openAiStyleProvider(opts: {
  id: string;
  displayName: string;
  url: string;
  envKeys: string[];
  defaultModel: string;
  modelEnv: string;
  extraHeaders?: (apiKey: string) => Record<string, string>;
  visionCapable?: boolean;
}): LLMProvider {
  return {
    id: opts.id,
    displayName: opts.displayName,
    envKeys: opts.envKeys,
    visionCapable: opts.visionCapable ?? true,
    async call(req, apiKey, ctx) {
      const model = process.env[opts.modelEnv] || opts.defaultModel;
      const content: unknown = req.image
        ? [
            { type: "text", text: req.userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${req.image.mimeType};base64,${req.image.base64}` },
            },
          ]
        : req.userPrompt;
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content },
        ],
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.2,
      };
      if (req.jsonResponse) body.response_format = { type: "json_object" };
      const data = await postJson<{
        choices?: Array<{ message?: { content?: string } }>;
      }>(opts.url, body, { Authorization: `Bearer ${apiKey}`, ...(opts.extraHeaders?.(apiKey) ?? {}) }, ctx.timeoutMs);
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError("bad_response", "Empty completion from provider");
      return { text, model };
    },
  };
}

const groq = openAiStyleProvider({
  id: "groq",
  displayName: "Groq (Llama 3.3)",
  url: "https://api.groq.com/openai/v1/chat/completions",
  envKeys: ["GROQ_API_KEY"],
  defaultModel: "llama-3.3-70b-versatile",
  modelEnv: "GROQ_MODEL",
  visionCapable: false,
});

const openrouter = openAiStyleProvider({
  id: "openrouter",
  displayName: "OpenRouter",
  url: "https://openrouter.ai/api/v1/chat/completions",
  envKeys: ["OPENROUTER_API_KEY"],
  defaultModel: "meta-llama/llama-3.3-70b-instruct",
  modelEnv: "OPENROUTER_MODEL",
  extraHeaders: () => ({
    "HTTP-Referer": "https://focuson-ai.vercel.app",
    "X-Title": "FOI-MeetAI",
  }),
});

const openai = openAiStyleProvider({
  id: "openai",
  displayName: "OpenAI GPT-4o / GPT-4o-mini",
  url: "https://api.openai.com/v1/chat/completions",
  envKeys: ["OPENAI_API_KEY"],
  defaultModel: "gpt-4o-mini",
  modelEnv: "OPENAI_MODEL",
});

const deepseek = openAiStyleProvider({
  id: "deepseek",
  displayName: "DeepSeek",
  url: "https://api.deepseek.com/chat/completions",
  envKeys: ["DEEPSEEK_API_KEY"],
  defaultModel: "deepseek-chat",
  modelEnv: "DEEPSEEK_MODEL",
  visionCapable: false,
});

/* --------------------------------- Gemini -------------------------------- */

const gemini: LLMProvider = {
  id: "gemini",
  displayName: "Google Gemini",
  envKeys: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  visionCapable: true,
  async call(req, apiKey, ctx) {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const parts: unknown[] = [{ text: req.userPrompt }];
    if (req.image) {
      parts.push({
        inline_data: { mime_type: req.image.mimeType, data: req.image.base64 },
      });
    }
    const data = await postJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 4096,
          temperature: req.temperature ?? 0.2,
          ...(req.jsonResponse ? { responseMimeType: "application/json" } : {}),
        },
      },
      {},
      ctx.timeoutMs
    );
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");
    if (!text) throw new ProviderError("bad_response", "Empty completion from Gemini");
    return { text, model };
  },
};

/* -------------------------------- Anthropic ------------------------------- */

const anthropic: LLMProvider = {
  id: "anthropic",
  displayName: "Anthropic Claude",
  envKeys: ["ANTHROPIC_API_KEY"],
  visionCapable: true,
  async call(req, apiKey, ctx) {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const content: unknown = req.image
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: req.image.mimeType,
              data: req.image.base64,
            },
          },
          { type: "text", text: req.userPrompt },
        ]
      : req.userPrompt;
    const data = await postJson<{
      content?: Array<{ type: string; text?: string }>;
    }>(
      "https://api.anthropic.com/v1/messages",
      {
        model,
        system: req.systemPrompt,
        messages: [{ role: "user", content }],
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.2,
      },
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      ctx.timeoutMs
    );
    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    if (!text) throw new ProviderError("bad_response", "Empty completion from Claude");
    return { text, model };
  },
};

/* --------------------------------- Ollama --------------------------------- */

const ollama: LLMProvider = {
  id: "ollama",
  displayName: "Self-hosted Ollama",
  envKeys: ["OLLAMA_BASE_URL"],
  visionCapable: false,
  async call(req, apiKey, ctx) {
    // For Ollama the "key" is the base URL (e.g. http://localhost:11434).
    const base = apiKey.replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL || "llama3.1";
    const data = await postJson<{ choices?: Array<{ message?: { content?: string } }> }>(
      `${base}/v1/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        stream: false,
        temperature: req.temperature ?? 0.2,
      },
      {},
      Math.max(ctx.timeoutMs, 60000) // local models can be slower
    );
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new ProviderError("bad_response", "Empty completion from Ollama");
    return { text, model };
  },
};

/** Default chain per spec Section 5.2 */
export const LLM_PROVIDERS: LLMProvider[] = [
  gemini,
  groq,
  openrouter,
  anthropic,
  openai,
  deepseek,
  ollama,
];

/** Providers preferred for the independent verification pass: put a strong
 *  second-model family first so the verifier isn't the extractor grading
 *  its own homework. */
export const VERIFIER_PROVIDERS: LLMProvider[] = [
  anthropic,
  openai,
  gemini,
  groq,
  openrouter,
  deepseek,
  ollama,
];

export function visionProviders(): LLMProvider[] {
  return LLM_PROVIDERS.filter((p) => p.visionCapable);
}
