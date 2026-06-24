"use client";

import { Building2, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_JOBS, DEMO_SELECTED_JOB } from "@/components/landing/demo/sampleData";

const formatSalary = (min?: number, max?: number) => {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
};

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function DemoJobs() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sample listings, the way real ones appear once searched by role and location. Click into
        one to see your match.
      </p>
      {DEMO_JOBS.map((job) => {
        const selected = job.id === DEMO_SELECTED_JOB.id;
        const salary = formatSalary(job.salary_min, job.salary_max);
        return (
          <Card
            key={job.id}
            className={selected ? "border border-primary/40 bg-primary/5" : "bg-card"}
          >
            <CardContent className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{job.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" /> {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {job.location}
                    </span>
                    <span>Posted {formatDate(job.created)}</span>
                  </div>
                </div>
                {selected ? <Badge>Matched</Badge> : null}
              </div>
              {salary ? <p className="text-sm font-medium text-positive">{salary}</p> : null}
              <p className="text-sm text-muted-foreground">{job.snippet}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
