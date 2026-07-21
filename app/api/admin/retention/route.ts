import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_RETENTION_DAYS,
  parseOwnerEmails,
  selectEligibleUserIds,
  type RetentionUser,
} from "@/lib/retention";

// Guest-data retention runner (PRD §9, ARCHITECTURE §8).
//
// Prunes career-agent data for guest (non-owner) accounts whose newest activity
// is older than the retention window. It is DRY-RUN by default: it only deletes
// when RETENTION_DRY_RUN is explicitly set to the string "false". Otherwise it
// reports what it WOULD delete and touches nothing.
//
// SHARED-PROJECT SAFETY: this Supabase project is shared with `snip`
// (ref xbpbuwrrpnhaubimihpq). This runner only ever names career-agent's OWN
// tables and the `resumes` storage bucket. It NEVER touches `snip`'s `links`
// table or anything outside the list below. It also NEVER deletes the auth user
// itself — see the note on AUTH_USER_DELETE below.
//
// Trigger it server-side only (Vercel cron or a manual authenticated curl). Two
// guards keep a random visitor from running it:
//   1. it refuses without the service-role key (misconfigured deploy), and
//   2. it requires a shared secret in the `x-retention-secret` header that must
//      equal env RETENTION_SECRET.

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

/** Every auth user, paginated via the admin API. */
async function listAllAuthUsers(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null }>> {
  const out: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }> = [];

  const perPage = 1000;
  for (let page = 1; ; page++) {
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
    if (users.length < perPage) break;
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

/** Storage object paths under `{userId}/` in the resumes bucket. */
async function listStoragePaths(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<string[]> {
  // Files are stored one level deep as `{userId}/{name}` (see resume/parse).
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(userId, { limit: 1000 });
  if (error) throw new Error(`Failed listing storage for ${userId}: ${error.message}`);
  return (data ?? [])
    .filter((obj) => obj.name && obj.id !== null) // skip folder placeholders
    .map((obj) => `${userId}/${obj.name}`);
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
  if (!provided || provided !== secret) {
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

  try {
    const [authUsers, activity] = await Promise.all([
      listAllAuthUsers(supabase),
      activityByUser(supabase),
    ]);

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

    const reports: UserReport[] = [];
    for (const u of eligibleUsers) {
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
      });
    }

    const totalRows = reports.reduce(
      (sum, r) => sum + Object.values(r.rows).reduce((a, b) => a + b, 0),
      0,
    );
    const totalStorage = reports.reduce((sum, r) => sum + r.storage_objects, 0);

    const summary = {
      mode: dryRun ? ("dry_run" as const) : ("live" as const),
      retention_days: days,
      owner_emails: ownerEmails,
      auth_users_scanned: users.length,
      eligible_users: reports.length,
      would_delete_rows: totalRows,
      would_delete_storage_objects: totalStorage,
      auth_users_deleted: 0, // never — auth.users is shared with snip
      ran_at: now.toISOString(),
      users: reports,
    };

    // Structured log so a cron run leaves a readable audit trail.
    console.log(
      `[retention] ${summary.mode}: ${summary.eligible_users} eligible / ` +
        `${summary.auth_users_scanned} scanned, ${totalRows} rows, ` +
        `${totalStorage} storage objects (retentionDays=${days})`,
    );

    return NextResponse.json({ data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retention run failed.";
    console.error("[retention] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
