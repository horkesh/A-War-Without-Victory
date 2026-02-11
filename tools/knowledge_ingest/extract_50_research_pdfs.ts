/**
 * Extract text from all PDFs in docs/50_research for agent-readable knowledge base.
 * Uses pdfjs-dist (same pattern as balkan_battlegrounds_kb.ts). Output: docs/50_research/extracts/<basename>.txt
 *
 * Usage: npx tsx tools/knowledge_ingest/extract_50_research_pdfs.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const RESEARCH_DIR = resolve("docs", "50_research");
const EXTRACTS_DIR = join(RESEARCH_DIR, "extracts");

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function textItemsToLines(items: Array<{ str?: string; hasEOL?: boolean }>): string[] {
  const lines: string[] = [];
  let current = "";
  for (const item of items) {
    const text = item.str ?? "";
    if (text) {
      current = current.length ? `${current} ${text}` : text;
    }
    if (item.hasEOL) {
      if (current.trim().length) lines.push(current.trim());
      current = "";
    }
  }
  if (current.trim().length) lines.push(current.trim());
  return lines;
}

async function extractPageText(
  doc: { getPage: (pageNumber: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> },
  pageNumber: number
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const lines = textItemsToLines(content.items as Array<{ str?: string; hasEOL?: boolean }>);
  return normalizeText(lines.join("\n"));
}

async function loadPdfDocument(pdfPath: string) {
  const require = createRequire(import.meta.url);
  const wasmFallbackPath = require.resolve("pdfjs-dist/wasm/openjpeg_nowasm_fallback.js");
  const wasmUrl = new URL("./", pathToFileURL(wasmFallbackPath)).toString();
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = getDocument({ data, wasmUrl });
  return await loadingTask.promise;
}

function safeBasename(pdfPath: string): string {
  const base = pdfPath.replace(/\.pdf$/i, "");
  return base.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "_") || "extract";
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).toString();

  if (!existsSync(RESEARCH_DIR)) {
    console.error("Missing docs/50_research directory");
    process.exit(1);
  }
  if (!existsSync(EXTRACTS_DIR)) {
    mkdirSync(EXTRACTS_DIR, { recursive: true });
  }

  const files = readdirSync(RESEARCH_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const sorted = [...files].sort();

  for (const file of sorted) {
    const pdfPath = join(RESEARCH_DIR, file);
    const outName = safeBasename(file) + ".txt";
    const outPath = join(EXTRACTS_DIR, outName);
    try {
      const doc = await loadPdfDocument(pdfPath);
      const numPages = doc.numPages;
      const pages: string[] = [];
      for (let p = 1; p <= numPages; p++) {
        const text = await extractPageText(doc, p);
        pages.push(`--- Page ${p} ---\n${text}`);
      }
      const full = `# Extracted from ${file} (${numPages} pages)\n\n${pages.join("\n\n")}`;
      writeFileSync(outPath, full, "utf8");
      console.log(`Wrote ${outName} (${numPages} pages)`);
    } catch (err) {
      console.error(`Failed ${file}:`, err);
    }
  }
}

main();
