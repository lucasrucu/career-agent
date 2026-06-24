import Anthropic from "@anthropic-ai/sdk";

// Single server-side Claude client + model for all AI calls in v1 (PRD §7).
// The model is set by ANTHROPIC_MODEL (default claude-sonnet-4-6) and is NOT
// user-configurable. Per-task model splits are a trivial later change.

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function model(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
}
