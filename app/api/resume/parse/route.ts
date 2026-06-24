import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, Profile } from "@/lib/types";

// FR-3 — Resume upload & parsing.
// POST /api/resume/parse (multipart: file=.pdf|.docx, ≤5 MB)
//   → extract text (pdf-parse / mammoth), send to Claude (lib/anthropic),
//     return a structured Profile for review before saving.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  // TODO(FR-3):
  //   1. read the uploaded file from formData(); reject >5 MB or non-pdf/docx.
  //   2. extract text via pdf-parse (pdf) or mammoth (docx).
  //   3. call anthropic() with structured/tool output to produce a Profile.
  //   4. store the source file in the private Storage bucket; record in `resumes`.
  void request;
  void user;
  void supabase;
  return NextResponse.json<ApiResult<Profile>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}
