import type { Job, JobSearchParams } from "@/lib/types";

// Thin typed client for the Adzuna REST API (free developer tier).
// Docs: https://developer.adzuna.com/overview
// GET /v1/api/jobs/{country}/search/{page}?app_id=&app_key=&what=&where=...

const BASE = "https://api.adzuna.com/v1/api/jobs";

interface AdzunaResultRaw {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  description?: string;
  redirect_url: string;
  created: string;
}

function credentials(): { appId: string; appKey: string } {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("Missing ADZUNA_APP_ID / ADZUNA_APP_KEY");
  }
  return { appId, appKey };
}

function mapResult(r: AdzunaResultRaw): Job {
  return {
    id: r.id,
    title: r.title,
    company: r.company?.display_name ?? "",
    location: r.location?.display_name ?? "",
    salary_min: r.salary_min,
    salary_max: r.salary_max,
    snippet: r.description ?? "",
    url: r.redirect_url,
    created: r.created,
  };
}

export async function searchJobs(params: JobSearchParams): Promise<Job[]> {
  const { appId, appKey } = credentials();
  const country = params.country ?? process.env.ADZUNA_DEFAULT_COUNTRY ?? "us";
  const page = params.page ?? 1;

  const qs = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: params.query,
    results_per_page: String(params.results_per_page ?? 20),
  });
  if (params.where) qs.set("where", params.where);
  if (params.salary_min) qs.set("salary_min", String(params.salary_min));
  if (params.full_time) qs.set("full_time", "1");
  if (params.distance) qs.set("distance", String(params.distance));

  const res = await fetch(`${BASE}/${country}/search/${page}?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Adzuna request failed: ${res.status}`);
  }

  const json = (await res.json()) as { results?: AdzunaResultRaw[] };
  return (json.results ?? []).map(mapResult);
}
