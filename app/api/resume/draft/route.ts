import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, ResumeDraft } from "@/lib/types";

// FR-8 — Tailored resume drafting.
// POST /api/resume/draft { job_id } → Claude reorders/rephrases the user's REAL
//   experience to foreground what the role wants (never fabricates), folding in
//   the FR-7 keywords. Returns an editable ResumeDraft; export is FR-9.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { job_id: string };

  // TODO(FR-8):
  //   1. load the user's profile + the saved job + its match keywords (FR-7).
  //   2. call anthropic() with structured output to produce a tailored Profile.
  //   3. persist to `resume_drafts` keyed by (user_id, job_id, profile_version).
  void body;
  void user;
  void supabase;
  return NextResponse.json<ApiResult<ResumeDraft>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}
