import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireUser } from "@/lib/auth";
import { ResumeDocument } from "@/lib/pdf/ResumeDocument";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// FR-9 — PDF export. Renders a Profile (a tailored draft, or the base profile)
// to an ATS-friendly PDF and streams it back as a download.
// POST { content: Profile, filename? }  — render directly, or
// POST { job_id }                        — load the stored draft for this job.
export async function POST(request: Request): Promise<NextResponse> {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { content?: Profile; filename?: string; job_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  let profile = body.content;
  let filename = body.filename;

  if (!profile && body.job_id) {
    const { data } = await supabase
      .from("resume_drafts")
      .select("content, export_filename")
      .eq("user_id", user.id)
      .eq("job_id", body.job_id)
      .order("profile_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      profile = data.content as Profile;
      filename = filename ?? (data.export_filename as string | undefined);
    }
  }

  if (!profile || !profile.contact) {
    return NextResponse.json(
      { error: "Nothing to export. Provide `content` or a valid `job_id`." },
      { status: 400 }
    );
  }

  const safeName = (filename ?? "resume.pdf").replace(/[^\w.\-]/g, "_");

  try {
    const element = React.createElement(ResumeDocument, {
      profile,
    }) as unknown as Parameters<typeof renderToBuffer>[0];
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF render failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
