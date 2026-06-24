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

// ---------------------------------------------------------------------------
// Structured output helper.
//
// We force a single tool call to get schema-shaped JSON back. Tool-use is the
// most portable path across SDK versions and works on every current model
// (incl. claude-haiku-4-5, which rejects the `effort`/adaptive-thinking
// params). No `thinking`/`effort`/sampling params are passed, so the same call
// is valid whether ANTHROPIC_MODEL is Haiku or Sonnet.
// ---------------------------------------------------------------------------
export interface StructuredRequest {
  system: string;
  // A plain user prompt, or a full messages array for few-shot / multi-part input.
  prompt: string | Anthropic.MessageParam[];
  toolName: string;
  toolDescription: string;
  // JSON Schema for the tool's input — this is the shape Claude must return.
  schema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
}

export async function generateStructured<T>(req: StructuredRequest): Promise<T> {
  const messages: Anthropic.MessageParam[] =
    typeof req.prompt === "string"
      ? [{ role: "user", content: req.prompt }]
      : req.prompt;

  const response = await anthropic().messages.create({
    model: model(),
    max_tokens: req.maxTokens ?? 4096,
    system: req.system,
    tools: [
      {
        name: req.toolName,
        description: req.toolDescription,
        input_schema: req.schema,
      },
    ],
    tool_choice: { type: "tool", name: req.toolName },
    messages,
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model did not return structured output");
  }
  return block.input as T;
}
