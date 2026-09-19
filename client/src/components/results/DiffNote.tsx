/**
 * Why this file exists: the visible half of "the app says what it changed
 * in the filters or rubric and why." Deliberately separated from
 * FilterEditor/RubricEditor - it's not itself editable data, just a
 * transient explanation of the most recent refine round, and folding it
 * into either editor would make them responsible for something they don't
 * own (refinement history).
 */
export function DiffNote({ whatChanged }: { whatChanged: string }) {
  return (
    <div className="rounded-xl border border-brand-sage bg-brand-sage/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-forest">What changed</p>
      <p className="mt-1 text-sm text-brand-ink/80">{whatChanged}</p>
    </div>
  );
}
