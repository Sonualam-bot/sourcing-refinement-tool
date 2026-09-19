/**
 * Why this file exists: a single, reusable "thinking" visual so every
 * loading moment in the loop (interpreting the query, running the search,
 * refining from feedback) looks and feels the same to the recruiter, while
 * the copy passed in via `label` is what actually tells them what's
 * happening - the assignment asks for first-load/thinking states to be
 * deliberately designed, not a generic spinner with no context.
 */
export function LoadingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-brand-moss">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-sage opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-forest" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
