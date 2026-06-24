import { Sparkles, Search, Gauge, FileText, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Sparkles,
    title: "Map your skills",
    description:
      "Upload your resume and we parse it into a structured profile — experience, skills, and the standout achievements most resumes bury — for you to review and edit.",
  },
  {
    icon: Search,
    title: "Find real jobs",
    description:
      "Search current listings by role and location — no scraping, sanctioned data only.",
  },
  {
    icon: Gauge,
    title: "See your match",
    description:
      "Get a match % per role with a plain-language read on your strengths and gaps.",
  },
  {
    icon: FileText,
    title: "Tailor your resume",
    description:
      "One click drafts a role-specific resume from your real experience, exported as a clean PDF.",
  },
];

export function FeatureHighlights() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          From your resume to a tailored application
        </h2>
        <p className="mt-3 text-muted-foreground">
          Four steps, all grounded in your own experience — no invented skills, no generic
          boilerplate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="bg-card">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
