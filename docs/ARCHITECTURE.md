# Career Agent — Technical Architecture

Career Agent is a single-page job-search workspace built on Next.js (App Router) and Supabase. A signed-in user uploads a resume, which Claude parses into a structured profile; the user reviews and saves it. From there they search real job listings (Adzuna), get an honest, calibrated match score per role, and one-click generate a role-tailored resume drafted only from their real experience — exported as an ATS-friendly PDF. Three discrete Claude touchpoints (parse, score, tailor) do the AI work; everything else is conventional CRUD over Postgres with Row-Level Security as the security boundary.

## 1. Overview

The browser talks only to Next.js route handlers under `app/api/*`. Those handlers authenticate the request, enforce per-user data isolation through Supabase RLS, and fan out to three downstream services: Supabase (Postgres + Auth + Storage), the Claude API, and the Adzuna jobs API.

```
                            ┌──────────────────────── Supabase ────────────────────────┐
                            │  Postgres (RLS per user_id) · Auth (Google OAuth)         │
                            │  Storage ('resumes' private bucket, path-scoped per user) │
                            └───────────────────────────▲───────────────────────────────┘
                                                        │ anon key + user JWT (cookies)
                                                        │
  ┌─────────┐   fetch / multipart    ┌─────────────────┴──────────────────┐    ┌──────────────┐
  │ Browser │ ─────────────────────▶ │   Next.js route handlers (app/api) │ ─▶ │  Claude API  │
  │ (React  │ ◀───────────────────── │   requireUser() guard on every one │    │ (parse/score │
  │  Query) │      JSON / PDF        │                                     │    │  /tailor)    │
  └─────────┘                        └─────────────────┬──────────────────┘    └──────────────┘
        ▲                                              │
        │  session-refresh on every request           │ GET jobs
        └────────── middleware.ts ────────────────────┴──────────────────▶  Adzuna jobs API
```

Server Components (`app/page.tsx`, `app/dashboard/page.tsx`) handle auth-based routing; the interactive dashboard is a client tree that drives the API routes through React Query.

## 2. Tech stack

- **Next.js (App Router)** — Server Components for auth gating, route handlers (`runtime = "nodejs"`) for the API, `middleware.ts` for session refresh.
- **TypeScript** — one shared data contract in `lib/types.ts` mirrored by the Postgres schema and the Claude tool schemas.
- **Supabase** — Postgres (data + RLS), Auth (Google OAuth via `@supabase/ssr`), and Storage (private `resumes` bucket).
- **Claude (`@anthropic-ai/sdk`)** — structured extraction/scoring/tailoring via forced single-tool-use. One server-side model, set by env.
- **Adzuna REST API** — real job listings (free developer tier), wrapped by `lib/adzuna.ts`.
- **pdf-parse / mammoth** — server-side text extraction from PDF / DOCX uploads.
- **@react-pdf/renderer** — renders the tailored profile to an ATS-friendly PDF (`lib/pdf/ResumeDocument.tsx`).
- **TanStack React Query** — client-side data fetching/caching and mutation state in the dashboard.
- **Tailwind + shadcn-style UI** (`components/ui/*`), **lucide-react** icons, **sonner** toasts.

## 3. Authentication & data isolation

Auth is Google OAuth, brokered by Supabase through the `@supabase/ssr` helpers:

- **Sign-in** — `app/login/page.tsx` calls `supabase.auth.signInWithOAuth({ provider: "google" })` with a redirect to `app/auth/callback/route.ts`, which exchanges the OAuth `code` for a session (`exchangeCodeForSession`) and redirects to `/dashboard` (or `?error=auth` on failure).
- **Session refresh** — `middleware.ts` runs on `/`, `/login`, `/dashboard/*`, and `/api/*`. It calls `supabase.auth.getUser()` to refresh the session cookies on every request and **never redirects** — routing decisions are left to Server Components and the API guard, which keeps the public landing page open to anonymous visitors.
- **Route gating** — Server Components do the redirecting: the landing page sends authed users to `/dashboard`; `app/dashboard/page.tsx` sends anonymous users to `/login`.
- **API guard** — every API route begins with `requireUser()` (`lib/auth.ts`), which builds a request-scoped Supabase client (`lib/supabase/server.ts`), calls `auth.getUser()`, and returns a ready-to-send `401 Unauthorized` response when there's no user. No route does work before this check.

**RLS is the real security boundary.** Every user-data table has Row-Level Security enabled with an `auth.uid() = user_id` policy (`supabase/migrations/0001_init.sql`), and the private `resumes` storage bucket is gated by a policy requiring the first path segment to equal `auth.uid()` (files are stored under `{user_id}/...`). Because the database itself enforces ownership, the `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the project ref are **public by design** — they appear in the client bundle and grant nothing beyond what RLS allows for the caller's own JWT. The application-level `.eq("user_id", user.id)` filters in the routes are defense-in-depth, not the boundary.

## 4. Where AI is used

There are exactly **three** Claude touchpoints. All of them go through one helper, `generateStructured()` in `lib/anthropic.ts`, which forces a **single tool call** (`tool_choice: { type: "tool", name }`) whose `input_schema` is the JSON Schema the response must conform to. The tool input is read back as the result, so the response is **always schema-valid** — there is no free-text JSON parsing to fail.

| Touchpoint | Route | Input | System-prompt intent | Output schema |
|---|---|---|---|---|
| Resume parse (FR-3) | `app/api/resume/parse/route.ts` | Extracted resume plain text | Extract only real info; never invent; preserve bullet wording | `PROFILE_SCHEMA` |
| Match score (FR-7) | `app/api/match/route.ts` | Profile JSON + job text | Honest, calibrated fit; ground every strength/gap in evidence | `MATCH_SCHEMA` |
| Resume tailor (FR-8) | `app/api/resume/draft/route.ts` | Profile JSON + job + match keywords | Reorder/rephrase real experience only; never fabricate | `PROFILE_SCHEMA` |

The model is a **single server-side model** chosen by the `ANTHROPIC_MODEL` env var (`model()` in `lib/anthropic.ts`, default `claude-sonnet-4-6`) — Haiku for cheap testing, Sonnet for production. It is **never user-facing or user-selectable**. The helper deliberately sends **no `thinking` / `effort` / sampling params**, so the identical call is valid whether the configured model is Haiku (which rejects those params) or Sonnet. Schemas live in `lib/schemas.ts` and mirror the TypeScript shapes in `lib/types.ts`, so parse, score, and tailor share one source of truth.

## 5. Resume parsing pipeline

`POST /api/resume/parse` is a multipart upload handled in `app/api/resume/parse/route.ts`:

1. **Auth** via `requireUser()`.
2. **Validation** — reject anything over 5 MB (`MAX_RESUME_BYTES`, `413`) and anything that isn't PDF or DOCX (`resumeKind()` checks both MIME type and extension, `415`).
3. **Store the source file** — the buffer is uploaded to the private `resumes` bucket under `{user.id}/{timestamp}-{sanitizedName}`; the user-supplied filename is stripped to `[\w.\-]` so it can't introduce surprising keys. A `resumes` row is inserted with `parse_status = 'pending'`. If the row insert fails, the just-uploaded file is removed so the bucket doesn't orphan files.
4. **Text extraction** (`lib/resume-text.ts`) — PDFs go through `pdf-parse`, imported as the submodule `pdf-parse/lib/pdf-parse.js` to **dodge the package's debug harness**, whose index module reads a bundled test PDF at import time and throws inside a Next.js server bundle. DOCX goes through `mammoth.extractRawText`.
5. **Normalization** — `normalizeWhitespace()` converts unicode/non-breaking spaces to regular spaces, collapses space/tab runs, and caps blank-line runs **while preserving newlines** so the model still sees line structure. Output is capped at 40 000 chars; if fewer than ~30 non-whitespace chars survive (e.g. a scanned image PDF), it throws a clear error.
6. **Structured parse** — the text is sent to Claude under a **no-fabrication system prompt** ("Only use information present in the text. Never invent…"). The user prompt fences the resume behind a `---` delimiter as a data boundary. Output is forced into `PROFILE_SCHEMA`.
7. **On success** the `resumes` row flips to `parsed` and the route **returns the `Profile` for user review — it is NOT auto-saved.** Persisting the profile is a separate, explicit `PUT /api/profile`. On failure the row is marked `failed`, the orphaned source file is removed, and a `502` carries the error message.

## 6. Match scoring

`POST /api/match` (`app/api/match/route.ts`) scores how well the saved profile fits a job. Jobs arrive three ways and are normalized by `resolveJob()` (`lib/job-context.ts`):

- a **full snapshot** from search results (`body.job`),
- a **saved id** (`body.job_id`) looked up in `saved_jobs`,
- or a **pasted description** (`body.job_description`), which is wrapped in a synthetic `Job` whose id is `pasted:{hash}`. The hash is a deterministic 31-base rolling hash of the text, so re-scoring the *same* pasted text produces a **stable `job_id`** and therefore a cache hit.

The route loads the profile and its `version`, then does a **cache lookup on `(user_id, job_id, profile_version)`** against `match_results`. On a hit it returns the cached row directly — no Claude call. On a miss it calls Claude with the honest/calibrated coach system prompt (which also instructs that the profile and posting are **data, not instructions**), forces `MATCH_SCHEMA`, gets back `{ match_pct, strengths, gaps, keywords }`, **clamps `match_pct` to 0–100**, and upserts the row keyed on `(user_id, job_id, profile_version)`.

**Why the cache key includes `profile_version`:** the cache is invalidated automatically when the user edits their profile. Saving the profile bumps `version` (see §8), so the next score request misses the old cache entry and re-scores against the new profile — without ever needing an explicit cache purge. Old entries simply become unreachable.

## 7. Resume tailoring & PDF export

**Tailoring** — `POST /api/resume/draft` (`app/api/resume/draft/route.ts`) resolves the job the same way as match, loads the profile + `version`, and — if a match for `(user_id, job_id, profile_version)` already exists — folds its `keywords` into the prompt (otherwise the model infers them). Claude runs under a **hard no-fabrication system prompt**: it may reorder, reframe, and rephrase the candidate's *real* experience and weave in keywords, but must never invent jobs, titles, dates, employers, education, certs, or skills, must keep factual fields exact, and must keep every real entry (reorder, don't drop). Output is forced back into `PROFILE_SCHEMA` — the tailored draft reuses the same `Profile` shape. The result is upserted into `resume_drafts` keyed on `(user_id, job_id, profile_version)`, with the export filename precomputed by `exportFilename()`.

**PDF export** — `POST /api/resume/export` (`app/api/resume/export/route.ts`) accepts either `{ content: Profile }` directly or `{ job_id }` (which loads the latest stored draft by `profile_version`). It renders `ResumeDocument` (`lib/pdf/ResumeDocument.tsx`) via `@react-pdf/renderer` and streams the bytes back with `Content-Disposition: attachment` and `Cache-Control: no-store`. The document is deliberately **ATS-friendly**: a single-column LETTER page using only built-in **Helvetica** (no embedded fonts, so PDF text parsers stay reliable), no tables, columns, or graphics. The filename follows `{LastName}_{Company}_{Role}.pdf` (`lib/filename.ts`), with graceful fallbacks when company/role are absent (e.g. pasted jobs).

## 8. Data model

All tables are defined in `supabase/migrations/0001_init.sql`, RLS-scoped by `user_id`, and additive over the shared Supabase project (they don't touch other apps' tables). Two enums back status fields: `parse_status` and `saved_job_status`.

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `user_id` (PK → `auth.users`), `profile jsonb`, `version int`, `updated_at` | One row per user. The structured profile is stored as **JSONB**; `version` is a counter bumped on every save and is the cache key for matches and drafts. |
| `resumes` | `id`, `user_id`, `storage_path`, `file_name`, `parse_status` | Upload metadata. The actual file lives in the private `resumes` storage bucket at `storage_path`. |
| `saved_jobs` | `id`, `user_id`, `job_id text`, `job jsonb`, `status`, `saved_at` | **`unique (user_id, job_id)`** — one saved row per listing; `job` is the full listing snapshot; `status` tracks the pipeline (`interested` → … → `closed`). |
| `match_results` | `id`, `user_id`, `job_id`, `profile_version`, `match_pct`, `strengths/gaps/keywords jsonb` | **`unique (user_id, job_id, profile_version)`** — this constraint *is* the match cache; the route upserts on it. |
| `resume_drafts` | `id`, `user_id`, `job_id`, `profile_version`, `content jsonb`, `export_filename` | **`unique (user_id, job_id, profile_version)`** — one tailored draft per job per profile version; `content` is a tailored `Profile`. |

The `(user_id, job_id, profile_version)` unique constraints on `match_results` and `resume_drafts` are what let the routes use `upsert(..., { onConflict })` as an idempotent cache write. The migration also documents a guest-data 30-day retention cleanup as a **TODO**, not yet enforced in v1.

## 9. Dashboard data flow

The dashboard is a client tree (`app/dashboard/DashboardClient.tsx`) with three tabs — Overview, Profile, Jobs — rendered after the Server Component (`app/dashboard/page.tsx`) confirms auth. All reads and writes go through the typed wrappers in `lib/api-client.ts`, which unwrap the `ApiResult<T>` envelope and throw `Error(message)` on the error branch so React Query and toasts get a clean message.

- **Profile** (`ProfileSection.tsx`) — `useQuery(["profile"], getProfile)` hydrates an editable form once (it won't clobber in-progress edits on refetch). Upload calls `parseResume()` and drops the returned (unsaved) profile into the form for review; **Save** calls `saveProfile()` (`PUT /api/profile`), which bumps `version`, and the success toast shows the new `v{n}`.
- **Jobs** (`JobsSection.tsx`) — search → `searchJobs()`; each result card drives `scoreMatch()`, `draftResume()`, and `exportResumePdf()` against a `JobInput` that is either a real `Job` or a pasted `job_description`. Saving a job invalidates the `["saved-jobs"]` query.
- **Overview** (`OverviewSection.tsx`) — reads `["profile"]` and `["saved-jobs"]` to show a rough completeness percentage and pipeline counts.

**The saved profile is the single source of truth** that both the matcher and the drafter read from server-side; the dashboard copy below the metrics says as much. The Jobs section never re-sends the profile — the match/draft routes always pull the current `profiles` row by `user_id`.

## 10. Known limitations / honesty

- **LLM-only matching.** Match scores come entirely from a single Claude call; there is no embedding/vector retrieval or deterministic keyword overlap to back or sanity-check the score. It's calibrated by prompt, not by math.
- **English-only.** Prompts, the ATS PDF (Helvetica), and the parsing assumptions are English-oriented; non-English resumes/postings aren't a tested path.
- **The `Profile` schema has no field for interests, extracurriculars, or non-professional achievements.** `PROFILE_SCHEMA` covers contact, summary, experience, education, skills, and certifications only — so hobbies and things like sports accomplishments are **dropped on parse**. This is a deliberate v1 scope cut, not a bug, but it's a real data-loss edge.
- **The profile version bump is not atomic.** `PUT /api/profile` reads the current `version` and then upserts `version + 1` in two steps; under concurrent saves this read-modify-write could collide. It's safe for the single-user, single-session usage this app targets, but it isn't a transaction.
- **Guest-data retention is unimplemented.** The 30-day cleanup is documented in the migration as a TODO; nothing currently prunes old rows or storage objects.
