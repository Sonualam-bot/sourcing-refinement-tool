/**
 * Why this file exists: the one place every layer of the server agrees on
 * shape - routes, services, prompts, and schemas all import from here rather
 * than redeclaring these interfaces locally. It also owns AppError, the
 * single typed-error vocabulary routes use to decide what status code and
 * message to send back, so failure handling stays deliberate instead of
 * leaking raw exceptions to the client.
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

export class AppError extends Error {
  code: "TIMEOUT" | "RATE_LIMIT" | "INVALID_LLM_OUTPUT" | "UPSTREAM_ERROR";
  constructor(code: AppError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}
