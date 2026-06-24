# Career Agent

**Turn your real experience into job applications that land.** Upload your resume, search live job listings, see an honest match score for any role, and generate a resume tailored to that specific job — exported as a clean, ATS-friendly PDF. All from your own data, with AI doing the heavy lifting.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js_14-000?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Claude" src="https://img.shields.io/badge/Claude_API-D97757?logo=anthropic&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white">
</p>

> A full-stack AI product I built end to end — auth, database, a structured-output LLM pipeline, a third-party job API, and PDF generation — not a wrapper around a single prompt.

---

## What it does

```
Upload resume  →  Search real jobs  →  Score your match  →  Tailor & export PDF
```

1. **Upload** a `.pdf` or `.docx`. AI reads it into a structured profile (experience, skills, education) that you review and edit.
2. **Search** real, current job listings by role and location (powered by the Adzuna API).
3. **Score** — for any listing, AI returns an honest match percentage with your concrete strengths, gaps, and the keywords that matter for that role.
4. **Tailor** — one click reorders and rephrases *your real experience* to foreground what the job wants (it never invents anything), then exports a single-column, ATS-friendly PDF named `LastName_Company_Role.pdf`.

Every account is fully isolated — your data is only ever visible to you (enforced at the database level with Row-Level Security).

## Highlights

- **Structured-output AI pipeline** — three Claude touchpoints (parse, match, tailor), each constrained to a strict JSON Schema via tool-use, so responses are always valid and never free-form text to babysit.
- **Honest by design** — the match score is calibrated, not flattering, and the resume tailoring is built so it *cannot* fabricate experience you don't have.
- **Real data, sanctioned sources** — live listings from the Adzuna API, no scraping.
- **Caching where it counts** — match results are cached per `(profile version, job)` so re-opening a role is instant and free.
- **Production-shaped** — Google OAuth, per-user RLS, private file storage, server-side secrets, typed end to end.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + Radix-style primitives on `@base-ui/react`, TanStack Query |
| Auth & data | Supabase — Google OAuth, Postgres (Row-Level Security), private Storage |
| AI | Claude API (Anthropic SDK) — one server-side model, structured output via tool-use |
| Jobs | Adzuna REST API |
| Documents | `@react-pdf/renderer` (export) · `pdf-parse` / `mammoth` (resume extraction) |
| Hosting | Vercel |

## How it works (at a glance)

```
Browser ──▶ Next.js route handlers ──▶ Supabase (Auth · Postgres · Storage)
                     │
                     ├─▶ Claude API    (parse résumé · score match · tailor draft)
                     └─▶ Adzuna API    (live job listings)
```

All AI and third-party calls run server-side; secrets never reach the browser. For the full technical write-up — the AI pipeline, parsing, match-scoring, caching, and data model — see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

You'll need keys for:
- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Anthropic** — `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`; defaults to `claude-sonnet-4-6`, set `claude-haiku-4-5` for cheap testing)
- **Adzuna** — `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (free developer tier)

Then apply the schema in `supabase/migrations/0001_init.sql` (creates the tables, RLS policies, and the private `resumes` bucket), enable Google as an auth provider, and add `http://localhost:3000/auth/callback` to the Supabase auth redirect allow-list.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it's built: the AI pipeline, parsing, scoring, data model, security.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — where it's going next.
- **[PRD.md](PRD.md)** — the original product spec and decisions.

## Status

MVP — the full flow works end to end (upload → review → search → score → tailor → export). Built as a portfolio project and as a tool for my own job search. Matching is LLM-only for now; English-only resumes. See the roadmap for what's planned.

---

Built by **Lucas Ruiz**.
