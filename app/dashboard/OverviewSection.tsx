"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Download,
  FileText,
  FileUp,
  Gauge,
  Search,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  exportResumePdf,
  getProfile,
  listDrafts,
  listResumes,
  listSavedJobs,
} from "@/lib/api-client";
import type {
  DraftSummary,
  ResumeUpload,
} from "@/lib/types";
import type { DashboardTab } from "./DashboardClient";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

const PARSE_BADGE: Record<
  ResumeUpload["parse_status"],
  { variant: "positive" | "negative" | "default"; label: string }
> = {
  parsed: { variant: "positive", label: "Parsed" },
  failed: { variant: "negative", label: "Failed" },
  pending: { variant: "default", label: "Pending" },
};

function draftLabel(d: DraftSummary): string {
  if (d.job_title && d.job_company) return `${d.job_title} — ${d.job_company}`;
  if (d.job_title) return d.job_title;
  return d.export_filename ?? "Tailored resume";
}

// Rough completeness signal — how many of the core profile areas are populated.
function completeness(record: Awaited<ReturnType<typeof getProfile>>): number {
  if (!record) return 0;
  const p = record.profile;
  const checks = [
    Boolean(p.contact?.name),
    Boolean(p.contact?.email),
    Boolean(p.summary?.trim()),
    (p.experiences?.length ?? 0) > 0,
    (p.education?.length ?? 0) > 0,
    (p.skills?.length ?? 0) > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function OverviewSection({
  userName,
  onNavigate,
}: {
  userName: string;
  onNavigate: (tab: DashboardTab) => void;
}) {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
  const savedQuery = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: listSavedJobs,
  });
  const resumesQuery = useQuery({
    queryKey: ["resume-uploads"],
    queryFn: listResumes,
  });
  const draftsQuery = useQuery({
    queryKey: ["resume-drafts"],
    queryFn: listDrafts,
  });

  const exportMutation = useMutation({
    mutationFn: (draft: DraftSummary) =>
      exportResumePdf({
        content: draft.content,
        filename: draft.export_filename ?? draftLabel(draft),
      }),
    onMutate: () => toast.loading("Generating PDF…", { id: "overview-export" }),
    onSuccess: () => toast.success("PDF downloaded.", { id: "overview-export" }),
    onError: (err: Error) =>
      toast.error(err.message, { id: "overview-export" }),
  });

  const pct = completeness(profileQuery.data ?? null);
  const savedCount = savedQuery.data?.length ?? 0;
  const recentMatches = (savedQuery.data ?? []).filter(
    (j) => j.status === "drafted" || j.status === "applied"
  ).length;

  return (
    <div>
      <div className="flex flex-col gap-1 pb-6">
        <h1 className="text-2xl font-semibold">Welcome, {userName}.</h1>
        <p className="text-sm text-muted-foreground">
          Your job-search workspace. Build your profile, then find and tailor for
          roles.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4 text-primary" /> Profile completeness
            </CardTitle>
            <CardDescription>
              {profileQuery.data
                ? "Based on filled sections"
                : "Upload a resume to begin"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {profileQuery.isLoading ? "—" : `${pct}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved jobs</CardTitle>
            <CardDescription>In your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {savedQuery.isLoading ? "—" : savedCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drafted / applied</CardTitle>
            <CardDescription>Roles you&apos;ve acted on</CardDescription>
          </CardHeader>
          <CardContent>
            {savedQuery.isLoading ? (
              <p className="text-3xl font-semibold">—</p>
            ) : recentMatches > 0 ? (
              <p className="text-3xl font-semibold">{recentMatches}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 pt-6">
        <Button variant="outline" onClick={() => onNavigate("jobs")}>
          <Search className="size-4" /> Search jobs
        </Button>
        <Button variant="outline" onClick={() => onNavigate("saved")}>
          <Bookmark className="size-4" /> View saved
        </Button>
        <Button variant="outline" onClick={() => onNavigate("profile")}>
          <UserCog className="size-4" /> Edit profile
        </Button>
        <Button variant="outline" onClick={() => onNavigate("profile")}>
          <FileUp className="size-4" /> Upload resume
        </Button>
      </div>

      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" /> Your resumes
            </CardTitle>
            <CardDescription>Uploaded source files</CardDescription>
          </CardHeader>
          <CardContent>
            {resumesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (resumesQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No uploads yet — upload a resume from the Profile tab.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {resumesQuery.data?.map((r) => {
                  const badge = PARSE_BADGE[r.parse_status];
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.file_name}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                      </div>
                      {r.download_url ? (
                        <a
                          href={r.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          <Download className="size-4" /> Download
                        </a>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Unavailable
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" /> Tailored drafts
            </CardTitle>
            <CardDescription>Saved resume drafts</CardDescription>
          </CardHeader>
          <CardContent>
            {draftsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (draftsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tailored drafts yet — tailor a resume from the Jobs or Saved
                tab.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {draftsQuery.data?.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {draftLabel(d)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(d.updated_at)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exportMutation.isPending}
                      onClick={() => exportMutation.mutate(d)}
                    >
                      <Download className="size-4" /> Download PDF
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="pt-8 text-xs text-muted-foreground">
        Build your profile first — it&apos;s the source the matcher and resume
        drafter read from.
      </p>
    </div>
  );
}
