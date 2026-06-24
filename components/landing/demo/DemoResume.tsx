"use client";

import { FileText, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DEMO_TAILORED_RESUME,
  DEMO_RESUME_FILENAME,
  DEMO_SELECTED_JOB,
} from "@/components/landing/demo/sampleData";

export function DemoResume() {
  const resume = DEMO_TAILORED_RESUME;
  const { contact } = resume;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          One-click draft tailored to{" "}
          <span className="font-medium text-foreground">{DEMO_SELECTED_JOB.title}</span> at{" "}
          {DEMO_SELECTED_JOB.company}.
        </p>
        <Badge variant="outline" className="gap-1.5">
          <Download className="size-3.5" /> {DEMO_RESUME_FILENAME}
        </Badge>
      </div>

      {/* Mock one-page resume sheet */}
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-white p-8 text-[hsl(25_20%_12%)] shadow-sm">
        <header className="border-b border-neutral-200 pb-3">
          <h3 className="text-2xl font-semibold tracking-tight">{contact.name}</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {[contact.location, contact.email, contact.phone].filter(Boolean).join("  ·  ")}
          </p>
          {contact.links?.length ? (
            <p className="mt-0.5 text-xs text-neutral-500">{contact.links.join("  ·  ")}</p>
          ) : null}
        </header>

        <section className="mt-4">
          <p className="text-sm leading-relaxed">{resume.summary}</p>
        </section>

        <section className="mt-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Experience
          </h4>
          <div className="space-y-3">
            {resume.experiences.map((exp) => (
              <div key={`${exp.company}-${exp.title}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {exp.title} · {exp.company}
                  </p>
                  <span className="shrink-0 text-xs text-neutral-500">{exp.dates}</span>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-neutral-700">
                  {exp.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Skills
            </h4>
            <p className="text-sm text-neutral-700">
              {resume.skills.map((s) => s.name).join(", ")}
            </p>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Education
            </h4>
            {resume.education.map((ed) => (
              <p key={ed.institution} className="text-sm text-neutral-700">
                {ed.credential}, {ed.institution}
                {ed.dates ? ` (${ed.dates})` : ""}
              </p>
            ))}
          </section>
        </div>

        {resume.interests?.length ? (
          <section className="mt-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Interests &amp; Achievements
            </h4>
            <ul className="space-y-0.5 text-sm text-neutral-700">
              {resume.interests.map((i) => (
                <li key={i.title}>
                  <span className="font-medium">{i.title}</span>
                  {i.detail ? ` — ${i.detail}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <FileText className="size-3.5" /> Exported as a clean, ATS-friendly PDF.
      </p>
    </div>
  );
}
