/**
 * Renders initial vs final political control from a scenario run to a single PNG
 * (side-by-side: initial | final). Uses settlements_substrate.geojson for geometry.
 *
 * Control is settlement-level: each polygon is one settlement; settlements can change
 * owner without the whole municipality flipping. Municipality control is derived (e.g. majority).
 *
 * Settlement id in state: municipality_id: census_id; substrate: properties.municipality_id, properties.census_id.
 *
 * Usage: npx tsx tools/map/render_control_snapshot.ts [runDir]
 * Default runDir: runs/apr1995_start__f32b0eec74c4116b__w8
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SUBSTRATE_PATH = resolve(ROOT, 'data/derived/settlements_substrate.geojson');

const FACTION_COLORS: Record<string, string> = {
  RBiH: 'rgb(70, 120, 80)',
  RS: 'rgb(180, 50, 50)',
  HRHB: 'rgb(60, 100, 140)',
  null: '#cccccc'
};

function getColor(controller: string | null): string {
  if (controller === undefined || controller === null) return FACTION_COLORS.null;
  return FACTION_COLORS[controller] ?? '#888';
}

/** Build settlement id used in state from substrate feature (mun:census). */
function featureToSid(p: { municipality_id?: string; census_id?: string }): string | null {
  const mun = p?.municipality_id;
  const census = p?.census_id;
  if (typeof mun !== 'string' || typeof census !== 'string') return null;
  return `${mun}:${census}`;
}

/**
 * Resolve controller for a polygon: state uses mun_code:source_id (e.g. 11240:104108 for Bužim);
 * substrate may use 1990 municipality_id (e.g. 10227 for Cazin). Prefer direct sid; else match by census_id.
 */
function getController(
  pc: Record<string, string | null>,
  sidFromSubstrate: string | null,
  censusIdByCensus: Map<string, string>
): string | null {
  if (sidFromSubstrate != null && sidFromSubstrate in pc) return pc[sidFromSubstrate] ?? null;
  if (sidFromSubstrate == null) return null;
  const census = sidFromSubstrate.includes(':') ? sidFromSubstrate.split(':')[1] : sidFromSubstrate;
  const stateKey = censusIdByCensus.get(census ?? '');
  return stateKey != null ? (pc[stateKey] ?? null) : null;
}

async function main(): Promise<void> {
  const runDir = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : join(ROOT, 'runs', 'apr1995_start__f32b0eec74c4116b__w8');

  const initialPath = join(runDir, 'initial_save.json');
  const finalPath = join(runDir, 'final_save.json');
  if (!existsSync(initialPath) || !existsSync(finalPath)) {
    console.error('Run dir must contain initial_save.json and final_save.json. Run dir:', runDir);
    process.exit(1);
  }
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Substrate not found:', SUBSTRATE_PATH);
    process.exit(1);
  }

  const { createCanvas } = await import('@napi-rs/canvas');

  const initial = JSON.parse(readFileSync(initialPath, 'utf-8')) as { political_controllers?: Record<string, string | null> };
  const final = JSON.parse(readFileSync(finalPath, 'utf-8')) as { political_controllers?: Record<string, string | null> };
  const pcInitial = initial.political_controllers ?? {};
  const pcFinal = final.political_controllers ?? {};

  // Build census_id -> state sid map for substrate id alignment (substrate may use 1990 mun_id, state uses post-1995 mun_code).
  const buildCensusToSid = (pc: Record<string, string | null>): Map<string, string> => {
    const map = new Map<string, string>();
    for (const key of Object.keys(pc).sort()) {
      const census = key.includes(':') ? key.split(':')[1] : key;
      if (census && !map.has(census)) map.set(census, key);
    }
    return map;
  };
  const censusToSidInitial = buildCensusToSid(pcInitial);
  const censusToSidFinal = buildCensusToSid(pcFinal);

  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf-8')) as {
    features: Array<{
      type: string;
      properties: { municipality_id?: string; census_id?: string };
      geometry: { type: string; coordinates: number[][][] };
    }>;
    awwv_meta?: { bbox_world?: number[] };
  };
  const features = substrate.features ?? [];
  const bbox = substrate.awwv_meta?.bbox_world;
  const [minX, minY, maxX, maxY] = bbox ?? [0, 0, 1000, 1000];

  const panelWidth = 1200;
  const panelHeight = 1000;
  const width = panelWidth * 2 + 40;
  const height = panelHeight + 80;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const pad = 40;
  const scale = Math.min(
    (panelWidth - pad * 2) / (maxX - minX),
    (panelHeight - pad * 2) / (maxY - minY)
  );
  const offX = (panelWidth - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (panelHeight - (maxY - minY) * scale) / 2 - minY * scale;

  const project = (pt: number[], panelIndex: number): [number, number] => {
    if (!pt || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1]))
      return [0, 0];
    const sx = pt[0] * scale + offX + (panelIndex === 0 ? 0 : panelWidth + 20);
    const sy = pt[1] * scale + offY + 60;
    return [sx, sy];
  };

  function drawPanel(
    politicalControllers: Record<string, string | null>,
    censusToSid: Map<string, string>,
    panelIndex: number
  ): void {
    const baseX = panelIndex === 0 ? 0 : panelWidth + 20;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(baseX, 60, panelWidth, panelHeight);

    for (const f of features) {
      const geom = f.geometry;
      if (!geom || geom.type !== 'Polygon' || !Array.isArray(geom.coordinates)) continue;
      const sid = featureToSid(f.properties);
      if (!sid) continue;
      const controller = getController(politicalControllers, sid, censusToSid);
      const color = getColor(controller);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      const rings = geom.coordinates;
      for (const ring of rings) {
        if (!ring || ring.length < 3) continue;
        ctx.beginPath();
        for (let i = 0; i < ring.length; i++) {
          const [sx, sy] = project(ring[i], panelIndex);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  drawPanel(pcInitial, censusToSidInitial, 0);
  drawPanel(pcFinal, censusToSidFinal, 1);

  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Settlement-level control', width / 2, 24);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Initial', panelWidth / 2, 50);
  ctx.fillText('Final', panelWidth + 20 + panelWidth / 2, 50);

  const outPath = join(runDir, 'control_initial_vs_final.png');
  const buffer = await canvas.encode('png');
  writeFileSync(outPath, buffer);
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
