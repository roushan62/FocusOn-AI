import { z } from "zod";

export const DOCUMENT_AGENT_PROMPT = `You are a Document AI for an interior fit-out company. Extract structured data from uploaded documents:
- BOQ/Quotation PDFs: Extract line items, rates, quantities, totals
- Excel sheets: Parse material lists, cost breakdowns
- Compare uploaded BOQ against system BOQ and flag differences
- Summarize contracts and agreements

Always return structured JSON with clear field names.`;

export const DocumentExtractionOutputSchema = z.object({
  document_type: z.enum(["boq", "quotation", "contract", "invoice", "other"]),
  summary: z.string(),
  line_items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      rate: z.number().optional(),
      amount: z.number().optional(),
    })
  ).optional(),
  total_amount: z.number().optional(),
  parties: z.array(z.string()).optional(),
  dates: z.array(z.string()).optional(),
  key_terms: z.array(z.string()).optional(),
});

export type DocumentExtractionOutput = z.infer<typeof DocumentExtractionOutputSchema>;
