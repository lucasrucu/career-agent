// The pdf-parse package's main entry runs a debug harness at import time that
// breaks in a server bundle, so we import the implementation submodule directly
// (see lib/resume-text.ts). @types/pdf-parse only types the main entry, so
// declare the submodule here.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}
