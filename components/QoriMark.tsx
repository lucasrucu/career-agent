/* Qori lockup — canonical reference component.
   Copy into each app (e.g. components/QoriMark.tsx) and use in nav / login / footer.
   The solid amber tile + dark glyph is the umbrella mark; per-product glyph varies,
   tile geometry + wordmark style stay identical across every property.

   Per-product glyph map:
     hub / umbrella     -> "q"        (the Qori monogram)
     Financial Dashboard-> "wallet"
     Career Agent       -> "briefcase"
     Snip               -> "link"

   Requires: lucide-react (already a dependency in every app) and Tailwind with the
   Qori tokens (bg-primary = amber, text-primary-foreground = near-black brown). */

import { Wallet, Briefcase, Link2 } from "lucide-react";

type Glyph = "q" | "wallet" | "briefcase" | "link";

const LUCIDE: Record<Exclude<Glyph, "q">, typeof Wallet> = {
  wallet: Wallet,
  briefcase: Briefcase,
  link: Link2,
};

function QGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="45" cy="45" r="25" stroke="currentColor" strokeWidth="11" />
      <line x1="51" y1="55" x2="74" y2="80" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

export function QoriMark({
  glyph = "q",
  label,
  size = 32,
}: {
  glyph?: Glyph;
  label?: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-[0.34em] bg-primary text-primary-foreground"
        style={{ width: size, height: size }}
        aria-hidden={label ? true : undefined}
      >
        {glyph === "q" ? (
          <QGlyph size={Math.round(size * 0.62)} />
        ) : (
          (() => {
            const Icon = LUCIDE[glyph];
            return <Icon size={Math.round(size * 0.5)} strokeWidth={2.25} />;
          })()
        )}
      </span>
      {label ? (
        <span className="text-base font-medium tracking-tight text-foreground">{label}</span>
      ) : null}
    </span>
  );
}
