-- Career Agent — initial schema (PRD §8).
-- All user-data tables are RLS-scoped by user_id. Apply via the Supabase SQL
-- editor or the Supabase MCP against Career Agent's own project.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type parse_status as enum ('pending', 'parsed', 'failed');
create type saved_job_status as enum (
  'interested', 'drafted', 'applied', 'interviewing', 'closed'
);

-- ---------------------------------------------------------------------------
-- profiles — one structured profile per user (FR-3 / FR-5)
-- ---------------------------------------------------------------------------
create table profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- resumes — uploaded source file metadata (FR-3)
-- ---------------------------------------------------------------------------
create table resumes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,            -- path in the private 'resumes' bucket
  file_name    text not null,
  parse_status parse_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index resumes_user_idx on resumes (user_id);

-- ---------------------------------------------------------------------------
-- saved_jobs — saved listing snapshot + pipeline status (FR-6 / FR-10)
-- ---------------------------------------------------------------------------
create table saved_jobs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  job_id   text not null,                -- Adzuna id, or a local id for pasted jobs
  job      jsonb not null,               -- listing snapshot (Job shape)
  status   saved_job_status not null default 'interested',
  saved_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index saved_jobs_user_idx on saved_jobs (user_id);

-- ---------------------------------------------------------------------------
-- match_results — cached LLM scores (FR-7)
-- ---------------------------------------------------------------------------
create table match_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  job_id          text not null,
  profile_version integer not null,
  match_pct       integer not null,
  strengths       jsonb not null default '[]'::jsonb,
  gaps            jsonb not null default '[]'::jsonb,
  keywords        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (user_id, job_id, profile_version)
);
create index match_results_user_idx on match_results (user_id);

-- ---------------------------------------------------------------------------
-- resume_drafts — per-job tailored draft (FR-8 / FR-9)
-- ---------------------------------------------------------------------------
create table resume_drafts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  job_id          text not null,
  profile_version integer not null,
  content         jsonb not null,        -- tailored Profile shape
  export_filename text,
  updated_at      timestamptz not null default now(),
  unique (user_id, job_id, profile_version)
);
create index resume_drafts_user_idx on resume_drafts (user_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security — owners see only their own rows
-- ---------------------------------------------------------------------------
alter table profiles       enable row level security;
alter table resumes        enable row level security;
alter table saved_jobs     enable row level security;
alter table match_results  enable row level security;
alter table resume_drafts  enable row level security;

create policy "own profiles"      on profiles      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own resumes"       on resumes       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved_jobs"    on saved_jobs    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own match_results" on match_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own resume_drafts" on resume_drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage — private bucket for uploaded resumes, scoped per user.
-- Files are stored under "{user_id}/..." so the path prefix gates access.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "own resume files"
  on storage.objects for all
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Guest-data retention (PRD §9): a cleanup job removes data older than 30 days.
-- Run server-side with the service-role key (e.g. a Vercel cron). Left as a
-- documented TODO — not enforced in v1 schema.
-- ---------------------------------------------------------------------------
