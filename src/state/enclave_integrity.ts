import { createHash } from 'node:crypto';
import type { GameState, EnclaveState, FactionId, MunicipalityId, SettlementId } from './game_state.js';
import type { LoadedSettlementGraph, EdgeRecord } from '../map/settlements.js';
import type { SupplyStateDerivationReport, SupplyStateLevel } from './supply_state_derivation.js';
import { buildAdjacencyMap } from '../map/adjacency_map.js';

export const SUPPLY_INTEGRITY_WEIGHT = 0.4;
export const AUTHORITY_INTEGRITY_WEIGHT = 0.3;
export const POPULATION_INTEGRITY_WEIGHT = 0.2;
export const CONNECTIVITY_INTEGRITY_WEIGHT = 0.1;
export const INTEGRITY_DECAY_RATE = 0.02;
export const HUMANITARIAN_PRESSURE_MULTIPLIER = 1.0;
export const CAPITAL_ENCLAVE_VISIBILITY = 3.0;
export const INTEGRITY_COLLAPSE_THRESHOLD = 0.1;
export const SARAJEVO_MUN_IDS: MunicipalityId[] = [
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo',
  'ilidza',
  'vogosca',
  'ilijas',
  'hadzici'
];
export const SARAJEVO_INTEGRITY_FLOOR = 0.15;
export const SARAJEVO_DEGRADATION_RATE = 0.5;
export const SARAJEVO_PRESSURE_MULTIPLIER = 3.0;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function hashEnclaveId(factionId: FactionId, settlementIds: SettlementId[]): string {
  const raw = `${factionId}:${settlementIds.join('|')}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 12);
}

function supplyStateToScore(state: SupplyStateLevel): number {
  if (state === 'adequate') return 1;
  if (state === 'strained') return 0.5;
  return 0;
}

function getSettlementSupplyState(
  supplyReport: SupplyStateDerivationReport | undefined,
  factionId: FactionId,
  sid: SettlementId
): SupplyStateLevel | null {
  if (!supplyReport) return null;
  const entry = supplyReport.factions.find((f) => f.faction_id === factionId);
  if (!entry) return null;
  const found = entry.by_settlement.find((s) => s.sid === sid);
  return found?.state ?? null;
}

function getMunicipalityIdForSettlement(graph: LoadedSettlementGraph, sid: SettlementId): MunicipalityId | null {
  const rec = graph.settlements.get(sid);
  if (!rec) return null;
  return (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
}

function getPopulationFractionForMun(state: GameState, munId: MunicipalityId | null): number {
  if (!munId) return 1;
  const disp = state.displacement_state?.[munId];
  if (!disp || disp.original_population <= 0) return 1;
  const effective =
    disp.original_population - disp.displaced_out - disp.lost_population + disp.displaced_in;
  return clamp01(effective / disp.original_population);
}

function getAuthorityForMun(state: GameState, munId: MunicipalityId | null): number {
  if (!munId) return 0.5;
  const value = state.municipalities?.[munId]?.authority;
  if (typeof value !== 'number') return 0.5;
  return clamp01(value);
}

function computeConnectivityScore(
  component: SettlementId[],
  adjacency: Record<string, string[]>
): number {
  if (component.length <= 1) return 0.4;
  const componentSet = new Set(component);
  let internalEdges = 0;
  let possibleEdges = 0;
  for (const sid of component) {
    const neighbors = adjacency[sid] ?? [];
    for (const n of neighbors) {
      if (componentSet.has(n)) internalEdges += 1;
    }
    possibleEdges += neighbors.length;
  }
  if (possibleEdges === 0) return 0.4;
  const ratio = internalEdges / possibleEdges;
  return clamp01(ratio);
}

function findComponents(
  nodes: SettlementId[],
  adjacency: Record<string, string[]>
): SettlementId[][] {
  const remaining = new Set(nodes);
  const components: SettlementId[][] = [];
  while (remaining.size > 0) {
    const start = remaining.values().next().value as SettlementId;
    remaining.delete(start);
    const queue: SettlementId[] = [start];
    const component: SettlementId[] = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const neighbors = adjacency[cur] ?? [];
      for (const n of neighbors) {
        if (!remaining.has(n)) continue;
        remaining.delete(n);
        queue.push(n);
        component.push(n);
      }
    }
    component.sort((a, b) => a.localeCompare(b));
    components.push(component);
  }
  components.sort((a, b) => a[0].localeCompare(b[0]));
  return components;
}

export interface EnclaveIntegrityReport {
  enclaves: EnclaveState[];
  humanitarian_pressure_total: number;
}

export function updateEnclaveIntegrity(
  state: GameState,
  graph: LoadedSettlementGraph,
  edges: EdgeRecord[],
  supplyReport: SupplyStateDerivationReport | undefined
): EnclaveIntegrityReport {
  const adjacency = buildAdjacencyMap(edges);
  const controllers = state.political_controllers ?? {};
  const factions = state.factions.map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const enclaves: EnclaveState[] = [];

  for (const factionId of factions) {
    const controlledCritical: SettlementId[] = [];
    for (const [sid, controller] of Object.entries(controllers)) {
      if (controller !== factionId) continue;
      const supplyState = getSettlementSupplyState(supplyReport, factionId, sid as SettlementId);
      if (supplyState === 'critical') {
        controlledCritical.push(sid as SettlementId);
      }
    }
    if (controlledCritical.length === 0) continue;
    controlledCritical.sort((a, b) => a.localeCompare(b));
    const components = findComponents(controlledCritical, adjacency);
    for (const component of components) {
      const munIds = component
        .map((sid) => getMunicipalityIdForSettlement(graph, sid))
        .filter((id): id is MunicipalityId => id != null);
      const authorityAvg =
        munIds.length > 0
          ? munIds.reduce((sum, id) => sum + getAuthorityForMun(state, id), 0) / munIds.length
          : 0.5;
      const populationAvg =
        munIds.length > 0
          ? munIds.reduce((sum, id) => sum + getPopulationFractionForMun(state, id), 0) / munIds.length
          : 1.0;

      const supplyScore = 0;
      const connectivityScore = computeConnectivityScore(component, adjacency);
      const baseIntegrity =
        supplyScore * SUPPLY_INTEGRITY_WEIGHT +
        authorityAvg * AUTHORITY_INTEGRITY_WEIGHT +
        populationAvg * POPULATION_INTEGRITY_WEIGHT +
        connectivityScore * CONNECTIVITY_INTEGRITY_WEIGHT;

      const isSarajevo = munIds.some((id) => SARAJEVO_MUN_IDS.includes(id));
      const decayRate = isSarajevo ? INTEGRITY_DECAY_RATE * SARAJEVO_DEGRADATION_RATE : INTEGRITY_DECAY_RATE;
      const visibilityMult = isSarajevo ? CAPITAL_ENCLAVE_VISIBILITY : 1.0;
      const pressureMult = isSarajevo ? SARAJEVO_PRESSURE_MULTIPLIER : HUMANITARIAN_PRESSURE_MULTIPLIER;

      const prev = state.enclaves?.find((e) => e.faction_id === factionId && e.settlement_ids[0] === component[0]);
      const prevIntegrity = prev?.integrity ?? baseIntegrity;
      const siegeDuration = (prev?.siege_duration ?? 0) + 1;
      const decayed =
        siegeDuration > 4 && baseIntegrity < 0.7 ? Math.max(0, prevIntegrity - decayRate) : baseIntegrity;
      const integrity = isSarajevo ? Math.max(decayed, SARAJEVO_INTEGRITY_FLOOR) : decayed;

      const populationWeight = clamp01(populationAvg);
      const humanitarianPressure = clamp01((1 - integrity) * populationWeight * visibilityMult * pressureMult);
      const collapsed = integrity <= INTEGRITY_COLLAPSE_THRESHOLD;

      const enclave: EnclaveState = {
        id: `ENCL_${hashEnclaveId(factionId, component)}`,
        faction_id: factionId,
        settlement_ids: component,
        integrity,
        components: {
          supply: supplyScore,
          authority: clamp01(authorityAvg),
          population: clamp01(populationAvg),
          connectivity: clamp01(connectivityScore)
        },
        humanitarian_pressure: humanitarianPressure,
        siege_duration: siegeDuration,
        collapsed
      };
      enclaves.push(enclave);
    }
  }

  enclaves.sort((a, b) => a.id.localeCompare(b.id));
  state.enclaves = enclaves;
  const humanitarian_pressure_total = enclaves.reduce((sum, e) => sum + e.humanitarian_pressure, 0);
  return { enclaves, humanitarian_pressure_total };
}
