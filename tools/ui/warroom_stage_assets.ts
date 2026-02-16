import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIST_ROOT = 'dist/warroom';

const COPY_FILES: Array<{ src: string; dest: string }> = [
  { src: 'data/derived/A1_BASE_MAP.geojson', dest: 'data/derived/A1_BASE_MAP.geojson' },
  { src: 'data/derived/control_zones_A1.geojson', dest: 'data/derived/control_zones_A1.geojson' },
  { src: 'data/derived/mun1990_names.json', dest: 'data/derived/mun1990_names.json' },
  { src: 'data/derived/municipalities_meta.json', dest: 'data/derived/municipalities_meta.json' },
  { src: 'data/derived/political_control_data.json', dest: 'data/derived/political_control_data.json' },
  { src: 'data/derived/settlement_edges.json', dest: 'data/derived/settlement_edges.json' },
  { src: 'data/derived/settlement_ethnicity_data.json', dest: 'data/derived/settlement_ethnicity_data.json' },
  { src: 'data/derived/settlement_names.json', dest: 'data/derived/settlement_names.json' },
  { src: 'data/derived/settlements_a1_viewer.geojson', dest: 'data/derived/settlements_a1_viewer.geojson' },
  { src: 'data/derived/settlements_meta.json', dest: 'data/derived/settlements_meta.json' },
  { src: 'data/source/settlements_initial_master.json', dest: 'data/source/settlements_initial_master.json' },
  { src: 'data/ui/hq_clickable_regions.json', dest: 'data/ui/hq_clickable_regions.json' }
].sort((a, b) => a.dest.localeCompare(b.dest));

/** Warroom public dir for dev server; settlement_edges.json staged here so /data/derived/settlement_edges.json is available at dev time. */
const WARROOM_PUBLIC_DIR = resolve(__dirname, '../../src/ui/warroom/public');

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function tryCopy(src: string, dest: string): void {
  try {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
  } catch (e) {
    // On Windows, file lock errors (EBUSY, EPERM, UNKNOWN) are common — warn but don't abort
    console.warn(`[warroom_stage_assets] copy failed (${(e as NodeJS.ErrnoException).code ?? 'unknown'}): ${src} -> ${dest}`);
  }
}

function stageAssets(): void {
  for (const entry of COPY_FILES) {
    const srcAbs = resolve(entry.src);
    if (!existsSync(srcAbs)) {
      console.warn(`[warroom_stage_assets] skipping missing source file: ${entry.src}`);
      continue;
    }
    const destAbs = resolve(DIST_ROOT, entry.dest);
    tryCopy(srcAbs, destAbs);
  }
  const dataToStage: Array<{ src: string; dest: string }> = [
    { src: 'data/derived/settlement_edges.json', dest: 'data/derived/settlement_edges.json' },
    { src: 'data/derived/A1_BASE_MAP.geojson', dest: 'data/derived/A1_BASE_MAP.geojson' },
    { src: 'data/derived/settlements_a1_viewer.geojson', dest: 'data/derived/settlements_a1_viewer.geojson' },
    { src: 'data/derived/control_zones_A1.geojson', dest: 'data/derived/control_zones_A1.geojson' },
    { src: 'data/derived/settlement_ethnicity_data.json', dest: 'data/derived/settlement_ethnicity_data.json' },
    { src: 'data/derived/settlement_names.json', dest: 'data/derived/settlement_names.json' },
    { src: 'data/derived/mun1990_names.json', dest: 'data/derived/mun1990_names.json' },
    { src: 'data/derived/settlements_meta.json', dest: 'data/derived/settlements_meta.json' },
    { src: 'data/derived/municipalities_meta.json', dest: 'data/derived/municipalities_meta.json' },
    { src: 'data/derived/political_control_data.json', dest: 'data/derived/political_control_data.json' }
  ];

  for (const entry of dataToStage) {
    const src = resolve(entry.src);
    if (existsSync(src)) {
      const dest = resolve(WARROOM_PUBLIC_DIR, entry.dest);
      tryCopy(src, dest);
    }
  }
}

function main(): void {
  stageAssets();
}

main();
