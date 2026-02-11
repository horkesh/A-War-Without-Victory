import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIST_ROOT = 'dist/warroom';

const COPY_FILES: Array<{ src: string; dest: string }> = [
  { src: 'data/derived/A1_BASE_MAP.geojson', dest: 'data/derived/A1_BASE_MAP.geojson' },
  { src: 'assets/raw_sora/crest_hrhb_v1_sora.png', dest: 'assets/raw_sora/crest_hrhb_v1_sora.png' },
  { src: 'assets/raw_sora/crest_rbih_v1_sora.png', dest: 'assets/raw_sora/crest_rbih_v1_sora.png' },
  { src: 'assets/raw_sora/crest_rs_v1_sora.png', dest: 'assets/raw_sora/crest_rs_v1_sora.png' },
  { src: 'assets/raw_sora/hq_background_mvp.png', dest: 'assets/raw_sora/hq_background_mvp.png' },
  { src: 'data/derived/political_control_data.json', dest: 'data/derived/political_control_data.json' },
  { src: 'data/derived/settlement_edges.json', dest: 'data/derived/settlement_edges.json' },
  { src: 'data/derived/settlements_a1_viewer.geojson', dest: 'data/derived/settlements_a1_viewer.geojson' },
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

function stageAssets(): void {
  for (const entry of COPY_FILES) {
    const srcAbs = resolve(entry.src);
    if (!existsSync(srcAbs)) {
      throw new Error(`Missing source file: ${entry.src}`);
    }
    const destAbs = resolve(DIST_ROOT, entry.dest);
    ensureDir(dirname(destAbs));
    copyFileSync(srcAbs, destAbs);
  }
  const dataToStage: Array<{ src: string; dest: string }> = [
    { src: 'data/derived/settlement_edges.json', dest: 'data/derived/settlement_edges.json' },
    { src: 'data/derived/A1_BASE_MAP.geojson', dest: 'data/derived/A1_BASE_MAP.geojson' },
    { src: 'data/derived/settlements_a1_viewer.geojson', dest: 'data/derived/settlements_a1_viewer.geojson' },
    { src: 'data/derived/control_zones_A1.geojson', dest: 'data/derived/control_zones_A1.geojson' },
    { src: 'data/derived/settlement_ethnicity_data.json', dest: 'data/derived/settlement_ethnicity_data.json' },
    { src: 'data/derived/settlement_names.json', dest: 'data/derived/settlement_names.json' },
    { src: 'data/derived/mun1990_names.json', dest: 'data/derived/mun1990_names.json' }
  ];

  for (const entry of dataToStage) {
    const src = resolve(entry.src);
    if (existsSync(src)) {
      const dest = resolve(WARROOM_PUBLIC_DIR, entry.dest);
      ensureDir(dirname(dest));
      copyFileSync(src, dest);
    }
  }
}

function main(): void {
  stageAssets();
}

main();
