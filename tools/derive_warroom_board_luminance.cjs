#!/usr/bin/env node
/**
 * Derive the per-plate whiteboard luminance table for the warroom overlays.
 *
 * WHY THIS EXISTS. The whiteboard is not white. It is a dim warm mid-tone that differs by
 * faction and by year, and an ink colour that reads correctly on one plate is invisible on
 * another. Design §4.4 of
 * `docs/plans/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md` requires the ink
 * to be derived from a committed per-plate luminance table rather than from hard-coded branches
 * in the component, so that when the art is regenerated the overlay follows it.
 *
 * WHAT IT MEASURES. For each faction x year plate, the `wall_calendar_area` region is cropped and
 * every pixel converted to CIE L* (0 = black, 100 = white). The table records the MEDIAN.
 *
 *   Median, not mean, because the region is a hand-drawn rectangle over painted art and may clip
 *   a little wall or frame at the edges. A median ignores a minority of outliers; a mean does not.
 *
 *   The whole region, not a centre inset. Design §10 flagged that `wall_calendar_area` might
 *   overrun the board's right edge on RBiH. Measured, it does not: the 1993 column profile falls
 *   53 -> 46 L* smoothly across the region with no cliff, and a middle-60% inset moves the median
 *   by at most 0.6 L* (RBiH 48.8 -> 49.4, HRHB 41.3 -> 41.2). An inset would be a tunable
 *   parameter buying nothing, so there is no inset.
 *
 * COORDINATE SPACE. Region bounds are expressed against `image_dimensions` in the regions JSON
 * (2752x1536). Not every plate is exactly that: `hq_rbih_1993.webp` is 2750x1536. Bounds are
 * therefore scaled by actual/declared per plate rather than trusting the declaration.
 *
 * DETERMINISM. No wall clock, no RNG, sorted keys, fixed rounding. Running this twice on
 * unchanged art produces byte-identical output, which `--check` asserts.
 *
 * Usage:
 *   node tools/derive_warroom_board_luminance.cjs            write the table
 *   node tools/derive_warroom_board_luminance.cjs --check    exit 1 if the committed file is stale
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const REPO_ROOT = path.resolve(__dirname, '..');
const ASSET_DIR = 'src/ui/warroom/assets';
const OUT = `${ASSET_DIR}/warroom_board_luminance.json`;
const REGION_ID = 'wall_calendar_area';

/** Canonical faction ids, and the regions-file stem each uses. */
const FACTIONS = [
  ['HRHB', 'hrhb'],
  ['RBiH', 'rbih'],
  ['RS', 'rs'],
];
const YEARS = [1991, 1992, 1993, 1994, 1995];

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** sRGB 0-255 channel to linear-light 0-1. */
function srgbToLinear(channel) {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** CIE L* (0-100) for an sRGB triple, relative to D65 white. */
function lstar(r, g, b) {
  const y = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  const f = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  return 116 * f - 16;
}

function median(values) {
  // Numeric sort. The default Array#sort is lexicographic, which would order 10 before 9.
  const sorted = Float64Array.from(values).sort();
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function platePath(factionStem, year) {
  return `${ASSET_DIR}/hq_${factionStem}_${year}.webp`;
}

function regionsPath(factionStem) {
  return `${ASSET_DIR}/hq_${factionStem}_regions.json`;
}

/** The board region for one faction, in the regions file's own coordinate space. */
function boardRegion(factionStem, repoRoot = REPO_ROOT) {
  const regions = JSON.parse(fs.readFileSync(path.join(repoRoot, regionsPath(factionStem)), 'utf8'));
  const region = (regions.regions ?? []).find((entry) => entry.id === REGION_ID);
  if (!region) throw new Error(`${regionsPath(factionStem)}: no region \`${REGION_ID}\``);
  return { bounds: region.bounds, declared: regions.image_dimensions };
}

async function measurePlate(factionStem, year, repoRoot = REPO_ROOT) {
  const { bounds, declared } = boardRegion(factionStem, repoRoot);
  const file = path.join(repoRoot, platePath(factionStem, year));
  const image = sharp(file);
  const meta = await image.metadata();

  const scaleX = meta.width / declared.width;
  const scaleY = meta.height / declared.height;
  const extract = {
    left: Math.round(bounds.x * scaleX),
    top: Math.round(bounds.y * scaleY),
    width: Math.round(bounds.width * scaleX),
    height: Math.round(bounds.height * scaleY),
  };

  const { data, info } = await image.extract(extract).raw().toBuffer({ resolveWithObject: true });
  const samples = new Float64Array(info.width * info.height);
  for (let i = 0, s = 0; s < samples.length; i += info.channels, s += 1) {
    samples[s] = lstar(data[i], data[i + 1], data[i + 2]);
  }

  // One decimal. The plates are painted art, not instruments; further precision would imply a
  // repeatability the source does not have, and would churn the file on every art re-export.
  return Math.round(median(samples) * 10) / 10;
}

function sha256(file, repoRoot = REPO_ROOT) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, file))).digest('hex');
}

/**
 * A digest over every input this table is derived from.
 *
 * The point is the cheap staleness check: a test can confirm the table still matches the art in
 * milliseconds by hashing files, without decoding fifteen webps. Full regeneration stays in
 * `--check`.
 */
function sourceDigest(repoRoot = REPO_ROOT) {
  const files = [];
  for (const [, stem] of FACTIONS) {
    files.push(regionsPath(stem));
    for (const year of YEARS) files.push(platePath(stem, year));
  }
  files.sort(strictCompare);
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(`${file}:${sha256(file, repoRoot)}\n`);
  return hash.digest('hex');
}

async function buildTable(repoRoot = REPO_ROOT) {
  const boards = {};
  for (const [faction, stem] of [...FACTIONS].sort((a, b) => strictCompare(a[0], b[0]))) {
    boards[faction] = {};
    for (const year of YEARS) {
      boards[faction][String(year)] = await measurePlate(stem, year, repoRoot);
    }
  }

  return {
    $comment: [
      'GENERATED by tools/derive_warroom_board_luminance.cjs. Do not edit by hand.',
      'Median CIE L* (0-100) of the wall_calendar_area region of each warroom scene plate.',
      'Regenerate whenever the plate art changes; `--check` fails if this file is stale.',
    ],
    region: REGION_ID,
    metric: 'median CIE L* of region pixels, D65',
    source_digest: sourceDigest(repoRoot),
    boards,
  };
}

function serialise(table) {
  return `${JSON.stringify(table, null, 2)}\n`;
}

async function main() {
  const check = process.argv.slice(2).includes('--check');
  const table = await buildTable();
  const text = serialise(table);
  const outPath = path.join(REPO_ROOT, OUT);

  if (check) {
    const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (current !== text) {
      console.error(`${OUT} is STALE — regenerate with: node tools/derive_warroom_board_luminance.cjs`);
      process.exit(1);
    }
    console.log(`${OUT}: up to date (15 plates)`);
    process.exit(0);
  }

  fs.writeFileSync(outPath, text);
  const flat = [];
  for (const faction of Object.keys(table.boards)) {
    for (const year of Object.keys(table.boards[faction])) {
      flat.push(`${faction} ${year}: L*${table.boards[faction][year].toFixed(1)}`);
    }
  }
  console.log(`wrote ${OUT}`);
  for (const line of flat) console.log(`  ${line}`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { lstar, median, buildTable, serialise, sourceDigest, FACTIONS, YEARS, OUT, REGION_ID };
