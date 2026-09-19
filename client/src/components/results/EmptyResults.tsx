/**
 * Why this file exists: the assignment explicitly calls out "empty results"
 * as a state that needs designing, not a silent blank list. It exists to
 * give the recruiter an actionable next step (loosen the filters) rather
 * than just reporting zero, and stays a dumb component - ResultsScreen owns
 * deciding when matchCount is 0 and renders this instead of the result list.
 */
export function EmptyResults() {
  return (
    <div className="rounded-xl border border-dashed border-brand-mist bg-white p-8 text-center">
      <p className="font-semibold text-brand-ink">No candidates match these filters</p>
      <p className="mt-1 text-sm text-brand-moss">
        Try loosening the years-of-experience range, dropping a skill, or widening the location -
        you can edit the filters above directly, or tell the app what to change below.
      </p>
    </div>
  );
}
