// Builds the export filename for a tailored resume: {LastName}_{Company}_{Role}.pdf
// (PRD §9). Falls back gracefully when company/role are missing (pasted jobs).

import type { Job, Profile } from "@/lib/types";

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

export function exportFilename(profile: Profile, job: Job): string {
  const nameParts = (profile.contact.name ?? "").trim().split(/\s+/);
  const last = nameParts.length ? nameParts[nameParts.length - 1] : "Resume";
  const parts = [slug(last) || "Resume"];
  if (job.company) parts.push(slug(job.company));
  if (job.title) parts.push(slug(job.title));
  return `${parts.filter(Boolean).join("_")}.pdf`;
}
