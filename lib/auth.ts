import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type AuthSuccess = {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
  unauthorized: null;
};

type AuthFailure = {
  user: null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  unauthorized: NextResponse;
};

export async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, supabase, unauthorized: null };
}
