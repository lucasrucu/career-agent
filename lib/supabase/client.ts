"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient(url, anonKey, { db: { schema } });
}
