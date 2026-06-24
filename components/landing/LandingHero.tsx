import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REQUEST_ACCESS_HREF, SIGN_IN_HREF } from "@/components/landing/constants";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-primary/10 blur-3xl"
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:py-28">
        <Badge variant="outline" className="mb-6">
          Resume → real jobs → tailored applications
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Turn your experience into{" "}
          <span className="text-primary">applications that land.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Career Agent maps your skills, pulls real job listings, scores how well you match, and
          drafts a resume tailored to each role — honestly, from your own experience.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={REQUEST_ACCESS_HREF}
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}
          >
            Request access
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={SIGN_IN_HREF}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6 text-base")}
          >
            Sign in with Google
          </Link>
        </div>

        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          This is a personal portfolio project. Request access and I&apos;ll add you as a tester —
          usually within a day. Or{" "}
          <Link href="#demo" className="text-primary underline-offset-4 hover:underline">
            click around the live demo
          </Link>{" "}
          right now, no login needed.
        </p>
      </div>
    </section>
  );
}
