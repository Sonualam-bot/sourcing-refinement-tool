import type { Filters, Rubric, ScoredResult } from "../types";

type ErrorStage = "interpret" | "run" | "refine";

export type SearchState =
  | { status: "idle" }
  | { status: "interpreting"; query: string }
  | { status: "running"; query: string; filters: Filters; rubric: Rubric }
  | {
      status: "results";
      query: string;
      filters: Filters;
      rubric: Rubric;
      matchCount: number;
      results: ScoredResult[];
      whatChanged: string | null;
    }
  | {
      status: "refining";
      query: string;
      filters: Filters;
      rubric: Rubric;
      matchCount: number;
      results: ScoredResult[];
    }
  | {
      status: "frozen";
      query: string;
      filters: Filters;
      rubric: Rubric;
      matchCount: number;
      results: ScoredResult[];
    }
  | {
      status: "error";
      stage: ErrorStage;
      message: string;
      code?: string;
      previous: SearchState | null;
    };

export type SearchAction =
  | { type: "SUBMIT_QUERY"; query: string }
  | { type: "INTERPRET_OK"; filters: Filters; rubric: Rubric }
  | { type: "INTERPRET_ERR"; message: string; code?: string }
  | { type: "RUN_OK"; matchCount: number; results: ScoredResult[] }
  | { type: "RUN_ERR"; message: string; code?: string }
  | { type: "EDIT_FILTERS"; filters: Filters }
  | { type: "EDIT_RUBRIC"; rubric: Rubric }
  | { type: "MANUAL_RERUN" }
  | { type: "SUBMIT_FEEDBACK" }
  | {
      type: "REFINE_OK";
      filters: Filters;
      rubric: Rubric;
      whatChanged: string;
      matchCount: number;
      results: ScoredResult[];
    }
  | { type: "REFINE_ERR"; message: string; code?: string }
  | { type: "FREEZE" }
  | { type: "RESET" }
  | { type: "DISMISS_ERROR" };

export const initialSearchState: SearchState = { status: "idle" };

/**
 * Why this file exists: this is the literal artifact behind "every state
 * should be designed" - a discriminated union enumerates exactly the states
 * the UI can be in (idle, interpreting, running, results, refining, frozen,
 * error), and TypeScript refuses to compile a component that reads a field
 * a given status doesn't have. Nothing in the app reaches this shape except
 * through a dispatched action here, so a bug can't leave the UI in an
 * inconsistent combination (e.g. "frozen" with a stale in-flight spinner).
 * The reducer is pure and has no fetch/timer/DOM code in it - see
 * hooks/useSearchSession.ts for the orchestration layer that calls the API
 * and dispatches these actions.
 */
export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SUBMIT_QUERY":
      return { status: "interpreting", query: action.query };

    case "INTERPRET_OK":
      if (state.status !== "interpreting") return state;
      return { status: "running", query: state.query, filters: action.filters, rubric: action.rubric };

    case "INTERPRET_ERR":
      if (state.status !== "interpreting") return state;
      return { status: "error", stage: "interpret", message: action.message, code: action.code, previous: state };

    case "RUN_OK":
      if (state.status !== "running") return state;
      return {
        status: "results",
        query: state.query,
        filters: state.filters,
        rubric: state.rubric,
        matchCount: action.matchCount,
        results: action.results,
        whatChanged: null,
      };

    case "RUN_ERR":
      if (state.status !== "running") return state;
      return { status: "error", stage: "run", message: action.message, code: action.code, previous: state };

    case "EDIT_FILTERS":
      if (state.status !== "results") return state;
      return { ...state, filters: action.filters };

    case "EDIT_RUBRIC":
      if (state.status !== "results") return state;
      return { ...state, rubric: action.rubric };

    case "MANUAL_RERUN":
      if (state.status !== "results") return state;
      return { status: "running", query: state.query, filters: state.filters, rubric: state.rubric };

    case "SUBMIT_FEEDBACK":
      if (state.status !== "results") return state;
      return {
        status: "refining",
        query: state.query,
        filters: state.filters,
        rubric: state.rubric,
        matchCount: state.matchCount,
        results: state.results,
      };

    case "REFINE_OK":
      if (state.status !== "refining") return state;
      return {
        status: "results",
        query: state.query,
        filters: action.filters,
        rubric: action.rubric,
        matchCount: action.matchCount,
        results: action.results,
        whatChanged: action.whatChanged,
      };

    case "REFINE_ERR":
      if (state.status !== "refining") return state;
      return { status: "error", stage: "refine", message: action.message, code: action.code, previous: state };

    case "FREEZE":
      if (state.status !== "results") return state;
      return {
        status: "frozen",
        query: state.query,
        filters: state.filters,
        rubric: state.rubric,
        matchCount: state.matchCount,
        results: state.results,
      };

    case "RESET":
      return { status: "idle" };

    case "DISMISS_ERROR":
      if (state.status !== "error") return state;
      return state.previous ?? { status: "idle" };

    default:
      return state;
  }
}
