#!/usr/bin/env node
/**
 * Derive the per-plate surface-luminance table for the warroom overlays.
 *
 * WHY THIS EXISTS. Neither surface is the colour the overlay assumed. The whiteboard is a dim warm
 * mid-tone, the corkboard is warm brown, and both differ by faction AND by year — the HQs get
 * visibly darker as the war grinds on, which is deliberate art direction. Design §4.4 and §5 of
 * `docs/plans/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md` require both
 * overlays to be derived from a committed per-plate table rather than from hard-coded branches in
 * the component, so that when the art is regenerated the overlays follow it.
 *
 * MEASURED SPREADS, which are the argument for the whole approach:
 *   board  L*24.5 (HRHB 1995) .. L*69.8 (RBiH 1995)  — 45 points
 *   cork   L*20.4 (HRHB 1995) .. L*63.6 (RS 1991)    — 43 points
 *
 * Note RS 1991-93, where the cork is BRIGHTER than that faction's own whiteboard. The two surfaces
 * do not track each other, so one table with two entries is the minimum that can be correct.
 *
 * WHAT IT MEASURES. For each faction x year plate, each surface's region is cropped and every
 * pixel converted to CIE L* (0 = black, 100 = white). The table records the MEDIAN.
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
 *   The cork figures sit a little above design §1.4's own sampling, which reported MEAN 0-255
 *   channel values rather than median L*. RBiH 1993 reads 28.1 here against a figure of 58/255
 *   there (~L*24), RS 1991 reads 63.6 against 146/255 (~L*60). Different statistic, same surface,
 *   same conclusion.
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

/**
 * The two surfaces the overlays sit on, and the key each is published under.
 *
 * `board` is the whiteboard the date is written on. `cork` is the corkboard the staff map sheet is
 * pinned to — added for the map overlay, which has exactly the same problem the date had and for
 * exactly the same reason: design §1.4 measured the room's light varying by a factor of three to
 * four across the campaign while both overlays rendered at constant brightness. A cream sheet on
 * cork that dark cannot look attached to anything, and that mismatch IS the "tacked on" reading.
 */
const SURFACES = [
  ['board', 'wall_calendar_area'],
  ['cork', 'desk_map'],
];

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

/** One named region for one faction, in the regions file's own coordinate space. */
function surfaceRegion(factionStem, regionId, repoRoot = REPO_ROOT) {
  const regions = JSON.parse(fs.readFileSync(path.join(repoRoot, regionsPath(factionStem)), 'utf8'));
  const region = (regions.regions ?? []).find((entry) => entry.id === regionId);
  if (!region) throw new Error(`${regionsPath(factionStem)}: no region \`${regionId}\``);
  return { bounds: region.bounds, declared: regions.image_dimensions };
}

async function measurePlate(factionStem, year, regionId, repoRoot = REPO_ROOT) {
  const { bounds, declared } = surfaceRegion(factionStem, regionId, repoRoot);
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

/**
 * The painted extent of the corkboard, grown outward from the authored hotspot rectangle.
 *
 * WHY THIS IS MEASURED AND NOT TAKEN FROM THE REGIONS FILE. `desk_map` is a CLICK TARGET, and the
 * three factions' rectangles were authored to different standards: RBiH's hugs the cork almost
 * exactly, while HRHB's sits well inside its board with a wide unclaimed band all round. Sizing
 * the map sheet from the hotspot therefore produced a sheet that filled the RBiH board and floated
 * small on the HRHB one — the same overlay, the same percentage inset, a visibly different result.
 *
 * The cork is a large, flat, evenly-coloured area bounded by a frame of quite different colour, so
 * its real extent is recoverable: take the hotspot's median colour as the reference, then walk each
 * edge outward while the next row or column still matches, and stop at the frame.
 *
 * Returned as FRACTIONS of the plate, because that is how the overlay is positioned.
 */
function corkExtent(factionStem, year, repoRoot = REPO_ROOT) {
  return measureExtent(factionStem, year, 'desk_map', repoRoot);
}

async function measureExtent(factionStem, year, regionId, repoRoot = REPO_ROOT) {
  const { bounds, declared } = surfaceRegion(factionStem, regionId, repoRoot);
  const image = sharp(path.join(repoRoot, platePath(factionStem, year)));
  const meta = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  const scaleX = meta.width / declared.width;
  const scaleY = meta.height / declared.height;
  let left = Math.round(bounds.x * scaleX);
  let top = Math.round(bounds.y * scaleY);
  let right = left + Math.round(bounds.width * scaleX);
  let bottom = top + Math.round(bounds.height * scaleY);

  const at = (x, y) => {
    const i = (y * info.width + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // Reference colour: the median of the hotspot interior, which is cork by construction.
  const sample = [];
  for (let y = top; y < bottom; y += 4) for (let x = left; x < right; x += 4) sample.push(at(x, y));
  const refR = median(sample.map((p) => p[0]));
  const refG = median(sample.map((p) => p[1]));
  const refB = median(sample.map((p) => p[2]));

  // Generous enough to ride over cork's fibre and the room's light gradient, tight enough to stop
  // at a frame. Verified by drawing the result back onto each plate.
  const TOLERANCE = 42;
  const matches = (x, y) => {
    const [r, g, b] = at(x, y);
    return Math.hypot(r - refR, g - refG, b - refB) <= TOLERANCE;
  };

  // A line matches if most of its middle matches; a few stray pixels should not stop the walk.
  const lineMatches = (fixed, from, to, vertical) => {
    let hit = 0;
    let total = 0;
    const a = Math.round(from + (to - from) * 0.2);
    const z = Math.round(from + (to - from) * 0.8);
    for (let v = a; v < z; v += 2) {
      total += 1;
      if (vertical ? matches(fixed, v) : matches(v, fixed)) hit += 1;
    }
    return total > 0 && hit / total >= 0.75;
  };

  const LIMIT = 400;
  for (let step = 0; step < LIMIT && left > 1; step += 1) {
    if (!lineMatches(left - 1, top, bottom, true)) break;
    left -= 1;
  }
  for (let step = 0; step < LIMIT && right < info.width - 1; step += 1) {
    if (!lineMatches(right + 1, top, bottom, true)) break;
    right += 1;
  }
  for (let step = 0; step < LIMIT && top > 1; step += 1) {
    if (!lineMatches(top - 1, left, right, false)) break;
    top -= 1;
  }
  for (let step = 0; step < LIMIT && bottom < info.height - 1; step += 1) {
    if (!lineMatches(bottom + 1, left, right, false)) break;
    bottom += 1;
  }

  const round = (value) => Math.round(value * 100000) / 100000;
  return {
    left: round(left / info.width),
    top: round(top / info.height),
    width: round((right - left) / info.width),
    height: round((bottom - top) / info.height),
  };
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
  const surfaces = {};
  const regions = {};
  for (const [key, regionId] of SURFACES) {
    regions[key] = regionId;
    surfaces[key] = {};
    for (const [faction, stem] of [...FACTIONS].sort((a, b) => strictCompare(a[0], b[0]))) {
      surfaces[key][faction] = {};
      for (const year of YEARS) {
        surfaces[key][faction][String(year)] = await measurePlate(stem, year, regionId, repoRoot);
      }
    }
  }

  // Cork extent per faction: the median of each edge across the five years, so one oddly-lit plate
  // cannot move the box on its own.
  const corkBoxes = {};
  for (const [faction, stem] of [...FACTIONS].sort((a, b) => strictCompare(a[0], b[0]))) {
    const perYear = [];
    for (const year of YEARS) perYear.push(await corkExtent(stem, year));
    corkBoxes[faction] = {
      left: Math.round(median(perYear.map((b) => b.left)) * 100000) / 100000,
      top: Math.round(median(perYear.map((b) => b.top)) * 100000) / 100000,
      width: Math.round(median(perYear.map((b) => b.width)) * 100000) / 100000,
      height: Math.round(median(perYear.map((b) => b.height)) * 100000) / 100000,
    };
  }

  return {
    $comment: [
      'GENERATED by tools/derive_warroom_board_luminance.cjs. Do not edit by hand.',
      'Median CIE L* (0-100) of each overlay surface in each warroom scene plate.',
      '`boards` is the whiteboard (wall_calendar_area); `cork` is the corkboard (desk_map).',
      'Regenerate whenever the plate art changes; `--check` fails if this file is stale.',
    ],
    regions,
    metric: 'median CIE L* of region pixels, D65',
    source_digest: sourceDigest(repoRoot),
    // `boards` keeps its original name: the marker-ink module already reads it, and renaming a
    // published key to gain symmetry would be churn with no reader asking for it.
    boards: surfaces.board,
    cork: surfaces.cork,
    cork_box: corkBoxes,
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
      flat.push(`${faction} ${year}: board L*${table.boards[faction][year].toFixed(1)}`
        + `  cork L*${table.cork[faction][year].toFixed(1)}`);
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

module.exports = { lstar, median, buildTable, serialise, sourceDigest, FACTIONS, YEARS, OUT, SURFACES };
