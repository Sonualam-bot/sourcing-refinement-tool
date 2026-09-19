import { z } from "zod";

/**
 * These Zod schemas are the single source of truth for what we accept from the LLM.
 * They are intentionally kept separate from the Gemini `responseSchema` objects in
 * llm/prompts/*.ts: the responseSchema tells Gemini what shape to *produce*, this
 * schema is what we actually *trust* before rendering or applying anything. We never
 * assume the API honored the requested shape.
 */

export const FiltersSchema = z.object({
  skills: z.array(z.string()).default([]),
  years_experience_min: z.number().nullable().default(null),
  years_experience_max: z.number().nullable().default(null),
  locations: z.array(z.string()).default([]),
  company_types: z.array(z.string()).default([]),
});

export const RubricSchema = z.object({
  summary: z.string().min(1),
  criteria: z.array(z.string()).min(1),
});

export const InterpretResponseSchema = z.object({
  filters: FiltersSchema,
  rubric: RubricSchema,
});

export const ScoredProfileSchema = z.object({
  profile_id: z.string(),
  score: z.number().min(0).max(100),
  explanation: z.string().min(1),
});

export const ScoreResponseSchema = z.object({
  scores: z.array(ScoredProfileSchema),
});

export const RefineResponseSchema = z.object({
  filters: FiltersSchema,
  rubric: RubricSchema,
  what_changed: z.string().min(1),
});

export type InterpretResponse = z.infer<typeof InterpretResponseSchema>;
export type ScoreResponse = z.infer<typeof ScoreResponseSchema>;
export type RefineResponse = z.infer<typeof RefineResponseSchema>;
