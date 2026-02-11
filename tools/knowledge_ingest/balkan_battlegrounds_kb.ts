/**
 * Balkan Battlegrounds Knowledge Base pipeline.
 *
 * Deterministic PDF extraction using Poppler tools when available,
 * with a pdfjs-dist + @napi-rs/canvas fallback for environments
 * without Poppler.
 *
 * Usage:
 *   npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode extract
 *   npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode extract --page-start 1 --page-end 20
 *   npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode canonicalize
 *   npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode all
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createCanvas } from "@napi-rs/canvas";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { buildIndexes, type MapCatalogEntry, type ProposedFact, type SourceRef } from "./bb_kb_lib";

type VolumeConfig = {
  volumeId: "BB1" | "BB2";
  pdfPath: string;
};

const VOLUMES: VolumeConfig[] = [
  { volumeId: "BB1", pdfPath: "docs/Balkan_BattlegroundsI.pdf" },
  { volumeId: "BB2", pdfPath: "docs/Balkan_BattlegroundsII.pdf" }
];

const OUTPUT_ROOT = resolve("data", "derived", "knowledge_base", "balkan_battlegrounds");
const PAGES_DIR = join(OUTPUT_ROOT, "pages");
const MAPS_DIR = join(OUTPUT_ROOT, "maps");
const INDEX_DIR = join(OUTPUT_ROOT, "index");

const MAP_LINE_REGEX = /\bmap\b|\bmaps\b|map\s+\d+|figure\s+\d+/i;
const CASUALTY_REGEX = /(\d{1,3}(?:,\d{3})+|\d+)\s+(killed|dead|wounded|casualties)/i;
const FORCE_REGEX = /(\d{1,3}(?:,\d{3})+|\d+)\s+(troops|soldiers|men|fighters|personnel)/i;

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function runCommand(command: string, args: string[], context: string): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    throw new Error(
      `Command failed (${context}): ${command} ${args.join(" ")}\n` +
        `Error: ${result.error.message}\n` +
        "Ensure Poppler tools are installed and on PATH."
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${context}): ${command} ${args.join(" ")}\n` +
        `Exit code: ${result.status}\n` +
        `stderr: ${result.stderr || "(none)"}`
    );
  }
  return result.stdout || "";
}

function isCommandAvailable(command: string): boolean {
  const result = spawnSync(command, ["-version"], { encoding: "utf8" });
  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    return false;
  }
  return true;
}

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).toString();

function getPageCount(pdfPath: string): number {
  const output = runCommand("pdfinfo", [pdfPath], "pdfinfo");
  const match = output.match(/Pages:\s+(\d+)/i);
  if (!match) {
    throw new Error(`Could not parse page count from pdfinfo output for ${pdfPath}`);
  }
  return Number(match[1]);
}

function extractPageTextPoppler(pdfPath: string, pageNumber: number, tmpPath: string): string {
  runCommand(
    "pdftotext",
    ["-enc", "UTF-8", "-layout", "-f", String(pageNumber), "-l", String(pageNumber), pdfPath, tmpPath],
    "pdftotext"
  );
  const raw = readFileSync(tmpPath, "utf8");
  rmSync(tmpPath, { force: true });
  return normalizeText(raw);
}

function renderPageImagePoppler(pdfPath: string, pageNumber: number, outPathBase: string): string {
  runCommand(
    "pdftoppm",
    ["-f", String(pageNumber), "-l", String(pageNumber), "-png", "-singlefile", pdfPath, outPathBase],
    "pdftoppm"
  );
  return `${outPathBase}.png`;
}

async function loadPdfDocument(pdfPath: string) {
  const wasmFallbackPath = require.resolve("pdfjs-dist/wasm/openjpeg_nowasm_fallback.js");
  const wasmUrl = new URL("./", pathToFileURL(wasmFallbackPath)).toString();
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = getDocument({ data, wasmUrl });
  return await loadingTask.promise;
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

async function extractPageTextPdfjs(doc: { getPage: (pageNumber: number) => Promise<any> }, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const lines = textItemsToLines(content.items as Array<{ str?: string; hasEOL?: boolean }>);
  return normalizeText(lines.join("\n"));
}

async function renderPageImagePdfjs(
  doc: { getPage: (pageNumber: number) => Promise<any> },
  pageNumber: number,
  outPathBase: string
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context as unknown as any, viewport }).promise;
  const outPath = `${outPathBase}.png`;
  writeFileSync(outPath, canvas.toBuffer("image/png"));
  return outPath;
}

function extractCaptionFromText(text: string): string | "unknown" {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (MAP_LINE_REGEX.test(line)) {
      return line;
    }
  }
  return "unknown";
}

function buildMapEntry(
  volumeId: string,
  pageNumber: number,
  imagePath: string,
  caption: string | "unknown"
): MapCatalogEntry {
  const sources: SourceRef[] = [
    {
      volume_id: volumeId,
      page_number: pageNumber,
      evidence_span: caption === "unknown" ? "unknown" : caption,
      block_type: "map_caption"
    }
  ];
  return {
    map_id: `map_${volumeId}_p${String(pageNumber).padStart(4, "0")}`,
    volume_id: volumeId,
    page_number: pageNumber,
    caption,
    image_path: imagePath,
    sources
  };
}

function buildProposedFacts(volumeId: string, pageNumber: number, text: string): ProposedFact[] {
  const facts: ProposedFact[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const casualtyMatch = line.match(CASUALTY_REGEX);
    if (casualtyMatch) {
      const value = Number(casualtyMatch[1].replace(/,/g, ""));
      facts.push({
        fact_id: `fact_${volumeId}_p${String(pageNumber).padStart(4, "0")}_casualty_${facts.length}`,
        fact_type: "casualties",
        subject_id: "unknown",
        object_id: "unknown",
        value: isNaN(value) ? casualtyMatch[1] : value,
        unit: casualtyMatch[2].toLowerCase(),
        date: "unknown",
        date_precision: "unknown",
        sources: [
          {
            volume_id: volumeId,
            page_number: pageNumber,
            evidence_span: line,
            block_type: "narrative"
          }
        ],
        quote: line,
        confidence: "low",
        notes: "Auto-extracted candidate; requires review."
      });
    }

    const forceMatch = line.match(FORCE_REGEX);
    if (forceMatch) {
      const value = Number(forceMatch[1].replace(/,/g, ""));
      facts.push({
        fact_id: `fact_${volumeId}_p${String(pageNumber).padStart(4, "0")}_force_${facts.length}`,
        fact_type: "force_size",
        subject_id: "unknown",
        object_id: "unknown",
        value: isNaN(value) ? forceMatch[1] : value,
        unit: forceMatch[2].toLowerCase(),
        date: "unknown",
        date_precision: "unknown",
        sources: [
          {
            volume_id: volumeId,
            page_number: pageNumber,
            evidence_span: line,
            block_type: "narrative"
          }
        ],
        quote: line,
        confidence: "low",
        notes: "Auto-extracted candidate; requires review."
      });
    }
  }

  return facts;
}

function writeJson(path: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(path, content, "utf8");
}

function parseArgs(argv: string[]): { mode: "extract" | "canonicalize" | "all"; pageStart?: number; pageEnd?: number } {
  const modeIndex = argv.indexOf("--mode");
  const modeValue = modeIndex >= 0 ? argv[modeIndex + 1] : "all";
  const mode = modeValue === "extract" || modeValue === "canonicalize" || modeValue === "all" ? modeValue : "all";

  const pageStartIndex = argv.indexOf("--page-start");
  const pageEndIndex = argv.indexOf("--page-end");
  const pageStart = pageStartIndex >= 0 ? Number(argv[pageStartIndex + 1]) : undefined;
  const pageEnd = pageEndIndex >= 0 ? Number(argv[pageEndIndex + 1]) : undefined;

  return { mode, pageStart, pageEnd };
}

async function extractAllPages(
  pageStart?: number,
  pageEnd?: number
): Promise<{ mapCatalog: MapCatalogEntry[]; proposedFacts: ProposedFact[] }> {
  ensureDir(OUTPUT_ROOT);
  ensureDir(PAGES_DIR);
  ensureDir(MAPS_DIR);

  const mapCatalog: MapCatalogEntry[] = [];
  const proposedFacts: ProposedFact[] = [];
  const popplerAvailable =
    isCommandAvailable("pdfinfo") && isCommandAvailable("pdftotext") && isCommandAvailable("pdftoppm");

  for (const volume of VOLUMES) {
    const pdfPath = resolve(volume.pdfPath);
    if (!existsSync(pdfPath)) {
      throw new Error(`Missing PDF: ${pdfPath}`);
    }

    const doc = popplerAvailable ? null : await loadPdfDocument(pdfPath);
    const totalPages = popplerAvailable ? getPageCount(pdfPath) : doc?.numPages ?? 0;
    const start = pageStart && pageStart > 0 ? pageStart : 1;
    const end = pageEnd && pageEnd > 0 ? Math.min(pageEnd, totalPages) : totalPages;

    for (let page = start; page <= end; page += 1) {
      const pageStr = String(page).padStart(4, "0");
      const tmpTextPath = join(OUTPUT_ROOT, `tmp_${volume.volumeId}_p${pageStr}.txt`);
      const rawText = popplerAvailable
        ? extractPageTextPoppler(pdfPath, page, tmpTextPath)
        : await extractPageTextPdfjs(doc as { getPage: (pageNumber: number) => Promise<any> }, page);
      const cleanText = rawText;

      const pageJson = {
        volume_id: volume.volumeId,
        page_number: page,
        raw_text: rawText,
        clean_text: cleanText,
        ocr_applied: false,
        text_hash: hashText(rawText),
        clean_text_hash: hashText(cleanText),
        layout_blocks: [],
        tables: [],
        figures: [],
        map_regions: [],
        notes: []
      };

      writeJson(join(PAGES_DIR, `${volume.volumeId}_p${pageStr}.json`), pageJson);

      const caption = extractCaptionFromText(rawText);
      if (caption !== "unknown") {
        const imageBase = join(MAPS_DIR, `${volume.volumeId}_p${pageStr}`);
        const imagePath = popplerAvailable
          ? renderPageImagePoppler(pdfPath, page, imageBase)
          : await renderPageImagePdfjs(doc as { getPage: (pageNumber: number) => Promise<any> }, page, imageBase);
        mapCatalog.push(buildMapEntry(volume.volumeId, page, imagePath, caption));
      }

      proposedFacts.push(...buildProposedFacts(volume.volumeId, page, rawText));
    }
  }

  const sortedMapCatalog = mapCatalog.sort((a, b) => {
    if (a.volume_id !== b.volume_id) return a.volume_id.localeCompare(b.volume_id);
    return a.page_number - b.page_number;
  });
  const sortedProposedFacts = proposedFacts.sort((a, b) => a.fact_id.localeCompare(b.fact_id));

  return { mapCatalog: sortedMapCatalog, proposedFacts: sortedProposedFacts };
}

function canonicalize(mapCatalog: MapCatalogEntry[], proposedFacts: ProposedFact[]): void {
  const entities: unknown[] = [];
  const events: unknown[] = [];
  const relationships: unknown[] = [];
  const facts: unknown[] = [];

  ensureDir(INDEX_DIR);
  writeJson(join(OUTPUT_ROOT, "map_catalog.json"), mapCatalog);
  writeJson(join(OUTPUT_ROOT, "facts_proposed.json"), proposedFacts);
  writeJson(join(OUTPUT_ROOT, "entities.json"), entities);
  writeJson(join(OUTPUT_ROOT, "events.json"), events);
  writeJson(join(OUTPUT_ROOT, "relationships.json"), relationships);
  writeJson(join(OUTPUT_ROOT, "facts.json"), facts);

  const indexes = buildIndexes({
    locations: [],
    units: [],
    events: [],
    facts: [],
    maps: mapCatalog
  });

  writeJson(join(INDEX_DIR, "facets.json"), indexes.facets);
  writeJson(join(INDEX_DIR, "timeline.json"), indexes.timeline);
  writeJson(join(INDEX_DIR, "geography.json"), indexes.geography);
  writeJson(join(INDEX_DIR, "map_index.json"), indexes.map_index);
  writeJson(join(INDEX_DIR, "alias_index.json"), indexes.alias_index);
}

function readMistakesLog(): string[] {
  const logPath = resolve("docs", "ASSISTANT_MISTAKES.log");
  if (!existsSync(logPath)) return [];
  try {
    return readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const { mode, pageStart, pageEnd } = parseArgs(process.argv.slice(2));

  const mistakes = readMistakesLog();
  if (mistakes.length === 0) {
    console.warn("Warning: ASSISTANT_MISTAKES.log is empty or unreadable.");
  }

  if (mode === "extract") {
    const { mapCatalog, proposedFacts } = await extractAllPages(pageStart, pageEnd);
    writeJson(join(OUTPUT_ROOT, "map_catalog.json"), mapCatalog);
    writeJson(join(OUTPUT_ROOT, "facts_proposed.json"), proposedFacts);
    return;
  }

  if (mode === "canonicalize") {
    const mapCatalog = JSON.parse(readFileSync(join(OUTPUT_ROOT, "map_catalog.json"), "utf8")) as MapCatalogEntry[];
    const proposedFacts = JSON.parse(readFileSync(join(OUTPUT_ROOT, "facts_proposed.json"), "utf8")) as ProposedFact[];
    canonicalize(mapCatalog, proposedFacts);
    return;
  }

  const { mapCatalog, proposedFacts } = await extractAllPages(pageStart, pageEnd);
  canonicalize(mapCatalog, proposedFacts);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
