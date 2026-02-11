/**
 * Phase H7.0: Build unified initial settlements master (hard-coded startup dataset)
 *
 * Inputs:
 * - data/derived/settlements_index_1990.json
 * - data/source/municipality_post1995_to_mun1990.json
 * - data/derived/settlement_names.json
 * - data/derived/settlement_ethnicity_data.json
 * - data/source/municipalities_1990_initial_political_controllers.json
 * - data/source/municipalities_initial_control_status.json
 * - data/source/settlement_political_controllers_overrides.json
 *
 * Outputs:
 * - data/source/settlements_initial_master.json
 * - data/derived/settlements_initial_master_audit.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildMun1990RegistrySet,
  normalizeMun1990Id,
  MUN1990_ALIAS_MAP,
} from './_shared/mun1990_id_normalizer.js';


type PoliticalControllerId = 'RBiH' | 'RS' | 'HRHB' | null;

interface SettlementIndexEntry {
  sid: string;
  source_id: string;
  mun_code: string;
  mun: string;
  mun1990_id?: string;
}

interface SettlementsIndex1990 {
  version?: string;
  settlements?: SettlementIndexEntry[];
}

interface SettlementNamesData {
  by_census_id?: Record<string, { name?: string; mun_code?: string }>;
}

interface EthnicityEntry {
  majority: 'bosniak' | 'serb' | 'croat' | 'other' | 'unknown';
  composition: {
    bosniak: number;
    croat: number;
    serb: number;
    other: number;
  };
  provenance: 'settlement_census' | 'no_data' | 'ambiguous_ordering';
}

interface SettlementEthnicityData {
  by_settlement_id?: Record<string, EthnicityEntry>;
}

interface MunicipalityRemap {
  index_by_post1995_code?: Record<string, string>;
}

interface MunicipalControllers1990 {
  controllers_by_mun1990_id?: Record<string, PoliticalControllerId>;
}

interface SettlementControllerOverrides {
  overrides?: Record<string, PoliticalControllerId>;
}

interface MunicipalityControlStatusRow {
  mun1990_id: string;
  stability_score: number;
  control_status: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED';
}

interface MunicipalityControlStatusData {
  rows?: MunicipalityControlStatusRow[];
}

interface MasterSettlementRecord {
  sid: string;
  source_id: string;
  mun_code: string;
  mun: string;
  mun1990_id: string | null;
  mun1990_name: string | null;
  name: string | null;
  political_controller: PoliticalControllerId;
  stability_score: number | null;
  control_status: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED' | null;
  contested_control: boolean;
  ethnicity: EthnicityEntry | null;
}

function normalizeToSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function resolveOverride(
  sid: string,
  overrides: Record<string, PoliticalControllerId>
): PoliticalControllerId | undefined {
  if (sid in overrides) return overrides[sid];
  const parts = sid.split(':');
  if (parts.length > 2) {
    const base = `${parts[0]}:${parts[1]}`;
    if (base in overrides) return overrides[base];
  }
  return undefined;
}

function main(): void {
  const ROOT = resolve();

  const settlementsPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
  const namesPath = resolve(ROOT, 'data/derived/settlement_names.json');
  const ethnicityPath = resolve(ROOT, 'data/derived/settlement_ethnicity_data.json');
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const controllersPath = resolve(
    ROOT,
    'data/source/municipalities_1990_initial_political_controllers.json'
  );
  const controlStatusPath = resolve(
    ROOT,
    'data/source/municipalities_initial_control_status.json'
  );
  const overridesPath = resolve(ROOT, 'data/source/settlement_political_controllers_overrides.json');

  const settlementsIndex = JSON.parse(readFileSync(settlementsPath, 'utf8')) as SettlementsIndex1990;
  const settlementNames = JSON.parse(readFileSync(namesPath, 'utf8')) as SettlementNamesData;
  const ethnicityData = JSON.parse(readFileSync(ethnicityPath, 'utf8')) as SettlementEthnicityData;
  const remap = JSON.parse(readFileSync(remapPath, 'utf8')) as MunicipalityRemap;
  const controllers = JSON.parse(readFileSync(controllersPath, 'utf8')) as MunicipalControllers1990;
  const controlStatus = JSON.parse(readFileSync(controlStatusPath, 'utf8')) as MunicipalityControlStatusData;
  const overrides = JSON.parse(readFileSync(overridesPath, 'utf8')) as SettlementControllerOverrides;

  const settlements = settlementsIndex.settlements ?? [];
  const nameMap = settlementNames.by_census_id ?? {};
  const ethnicityMap = ethnicityData.by_settlement_id ?? {};
  const remapIndex = remap.index_by_post1995_code ?? {};
  const controllerByMun1990 = controllers.controllers_by_mun1990_id ?? {};
  const overrideMap = overrides.overrides ?? {};
  const controlStatusByMun1990 = new Map<string, MunicipalityControlStatusRow>();
  for (const row of controlStatus.rows ?? []) {
    if (row && typeof row.mun1990_id === 'string') {
      controlStatusByMun1990.set(row.mun1990_id, row);
    }
  }

  const { registrySet, displayNameById, meta } = buildMun1990RegistrySet(ROOT);

  const audit = {
    meta: {
      settlements_total: settlements.length,
      registry_path: meta?.selected_registry_path ?? 'unknown',
      registry_count: meta?.selected_registry_count ?? 0,
    },
    missing: {
      mun1990_id: [] as string[],
      political_controller: [] as string[],
      control_status: [] as string[],
      ethnicity: [] as string[],
      settlement_name: [] as string[],
    },
  };

  const records: MasterSettlementRecord[] = [];

  const sorted = settlements.slice().sort((a, b) => a.sid.localeCompare(b.sid));
  for (const entry of sorted) {
    const rawMun1990Name = typeof entry.mun1990_id === 'string' ? entry.mun1990_id : '';
    const rawSlug = normalizeToSlug(rawMun1990Name);
    let { canonical: mun1990Id } = normalizeMun1990Id(rawSlug, MUN1990_ALIAS_MAP, registrySet);
    let mun1990Name: string | null = null;

    if (!mun1990Id) {
      const remapName = remapIndex[entry.mun_code];
      if (remapName) {
        const remapSlug = normalizeToSlug(remapName);
        const normalized = normalizeMun1990Id(remapSlug, MUN1990_ALIAS_MAP, registrySet);
        mun1990Id = normalized.canonical;
        mun1990Name = remapName;
      }
    }

    if (mun1990Id) {
      mun1990Name = displayNameById[mun1990Id] ?? mun1990Name ?? rawMun1990Name ?? mun1990Id;
    }

    if (!mun1990Id) {
      audit.missing.mun1990_id.push(entry.sid);
    }

    let controller: PoliticalControllerId = null;
    if (mun1990Id && mun1990Id in controllerByMun1990) {
      controller = controllerByMun1990[mun1990Id] ?? null;
    } else if (mun1990Id) {
      audit.missing.political_controller.push(entry.sid);
    }

    const override = resolveOverride(entry.sid, overrideMap);
    if (override !== undefined) {
      controller = override;
    }

    const name = nameMap[entry.source_id]?.name ?? null;
    if (!name) {
      audit.missing.settlement_name.push(entry.sid);
    }

    const ethnicityKey = `S${entry.source_id}`;
    const ethnicity = ethnicityMap[ethnicityKey] ?? null;
    if (!ethnicity) {
      audit.missing.ethnicity.push(entry.sid);
    }

    const statusRow = mun1990Id ? controlStatusByMun1990.get(mun1990Id) : undefined;
    const controlStatusValue = statusRow?.control_status ?? null;
    const stabilityScoreValue = statusRow?.stability_score ?? null;
    if (mun1990Id && !statusRow) {
      audit.missing.control_status.push(entry.sid);
    }

    records.push({
      sid: entry.sid,
      source_id: entry.source_id,
      mun_code: entry.mun_code,
      mun: entry.mun,
      mun1990_id: mun1990Id ?? null,
      mun1990_name: mun1990Name ?? null,
      name,
      political_controller: controller,
      stability_score: stabilityScoreValue,
      control_status: controlStatusValue,
      contested_control: controlStatusValue != null ? controlStatusValue !== 'SECURE' : false,
      ethnicity,
    });
  }

  const output = {
    meta: {
      schema_version: 1,
      settlement_count: records.length,
      inputs: {
        settlements_index: 'data/derived/settlements_index_1990.json',
        settlement_names: 'data/derived/settlement_names.json',
        settlement_ethnicity: 'data/derived/settlement_ethnicity_data.json',
        mun1990_remap: 'data/source/municipality_post1995_to_mun1990.json',
        mun1990_controllers: 'data/source/municipalities_1990_initial_political_controllers.json',
        mun1990_control_status: 'data/source/municipalities_initial_control_status.json',
        settlement_overrides: 'data/source/settlement_political_controllers_overrides.json',
      },
    },
    settlements: records,
  };

  const outPath = resolve(ROOT, 'data/source/settlements_initial_master.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  mkdirSync(resolve(ROOT, 'data/derived'), { recursive: true });
  const auditPath = resolve(ROOT, 'data/derived/settlements_initial_master_audit.json');
  writeFileSync(auditPath, JSON.stringify(audit, null, 2), 'utf8');

  console.log(`Wrote ${records.length} settlements to ${outPath}`);
  console.log(`Audit written to ${auditPath}`);
  console.log(`Missing mun1990_id: ${audit.missing.mun1990_id.length}`);
  console.log(`Missing political_controller: ${audit.missing.political_controller.length}`);
  console.log(`Missing control_status: ${audit.missing.control_status.length}`);
  console.log(`Missing ethnicity: ${audit.missing.ethnicity.length}`);
  console.log(`Missing settlement_name: ${audit.missing.settlement_name.length}`);
}

main();
