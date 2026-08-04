import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const response = await chatCompletion(messages);

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error("AI Chat error:", error);
    const message = error instanceof Error ? error.message : "AI service unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
