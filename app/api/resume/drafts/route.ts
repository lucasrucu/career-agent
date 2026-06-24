import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, DraftSummary, Job, Profile } from "@/lib/types";

export const runtime = "nodejs";

type DraftRow = {
  id: string;
  job_id: string;
  export_filename: string | null;
  profile_version: number;
  updated_at: string;
  content: Profile;
};

type SavedJobRow = {
  job_id: string;
  job: Job;
};

// GET /api/resume/drafts → the user's saved tailored drafts (newest updated
// first). Each is stitched against saved_jobs (by user_id + job_id) to add a
// role label, and carries its tailored `content` so the client can re-export
// the PDF via /api/resume/export. Falls back to null labels when no saved job
// matches (e.g. the draft came from a pasted job description).
export async function GET(): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const [{ data: draftData, error: draftError }, { data: savedData }] =
    await Promise.all([
      supabase
        .from("resume_drafts")
        .select("id, job_id, export_filename, profile_version, updated_at, content")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase.from("saved_jobs").select("job_id, job").eq("user_id", user.id),
    ]);

  if (draftError) {
    console.error("resume_drafts select failed:", draftError);
    return NextResponse.json<ApiResult<DraftSummary[]>>(
      { error: "Could not load your tailored drafts." },
      { status: 500 }
    );
  }

  const jobByJobId = new Map<string, Job>();
  for (const row of (savedData ?? []) as SavedJobRow[]) {
    if (row.job) jobByJobId.set(row.job_id, row.job);
  }

  const drafts: DraftSummary[] = ((draftData ?? []) as DraftRow[]).map((row) => {
    const job = jobByJobId.get(row.job_id) ?? null;
    return {
      id: row.id,
      job_id: row.job_id,
      export_filename: row.export_filename,
      profile_version: row.profile_version,
      updated_at: row.updated_at,
      job_title: job?.title ?? null,
      job_company: job?.company ?? null,
      content: row.content,
    };
  });

  return NextResponse.json<ApiResult<DraftSummary[]>>({ data: drafts });
}
