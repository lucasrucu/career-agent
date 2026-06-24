# Career Agent

A web-hosted AI assistant that turns your experience into targeted job applications. Upload
your resume, refine it through conversation with an AI agent, search **real job listings**
(Adzuna), see a **match %** against each role, and draft a **resume tailored to each specific
job** — exported as a clean, ATS-friendly PDF.

Built for Lucas's own job search, but it ships with a public landing page and a "try it" path
so anyone can test the full flow on their own data. Each account is isolated by Supabase
Row-Level Security.

Styled after the [Financial Dashboard](../Financial-Dashboard) and a sibling of
[snip](../snip) — same "Sovereign" light theme (warm cream + amber/gold accent), Geist fonts,
Supabase + Google OAuth, and UI components.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI on `@base-ui/react` ("Sovereign" light theme, amber/gold accent)
- Supabase — Google OAuth + Postgres + Storage (its own project, separate from the dashboard and snip)
- Claude API (Anthropic SDK) — one server-side model via `ANTHROPIC_MODEL`
- Adzuna REST API — real job listings (US default; CA + other covered countries selectable)
- `@react-pdf/renderer` — PDF export · `pdf-parse` / `mammoth` — resume text extraction
- Deploy: Vercel (free `*.vercel.app` for now; custom domain TBD)

## How it works

- **`/`** — public landing page. Explains the flow (map skills → find jobs → score → tailored
  resume) and has the **Sign in with Google** CTA. Doubles as a portfolio showcase.
  Authenticated users are routed to the dashboard.
- **`/login`** + **`/auth/callback`** — Google sign-in (ported `@supabase/ssr` + `lib/auth.ts`).
- **Dashboard home** — profile-completeness widget, saved jobs by status, recent matches,
  quick actions.
- **Resume upload** — extract text from a `.pdf`/`.docx` (≤ 5 MB), send to Claude to build a
  **structured profile** (contact, summary, experience, education, skills, certifications),
  shown for review/edit before saving.
- **Skill-mapping chat** — Claude interviews you to surface implicit skills, quantify
  achievements, and fill gaps, updating the profile as you go.
- **Profile** — view and manually edit the full structured profile; this is the single source
  the matcher and resume drafter read from.
- **Job search** — query Adzuna by keywords/location/filters; save listings.
- **Match scoring** — Claude scores your profile against a job (from search or pasted) and
  returns a match %, strengths, gaps, and keywords to emphasize. Cached per
  `(profile-version, job)`.
- **Tailored resume** — one-click draft that reorders and rephrases your real experience to
  foreground what the job wants (never fabricates), editable before export.
- **PDF export** — one professional, single-column, ATS-friendly template.
  Filename `{LastName}_{Company}_{Role}.pdf`. (Dashboard styling applies to the app UI, not
  the resume document.)
- **Saved jobs** — lightweight pipeline: `Interested → Drafted → Applied → Interviewing → Closed`.

All Claude and Adzuna calls run server-side in route handlers; secrets stay server-side.

## Local setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`; `claude-haiku-4-5` for cheap testing)
   - `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (free developer tier)
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
3. Apply the schema in `supabase/migrations/` (via the Supabase MCP or the SQL editor).
4. Enable the Google provider in Supabase Auth and add the redirect URLs
   (`http://localhost:3000/auth/callback`, and the Vercel URL once deployed).
5. Create a **private** Supabase Storage bucket for uploaded resumes (scoped per user).
6. `npm run dev` → http://localhost:3000

## Database

All tables RLS-scoped by `user_id`:

- `profiles` — one structured profile per user (JSONB) + version counter
- `resumes` — uploaded source file metadata (Storage path) + parse status
- `saved_jobs` — saved listing snapshot + status enum
- `match_results` — cached scores keyed by `(user_id, job_id, profile_version)`
- `resume_drafts` — per-job tailored draft content + export metadata

Uploaded files live in a private Storage bucket scoped per user. Guest data persists 30 days,
then a cleanup job removes it.

## Not in v1

No auto-applying (drafts/exports only — you submit), no cover letters, no multi-language
resumes (English only), no billing, no LinkedIn/Indeed scraping (sanctioned APIs only), no
employer/ATS side. Candidates for v2: cover letters, Spanish resumes, a dark "portfolio"
PDF template, and a `pgvector` semantic match index.

---

See [PRD.md](PRD.md) for the full product spec and resolved decisions.
