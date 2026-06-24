// Resolves a job from a request body for the match (FR-7) and draft (FR-8)
// routes. A job can arrive three ways: as a full snapshot from search results,
// by id (a previously saved job), or as a pasted description (PRD §9 fallback).

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Job } from "@/lib/types";

export interface JobResolveBody {
  job?: Job;
  job_id?: string;
  job_description?: string;
}

// Deterministic short id so a pasted description maps to a stable job_id —
// lets the match cache hit on repeated scoring of the same pasted text. Shared
// with the client (JobsSection builds the same `local:<id>` for a pasted Job)
// so the cache and saved-job dedupe line up on identical text.
export function localId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export async function resolveJob(
  body: JobResolveBody,
  userId: string,
  supabase: SupabaseClient
): Promise<Job | null> {
  if (body.job && body.job.id) return body.job;

  if (body.job_id) {
    const { data } = await supabase
      .from("saved_jobs")
      .select("job")
      .eq("user_id", userId)
      .eq("job_id", body.job_id)
      .maybeSingle();
    return ((data?.job as Job | undefined) ?? null) || null;
  }

  if (body.job_description && body.job_description.trim()) {
    const desc = body.job_description.trim();
    return {
      id: `local:${localId(desc)}`,
      title: "Pasted job description",
      company: "",
      location: "",
      snippet: desc.slice(0, 6000),
      url: "",
      created: "",
    };
  }

  return null;
}

export function jobToText(job: Job): string {
  return [
    job.title && `Title: ${job.title}`,
    job.company && `Company: ${job.company}`,
    job.location && `Location: ${job.location}`,
    job.snippet && `Description:\n${job.snippet}`,
  ]
    .filter(Boolean)
    .join("\n");
}
