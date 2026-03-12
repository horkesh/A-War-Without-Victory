/**
 * Resize warroom scene plates to the canonical 2752×1536 contract and emit display-size (1376×768) for runtime.
 *
 * Use when new assets (e.g. hq_rbih_*.png) are too large (dimensions or file size).
 * - Full size: 2752×1536 (fit + letterbox), for authoring and region JSON.
 * - Display size: 1376×768 (_display.png), for game runtime to avoid large decode/canvas memory.
 *
 * See docs/40_reports/handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md §2.1, §6.4.
 *
 * Usage:
 *   npx tsx tools/ui/warroom_resize_assets.ts [options] [files...]
 *   npx tsx tools/ui/warroom_resize_assets.ts                    # all hq_rbih_*.png in assets
 *   npx tsx tools/ui/warroom_resize_assets.ts --dry-run
 *   npx tsx tools/ui/warroom_resize_assets.ts --no-display       # skip _display.png output
 */

import { readdirSync, statSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

const TARGET_WIDTH = 2752;
const TARGET_HEIGHT = 1536;
/** Half-res for runtime: same aspect ratio, ~4× less memory and decode cost. */
const DISPLAY_WIDTH = 1376;
const DISPLAY_HEIGHT = 768;
const ASSETS_DIR = resolve(process.cwd(), 'src/ui/warroom/assets');
const DEFAULT_GLOB = 'hq_rbih_';

async function resizeWithSharp(
  inputPath: string,
  dryRun: boolean,
  emitDisplay: boolean
): Promise<{ ok: boolean; error?: string; before?: string; after?: string }> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(inputPath).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const alreadyExact = w === TARGET_WIDTH && h === TARGET_HEIGHT;
    if (dryRun) {
      const displayNote = emitDisplay ? ' + display 1376×768' : '';
      return {
        ok: true,
        before: `${w}×${h}`,
        after: alreadyExact ? `unchanged (exact)${displayNote}` : `${TARGET_WIDTH}×${TARGET_HEIGHT} (would write)${displayNote}`,
      };
    }
    if (!alreadyExact) {
      const dir = dirname(inputPath);
      const name = basename(inputPath, '.png');
      const tmpPath = join(dir, `.tmp_${name}.png`);
      await sharp(inputPath)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'contain',
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        })
        .png({ compressionLevel: 9 })
        .toFile(tmpPath);
      try {
        unlinkSync(inputPath);
        renameSync(tmpPath, inputPath);
      } catch (e) {
        try { unlinkSync(tmpPath); } catch { /* ignore */ }
        throw e;
      }
    }
    let after = alreadyExact ? `${w}×${h} (unchanged)` : `${TARGET_WIDTH}×${TARGET_HEIGHT}`;
    if (emitDisplay) {
      const dir = dirname(inputPath);
      const name = basename(inputPath, '.png');
      const displayPath = join(dir, `${name}_display.png`);
      await sharp(inputPath)
        .resize(DISPLAY_WIDTH, DISPLAY_HEIGHT, { fit: 'contain', position: 'center', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .png({ compressionLevel: 9 })
        .toFile(displayPath);
      after += ` + display ${DISPLAY_WIDTH}×${DISPLAY_HEIGHT}`;
    }
    return { ok: true, before: `${w}×${h}`, after };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function findRbihPngs(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) continue;
      if (name.startsWith(DEFAULT_GLOB) && name.toLowerCase().endsWith('.png')) {
        files.push(full);
      }
    }
  } catch {
    // ignore
  }
  return files.sort();
}

function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noDisplay = args.includes('--no-display');
  const rest = args.filter((a) => a !== '--dry-run' && a !== '--no-display');
  const emitDisplay = !noDisplay;

  const files: string[] = rest.length > 0
    ? rest.map((p) => resolve(process.cwd(), p))
    : findRbihPngs(ASSETS_DIR);

  if (files.length === 0) {
    console.error('No files to process. Pass paths or ensure src/ui/warroom/assets has hq_rbih_*.png');
    process.exit(1);
  }

  return (async () => {
    if (dryRun) console.log('[dry-run]');
    for (const inputPath of files) {
      const result = await resizeWithSharp(inputPath, dryRun, emitDisplay);
      if (result.ok) {
        console.log(`${inputPath}: ${result.before} → ${result.after}`);
      } else {
        console.error(`${inputPath}: ${result.error}`);
        process.exitCode = 1;
      }
    }
  })();
}

main();
