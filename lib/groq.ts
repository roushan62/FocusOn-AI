import Groq from "groq-sdk";
import { z } from "zod";

/**
 * The AI client is deliberately kept on the server. Never move this module into
 * a client component: GROQ_API_KEY must only exist in Vercel server env vars.
 */
export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_CHUNK_SIZE = 48;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type CopilotProvider = "groq" | "fallback";

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  return apiKey ? new Groq({ apiKey }) : null;
}

export function getConfiguredModel(model?: string): string {
  return model?.trim() || process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

function generateCopilotFallbackResponse(messages: ChatMessage[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content || "";

  const lower = lastUserMessage.toLowerCase();

  // Keep the no-key experience useful in local development and on a newly
  // deployed Vercel project while the GROQ key is being configured.
  if (
    lower.includes("boq") ||
    lower.includes("estimate") ||
    lower.includes("sqft") ||
    lower.includes("square feet") ||
    lower.includes("bill of quantit")
  ) {
    const sqftMatch = lastUserMessage.match(/(\d+[,.]?\d*)\s*(?:sqft|sq\.\s*ft|square feet)/i);
    const sqft = sqftMatch ? Number(sqftMatch[1].replace(/,/g, "")) : 2500;
    const workstations = Math.max(10, Math.round(sqft / 75));
    const glassArea = Math.max(250, Math.round(sqft * 0.15));

    return `Here is a practical first-pass estimate for a ${sqft.toLocaleString("en-IN")} sqft commercial fit-out. Please confirm the drawings, finish schedule and site conditions before issuing a client quote.

\`\`\`json
{
  "type": "boq",
  "title": "AI Estimated Turnkey BOQ (${sqft.toLocaleString("en-IN")} sqft Commercial Office)",
  "items": [
    {
      "category": "Ceiling",
      "description": "Gypsum false ceiling with GI channel framing and cove-light detail",
      "unit": "sqft",
      "quantity": ${sqft},
      "rate": 110,
      "labour_rate": 35,
      "remarks": "Saint-Gobain Gyproc 12.5mm boards; verify reflected ceiling plan"
    },
    {
      "category": "Flooring",
      "description": "800x800mm vitrified commercial heavy-traffic tiles",
      "unit": "sqft",
      "quantity": ${sqft},
      "rate": 130,
      "labour_rate": 45,
      "remarks": "Allow for wastage and skirting after final tile layout"
    },
    {
      "category": "Electrical",
      "description": "Distribution wiring, DB panel, switchboards and LED fixtures",
      "unit": "sqft",
      "quantity": ${sqft},
      "rate": 85,
      "labour_rate": 40,
      "remarks": "Finolex FRLS wires and commercial LED panels; coordinate with HVAC"
    },
    {
      "category": "Modular Furniture",
      "description": "Linear modular workstations (${workstations} seats) with raceways and cable management",
      "unit": "nos",
      "quantity": ${workstations},
      "rate": 14500,
      "labour_rate": 1500,
      "remarks": "25mm pre-laminated E1 board with fabric partition"
    },
    {
      "category": "Glass Work",
      "description": "12mm toughened clear-glass acoustic partitions for cabins and conference room",
      "unit": "sqft",
      "quantity": ${glassArea},
      "rate": 650,
      "labour_rate": 150,
      "remarks": "Dorma patch fittings; confirm acoustic and fire-rating requirements"
    },
    {
      "category": "HVAC",
      "description": "VRV/VRF cassette air-conditioning units with ducting and insulation",
      "unit": "sqft",
      "quantity": ${sqft},
      "rate": 180,
      "labour_rate": 40,
      "remarks": "Final selection depends on heat-load calculation"
    }
  ],
  "notes": "Indicative Indian metro fit-out rates. Excludes authority fees, loose furniture, major civil changes and taxes unless stated."
}
\`\`\``;
  }

  if (
    lower.includes("quotation") ||
    lower.includes("quote") ||
    lower.includes("margin") ||
    lower.includes("gst")
  ) {
    return `### Quotation & financial structuring advice

For a commercial interior fit-out in India:

1. **GST**: Apply the rate agreed with your tax advisor and client contract. The common works-contract assumption is 18% (9% CGST + 9% SGST, or 18% IGST).
2. **Margin**: Keep direct material, labour, site overheads, contingency and contractor margin separate. A 15–22% margin is a planning reference, not a substitute for your cost sheet.
3. **Milestones**: A practical starting point is 50% mobilisation, 35% on material delivery/progress, 10% at virtual completion and 5% retention subject to the signed work order.

Share the BOQ value, location and payment terms and I can structure a project-specific quotation summary.`;
  }

  if (
    lower.includes("email") ||
    lower.includes("vendor") ||
    lower.includes("supplier") ||
    lower.includes(" po ")
  ) {
    return `### Draft vendor email

**Subject:** Quotation request — ceiling and electrical materials

Dear Sales Team,

We are executing a commercial interior fit-out project and require your best project-distributor rates for the following:

- Gypsum board 12.5mm — quantity as per attached BOQ
- GI ceiling sections — quantity as per reflected ceiling plan
- Commercial LED panels and electrical accessories

Please share your quote inclusive of delivery, GST, warranty, brand/specification and earliest delivery date to site. Also confirm the validity of the rates.

Best regards,
**Projects Department**
**FocusOn AI Interior Projects**`;
  }

  return `### FocusOn AI Construction Copilot

I can help you move an interior fit-out project forward:

- **Estimate** a BOQ for an office, retail, hospitality or workspace project
- **Price** ceiling, flooring, electrical, HVAC, glass, civil and modular works
- **Draft** client, vendor and payment follow-up emails
- **Plan** daily site work, materials, labour and safety actions
- **Review** margins, GST assumptions and project risks

Try: *Generate a BOQ for a 5,000 sqft corporate office in Mumbai with gypsum ceiling, glass cabins and 40 workstations.*`;
}

function chunkText(text: string, size = FALLBACK_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

/** Send a complete chat request. It falls back to the local copilot when the
 * key is missing or Groq is temporarily unavailable. */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string = getConfiguredModel(),
  temperature = 0.3,
): Promise<string> {
  const groq = getGroqClient();
  if (!groq) return generateCopilotFallbackResponse(messages);

  try {
    const response = await groq.chat.completions.create({
      model: getConfiguredModel(model),
      messages,
      temperature,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || generateCopilotFallbackResponse(messages);
  } catch (error) {
    console.warn("Groq request failed; using local copilot fallback", error);
    return generateCopilotFallbackResponse(messages);
  }
}

/**
 * Stream tokens for the chat UI. Groq streaming gives a Claude-like first
 * response experience; the fallback is chunked too, so the UI never hangs
 * while an API key is being configured.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  model: string = getConfiguredModel(),
  temperature = 0.3,
): AsyncGenerator<string> {
  const groq = getGroqClient();

  if (!groq) {
    yield* chunkText(generateCopilotFallbackResponse(messages));
    return;
  }

  try {
    const stream = await groq.chat.completions.create({
      model: getConfiguredModel(model),
      messages,
      temperature,
      max_tokens: 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  } catch (error) {
    console.warn("Groq stream failed; using local copilot fallback", error);
    yield* chunkText(generateCopilotFallbackResponse(messages));
  }
}

/** Extract and validate a JSON response from a model, retrying once with a
 * correction prompt when the model adds prose or malformed JSON. */
export async function structuredChatCompletion<T extends z.ZodType>(
  messages: ChatMessage[],
  schema: T,
  model: string = getConfiguredModel(),
  temperature = 0.2,
): Promise<z.infer<T>> {
  let result = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = await chatCompletion(messages, model, temperature);

    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, result];
      const jsonStr = jsonMatch[1] || result;
      return schema.parse(JSON.parse(jsonStr.trim()));
    } catch {
      if (attempt === 1) break;
      messages.push({ role: "assistant", content: result });
      messages.push({
        role: "user",
        content: "Respond only with valid JSON inside a json code block matching the requested schema. No explanation.",
      });
    }
  }

  throw new Error("AI response could not be parsed into valid structured data. Please try again.");
}

/** Useful for health checks without exposing the secret itself. */
export function getCopilotProvider(): CopilotProvider {
  return getGroqClient() ? "groq" : "fallback";
}

export { generateCopilotFallbackResponse };
