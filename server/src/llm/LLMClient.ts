/**
 * The one interface every service depends on. Nothing outside GeminiClient.ts
 * knows this is Gemini - swapping to Groq/OpenRouter means writing one new
 * adapter class, touching zero service or route code.
 */
export interface LLMClient {
  generateJSON(params: { prompt: string; schema: unknown }): Promise<string>;
}
