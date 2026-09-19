import { Type } from "@google/genai";

/**
 * Turns a recruiter's one-sentence free-text search into two artifacts:
 * - `filters`: objective, machine-applicable predicates we can run locally
 *   against the JSON dataset with no LLM in the loop (see FilterService).
 * - `rubric`: the subjective "what good looks like" statement that a later
 *   LLM call (score.prompt.ts) uses to rank whatever the filters let through.
 *
 * Design choice: filters and rubric are asked for in the SAME call, not two
 * calls. A single free-text sentence usually mixes objective and subjective
 * signal in the same clause ("startups" is filterable by company_type, but
 * "who ships fast" is not) - splitting them is a language-understanding task
 * the model should do once, with full context, rather than us guessing which
 * half of the sentence belongs to which prompt.
 */
export function buildInterpretPrompt(query: string): string {
  return `You are helping a recruiter turn a free-text search into a structured search.

Recruiter's search: "${query}"

Produce two things:

1. OBJECTIVE FILTERS - only include a constraint if the recruiter's text actually implies it.
   Do not invent constraints they did not ask for. Leave arrays empty / numbers null when the
   text gives no signal for that field.
   - skills: array of specific skill/technology keywords (match the dataset's own terms where
     obvious, e.g. "RDS" -> "AWS RDS", "Node" -> "Node.js").
   - years_experience_min / years_experience_max: numeric bounds if a range or minimum is implied.
   - locations: array of city names if a location is implied.
   - company_types: subset of ["startup", "scaleup", "enterprise", "agency"] if company background
     is implied (e.g. "worked at startups" -> ["startup"]).

2. SUBJECTIVE FIT RUBRIC - what makes a candidate a strong fit for this specific search, beyond
   the objective filters. Write it as if briefing a colleague who will judge candidates by hand.
   - summary: one or two sentences capturing what "good" looks like for this search.
   - criteria: 3-5 short bullet points a judge could actually apply to a resume (e.g. "depth over
     breadth in the core stack", "career trajectory shows increasing ownership", not vague praise).

Return JSON only, matching the schema.`;
}

export const INTERPRET_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    filters: {
      type: Type.OBJECT,
      properties: {
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        years_experience_min: { type: Type.NUMBER, nullable: true },
        years_experience_max: { type: Type.NUMBER, nullable: true },
        locations: { type: Type.ARRAY, items: { type: Type.STRING } },
        company_types: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["skills", "years_experience_min", "years_experience_max", "locations", "company_types"],
    },
    rubric: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["summary", "criteria"],
    },
  },
  required: ["filters", "rubric"],
};
