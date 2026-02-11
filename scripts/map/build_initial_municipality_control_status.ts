/**
 * Phase H7.2: Build initial municipality control_status from Phase 0 stability rules.
 *
 * Inputs:
 * - data/source/municipalities_1990_initial_political_controllers.json
 * - data/source/bih_census_1991.json
 * - data/derived/mun1990_names.json
 *
 * Output:
 * - data/source/municipalities_initial_control_status.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeControlStatus, computeStabilityScore } from '../../src/phase0/stability.js';
import type { FactionId } from '../../src/state/game_state.js';


type PopCounts = [number, number, number, number, number];

const CONTROL_STATUS_OVERRIDES: Record<string, 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'> = {
  stari_grad_sarajevo: 'SECURE',
};

interface CensusMunicipality {
  n?: string;
  s?: string[];
  p?: number[];
}

interface CensusData {
  municipalities?: Record<string, CensusMunicipality>;
}

interface Mun1990NamesData {
  by_municipality_id?: Record<string, { mun1990_id: string; display_name: string }>;
}

interface ControllersData {
  controllers_by_mun1990_id?: Record<string, FactionId | null>;
}

function normalizePop(raw?: number[]): PopCounts {
  const out = [0, 0, 0, 0, 0] as PopCounts;
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < 5; i += 1) {
    const v = raw[i];
    out[i] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  return out;
}

function addPop(a: PopCounts, b: PopCounts): PopCounts {
  return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
    a[3] + b[3],
    a[4] + b[4],
  ];
}

function getControllerShare(controller: FactionId | null, pop: PopCounts): number | undefined {
  if (!controller) return undefined;
  const total = pop[0];
  if (total <= 0) return undefined;
  const idx = controller === 'RBiH' ? 1 : controller === 'HRHB' ? 2 : 3;
  return pop[idx] / total;
}

function main(): void {
  const ROOT = resolve();
  const controllersPath = resolve(ROOT, 'data/source/municipalities_1990_initial_political_controllers.json');
  const censusPath = resolve(ROOT, 'data/source/bih_census_1991.json');
  const mun1990NamesPath = resolve(ROOT, 'data/derived/mun1990_names.json');

  const controllers = JSON.parse(readFileSync(controllersPath, 'utf8')) as ControllersData;
  const census = JSON.parse(readFileSync(censusPath, 'utf8')) as CensusData;
  const mun1990Names = JSON.parse(readFileSync(mun1990NamesPath, 'utf8')) as Mun1990NamesData;

  const controllerByMun1990 = controllers.controllers_by_mun1990_id ?? {};
  const byMunicipalityId = mun1990Names.by_municipality_id ?? {};
  const municipalities = census.municipalities ?? {};

  const popByMun1990 = new Map<string, PopCounts>();
  const missingMun1990ForMunicipality: string[] = [];

  for (const [munCode, entry] of Object.entries(municipalities)) {
    const mun1990 = byMunicipalityId[munCode]?.mun1990_id;
    if (!mun1990) {
      missingMun1990ForMunicipality.push(munCode);
      continue;
    }
    const pop = normalizePop(entry.p);
    const existing = popByMun1990.get(mun1990) ?? ([0, 0, 0, 0, 0] as PopCounts);
    popByMun1990.set(mun1990, addPop(existing, pop));
  }

  const rows: Array<{
    mun1990_id: string;
    controller: FactionId | null;
    stability_score: number;
    control_status: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED';
    controller_share?: number;
    population: {
      total: number;
      bosniak: number;
      croat: number;
      serb: number;
      other: number;
    };
  }> = [];

  const missingPopulation: string[] = [];

  const munIds = Object.keys(controllerByMun1990).slice().sort((a, b) => a.localeCompare(b));
  for (const mun1990_id of munIds) {
    const controller = controllerByMun1990[mun1990_id] ?? null;
    const pop = popByMun1990.get(mun1990_id) ?? ([0, 0, 0, 0, 0] as PopCounts);
    if (!popByMun1990.has(mun1990_id)) {
      missingPopulation.push(mun1990_id);
    }
    const controllerShare = getControllerShare(controller, pop);
    const stabilityScore = computeStabilityScore({
      controller,
      controllerShare,
    });
    const controlStatus = CONTROL_STATUS_OVERRIDES[mun1990_id] ?? computeControlStatus(stabilityScore);
    rows.push({
      mun1990_id,
      controller,
      stability_score: stabilityScore,
      control_status: controlStatus,
      controller_share: controllerShare,
      population: {
        total: pop[0],
        bosniak: pop[1],
        croat: pop[2],
        serb: pop[3],
        other: pop[4],
      },
    });
  }

  const output = {
    meta: {
      schema_version: 1,
      sources: {
        controllers: 'data/source/municipalities_1990_initial_political_controllers.json',
        census: 'data/source/bih_census_1991.json',
        mun1990_names: 'data/derived/mun1990_names.json',
      },
      notes: [
        'control_status derived from Phase 0 stability score (System 11)',
        'organizational and geographic inputs not provided; treated as defaults (0)',
        'controller_share uses census municipality population totals aggregated to mun1990_id',
        'control_status overrides applied for: stari_grad_sarajevo',
      ],
    },
    audit: {
      missing_mun1990_for_municipality_id: missingMun1990ForMunicipality.sort((a, b) => a.localeCompare(b)),
      missing_population_for_mun1990_id: missingPopulation.sort((a, b) => a.localeCompare(b)),
    },
    rows,
  };

  const outPath = resolve(ROOT, 'data/source/municipalities_initial_control_status.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  process.stdout.write(`Wrote ${rows.length} municipality control_status rows to ${outPath}\n`);
}

main();
