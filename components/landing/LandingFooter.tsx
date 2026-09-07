import Link from "next/link";
import { Code2 } from "lucide-react";

import { QoriMark } from "@/components/QoriMark";
import { APP_NAME, GITHUB_HREF, MAKER_SITE_HREF } from "@/components/landing/constants";

const STACK = ["Next.js", "TypeScript", "Supabase", "Claude", "Adzuna", "Vercel"];

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <QoriMark glyph="briefcase" label={APP_NAME} size={24} />
          <a
            href={MAKER_SITE_HREF}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            · built by Lucas Ruiz
          </a>
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
