// Unit self-test for the pure retention selection logic (lib/retention.ts).
// No framework, no network, no Supabase. Run with:
//   npx tsx scripts/retention-selftest.ts
// Exits non-zero on the first failed assertion. Mirrors the existing
// scripts/e2e-pipeline.ts convention (tsx, no added dependency).

import assert from "node:assert/strict";

import {
  classifyDeleteProgress,
  DEFAULT_OWNER_EMAILS,
  DEFAULT_RETENTION_DAYS,
  parseOwnerEmails,
  isOwner,
  newestActivity,
  retentionCutoff,
  selectEligibleUserIds,
  type DeleteProgress,
  type RetentionUser,
} from "../lib/retention";

const NOW = new Date("2026-07-21T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("=== retention selftest ===");

check("parseOwnerEmails splits, lowercases, dedupes", () => {
  assert.deepEqual(parseOwnerEmails("A@x.com, b@x.com; A@x.com"), ["a@x.com", "b@x.com"]);
});

check("parseOwnerEmails falls back to the safe default when empty", () => {
  assert.deepEqual(parseOwnerEmails(""), DEFAULT_OWNER_EMAILS);
  assert.deepEqual(parseOwnerEmails(undefined), DEFAULT_OWNER_EMAILS);
  assert.deepEqual(parseOwnerEmails("   "), DEFAULT_OWNER_EMAILS);
});

check("isOwner is case-insensitive and null-safe", () => {
  assert.equal(isOwner("Lucas@X.com", ["lucas@x.com"]), true);
  assert.equal(isOwner(null, ["lucas@x.com"]), false);
  assert.equal(isOwner("other@x.com", ["lucas@x.com"]), false);
});

check("newestActivity takes the max and ignores bad dates", () => {
  const u: RetentionUser = {
    id: "u",
    email: null,
    created_at: daysAgo(100),
    last_activity_at: daysAgo(5),
  };
  assert.equal(newestActivity(u)?.toISOString(), daysAgo(5));
  assert.equal(newestActivity({ id: "u", email: null, created_at: "not-a-date" }), null);
});

check("retentionCutoff subtracts the window", () => {
  assert.equal(retentionCutoff(30, NOW).toISOString(), daysAgo(30));
});

const cfg = { retentionDays: DEFAULT_RETENTION_DAYS, ownerEmails: ["lucas@x.com"], dryRun: true };

check("owner is never eligible even when long inactive", () => {
  const users: RetentionUser[] = [
    { id: "owner", email: "lucas@x.com", created_at: daysAgo(999), last_activity_at: daysAgo(999) },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW), []);
});

check("inactive non-owner is eligible", () => {
  const users: RetentionUser[] = [
    { id: "old", email: "guest@x.com", created_at: daysAgo(200), last_activity_at: daysAgo(40) },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW), ["old"]);
});

check("recently active non-owner is NOT eligible", () => {
  const users: RetentionUser[] = [
    { id: "fresh", email: "guest@x.com", created_at: daysAgo(200), last_activity_at: daysAgo(10) },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW), []);
});

check("exactly at the cutoff is NOT eligible (strictly older required)", () => {
  const users: RetentionUser[] = [
    { id: "edge", email: "guest@x.com", created_at: daysAgo(30), last_activity_at: daysAgo(30) },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW), []);
});

check("unknown activity is fail-safe (never pruned)", () => {
  const users: RetentionUser[] = [
    { id: "nodate", email: "guest@x.com", created_at: "garbage", last_activity_at: null },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW), []);
});

check("mixed set returns only the eligible guests", () => {
  const users: RetentionUser[] = [
    { id: "owner", email: "lucas@x.com", created_at: daysAgo(500), last_activity_at: daysAgo(500) },
    { id: "old1", email: "a@x.com", created_at: daysAgo(90), last_activity_at: daysAgo(45) },
    { id: "old2", email: "b@x.com", created_at: daysAgo(60), last_activity_at: daysAgo(31) },
    { id: "fresh", email: "c@x.com", created_at: daysAgo(60), last_activity_at: daysAgo(2) },
  ];
  assert.deepEqual(selectEligibleUserIds(users, cfg, NOW).sort(), ["old1", "old2"]);
});

// --- classifyDeleteProgress: the live-run audit trail (round-3 fix) ----------

const progress = (over: Partial<DeleteProgress>): DeleteProgress => ({
  storagePresent: false,
  storageDeleted: false,
  deletedTables: [],
  totalTables: 5,
  errored: false,
  ...over,
});

check("clean delete of every scope classifies as 'deleted'", () => {
  assert.equal(
    classifyDeleteProgress(
      progress({
        storagePresent: true,
        storageDeleted: true,
        deletedTables: ["a", "b", "c", "d", "e"],
      }),
    ),
    "deleted",
  );
});

check("delete with no storage to remove still classifies as 'deleted'", () => {
  assert.equal(
    classifyDeleteProgress(
      progress({ storagePresent: false, deletedTables: ["a", "b", "c", "d", "e"] }),
    ),
    "deleted",
  );
});

check("error before touching anything classifies as 'failed' (safe to retry)", () => {
  assert.equal(
    classifyDeleteProgress(progress({ errored: true, deletedTables: [] })),
    "failed",
  );
});

check("error after deleting some tables classifies as 'partial'", () => {
  // The exact case the round-2 review flagged: tables 1..N gone, then a failure.
  assert.equal(
    classifyDeleteProgress(progress({ errored: true, deletedTables: ["a", "b"] })),
    "partial",
  );
});

check("error after storage removed but no table done is still 'partial'", () => {
  assert.equal(
    classifyDeleteProgress(
      progress({ storagePresent: true, storageDeleted: true, errored: true, deletedTables: [] }),
    ),
    "partial",
  );
});

check("all tables gone but storage remove failed is 'partial', not 'deleted'", () => {
  assert.equal(
    classifyDeleteProgress(
      progress({
        storagePresent: true,
        storageDeleted: false,
        errored: true,
        deletedTables: ["a", "b", "c", "d", "e"],
      }),
    ),
    "partial",
  );
});

console.log(`\nAll ${passed} checks passed.`);
