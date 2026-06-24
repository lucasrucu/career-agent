import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { ApiResult, ResumeUpload } from "@/lib/types";

export const runtime = "nodejs";

// Signed download URLs are short-lived; the user re-fetches the list to refresh.
const SIGN_TTL_SECONDS = 60 * 10;

type ResumeRow = {
  id: string;
  file_name: string;
  parse_status: ResumeUpload["parse_status"];
  created_at: string;
  storage_path: string;
};

// GET /api/resume/list → the user's uploaded resumes (newest first), each with
// a short-lived signed download URL for the original source file. Signing is
// best-effort per row: a failure yields download_url: null, never a 500.
export async function GET(): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("resumes")
    .select("id, file_name, parse_status, created_at, storage_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("resumes select failed:", error);
    return NextResponse.json<ApiResult<ResumeUpload[]>>(
      { error: "Could not load your resumes." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as ResumeRow[];

  const uploads: ResumeUpload[] = await Promise.all(
    rows.map(async (row) => {
      let download_url: string | null = null;
      const { data: signed, error: signError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(row.storage_path, SIGN_TTL_SECONDS);
      if (signError) {
        console.error("resume signed-url failed:", signError);
      } else {
        download_url = signed?.signedUrl ?? null;
      }
      return {
        id: row.id,
        file_name: row.file_name,
        parse_status: row.parse_status,
        created_at: row.created_at,
        download_url,
      };
    })
  );

  return NextResponse.json<ApiResult<ResumeUpload[]>>({ data: uploads });
}
