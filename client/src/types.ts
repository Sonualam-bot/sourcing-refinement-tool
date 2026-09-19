/**
 * Why this file exists: the client's copy of the shapes the server returns.
 * Kept as a small, hand-duplicated file rather than a shared workspace
 * package - the whole contract is four tiny interfaces, and a shared
 * package would mean either npm workspaces (which complicates the
 * independent client/server Docker builds this app deliberately keeps
 * separate) or a Docker build-context reshuffle, for a savings of about
 * 40 lines. If the contract grows meaningfully, promoting this to a shared
 * package is the obvious next step.
 */

export interface Profile {
  id: string;
  name: string;
  current_title: string;
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: "startup" | "scaleup" | "enterprise" | "agency";
  skills: string[];
  past_companies: { company: string; company_type: string; title: string; years: number }[];
  education: string;
  summary: string;
}

export interface Filters {
  skills: string[];
  years_experience_min: number | null;
  years_experience_max: number | null;
  locations: string[];
  company_types: string[];
}

export interface Rubric {
  summary: string;
  criteria: string[];
}

export interface ScoredResult {
  profile: Profile;
  score: number;
  explanation: string;
}

export interface ThumbFeedback {
  profile_id: string;
  verdict: "up" | "down";
}

export interface RefineFeedback {
  thumbs: ThumbFeedback[];
  chat_message?: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
