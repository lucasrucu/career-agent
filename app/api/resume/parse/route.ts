import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { generateStructured } from "@/lib/anthropic";
import { PROFILE_SCHEMA } from "@/lib/schemas";
import {
  MAX_RESUME_BYTES,
  extractResumeText,
  resumeKind,
} from "@/lib/resume-text";
import type { ApiResult, Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a resume parser. Extract the candidate's real information from the resume text into the structured schema. Rules:
- Only use information present in the text. Never invent experience, skills, dates, or credentials.
- Preserve accomplishment bullets close to the original wording.
- Infer a skill level (beginner/intermediate/advanced/expert) only when the text gives clear signal (years, seniority, scope); otherwise default to "intermediate".
- If the summary is missing, write a faithful 2-3 sentence summary from the actual content.`;

// FR-3 — Resume upload & parsing.
// POST /api/resume/parse (multipart: file=.pdf|.docx, ≤5 MB)
//   → extract text (pdf-parse / mammoth), send to Claude (lib/anthropic),
//     return a structured Profile for review before saving.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json<ApiResult<Profile>>(
      { error: "Expected a multipart form upload." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json<ApiResult<Profile>>(
      { error: "No file provided." },
      { status: 400 }
    );
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json<ApiResult<Profile>>(
      { error: "File is larger than 5 MB." },
      { status: 413 }
    );
  }

  const kind = resumeKind(file.name, file.type);
  if (!kind) {
    return NextResponse.json<ApiResult<Profile>>(
      { error: "Only PDF and DOCX files are supported." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Store the source file in the private bucket (path is gated to the user
  //    by the storage RLS policy: "{user_id}/..."). Sanitize the user-supplied
  //    filename so it can't introduce surprising keys.
  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 100);
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    console.error("resume upload failed:", uploadError);
    return NextResponse.json<ApiResult<Profile>>(
      { error: "Could not store the file. Please try again." },
      { status: 500 }
    );
  }

  // 2. Record the upload (status starts 'pending').
  const { data: resumeRow, error: insertError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name,
      parse_status: "pending",
    })
    .select("id")
    .single();
  if (insertError) {
    console.error("resume row insert failed:", insertError);
    await supabase.storage.from("resumes").remove([storagePath]);
    return NextResponse.json<ApiResult<Profile>>(
      { error: "Could not record the upload. Please try again." },
      { status: 500 }
    );
  }

  // 3. Extract text and parse into a Profile.
  try {
    const text = await extractResumeText(buffer, kind);
    const profile = await generateStructured<Profile>({
      system: SYSTEM,
      prompt: `Parse this resume into the structured schema.\n\n---\n${text}`,
      toolName: "save_profile",
      toolDescription: "Save the candidate's structured profile.",
      schema: PROFILE_SCHEMA,
      maxTokens: 4096,
    });

    await supabase
      .from("resumes")
      .update({ parse_status: "parsed" })
      .eq("id", resumeRow.id);

    return NextResponse.json<ApiResult<Profile>>({ data: profile });
  } catch (err) {
    // Clean up: mark the row failed and drop the orphaned source file so the
    // bucket doesn't accumulate files for parses that never produced a profile.
    await supabase
      .from("resumes")
      .update({ parse_status: "failed" })
      .eq("id", resumeRow.id);
    await supabase.storage.from("resumes").remove([storagePath]);
    const message =
      err instanceof Error ? err.message : "Failed to parse the resume.";
    return NextResponse.json<ApiResult<Profile>>(
      { error: message },
      { status: 502 }
    );
  }
}
