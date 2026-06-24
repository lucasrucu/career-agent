import Link from "next/link";
import { Briefcase, Code2 } from "lucide-react";

import { APP_NAME, GITHUB_HREF } from "@/components/landing/constants";

const STACK = ["Next.js", "TypeScript", "Supabase", "Claude", "Adzuna", "Vercel"];

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Briefcase className="size-3.5" />
          </span>
          <span className="font-semibold">{APP_NAME}</span>
          <span className="text-sm text-muted-foreground">· built by Lucas Ruiz</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {STACK.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link
            href={GITHUB_HREF}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Code2 className="size-4" />
            Source
          </Link>
        </div>
      </div>
    </footer>
  );
}
