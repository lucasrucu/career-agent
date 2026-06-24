# Product Requirements Document — Career Agent *(working name)*

**Version**: 1.0 (MVP)
**Date**: 2026-06-24
**Owner**: Lucas Ruiz
**Status**: Approved — ready for README + scaffold (Open Questions resolved 2026-06-24)

---

## 1. Overview

Career Agent is a web-hosted AI assistant that helps a job seeker turn their experience into
targeted applications. It talks to you to map your skills, ingests your existing resume,
searches **real job listings** (via the Adzuna API), scores how well you match each role
(match %), and drafts a **resume tailored to each specific job** — exported as a polished,
dashboard-styled PDF. It is built primarily for Lucas's own job search but ships with a public
landing page and a "try it" path so others can test it and see the kind of work he builds —
the same posture as the Financial Dashboard. Visually and architecturally it is a sibling of
the Financial Dashboard and the `snip` project (same theme, same auth, same stack).

---

## 2. Goals

- Let the user build a rich, structured **skill/experience profile** by uploading an existing resume and refining it through conversation with an AI agent.
- Pull **real, current job listings** from a live source and let the user search/filter them.
- Compute a **match score (%)** per job against the user's profile, with a plain-language breakdown of strengths and gaps.
- Generate a **per-role tailored resume** as a clean, dashboard-styled PDF in one click.
- Present everything in a polished dashboard + public landing page that mirrors the Financial Dashboard's look and feel, suitable as a portfolio piece.

---

## 3. Non-Goals

- **No auto-applying** to jobs. The app drafts and exports; the user submits applications themselves.
- **Not a full ATS / recruiting platform** — no employer side, no job posting.
- **No billing / payments / subscriptions** in v1.
- **No scraping** of LinkedIn/Indeed or any site without an API (ToS + fragility). Listings come from sanctioned APIs only.
- **No cover-letter generation** in v1 (candidate for v2).
- **No multi-language resumes** in v1 (English only; ES is a v2 candidate, consistent with Lucas's other tools).
- **Not multi-tenant SaaS** in the org/team sense — individual accounts only.

---

## 4. Users

- **Primary user — Lucas**: field engineer actively improving his resume and exploring roles. Comfortable with technical tools. Signs in with Google, maintains one profile, uses the app for his real job search.
- **Guests / testers**: visitors who land on the public page, sign in with Google, and try the full flow on their own data. They see the product as a demo of Lucas's work. Same feature set as the primary user (each account is isolated by Supabase Row-Level Security).

Usage context: desktop-first web app (resume drafting is a lean-forward task), responsive enough to review matches on mobile.

---

## 5. Functional Requirements

### FR-1 — Public landing page
A marketing/landing page at `/`, styled identically to the Financial Dashboard (dark theme, green accent, Geist type). Explains what Career Agent does, shows the core flow (map skills → find jobs → score → tailored resume), and has a primary **"Sign in with Google"** CTA. Doubles as a portfolio showcase. Authenticated users are routed to the dashboard.

### FR-2 — Authentication (Google OAuth via Supabase)
Google sign-in using the exact `@supabase/ssr` + `lib/auth.ts` + login/callback pattern ported from the Financial Dashboard. Each user gets an isolated account. Row-Level Security on all user data tables. Sign-out supported.

### FR-3 — Resume upload & parsing
User uploads an existing resume (`.pdf` or `.docx`). The app extracts the text and sends it to Claude to produce a **structured profile** (contact, summary, work experience with bullet points, education, skills, certifications). Parsed result is shown for review/edit before saving. Stored in Supabase.

### FR-4 — Conversational skill-mapping
An AI chat interface (Claude) that interviews the user to deepen and fill gaps in the profile created in FR-3 — surfacing implicit skills, quantifying achievements, clarifying ambiguous experience. Updates the structured profile as the conversation progresses. The seeded profile from the uploaded resume is the starting context.

### FR-5 — Profile management
A view where the user can see and manually edit their full structured profile: summary, experiences (with editable bullets), skills (add/remove/tag proficiency), education, certifications. Profile completeness indicator. This profile is the single source the matcher and resume drafter read from.

### FR-6 — Job search (Adzuna API)
Search real listings by keywords, location, and basic filters (full-time/part-time, salary range, distance, remote where the source supports it). Results show title, company, location, salary (when present), snippet, and a link to the original posting. Paginated. Each result can be saved.

### FR-7 — Match scoring
For any job (from search or pasted), Claude scores the user's profile against the job description and returns: a **match percentage**, a ranked list of **matching strengths**, a list of **gaps / missing requirements**, and **keywords to emphasize** in a tailored resume. Scores are cached per (profile-version, job) so re-opening is instant. Match results render with the dashboard's card/visual style.

### FR-8 — Tailored resume drafting
One-click "Draft tailored resume for this role." Claude rewrites/selects the user's experience and skills to foreground what the job wants (honestly — reorders and rephrases real experience, never fabricates), incorporating the FR-7 keywords. The draft is editable in-app before export.

### FR-9 — PDF export (professional, ATS-friendly)
Export the tailored resume to a clean PDF via `@react-pdf/renderer`. **One** professional template for v1: single-column, light background, recruiter- and ATS-parser-friendly, using the app's typography but print-appropriate (no dark backgrounds, no multi-column layouts that break ATS scanners). The app's dashboard styling applies to the UI, **not** to the resume document. Filename: `{LastName}_{Company}_{Role}.pdf`. (A dark "portfolio-styled" variant is a v2 candidate.)

### FR-10 — Saved jobs & application tracking
Saved jobs live in a dashboard list with a status field (`Interested` → `Drafted` → `Applied` → `Interviewing` → `Closed`). Each saved job links to its match score and any drafted resume. Lightweight pipeline view.

### FR-11 — Dashboard home
The authenticated home screen (mirroring the Financial Dashboard layout): profile-completeness widget, count of saved jobs by status, recent matches, and quick actions (search jobs, edit profile, upload resume).

---

## 6. Non-Functional Requirements

- **Platform**: Web app, deployed to Vercel. Desktop-first, responsive.
- **Performance**: Landing + dashboard first paint < 2s on broadband. Job search results < 3s (Adzuna round-trip). Match scoring and resume drafting are AI calls — show streaming/progress; target < 20s each. PDF export < 3s.
- **Visual parity**: Theme tokens, fonts, and UI primitives ported from the Financial Dashboard so the apps look like one family. No bespoke design system.
- **Security**: All user data behind Supabase RLS; uploaded files in a private Supabase Storage bucket scoped per user. Secrets server-side only.
- **Cost control**: A single server-side Claude model for all calls in v1 (default `claude-sonnet-4-6`, swappable to `claude-haiku-4-5` for testing) via one env var; not user-configurable. Cache match scores.
- **Accessibility**: Keyboard-navigable, sufficient contrast (the dashboard theme already targets this).

---

## 7. Technical Constraints

Ported/shared with the Financial Dashboard unless noted:

- **Framework**: Next.js 14 (App Router) + TypeScript.
- **Styling**: Tailwind CSS with the dashboard's HSL CSS-variable theme (dark, green accent `--primary: 142.1 70.6% 45.3%`). Port `app/globals.css` theme tokens and `tailwind.config.ts`.
- **UI**: shadcn-style components on `@base-ui/react`; reuse `components/ui/`.
- **Fonts**: Geist (sans + mono).
- **Auth + DB**: Supabase (`@supabase/ssr`) with Google OAuth; port `lib/supabase/`, `lib/auth.ts`, and the login/callback flow. New, separate Supabase project from the dashboard and from `snip`.
- **AI**: Claude API (Anthropic SDK). **One configurable model** for all calls in v1 via a single server-side env var `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`; set to `claude-haiku-4-5` for cheap testing). Not exposed to users. All Claude calls server-side (route handlers); use structured/tool output for parsing, scoring, and drafting. Model split (stronger model for parse/score/draft) is a trivial later change if quality demands it.
- **Job data**: Adzuna REST API (free developer tier — `app_id` + `app_key`). Default country **US**; Canada and other Adzuna-covered countries selectable. Indonesia isn't covered and isn't needed — US/CA/remote roles are the target.
- **Resume parsing input**: a PDF/DOCX text extractor (e.g. `pdf-parse` / `mammoth` for docx) feeding text to Claude.
- **PDF generation**: `@react-pdf/renderer` (Vercel-friendly, no headless Chromium).
- **Hosting**: Vercel (free `*.vercel.app` subdomain for now; custom domain TBD later). Node 20+.
- **Env vars** (server-side): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `GOOGLE_OAUTH_*` (via Supabase).

---

## 8. Input / Output Specification

**Inputs**
- Resume file: `.pdf` or `.docx`, ≤ 5 MB.
- Chat messages: free text (skill-mapping interview).
- Job search params: `query` (keywords), `where` (location), optional filters (`salary_min`, `full_time`, `distance`, `results_per_page`, `page`).
- Pasted job: free-text job description or a job URL (text extracted).

**Outputs**
- **Structured profile** (Supabase JSON): `{ contact, summary, experiences[ {title, company, dates, bullets[]} ], education[], skills[ {name, level} ], certifications[] }`.
- **Job list**: array of `{ id, title, company, location, salary_min, salary_max, snippet, url, created }` from Adzuna.
- **Match result** (cached): `{ job_id, profile_version, match_pct, strengths[], gaps[], keywords[] }`.
- **Tailored resume**: editable structured draft → exported `{LastName}_{Company}_{Role}.pdf`.

**Supabase schema (initial tables, all RLS by `user_id`)**
- `profiles` — one structured profile per user (JSONB) + version counter.
- `resumes` — uploaded source files metadata (Storage path) + parse status.
- `saved_jobs` — saved listing snapshot + status enum.
- `match_results` — cached scores keyed by `(user_id, job_id, profile_version)`.
- `resume_drafts` — per-job tailored draft content + export metadata.

**Adzuna call (example)**
`GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=…&app_key=…&what={query}&where={where}&results_per_page=20`

---

## 9. Error Handling

| Scenario | Expected behavior |
|---|---|
| Adzuna rate limit / outage | Show a non-blocking error; offer "paste a job description" fallback so scoring/drafting still work. |
| Adzuna country not covered | Default to US; if a user picks an uncovered country, message them and steer to a covered country or paste-a-job. |
| Resume parse fails / unreadable PDF | Surface the failure, let the user retry, paste resume text manually, or build the profile via conversation only. |
| Oversized / wrong-type upload | Reject client-side with a clear message (≤ 5 MB, PDF/DOCX only). |
| Claude API error / timeout | Retry once with backoff; if still failing, show a friendly error and preserve any partial draft. Never lose user edits. |
| Empty job search results | Show an empty state with suggestions to broaden keywords/location. |
| Unauthenticated access to app routes | Redirect to landing/login. |
| Guest data retention | All account data persists **30 days**, then a cleanup job removes guest data. Low priority (app is for viewing / personal use). |

---

## 10. CLI Interface

Not applicable — this is a web application. (No CLI.)

---

## 11. Success Criteria

- A user can sign in with Google, upload a resume, and see a correctly structured profile they can edit.
- The skill-mapping chat measurably enriches the profile (adds skills/quantified bullets not in the original resume).
- A job search returns real, current Adzuna listings matching the query/location.
- Each job shows a match % with a sensible strengths/gaps/keywords breakdown.
- "Draft tailored resume" produces a role-specific resume that (a) uses only true profile facts and (b) visibly emphasizes the job's keywords.
- The exported PDF renders cleanly in the dashboard style and opens correctly.
- Saved jobs persist with status across sessions; data is isolated per account (verified via RLS).
- The app is visually indistinguishable as a sibling of the Financial Dashboard, and the public landing page works for an unauthenticated visitor.

---

## 12. Resolved Decisions

All open questions were resolved on 2026-06-24:

1. **Adzuna geography** — Not a constraint. Target US/Canada (Adzuna-covered) and remote roles; default country **US**. Indonesia coverage not needed.
2. **Product name + domain** — Product name confirmed: **Career Agent**. No custom domain for now; run on the free Vercel subdomain. Domain to be decided later (not blocking).
3. **Guest data retention** — Persist **30 days**, then cleanup. Low priority — the app is for viewing/personal use.
4. **Resume template** — **One** professional, ATS-friendly template for v1 (single-column, light, print/parser-safe). Dark "portfolio" variant deferred to v2. The dashboard styling applies to the app UI, not the resume document.
5. **Claude model** — **One** server-side model via env var `ANTHROPIC_MODEL`, default `claude-sonnet-4-6`, `claude-haiku-4-5` for testing. Not user-facing. Per-task model split deferred (trivial later change).
6. **Match-scoring approach** — **LLM-only** (per-job Claude scoring, cached) for v1. `pgvector` semantic index deferred to v2.

---

*This PRD is approved. Next: run the `readme-writer` skill to generate the README, then scaffold the Next.js app (porting the Financial Dashboard's theme + Supabase/Google-OAuth pattern).*
