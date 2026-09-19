import { GoogleGenAI } from "@google/genai";
import type { LLMClient } from "./LLMClient.js";
import { AppError } from "../types.js";
import { withTimeout } from "../utils/withTimeout.js";

const PER_MODEL_TIMEOUT_MS = 10_000;

// Ordered newest/most-capable first. A free-tier key's rate limit is per
// model, not per app, so a burst of requests hitting one model's quota
// (a very real risk in a refinement loop that fires an LLM call on every
// recruiter action) can fail over to the next model instead of blocking the
// whole session. Confirmed available on this key via the ListModels API
// before hardcoding - see the primary env override below for the one true
// source of truth in production.
const MODEL_FALLBACKS = dedupe([
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
]);

/**
 * Why this file exists: the only file in the app that imports
 * `@google/genai` or knows Gemini's request/response shape. It exists to
 * satisfy the LLMClient interface (llm/LLMClient.ts) so every service can be
 * written against "a thing that turns a prompt + schema into a JSON string"
 * without knowing which vendor is behind it - the Dependency Inversion half
 * of the SOLID requirement. It also normalizes Gemini-specific failure modes
 * (rate limits, empty responses, thrown SDK errors) into the app's own
 * AppError vocabulary, so callLLMForJSON and routes never branch on
 * Gemini-specific error shapes.
 *
 * It also owns the model-fallback chain (MODEL_FALLBACKS above): a free-tier
 * quota bottleneck on one model degrades to a slightly older model instead
 * of surfacing as a user-facing failure, which is a more useful response to
 * "rate limits ... handled deliberately" than a bare retry of the same
 * exhausted quota would be.
 */
export class GeminiClient implements LLMClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateJSON({ prompt, schema }: { prompt: string; schema: unknown }): Promise<string> {
    let lastErr: unknown;

    for (const model of MODEL_FALLBACKS) {
      try {
        const response = await withTimeout(
          this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema as Record<string, unknown>,
            },
          }),
          PER_MODEL_TIMEOUT_MS
        );
        const text = response.text;
        if (!text) throw new AppError("INVALID_LLM_OUTPUT", "Gemini returned an empty response");
        return text;
      } catch (err) {
        lastErr = err;
        console.warn(`[GeminiClient] ${model} failed (${describeError(err)}), trying next fallback if any`);
      }
    }

    throw toAppError(lastErr);
  }
}

function describeError(err: unknown): string {
  if (err instanceof AppError) return `${err.code}: ${err.message}`;
  return String((err as Error)?.message ?? err);
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const status = (err as { status?: number })?.status;
  if (status === 429) return new AppError("RATE_LIMIT", "Gemini rate limit reached on all fallback models");
  return new AppError("UPSTREAM_ERROR", `Gemini call failed on all fallback models: ${(err as Error)?.message ?? err}`);
}

function dedupe(models: (string | undefined)[]): string[] {
  return [...new Set(models.filter((m): m is string => Boolean(m)))];
}
