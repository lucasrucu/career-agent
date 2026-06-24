import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, Profile, ProfileRecord } from "@/lib/types";

export const runtime = "nodejs";

// FR-5 — Profile management. Single source the matcher and drafter read from.

// GET /api/profile → the signed-in user's structured profile (or null if none).
export async function GET(): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, profile, version, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("profile select failed:", error);
    return NextResponse.json<ApiResult<ProfileRecord | null>>(
      { error: "Could not load your profile." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResult<ProfileRecord | null>>({
    data: (data as ProfileRecord | null) ?? null,
  });
}

// PUT /api/profile { profile: Profile } → save + bump version.
export async function PUT(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { profile?: Profile };
  try {
    body = (await request.json()) as { profile?: Profile };
  } catch {
    return NextResponse.json<ApiResult<ProfileRecord>>(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }
  if (!body.profile || typeof body.profile !== "object" || !body.profile.contact) {
    return NextResponse.json<ApiResult<ProfileRecord>>(
      { error: "Missing or malformed `profile`." },
      { status: 400 }
    );
  }

  // Bump version off the current row (1 for a first save).
  const { data: existing } = await supabase
    .from("profiles")
    .select("version")
    .eq("user_id", user.id)
    .maybeSingle();
  const nextVersion = ((existing?.version as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        profile: body.profile,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("user_id, profile, version, updated_at")
    .single();

  if (error) {
    console.error("profile upsert failed:", error);
    return NextResponse.json<ApiResult<ProfileRecord>>(
      { error: "Could not save your profile." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResult<ProfileRecord>>({
    data: data as ProfileRecord,
  });
}
