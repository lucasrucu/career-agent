import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, Profile, ProfileRecord } from "@/lib/types";

// FR-5 — Profile management. Single source the matcher and drafter read from.

// GET /api/profile → the signed-in user's structured profile.
export async function GET(): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  // TODO(FR-5): select from `profiles` where user_id = user.id (RLS-scoped).
  void user;
  void supabase;
  return NextResponse.json<ApiResult<ProfileRecord>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}

// PUT /api/profile { profile: Profile } → save + bump version.
export async function PUT(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { profile: Profile };

  // TODO(FR-5): upsert body.profile into `profiles`, increment version counter.
  void body;
  void user;
  void supabase;
  return NextResponse.json<ApiResult<ProfileRecord>>(
    { error: "Not implemented" },
    { status: 501 }
  );
}
