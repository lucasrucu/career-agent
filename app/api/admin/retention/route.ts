import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_RETENTION_DAYS,
  parseOwnerEmails,
  retentionCutoff,
  selectEligibleUserIds,
  type RetentionUser,
} from "@/lib/retention";

// Guest-data retention runner (PRD §9, ARCHITECTURE §8, §11).
//
// Prunes career-agent data for guest (non-owner) accounts whose newest activity
// is older than the retention window, plus stale rows in the guest-facing
// `access_requests` table. It is DRY-RUN by default: it only deletes when
// RETENTION_DRY_RUN is explicitly set to the string "false". Otherwise it
// reports what it WOULD delete and touches nothing.
//
// SHARED-PROJECT SAFETY: this Supabase project is shared with `snip`
// (ref xbpbuwrrpnhaubimihpq). This runner only ever names career-agent's OWN
// tables (the five user-data tables + `access_requests`, scoped to
// app = 'career-agent') and the `resumes` storage bucket. It NEVER touches
// `snip`'s `links` table or anything outside the lists below. It also NEVER
// deletes the auth user itself — see the note on AUTH_USER_DELETE below.
//
// WHAT "ACTIVITY" MEANS (deliberate limitation): a user's newest activity is the
// max of their auth `created_at`, `last_sign_in_at`, and the newest row across
// the five career-agent tables. That is WRITES + explicit sign-ins only. A
// persistent auto-refreshing session (token refresh with no fresh sign-in and no
// new writes) does NOT register as activity, so a guest who only reads their
// saved data for weeks can still become eligible. This is accepted for a 30-day
// window on a demo app; if it matters later, add a heartbeat write on read or
// read GoTrue session refresh times. Documented in ARCHITECTURE §10/§11.
//
// Trigger it server-side only (Vercel cron or a manual authenticated curl). Two
// guards keep a random visitor from running it:
//   1. it refuses without the service-role key (misconfigured deploy), and
//   2. it requires a shared secret in the `x-retention-secret` header that must
//      equal env RETENTION_SECRET (compared in constant time).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// career-agent's own user-data tables, in a delete-safe order (children before
// the profile row). Every one is RLS-scoped by user_id in 0001_init.sql. Most
// would cascade from auth.users, but we delete each explicitly so nothing
// depends on cascade behavior — and so we never need to touch auth.users.
const USER_TABLES = [
  "resume_drafts",
  "match_results",
  "saved_jobs",
  "resumes",
  "profiles",
] as const;

// Per-table timestamp column used to compute a user's newest activity.
const ACTIVITY_COLUMNS: Record<string, string> = {
  profiles: "updated_at",
  resumes: "created_at",
  saved_jobs: "saved_at",
  match_results: "created_at",
  resume_drafts: "updated_at",
};

// The guest-facing "Request Access" table (0002_access_requests.sql). It stores
// guest PII — email, ip, user_agent, note — for people who submit the landing
// form. It has NO user_id and no FK, so a guest who never gets an approved auth
// account never enters the per-user scan above; their PII would otherwise live
// forever. We prune rows older than the retention window by `created_at`, scoped
// to app = 'career-agent' so we never touch another app's rows in this shared
// table.
const ACCESS_REQUESTS_TABLE = "access_requests";
const ACCESS_REQUESTS_APP = "career-agent";

// We do NOT delete the auth.users row. The auth pool is SHARED with snip, and
// snip's `links.user_id` references auth.users(id). Deleting a user here could
// cascade-destroy that user's snip data — out of scope and dangerous. Pruning
// only career-agent's own rows is reversible-ish (the guest can re-upload) and
// stays strictly inside this app's boundary.
const AUTH_USER_DELETE = false;

const STORAGE_BUCKET = "resumes";

type TableCount = Record<string, number>;

interface UserReport {
  user_id: string;
  email: string | null;
  newest_activity: string | null;
  rows: TableCount;
  storage_objects: number;
  deleted: boolean;
  error?: string;
}

interface RunError {
  scope: string;
  error: string;
}

function isLiveRun(): boolean {
  // DRY-RUN is the hard default. Only the exact string "false" enables deletes.
  return process.env.RETENTION_DRY_RUN === "false";
}

function retentionDays(): number {
  const raw = process.env.RETENTION_DAYS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

/**
 * Constant-time secret comparison. Both sides are hashed to a fixed-length
 * digest first so `timingSafeEqual` always gets equal-length buffers and the
 * comparison leaks neither the secret's length nor its content via timing.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Newest ISO timestamp per user across all career-agent tables. */
async function activityByUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const [table, column] of Object.entries(ACTIVITY_COLUMNS)) {
    const { data, error } = await supabase.from(table).select(`user_id, ${column}`);
    if (error) {
      throw new Error(`Failed reading ${table}: ${error.message}`);
    }
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const userId = row.user_id as string | null;
      const ts = row[column] as string | null;
      if (!userId || !ts) continue;
      const existing = map.get(userId);
      if (!existing || new Date(ts).getTime() > new Date(existing).getTime()) {
        map.set(userId, ts);
      }
    }
  }

  return map;
}

/**
 * Every auth user, paginated via the admin API. Uses GoTrue's own `nextPage`
 * cursor when the client surfaces it (authoritative), and only falls back to a
 * "full page returned" heuristic when it doesn't — so we never stop early while
 * more users exist (which would silently skip pruning them). Page size is kept
 * within GoTrue's supported range.
 */
async function listAllAuthUsers(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null }>> {
  const out: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }> = [];

  const perPage = 50;
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed listing auth users: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      out.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }

    const nextPage = (data as { nextPage?: number | null } | null)?.nextPage;
    if (typeof nextPage === "number" && nextPage > page) {
      page = nextPage;
      continue;
    }
    // Older clients may not surface nextPage; only then fall back to the length
    // heuristic, and keep going while a full page came back.
    if (nextPage === undefined && users.length === perPage) {
      page += 1;
      continue;
    }
    break;
  }

  return out;
}

/** Count rows per table for one user (defense-in-depth, also feeds the report). */
async function countRowsForUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<TableCount> {
  const counts: TableCount = {};
  for (const table of USER_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw new Error(`Failed counting ${table}: ${error.message}`);
    counts[table] = count ?? 0;
  }
  return counts;
}

/**
 * Storage object paths under `{userId}/` in the resumes bucket. Paginated so a
 * user with more than one page of objects still has every path returned (an
 * un-paginated list would leave the overflow undeleted).
 */
async function listStoragePaths(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<string[]> {
  // Files are stored one level deep as `{userId}/{name}` (see resume/parse).
  const paths: string[] = [];
  const pageSize = 100;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId, { limit: pageSize, offset });
    if (error) throw new Error(`Failed listing storage for ${userId}: ${error.message}`);
    const batch = data ?? [];
    for (const obj of batch) {
      if (obj.name && obj.id !== null) paths.push(`${userId}/${obj.name}`); // skip folder placeholders
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return paths;
}

async function deleteUserData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  storagePaths: string[],
): Promise<void> {
  // Storage first, then rows. Each table is deleted explicitly and scoped to the
  // single user_id — never a broad delete.
  if (storagePaths.length > 0) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    if (error) throw new Error(`Failed removing storage for ${userId}: ${error.message}`);
  }
  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Failed deleting ${table} for ${userId}: ${error.message}`);
  }
  // Intentionally NOT deleting the auth.users row — see AUTH_USER_DELETE.
}

/** Count career-agent access_requests older than the cutoff. */
async function countStaleAccessRequests(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cutoffIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(ACCESS_REQUESTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("app", ACCESS_REQUESTS_APP)
    .lt("created_at", cutoffIso);
  if (error) throw new Error(`Failed counting access_requests: ${error.message}`);
  return count ?? 0;
}

/** Delete career-agent access_requests older than the cutoff (live runs only). */
async function deleteStaleAccessRequests(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cutoffIso: string,
): Promise<void> {
  const { error } = await supabase
    .from(ACCESS_REQUESTS_TABLE)
    .delete()
    .eq("app", ACCESS_REQUESTS_APP)
    .lt("created_at", cutoffIso);
  if (error) throw new Error(`Failed deleting access_requests: ${error.message}`);
}

export async function POST(request: Request) {
  // Guard 1: shared secret. Without RETENTION_SECRET configured we refuse to run
  // at all, so the endpoint can never be triggered anonymously.
  const secret = process.env.RETENTION_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Retention runner is not configured (missing RETENTION_SECRET)." },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-retention-secret");
  if (!provided || !secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Guard 2: service-role key. All work here needs it; without it we do nothing.
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable (missing service-role key)." },
      { status: 503 },
    );
  }

  const days = retentionDays();
  const ownerEmails = parseOwnerEmails(process.env.OWNER_EMAILS);
  const dryRun = !isLiveRun();
  const now = new Date();
  const cutoff = retentionCutoff(days, now);

  // Fatal (pre-loop) failures return 500 with no partial state to report.
  let authUsers: Awaited<ReturnType<typeof listAllAuthUsers>>;
  let activity: Map<string, string>;
  try {
    [authUsers, activity] = await Promise.all([
      listAllAuthUsers(supabase),
      activityByUser(supabase),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retention scan failed.";
    console.error("[retention] scan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const users: RetentionUser[] = authUsers.map((u) => {
    // Newest activity = max of (auth created_at, last_sign_in, newest data row).
    const dataTs = activity.get(u.id) ?? null;
    const signalTimes = [u.last_sign_in_at, dataTs].filter((v): v is string => !!v);
    const newest = signalTimes.reduce<string | null>((best, ts) => {
      if (!best) return ts;
      return new Date(ts).getTime() > new Date(best).getTime() ? ts : best;
    }, null);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_activity_at: newest,
    };
  });

  const eligibleIds = selectEligibleUserIds(users, { retentionDays: days, ownerEmails, dryRun }, now);
  const eligibleSet = new Set(eligibleIds);
  const eligibleUsers = users.filter((u) => eligibleSet.has(u.id));

  // Per-user work is wrapped so a transient failure on one user does NOT abandon
  // the audit trail for the rest of the batch. Each user's outcome (including a
  // failure) is recorded and returned, so a live run always yields a record of
  // exactly what was and wasn't destroyed.
  const reports: UserReport[] = [];
  const errors: RunError[] = [];

  for (const u of eligibleUsers) {
    try {
      const [rows, storagePaths] = await Promise.all([
        countRowsForUser(supabase, u.id),
        listStoragePaths(supabase, u.id),
      ]);

      if (!dryRun) {
        await deleteUserData(supabase, u.id, storagePaths);
      }

      reports.push({
        user_id: u.id,
        email: u.email,
        newest_activity: u.last_activity_at ?? u.created_at,
        rows,
        storage_objects: storagePaths.length,
        deleted: !dryRun,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push({ scope: `user:${u.id}`, error: message });
      reports.push({
        user_id: u.id,
        email: u.email,
        newest_activity: u.last_activity_at ?? u.created_at,
        rows: {},
        storage_objects: 0,
        deleted: false,
        error: message,
      });
      // continue — keep processing the rest so the report stays complete.
    }
  }

  // Prune stale guest access_requests (PII with no auth user behind it).
  let accessRequestsPruned = 0;
  try {
    accessRequestsPruned = await countStaleAccessRequests(supabase, cutoff.toISOString());
    if (!dryRun && accessRequestsPruned > 0) {
      await deleteStaleAccessRequests(supabase, cutoff.toISOString());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    errors.push({ scope: "access_requests", error: message });
  }

  const totalRows = reports.reduce(
    (sum, r) => sum + Object.values(r.rows).reduce((a, b) => a + b, 0),
    0,
  );
  const totalStorage = reports.reduce((sum, r) => sum + r.storage_objects, 0);

  const summary = {
    mode: dryRun ? ("dry_run" as const) : ("live" as const),
    ok: errors.length === 0,
    retention_days: days,
    cutoff: cutoff.toISOString(),
    owner_emails: ownerEmails,
    auth_users_scanned: users.length,
    eligible_users: reports.length,
    would_delete_rows: totalRows,
    would_delete_storage_objects: totalStorage,
    would_delete_access_requests: accessRequestsPruned,
    auth_users_deleted: 0, // never — auth.users is shared with snip (AUTH_USER_DELETE=false)
    ran_at: now.toISOString(),
    errors,
    users: reports,
  };

  // Structured log so a cron run leaves a readable audit trail.
  console.log(
    `[retention] ${summary.mode}: ${summary.eligible_users} eligible / ` +
      `${summary.auth_users_scanned} scanned, ${totalRows} rows, ` +
      `${totalStorage} storage objects, ${accessRequestsPruned} access_requests ` +
      `(retentionDays=${days}, errors=${errors.length})`,
  );

  // Partial failures still return the full audit trail; 207 signals "some scopes
  // errored" while delivering the body. A clean run is 200.
  return NextResponse.json({ data: summary }, { status: errors.length === 0 ? 200 : 207 });
}
