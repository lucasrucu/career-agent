// Typed fetch wrappers around the Career Agent API routes.
// Each helper unwraps the ApiResult envelope and throws Error(error) on the
// error branch so React Query (and toasts) can surface a clean message.

import type {
  ApiResult,
  Job,
  MatchResult,
  Profile,
  ProfileRecord,
  ResumeDraft,
  SavedJob,
  SavedJobStatus,
} from "@/lib/types";

async function unwrap<T>(res: Response): Promise<T> {
  let body: ApiResult<T> | null = null;
  try {
    body = (await res.json()) as ApiResult<T>;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body && "error" in body ? body.error : `Request failed (${res.status}).`;
    throw new Error(message);
  }

  if (!body || !("data" in body)) {
    throw new Error("Malformed response from server.");
  }
  return body.data;
}

// --- Profile (FR-5) ---------------------------------------------------------

export async function getProfile(): Promise<ProfileRecord | null> {
  const res = await fetch("/api/profile", { method: "GET" });
  return unwrap<ProfileRecord | null>(res);
}

export async function saveProfile(profile: Profile): Promise<ProfileRecord> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return unwrap<ProfileRecord>(res);
}

// --- Resume parse (FR-3) ----------------------------------------------------

export async function parseResume(file: File): Promise<Profile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/resume/parse", {
    method: "POST",
    body: form,
  });
  return unwrap<Profile>(res);
}

// --- Jobs (FR-6 / FR-10) ----------------------------------------------------

export interface SearchJobsParams {
  query: string;
  where?: string;
  country?: string;
  salary_min?: number;
  full_time?: boolean;
  page?: number;
}

export async function searchJobs(params: SearchJobsParams): Promise<Job[]> {
  const qs = new URLSearchParams();
  qs.set("query", params.query);
  if (params.where) qs.set("where", params.where);
  if (params.country) qs.set("country", params.country);
  if (typeof params.salary_min === "number" && !Number.isNaN(params.salary_min)) {
    qs.set("salary_min", String(params.salary_min));
  }
  if (params.full_time) qs.set("full_time", "1");
  if (params.page) qs.set("page", String(params.page));

  const res = await fetch(`/api/jobs/search?${qs.toString()}`, {
    method: "GET",
  });
  return unwrap<Job[]>(res);
}

export async function saveJob(
  job: Job,
  status?: SavedJobStatus
): Promise<SavedJob> {
  const res = await fetch("/api/jobs/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, status }),
  });
  return unwrap<SavedJob>(res);
}

export async function listSavedJobs(): Promise<SavedJob[]> {
  const res = await fetch("/api/jobs/saved", { method: "GET" });
  return unwrap<SavedJob[]>(res);
}

// --- Match scoring (FR-7) ---------------------------------------------------

export type JobInput = { job: Job } | { job_description: string };

export async function scoreMatch(body: JobInput): Promise<MatchResult> {
  const res = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<MatchResult>(res);
}

// --- Tailored resume (FR-8) -------------------------------------------------

export async function draftResume(body: JobInput): Promise<ResumeDraft> {
  const res = await fetch("/api/resume/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<ResumeDraft>(res);
}

// --- PDF export (FR-9) ------------------------------------------------------

export async function exportResumePdf({
  content,
  filename,
}: {
  content: Profile;
  filename?: string;
}): Promise<void> {
  const res = await fetch("/api/resume/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });

  if (!res.ok) {
    // Error responses come back as JSON envelopes.
    let message = `Export failed (${res.status}).`;
    try {
      const body = (await res.json()) as ApiResult<never>;
      if ("error" in body) message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const safeName = (filename ?? "resume.pdf").replace(/[^\w.\-]/g, "_");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
