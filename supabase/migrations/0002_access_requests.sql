-- 0002_access_requests.sql
-- Backs the public landing-page "Request Access" form. Operator-only:
-- RLS is enabled with NO policies, so only the service role (used server-side
-- by /api/access-request) can read or write it. Additive to 0001_init.sql and
-- to the shared snip/career-agent project; touches nothing existing.
--
-- Applied to the shared project (ref xbpbuwrrpnhaubimihpq) on 2026-06-24 via
-- the Supabase MCP.

create table if not exists public.access_requests (
  id         uuid        primary key default gen_random_uuid(),
  app        text        not null default 'career-agent',
  email      text        not null,
  note       text,
  ip         text,
  user_agent text,
  status     text        not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists access_requests_created_idx on public.access_requests (created_at desc);
create index if not exists access_requests_email_idx on public.access_requests (lower(email));

alter table public.access_requests enable row level security;
