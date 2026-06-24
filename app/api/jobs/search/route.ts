import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { searchJobs } from "@/lib/adzuna";
import type { ApiResult, Job, JobSearchParams } from "@/lib/types";

export const runtime = "nodejs";

// FR-6 — Job search (Adzuna).
// GET /api/jobs/search?query=&where=&country=&salary_min=&full_time=&page=
//   → real listings via lib/adzuna.searchJobs(). On Adzuna error, the client
//     falls back to "paste a job description" (see PRD §9).
export async function GET(request: Request): Promise<NextResponse> {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();
  if (!query) {
    return NextResponse.json<ApiResult<Job[]>>(
      { error: "Enter a role or keyword to search." },
      { status: 400 }
    );
  }

  const salaryMin = searchParams.get("salary_min");
  const params: JobSearchParams = {
    query,
    where: searchParams.get("where") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    salary_min: salaryMin ? Number(salaryMin) : undefined,
    full_time: searchParams.get("full_time") === "1" || undefined,
    page: Number(searchParams.get("page") ?? "1") || 1,
    results_per_page: 20,
  };

  try {
    const jobs = await searchJobs(params);
    return NextResponse.json<ApiResult<Job[]>>({ data: jobs });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Job search is unavailable.";
    return NextResponse.json<ApiResult<Job[]>>(
      { error: `${message} You can paste a job description instead.` },
      { status: 502 }
    );
  }
}
