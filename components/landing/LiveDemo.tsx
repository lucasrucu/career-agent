"use client";

import { useState } from "react";
import { User, Search, Gauge, FileText, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DemoProfile } from "@/components/landing/demo/DemoProfile";
import { DemoJobs } from "@/components/landing/demo/DemoJobs";
import { DemoMatch } from "@/components/landing/demo/DemoMatch";
import { DemoResume } from "@/components/landing/demo/DemoResume";

type TabId = "profile" | "jobs" | "match" | "resume";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "jobs", label: "Find Jobs", icon: Search },
  { id: "match", label: "Job Match", icon: Gauge },
  { id: "resume", label: "Tailored Resume", icon: FileText },
];

export function LiveDemo() {
  const [active, setActive] = useState<TabId>("profile");

  return (
    <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:py-24">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <Badge variant="outline" className="mb-4">
          Live demo · sample data
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Click around the actual product
        </h2>
        <p className="mt-3 text-muted-foreground">
          This is the real interface running on a fictional candidate&apos;s data — no login
          required. Switch tabs to see a parsed profile, the way job listings appear, the match
          read, and a tailored resume.
        </p>
      </div>

      {/* Mock app frame */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-background/40 px-4 py-3">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
          <span className="ml-3 truncate text-xs text-muted-foreground">career-agent.app</span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-background/40 px-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-background/40 p-4 sm:p-6">
          {active === "profile" && <DemoProfile />}
          {active === "jobs" && <DemoJobs />}
          {active === "match" && <DemoMatch />}
          {active === "resume" && <DemoResume />}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Sample data — a fictional candidate, not connected to any real account.
      </p>
    </section>
  );
}
