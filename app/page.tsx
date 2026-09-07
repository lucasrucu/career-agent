import { redirect } from "next/navigation";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { LandingCta } from "@/components/landing/LandingCta";
import { MakerBand } from "@/components/landing/MakerBand";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <FeatureHighlights />
        <LiveDemo />
        <LandingCta />
        <MakerBand />
      </main>
      <LandingFooter />
    </div>
  );
}
