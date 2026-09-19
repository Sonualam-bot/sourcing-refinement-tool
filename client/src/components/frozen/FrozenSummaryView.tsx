import { FilterEditor } from "../results/FilterEditor";
import { RubricEditor } from "../results/RubricEditor";
import { ProfileCard } from "../results/ProfileCard";
import type { Filters, Rubric, ScoredResult } from "../../types";

/**
 * Why this file exists: the "clear final state" the assignment asks for -
 * frozen filters, frozen rubric, frozen shortlist, all locked from editing.
 * Reuses FilterEditor/RubricEditor/ProfileCard in their `disabled` mode
 * instead of duplicating their layout, so the frozen view can never visually
 * drift from what the recruiter was actually looking at when they froze it.
 */
export function FrozenSummaryView({
  filters,
  rubric,
  results,
  onStartNewSearch,
}: {
  filters: Filters;
  rubric: Rubric;
  results: ScoredResult[];
  onStartNewSearch: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="rounded-xl border border-brand-forest bg-brand-forest px-4 py-3 text-white">
        <p className="text-sm font-semibold">Search frozen</p>
        <p className="text-xs text-white/80">This is the final shortlist for this session.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FilterEditor filters={filters} onChange={() => {}} disabled />
        <RubricEditor rubric={rubric} onChange={() => {}} disabled />
      </div>

      <div className="space-y-3">
        {results.map((result, i) => (
          <ProfileCard key={result.profile.id} position={i + 1} result={result} />
        ))}
      </div>

      <button
        type="button"
        onClick={onStartNewSearch}
        className="rounded-lg border border-brand-mist px-4 py-2 text-sm font-medium text-brand-ink hover:border-brand-clay"
      >
        Start a new search
      </button>
    </div>
  );
}
