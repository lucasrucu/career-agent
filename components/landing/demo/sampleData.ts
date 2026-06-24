// Hardcoded sample data for the public landing-page demo. Typed against the real
// domain types (lib/types.ts) so the demo stays honest about the product's data
// shapes. Nothing here touches the database or any API — the demo renders
// entirely from these constants. The candidate is fictional.

import type { Job, MatchResult, Profile } from "@/lib/types";

// --- Sample parsed profile --------------------------------------------------
// A realistic, fictional candidate. Note the `interests` block — the new
// Interests & Achievements feature ships alongside this landing page, and the
// demo surfaces it prominently (triathlon → discipline/resilience signal).

export const DEMO_PROFILE: Profile = {
  contact: {
    name: "Maya Okafor",
    email: "maya.okafor@example.com",
    phone: "(415) 555-0142",
    location: "Austin, TX",
    links: ["linkedin.com/in/mayaokafor", "github.com/mayaokafor"],
  },
  summary:
    "Product-minded full-stack engineer with 6 years building data-heavy web apps. I turn ambiguous problems into shipped features, and I care as much about the user's first five minutes as the architecture underneath.",
  experiences: [
    {
      title: "Senior Software Engineer",
      company: "Lumen Analytics",
      dates: "2022 – Present",
      bullets: [
        "Led the rebuild of the reporting dashboard in Next.js + TypeScript, cutting median load time from 4.1s to 0.9s.",
        "Designed the multi-tenant data model and row-level security that now isolates 200+ customer workspaces.",
        "Mentored three junior engineers; two were promoted within a year.",
      ],
    },
    {
      title: "Software Engineer",
      company: "Northwind Labs",
      dates: "2019 – 2022",
      bullets: [
        "Built the billing and usage-metering service handling ~3M events/day on Postgres.",
        "Shipped the first public REST API and its docs, growing third-party integrations from 0 to 40.",
      ],
    },
  ],
  education: [
    {
      institution: "University of Texas at Austin",
      credential: "B.S. Computer Science",
      dates: "2015 – 2019",
    },
  ],
  skills: [
    { name: "TypeScript", level: "expert" },
    { name: "React / Next.js", level: "expert" },
    { name: "Node.js", level: "advanced" },
    { name: "PostgreSQL", level: "advanced" },
    { name: "AWS", level: "intermediate" },
    { name: "Python", level: "intermediate" },
  ],
  certifications: [
    { name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon", year: "2023" },
  ],
  interests: [
    {
      title: "Triathlon",
      detail: "Ironman finisher; 2024 World Championship age-group qualifier",
      signal: "Discipline, long-horizon goal-setting, resilience",
    },
    {
      title: "Open-source maintainer",
      detail: "Maintain a TypeScript date-utils library with 1.2k GitHub stars",
      signal: "Ownership, community collaboration, code quality",
    },
  ],
};

// --- Sample job listings ----------------------------------------------------

export const DEMO_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Senior Frontend Engineer",
    company: "Meridian Health",
    location: "Remote (US)",
    salary_min: 150000,
    salary_max: 185000,
    snippet:
      "Build the patient-facing portal in React/Next.js with a small, senior team. You'll own features end-to-end, partner with design, and care deeply about performance and accessibility.",
    url: "https://example.com/jobs/job-1",
    created: "2026-06-22",
  },
  {
    id: "job-2",
    title: "Full-Stack Engineer, Platform",
    company: "Cobalt Data",
    location: "Austin, TX (Hybrid)",
    salary_min: 140000,
    salary_max: 170000,
    snippet:
      "Work across our TypeScript stack and Postgres data layer to scale multi-tenant analytics. Strong RLS and API design experience a plus.",
    url: "https://example.com/jobs/job-2",
    created: "2026-06-20",
  },
  {
    id: "job-3",
    title: "Staff Software Engineer",
    company: "Atlas Robotics",
    location: "Remote (US)",
    salary_min: 185000,
    salary_max: 220000,
    snippet:
      "Set technical direction for our developer platform. Deep distributed-systems and Go experience required; mentorship expected.",
    url: "https://example.com/jobs/job-3",
    created: "2026-06-18",
  },
];

// The job the sample match + tailored resume are computed against.
export const DEMO_SELECTED_JOB = DEMO_JOBS[0];

// --- Sample match result ----------------------------------------------------

export const DEMO_MATCH: MatchResult = {
  job_id: "job-1",
  profile_version: 1,
  match_pct: 88,
  strengths: [
    "Expert in React/Next.js and TypeScript — the exact core of this role.",
    "Proven performance work (4.1s → 0.9s dashboard rebuild) maps directly to their perf focus.",
    "Multi-tenant + RLS experience translates cleanly to a patient-data portal.",
  ],
  gaps: [
    "No explicit healthcare or HIPAA experience listed — worth addressing in a cover note.",
    "Accessibility (a11y) is called out heavily; your resume doesn't surface it yet.",
  ],
  keywords: ["Next.js", "React", "TypeScript", "accessibility", "performance", "patient portal"],
};

// --- Sample tailored resume -------------------------------------------------
// A reordered/rephrased view of DEMO_PROFILE aimed at the selected job, reusing
// the same Profile shape the real tailored-draft flow produces.

export const DEMO_TAILORED_RESUME: Profile = {
  contact: DEMO_PROFILE.contact,
  summary:
    "Senior frontend engineer specializing in React/Next.js and TypeScript, with a track record of shipping fast, accessible, data-heavy interfaces. Drawn to product teams where performance and the user's first five minutes matter.",
  experiences: [
    {
      title: "Senior Software Engineer",
      company: "Lumen Analytics",
      dates: "2022 – Present",
      bullets: [
        "Rebuilt a customer reporting dashboard in Next.js + TypeScript, cutting median load time 4.1s → 0.9s.",
        "Owned features end-to-end from design partnership through release across 200+ tenant workspaces.",
        "Drove front-end quality standards and mentored three engineers.",
      ],
    },
    {
      title: "Software Engineer",
      company: "Northwind Labs",
      dates: "2019 – 2022",
      bullets: [
        "Shipped a public REST API and docs, growing integrations from 0 to 40.",
        "Built reliable, high-throughput services on Postgres handling ~3M events/day.",
      ],
    },
  ],
  education: DEMO_PROFILE.education,
  skills: [
    { name: "React / Next.js", level: "expert" },
    { name: "TypeScript", level: "expert" },
    { name: "Web performance", level: "advanced" },
    { name: "Node.js", level: "advanced" },
    { name: "PostgreSQL", level: "advanced" },
  ],
  certifications: DEMO_PROFILE.certifications,
  interests: DEMO_PROFILE.interests,
};

export const DEMO_RESUME_FILENAME = "Okafor_MeridianHealth_SeniorFrontendEngineer.pdf";
