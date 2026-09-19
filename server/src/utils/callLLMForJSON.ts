import type { z } from "zod";
import type { LLMClient } from "../llm/LLMClient.js";
import { withTimeout } from "./withTimeout.js";
import { AppError } from "../types.js";

// Overall ceiling for the whole call, including GeminiClient's internal
// per-model fallback chain (each model attempt has its own shorter timeout -
// see GeminiClient.ts). This is a backstop in case that internal loop
// somehow hangs, not the primary timeout mechanism.
const OVERALL_TIMEOUT_MS = 45_000;

/**
 * Why this file exists: the single choke point every LLM call in this app
 * goes through, so "handle malformed output / rate limits / timeouts
 * deliberately" is satisfied once instead of three times per call site.
 * Model-level retry and rate-limit fallback already live inside
 * GeminiClient (LLMClient implementations own their own transport
 * resilience); this layer is provider-agnostic and owns the next concern up
 * the stack: turning whatever string comes back into trusted, typed data -
 * parse -> Zod-validate -> one repair attempt on invalid shape -> typed
 * AppError if it still can't be trusted.
 */
export async function callLLMForJSON<T>(params: {
  client: LLMClient;
  prompt: string;
  geminiSchema: unknown;
  zodSchema: z.ZodType<T, z.ZodTypeDef, any>;
}): Promise<T> {
  const { client, prompt, geminiSchema, zodSchema } = params;

  const requestRawJSON = (p: string) =>
    withTimeout(client.generateJSON({ prompt: p, schema: geminiSchema }), OVERALL_TIMEOUT_MS);

  const raw = await requestRawJSON(prompt);
  const firstResult = parseAndValidateJSON(raw, zodSchema);
  if (firstResult.ok) return firstResult.data;

  // One repair pass: show the model exactly what it produced and why it was rejected.
  const repairPrompt = `${prompt}\n\nYour previous response was invalid JSON or did not match the required schema.\nPrevious response:\n${raw}\nValidation error:\n${firstResult.error}\n\nReturn ONLY corrected JSON matching the schema. No prose, no markdown fences.`;
  const repaired = await requestRawJSON(repairPrompt);
  const secondResult = parseAndValidateJSON(repaired, zodSchema);
  if (secondResult.ok) return secondResult.data;

  throw new AppError(
    "INVALID_LLM_OUTPUT",
    `LLM output failed validation twice. Last error: ${secondResult.error}`
  );
}

function parseAndValidateJSON<T>(
  raw: string,
  schema: z.ZodType<T, z.ZodTypeDef, any>
): { ok: true; data: T } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Response was not valid JSON" };
  }
  const result = schema.safeParse(parsed);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.message };
}
