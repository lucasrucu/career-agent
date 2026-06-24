"use client";

import { Building2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_MATCH, DEMO_SELECTED_JOB } from "@/components/landing/demo/sampleData";

function MatchRing({ pct }: { pct: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative flex size-32 shrink-0 items-center justify-center">
      <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
        <span className="text-xs text-muted-foreground">match</span>
      </div>
    </div>
  );
}

export function DemoMatch() {
  const job = DEMO_SELECTED_JOB;
  const match = DEMO_MATCH;

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <MatchRing pct={match.match_pct} />
          <div className="space-y-2 text-center sm:text-left">
            <p className="font-heading text-lg font-semibold">{job.title}</p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1">
                <Building2 className="size-3.5" /> {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {job.location}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-1 sm:justify-start">
              {match.keywords.map((kw) => (
                <Badge key={kw} variant="outline">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-positive">
              <CheckCircle2 className="size-4" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {match.strengths.map((s) => (
                <li key={s} className="rounded-lg bg-background/60 px-3 py-2">
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-negative">
              <AlertCircle className="size-4" /> Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {match.gaps.map((g) => (
                <li key={g} className="rounded-lg bg-background/60 px-3 py-2">
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
