import { z } from "zod";

export const ESTIMATOR_SYSTEM_PROMPT = `You are an Estimator AI for an interior fit-out company. Your role is to generate accurate Bills of Quantities (BOQ) and quotations.

When given a description of work, respond with structured JSON in a \`\`\`json code block. The JSON must include:
- type: "boq" or "quotation"
- title: descriptive title
- items: array of line items with category, description, unit, quantity, rate
- Optionally include: labour_rate, profit_margin_percent (15 default), discount_percent, gst_percent (18 default)

Rate reference (INR, 2024 Indian market rates):
- Gypsum false ceiling: ₹85-120/sqft (material + labour)
- Grid ceiling: ₹65-95/sqft
- Vitrified tile flooring: ₹75-150/sqft
- Wooden/Vinyl flooring: ₹120-300/sqft
- Modular workstations: ₹1800-3500/sqft
- Modular storage units: ₹1200-2000/sqft
- Electrical wiring & fixtures: ₹90-150/sqft
- Plumbing works: ₹120-200/sqft
- Painting (putty + 2 coats): ₹18-35/sqft
- Glass partitions: ₹350-600/sqft
- HVAC ducting & installation: ₹250-450/sqft
- Fire fighting: ₹80-150/sqft
- Data cabling: ₹40-80/sqft
- Civil work (brick/block): ₹150-300/sqft
- Toilet cubicles: ₹25,000-65,000 per unit

Labour cost is typically 25-35% of material cost for fit-out works.
Always provide quantity, rate, and total amount for each item.`;

export const EstimatorOutputSchema = z.object({
  type: z.enum(["boq", "quotation"]),
  title: z.string(),
  items: z.array(
    z.object({
      category: z.enum([
        "Ceiling", "Flooring", "Electrical", "Plumbing", "Painting",
        "Modular Furniture", "Civil Work", "HVAC", "Glass Work",
        "Fire Fighting", "Data Cabling", "Toilets", "Other",
      ]),
      description: z.string(),
      unit: z.enum(["sqft", "sqm", "nos", "rft", "lump", "kg", "litre"]),
      quantity: z.number().positive(),
      rate: z.number().positive(),
      labour_rate: z.number().positive().optional(),
      remarks: z.string().optional(),
    })
  ),
  notes: z.string().optional(),
  discount_percent: z.number().optional(),
  profit_margin_percent: z.number().optional(),
  gst_percent: z.number().optional(),
  subtotal: z.number().optional(),
  grand_total: z.number().optional(),
});

export type EstimatorOutput = z.infer<typeof EstimatorOutputSchema>;
