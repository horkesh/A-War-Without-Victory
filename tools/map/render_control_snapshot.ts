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
import { pointOnFeature } from '@turf/turf';
import {
  AMBER_MISMATCH,
  FACTION_COLORS,
  projectNorthUp,
  resolveControlVisual,
} from './control_snapshot_rendering.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SUBSTRATE_PATH = resolve(ROOT, 'data/derived/operational/operational_settlements.geojson');

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
  const finalOnly = process.argv.includes('--final-only');
  const runDirArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  const runDir = runDirArg
    ? resolve(process.cwd(), runDirArg)
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

  type SaveState = {
    political_controllers?: Record<string, string | null>;
    political?: { political_controllers?: Record<string, string | null> };
  };
  const initial = JSON.parse(readFileSync(initialPath, 'utf-8')) as SaveState;
  const final = JSON.parse(readFileSync(finalPath, 'utf-8')) as SaveState;
  const pcInitial = initial.political?.political_controllers ?? initial.political_controllers ?? {};
  const pcFinal = final.political?.political_controllers ?? final.political_controllers ?? {};
  const painter = JSON.parse(readFileSync(
    resolve(ROOT, 'data/source/calibration/painted_control_jan1993.json'),
    'utf-8',
  )) as { by_settlement_id?: Record<string, string | null> };
  const expectedJanuaryControl = painter.by_settlement_id ?? {};

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
      properties: { osid?: string; municipality_id?: string; census_id?: string };
      geometry: { type: string; coordinates: unknown };
    }>;
    awwv_meta?: { bbox_world?: number[] };
  };
  const features = substrate.features ?? [];
  const coordinatePairs: number[][] = [];
  const collectPairs = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      coordinatePairs.push(value as number[]);
      return;
    }
    for (const child of value) collectPairs(child);
  };
  for (const feature of features) collectPairs(feature.geometry?.coordinates);
  const xs = coordinatePairs.map((pair) => pair[0]);
  const ys = coordinatePairs.map((pair) => pair[1]);
  const bbox = substrate.awwv_meta?.bbox_world;
  const [minX, minY, maxX, maxY] = bbox ?? [
    Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys),
  ];

  const panelWidth = 1200;
  const panelHeight = 1000;
  const width = finalOnly ? panelWidth : panelWidth * 2 + 40;
  const height = panelHeight + 80;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const pad = 40;
  const scale = Math.min(
    (panelWidth - pad * 2) / (maxX - minX),
    (panelHeight - pad * 2) / (maxY - minY)
  );
  const offX = (panelWidth - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (panelHeight - (maxY - minY) * scale) / 2;

  const project = (pt: number[], panelIndex: number): [number, number] => {
    if (!pt || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1]))
      return [0, 0];
    return projectNorthUp(pt, {
      scale,
      offX,
      offY,
      maxY,
      panelOffsetX: panelIndex === 0 ? 0 : panelWidth + 20,
      titleOffsetY: 60,
    });
  };

  function drawPanel(
    politicalControllers: Record<string, string | null>,
    censusToSid: Map<string, string>,
    panelIndex: number,
    expectedControl?: Record<string, string | null>,
  ): number {
    const baseX = panelIndex === 0 ? 0 : panelWidth + 20;
    const desiredMarkers: Array<{ point: number[]; color: string }> = [];
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(baseX, 60, panelWidth, panelHeight);

    for (const f of features) {
      const geom = f.geometry;
      if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type) || !Array.isArray(geom.coordinates)) continue;
      const sid = f.properties.osid ?? featureToSid(f.properties);
      if (!sid) continue;
      const controller = f.properties.osid
        ? (politicalControllers[sid] ?? null)
        : getController(politicalControllers, sid, censusToSid);
      const expected = expectedControl?.[sid] ?? null;
      const visual = expectedControl
        ? resolveControlVisual(controller, expected)
        : { fill: getColor(controller), desiredMarker: null, mismatch: false };
      ctx.fillStyle = visual.fill;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      const polygons = geom.type === 'MultiPolygon'
        ? geom.coordinates as number[][][][]
        : [geom.coordinates as number[][][]];
      for (const rings of polygons) for (const ring of rings) {
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
      if (visual.desiredMarker) {
        const point = pointOnFeature(f as never).geometry.coordinates;
        desiredMarkers.push({ point, color: visual.desiredMarker });
      }
    }

    for (const marker of desiredMarkers) {
      const [x, y] = project(marker.point, panelIndex);
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = marker.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return desiredMarkers.length;
  }

  let mismatchCount = 0;
  if (finalOnly) {
    mismatchCount = drawPanel(pcFinal, censusToSidFinal, 0, expectedJanuaryControl);
  } else {
    drawPanel(pcInitial, censusToSidInitial, 0);
    mismatchCount = drawPanel(pcFinal, censusToSidFinal, 1, expectedJanuaryControl);
  }

  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(finalOnly ? 'January 1993 — operational control' : 'Settlement-level control', width / 2, 24);
  ctx.font = 'bold 18px sans-serif';
  if (finalOnly) {
    ctx.fillText('40-week calibrated final state', panelWidth / 2, 50);
  } else {
    ctx.fillText('Initial', panelWidth / 2, 50);
    ctx.fillText('Final', panelWidth + 20 + panelWidth / 2, 50);
  }

  const legend = [
    ['RS', FACTION_COLORS.RS],
    ['RBiH', FACTION_COLORS.RBiH],
    ['HRHB', FACTION_COLORS.HRHB],
  ] as const;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  let legendX = width - 245;
  for (const [label, color] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(legendX, 16, 14, 14);
    ctx.fillStyle = '#333';
    ctx.fillText(label, legendX + 19, 28);
    legendX += label === 'HRHB' ? 0 : 76;
  }
  ctx.fillStyle = AMBER_MISMATCH;
  ctx.fillRect(18, 16, 14, 14);
  ctx.fillStyle = '#333';
  ctx.fillText(`Mismatch (${mismatchCount}); dot = painter`, 37, 28);

  const outPath = join(runDir, finalOnly ? 'control_january_1993.png' : 'control_initial_vs_final.png');
  const buffer = await canvas.encode('png');
  writeFileSync(outPath, buffer);
  console.log('Wrote', outPath, `(${mismatchCount} January mismatches marked)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
