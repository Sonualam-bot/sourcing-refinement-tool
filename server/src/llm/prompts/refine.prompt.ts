import { Type } from "@google/genai";
import type { Filters, Rubric, RefineFeedback, ScoredResult } from "../../types.js";

/**
 * Adjusts filters + rubric from recruiter feedback on the currently shown
 * results. This is the prompt that makes the refinement loop trustworthy,
 * so two things are deliberate:
 *
 * 1. The shown candidates are numbered 1..N in the SAME order the recruiter
 *    saw them, because free-text feedback like "1 is too junior, 2 and 4 are
 *    right" is positional, not id-based. We map position -> profile_id here
 *    so the model can resolve "1" without us doing NLP on the chat message
 *    ourselves.
 *
 * 2. The model must return `what_changed`: a one/two-sentence, human-facing
 *    explanation of what it adjusted and why. This is what lets the frontend
 *    show "here's what changed" instead of silently swapping the rubric out
 *    from under the recruiter - directly serving "refinement visibly
 *    responds to feedback in a way a recruiter would trust."
 */
export function buildRefinePrompt(
  filters: Filters,
  rubric: Rubric,
  previousResults: ScoredResult[],
  feedback: RefineFeedback
): string {
  const numbered = previousResults.map((r, i) => ({
    position: i + 1,
    profile_id: r.profile.id,
    current_title: r.profile.current_title,
    years_experience: r.profile.years_experience,
    location: r.profile.location,
    current_company: r.profile.current_company,
    current_company_type: r.profile.current_company_type,
    skills: r.profile.skills,
    previous_score: r.score,
    previous_explanation: r.explanation,
  }));

  const thumbsById = feedback.thumbs
    .map((t) => `- profile ${t.profile_id}: recruiter marked ${t.verdict === "up" ? "GOOD MATCH" : "NOT A MATCH"}`)
    .join("\n");

  return `You are refining a candidate search based on recruiter feedback.

CURRENT FILTERS: ${JSON.stringify(filters)}
CURRENT RUBRIC: ${JSON.stringify(rubric)}

CANDIDATES THE RECRUITER JUST REVIEWED (numbered in the order shown to them):
${JSON.stringify(numbered, null, 2)}

STRUCTURED FEEDBACK (per-profile thumbs, if any):
${thumbsById || "(none given)"}

FREE-TEXT FEEDBACK FROM RECRUITER (if any, may reference candidates by their position number above,
e.g. "1 is too junior, 2 and 4 are right"):
${feedback.chat_message || "(none given)"}

Using this feedback, decide how the FILTERS and/or RUBRIC should change so future results better
match what the recruiter wants. Small, targeted adjustments are better than rewriting everything -
only change what the feedback actually justifies. If feedback conflicts or is unclear, make the
smallest reasonable interpretation and say so in what_changed.

Return the full updated filters object, the full updated rubric object (even for fields that did not
change), and what_changed: a short, specific, recruiter-facing sentence describing what you adjusted
and why (e.g. "Raised the minimum years of experience to 5 since candidate 1 was marked too junior at 3
years, and added emphasis on payments-domain experience since 2 and 4 were both approved payments
engineers.").

Return JSON only, matching the schema.`;
}

export const REFINE_RESPONSE_SCHEMA = {
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
    what_changed: { type: Type.STRING },
  },
  required: ["filters", "rubric", "what_changed"],
};
