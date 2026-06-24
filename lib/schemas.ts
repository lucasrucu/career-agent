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
