import type { LLMClient } from "../llm/LLMClient.js";
import { buildRefinePrompt, REFINE_RESPONSE_SCHEMA } from "../llm/prompts/refine.prompt.js";
import { RefineResponseSchema } from "../schemas/index.js";
import { callLLMForJSON } from "../utils/callLLMForJSON.js";
import { applyFilters } from "./FilterService.js";
import { ScoreService } from "./ScoreService.js";
import type { Filters, Profile, RefineFeedback, Rubric, ScoredResult } from "../types.js";

export interface RefineResult {
  filters: Filters;
  rubric: Rubric;
  whatChanged: string;
  results: ScoredResult[];
}

/**
 * Why this file exists: refinement is the one step that has to run the
 * *entire* pipeline again (adjust -> filter -> score) rather than a single
 * LLM call, so it owns composing RefineService's own prompt call with the
 * already-existing FilterService (pure) and ScoreService (LLM). Keeping that
 * composition here - instead of inline in the route - means the route stays
 * a thin HTTP adapter and the "re-run the search after adjusting
 * filters/rubric" behavior is unit-testable and reusable on its own.
 */
export class RefineService {
  constructor(
    private llm: LLMClient,
    private scoreService: ScoreService
  ) {}

  async refine(
    allProfiles: Profile[],
    filters: Filters,
    rubric: Rubric,
    previousResults: ScoredResult[],
    feedback: RefineFeedback
  ): Promise<RefineResult> {
    const adjustment = await callLLMForJSON({
      client: this.llm,
      prompt: buildRefinePrompt(filters, rubric, previousResults, feedback),
      geminiSchema: REFINE_RESPONSE_SCHEMA,
      zodSchema: RefineResponseSchema,
    });

    const filtered = applyFilters(allProfiles, adjustment.filters);
    const results = await this.scoreService.scoreAndRank(filtered, adjustment.rubric);

    return {
      filters: adjustment.filters,
      rubric: adjustment.rubric,
      whatChanged: adjustment.what_changed,
      results,
    };
  }
}
