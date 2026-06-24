"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteSavedJob,
  draftResume,
  exportResumePdf,
  listSavedJobs,
  updateSavedJobStatus,
} from "@/lib/api-client";
import type { Job, ResumeDraft, SavedJobDetail, SavedJobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MatchPanel } from "./MatchPanel";

const STATUSES: SavedJobStatus[] = [
  "interested",
  "drafted",
  "applied",
  "interviewing",
  "closed",
];

const STATUS_LABELS: Record<SavedJobStatus, string> = {
  interested: "Interested",
  drafted: "Drafted",
  applied: "Applied",
  interviewing: "Interviewing",
  closed: "Closed",
};

function statusVariant(
  status: SavedJobStatus
): "default" | "secondary" | "positive" | "negative" | "outline" {
  switch (status) {
    case "interested":
      return "secondary";
    case "drafted":
      return "default";
    case "applied":
      return "default";
    case "interviewing":
      return "positive";
    case "closed":
      return "negative";
    default:
      return "outline";
  }
}

// The Tailor-resume / Download-PDF actions for a saved job, with their own
// draft state. Mirrors the JobActions draft+export flow from JobsSection.
function SavedJobActions({ job }: { job: Job }) {
  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const queryClient = useQueryClient();
  const tid = job.id;

  const draftMutation = useMutation({
    mutationFn: () => draftResume({ job }),
    onMutate: () => toast.loading("Tailoring resume…", { id: `draft-${tid}` }),
    onSuccess: (result) => {
      setDraft(result);
      // A new draft now exists → refresh the has_draft flag in the list and the
      // Overview "Tailored drafts" history.
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["resume-drafts"] });
      toast.success("Tailored draft ready.", { id: `draft-${tid}` });
    },
    onError: (err: Error) => toast.error(err.message, { id: `draft-${tid}` }),
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("Draft a resume first.");
      return exportResumePdf({
        content: draft.content,
        filename: draft.export_filename,
      });
    },
    onMutate: () => toast.loading("Generating PDF…", { id: `export-${tid}` }),
    onSuccess: () => toast.success("PDF downloaded.", { id: `export-${tid}` }),
    onError: (err: Error) => toast.error(err.message, { id: `export-${tid}` }),
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => draftMutation.mutate()}
        disabled={draftMutation.isPending}
      >
        {draftMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileText className="size-3.5" />
        )}
        Tailor resume
      </Button>
      {draft ? (
        <Button
          size="sm"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Download PDF
        </Button>
      ) : null}
    </div>
  );
}

function SavedJobCard({ saved }: { saved: SavedJobDetail }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: SavedJobStatus) =>
      updateSavedJobStatus(saved.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success("Status updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteSavedJob(saved.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success("Removed from saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onRemove() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Remove this job from your saved pipeline?")
    ) {
      return;
    }
    removeMutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-3">
          <span>{saved.title}</span>
          <Badge variant={statusVariant(saved.status)}>
            {STATUS_LABELS[saved.status]}
          </Badge>
        </CardTitle>
        <CardDescription>
          {saved.company}
          {saved.location ? ` · ${saved.location}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Status
            <select
              value={saved.status}
              onChange={(e) =>
                statusMutation.mutate(e.target.value as SavedJobStatus)
              }
              disabled={statusMutation.isPending}
              className="h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {saved.match ? (
            <Badge variant="outline">{saved.match.match_pct}% match</Badge>
          ) : null}
          {saved.has_draft ? (
            <Badge variant="secondary">Draft ready</Badge>
          ) : null}

          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {open ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              Details
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Remove
            </Button>
          </div>
        </div>

        {open ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            {saved.match ? (
              <MatchPanel match={saved.match} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Not scored yet. Score this role from the Jobs tab to see your
                fit.
              </p>
            )}
            {saved.snippet ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {saved.snippet}
              </p>
            ) : null}
            {saved.url ? (
              <a
                href={saved.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
              >
                View listing <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            <SavedJobActions job={saved} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SavedSection() {
  const savedQuery = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: listSavedJobs,
  });

  if (savedQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (savedQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {(savedQuery.error as Error).message}
      </p>
    );
  }

  const jobs = savedQuery.data ?? [];

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className={cn("py-8 text-center")}>
          <p className="text-sm text-muted-foreground">
            No saved jobs yet — search and save roles to build your pipeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {jobs.length} saved job{jobs.length === 1 ? "" : "s"}
      </p>
      {jobs.map((saved) => (
        <SavedJobCard key={saved.id} saved={saved} />
      ))}
    </div>
  );
}
