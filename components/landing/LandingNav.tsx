import Link from "next/link";

import { QoriMark } from "@/components/QoriMark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  APP_NAME,
  REQUEST_ACCESS_HREF,
  SIGN_IN_HREF,
} from "@/components/landing/constants";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <QoriMark glyph="briefcase" label={APP_NAME} size={28} />
        </Link>

        <div className="flex items-center gap-2">
          <Link href="#demo" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Demo
          </Link>
          <Link href="#features" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Features
          </Link>
          <Link
            href={SIGN_IN_HREF}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "ml-1")}
          >
            Sign in
          </Link>
          <Link href={REQUEST_ACCESS_HREF} className={cn(buttonVariants({ size: "lg" }))}>
            Request access
          </Link>
        </div>
      </div>
    </header>
  );
}
