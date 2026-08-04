import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat request to Groq and return the text response.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.3
): Promise<string> {
  const response = await groq.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Send a chat request and parse the JSON response using a Zod schema.
 * Retries once if parsing fails.
 */
export async function structuredChatCompletion<T extends z.ZodType>(
  messages: ChatMessage[],
  schema: T,
  model: string = DEFAULT_MODEL,
  temperature: number = 0.2
): Promise<z.infer<T>> {
  let result: string;

  for (let attempt = 0; attempt < 2; attempt++) {
    result = await chatCompletion(messages, model, temperature);

    try {
      // Find JSON block in the response
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, result];
      const jsonStr = jsonMatch[1] || result;
      const parsed = JSON.parse(jsonStr.trim());
      return schema.parse(parsed);
    } catch (err) {
      if (attempt === 1) {
        console.error("Failed to parse AI JSON after retry:", result);
        throw new Error("AI response could not be parsed into valid structured data. Please try again.");
      }
      // Add a correction message for the retry
      messages.push({
        role: "assistant",
        content: result,
      });
      messages.push({
        role: "user",
        content: `Your previous response was not valid JSON matching the schema. Please respond ONLY with valid JSON inside a \`\`\`json code block. No other text.`,
      });
    }
  }

  throw new Error("Unexpected: retry loop exited without result");
}

export { groq };
