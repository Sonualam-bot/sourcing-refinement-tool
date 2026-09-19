import type { Rubric } from "../../types";

/**
 * Why this file exists: the subjective counterpart to FilterEditor - same
 * contract (data in, onChange out, no API knowledge), kept as a separate
 * component rather than folded into FilterEditor because filters and rubric
 * are conceptually different things (objective predicates vs. a judgment
 * brief) and a future change to how one is edited shouldn't risk touching
 * the other.
 */
export function RubricEditor({
  rubric,
  onChange,
  disabled,
}: {
  rubric: Rubric;
  onChange: (rubric: Rubric) => void;
  disabled?: boolean;
}) {
  const updateCriterion = (index: number, value: string) => {
    const criteria = [...rubric.criteria];
    criteria[index] = value;
    onChange({ ...rubric, criteria });
  };

  const removeCriterion = (index: number) => {
    onChange({ ...rubric, criteria: rubric.criteria.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-brand-mist bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-ink">Fit rubric</h3>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-brand-moss">What good looks like</span>
        <textarea
          disabled={disabled}
          value={rubric.summary}
          onChange={(e) => onChange({ ...rubric, summary: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-lg border border-brand-mist px-3 py-1.5 text-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-sage disabled:bg-brand-cream disabled:text-brand-moss"
        />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium text-brand-moss">Criteria</span>
        <ul className="space-y-1.5">
          {rubric.criteria.map((criterion, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                disabled={disabled}
                value={criterion}
                onChange={(e) => updateCriterion(i, e.target.value)}
                className="w-full rounded-lg border border-brand-mist px-3 py-1.5 text-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-sage disabled:bg-brand-cream disabled:text-brand-moss"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCriterion(i)}
                  aria-label="Remove criterion"
                  className="shrink-0 text-brand-moss hover:text-brand-clay"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange({ ...rubric, criteria: [...rubric.criteria, ""] })}
            className="mt-2 text-xs font-medium text-brand-forest hover:opacity-80"
          >
            + Add criterion
          </button>
        )}
      </div>
    </div>
  );
}
