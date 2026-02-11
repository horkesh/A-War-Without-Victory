/**
 * Build settlements_initial_master.json from WGS84 layer and rolled-up census.
 * One record per sid in settlements_wgs84_1990.geojson (6002). Deterministic.
 *
 * Usage: npm run map:build:settlements-initial-master:wgs84
 * Output: data/source/settlements_initial_master.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';

const ROOT = resolve(process.cwd());
const WGS84_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990.geojson');
const CENSUS_ROLLUP_PATH = resolve(ROOT, 'data/derived/census_rolled_up_wgs84.json');
const CONTROLLERS_PATH = resolve(ROOT, 'data/source/municipalities_1990_initial_political_controllers.json');
const CONTROL_STATUS_PATH = resolve(ROOT, 'data/source/municipalities_initial_control_status.json');
const OVERRIDES_PATH = resolve(ROOT, 'data/source/settlement_political_controllers_overrides.json');
const OUT_PATH = resolve(ROOT, 'data/source/settlements_initial_master.json');

type PoliticalControllerId = 'RBiH' | 'RS' | 'HRHB' | null;

interface EthnicityEntry {
  majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';
  composition: { bosniak: number; croat: number; serb: number; other: number };
  provenance: string;
}

function majorityFromP(p: number[]): EthnicityEntry['majority'] {
  if (!p || p.length < 5) return 'unknown';
  const [, b, c, s, o] = p;
  const max = Math.max(b, c, s, o);
  if (max === 0) return 'unknown';
  if (b === max) return 'bosniak';
  if (s === max) return 'serb';
  if (c === max) return 'croat';
  return 'other';
}

function compositionFromP(p: number[]): EthnicityEntry['composition'] {
  const total = p[0] ?? 0;
  if (total === 0) return { bosniak: 0, croat: 0, serb: 0, other: 0 };
  return {
    bosniak: (p[1] ?? 0) / total,
    croat: (p[2] ?? 0) / total,
    serb: (p[3] ?? 0) / total,
    other: (p[4] ?? 0) / total,
  };
}

function main(): void {
  const geojson = JSON.parse(readFileSync(WGS84_PATH, 'utf8'));
  const censusRollup = JSON.parse(readFileSync(CENSUS_ROLLUP_PATH, 'utf8'));
  const bySid = censusRollup.by_sid ?? {};
  const controllers = existsSync(CONTROLLERS_PATH)
    ? (JSON.parse(readFileSync(CONTROLLERS_PATH, 'utf8')) as { controllers_by_mun1990_id?: Record<string, PoliticalControllerId> })
    : { controllers_by_mun1990_id: {} };
  const controlStatusData = existsSync(CONTROL_STATUS_PATH)
    ? (JSON.parse(readFileSync(CONTROL_STATUS_PATH, 'utf8')) as { rows?: Array<{ mun1990_id: string; control_status: string; stability_score?: number }> })
    : { rows: [] };
  const overridesData = existsSync(OVERRIDES_PATH)
    ? (JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8')) as { overrides?: Record<string, PoliticalControllerId> })
    : { overrides: {} };

  const controllerByMun1990 = controllers.controllers_by_mun1990_id ?? {};
  const overrideMap = overridesData.overrides ?? {};
  const controlStatusByMun = new Map(controlStatusData.rows?.map((r) => [r.mun1990_id, r]) ?? []);

  const { registrySet, displayNameById } = buildMun1990RegistrySet(ROOT);

  const features = geojson.features ?? [];
  const records: Array<{
    sid: string;
    source_id: string;
    mun_code: string;
    mun: string;
    mun1990_id: string | null;
    mun1990_name: string | null;
    name: string | null;
    political_controller: PoliticalControllerId;
    stability_score: number | null;
    control_status: string | null;
    contested_control: boolean;
    ethnicity: EthnicityEntry | null;
  }> = [];

  interface Feat {
    properties?: { sid?: string; mun1990_id?: string; mun1990_name?: string; settlement_name?: string };
  }
  const sortedFeatures = (features as Feat[])
    .filter((f) => f.properties?.sid)
    .sort((a, b) => String(a.properties?.sid ?? '').localeCompare(String(b.properties?.sid ?? '')));

  for (const f of sortedFeatures) {
    const p = f.properties ?? {};
    const sid = String(p.sid ?? '');
    if (!sid) continue;
    const sourceId = sid.startsWith('S') ? sid.slice(1) : sid;
    const mun1990IdRaw = String(p.mun1990_id ?? '').trim();
    const mun1990Name = String(p.mun1990_name ?? '');
    const rawSlug = mun1990IdRaw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { canonical: mun1990Id } = normalizeMun1990Id(rawSlug, MUN1990_ALIAS_MAP, registrySet);
    const mun1990DisplayName = mun1990Id ? (displayNameById[mun1990Id] ?? (mun1990Name || mun1990Id)) : (mun1990Name || null);

    const census = bySid[sid];
    const name = census?.n ?? p.settlement_name ?? null;
    const pArr = census?.p ?? [0, 0, 0, 0, 0];

    let controller: PoliticalControllerId = (mun1990Id && controllerByMun1990[mun1990Id]) ?? null;
    const override = overrideMap[sid] ?? overrideMap[sourceId];
    if (override !== undefined) controller = override;

    const statusRow = mun1990Id ? controlStatusByMun.get(mun1990Id) : undefined;
    const controlStatusValue = statusRow?.control_status ?? null;
    const stabilityScoreValue = statusRow?.stability_score ?? null;

    records.push({
      sid,
      source_id: sourceId,
      mun_code: (mun1990Id ?? mun1990IdRaw) || sid,
      mun: (mun1990DisplayName ?? mun1990Name) || '',
      mun1990_id: mun1990Id ?? null,
      mun1990_name: mun1990DisplayName ?? null,
      name,
      political_controller: controller,
      stability_score: stabilityScoreValue ?? null,
      control_status: controlStatusValue ?? null,
      contested_control: controlStatusValue != null ? controlStatusValue !== 'SECURE' : false,
      ethnicity: {
        majority: majorityFromP(pArr),
        composition: compositionFromP(pArr),
        provenance: 'settlement_census',
      },
    });
  }

  const output = {
    meta: {
      schema_version: 1,
      settlement_count: records.length,
      inputs: {
        settlements_wgs84: 'data/derived/settlements_wgs84_1990.geojson',
        census_rolled_up: 'data/derived/census_rolled_up_wgs84.json',
        mun1990_controllers: 'data/source/municipalities_1990_initial_political_controllers.json',
        mun1990_control_status: 'data/source/municipalities_initial_control_status.json',
        settlement_overrides: 'data/source/settlement_political_controllers_overrides.json',
      },
    },
    settlements: records,
  };

  mkdirSync(resolve(ROOT, 'data/source'), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${records.length} settlements to ${OUT_PATH}`);
}

main();
