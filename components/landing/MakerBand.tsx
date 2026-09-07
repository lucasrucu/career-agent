import { ArrowUpRight, Mail } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAKER_BLURB,
  MAKER_EMAIL_HREF,
  MAKER_LINKEDIN_HREF,
  MAKER_MONOGRAM,
  MAKER_NAME,
  MAKER_SITE_HREF,
} from "@/components/landing/constants";

/* lucide-react 1.x ships no brand marks, so the LinkedIn glyph is inline. */
function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.97 0 1.77-.77 1.77-1.73V1.73C24 .77 23.2 0 22.23 0Z" />
    </svg>
  );
}

/* Maker attribution. Sits after the closing CTA so the product still sells
   first: this band is where someone who liked it finds out who made it. */
export function MakerBand() {
  return (
    <section id="maker" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-8 text-center sm:flex-row sm:gap-6 sm:text-left">
        <span
          aria-hidden
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-[0.34em] bg-primary text-base font-semibold tracking-tight text-primary-foreground"
        >
          {MAKER_MONOGRAM}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Built by
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{MAKER_NAME}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{MAKER_BLURB}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
          <a
            href={MAKER_SITE_HREF}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "h-9 px-3.5")}
          >
            qori.land
            <ArrowUpRight className="size-4" />
          </a>
          <a
            href={MAKER_EMAIL_HREF}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-9 px-3.5")}
          >
            <Mail className="size-4" />
            Email
          </a>
          <a
            href={MAKER_LINKEDIN_HREF}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-9 px-3.5")}
          >
            <LinkedInGlyph className="size-4" />
            LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
}
