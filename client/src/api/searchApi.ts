import type { ApiErrorBody, Filters, RefineFeedback, Rubric, ScoredResult } from "../types";

export class ApiCallError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function postJSONOrThrow<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/search/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new ApiCallError(err.error?.code ?? "UNKNOWN", err.error?.message ?? "Request failed");
  }
  return json as T;
}

/**
 * Why this file exists: the only module in the client that knows a fetch
 * call, an HTTP method, or a `/api/search/*` path exists. Every component
 * and the state machine talk to `interpretQuery` / `runSearch` /
 * `refineSearch` as plain async functions - if the transport ever changed
 * (a different base URL, request signing, batching), this is the only file
 * that would need to change. It also owns turning the server's typed error
 * envelope into a thrown ApiCallError so callers can branch on `.code`
 * instead of re-parsing response bodies.
 */
export function interpretQuery(query: string) {
  return postJSONOrThrow<{ filters: Filters; rubric: Rubric }>("interpret", { query });
}

export function runSearch(filters: Filters, rubric: Rubric) {
  return postJSONOrThrow<{ matchCount: number; results: ScoredResult[] }>("run", { filters, rubric });
}

export function refineSearch(
  filters: Filters,
  rubric: Rubric,
  previousResults: ScoredResult[],
  feedback: RefineFeedback
) {
  return postJSONOrThrow<{
    filters: Filters;
    rubric: Rubric;
    whatChanged: string;
    matchCount: number;
    results: ScoredResult[];
  }>("refine", { filters, rubric, previousResults, feedback });
}
