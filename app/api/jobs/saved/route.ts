import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type {
  ApiResult,
  Job,
  MatchResult,
  SavedJob,
  SavedJobDetail,
  SavedJobStatus,
} from "@/lib/types";

export const runtime = "nodejs";

const STATUSES: SavedJobStatus[] = [
  "interested",
  "drafted",
  "applied",
  "interviewing",
  "closed",
];

function toSavedJob(row: {
  job: Job;
  status: SavedJobStatus;
  saved_at: string;
  user_id: string;
}): SavedJob {
  return { ...row.job, user_id: row.user_id, status: row.status, saved_at: row.saved_at };
}

// GET /api/jobs/saved → the user's saved jobs (newest first), each enriched
// with its latest cached match and whether a tailored draft exists.
export async function GET(): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("user_id, job, status, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("saved_jobs select failed:", error);
    return NextResponse.json<ApiResult<SavedJobDetail[]>>(
      { error: "Could not load saved jobs." },
      { status: 500 }
    );
  }

  const saved = (data ?? []).map((r) => toSavedJob(r as never));

  // Stitch in the latest match + draft flag with two bulk queries (no N+1).
  // Pick the highest profile_version per job_id from match_results.
  const [{ data: matchRows }, { data: draftRows }] = await Promise.all([
    supabase
      .from("match_results")
      .select("job_id, profile_version, match_pct, strengths, gaps, keywords")
      .eq("user_id", user.id)
      .order("profile_version", { ascending: false }),
    supabase.from("resume_drafts").select("job_id").eq("user_id", user.id),
  ]);

  // Rows arrive newest-version-first, so the first one seen per job_id wins.
  const latestMatch = new Map<string, MatchResult>();
  for (const m of matchRows ?? []) {
    const row = m as MatchResult;
    if (!latestMatch.has(row.job_id)) {
      latestMatch.set(row.job_id, {
        job_id: row.job_id,
        profile_version: row.profile_version,
        match_pct: row.match_pct,
        strengths: row.strengths ?? [],
        gaps: row.gaps ?? [],
        keywords: row.keywords ?? [],
      });
    }
  }
  const draftJobIds = new Set(
    (draftRows ?? []).map((d) => (d as { job_id: string }).job_id)
  );

  const enriched: SavedJobDetail[] = saved.map((s) => ({
    ...s,
    match: latestMatch.get(s.id) ?? null,
    has_draft: draftJobIds.has(s.id),
  }));

  return NextResponse.json<ApiResult<SavedJobDetail[]>>({ data: enriched });
}

// POST /api/jobs/saved { job: Job, status? } → save (or update) a listing.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { job?: Job; status?: SavedJobStatus };
  try {
    body = (await request.json()) as { job?: Job; status?: SavedJobStatus };
  } catch {
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.job || !body.job.id) {
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Missing `job`." },
      { status: 400 }
    );
  }
  const status: SavedJobStatus =
    body.status && STATUSES.includes(body.status) ? body.status : "interested";

  const { data, error } = await supabase
    .from("saved_jobs")
    .upsert(
      { user_id: user.id, job_id: body.job.id, job: body.job, status },
      { onConflict: "user_id,job_id" }
    )
    .select("user_id, job, status, saved_at")
    .single();

  if (error) {
    console.error("saved_jobs upsert failed:", error);
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Could not save the job." },
      { status: 500 }
    );
  }
  return NextResponse.json<ApiResult<SavedJob>>({
    data: toSavedJob(data as never),
  });
}

// PATCH /api/jobs/saved { job_id, status } → move a saved job along the pipeline.
export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { job_id?: string; status?: SavedJobStatus };
  try {
    body = (await request.json()) as { job_id?: string; status?: SavedJobStatus };
  } catch {
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.job_id) {
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Missing `job_id`." },
      { status: 400 }
    );
  }
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Invalid `status`." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .update({ status: body.status })
    .eq("user_id", user.id)
    .eq("job_id", body.job_id)
    .select("user_id, job, status, saved_at")
    .single();

  if (error) {
    console.error("saved_jobs update failed:", error);
    return NextResponse.json<ApiResult<SavedJob>>(
      { error: "Could not update the job." },
      { status: 500 }
    );
  }
  return NextResponse.json<ApiResult<SavedJob>>({
    data: toSavedJob(data as never),
  });
}

// DELETE /api/jobs/saved { job_id } → remove a saved job from the pipeline.
export async function DELETE(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { job_id?: string };
  try {
    body = (await request.json()) as { job_id?: string };
  } catch {
    return NextResponse.json<ApiResult<{ job_id: string }>>(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.job_id) {
    return NextResponse.json<ApiResult<{ job_id: string }>>(
      { error: "Missing `job_id`." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", body.job_id);

  if (error) {
    console.error("saved_jobs delete failed:", error);
    return NextResponse.json<ApiResult<{ job_id: string }>>(
      { error: "Could not remove the job." },
      { status: 500 }
    );
  }
  return NextResponse.json<ApiResult<{ job_id: string }>>({
    data: { job_id: body.job_id },
  });
}
