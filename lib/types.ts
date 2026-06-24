// Shared data contract for Career Agent.
// Mirrors the PRD §8 Input/Output spec and the Supabase schema (0001_init.sql).

// --- Structured profile (FR-3 / FR-5) ---------------------------------------

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[]; // portfolio, LinkedIn, GitHub, etc.
}

export interface Experience {
  title: string;
  company: string;
  dates: string; // free-form, e.g. "2021 – Present"
  bullets: string[];
}

export interface Education {
  institution: string;
  credential: string; // degree / diploma / course
  dates?: string;
}

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface Interest {
  title: string; // short label, e.g. "Triathlon" or "Open-source maintainer"
  detail?: string; // specifics, e.g. "Ironman finisher; 2024 World Championship age-group qualifier"
  signal?: string; // the soft-skill/trait it evidences, e.g. "Discipline, long-horizon goal-setting, resilience"
}

export interface Profile {
  contact: Contact;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  interests?: Interest[];
}

export interface ProfileRecord {
  user_id: string;
  profile: Profile;
  version: number; // bumped on every save; match cache keys off this
  updated_at: string;
}

// --- Jobs (FR-6 / FR-10) ----------------------------------------------------

export interface Job {
  id: string; // Adzuna listing id, or a local id for pasted jobs
  title: string;
  company: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  snippet: string;
  url: string;
  created: string;
}

export type SavedJobStatus =
  | "interested"
  | "drafted"
  | "applied"
  | "interviewing"
  | "closed";

export interface SavedJob extends Job {
  user_id: string;
  status: SavedJobStatus;
  saved_at: string;
}

export interface JobSearchParams {
  query: string;
  where?: string;
  country?: string; // Adzuna country code; defaults to ADZUNA_DEFAULT_COUNTRY
  salary_min?: number;
  full_time?: boolean;
  distance?: number;
  results_per_page?: number;
  page?: number;
}

// --- Match scoring (FR-7) ---------------------------------------------------

export interface MatchResult {
  job_id: string;
  profile_version: number;
  match_pct: number; // 0–100
  strengths: string[];
  gaps: string[];
  keywords: string[]; // keywords to emphasize in a tailored resume
}

// --- Tailored resume (FR-8 / FR-9) ------------------------------------------

export interface ResumeDraft {
  job_id: string;
  profile_version: number;
  // The tailored draft reuses the Profile shape, reordered/rephrased for the role.
  content: Profile;
  // Set once exported; filename pattern {LastName}_{Company}_{Role}.pdf.
  export_filename?: string;
}

// --- API envelopes ----------------------------------------------------------

export type ApiResult<T> = { data: T } | { error: string };
