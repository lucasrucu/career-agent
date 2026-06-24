"use client";

import { useState } from "react";
import { Bookmark, Briefcase, Gauge, Search, UserCog } from "lucide-react";

import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import { DashboardUIProvider, useDashboardUI } from "./DashboardUIContext";
import { OverviewSection } from "./OverviewSection";
import { ProfileSection } from "./ProfileSection";
import { JobsSection } from "./JobsSection";
import { SavedSection } from "./SavedSection";

export type DashboardTab = "overview" | "profile" | "jobs" | "saved";

const TABS: { id: DashboardTab; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "profile", label: "Profile", icon: UserCog },
  { id: "jobs", label: "Jobs", icon: Search },
  { id: "saved", label: "Saved", icon: Bookmark },
];

export function DashboardClient({ userName }: { userName: string }) {
  return (
    <DashboardUIProvider>
      <DashboardShell userName={userName} />
    </DashboardUIProvider>
  );
}

function DashboardShell({ userName }: { userName: string }) {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const { profileDirty } = useDashboardUI();

  // Guard tab switches away from the Profile tab when it holds unsaved edits.
  function switchTab(next: DashboardTab) {
    if (next === tab) return;
    if (
      tab === "profile" &&
      profileDirty &&
      typeof window !== "undefined" &&
      !window.confirm(
        "You have unsaved changes to your profile. Leave without saving?"
      )
    ) {
      return;
    }
    setTab(next);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          Career Agent
        </div>
        <SignOutButton />
      </header>

      <nav className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <OverviewSection userName={userName} onNavigate={switchTab} />
      ) : null}
      {tab === "profile" ? <ProfileSection /> : null}
      {tab === "jobs" ? <JobsSection /> : null}
      {tab === "saved" ? <SavedSection /> : null}
    </main>
  );
}
