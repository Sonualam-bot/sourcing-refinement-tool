import { useCallback, useReducer, useRef } from "react";
import { initialSearchState, searchReducer } from "../state/searchReducer";
import { ApiCallError, interpretQuery, refineSearch, runSearch } from "../api/searchApi";
import type { Filters, RefineFeedback, Rubric, ScoredResult } from "../types";

function describeErrorForUser(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiCallError) return { message: err.message, code: err.code };
  return { message: "Something went wrong talking to the server. Please try again." };
}

/**
 * Why this file exists: the one "smart" layer in the whole client. It owns
 * the state machine (searchReducer) and is the only thing that calls
 * searchApi - every component under components/ is a pure props-in/JSX-out
 * function that receives data and callbacks from here and never imports the
 * API client or the reducer itself. That boundary is what makes "changing a
 * smart component shouldn't affect dumb components" true by construction:
 * this file can be rewritten entirely (different state library, different
 * API layer) without touching a single component, as long as the returned
 * shape stays the same.
 */
export function useSearchSession() {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);

  // The feedback object that triggered the in-flight/most recent refine call.
  // Kept out of reducer state deliberately: it's orchestration detail the UI
  // never renders, only needed here so `retryLastAction()` can replay a
  // failed refine without asking the recruiter to re-type their feedback.
  const lastFeedbackRef = useRef<RefineFeedback | null>(null);

  const runFilteredSearch = useCallback(async (filters: Filters, rubric: Rubric) => {
    try {
      const { matchCount, results } = await runSearch(filters, rubric);
      dispatch({ type: "RUN_OK", matchCount, results });
    } catch (err) {
      dispatch({ type: "RUN_ERR", ...describeErrorForUser(err) });
    }
  }, []);

  const refineWithFeedback = useCallback(
    async (filters: Filters, rubric: Rubric, results: ScoredResult[], feedback: RefineFeedback) => {
      lastFeedbackRef.current = feedback;
      try {
        const refined = await refineSearch(filters, rubric, results, feedback);
        dispatch({ type: "REFINE_OK", ...refined });
      } catch (err) {
        dispatch({ type: "REFINE_ERR", ...describeErrorForUser(err) });
      }
    },
    []
  );

  const submitQuery = useCallback(
    async (query: string) => {
      dispatch({ type: "SUBMIT_QUERY", query });
      try {
        const { filters, rubric } = await interpretQuery(query);
        dispatch({ type: "INTERPRET_OK", filters, rubric });
        await runFilteredSearch(filters, rubric);
      } catch (err) {
        dispatch({ type: "INTERPRET_ERR", ...describeErrorForUser(err) });
      }
    },
    [runFilteredSearch]
  );

  const editFilters = useCallback((filters: Filters) => dispatch({ type: "EDIT_FILTERS", filters }), []);
  const editRubric = useCallback((rubric: Rubric) => dispatch({ type: "EDIT_RUBRIC", rubric }), []);

  const rerunWithEditedFilters = useCallback(async () => {
    if (state.status !== "results") return;
    const { filters, rubric } = state;
    dispatch({ type: "MANUAL_RERUN" });
    await runFilteredSearch(filters, rubric);
  }, [state, runFilteredSearch]);

  const submitRecruiterFeedback = useCallback(
    async (feedback: RefineFeedback) => {
      if (state.status !== "results") return;
      const { filters, rubric, results } = state;
      dispatch({ type: "SUBMIT_FEEDBACK" });
      await refineWithFeedback(filters, rubric, results, feedback);
    },
    [state, refineWithFeedback]
  );

  const retryLastAction = useCallback(() => {
    if (state.status !== "error") return;
    const prev = state.previous;
    if (!prev) return dispatch({ type: "RESET" });

    if (prev.status === "interpreting") {
      void submitQuery(prev.query);
    } else if (prev.status === "running") {
      dispatch({ type: "MANUAL_RERUN" });
      void runFilteredSearch(prev.filters, prev.rubric);
    } else if (prev.status === "refining" && lastFeedbackRef.current) {
      dispatch({ type: "SUBMIT_FEEDBACK" });
      void refineWithFeedback(prev.filters, prev.rubric, prev.results, lastFeedbackRef.current);
    } else {
      dispatch({ type: "RESET" });
    }
  }, [state, submitQuery, runFilteredSearch, refineWithFeedback]);

  const freezeSearch = useCallback(() => dispatch({ type: "FREEZE" }), []);
  const startNewSearch = useCallback(() => dispatch({ type: "RESET" }), []);
  const dismissError = useCallback(() => dispatch({ type: "DISMISS_ERROR" }), []);

  return {
    state,
    submitQuery,
    editFilters,
    editRubric,
    rerunWithEditedFilters,
    submitRecruiterFeedback,
    retryLastAction,
    freezeSearch,
    startNewSearch,
    dismissError,
  };
}
