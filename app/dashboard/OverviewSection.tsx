"use client";

import { useQuery } from "@tanstack/react-query";
import { FileUp, Gauge, Search, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, listSavedJobs } from "@/lib/api-client";
import type { DashboardTab } from "./DashboardClient";

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
        <Button variant="outline" onClick={() => onNavigate("profile")}>
          <UserCog className="size-4" /> Edit profile
        </Button>
        <Button variant="outline" onClick={() => onNavigate("profile")}>
          <FileUp className="size-4" /> Upload resume
        </Button>
      </div>

      <p className="pt-8 text-xs text-muted-foreground">
        Build your profile first — it&apos;s the source the matcher and resume
        drafter read from.
      </p>
    </div>
  );
}
