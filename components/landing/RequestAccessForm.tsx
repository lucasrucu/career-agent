"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RequestAccessForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("Please accept the privacy policy to continue.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), note: note.trim(), consent }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }

      setStatus("success");
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-8 text-center">
        <CheckCircle2 className="size-8 text-primary" />
        <p className="text-lg font-semibold">Request received</p>
        <p className="text-sm text-muted-foreground">
          Thanks — I&apos;ll review and add{" "}
          <span className="font-medium text-foreground">{email.trim()}</span> as a tester, usually
          within a day. You&apos;ll then be able to sign in with Google.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-3 text-left">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ra-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="ra-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use the Google email you&apos;ll sign in with.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ra-note" className="text-sm font-medium">
          What would you use Career Agent for?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="ra-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A sentence or two about your job search…"
          className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
        <span className="mt-0.5">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        </span>
        <span>
          I agree to the{" "}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>{" "}
          and understand the resume I upload would be processed as described there.
        </span>
      </label>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <Button type="submit" size="lg" className="h-11 text-base" disabled={status === "submitting"}>
        {status === "submitting" ? <Loader2 className="size-4 animate-spin" /> : "Request access"}
      </Button>
    </form>
  );
}
