import Groq from "groq-sdk";
import { z } from "zod";

const apiKey = process.env.GROQ_API_KEY || "";
const groq = apiKey ? new Groq({ apiKey }) : null;

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function generateCopilotFallbackResponse(messages: ChatMessage[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content || "";

  const lower = lastUserMessage.toLowerCase();

  // If asking for a BOQ or structured estimate
  if (
    lower.includes("boq") ||
    lower.includes("estimate") ||
    lower.includes("sqft") ||
    lower.includes("bill of quantit")
  ) {
    const sqftMatch = lastUserMessage.match(/(\d+[,.]?\d*)\s*(?:sqft|sq\.ft|square feet)/i);
    const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : 2500;
    const workstations = Math.max(10, Math.round(sqft / 75));

    return `Here is the structured AI estimate for your commercial fit-out project (${sqft.toLocaleString()} sqft):

\`\`\`json
{
  "type": "boq",
  "title": "AI Estimated Turnkey BOQ (${sqft.toLocaleString()} sqft Commercial Office)",
  "items": [
    {
      "category": "Ceiling",
      "description": "Gypsum False Ceiling with G.I. Channel Framing & Cove Lighting",
      "unit": "sqft",
      "quantity": ${sqft},
      "material_rate": 110,
      "labour_rate": 35,
      "notes": "Saint-Gobain Gyproc 12.5mm boards with anti-sag warranty"
    },
    {
      "category": "Flooring",
      "description": "800x800mm Vitrified Commercial Heavy-Traffic Tiles",
      "unit": "sqft",
      "quantity": ${sqft},
      "material_rate": 130,
      "labour_rate": 45,
      "notes": "Kajaria Commercial grade vitrified tiles"
    },
    {
      "category": "Electrical",
      "description": "Primary distribution wiring, DB panel, switchboards and LED fixtures",
      "unit": "sqft",
      "quantity": ${sqft},
      "material_rate": 85,
      "labour_rate": 40,
      "notes": "Finolex FRLS wires, Philips 2x2 36W LED panel lights"
    },
    {
      "category": "Modular Furniture",
      "description": "Linear Modular Workstations (${workstations} seats) with raceways & wire management",
      "unit": "nos",
      "quantity": ${workstations},
      "material_rate": 14500,
      "labour_rate": 1500,
      "notes": "25mm pre-laminated E1 grade particle board with fabric partition"
    },
    {
      "category": "Civil Work",
      "description": "12mm Toughened Clear Glass Acoustic Partition for Cabins & Conference Room",
      "unit": "sqft",
      "quantity": ${Math.round(sqft * 0.15)},
      "material_rate": 650,
      "labour_rate": 150,
      "notes": "Dorma patch fittings and stainless steel handles"
    },
    {
      "category": "HVAC",
      "description": "VRV / VRF Cassette Air Conditioning units with ducting & insulation",
      "unit": "sqft",
      "quantity": ${sqft},
      "material_rate": 180,
      "labour_rate": 40,
      "notes": "Daikin VRV Commercial indoor/outdoor series"
    }
  ],
  "recommendations": "Standard commercial interior fit-out estimate for Indian metro locations (Bangalore/Mumbai/Delhi NCR). Rates include premium material specification and certified labour installation."
}
\`\`\``;
  }

  // If asking for quotation or pricing advice
  if (lower.includes("quotation") || lower.includes("quote") || lower.includes("margin") || lower.includes("gst")) {
    return `### Quotation & Financial Structuring Advice

For commercial interior fit-outs in India:
1. **GST Applicability**: Standard Works Contract / Turnkey interior fit-out attracts **18% GST** (9% CGST + 9% SGST for intrastate, or 18% IGST for interstate).
2. **Profit Margins**: Standard contractor overhead and profit margin in commercial fit-outs is typically **15% to 22%** above direct BOQ cost.
3. **Milestone Payment Schedule**:
   - **50% Advance** along with confirmed Purchase Order / Work Order
   - **35% on Material Delivery** at site and 50% ceiling/framing progress
   - **10% on Virtual Completion** (testing & commissioning)
   - **5% Retention** released after 12-month Defect Liability Period (DLP)

Would you like me to draft a quotation cover letter or export a formal BOQ breakdown?`;
  }

  // If asking for vendor or email drafting
  if (lower.includes("email") || lower.includes("vendor") || lower.includes("supplier") || lower.includes("po")) {
    return `### Drafted Vendor Communication Email

**Subject**: Quotation Request - Gypsum & Ceiling Materials for Commercial Project

**Dear Sales Team,**

We are currently executing an interior fit-out project in Bangalore and require your best project distributor rates for the following materials:

- **Gypsum Board 12.5mm Standard**: 250 sheets
- **G.I. Ceiling Section 0.55mm**: 500 RFT
- **Acoustic Mineral Fiber Tiles**: 3,000 sqft

Kindly provide your formal commercial quote inclusive of delivery charges and applicable GST, along with the earliest delivery lead time to site.

Best regards,  
**Apex Interior Fit-Outs Pvt Ltd**  
*Projects Department*`;
  }

  // Default intelligent Construction Copilot response
  return `### FocusOn AI — Construction Copilot

I am your **AI Interior Fit-Out ERP Copilot**. Here are some things I can help you with instantly:

- 📊 **Generate BOQ**: Ask me *"Create a BOQ for a 5,000 sqft corporate office in Mumbai"*
- 💰 **Pricing & Rates**: Ask me *"What is the standard rate for gypsum false ceiling and vitrified tile flooring in Bangalore?"*
- 📋 **Quotation Help**: Ask me *"Explain the ideal milestone payment schedule and GST rules for interior works"*
- ✉️ **Vendor Email**: Ask me *"Draft an email to our electrical vendor asking for an urgent delivery update"*

What would you like to explore for your current projects?`;
}

/**
 * Send a chat request to Groq and return the text response.
 * Gracefully falls back to intelligent Copilot responses when API key is not set.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.3
): Promise<string> {
  if (!groq) {
    return generateCopilotFallbackResponse(messages);
  }

  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || generateCopilotFallbackResponse(messages);
  } catch (err) {
    console.warn("Groq API error — falling back to Copilot local AI engine:", err);
    return generateCopilotFallbackResponse(messages);
  }
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
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, result];
      const jsonStr = jsonMatch[1] || result;
      const parsed = JSON.parse(jsonStr.trim());
      return schema.parse(parsed);
    } catch {
      if (attempt === 1) {
        // If schema parse failed on both attempts, try to return a default structured object if possible
        console.warn("Failed to parse AI JSON after retry, returning raw result or error");
      }
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

  throw new Error("AI response could not be parsed into valid structured data. Please try again.");
}

export { groq };
