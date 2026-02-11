/**
 * Phase H7.1: Remap/merge settlement special cases (Ilijas / Novi Grad Sarajevo / Sokolac)
 *
 * Actions:
 * - Merge duplicate Rakova Noga and Lipnik (keep Ilijas, remove Istocni Stari Grad copies)
 * - Move Sirovine and Vuknic from Istocni Stari Grad -> Sokolac
 *
 * Updates:
 * - data/source/bih_census_1991.json (+ extracted copy if present)
 * - data/derived/settlements_index_1990.json
 * - data/derived/settlements_index.json
 * - data/derived/settlement_edges.json
 * - data/derived/settlements_substrate.geojson
 * - data/derived/settlements_viewer_v1.geojson
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';



const ROOT = resolve();

const MERGE_CENSUS = [
  { masterId: '170631', mergeId: '209457' }, // Rakova Noga (Ilijas <- Istocni Stari Grad)
  { masterId: '170615', mergeId: '209449' }, // Lipnik (Ilijas <- Istocni Stari Grad)
];

const MOVE_CENSUS = [
  { id: '209465', from: '20206', to: '20532' }, // Sirovine: Istocni Stari Grad -> Sokolac
  { id: '209481', from: '20206', to: '20532' }, // Vuknic: Istocni Stari Grad -> Sokolac
];

const REMOVED_SIDS = new Set(['20206:209457', '20206:209449']);
const MOVED_SIDS = new Map([
  ['20206:209465', '20532:209465'],
  ['20206:209481', '20532:209481'],
]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, data: unknown, pretty: boolean): void {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  writeFileSync(path, content, 'utf8');
}

function normalizePop(p?: number[]): number[] {
  const base = Array.isArray(p) ? p.slice(0, 5) : [];
  while (base.length < 5) base.push(0);
  return base.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
}

function addPop(a?: number[], b?: number[]): number[] {
  const aa = normalizePop(a);
  const bb = normalizePop(b);
  return aa.map((v, i) => v + (bb[i] ?? 0));
}

function subPop(a?: number[], b?: number[]): number[] {
  const aa = normalizePop(a);
  const bb = normalizePop(b);
  return aa.map((v, i) => v - (bb[i] ?? 0));
}

function removeFromArray(list: string[] | undefined, value: string): void {
  if (!Array.isArray(list)) return;
  let idx = list.indexOf(value);
  while (idx !== -1) {
    list.splice(idx, 1);
    idx = list.indexOf(value);
  }
}

function ensureInArray(list: string[] | undefined, value: string): void {
  if (!Array.isArray(list)) return;
  if (!list.includes(value)) list.push(value);
}

function updateCensus(path: string): void {
  if (!existsSync(path)) return;
  const census = readJson<any>(path);
  const settlements = census.settlements as Record<string, any> | undefined;
  const municipalities = census.municipalities as Record<string, any> | undefined;

  if (!settlements || !municipalities) {
    throw new Error(`Census format unexpected at ${path}`);
  }

  // Merge duplicates into Ilijas masters
  for (const { masterId, mergeId } of MERGE_CENSUS) {
    const master = settlements[masterId];
    const merged = settlements[mergeId];
    if (!master || !merged) {
      throw new Error(`Missing census settlement for merge: master=${masterId}, merge=${mergeId}`);
    }
    master.p = addPop(master.p, merged.p);

    const masterMun = String(master.m ?? '');
    const mergeMun = String(merged.m ?? '');

    if (mergeMun && municipalities[mergeMun]) {
      removeFromArray(municipalities[mergeMun].s, mergeId);
      municipalities[mergeMun].p = subPop(municipalities[mergeMun].p, merged.p);
    }

    if (mergeMun && masterMun && mergeMun !== masterMun && municipalities[masterMun]) {
      municipalities[masterMun].p = addPop(municipalities[masterMun].p, merged.p);
    }

    delete settlements[mergeId];
  }

  // Move settlements to Sokolac
  for (const { id, from, to } of MOVE_CENSUS) {
    const entry = settlements[id];
    if (!entry) {
      throw new Error(`Missing census settlement for move: ${id}`);
    }
    entry.m = to;

    if (municipalities[from]) {
      removeFromArray(municipalities[from].s, id);
      municipalities[from].p = subPop(municipalities[from].p, entry.p);
    }
    if (municipalities[to]) {
      ensureInArray(municipalities[to].s, id);
      municipalities[to].p = addPop(municipalities[to].p, entry.p);
    }
  }

  writeJson(path, census, false);
}

function updateSettlementsIndex(path: string, includeMun1990: boolean): void {
  if (!existsSync(path)) return;
  const data = readJson<any>(path);
  const settlements: any[] = Array.isArray(data.settlements) ? data.settlements : [];
  const updated: any[] = [];

  for (const entry of settlements) {
    const sid = String(entry.sid ?? '');
    if (REMOVED_SIDS.has(sid)) continue;
    const remapped = MOVED_SIDS.get(sid);
    if (remapped) {
      const [munCode, sourceId] = remapped.split(':');
      entry.sid = remapped;
      entry.mun_code = munCode;
      entry.mun = 'Sokolac';
      if (includeMun1990) {
        entry.mun1990_id = 'Sokolac';
      }
      if (entry.source_data) {
        entry.source_data.mun_code = munCode;
        entry.source_data.mun = 'Sokolac';
      }
    }
    updated.push(entry);
  }

  data.settlements = updated;
  writeJson(path, data, true);
}

function updateSettlementEdges(path: string): void {
  if (!existsSync(path)) return;
  const data = readJson<any>(path);
  const edges: any[] = Array.isArray(data.edges) ? data.edges : [];
  const seen = new Set<string>();
  const next: any[] = [];

  for (const edge of edges) {
    let a = String(edge.a ?? '');
    let b = String(edge.b ?? '');
    if (!a || !b) continue;
    if (REMOVED_SIDS.has(a) || REMOVED_SIDS.has(b)) continue;
    if (MOVED_SIDS.has(a)) a = MOVED_SIDS.get(a)!;
    if (MOVED_SIDS.has(b)) b = MOVED_SIDS.get(b)!;
    if (a === b) continue;
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ ...edge, a, b });
  }

  data.edges = next;
  writeJson(path, data, true);
}

function updateGeoJson(path: string, municipalityIdField: 'municipality_id', asNumber: boolean): void {
  if (!existsSync(path)) return;
  const data = readJson<any>(path);
  const features: any[] = Array.isArray(data.features) ? data.features : [];
  const updated: any[] = [];

  for (const feature of features) {
    const props = feature?.properties ?? {};
    const censusId = props.census_id ?? (props.sid ? String(props.sid).replace(/^S/, '') : props.id);
    if (censusId && (censusId === '209457' || censusId === '209449')) {
      continue;
    }
    if (censusId && (censusId === '209465' || censusId === '209481')) {
      props[municipalityIdField] = asNumber ? 20532 : '20532';
    }
    feature.properties = props;
    updated.push(feature);
  }

  data.features = updated;
  writeJson(path, data, true);
}

function main(): void {
  updateCensus(resolve(ROOT, 'data/source/bih_census_1991.json'));
  updateCensus(resolve(ROOT, 'data/source/.extracted/bih_census_1991/bih_census_1991.json'));

  updateSettlementsIndex(resolve(ROOT, 'data/derived/settlements_index_1990.json'), true);
  updateSettlementsIndex(resolve(ROOT, 'data/derived/settlements_index.json'), false);
  updateSettlementEdges(resolve(ROOT, 'data/derived/settlement_edges.json'));

  updateGeoJson(resolve(ROOT, 'data/derived/settlements_substrate.geojson'), 'municipality_id', false);
  updateGeoJson(resolve(ROOT, 'data/derived/settlements_viewer_v1.geojson'), 'municipality_id', true);

  process.stdout.write('Remap complete: census, settlements index, edges, substrate/viewer geometry updated.\n');
}

main();
