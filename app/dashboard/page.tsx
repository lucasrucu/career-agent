import { redirect } from "next/navigation";
import {
  Briefcase,
  FileUp,
  Gauge,
  Search,
  UserCog,
} from "lucide-react";

import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// FR-11 — authenticated home. Scaffold shell: the widgets render with placeholder
// data. They read from `profiles`, `saved_jobs`, and `match_results` once those
// flows (FR-3..FR-10) are implemented.
const QUICK_ACTIONS = [
  { icon: Search, label: "Search jobs", href: "#" },
  { icon: UserCog, label: "Edit profile", href: "#" },
  { icon: FileUp, label: "Upload resume", href: "#" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.full_name ?? user.email ?? "there";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between pb-8">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          Career Agent
        </div>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-1 pb-6">
        <h1 className="text-2xl font-semibold">Welcome, {name}.</h1>
        <p className="text-sm text-muted-foreground">
          Your job-search workspace. Build your profile, then find and tailor for roles.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4 text-primary" /> Profile completeness
            </CardTitle>
            <CardDescription>Upload a resume to begin</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved jobs</CardTitle>
            <CardDescription>By pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent matches</CardTitle>
            <CardDescription>Scored against your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No matches yet.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 pt-6">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.label} variant="outline">
            <action.icon className="size-4" /> {action.label}
          </Button>
        ))}
      </div>

      <p className="pt-8 text-xs text-muted-foreground">
        Scaffold shell — feature flows (resume parsing, skill-mapping chat, job search,
        match scoring, tailored-resume export) land in follow-up work. See PRD.md.
      </p>
    </main>
  );
}
