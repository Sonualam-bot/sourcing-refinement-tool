import type { LLMClient } from "../llm/LLMClient.js";
import { buildScorePrompt, SCORE_RESPONSE_SCHEMA } from "../llm/prompts/score.prompt.js";
import { ScoreResponseSchema } from "../schemas/index.js";
import { callLLMForJSON } from "../utils/callLLMForJSON.js";
import type { Profile, Rubric, ScoredResult } from "../types.js";

/**
 * Why this file exists: scoring is the one step that has to reconcile two
 * different worlds - the LLM only knows profile ids and returns
 * {profile_id, score, explanation}, but the rest of the app (frontend,
 * refine step) needs the full Profile object attached to every result. This
 * service is the single place that does that join, so nothing downstream
 * has to re-look-up a profile by id or duplicate that logic.
 *
 * It also owns sorting (highest score first) and silently drops any
 * profile_id the LLM returned that doesn't match a real profile, rather than
 * letting a hallucinated id crash the response - a small, deliberate piece
 * of the "handle malformed output without crashing" requirement that lives
 * closer to the domain than the generic Zod/repair layer in callLLMForJSON.
 */
export class ScoreService {
  constructor(private llm: LLMClient) {}

  async scoreAndRank(profiles: Profile[], rubric: Rubric): Promise<ScoredResult[]> {
    if (profiles.length === 0) return [];

    const { scores } = await callLLMForJSON({
      client: this.llm,
      prompt: buildScorePrompt(rubric, profiles),
      geminiSchema: SCORE_RESPONSE_SCHEMA,
      zodSchema: ScoreResponseSchema,
    });

    const byId = new Map(profiles.map((p) => [p.id, p]));
    const results: ScoredResult[] = [];
    for (const s of scores) {
      const profile = byId.get(s.profile_id);
      if (!profile) continue; // hallucinated/unknown id - skip rather than crash
      results.push({ profile, score: s.score, explanation: s.explanation });
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
