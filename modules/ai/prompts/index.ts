// AI Agent Prompts Index
// Each agent has a system prompt and Zod schemas for input/output validation

export { ESTIMATOR_SYSTEM_PROMPT, EstimatorOutputSchema } from "./estimator";
export type { EstimatorOutput } from "./estimator";

export { EMAIL_SYSTEM_PROMPT, EmailOutputSchema } from "./email";
export type { EmailOutput } from "./email";

export { SITE_AGENT_PROMPT, SiteAnalysisOutputSchema } from "./site";
export type { SiteAnalysisOutput } from "./site";

export { DOCUMENT_AGENT_PROMPT, DocumentExtractionOutputSchema } from "./document";
export type { DocumentExtractionOutput } from "./document";
