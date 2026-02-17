/**
 * Phase I: Militia pool population from phase_i_militia_strength and displacement.
 * Plan: militia_and_brigade_formation_system.
 * Deterministic: mun_id then faction sorted; displaced contribution by controller.
 */

import type {
  GameState,
  FactionId,
  MunicipalityId,
  MilitiaPoolState,
  DisplacementState
} from '../../state/game_state.js';
import type { SettlementRecord } from '../../map/settlements.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Scale phase_i_militia_strength [0,100] to pool available (integer).
 * Raised for long-horizon (52w/104w) personnel growth calibration while keeping deterministic flow. */
const POOL_SCALE_FACTOR = 65;
/** Displaced_in contribution rate (design note). */
const REINFORCEMENT_RATE = 0.05;
/** Cap per mun per turn from displaced (design note). */
const DISPLACED_CONTRIBUTION_CAP = 2000;

/** When population1991 is used, pool is weighted by eligible pop / this normalizer (no cap). Aim: ARBiH ~80–100 brigades at batchSize 1000. */
const ELIGIBLE_POP_NORMALIZER = 50_000;

/** Faction asymmetry calibration for early-war manpower envelopes.
 * Reflects mobilization capacity: ARBiH largest (Bosniak plurality), VRS JNA inheritance,
 * HVO smallest but ~30-40k historical. HRHB scale is higher because Croat population
 * is concentrated in fewer municipalities — each HVO-controlled mun mobilized proportionally
 * more of its population (near-total male mobilization in western Herzegovina). */
const FACTION_POOL_SCALE: Record<string, number> = {
  RBiH: 1.20,
  RS: 1.15,
  HRHB: 1.60
};
const DEFAULT_FACTION_POOL_SCALE = 1.0;

export type MunicipalityPopulation1991Map = Record<
  string,
  { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

function getEligiblePopulation(
  pop: MunicipalityPopulation1991Map | undefined,
  munId: string,
  factionId: string
): number {
  if (!pop) return ELIGIBLE_POP_NORMALIZER;
  const entry = pop[munId];
  if (!entry) return ELIGIBLE_POP_NORMALIZER;
  if (factionId === 'RBiH') return entry.bosniak;
  if (factionId === 'RS') return entry.serb;
  if (factionId === 'HRHB') return entry.croat;
  return ELIGIBLE_POP_NORMALIZER;
}

/** Faction-eligible 1991 population in mun (for demographic gating). Returns 0 when no data or no entry. */
export function getEligiblePopulationCount(
  pop: MunicipalityPopulation1991Map | undefined,
  munId: string,
  factionId: string
): number {
  if (!pop) return 0;
  const entry = pop[munId];
  if (!entry) return 0;
  if (factionId === 'RBiH') return entry.bosniak;
  if (factionId === 'RS') return entry.serb;
  if (factionId === 'HRHB') return entry.croat;
  return 0;
}

/** RBiH cross-ethnic rule: Serbs and Croats contribute 10–15% to RBiH pool (MILITIA_BRIGADE_FORMATION_DESIGN §3). */
const RBIH_CROSS_ETHNIC_SHARE = 0.12;
/** RBiH cross-ethnic cap per mun per turn. */
const RBIH_CROSS_ETHNIC_CAP_PER_MUN = 500;

export interface PoolPopulationReport {
  pools_updated: number;
  pools_created: number;
  displaced_contributions: number;
  rbih_10pct_additions?: number;
}

function getMunicipalityController(
  state: GameState,
  sids: string[]
): FactionId | null {
  const counts: Record<string, number> = {};
  for (const sid of sids) {
    const c = state.political_controllers?.[sid] ?? null;
    const key = c ?? '_null_';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = key === '_null_' ? null : key;
    }
  }
  return best as FactionId | null;
}

/**
 * Build mun_id -> settlement ids from settlements map. Deterministic: sids sorted per mun.
 */
function buildSettlementsByMun(
  settlements: Map<string, SettlementRecord>
): Map<MunicipalityId, string[]> {
  const byMun = new Map<MunicipalityId, string[]>();
  for (const [sid, rec] of settlements.entries()) {
    const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
    const list = byMun.get(munId) ?? [];
    list.push(sid);
    byMun.set(munId, list);
  }
  for (const list of byMun.values()) {
    list.sort(strictCompare);
  }
  return byMun;
}

/**
 * Update militia_pools from phase_i_militia_strength and (optionally) displaced_in.
 * Uses composite key "mun_id:faction". Does not decrease available; only adds or sets from strength.
 * When population1991ByMun is provided, pool available is weighted by eligible population (bosniak/serb/croat)
 * so that brigade counts reflect demographics — ARBiH gets most where Bosniaks are, etc.
 * Preserves committed, exhausted, updated_turn.
 */
export function runPoolPopulation(
  state: GameState,
  settlements: Map<string, SettlementRecord>,
  population1991ByMun?: MunicipalityPopulation1991Map
): PoolPopulationReport {
  const report: PoolPopulationReport = {
    pools_updated: 0,
    pools_created: 0,
    displaced_contributions: 0
  };
  let rbih10pctTotal = 0;

  if (!state.militia_pools || typeof state.militia_pools !== 'object') {
    (state as GameState & { militia_pools: Record<string, MilitiaPoolState> }).militia_pools = {};
  }
  const pools = state.militia_pools as Record<string, MilitiaPoolState>;
  const currentTurn = state.meta.turn;
  const strengthMap = state.phase_i_militia_strength ?? {};
  const municipalities = state.municipalities ?? {};
  const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
  const factionIds: FactionId[] = (state.factions ?? [])
    .map((f) => f.id)
    .filter((x): x is FactionId => typeof x === 'string')
    .slice()
    .sort(strictCompare);

  // 1) From phase_i_militia_strength: ensure (mun_id, faction) pools and set available
  for (const munId of munIds) {
    const byFaction = strengthMap[munId] ?? {};
    for (const factionId of factionIds) {
      const strength = byFaction[factionId] ?? 0;
      if (strength <= 0) continue;

      const eligiblePop = getEligiblePopulation(population1991ByMun, munId, factionId);
      const populationWeight =
        population1991ByMun != null ? eligiblePop / ELIGIBLE_POP_NORMALIZER : 1;
      const factionScale = FACTION_POOL_SCALE[factionId] ?? DEFAULT_FACTION_POOL_SCALE;

      const key = militiaPoolKey(munId, factionId);
      const existing = pools[key];
      let derivedAvailable = Math.floor(strength * POOL_SCALE_FACTOR * populationWeight * factionScale);
      const authorityState = state.municipalities?.[munId]?.control ?? 'consolidated';
      if (authorityState === 'contested') derivedAvailable = Math.floor(derivedAvailable * 0.85);
      else if (authorityState === 'fragmented') derivedAvailable = Math.floor(derivedAvailable * 0.7);
      const newAvailable = existing
        ? Math.max(existing.available, derivedAvailable)
        : derivedAvailable;

      if (existing) {
        if (newAvailable > existing.available) {
          existing.available = newAvailable;
          existing.updated_turn = currentTurn;
          report.pools_updated += 1;
        }
      } else {
        pools[key] = {
          mun_id: munId,
          faction: factionId,
          available: newAvailable,
          committed: 0,
          exhausted: 0,
          updated_turn: currentTurn
        };
        report.pools_created += 1;
      }
    }
  }

  // 2) Displaced contribution: add to pool per mun. When displaced_in_by_faction is set (ethnicity-traced), add per faction; else add all displaced_in to controlling faction's pool.
  const displacement = state.displacement_state ?? {};
  const displacementMunIds = (Object.keys(displacement) as MunicipalityId[]).slice().sort(strictCompare);
  const settlementsByMun = buildSettlementsByMun(settlements);

  for (const munId of displacementMunIds) {
    const disp = displacement[munId] as DisplacementState | undefined;
    if (!disp || disp.displaced_in <= 0) continue;

    const sids = settlementsByMun.get(munId);
    if (!sids?.length) continue;

    const byFaction = disp.displaced_in_by_faction;
    if (byFaction && typeof byFaction === 'object') {
      for (const factionId of (Object.keys(byFaction) as FactionId[]).sort(strictCompare)) {
        const displacedForFaction = byFaction[factionId];
        if (displacedForFaction == null || displacedForFaction <= 0) continue;
        const contribution = Math.min(
          Math.floor(displacedForFaction * REINFORCEMENT_RATE),
          DISPLACED_CONTRIBUTION_CAP
        );
        if (contribution <= 0) continue;
        const key = militiaPoolKey(munId, factionId);
        const pool = pools[key];
        if (pool) {
          pool.available += contribution;
          pool.updated_turn = currentTurn;
          report.displaced_contributions += 1;
        } else {
          pools[key] = {
            mun_id: munId,
            faction: factionId,
            available: contribution,
            committed: 0,
            exhausted: 0,
            updated_turn: currentTurn
          };
          report.pools_created += 1;
          report.displaced_contributions += 1;
        }
      }
    } else {
      const controller = getMunicipalityController(state, sids);
      if (!controller) continue;
      const contribution = Math.min(
        Math.floor(disp.displaced_in * REINFORCEMENT_RATE),
        DISPLACED_CONTRIBUTION_CAP
      );
      if (contribution <= 0) continue;
      const key = militiaPoolKey(munId, controller);
      const pool = pools[key];
      if (pool) {
        pool.available += contribution;
        pool.updated_turn = currentTurn;
        report.displaced_contributions += 1;
      } else {
        pools[key] = {
          mun_id: munId,
          faction: controller,
          available: contribution,
          committed: 0,
          exhausted: 0,
          updated_turn: currentTurn
        };
        report.pools_created += 1;
        report.displaced_contributions += 1;
      }
    }
  }

  // 3) RBiH 10% rule: when at least one RBiH brigade exists, add up to 10% of non-Bosniak eligible from RBiH-controlled muns to RBiH pools (design §3)
  const formations = state.formations ?? {};
  const hasRBiHBrigade = Object.values(formations).some(
    (f) => f && typeof f === 'object' && (f as { faction?: string; kind?: string }).faction === 'RBiH' && (f as { kind?: string }).kind === 'brigade'
  );
  if (hasRBiHBrigade && population1991ByMun) {
    for (const munId of munIds) {
      const sids = settlementsByMun.get(munId);
      if (!sids?.length) continue;
      const controller = getMunicipalityController(state, sids);
      if (controller !== 'RBiH') continue;
      const entry = population1991ByMun[munId];
      if (!entry) continue;
      const nonBosniak = entry.serb + entry.croat + entry.other;
      if (nonBosniak <= 0) continue;
      const rawContribution = Math.floor(
        (nonBosniak / ELIGIBLE_POP_NORMALIZER) * POOL_SCALE_FACTOR * RBIH_CROSS_ETHNIC_SHARE
      );
      const contribution = Math.min(rawContribution, RBIH_CROSS_ETHNIC_CAP_PER_MUN);
      if (contribution <= 0) continue;
      const key = militiaPoolKey(munId, 'RBiH');
      const pool = pools[key];
      if (pool) {
        pool.available += contribution;
        pool.updated_turn = currentTurn;
      } else {
        pools[key] = {
          mun_id: munId,
          faction: 'RBiH',
          available: contribution,
          committed: 0,
          exhausted: 0,
          updated_turn: currentTurn
        };
        report.pools_created += 1;
      }
      rbih10pctTotal += contribution;
    }
    if (rbih10pctTotal > 0) report.rbih_10pct_additions = rbih10pctTotal;
  }

  return report;
}
