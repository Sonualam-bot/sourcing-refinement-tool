import type { Filters, Profile } from "../types.js";

/**
 * Pure, synchronous, no I/O - the objective half of the pipeline runs
 * entirely locally against the sample dataset with zero LLM calls, per the
 * assignment ("This runs locally against the file"). Matching rules, chosen
 * deliberately for a 48-profile pool:
 *
 * - skills: OR within the list (any overlap counts). An AND-across-all-skills
 *   rule against a free-text-derived skill list would zero out results far
 *   too easily; recruiters searching "RDS developers" don't mean "must have
 *   every synonym we extracted."
 * - years_experience: inclusive min/max range.
 * - locations / company_types: OR within the list (any of the allowed values
 *   counts as a match); an empty list means "no constraint," not "match
 *   nothing."
 * All categories combine with AND: a profile must satisfy every category
 * that actually has a constraint.
 */
export function applyFilters(profiles: Profile[], filters: Filters): Profile[] {
  return profiles.filter((p) => matchesSkills(p, filters) && matchesYears(p, filters) && matchesLocation(p, filters) && matchesCompanyType(p, filters));
}

function matchesSkills(profile: Profile, filters: Filters): boolean {
  if (filters.skills.length === 0) return true;
  const profileSkills = profile.skills.map((s) => s.toLowerCase());
  return filters.skills.some((wanted) => {
    const w = wanted.toLowerCase();
    return profileSkills.some((s) => s.includes(w) || w.includes(s));
  });
}

function matchesYears(profile: Profile, filters: Filters): boolean {
  if (filters.years_experience_min !== null && profile.years_experience < filters.years_experience_min) return false;
  if (filters.years_experience_max !== null && profile.years_experience > filters.years_experience_max) return false;
  return true;
}

function matchesLocation(profile: Profile, filters: Filters): boolean {
  if (filters.locations.length === 0) return true;
  const loc = profile.location.toLowerCase();
  return filters.locations.some((l) => l.toLowerCase() === loc);
}

function matchesCompanyType(profile: Profile, filters: Filters): boolean {
  if (filters.company_types.length === 0) return true;
  return filters.company_types.some((t) => t.toLowerCase() === profile.current_company_type.toLowerCase());
}
