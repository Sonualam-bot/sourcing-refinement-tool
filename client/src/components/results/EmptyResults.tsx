/**
 * Why this file exists: the assignment explicitly calls out "empty results"
 * as a state that needs designing, not a silent blank list. It exists to
 * give the recruiter an actionable next step (loosen the filters) rather
 * than just reporting zero, and stays a dumb component - ResultsScreen owns
 * deciding when matchCount is 0 and renders this instead of the result list.
 * The retry action lives on this component itself (not just a link floating
 * elsewhere on the page) because this box is where the recruiter's
 * attention actually is when they hit zero results.
 */
export function EmptyResults({ onRerunWithEditedFilters }: { onRerunWithEditedFilters: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-mist bg-white p-8 text-center">
      <p className="font-semibold text-brand-ink">No candidates match these filters</p>
      <p className="mt-1 text-sm text-brand-moss">
        Try loosening the years-of-experience range, dropping a skill, or widening the location -
        edit the filters above directly, then search again, or tell the app what to change below.
      </p>
      <button
        type="button"
        onClick={onRerunWithEditedFilters}
        className="mt-4 rounded-lg bg-brand-forest px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Search again with these filters
      </button>
    </div>
  );
}
