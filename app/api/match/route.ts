import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, MatchResult } from "@/lib/types";

// FR-7 — Match scoring (LLM-only for v1, cached per (profile_version, job)).
// POST /api/match { job_id?, job_description? }
//   → Claude scores the profile against the job: match_pct, strengths, gaps,
//     keywords. Cache hit returns instantly; miss calls anthropic() then stores.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    job_id?: string;
    job_description?: string;
  };

  // TODO(FR-7):
  //   1. resolve the job (saved job_id or pasted job_description).
  //   2. check `match_results` cache on (user_id, job_id, profile_version).
  //   3. on miss, call anthropic() with structured output; persist + return.
  void body;
  void user;
  void supabase;
  return NextResponse.json<ApiResult<MatchResult>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}
