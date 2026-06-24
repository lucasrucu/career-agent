// JSON Schemas for Claude structured output (FR-3, FR-7, FR-8).
// These mirror the TypeScript shapes in lib/types.ts. Kept here so the parse,
// match, and draft routes share one source of truth for the tool schema.

import type Anthropic from "@anthropic-ai/sdk";

// The Profile shape Claude must return when parsing a resume (FR-3) or drafting
// a tailored version (FR-8). Optional fields are omitted from `required`.
export const PROFILE_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    contact: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        links: { type: "array", items: { type: "string" } },
      },
      required: ["name"],
    },
    summary: {
      type: "string",
      description: "A 2-4 sentence professional summary.",
    },
    experiences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          dates: { type: "string", description: "e.g. '2021 – Present'" },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "Accomplishment bullet points for this role.",
          },
        },
        required: ["title", "company", "dates", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          credential: { type: "string", description: "Degree, diploma, or course." },
          dates: { type: "string" },
        },
        required: ["institution", "credential"],
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced", "expert"],
          },
        },
        required: ["name", "level"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          year: { type: "string" },
        },
        required: ["name"],
      },
    },
    interests: {
      type: "array",
      description:
        "Signal-bearing extracurriculars and standout achievements that evidence soft skills — endurance sport, competitions, volunteering, open-source, leadership. Capture these instead of dropping them; leave empty if the resume has none. Never invent anything not in the resume.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short label, e.g. 'Triathlon' or 'Open-source maintainer'.",
          },
          detail: {
            type: "string",
            description:
              "Specifics, e.g. 'Ironman finisher; 2024 World Championship age-group qualifier'.",
          },
          signal: {
            type: "string",
            description:
              "The soft skill or trait it evidences, e.g. 'Discipline, long-horizon goal-setting, resilience'.",
          },
        },
        required: ["title"],
      },
    },
  },
  required: ["contact", "summary", "experiences", "education", "skills", "certifications"],
};

// The match-scoring shape Claude returns (FR-7).
export const MATCH_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    match_pct: {
      type: "integer",
      description: "Overall fit, 0-100, honest and calibrated.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Concrete reasons the candidate fits, grounded in their profile.",
    },
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "Honest gaps or missing requirements for this role.",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Role keywords to emphasize in a tailored resume.",
    },
  },
  required: ["match_pct", "strengths", "gaps", "keywords"],
};

// Role-suggestion shape Claude returns (Theme 2 / G). Concrete, searchable job
// titles grounded only in the candidate's real profile — never roles the
// experience doesn't support.
export const ROLE_SUGGESTIONS_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      description: "5-8 concrete roles the candidate is genuinely qualified to pursue.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A concrete job title, e.g. 'Data Engineer' or 'Senior Frontend Developer'.",
          },
          query: {
            type: "string",
            description:
              "The search string to run on a job board — usually the title or a slight generalization of it.",
          },
          rationale: {
            type: "string",
            description:
              "One honest sentence grounded in the real profile, e.g. 'Your SQL and pipeline work maps directly to this role.'",
          },
        },
        required: ["title", "query", "rationale"],
      },
    },
  },
  required: ["suggestions"],
};
