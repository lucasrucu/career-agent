import type { Metadata } from "next";
import Link from "next/link";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Career Agent",
  description:
    "What Career Agent collects, how your resume is stored, who can access it, and how to request deletion.",
};

const LAST_UPDATED = "June 24, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Career Agent is a personal portfolio project operated by an individual (&quot;the
            operator&quot;). It helps you turn your resume into tailored job applications. This page
            explains, in plain language, what is collected, how it is stored, who can access it, and
            how to have it deleted. By requesting access and using Career Agent, you consent to the
            practices described here.
          </p>

          <Section title="What we collect">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Account info</strong> — your name and email from
                Google sign-in (via Supabase Auth).
              </li>
              <li>
                <strong className="text-foreground">Your resume</strong> — the file you upload. We
                parse it into a structured profile (contact, experience, skills, interests) and
                store both the original file in a private storage bucket and the parsed result.
              </li>
              <li>
                <strong className="text-foreground">Jobs &amp; matches</strong> — listings you
                search or save, and the match scores and tailored resume drafts you generate.
              </li>
              <li>
                <strong className="text-foreground">Access requests</strong> — the email (and
                optional note) you submit on the landing page, plus your IP address for abuse
                prevention.
              </li>
            </ul>
          </Section>

          <Section title="How it's used">
            <p>
              Your data is used solely to power your own use of Career Agent: parsing your resume,
              scoring how you match a role, and drafting tailored resumes you explicitly request. It
              is <strong className="text-foreground">never sold</strong>, and it is not used for
              advertising.
            </p>
          </Section>

          <Section title="Third parties">
            <p>Career Agent shares data with these processors only as needed to function:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Supabase</strong> — database, authentication,
                and private storage of your resume and parsed profile.
              </li>
              <li>
                <strong className="text-foreground">Anthropic (Claude)</strong> — parses your resume
                and drafts tailored content. Only the text needed for the task is sent, on your
                request.
              </li>
              <li>
                <strong className="text-foreground">Adzuna</strong> — supplies the public job
                listings you search.
              </li>
              <li>
                <strong className="text-foreground">Google</strong> — sign-in.
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> — delivers access-request
                notifications to the operator.
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> — application hosting.
              </li>
            </ul>
          </Section>

          <Section title="Storage & security">
            <p>
              Data is stored in a Supabase (PostgreSQL) database, with uploaded resumes in a private
              storage bucket. Every table enforces{" "}
              <strong className="text-foreground">row-level security</strong>: signed-in users can
              only ever read or write their <em>own</em> rows, so one user can never see another
              user&apos;s data. Traffic is served over HTTPS, and API keys are kept server-side.
            </p>
          </Section>

          <Section title="Who can access your data">
            <p>
              As the database administrator, the operator has technical access to stored data,
              including your uploaded resume. This is inherent to running any hosted service — your
              data is not hidden from the operator. It is accessed only to run and maintain Career
              Agent, never shared, and never sold. If that level of trust isn&apos;t right for you,
              please don&apos;t upload a resume you consider sensitive.
            </p>
          </Section>

          <Section title="Retention & deletion">
            <p>
              Your data is kept while your account is active. You can request deletion of your
              account and all associated data — including your uploaded resume — at any time. To do
              so, email the operator (below).
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, data requests, or deletion:{" "}
              <a
                href="mailto:lucasruiz1336@gmail.com?subject=Career%20Agent%20privacy%20request"
                className="text-primary underline-offset-4 hover:underline"
              >
                lucasruiz1336@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section title="Changes">
            <p>
              This policy may be updated as Career Agent evolves; the date at the top reflects the
              latest version.
            </p>
          </Section>

          <p className="pt-4 text-sm">
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              ← Back to Career Agent
            </Link>
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
