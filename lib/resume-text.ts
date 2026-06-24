// Resume text extraction (FR-3). Converts an uploaded .pdf or .docx into plain
// text for Claude to parse. Kept dependency-light: pdf-parse for PDFs, mammoth
// for Word docs. Both run server-side only.

import mammoth from "mammoth";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB (PRD §9)

export type ResumeKind = "pdf" | "docx";

export function resumeKind(fileName: string, mimeType: string): ResumeKind | null {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the implementation directly. The package's index module runs a
  // debug harness that reads a bundled test PDF at import time, which throws
  // in a Next.js server bundle; the lib entry skips that.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    data: Buffer
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

// Normalize whitespace: non-breaking / unicode spaces become regular spaces,
// runs of spaces and tabs collapse to one, and blank-line runs are capped — but
// newlines are preserved so the model still sees the resume's line structure.
function normalizeWhitespace(text: string): string {
  return text
    .replace(/[       ]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract plain text from a resume buffer. Returns normalized text; throws if
// the document yields nothing usable so the caller can surface a clear error.
export async function extractResumeText(
  buffer: Buffer,
  kind: ResumeKind
): Promise<string> {
  const text = kind === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);
  const normalized = normalizeWhitespace(text);
  if (normalized.replace(/\s/g, "").length < 30) {
    throw new Error(
      "Could not extract readable text from this file. If it's a scanned PDF, try a text-based export."
    );
  }
  // Cap what we send to the model — resumes are short; this guards against
  // pathological inputs running up token cost.
  return normalized.slice(0, 40000);
}
