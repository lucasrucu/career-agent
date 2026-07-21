-- 0003_retention_indexes.sql
-- Supporting indexes for the guest-data retention runner
-- (app/api/admin/retention/route.ts, PRD §9). Additive and idempotent.
--
-- NOT APPLIED YET. Committed for review only. Apply it the same way as the
-- earlier migrations (Supabase SQL editor or the Supabase MCP) against the
-- SHARED project (ref xbpbuwrrpnhaubimihpq) when the retention job is enabled.
-- Touches nothing existing and nothing outside career-agent's own tables — it
-- never references snip's `links` table.
--
-- Why: the runner computes each user's newest activity and then deletes per
-- user, per table. Composite (user_id, <timestamp>) indexes make both the
-- max-timestamp scan and the scoped delete cheap. 0001_init already indexes
-- user_id alone on most tables; these add the timestamp as a second column so
-- the "newest row per user" lookup is index-only.

create index if not exists resumes_user_created_idx
  on public.resumes (user_id, created_at desc);

create index if not exists saved_jobs_user_saved_idx
  on public.saved_jobs (user_id, saved_at desc);

create index if not exists match_results_user_created_idx
  on public.match_results (user_id, created_at desc);

create index if not exists resume_drafts_user_updated_idx
  on public.resume_drafts (user_id, updated_at desc);

-- profiles is keyed by user_id (PK), so its updated_at scan is already a single
-- indexed row per user; no extra index needed there.
