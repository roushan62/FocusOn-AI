import { z } from "zod";

export const SITE_AGENT_PROMPT = `You are a Site AI for an interior fit-out company. Analyze Daily Progress Reports (DPR) and site photos to provide:
1. Progress summary (% completion, work done today)
2. Issues and delays identification
3. Material and labour requirements for next day
4. Safety observations

Keep responses concise and actionable. For photo analysis, describe what you see in terms of construction progress.`;

export const SiteAnalysisOutputSchema = z.object({
  progress_percent: z.number().min(0).max(100),
  work_done_today: z.string(),
  issues_found: z.array(z.string()).optional(),
  safety_concerns: z.array(z.string()).optional(),
  next_day_plan: z.string().optional(),
  materials_needed: z.array(
    z.object({
      material: z.string(),
      quantity: z.number(),
      unit: z.string(),
    })
  ).optional(),
});

export type SiteAnalysisOutput = z.infer<typeof SiteAnalysisOutputSchema>;
