import { useState } from "react";
import { FilterEditor } from "./FilterEditor";
import { RubricEditor } from "./RubricEditor";
import { ProfileCard } from "./ProfileCard";
import { EmptyResults } from "./EmptyResults";
import { DiffNote } from "./DiffNote";
import { ChatComposer } from "../refine/ChatComposer";
import { LoadingIndicator } from "../shared/LoadingIndicator";
import type { Filters, RefineFeedback, Rubric, ScoredResult, ThumbFeedback } from "../../types";

/**
 * Why this file exists: composes the six single-purpose result components
 * (FilterEditor, RubricEditor, DiffNote, ProfileCard, EmptyResults,
 * ChatComposer) into the one screen the recruiter spends most of their time
 * on. It owns exactly one piece of state that belongs to it and nowhere
 * else - which candidates currently have a thumbs verdict pending submission
 * - because that's UI-interaction state, not session state; it resets on
 * every submit and the state machine never needs to know it existed between
 * refine rounds.
 */
export function ResultsScreen({
  query,
  filters,
  rubric,
  matchCount,
  results,
  whatChanged,
  isRefining,
  onEditFilters,
  onEditRubric,
  onRerunWithEditedFilters,
  onSubmitFeedback,
  onFreeze,
}: {
  query: string;
  filters: Filters;
  rubric: Rubric;
  matchCount: number;
  results: ScoredResult[];
  whatChanged: string | null;
  isRefining: boolean;
  onEditFilters: (filters: Filters) => void;
  onEditRubric: (rubric: Rubric) => void;
  onRerunWithEditedFilters: () => void;
  onSubmitFeedback: (feedback: RefineFeedback) => void;
  onFreeze: () => void;
}) {
  const [pendingThumbs, setPendingThumbs] = useState<Record<string, "up" | "down">>({});

  const setThumb = (profileId: string, verdict: "up" | "down" | null) => {
    setPendingThumbs((prev) => {
      const next = { ...prev };
      if (verdict === null) delete next[profileId];
      else next[profileId] = verdict;
      return next;
    });
  };

  const thumbsList: ThumbFeedback[] = Object.entries(pendingThumbs).map(([profile_id, verdict]) => ({
    profile_id,
    verdict,
  }));

  const submitFeedbackAndClearThumbs = (feedback: RefineFeedback) => {
    onSubmitFeedback(feedback);
    setPendingThumbs({});
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-moss">
          Searching for: <span className="font-medium text-brand-ink">"{query}"</span>
        </p>
        <button
          type="button"
          onClick={onFreeze}
          className="rounded-lg border border-brand-forest px-3 py-1.5 text-xs font-semibold text-brand-forest hover:bg-brand-sage"
        >
          Freeze search
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FilterEditor filters={filters} onChange={onEditFilters} />
        <RubricEditor rubric={rubric} onChange={onEditRubric} />
      </div>

      <button
        type="button"
        onClick={onRerunWithEditedFilters}
        className="text-xs font-medium text-brand-forest hover:opacity-80"
      >
        Re-run search with these edits
      </button>

      {whatChanged && <DiffNote whatChanged={whatChanged} />}

      {isRefining && <LoadingIndicator label="Applying your feedback and re-scoring candidates..." />}

      {!isRefining && matchCount === 0 && <EmptyResults />}

      {!isRefining && matchCount > 0 && (
        <>
          <p className="text-xs text-brand-moss">
            Showing top {results.length} of {matchCount} matches
          </p>
          <div className="space-y-3">
            {results.map((result, i) => (
              <ProfileCard
                key={result.profile.id}
                position={i + 1}
                result={result}
                thumb={pendingThumbs[result.profile.id] ?? null}
                onThumbChange={(verdict) => setThumb(result.profile.id, verdict)}
              />
            ))}
          </div>
        </>
      )}

      <ChatComposer thumbs={thumbsList} disabled={isRefining} onSubmit={submitFeedbackAndClearThumbs} />
    </div>
  );
}
