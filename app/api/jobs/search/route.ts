import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, Job, JobSearchParams } from "@/lib/types";

// FR-6 — Job search (Adzuna).
// GET /api/jobs/search?query=&where=&country=&salary_min=&full_time=&page=
//   → real listings via lib/adzuna.searchJobs(). On Adzuna error, the client
//     falls back to "paste a job description" (see PRD §9).
export async function GET(request: Request): Promise<NextResponse> {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const params: JobSearchParams = {
    query: searchParams.get("query") ?? "",
    where: searchParams.get("where") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
  };

  // TODO(FR-6): const jobs = await searchJobs(params); return { data: jobs }.
  //   Wired to lib/adzuna; left as a stub until ADZUNA_APP_ID/KEY are set.
  void params;
  void user;
  return NextResponse.json<ApiResult<Job[]>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}
