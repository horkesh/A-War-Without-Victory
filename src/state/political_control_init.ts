/**
 * Phase 6B / E1 / E5: Deterministic political control initialization
 *
 * Initializes political_controller for all settlements at GameState creation.
 * E5: Uses data/source/settlements_initial_master.json (hard-coded startup master).
 * Political control is independent of AoR and brigade presence.
 * No mechanics, no dynamics, no per-turn logic.
 *
 * Null-handling contract: political_controller may be null for explicitly documented mun1990
 * exceptions (see FORAWWV addendum). All consumers must handle null deterministically (no inference).
 */

import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { GameState, FactionId, SettlementId } from './game_state.js';
import type { LoadedSettlementGraph, SettlementRecord } from '../map/settlements.js';
import {
  loadSettlementEthnicityData,
  majorityToFaction,
  type SettlementEthnicityEntry
} from '../data/settlement_ethnicity.js';
import { isMunicipalityAlignedToRbih } from './rbih_aligned_municipalities.js';

/**
 * Best-effort init logging. In some Electron launches stdout can be closed, which throws EPIPE.
 * Logging must never crash campaign initialization.
 */
function writeInitLog(message: string): void {
  try {
    if (typeof process === 'undefined' || !process.stdout || typeof process.stdout.write !== 'function') return;
    process.stdout.write(message);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
    if (code === 'EPIPE') return;
    throw error;
  }
}

/** Map Phase 0 control_status to authority state (consolidated/contested/fragmented) for pool and spawn. */
function controlStatusToAuthority(
  control_status: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'
): 'consolidated' | 'contested' | 'fragmented' {
  if (control_status === 'SECURE') return 'consolidated';
  if (control_status === 'CONTESTED') return 'contested';
  return 'fragmented';
}

/**
 * Apply RBiH-aligned municipality override: in these muns, only Croat-majority (HRHB) becomes RBiH;
 * Serb-majority (RS) settlements stay RS. HVO subordinate to ARBiH for spawns and flip semantics.
 * Mutates controllersRecord.
 */
function applyRbihAlignedMunicipalityOverrides(
  controllersRecord: Record<SettlementId, PoliticalControllerId>,
  settlementGraph: LoadedSettlementGraph
): void {
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  for (const sid of settlementIds) {
    const settlement = settlementGraph.settlements.get(sid);
    if (!settlement) continue;
    const mun1990Id = settlement.mun1990_id ?? settlement.mun_code ?? '';
    if (isMunicipalityAlignedToRbih(mun1990Id) && controllersRecord[sid] === 'HRHB') {
      controllersRecord[sid] = 'RBiH';
    }
  }
}


export type PoliticalControllerId = FactionId | null;

/**
 * Municipality default political controller mapping.
 * Key: municipality code (mun_code)
 * Value: default political controller at Turn 0
 */
export interface MunicipalityControllerMapping {
  version: string;
  mappings: Record<string, PoliticalControllerId>;
}

export interface SettlementControllerOverrides {
  version: string;
  overrides: Record<string, PoliticalControllerId>;
}

export interface SettlementInitialMasterRecord {
  sid: string;
  mun1990_id?: string | null;
  political_controller: PoliticalControllerId;
  contested_control?: boolean;
  control_status?: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED' | null;
  stability_score?: number | null;
}

export interface SettlementsInitialMaster {
  meta?: { schema_version?: number };
  settlements: SettlementInitialMasterRecord[];
}

/**
 * Load municipality->controller mapping from data file.
 * Fails loudly if file is missing or invalid.
 */
export async function loadMunicipalityControllerMapping(
  mappingPath?: string
): Promise<MunicipalityControllerMapping> {
  const path = resolve(mappingPath ?? 'data/source/municipality_political_controllers.json');
  
  try {
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    
    if (!isRecord(parsed) || typeof parsed.version !== 'string' || !isRecord(parsed.mappings)) {
      throw new Error(`Invalid municipality controller mapping format: expected { version: string, mappings: Record<string, FactionId|null> }`);
    }
    
    // Validate all values are valid faction IDs or null
    const CANONICAL_IDS = ['RBiH', 'RS', 'HRHB'] as const;
    for (const [mun_code, controller] of Object.entries(parsed.mappings)) {
      if (controller !== null && !CANONICAL_IDS.includes(controller as any)) {
        throw new Error(`Invalid controller for municipality ${mun_code}: ${controller} (must be RBiH, RS, HRHB, or null)`);
      }
    }
    
    return {
      version: parsed.version,
      mappings: parsed.mappings as Record<string, PoliticalControllerId>
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`Municipality controller mapping file not found: ${path}. This file is required for Turn 0 political control initialization.`);
    }
    throw error;
  }
}

export async function loadSettlementControllerOverrides(
  overridesPath?: string
): Promise<SettlementControllerOverrides> {
  const path = resolve(overridesPath ?? 'data/source/settlement_political_controllers_overrides.json');
  try {
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    if (!isRecord(parsed) || typeof parsed.version !== 'string' || !isRecord(parsed.overrides)) {
      throw new Error(
        `Invalid settlement controller overrides format: expected { version: string, overrides: Record<string, FactionId|null> }`
      );
    }

    for (const [sid, controller] of Object.entries(parsed.overrides)) {
      if (controller !== null && !CANONICAL_FACTION_IDS.includes(controller as (typeof CANONICAL_FACTION_IDS)[number])) {
        throw new Error(
          `Invalid controller for settlement ${sid}: ${controller} (must be RBiH, RS, HRHB, or null)`
        );
      }
    }

    return {
      version: parsed.version,
      overrides: parsed.overrides as Record<string, PoliticalControllerId>
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return { version: 'none', overrides: {} };
    }
    throw error;
  }
}

export async function loadSettlementsInitialMaster(
  masterPath?: string
): Promise<SettlementsInitialMaster> {
  const path = resolve(masterPath ?? 'data/source/settlements_initial_master.json');
  const content = await readFile(path, 'utf8');
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.settlements)) {
    throw new Error(
      'Invalid settlements_initial_master.json: expected { settlements: Array<{ sid, political_controller, ... }> }'
    );
  }
  return parsed as unknown as SettlementsInitialMaster;
}

/**
 * Compute initial political controllers for all settlements.
 * Uses mun1990_id for municipality logic when present; otherwise mun_code (backward compat).
 *
 * Rule hierarchy:
 * 1) Municipal Authority Inheritance: settlements inherit municipality default controller
 * 2) Settlement-Level Overrides: (future - not implemented yet)
 * 3) Null authority: only if municipality has no controller and no override applies
 *
 * @param settlementGraph Loaded settlement graph (prefer settlements_index_1990.json so mun1990_id is set)
 * @param municipalityMapping Municipality->controller mapping (keys = mun1990_id when using 1990 logic)
 */
export function computeInitialPoliticalControllers(
  settlementGraph: LoadedSettlementGraph,
  municipalityMapping: MunicipalityControllerMapping,
  overrides?: SettlementControllerOverrides
): Map<SettlementId, PoliticalControllerId> {
  const controllers = new Map<SettlementId, PoliticalControllerId>();
  const mappings = municipalityMapping.mappings;
  const settlementOverrides = overrides?.overrides ?? {};

  const sortedSettlements = Array.from(settlementGraph.settlements.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [sid, settlement] of sortedSettlements) {
    const munKey = settlement.mun1990_id ?? settlement.mun_code;
    const municipalityController = mappings[munKey];

    if (municipalityController !== undefined) {
      const override = resolveSettlementOverride(sid, settlementOverrides);
      controllers.set(sid, override ?? municipalityController);
    } else {
      throw new Error(
        `Municipality ${munKey} (${settlement.mun}) has no political controller mapping. ` +
        `Settlement: ${sid}`
      );
    }
  }

  return controllers;
}

/**
 * Build 1990-keyed controller mapping from post1995 mapping + post1995→1990 remap.
 * Used when settlements have mun1990_id (municipality logic uses 1990 opštine).
 */
export async function loadMunicipalityControllerMapping1990(
  mappingPath?: string,
  remapPath?: string
): Promise<MunicipalityControllerMapping> {
  const post1995Mapping = await loadMunicipalityControllerMapping(mappingPath);
  const remapFullPath = resolve(remapPath ?? 'data/source/municipality_post1995_to_mun1990.json');
  const remapContent = await readFile(remapFullPath, 'utf8');
  const remap = JSON.parse(remapContent) as { index_by_post1995_code?: Record<string, string> };
  const index = remap.index_by_post1995_code ?? {};
  const mappings1990: Record<string, PoliticalControllerId> = {};
  for (const [post1995_code, controller] of Object.entries(post1995Mapping.mappings)) {
    const mun1990_id = index[post1995_code];
    if (mun1990_id != null) {
      mappings1990[mun1990_id] = controller;
    }
  }
  return { version: post1995Mapping.version, mappings: mappings1990 };
}

/** Canonical faction IDs for political_controller invariant */
const CANONICAL_FACTION_IDS = ['RBiH', 'RS', 'HRHB'] as const;
const DEFAULT_START_CONTROLLER: (typeof CANONICAL_FACTION_IDS)[number] = 'RBiH';

function resolveMajorityController(candidates: readonly PoliticalControllerId[]): PoliticalControllerId {
  const counts: Record<(typeof CANONICAL_FACTION_IDS)[number], number> = {
    RBiH: 0,
    RS: 0,
    HRHB: 0
  };
  for (const c of candidates) {
    if (c === null) continue;
    if (CANONICAL_FACTION_IDS.includes(c as (typeof CANONICAL_FACTION_IDS)[number])) {
      counts[c as (typeof CANONICAL_FACTION_IDS)[number]] += 1;
    }
  }
  let best: PoliticalControllerId = null;
  let bestCount = -1;
  for (const faction of CANONICAL_FACTION_IDS) {
    const v = counts[faction];
    if (v > bestCount) {
      best = faction;
      bestCount = v;
    }
  }
  return bestCount > 0 ? best : null;
}

/**
 * Enforce non-null start controllers for all settlements.
 *
 * Resolution order (deterministic):
 * 1) Keep existing non-null values
 * 2) Municipality majority among already known settlement values
 * 3) Neighbor majority from settlement graph edges (iterative, stable SID order)
 * 4) Final deterministic fallback (RBiH) to guarantee no nulls
 */
function enforceNonNullStartControllers(
  settlementGraph: LoadedSettlementGraph,
  controllersRecord: Record<SettlementId, PoliticalControllerId>
): { coerced_from_null: number; defaulted_to_fallback: number } {
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const byMun = new Map<string, SettlementId[]>();
  for (const sid of settlementIds) {
    const settlement = settlementGraph.settlements.get(sid)!;
    const munKey = settlement.mun1990_id ?? settlement.mun_code;
    const list = byMun.get(munKey) ?? [];
    list.push(sid);
    byMun.set(munKey, list);
  }
  for (const list of byMun.values()) {
    list.sort((a, b) => a.localeCompare(b));
  }

  // Pass 1: municipality-majority fallback.
  for (const sid of settlementIds) {
    if (controllersRecord[sid] !== null) continue;
    const settlement = settlementGraph.settlements.get(sid)!;
    const munKey = settlement.mun1990_id ?? settlement.mun_code;
    const munSids = byMun.get(munKey) ?? [];
    const munControllers = munSids
      .map((s) => controllersRecord[s])
      .filter((v): v is Exclude<PoliticalControllerId, null> => v !== null);
    const majority = resolveMajorityController(munControllers);
    if (majority !== null) {
      controllersRecord[sid] = majority;
    }
  }

  const adjacency = new Map<SettlementId, SettlementId[]>();
  for (const sid of settlementIds) {
    adjacency.set(sid, []);
  }
  for (const edge of settlementGraph.edges) {
    if (adjacency.has(edge.a as SettlementId) && adjacency.has(edge.b as SettlementId)) {
      adjacency.get(edge.a as SettlementId)!.push(edge.b as SettlementId);
      adjacency.get(edge.b as SettlementId)!.push(edge.a as SettlementId);
    }
  }
  for (const sid of settlementIds) {
    adjacency.get(sid)!.sort((a, b) => a.localeCompare(b));
  }

  // Pass 2: neighbor-majority propagation until fixed point.
  let changed = true;
  while (changed) {
    changed = false;
    for (const sid of settlementIds) {
      if (controllersRecord[sid] !== null) continue;
      const neighborControllers = (adjacency.get(sid) ?? [])
        .map((n) => controllersRecord[n])
        .filter((v): v is Exclude<PoliticalControllerId, null> => v !== null);
      const majority = resolveMajorityController(neighborControllers);
      if (majority !== null) {
        controllersRecord[sid] = majority;
        changed = true;
      }
    }
  }

  let coerced_from_null = 0;
  let defaulted_to_fallback = 0;
  for (const sid of settlementIds) {
    if (controllersRecord[sid] !== null) continue;
    controllersRecord[sid] = DEFAULT_START_CONTROLLER;
    coerced_from_null += 1;
    defaulted_to_fallback += 1;
  }
  return { coerced_from_null, defaulted_to_fallback };
}

/**
 * Load canonical mun1990→controller mapping from Phase C3 derived file.
 * Format: { task, controllers_by_mun1990_id: { mun1990_id: FactionId|null } }
 * Fails loudly if file is missing or invalid.
 */
export async function loadCanonicalMunicipalityControllers1990(
  mappingPath?: string
): Promise<Record<string, PoliticalControllerId>> {
  const path = resolve(mappingPath ?? 'data/derived/municipality_political_controllers_1990.json');
  const content = await readFile(path, 'utf8');
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed) || !isRecord(parsed.controllers_by_mun1990_id)) {
    throw new Error(
      `Invalid municipality_political_controllers_1990.json: expected { controllers_by_mun1990_id: Record<string, FactionId|null> }`
    );
  }

  const mapping = parsed.controllers_by_mun1990_id as Record<string, unknown>;
  for (const [mun1990_id, controller] of Object.entries(mapping)) {
    if (
      controller !== null &&
      (typeof controller !== 'string' || !CANONICAL_FACTION_IDS.includes(controller as (typeof CANONICAL_FACTION_IDS)[number]))
    ) {
      throw new Error(
        `Invalid controller for mun1990_id ${mun1990_id}: ${JSON.stringify(controller)} (must be RBiH, RS, HRHB, or null)`
      );
    }
  }

  return mapping as Record<string, PoliticalControllerId>;
}

/**
 * Load initial municipality political controllers from Phase E5 canonical source.
 * Format: { meta, controllers_by_mun1990_id: { mun1990_id: FactionId|null } }
 * Fails loudly if file is missing or invalid. Used for initialization only.
 */
export async function loadInitialMunicipalityControllers1990(
  mappingPath?: string
): Promise<Record<string, PoliticalControllerId>> {
  const path = resolve(mappingPath ?? 'data/source/municipalities_1990_initial_political_controllers.json');
  const content = await readFile(path, 'utf8');
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed) || !isRecord(parsed.controllers_by_mun1990_id)) {
    throw new Error(
      `Invalid municipalities_1990_initial_political_controllers.json: expected { controllers_by_mun1990_id: Record<string, FactionId|null> }`
    );
  }

  const mapping = parsed.controllers_by_mun1990_id as Record<string, unknown>;
  for (const [mun1990_id, controller] of Object.entries(mapping)) {
    if (
      controller !== null &&
      (typeof controller !== 'string' || !CANONICAL_FACTION_IDS.includes(controller as (typeof CANONICAL_FACTION_IDS)[number]))
    ) {
      throw new Error(
        `Invalid controller for mun1990_id ${mun1990_id}: ${JSON.stringify(controller)} (must be RBiH, RS, HRHB, or null)`
      );
    }
  }

  return mapping as Record<string, PoliticalControllerId>;
}

/**
 * Phase E1: Deterministic audit summary (counts per controller, total).
 * Zero randomness, no timestamps.
 */
export function computePoliticalControlAudit(
  controllers: Record<SettlementId, PoliticalControllerId>
): { total: number; by_controller: Record<string, number> } {
  const by_controller: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
  let total = 0;
  for (const controller of Object.values(controllers)) {
    const key = controller === null ? 'null' : controller;
    by_controller[key] = (by_controller[key] ?? 0) + 1;
    total += 1;
  }
  return { total, by_controller };
}

/** Phase E2: Return contract for idempotent political control initialization */
export interface PoliticalControlInitResult {
  applied: boolean;
  reason_if_not_applied?: string;
  counts?: { total: number; RBiH: number; RS: number; HRHB: number; null: number };
}

/** Options for ethnic/hybrid init modes (additive to canon; scenario-configured). */
export interface PoliticalControlInitOptions {
  init_control_mode?: 'institutional' | 'ethnic_1991' | 'hybrid_1992';
  ethnic_override_threshold?: number;
  /** Optional path to settlement_ethnicity_data.json (e.g. when baseDir is set so cwd-relative path is wrong). */
  ethnicity_data_path?: string;
}

/**
 * Detect if parsed JSON is a mun1990-only control file (controllers_by_mun1990_id, no settlements array).
 * Used to choose init path when mappingPath is provided (Option A scenario-specific control).
 */
function isMun1990OnlyControlFile(parsed: unknown): parsed is { controllers_by_mun1990_id: Record<string, unknown> } {
  return isRecord(parsed) && isRecord(parsed.controllers_by_mun1990_id) && !Array.isArray(parsed.settlements);
}

/**
 * Resolve settlement id to canonical S-prefixed form for ethnicity lookup.
 * Ethnicity data is keyed by S+census_id (e.g. S100013). Graph may use S100013 or mun:source_id (e.g. 10014:100013).
 */
function sidToEthnicityKey(sid: string): string {
  if (sid.startsWith('S')) return sid;
  if (sid.includes(':')) {
    const tail = sid.split(':').pop();
    return tail ? `S${tail}` : sid;
  }
  return `S${sid}`;
}

/**
 * Initialize political control from 1991 ethnic majority per settlement (ethnic_1991 mode).
 * Deterministic: stable SID ordering. Unknown/other → null, then enforceNonNullStartControllers.
 * Uses ethnicity_data_path when provided (e.g. desktop with baseDir). Lookup by sid or S-prefixed census id.
 */
async function initializePoliticalControllersFromEthnic1991(
  state: GameState,
  settlementGraph: LoadedSettlementGraph,
  ethnicityDataPath?: string
): Promise<PoliticalControlInitResult> {
  const ethnicityData = await loadSettlementEthnicityData(ethnicityDataPath);
  const bySid = ethnicityData.by_settlement_id ?? {};
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const controllersRecord: Record<SettlementId, PoliticalControllerId> = {};
  const contestedRecord: Record<SettlementId, boolean> = {};
  const municipalityStatus = new Map<string, 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'>();

  for (const sid of settlementIds) {
    const settlement = settlementGraph.settlements.get(sid)!;
    const mun1990Id = settlement.mun1990_id ?? settlement.mun_code;
    const ethnicityKey = sidToEthnicityKey(sid);
    const entry = (bySid[sid] ?? bySid[ethnicityKey]) as SettlementEthnicityEntry | undefined;
    const controller = entry ? majorityToFaction(entry.majority) : null;
    controllersRecord[sid] = controller;
    contestedRecord[sid] = false;
    municipalityStatus.set(mun1990Id, 'SECURE');
  }
  applyRbihAlignedMunicipalityOverrides(controllersRecord, settlementGraph);
  const coercion = enforceNonNullStartControllers(settlementGraph, controllersRecord);

  state.political_controllers = controllersRecord;
  state.contested_control = contestedRecord;
  if (!state.municipalities) state.municipalities = {};
  const sortedMunicipalities = Array.from(municipalityStatus.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [munId, control_status] of sortedMunicipalities) {
    if (!state.municipalities[munId]) state.municipalities[munId] = {};
    state.municipalities[munId].control_status = control_status;
    state.municipalities[munId].control = controlStatusToAuthority(control_status);
  }

  const audit = computePoliticalControlAudit(controllersRecord);
  const counts = {
    total: audit.total,
    RBiH: audit.by_controller.RBiH ?? 0,
    RS: audit.by_controller.RS ?? 0,
    HRHB: audit.by_controller.HRHB ?? 0,
    null: audit.by_controller.null ?? 0
  };
  if (coercion.coerced_from_null > 0) {
    writeInitLog(
      `[E5][INFO] Coerced ${coercion.coerced_from_null} null start controllers (ethnic_1991 mode; defaults=${coercion.defaulted_to_fallback}).\n`
    );
  }
  writeInitLog(
    `[E5] Political control initialized (ethnic_1991): ${counts.total} settlements, RBiH=${counts.RBiH}, RS=${counts.RS}, HRHB=${counts.HRHB}\n`
  );
  return { applied: true, counts };
}

/**
 * Initialize political control hybrid: institutional baseline + ethnic overrides when settlement majority
 * differs from mun controller AND majority share >= threshold (default 0.70).
 */
async function initializePoliticalControllersFromHybrid1992(
  state: GameState,
  settlementGraph: LoadedSettlementGraph,
  mappingPath: string,
  ethnicOverrideThreshold: number,
  ethnicityDataPath?: string
): Promise<PoliticalControlInitResult> {
  const [mapping, ethnicityData] = await Promise.all([
    loadInitialMunicipalityControllers1990(mappingPath),
    loadSettlementEthnicityData(ethnicityDataPath)
  ]);
  const bySid = ethnicityData.by_settlement_id ?? {};
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const controllersRecord: Record<SettlementId, PoliticalControllerId> = {};
  const contestedRecord: Record<SettlementId, boolean> = {};
  const municipalityStatus = new Map<string, 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'>();

  for (const sid of settlementIds) {
    const settlement = settlementGraph.settlements.get(sid)!;
    const mun1990Id = settlement.mun1990_id ?? settlement.mun_code;
    const munController = mapping[mun1990Id];
    if (munController === undefined) {
      throw new Error(
        `Scenario init (hybrid_1992): mun1990_id ${mun1990Id} (settlement ${sid}) not in control file.`
      );
    }
    const ethnicityKey = sidToEthnicityKey(sid);
    const entry = (bySid[sid] ?? bySid[ethnicityKey]) as SettlementEthnicityEntry | undefined;
    let controller: PoliticalControllerId = munController;
    if (entry) {
      const ethnicFaction = majorityToFaction(entry.majority);
      if (ethnicFaction !== null && ethnicFaction !== munController) {
        const key = entry.majority === 'unknown' ? 'other' : entry.majority;
        const majorityShare = (entry.composition as Record<string, number>)[key] ?? 0;
        if (majorityShare >= ethnicOverrideThreshold) {
          controller = ethnicFaction;
        }
      }
    }
    controllersRecord[sid] = controller;
    contestedRecord[sid] = false;
    municipalityStatus.set(mun1990Id, 'SECURE');
  }
  applyRbihAlignedMunicipalityOverrides(controllersRecord, settlementGraph);
  const coercion = enforceNonNullStartControllers(settlementGraph, controllersRecord);

  state.political_controllers = controllersRecord;
  state.contested_control = contestedRecord;
  if (!state.municipalities) state.municipalities = {};
  const sortedMunicipalities = Array.from(municipalityStatus.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [munId, control_status] of sortedMunicipalities) {
    if (!state.municipalities[munId]) state.municipalities[munId] = {};
    state.municipalities[munId].control_status = control_status;
    state.municipalities[munId].control = controlStatusToAuthority(control_status);
  }

  const audit = computePoliticalControlAudit(controllersRecord);
  const counts = {
    total: audit.total,
    RBiH: audit.by_controller.RBiH ?? 0,
    RS: audit.by_controller.RS ?? 0,
    HRHB: audit.by_controller.HRHB ?? 0,
    null: audit.by_controller.null ?? 0
  };
  if (coercion.coerced_from_null > 0) {
    writeInitLog(
      `[E5][INFO] Coerced ${coercion.coerced_from_null} null start controllers (hybrid_1992; defaults=${coercion.defaulted_to_fallback}).\n`
    );
  }
  writeInitLog(
    `[E5] Political control initialized (hybrid_1992, threshold=${ethnicOverrideThreshold}): ${counts.total} settlements, RBiH=${counts.RBiH}, RS=${counts.RS}, HRHB=${counts.HRHB}\n`
  );
  return { applied: true, counts };
}

/**
 * Initialize political control from a municipality-only (mun1990) mapping.
 * Sets political_controllers from settlement graph + mapping; contested_control = false; control_status = SECURE per mun.
 * Phase F3: all settlements get a value (no undefined).
 */
export async function applyMunicipalityControllersFromMun1990Only(
  state: GameState,
  settlementGraph: LoadedSettlementGraph,
  mappingPath: string
): Promise<PoliticalControlInitResult> {
  const mapping = await loadInitialMunicipalityControllers1990(mappingPath);
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const controllersRecord: Record<SettlementId, PoliticalControllerId> = {};
  const contestedRecord: Record<SettlementId, boolean> = {};
  const municipalityStatus = new Map<string, 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'>();

  for (const sid of settlementIds) {
    const settlement = settlementGraph.settlements.get(sid)!;
    const mun1990Id = settlement.mun1990_id;
    if (mun1990Id == null || mun1990Id === '') {
      throw new Error(
        `Scenario init (mun1990-only): settlement ${sid} (mun: ${settlement.mun}) missing mun1990_id.`
      );
    }
    const controller = mapping[mun1990Id];
    if (controller === undefined) {
      throw new Error(
        `Scenario init (mun1990-only): mun1990_id ${mun1990Id} (settlement ${sid}) not in control file.`
      );
    }
    controllersRecord[sid] = controller;
    contestedRecord[sid] = false;
    municipalityStatus.set(mun1990Id, 'SECURE');
  }
  applyRbihAlignedMunicipalityOverrides(controllersRecord, settlementGraph);
  const coercion = enforceNonNullStartControllers(settlementGraph, controllersRecord);

  state.political_controllers = controllersRecord;
  state.contested_control = contestedRecord;
  if (!state.municipalities) state.municipalities = {};
  const sortedMunicipalities = Array.from(municipalityStatus.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [munId, control_status] of sortedMunicipalities) {
    if (!state.municipalities[munId]) {
      state.municipalities[munId] = {};
    }
    state.municipalities[munId].control_status = control_status;
    state.municipalities[munId].control = controlStatusToAuthority(control_status);
  }

  const audit = computePoliticalControlAudit(controllersRecord);
  const counts = {
    total: audit.total,
    RBiH: audit.by_controller.RBiH ?? 0,
    RS: audit.by_controller.RS ?? 0,
    HRHB: audit.by_controller.HRHB ?? 0,
    null: audit.by_controller.null ?? 0
  };
  if (coercion.coerced_from_null > 0) {
    writeInitLog(
      `[E5][INFO] Coerced ${coercion.coerced_from_null} null start controllers to non-null values (defaults=${coercion.defaulted_to_fallback}).\n`
    );
  }
  writeInitLog(
    `[E5] Political control initialized (scenario mun1990-only): ${counts.total} settlements, RBiH=${counts.RBiH}, RS=${counts.RS}, HRHB=${counts.HRHB}, null=${counts.null}\n`
  );
  return { applied: true, counts };
}

/**
 * Initialize political_controllers field in GameState.
 * Phase E1: Uses canonical settlements_index_1990.json + municipality_political_controllers_1990.json.
 * Phase E2: Idempotent. If all settlements already have political_controller set, returns applied:false.
 * Mixed (some set, some undefined) throws. Requires mun1990_id on every settlement when applying.
 * When mappingPath is provided and file has controllers_by_mun1990_id (no settlements array), uses mun1990-only path (Option A).
 * When initOptions.init_control_mode is ethnic_1991 or hybrid_1992, uses ethnicity-based init (additive to canon).
 */
export async function initializePoliticalControllers(
  state: GameState,
  settlementGraph: LoadedSettlementGraph,
  mappingPath?: string,
  initOptions?: PoliticalControlInitOptions
): Promise<PoliticalControlInitResult> {
  const settlementIds = Array.from(settlementGraph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const existing = state.political_controllers ?? {};
  let definedCount = 0;
  let undefinedCount = 0;
  for (const sid of settlementIds) {
    if (sid in existing) {
      definedCount += 1;
    } else {
      undefinedCount += 1;
    }
  }

  if (definedCount > 0 && undefinedCount > 0) {
    throw new Error(
      `Phase E2: Mixed political_controller state. ${definedCount} settlements have controller set, ${undefinedCount} are undefined. ` +
        `This indicates a bug; init must be all-or-nothing.`
    );
  }
  if (definedCount === settlementIds.length) {
    return { applied: false, reason_if_not_applied: 'already_initialized' };
  }

  const mode = initOptions?.init_control_mode;
  const ethnicityDataPath = initOptions?.ethnicity_data_path;
  if (mode === 'ethnic_1991') {
    return initializePoliticalControllersFromEthnic1991(state, settlementGraph, ethnicityDataPath);
  }
  if (mode === 'hybrid_1992') {
    const threshold = initOptions?.ethnic_override_threshold ?? 0.70;
    const path = mappingPath ?? resolve('data/source/municipalities_1990_initial_political_controllers_apr1992.json');
    return initializePoliticalControllersFromHybrid1992(state, settlementGraph, path, threshold, ethnicityDataPath);
  }

  if (mappingPath) {
    const path = resolve(mappingPath);
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    if (isMun1990OnlyControlFile(parsed)) {
      return applyMunicipalityControllersFromMun1990Only(state, settlementGraph, path);
    }
  }

  const master = await loadSettlementsInitialMaster(mappingPath);
  const masterBySid = new Map<string, SettlementInitialMasterRecord>();
  for (const entry of master.settlements) {
    if (!entry || typeof entry.sid !== 'string') {
      throw new Error('Invalid settlements_initial_master.json entry: missing sid');
    }
    masterBySid.set(entry.sid, entry);
  }

  const extraMasterSids: string[] = [];
  for (const sid of masterBySid.keys()) {
    if (!settlementGraph.settlements.has(sid)) {
      extraMasterSids.push(sid);
    }
  }
  if (extraMasterSids.length > 0) {
    throw new Error(
      `settlements_initial_master.json contains ${extraMasterSids.length} unknown settlement ids (not in settlement graph)`
    );
  }

  const controllersRecord: Record<SettlementId, PoliticalControllerId> = {};
  const contestedRecord: Record<SettlementId, boolean> = {};
  const municipalityStatus = new Map<string, { control_status: 'SECURE' | 'CONTESTED' | 'HIGHLY_CONTESTED'; stability_score?: number }>();
  for (const sid of settlementIds) {
    const entry = masterBySid.get(sid);
    if (!entry) {
      throw new Error(`settlements_initial_master.json missing settlement: ${sid}`);
    }
    const controller = entry.political_controller ?? null;
    if (
      controller !== null &&
      !CANONICAL_FACTION_IDS.includes(controller as (typeof CANONICAL_FACTION_IDS)[number])
    ) {
      throw new Error(
        `Invariant violation: settlement ${sid} has political_controller ${controller} (must be RBiH, RS, HRHB, or null)`
      );
    }
    const contested = entry.contested_control ?? false;
    if (typeof contested !== 'boolean') {
      throw new Error(`Invariant violation: settlement ${sid} has non-boolean contested_control`);
    }
    const mun1990Id = entry.mun1990_id ?? null;
    const controlStatus = entry.control_status ?? null;
    if (mun1990Id && controlStatus) {
      const existingStatus = municipalityStatus.get(mun1990Id);
      if (existingStatus && existingStatus.control_status !== controlStatus) {
        throw new Error(
          `Invariant violation: mun1990_id ${mun1990Id} has mixed control_status values in master`
        );
      }
      municipalityStatus.set(mun1990Id, {
        control_status: controlStatus,
        stability_score: typeof entry.stability_score === 'number' ? entry.stability_score : undefined,
      });
    }
    controllersRecord[sid] = controller;
    contestedRecord[sid] = contested;
  }
  applyRbihAlignedMunicipalityOverrides(controllersRecord, settlementGraph);
  const coercion = enforceNonNullStartControllers(settlementGraph, controllersRecord);
  state.political_controllers = controllersRecord;
  state.contested_control = contestedRecord;

  if (!state.municipalities) state.municipalities = {};
  const sortedMunicipalities = Array.from(municipalityStatus.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [munId, status] of sortedMunicipalities) {
    if (!state.municipalities[munId]) {
      state.municipalities[munId] = {};
    }
    state.municipalities[munId].control_status = status.control_status;
    state.municipalities[munId].control = controlStatusToAuthority(status.control_status);
    if (status.stability_score !== undefined) {
      state.municipalities[munId].stability_score = status.stability_score;
    }
  }

  const audit = computePoliticalControlAudit(controllersRecord);
  const counts = {
    total: audit.total,
    RBiH: audit.by_controller.RBiH ?? 0,
    RS: audit.by_controller.RS ?? 0,
    HRHB: audit.by_controller.HRHB ?? 0,
    null: audit.by_controller.null ?? 0
  };

  const nullSharePct = counts.total > 0 ? (100 * counts.null) / counts.total : 0;
  if (nullSharePct > 5) {
    writeInitLog(
      `[E5][WARN] null political control share is high: ${nullSharePct.toFixed(1)}% — review initial controller dataset\n`
    );
  }
  if (coercion.coerced_from_null > 0) {
    writeInitLog(
      `[E5][INFO] Coerced ${coercion.coerced_from_null} null start controllers to non-null values (defaults=${coercion.defaulted_to_fallback}).\n`
    );
  }

  writeInitLog(
    `[E5] Political control initialized (initial municipal substrate): ${counts.total} settlements, RBiH=${counts.RBiH}, RS=${counts.RS}, HRHB=${counts.HRHB}, null=${counts.null}\n`
  );

  return { applied: true, counts };
}

/**
 * Compute initial political controllers using mun1990_id lookup.
 * Phase E1: When use1990 is true, every settlement MUST have mun1990_id; every mun1990_id MUST be in mapping.
 */
function computeInitialPoliticalControllersFromMun1990(
  settlementGraph: LoadedSettlementGraph,
  mapping: Record<string, PoliticalControllerId>,
  use1990: boolean,
  overrides?: SettlementControllerOverrides
): Map<SettlementId, PoliticalControllerId> {
  const controllers = new Map<SettlementId, PoliticalControllerId>();
  const settlementOverrides = overrides?.overrides ?? {};
  const sortedSettlements = Array.from(settlementGraph.settlements.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [sid, settlement] of sortedSettlements) {
    const munKey = use1990 ? settlement.mun1990_id : settlement.mun_code;
    if (use1990 && (munKey == null || munKey === '')) {
      throw new Error(
        `Phase E1: Settlement ${sid} (mun: ${settlement.mun}) missing mun1990_id. ` +
          `settlements_index_1990.json must have mun1990_id for all settlements.`
      );
    }
    const municipalityController = mapping[munKey!];
    if (municipalityController === undefined) {
      throw new Error(
        `Phase E1: mun1990_id ${munKey} (settlement ${sid}) not in municipality_political_controllers_1990.json. ` +
          `This should not happen after Phase D0.`
      );
    }
    const override = resolveSettlementOverride(sid, settlementOverrides);
    controllers.set(sid, override ?? municipalityController);
  }

  return controllers;
}

function resolveSettlementOverride(
  sid: SettlementId,
  overrides: Record<string, PoliticalControllerId>
): PoliticalControllerId | undefined {
  if (sid in overrides) {
    return overrides[sid];
  }
  const parts = sid.split(':');
  if (parts.length > 2) {
    const base = `${parts[0]}:${parts[1]}`;
    if (base in overrides) {
      return overrides[base];
    }
  }
  return undefined;
}

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
