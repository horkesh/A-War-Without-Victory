/**
 * One-off script to test load-save path: parse latest_run_final_save.json and run overlay builders; log timing/errors.
 * Run from repo root: npx tsx src/ui/map/scripts/debugLoadSave.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import { parseGameState } from '../data/GameStateAdapter';
import { buildControlGeoJSON } from '../map/builders/buildControlGeoJSON';
import { buildFrontLinesGeoJSON } from '../map/builders/buildFrontLinesGeoJSON';
import { buildFormationsGeoJSON } from '../map/builders/buildFormationsGeoJSON';
import { buildOrderArrowsGeoJSON } from '../map/builders/buildOrderArrowsGeoJSON';

const repoRoot = process.cwd();
const savePath = path.resolve(
  repoRoot,
  process.argv[2] || 'data/derived/latest_run_final_save.json'
);
const operationalPath = path.resolve(repoRoot, 'data/derived/operational/operational_settlements.geojson');

function main() {
  console.log('Reading save:', savePath);
  const t0 = Date.now();
  const text = fs.readFileSync(savePath, 'utf-8');
  console.log('Read file in', Date.now() - t0, 'ms, length', text.length);

  const t1 = Date.now();
  const json = JSON.parse(text) as unknown;
  console.log('JSON.parse done in', Date.now() - t1, 'ms');

  const t2 = Date.now();
  const state = parseGameState(json);
  console.log('parseGameState done in', Date.now() - t2, 'ms');
  console.log('Result:', state.label, '| formations:', state.formations.length, '| control keys:', Object.keys(state.controlBySettlement).length);

  if (!fs.existsSync(operationalPath)) {
    console.log('No operational_settlements.geojson, skipping overlay builders');
    return;
  }
  const baseGeo = JSON.parse(fs.readFileSync(operationalPath, 'utf-8')) as FeatureCollection;
  console.log('Base GeoJSON features:', baseGeo.features.length);

  let t: number;
  t = Date.now();
  const controlled = buildControlGeoJSON(baseGeo, state.controlBySettlement);
  console.log('buildControlGeoJSON', Date.now() - t, 'ms');

  t = Date.now();
  const frontLines = buildFrontLinesGeoJSON(controlled, state.war_alliance_rbih_hrhb);
  console.log('buildFrontLinesGeoJSON', Date.now() - t, 'ms, features:', frontLines.features.length);

  t = Date.now();
  const formations = buildFormationsGeoJSON(state, controlled);
  console.log('buildFormationsGeoJSON', Date.now() - t, 'ms, features:', formations.features.length);

  t = Date.now();
  const orderArrows = buildOrderArrowsGeoJSON(state, [], controlled);
  console.log('buildOrderArrowsGeoJSON', Date.now() - t, 'ms, features:', orderArrows.features.length);

  console.log('Total load+overlay time:', Date.now() - t0, 'ms');
}

main();
