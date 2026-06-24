"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  Search,
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
  saveJob,
  scoreMatch,
  searchJobs,
  type JobInput,
} from "@/lib/api-client";
import type { Job, MatchResult, ResumeDraft } from "@/lib/types";

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

function matchVariant(pct: number): "positive" | "default" | "negative" {
  if (pct >= 70) return "positive";
  if (pct >= 45) return "default";
  return "negative";
}

function MatchPanel({ match }: { match: MatchResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Badge variant={matchVariant(match.match_pct)}>
          <Gauge className="size-3" /> {match.match_pct}% match
        </Badge>
      </div>
      {match.strengths.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">Strengths</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
            {match.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {match.gaps.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">Gaps</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
            {match.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {match.keywords.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">Keywords</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {match.keywords.map((k, i) => (
              <Badge key={i} variant="outline">
                {k}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
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
          disabled={matchMutation.isPending}
        >
          {matchMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Gauge className="size-3.5" />
          )}
          Score match
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

export function JobsSection() {
  const [query, setQuery] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState("us");
  const [fullTime, setFullTime] = useState(false);
  const [results, setResults] = useState<Job[] | null>(null);

  const [jd, setJd] = useState("");
  const [pastedInput, setPastedInput] = useState<JobInput | null>(null);

  const searchMutation = useMutation({
    mutationFn: () =>
      searchJobs({
        query: query.trim(),
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

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Enter a role or keyword to search.");
      return;
    }
    setResults(null);
    searchMutation.mutate();
  }

  function onAnalyzePasted() {
    const text = jd.trim();
    if (text.length < 30) {
      toast.error("Paste a fuller job description (30+ characters).");
      return;
    }
    setPastedInput({ job_description: text });
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
              setPastedInput(null);
            }}
            rows={6}
            placeholder="Paste the full job description here…"
          />
          {!pastedInput ? (
            <div>
              <Button variant="outline" size="sm" onClick={onAnalyzePasted}>
                <Gauge className="size-3.5" /> Use this description
              </Button>
            </div>
          ) : (
            <JobActions input={pastedInput} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
