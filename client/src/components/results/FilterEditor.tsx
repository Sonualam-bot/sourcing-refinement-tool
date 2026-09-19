import type { ReactNode } from "react";
import type { Filters } from "../../types";

const COMPANY_TYPES = ["startup", "scaleup", "enterprise", "agency"] as const;

/**
 * Why this file exists: the objective side of "the current filters and
 * rubric are always visible" and "the recruiter can edit directly" - purely
 * presentational, it renders whatever Filters object it's given and reports
 * edits upward via `onChange`. It never knows whether those filters came
 * from the initial interpret call, a manual edit, or a refine round; that
 * distinction lives in the state machine, not here.
 */
export function FilterEditor({
  filters,
  onChange,
  disabled,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-brand-mist bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-ink">Objective filters</h3>

      <Field label="Skills (comma separated)">
        <input
          disabled={disabled}
          value={filters.skills.join(", ")}
          onChange={(e) => onChange({ ...filters, skills: splitList(e.target.value) })}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Min years">
          <input
            disabled={disabled}
            type="number"
            value={filters.years_experience_min ?? ""}
            onChange={(e) => onChange({ ...filters, years_experience_min: parseOptionalNumber(e.target.value) })}
            className={inputClass}
          />
        </Field>
        <Field label="Max years">
          <input
            disabled={disabled}
            type="number"
            value={filters.years_experience_max ?? ""}
            onChange={(e) => onChange({ ...filters, years_experience_max: parseOptionalNumber(e.target.value) })}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Locations (comma separated)">
        <input
          disabled={disabled}
          value={filters.locations.join(", ")}
          onChange={(e) => onChange({ ...filters, locations: splitList(e.target.value) })}
          className={inputClass}
        />
      </Field>

      <Field label="Company background">
        <div className="flex flex-wrap gap-2">
          {COMPANY_TYPES.map((type) => {
            const active = filters.company_types.includes(type);
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...filters,
                    company_types: active
                      ? filters.company_types.filter((t) => t !== type)
                      : [...filters.company_types, type],
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                  active
                    ? "border-brand-forest bg-brand-sage text-brand-forest"
                    : "border-brand-mist text-brand-moss hover:border-brand-clay"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-brand-moss">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-brand-mist px-3 py-1.5 text-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-sage disabled:bg-brand-cream disabled:text-brand-moss";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOptionalNumber(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
