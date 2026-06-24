import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

// FR-11 — authenticated home. Server component gates auth, then hands off to the
// client dashboard (Overview / Profile / Jobs) which drives the API routes.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.full_name ?? user.email ?? "there";

  return <DashboardClient userName={name} />;
}
