import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Gauge,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: Sparkles,
    title: "Map your skills",
    body: "Upload your resume and refine it through a conversation with an AI agent that surfaces what you'd undersell.",
  },
  {
    icon: Search,
    title: "Find real jobs",
    body: "Search current listings by role and location — no scraping, sanctioned data only.",
  },
  {
    icon: Gauge,
    title: "See your match",
    body: "Get a match % per role with a plain-language read on your strengths and gaps.",
  },
  {
    icon: FileText,
    title: "Tailor your resume",
    body: "One click drafts a role-specific resume from your real experience, exported as a clean PDF.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          Career Agent
        </div>
        <Button render={<Link href="/login" />}>Sign in with Google</Button>
      </header>

      <section className="flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
          Turn your experience into applications that land.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          Career Agent maps your skills, pulls real job listings, scores how well you
          match, and drafts a resume tailored to each role — honestly, from your own
          experience.
        </p>
        <Button size="lg" render={<Link href="/login" />}>
          Get started <ArrowRight className="size-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          Free to try · sign in with Google · your data stays yours
        </p>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-2">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardContent className="flex flex-col gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon className="size-4" />
              </span>
              <h2 className="font-medium">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="mt-auto border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built by Lucas Ruiz · a sibling of the Financial Dashboard and snip.
      </footer>
    </main>
  );
}
