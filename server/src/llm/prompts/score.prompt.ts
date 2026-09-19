import { Type } from "@google/genai";
import type { Profile, Rubric } from "../../types.js";

/**
 * Scores an already-filtered candidate pool against the subjective rubric.
 * Two decisions worth calling out:
 *
 * 1. We only ever send the objectively-filtered subset here, never the full
 *    48-profile pool. FilterService (pure, no LLM) does the cheap narrowing
 *    first; this call spends model budget only on genuinely subjective
 *    judgment, which is the one thing a hard filter can't do.
 *
 * 2. The prompt explicitly forbids generic praise and requires the
 *    explanation to name real field values. This is the direct mechanism
 *    behind the rubric requirement "explanations must cite actual fields
 *    from that profile" - it is enforced by instruction here, and can be
 *    spot-checked in ScoreService by confirming the explanation string
 *    contains at least one token drawn from the profile's own skills/
 *    company/title.
 */
export function buildScorePrompt(rubric: Rubric, profiles: Profile[]): string {
  const compact = profiles.map((p) => ({
    id: p.id,
    current_title: p.current_title,
    years_experience: p.years_experience,
    location: p.location,
    current_company: p.current_company,
    current_company_type: p.current_company_type,
    skills: p.skills,
    past_companies: p.past_companies,
    education: p.education,
    summary: p.summary,
  }));

  return `You are scoring candidates against a fit rubric for a recruiter.

RUBRIC
Summary: ${rubric.summary}
Criteria:
${rubric.criteria.map((c) => `- ${c}`).join("\n")}

CANDIDATES (JSON array, one object per candidate):
${JSON.stringify(compact, null, 2)}

For EVERY candidate above, return a score from 0-100 (100 = ideal fit) and a short explanation.

Rules for the explanation:
- 1-2 sentences, specific to this candidate.
- Must name real values from their record (e.g. an actual skill, their current_company, years_experience,
  current_company_type, or a past company) - never generic praise like "strong candidate" or "great fit"
  with no supporting detail.
- If the candidate is a weak fit, say why using the same kind of specific detail (e.g. "3 years
  experience is below the target range" or "no AWS RDS in their skill list").

Return JSON only, matching the schema, with exactly one entry per candidate id.`;
}

export const SCORE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          profile_id: { type: Type.STRING },
          score: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        },
        required: ["profile_id", "score", "explanation"],
      },
    },
  },
  required: ["scores"],
};
