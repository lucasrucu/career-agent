import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, Job, SavedJob, SavedJobStatus } from "@/lib/types";

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

// GET /api/jobs/saved → the user's saved jobs (newest first).
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
    return NextResponse.json<ApiResult<SavedJob[]>>(
      { error: "Could not load saved jobs." },
      { status: 500 }
    );
  }
  return NextResponse.json<ApiResult<SavedJob[]>>({
    data: (data ?? []).map((r) => toSavedJob(r as never)),
  });
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
