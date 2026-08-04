import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  chatCompletion,
  getConfiguredModel,
  getCopilotProvider,
  streamChatCompletion,
  type ChatMessage,
} from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(16_000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
  stream: z.boolean().optional().default(false),
  model: z.string().trim().min(1).max(120).optional(),
  temperature: z.number().min(0).max(1).optional().default(0.3),
});

// A small, per-instance guard. Vercel functions are intentionally stateless,
// so this is not a replacement for a distributed rate limiter, but it stops
// accidental request loops and protects the Groq key in a warm instance.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function getClientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "FocusOn AI Construction Copilot",
      provider: getCopilotProvider(),
      model: getConfiguredModel(),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientKey(request))) {
    return jsonError("Too many AI requests. Please wait a moment and try again.", 429);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 256_000) {
    return jsonError("Request is too large. Please send a shorter conversation.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Send a messages array with valid role and content fields.", 400);
  }

  const { messages, stream, model, temperature } = parsed.data;
  const totalCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  if (totalCharacters > 80_000) {
    return jsonError("Conversation is too long. Start a new chat or remove older messages.", 413);
  }

  const chatMessages = messages as ChatMessage[];

  if (stream) {
    const encoder = new TextEncoder();
    const bodyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of streamChatCompletion(chatMessages, getConfiguredModel(model), temperature)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(bodyStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  try {
    const response = await chatCompletion(chatMessages, getConfiguredModel(model), temperature);
    return NextResponse.json(
      { response, provider: getCopilotProvider() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("AI service unavailable. Please try again shortly.", 503);
  }
}
