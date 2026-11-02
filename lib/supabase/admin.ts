import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-side admin operations (e.g. the public
// access-request endpoint, which writes to a table that only the service role can
// touch under RLS). Memoized so we reuse one client across requests. Never import
// this into client components — `server-only` enforces that at build time.

type AdminClient = SupabaseClient<any, string, string>;

let adminClient: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  adminClient = createClient(url, serviceRoleKey, {
    db: { schema },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });

  return adminClient;
}
