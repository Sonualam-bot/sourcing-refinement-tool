import { AppError } from "../types.js";

/**
 * Why this file exists: Gemini calls have no built-in caller-side deadline,
 * and a slow/hanging response would otherwise leave the recruiter staring
 * at a "thinking" state forever. This is the one place a timeout turns into
 * our own typed AppError("TIMEOUT", ...) instead of an unhandled hang, so
 * every LLM call site gets the same deadline behavior for free via
 * callLLMForJSON rather than each service reimplementing it.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError("TIMEOUT", `LLM call exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
