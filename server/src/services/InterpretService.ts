import type { LLMClient } from "../llm/LLMClient.js";
import { buildInterpretPrompt, INTERPRET_RESPONSE_SCHEMA } from "../llm/prompts/interpret.prompt.js";
import { InterpretResponseSchema, type InterpretResponse } from "../schemas/index.js";
import { callLLMForJSON } from "../utils/callLLMForJSON.js";

/**
 * Thin orchestration layer for the "free text -> filters + rubric" step.
 *
 * Why this file exists: the route handler shouldn't know how a prompt is
 * built, which Gemini response schema to pass, or how validation/repair
 * works - that's what callLLMForJSON + the prompt module already own. This
 * class exists purely to compose those two pieces for the one thing
 * InterpretService is responsible for, so a route (or a future CLI, test,
 * or batch job) can call `interpret(query)` without knowing any LLM
 * plumbing exists underneath it. It also depends on the LLMClient
 * *interface*, not GeminiClient directly, so it never has to change if the
 * provider does.
 */
export class InterpretService {
  constructor(private llm: LLMClient) {}

  async interpret(query: string): Promise<InterpretResponse> {
    return callLLMForJSON({
      client: this.llm,
      prompt: buildInterpretPrompt(query),
      geminiSchema: INTERPRET_RESPONSE_SCHEMA,
      zodSchema: InterpretResponseSchema,
    });
  }
}
