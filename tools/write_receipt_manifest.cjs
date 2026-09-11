#!/usr/bin/env node
/**
 * Write a MANIFEST.txt describing a bulk receipt directory, so the evidence stays CITABLE
 * without entering git.
 *
 * The problem this solves: the governing docs cite run directories as evidence, and some of them
 * are enormous — `logs/r7-english-readability/` alone is 5.4 GB of replay sequences, and one
 * cited tree carries a bundled `electron.exe`. That bulk must never be committed. But a citation
 * whose target exists only on one machine is not a receipt; it is a claim.
 *
 * The manifest is the compromise: a small, tracked, deterministic record of exactly what the
 * directory held — every file and its size — so a reader can see the shape of the evidence, and
 * `validate_receipt_citations.cjs --strict` can confirm the citation resolves to something that
 * survives a fresh clone. It is not the evidence. It is proof of what the evidence was.
 *
 * Usage:
 *   node tools/write_receipt_manifest.cjs logs/bc06/live-decorate-final-01 [more dirs...]
 *   node tools/write_receipt_manifest.cjs --check <dir>   exit 1 if the manifest is missing or stale
 *
 * Deterministic by construction: entries are sorted byte-wise, sizes come from the filesystem,
 * and NOTHING records a timestamp — a manifest regenerated from an unchanged directory is
 * byte-identical, so it never produces a spurious diff.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_NAME = 'MANIFEST.txt';

/** Byte-wise ordering. `.localeCompare` is banned repo-wide: it is locale-dependent. */
function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * A subtree larger than this is summarised as one line instead of enumerated.
 *
 * Without it the manifest stops being a receipt. `logs/r8-decision-command-usability/` holds a
 * materialised dependency tree — 18,076 files including a 217 MB `electron.exe` — and listing it
 * produced a 1.6 MB file of vendored paths that tells a reader nothing. Collapsing keeps the
 * SHAPE of the evidence (what directories existed, how big they were) and drops the noise. The
 * threshold is high enough that a genuine receipt directory, such as a 96-shot capture run, is
 * still enumerated in full.
 */
const COLLAPSE_ABOVE = 500;

/** Files and total bytes beneath `absDir`, following the same exclusions as the listing. */
function subtreeStats(absDir) {
  let files = 0;
  let bytes = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(child);
      } else if (entry.isFile()) {
        files += 1;
        try {
          bytes += fs.statSync(child).size;
        } catch (error) {
          /* unreadable entries count as zero bytes rather than aborting the manifest */
        }
      }
    }
  };
  walk(absDir);
  return { files, bytes };
}

/**
 * Every file under `absDir` as {relative, size}, sorted, excluding the manifest itself.
 * A directory whose subtree exceeds COLLAPSE_ABOVE files becomes a single row with
 * `collapsed` set, carrying the subtree's file count and total size.
 */
function listFiles(absDir) {
  const rows = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries.slice().sort((a, b) => strictCompare(a.name, b.name))) {
      const child = path.join(current, entry.name);
      const relative = path.relative(absDir, child).split(path.sep).join('/');
      if (entry.isDirectory()) {
        const stats = subtreeStats(child);
        if (stats.files > COLLAPSE_ABOVE) {
          rows.push({ relative: `${relative}/`, size: stats.bytes, collapsed: stats.files });
        } else {
          walk(child);
        }
      } else if (entry.isFile()) {
        if (relative === MANIFEST_NAME) continue;
        let size = 0;
        try {
          size = fs.statSync(child).size;
        } catch (error) {
          size = 0;
        }
        rows.push({ relative, size, collapsed: 0 });
      }
    }
  };
  walk(absDir);
  return rows.sort((a, b) => strictCompare(a.relative, b.relative));
}

/** The manifest text for a directory. Pure function of the directory's contents. */
function renderManifest(relDir, rows) {
  const total = rows.reduce((sum, row) => sum + row.size, 0);
  // A collapsed row stands for a whole subtree, so the header counts what was THERE, not rows.
  const fileCount = rows.reduce((sum, row) => sum + (row.collapsed > 0 ? row.collapsed : 1), 0);
  const width = String(Math.max(0, ...rows.map((row) => row.size))).length;
  const lines = [
    `# Receipt manifest for ${relDir}`,
    '#',
    '# The evidence itself is NOT tracked: it is too large to commit, and committing it would',
    '# bloat every clone for the benefit of one citation. This file is the tracked record of',
    '# what was there — the file list and sizes, nothing else. It proves the shape of the',
    '# evidence, not its contents.',
    '#',
    '# Regenerate with: node tools/write_receipt_manifest.cjs ' + relDir,
    '# Deterministic: sorted, no timestamps. An unchanged directory yields an identical file.',
    '#',
    `# ${fileCount} file(s), ${total} bytes`,
    '',
  ];
  for (const row of rows) {
    const suffix = row.collapsed > 0 ? `  (${row.collapsed} files, collapsed)` : '';
    lines.push(`${String(row.size).padStart(width)}  ${row.relative}${suffix}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * The relative paths a manifest records. Comment lines and blanks are skipped; a row is
 * `<size>  <relative>` with an optional `  (N files, collapsed)` suffix on directory rows.
 */
function parseManifest(text) {
  const rows = [];
  for (const line of String(text).split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const match = /^\s*\d+\s\s(.+?)(?:\s\s\(\d+ files, collapsed\))?\s*$/.exec(line);
    if (match) rows.push(match[1]);
  }
  return rows;
}

/** Is `relative` recorded by this manifest, directly or inside a collapsed directory row? */
function coveredBy(listed, relative) {
  for (const entry of listed) {
    if (entry === relative) return true;
    if (entry.endsWith('/') && relative.startsWith(entry)) return true;
  }
  return false;
}

function manifestFor(relDir, repoRoot = REPO_ROOT) {
  const absDir = path.join(repoRoot, relDir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    throw new Error(`${relDir} is not a directory`);
  }
  return renderManifest(relDir, listFiles(absDir));
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const dirs = args.filter((arg) => !arg.startsWith('--'));

  if (dirs.length === 0) {
    console.error('usage: node tools/write_receipt_manifest.cjs [--check] <dir> [more dirs...]');
    process.exit(2);
  }

  let stale = 0;
  for (const relDir of dirs.slice().sort(strictCompare)) {
    const clean = relDir.replace(/\/+$/, '');
    let text;
    try {
      text = manifestFor(clean);
    } catch (error) {
      console.error(`manifest: ${error.message}`);
      process.exit(1);
    }
    const target = path.join(REPO_ROOT, clean, MANIFEST_NAME);

    if (check) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
      if (current === null) {
        console.error(`manifest: ${clean}/${MANIFEST_NAME} is missing`);
        stale += 1;
        continue;
      }

      // THE CHECK IS A SUPERSET RULE, NOT EQUALITY, and getting this wrong twice is instructive.
      //
      // What travels is a deliberate SUBSET: small text receipts are tracked, the heavy binaries
      // are not. So `logs/bc06/live-decorate-final-01` holds 96 files here and 71 in a fresh
      // clone. Regenerating and comparing byte-for-byte therefore fails everywhere except the
      // machine that wrote it — which is what shipped on 2026-09-11 and what CI caught.
      //
      // The first fix assumed the opposite extreme: that a clone sees NOTHING but the manifest.
      // Also wrong, for the same reason — the truth is partial, not absent, and an assumption of
      // either extreme is an assumption rather than a measurement.
      //
      // What holds in BOTH: every file visible here must appear in the manifest. Fewer files than
      // the manifest lists is expected. MORE is a stale manifest — evidence was added and nobody
      // regenerated it.
      const listed = parseManifest(current);
      const visible = listFiles(path.join(REPO_ROOT, clean)).map((row) => row.relative);
      const unlisted = visible.filter((rel) => !coveredBy(listed, rel)).sort(strictCompare);

      if (unlisted.length > 0) {
        console.error(`manifest: ${clean}/${MANIFEST_NAME} is stale — ${unlisted.length} file(s) present but not listed:`);
        for (const rel of unlisted.slice(0, 8)) console.error(`    ${rel}`);
        stale += 1;
      } else {
        console.log(`manifest: ${clean} — ${visible.length} visible file(s), all listed`);
      }
      continue;
    }

    fs.writeFileSync(target, text);
    // Report the header's own count: with collapsing, rows != files, and the row count would
    // understate the evidence by an order of magnitude.
    const header = text.split('\n').find((line) => line.startsWith('# ') && line.includes('file(s)'));
    console.log(`manifest: ${clean}/${MANIFEST_NAME} — ${(header || '').replace(/^# /, '')}`);
  }

  process.exit(stale > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = {
  listFiles, renderManifest, manifestFor, subtreeStats, strictCompare,
  parseManifest, coveredBy,
  MANIFEST_NAME, COLLAPSE_ABOVE,
};
