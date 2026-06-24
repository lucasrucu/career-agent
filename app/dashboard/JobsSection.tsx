"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  Check,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  draftResume,
  exportResumePdf,
  getProfile,
  saveJob,
  scoreMatch,
  searchJobs,
  suggestRoles,
  type JobInput,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Job, MatchResult, ResumeDraft, RoleSuggestion } from "@/lib/types";
import { localId } from "@/lib/job-context";
import { useDashboardUI } from "./DashboardUIContext";
import { MatchPanel } from "./MatchPanel";

// Build a local Job from a pasted job description so it can be saved + scored
// through the normal flow. The id reuses lib/job-context's localId so the
// `local:<id>` matches what the server would derive from the same text — the
// match cache and saved-job dedupe line up across re-analyses.
function jobFromDescription(text: string): Job {
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return {
    id: `local:${localId(text)}`,
    title: firstLine && firstLine.length <= 120 ? firstLine : "Pasted role",
    company: "",
    location: "",
    snippet: text,
    url: "",
    created: "",
  };
}

function formatSalary(job: Job): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (job.salary_min && job.salary_max) {
    return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  }
  if (job.salary_min) return `From ${fmt(job.salary_min)}`;
  if (job.salary_max) return `Up to ${fmt(job.salary_max)}`;
  return null;
}

// A single result card with its own match/draft/export state, driven by a
// JobInput (either a real Job or a pasted job_description).
function JobActions({
  input,
  showSave,
  job,
}: {
  input: JobInput;
  showSave?: boolean;
  job?: Job;
}) {
  const queryClient = useQueryClient();
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [draft, setDraft] = useState<ResumeDraft | null>(null);

  // The match endpoint caches per profile_version, so re-scoring an unchanged
  // profile just returns the same row. Track the profile version the current
  // result was scored against; once that matches the live profile version, the
  // re-score button is a no-op and we make that clear.
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profileVersion = profileQuery.data?.version ?? null;
  const scored = match !== null;
  const upToDate =
    scored && profileVersion !== null && match.profile_version === profileVersion;

  // Unique toast ids per job so concurrent score/tailor/export actions on
  // different result cards don't stomp each other's toasts.
  const tid = job?.id ?? "pasted";

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!job) throw new Error("No job to save.");
      return saveJob(job);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success("Job saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const matchMutation = useMutation({
    mutationFn: () => scoreMatch(input),
    onMutate: () => toast.loading("Scoring match…", { id: `score-${tid}` }),
    onSuccess: (result) => {
      setMatch(result);
      toast.success(`Match: ${result.match_pct}%`, { id: `score-${tid}` });
    },
    onError: (err: Error) => toast.error(err.message, { id: `score-${tid}` }),
  });

  const draftMutation = useMutation({
    mutationFn: () => draftResume(input),
    onMutate: () => toast.loading("Tailoring resume…", { id: `draft-${tid}` }),
    onSuccess: (result) => {
      setDraft(result);
      // A draft now exists → refresh the saved-job has_draft flag and the
      // Overview "Tailored drafts" history so neither goes stale.
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {showSave ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bookmark className="size-3.5" />
            )}
            Save
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => matchMutation.mutate()}
          disabled={matchMutation.isPending || upToDate}
          title={
            upToDate
              ? "Edit your profile to re-score against this role."
              : undefined
          }
        >
          {matchMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : upToDate ? (
            <Check className="size-3.5" />
          ) : (
            <Gauge className="size-3.5" />
          )}
          {upToDate ? "Scored" : scored ? "Re-score" : "Score match"}
        </Button>
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

      {match ? <MatchPanel match={match} /> : null}
      {upToDate ? (
        <p className="text-xs text-muted-foreground">
          Scored — edit your profile to re-score.
        </p>
      ) : null}
    </div>
  );
}

function JobResultCard({ job }: { job: Job }) {
  const salary = formatSalary(job);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-3">
          <span>{job.title}</span>
        </CardTitle>
        <CardDescription>
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {salary ? (
          <Badge variant="secondary" className="w-fit">
            {salary}
          </Badge>
        ) : null}
        {job.snippet ? (
          <p className="text-sm text-muted-foreground">{job.snippet}</p>
        ) : null}
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
          >
            View listing <ExternalLink className="size-3.5" />
          </a>
        ) : null}
        <JobActions input={{ job }} showSave job={job} />
      </CardContent>
    </Card>
  );
}

// Suggested roles under the search button. Top 3 by default with an optional
// "more" reveal; each chip fills the query and runs the search on tap.
function RoleSuggestions({
  hasProfile,
  profileLoading,
  suggestions,
  isLoading,
  isError,
  isFetching,
  showAll,
  onToggleShowAll,
  onRefresh,
  onPick,
  disabled,
}: {
  hasProfile: boolean;
  profileLoading: boolean;
  suggestions: RoleSuggestion[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  onRefresh: () => void;
  onPick: (query: string) => void;
  disabled?: boolean;
}) {
  // Wait for the profile to load before deciding what to show.
  if (profileLoading) return null;

  // No profile yet → guidance instead of an error.
  if (!hasProfile) {
    return (
      <div className="mt-4 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline size-3.5 text-primary" />
          Build your profile to get suggested roles tailored to your experience.
        </p>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" /> Suggested roles
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        title="Regenerate suggestions"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
        Refresh
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mt-4 border-t pt-4">
        {header}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Finding roles that fit
          your profile…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-4 border-t pt-4">
        {header}
        <p className="mt-2 text-xs text-muted-foreground">
          Couldn&apos;t load suggestions.
        </p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="mt-4 border-t pt-4">
        {header}
        <p className="mt-2 text-xs text-muted-foreground">
          Add more experience or skills to your profile to get role suggestions.
        </p>
      </div>
    );
  }

  const visible = showAll ? suggestions : suggestions.slice(0, 3);

  return (
    <div className="mt-4 border-t pt-4">
      {header}
      <div className="mt-2 flex flex-wrap gap-2">
        {visible.map((s) => (
          <button
            key={`${s.title}:${s.query}`}
            type="button"
            onClick={() => onPick(s.query)}
            disabled={disabled}
            title={s.rationale}
            className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="size-3 text-muted-foreground" />
            {s.title}
          </button>
        ))}
        {suggestions.length > 3 ? (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="inline-flex items-center rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAll ? "Show fewer" : `+${suggestions.length - 3} more`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function JobsSection() {
  // Search form values + results live in the dashboard UI context so they
  // persist across tab switches (the Jobs panel unmounts when you leave it).
  const {
    query,
    setQuery,
    where,
    setWhere,
    country,
    setCountry,
    fullTime,
    setFullTime,
    results,
    setResults,
  } = useDashboardUI().jobsSearch;
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const [jd, setJd] = useState("");
  // A pasted JD becomes a local Job so it can be saved, scored, and tailored
  // through the same flow as real listings (stable id → cache + dedupe align).
  const [pastedJob, setPastedJob] = useState<Job | null>(null);

  // Profile drives whether we ask for role suggestions and keys their cache.
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profileVersion = profileQuery.data?.version ?? null;
  const hasProfile = profileQuery.data != null;

  // Role suggestions (Theme 2 / G) — proposed from the real profile. Keyed off
  // profile version with a long staleTime so switching tabs doesn't refetch.
  const suggestionsQuery = useQuery({
    queryKey: ["role-suggestions", profileVersion],
    queryFn: suggestRoles,
    enabled: hasProfile,
    staleTime: 1000 * 60 * 30,
  });
  const suggestions = suggestionsQuery.data?.suggestions ?? [];

  // searchMutation takes the query as a variable so a chip click can search
  // immediately without waiting for the setQuery state update to flush. The
  // form and chips share this one path (so downstream result persistence covers
  // both). where/country/fullTime come from current state.
  const searchMutation = useMutation({
    mutationFn: (searchQuery: string) =>
      searchJobs({
        query: searchQuery.trim(),
        where: where.trim() || undefined,
        country: country.trim() || "us",
        full_time: fullTime,
      }),
    onSuccess: (jobs) => {
      setResults(jobs);
      if (jobs.length === 0) {
        toast.info("No results. Try a broader search.");
      }
    },
    onError: (err: Error) => {
      setResults([]);
      toast.error(err.message);
    },
  });

  function runSearch(nextQuery?: string) {
    const effective = (nextQuery ?? query).trim();
    if (!effective) {
      toast.error("Enter a role or keyword to search.");
      return;
    }
    if (nextQuery !== undefined) setQuery(nextQuery);
    setResults(null);
    searchMutation.mutate(effective);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  function onAnalyzePasted() {
    const text = jd.trim();
    if (text.length < 30) {
      toast.error("Paste a fuller job description (30+ characters).");
      return;
    }
    setPastedJob(jobFromDescription(text));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-primary" /> Search jobs
          </CardTitle>
          <CardDescription>
            Real listings via Adzuna. Score and tailor against your saved
            profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Role or keyword</Label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Frontend engineer"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location (optional)</Label>
                <Input
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Country code</Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="us"
                />
              </div>
              <label className="flex items-end gap-2 pb-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={fullTime}
                  onChange={(e) => setFullTime(e.target.checked)}
                  className="size-4 accent-[hsl(var(--primary))]"
                />
                Full-time only
              </label>
            </div>
            <div>
              <Button type="submit" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search
              </Button>
            </div>
          </form>

          {/* Role suggestions (Theme 2 / G) — grounded in the real profile. */}
          <RoleSuggestions
            hasProfile={hasProfile}
            profileLoading={profileQuery.isLoading}
            suggestions={suggestions}
            isLoading={suggestionsQuery.isLoading}
            isError={suggestionsQuery.isError}
            isFetching={suggestionsQuery.isFetching}
            showAll={showAllSuggestions}
            onToggleShowAll={() => setShowAllSuggestions((v) => !v)}
            onRefresh={() => suggestionsQuery.refetch()}
            onPick={(q) => runSearch(q)}
            disabled={searchMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Results */}
      {searchMutation.isPending ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.map((job) => (
            <JobResultCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}

      {results && results.length === 0 && !searchMutation.isPending ? (
        <p className="text-sm text-muted-foreground">
          No results. Try a broader search, or paste a job description below.
        </p>
      ) : null}

      {/* Paste-a-JD fallback */}
      <Card>
        <CardHeader>
          <CardTitle>Paste a job description</CardTitle>
          <CardDescription>
            No listing? Paste the text and score / tailor against it directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={jd}
            onChange={(e) => {
              setJd(e.target.value);
              setPastedJob(null);
            }}
            rows={6}
            placeholder="Paste the full job description here…"
          />
          {!pastedJob ? (
            <div>
              <Button variant="outline" size="sm" onClick={onAnalyzePasted}>
                <Gauge className="size-3.5" /> Use this description
              </Button>
            </div>
          ) : (
            <JobActions input={{ job: pastedJob }} showSave job={pastedJob} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
