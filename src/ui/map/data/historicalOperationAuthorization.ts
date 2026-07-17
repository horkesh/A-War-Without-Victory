import type { LoadedGameState } from './types';
import {
  _ALL_PRE_PLANNED,
} from '../../../sim/combat/pre_planned_operations.js';
import { _TRIGGERED_OPS } from '../../../sim/combat/triggered_operations.js';
import { getOsidDisplayName } from '../utils/osidDisplayName.js';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText.js';

export interface HistoricalOperationAuthorizationView {
  kind: 'preplanned' | 'triggered' | 'army_hq';
  corpsId: string;
  operationName: string;
}

export type PendingProposalReview = NonNullable<LoadedGameState['pendingProposalReviews']>[number];

export function isResolvedProposalReview(review: PendingProposalReview): boolean {
  return review.accepted != null
    || review.resolved_turn != null
    || review.opportunity_decision != null;
}

export function parseHistoricalOperationAuthorizationAction(
  action: string | null | undefined,
): HistoricalOperationAuthorizationView | null {
  const prefix = 'HISTORICAL_OP:';
  if (typeof action !== 'string' || !action.startsWith(prefix)) return null;
  const parts = action.slice(prefix.length).split(':');
  const kind = parts[0];
  const corpsId = parts[1];
  const operationName = parts.slice(2).join(':').trim();
  if (
    (kind !== 'preplanned' && kind !== 'triggered' && kind !== 'army_hq')
    || !corpsId
    || !operationName
  ) {
    return null;
  }
  return { kind, corpsId, operationName };
}

export interface HistoricalOperationAuthorizationDetails {
  command: string;
  commander: string;
  force: string | null;
  axes: string | null;
  objectiveSummary: string | null;
  staging: string | null;
  timing: string | null;
  launchFloor: string | null;
  source: string | null;
  planSummary: string | null;
  operationScopedAssist: boolean;
}

interface OperationDetailAxis {
  name: string;
  brigades: readonly string[];
  objectives: readonly string[];
  staging_osid?: string;
}

interface OperationDetailDef {
  name: string;
  axes: readonly OperationDetailAxis[];
  staging_osid: string;
  available_from?: number;
  planning_duration?: number;
  min_attack_outcome?: string;
}

interface OperationDefinitionMatch {
  def: OperationDetailDef;
  source: string;
}

function findOperationDefinition(
  historicalOp: HistoricalOperationAuthorizationView,
): OperationDefinitionMatch | null {
  if (historicalOp.kind === 'preplanned') {
    const def = _ALL_PRE_PLANNED.find((candidate) =>
      candidate.corps === historicalOp.corpsId
      && candidate.name === historicalOp.operationName,
    );
    return def ? { def, source: 'scenario pre-planned operation definition' } : null;
  }

  if (historicalOp.kind === 'triggered') {
    const triggered = _TRIGGERED_OPS.find((candidate) =>
      candidate.primary_corps === historicalOp.corpsId
      && candidate.name === historicalOp.operationName,
    );
    return triggered ? { def: triggered, source: 'scenario triggered-operation definition' } : null;
  }

  const armyHq = _TRIGGERED_OPS.find((candidate) =>
    candidate.army_hq_op_id != null
    && candidate.primary_corps === historicalOp.corpsId
    && candidate.name === historicalOp.operationName,
  );
  return armyHq ? { def: armyHq, source: 'scenario Army HQ operation definition' } : null;
}

function humanizeRank(rank: string | null | undefined): string {
  const clean = (rank ?? '').trim().replace(/[_-]+/g, ' ');
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function commanderLabel(
  state: LoadedGameState,
  corpsId: string,
): string {
  const commander = [...(state.namedOfficerData ?? [])]
    .filter((officer) =>
      officer.assigned_corps_id === corpsId
      && officer.status === 'active',
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!commander) return 'not assigned in current save';
  const rank = humanizeRank(commander.rank);
  return rank ? `${rank} ${commander.name}` : commander.name;
}

function commandLabel(state: LoadedGameState, corpsId: string): string {
  const formation = state.formations.find((candidate) => candidate.id === corpsId);
  const rawName = state.rawGameState?.military?.formations?.[corpsId]?.name;
  const name = formation?.name ?? (typeof rawName === 'string' ? rawName : undefined);
  return getPlayerSafeCorpsName(name ?? corpsId, corpsId, corpsId);
}

function uniqueOperationFormationIds(def: OperationDetailDef): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const axis of def.axes) {
    for (const id of axis.brigades) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function forceLabel(state: LoadedGameState, def: OperationDetailDef): string | null {
  const assignedIds = uniqueOperationFormationIds(def);
  if (assignedIds.length === 0) return null;

  const formationById = new Map(state.formations.map((formation) => [formation.id, formation]));
  let reportedPersonnel = 0;
  for (const id of assignedIds) {
    const personnel = formationById.get(id)?.personnel;
    if (typeof personnel === 'number' && Number.isFinite(personnel) && personnel > 0) {
      reportedPersonnel += personnel;
    }
  }

  if (reportedPersonnel > 0) {
    return `${assignedIds.length} assigned formations; ${reportedPersonnel.toLocaleString('en-US')} reported personnel`;
  }
  return `${assignedIds.length} assigned formations`;
}

function axisObjectiveChain(
  axis: OperationDetailAxis,
  osidNameMap: Record<string, string> | null | undefined,
): string {
  const objectives = axis.objectives.map((objective) => getOsidDisplayName(objective, osidNameMap ?? null));
  return objectives.length > 0
    ? `${axis.name}: ${objectives.join(' -> ')}`
    : axis.name;
}

function objectiveSummary(
  def: OperationDetailDef,
  osidNameMap: Record<string, string> | null | undefined,
): string | null {
  const chains = def.axes.map((axis) => axisObjectiveChain(axis, osidNameMap));
  return chains.length > 0 ? chains.join('; ') : null;
}

function axesLabel(def: OperationDetailDef): string | null {
  const axes = def.axes.map((axis) => axis.name).filter((name) => name.trim().length > 0);
  return axes.length > 0 ? axes.join(', ') : null;
}

function stagingLabel(
  def: OperationDetailDef,
  osidNameMap: Record<string, string> | null | undefined,
): string | null {
  const staging = def.staging_osid || def.axes.find((axis) => axis.staging_osid)?.staging_osid;
  return staging ? getOsidDisplayName(staging, osidNameMap ?? null) : null;
}

function timingLabel(state: LoadedGameState, def: OperationDetailDef): string {
  const turn = typeof state.turn === 'number' && Number.isFinite(state.turn) ? state.turn : 0;
  const availableFrom = def.available_from ?? 0;
  const availability = availableFrom > turn
    ? `available from turn ${availableFrom}`
    : 'available now';
  return def.planning_duration != null
    ? `${availability}; ${def.planning_duration}-turn planning period`
    : availability;
}

function launchFloorLabel(def: OperationDetailDef): string | null {
  return def.min_attack_outcome ? def.min_attack_outcome.replace(/_/g, ' ') : null;
}

export function buildHistoricalOperationAuthorizationDetails(
  state: LoadedGameState,
  historicalOp: HistoricalOperationAuthorizationView,
  osidNameMap?: Record<string, string> | null,
): HistoricalOperationAuthorizationDetails {
  const match = findOperationDefinition(historicalOp);
  const command = commandLabel(state, historicalOp.corpsId);
  const commander = commanderLabel(state, historicalOp.corpsId);
  if (!match) {
    return {
      command,
      commander,
      force: null,
      axes: null,
      objectiveSummary: null,
      staging: null,
      timing: null,
      launchFloor: null,
      source: 'current command review queue',
      planSummary: null,
      operationScopedAssist: true,
    };
  }

  const { def, source } = match;
  const summary = objectiveSummary(def, osidNameMap);
  return {
    command,
    commander,
    force: forceLabel(state, def),
    axes: axesLabel(def),
    objectiveSummary: summary,
    staging: stagingLabel(def, osidNameMap),
    timing: timingLabel(state, def),
    launchFloor: launchFloorLabel(def),
    source,
    planSummary: summary,
    operationScopedAssist: true,
  };
}
