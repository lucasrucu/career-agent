// Guest-data retention — pure selection logic (PRD §9, ARCHITECTURE §8).
//
// This module has NO side effects and no I/O: it decides *which* users are
// eligible to be pruned given a snapshot of activity and a config. The runner
// (app/api/admin/retention/route.ts) does the actual reads, counts, and deletes.
// Keeping the decision here means it is unit-testable in isolation
// (see scripts/retention-selftest.ts).
//
// A "guest" is any authenticated user who is NOT on the owner allowlist. There
// is no is_guest flag by design (PRD §4), so ownership is the only distinction.
// A user is eligible for pruning when they are a non-owner AND their newest
// activity is strictly older than `retentionDays`.

export const DEFAULT_RETENTION_DAYS = 30;

// Hardcoded safe default. Used when OWNER_EMAILS is unset/empty so a
// misconfiguration can never make the operator's own account prunable.
export const DEFAULT_OWNER_EMAILS = ["lucasruiz1336@gmail.com"];

export interface RetentionUser {
  id: string;
  email: string | null;
  // ISO timestamps. `created_at` is the auth-user creation time; the runner
  // folds every downstream signal (last sign-in, newest row across the
  // career-agent tables) into `last_activity_at`.
  created_at: string;
  last_activity_at?: string | null;
}

export interface RetentionConfig {
  retentionDays: number;
  ownerEmails: string[];
  dryRun: boolean;
}

/**
 * Parse a comma / whitespace / semicolon separated list of owner emails from an
 * env value. Lowercases, trims, dedupes. Falls back to DEFAULT_OWNER_EMAILS when
 * the input yields nothing, so the allowlist is never accidentally empty.
 */
export function parseOwnerEmails(
  raw: string | undefined | null,
  fallback: string[] = DEFAULT_OWNER_EMAILS,
): string[] {
  const parsed = (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  const merged = parsed.length > 0 ? parsed : fallback.map((e) => e.trim().toLowerCase());
  return Array.from(new Set(merged));
}

/** True when the user's email is on the owner allowlist (case-insensitive). */
export function isOwner(email: string | null | undefined, ownerEmails: string[]): boolean {
  if (!email) return false;
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  return ownerEmails.some((o) => o.trim().toLowerCase() === needle);
}

/**
 * Newest activity timestamp for a user as a Date, or null if none is valid.
 * Takes the max of created_at and last_activity_at, ignoring unparseable dates.
 * Returning null means "unknown activity" and callers MUST treat that as
 * not-prunable (fail safe — never delete data we can't date).
 */
export function newestActivity(user: RetentionUser): Date | null {
  const candidates = [user.created_at, user.last_activity_at]
    .map((v) => (v ? new Date(v) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.getTime() > a.getTime() ? b : a));
}

/**
 * The cutoff instant: activity strictly older than this is eligible for pruning.
 * cutoff = now - retentionDays.
 */
export function retentionCutoff(retentionDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Select the user ids eligible for pruning.
 *
 * A user is eligible when ALL of:
 *  - they are NOT on the owner allowlist,
 *  - their newest activity is a known, valid date,
 *  - that newest activity is strictly older than (now - retentionDays).
 *
 * Pure and deterministic given `now`. `dryRun` does not change the selection —
 * it only controls whether the runner deletes, so it is intentionally ignored
 * here (the same ids are reported in a dry run and acted on in a live run).
 */
export function selectEligibleUserIds(
  users: RetentionUser[],
  config: RetentionConfig,
  now: Date = new Date(),
): string[] {
  const cutoff = retentionCutoff(config.retentionDays, now);

  return users
    .filter((u) => {
      if (isOwner(u.email, config.ownerEmails)) return false;
      const activity = newestActivity(u);
      if (activity === null) return false; // fail safe: unknown activity is never pruned
      return activity.getTime() < cutoff.getTime();
    })
    .map((u) => u.id);
}
