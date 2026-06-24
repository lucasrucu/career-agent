"use client";

import { Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MatchResult } from "@/lib/types";

// Match badge color from the score — shared by the Jobs and Saved sections.
export function matchVariant(pct: number): "positive" | "default" | "negative" {
  if (pct >= 70) return "positive";
  if (pct >= 45) return "default";
  return "negative";
}

// The persisted match readout (score + strengths / gaps / keywords). Used both
// in JobsSection result cards and the SavedSection detail panel.
export function MatchPanel({ match }: { match: MatchResult }) {
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
