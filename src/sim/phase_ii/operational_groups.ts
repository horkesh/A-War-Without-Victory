/**
 * Stage 6: Operational groups (OGs).
 * Temporary formations created by borrowing personnel from donor brigades.
 * Used for concentrated force projection on specific objectives.
 * Phase E: Donor AoR cap recalculates after contribution; shed one settlement if over cap.
 * Deterministic: no randomness, no timestamps.
 */

import type {
  GameState,
  FormationId,
  FormationState,
  OGActivationOrder,
  SettlementId,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPersonnelBasedAoRCap } from '../../state/formation_constants.js';
import { getBrigadeAoRSettlements } from './brigade_aor.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OGActivationReport {
  activated: FormationId[];
  rejected: string[];
}

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

/** Minimum personnel a donor brigade must retain after contributing. */
const MIN_DONOR_RESIDUAL = 200;

/** Minimum total personnel for an OG to be activated. */
const MIN_OG_SIZE = 500;

/** Allowed OG duration range (turns). */
const MIN_OG_DURATION = 3;
const MAX_OG_DURATION = 8;

/** Cohesion strain on donors when detaching personnel. */
const DONOR_COHESION_STRAIN = 5;

/** Initial cohesion for a freshly activated OG. */
const OG_INITIAL_COHESION = 70;

/** Per-turn cohesion drain for active OGs (attack-rate). */
const OG_COHESION_DRAIN_PER_TURN = 4;

/** Cohesion threshold below which an OG dissolves. */
const OG_DISSOLVE_COHESION = 15;

/** Default max duration if tag is missing or unparseable. */
const DEFAULT_MAX_DURATION = 6;

/** Coordination pressure multiplier when an OG covers an edge. */
const OG_COORDINATION_BONUS = 1.3;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an OG activation order.
 * Returns an error string if invalid, or null if the order is valid.
 */
export function validateOGOrder(state: GameState, order: OGActivationOrder): string | null {
  const formations = state.formations;
  if (!formations) return `No formations in state`;

  // 1. Corps must exist, be active, kind=corps
  const corps = formations[order.corps_id];
  if (!corps) return `Corps ${order.corps_id} does not exist`;
  if (corps.status !== 'active') return `Corps ${order.corps_id} is not active`;
  if (corps.kind !== 'corps') return `Formation ${order.corps_id} is not a corps (kind=${corps.kind})`;

  // 2. Corps must have OG slot available
  const corpsCmd = state.corps_command?.[order.corps_id];
  if (!corpsCmd) return `Corps ${order.corps_id} has no command state`;
  if (corpsCmd.active_ogs.length >= corpsCmd.og_slots) {
    return `Corps ${order.corps_id} has no OG slots available (${corpsCmd.active_ogs.length}/${corpsCmd.og_slots})`;
  }

  // 3-5. Validate donors
  if (!order.donors || order.donors.length === 0) return `No donors specified`;

  let totalContribution = 0;
  for (const donor of order.donors) {
    const brig = formations[donor.brigade_id];
    if (!brig) return `Donor brigade ${donor.brigade_id} does not exist`;
    if (brig.status !== 'active') return `Donor brigade ${donor.brigade_id} is not active`;
    if (brig.kind !== 'brigade') return `Donor ${donor.brigade_id} is not a brigade (kind=${brig.kind})`;

    // 3. Same faction as corps
    if (brig.faction !== corps.faction) {
      return `Donor ${donor.brigade_id} faction ${brig.faction} differs from corps faction ${corps.faction}`;
    }

    // 4. Must belong to this corps
    if (brig.corps_id !== order.corps_id) {
      return `Donor ${donor.brigade_id} corps_id ${brig.corps_id} does not match ${order.corps_id}`;
    }

    // 5. Must retain minimum personnel
    const currentPersonnel = brig.personnel ?? 0;
    const remaining = currentPersonnel - donor.personnel_contribution;
    if (remaining < MIN_DONOR_RESIDUAL) {
      return `Donor ${donor.brigade_id} would retain only ${remaining} personnel (min ${MIN_DONOR_RESIDUAL})`;
    }

    totalContribution += donor.personnel_contribution;
  }

  // 6. Minimum OG size
  if (totalContribution < MIN_OG_SIZE) {
    return `Total OG personnel ${totalContribution} below minimum ${MIN_OG_SIZE}`;
  }

  // 7. Focus settlements must be non-empty and all controlled by same faction
  if (!order.focus_settlements || order.focus_settlements.length === 0) {
    return `No focus settlements specified`;
  }

  const pc = state.political_controllers;
  if (pc) {
    for (const sid of order.focus_settlements) {
      const controller = pc[sid];
      if (controller && controller !== corps.faction) {
        return `Focus settlement ${sid} controlled by ${controller}, not ${corps.faction}`;
      }
    }
  }

  // 8. Duration range
  if (order.max_duration < MIN_OG_DURATION || order.max_duration > MAX_OG_DURATION) {
    return `max_duration ${order.max_duration} outside allowed range [${MIN_OG_DURATION}, ${MAX_OG_DURATION}]`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Phase E: Donor AoR shed after personnel contribution
// ---------------------------------------------------------------------------

/**
 * If donor brigade's AoR settlement count exceeds personnel-based cap, shed one settlement
 * (prefer non-front). Deterministic: sorted iteration.
 */
function shedDonorAoRIfOverCap(
  state: GameState,
  donorId: FormationId,
  edges: EdgeRecord[]
): void {
  const brigadeAor = state.brigade_aor;
  const formations = state.formations;
  const pc = state.political_controllers ?? {};
  if (!brigadeAor || !formations) return;
  const donor = formations[donorId];
  if (!donor || donor.faction == null) return;
  const factionId = donor.faction;
  const settlements = getBrigadeAoRSettlements(state, donorId);
  const cap = getPersonnelBasedAoRCap(donor.personnel ?? 0);
  if (settlements.length <= cap) return;
  const adj = buildAdjacencyFromEdges(edges);
  const isFront = (sid: SettlementId) => {
    const neighbors = adj.get(sid);
    if (!neighbors) return false;
    return [...neighbors].some(n => pc[n] && pc[n] !== factionId);
  };
  const rear = settlements.filter(sid => !isFront(sid)).sort(strictCompare);
  const toShed = rear.length > 0 ? rear[0] : settlements.sort(strictCompare)[0];
  if (toShed) brigadeAor[toShed] = null;
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

/**
 * Activate OGs from pending orders.
 * Processes orders in deterministic order (sorted by corps_id).
 * Phase E: When edges provided, recalc donor AoR cap and shed one settlement if over cap.
 */
export function activateOGs(state: GameState, edges?: EdgeRecord[]): OGActivationReport {
  const report: OGActivationReport = { activated: [], rejected: [] };
  const orders = state.og_orders;
  if (!orders || orders.length === 0) return report;

  const sortedOrders = [...orders].sort((a, b) => strictCompare(a.corps_id, b.corps_id));

  for (const order of sortedOrders) {
    const error = validateOGOrder(state, order);
    if (error) {
      report.rejected.push(error);
      continue;
    }

    if (!state.formations) continue;

    const ogId = `og-${order.corps_id}-t${state.meta.turn}`;
    const totalPersonnel = order.donors.reduce((s, d) => s + d.personnel_contribution, 0);
    const corps = state.formations[order.corps_id];

    for (const donor of order.donors) {
      const brig = state.formations[donor.brigade_id];
      brig.personnel = (brig.personnel ?? 0) - donor.personnel_contribution;
      brig.cohesion = Math.max(0, (brig.cohesion ?? 60) - DONOR_COHESION_STRAIN);
    }
    if (edges?.length) {
      for (const donor of order.donors) {
        shedDonorAoRIfOverCap(state, donor.brigade_id, edges);
      }
    }

    // Create OG formation entry
    state.formations[ogId] = {
      id: ogId,
      faction: corps.faction,
      name: `OG ${order.corps_id.split('-').pop()} T${state.meta.turn}`,
      created_turn: state.meta.turn,
      status: 'active',
      assignment: null,
      kind: 'og',
      personnel: totalPersonnel,
      cohesion: OG_INITIAL_COHESION,
      hq_sid: order.focus_settlements[0],
      tags: [`corps:${order.corps_id}`, `og_max_dur:${order.max_duration}`],
      posture: order.posture,
      corps_id: order.corps_id,
    };

    // Register OG with corps command
    const corpsCmd = state.corps_command?.[order.corps_id];
    if (corpsCmd) {
      corpsCmd.active_ogs.push(ogId);
    }

    // Assign OG to focus settlements in brigade_aor
    if (state.brigade_aor) {
      for (const sid of order.focus_settlements) {
        state.brigade_aor[sid] = ogId;
      }
    }

    report.activated.push(ogId);
  }

  // Clear processed orders
  state.og_orders = [];
  return report;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Extract max duration from an OG formation's tags.
 */
function getOGMaxDuration(formation: FormationState): number {
  for (const tag of formation.tags ?? []) {
    if (tag.startsWith('og_max_dur:')) {
      const parsed = parseInt(tag.slice(11), 10);
      return isNaN(parsed) ? DEFAULT_MAX_DURATION : parsed;
    }
  }
  return DEFAULT_MAX_DURATION;
}

/**
 * Return remaining OG personnel to donor brigades in the same corps.
 * Distributes equally; remainder goes to first donors by sorted ID.
 */
function returnOGPersonnel(state: GameState, og: FormationState): void {
  const corpsId = og.corps_id;
  if (!corpsId || !state.formations) return;

  // Find active donor brigades in the same corps and faction
  const donors: FormationState[] = [];
  const formationIds = Object.keys(state.formations).sort(strictCompare);
  for (const fid of formationIds) {
    const f = state.formations[fid];
    if (
      f.kind === 'brigade' &&
      f.corps_id === corpsId &&
      f.faction === og.faction &&
      f.status === 'active'
    ) {
      donors.push(f);
    }
  }

  if (donors.length === 0) return;

  const remaining = og.personnel ?? 0;
  if (remaining <= 0) return;

  const perDonor = Math.floor(remaining / donors.length);
  const remainder = remaining - perDonor * donors.length;

  for (let i = 0; i < donors.length; i++) {
    donors[i].personnel = (donors[i].personnel ?? 0) + perDonor + (i < remainder ? 1 : 0);
  }
  og.personnel = 0;
}

/**
 * Update OG lifecycle each turn.
 * Dissolves OGs when cohesion drops below threshold or max duration is exceeded.
 * Active OGs suffer per-turn cohesion drain (attack-rate).
 * Returns array of dissolved OG IDs.
 */
export function updateOGLifecycle(state: GameState): FormationId[] {
  const dissolved: FormationId[] = [];
  const formations = state.formations;
  if (!formations) return dissolved;

  const formationIds = Object.keys(formations).sort(strictCompare);
  for (const fid of formationIds) {
    const f = formations[fid];
    if (f.kind !== 'og' || f.status !== 'active') continue;

    // Check dissolution conditions
    const turnsActive = state.meta.turn - f.created_turn;
    const maxDur = getOGMaxDuration(f);
    const currentCohesion = f.cohesion ?? 0;
    const shouldDissolve = currentCohesion < OG_DISSOLVE_COHESION || turnsActive >= maxDur;

    if (shouldDissolve) {
      f.status = 'inactive';
      dissolved.push(fid);

      // Return remaining personnel to donor brigades
      returnOGPersonnel(state, f);

      // Remove from corps active_ogs
      if (f.corps_id && state.corps_command?.[f.corps_id]) {
        const ogs = state.corps_command[f.corps_id].active_ogs;
        const idx = ogs.indexOf(fid);
        if (idx >= 0) ogs.splice(idx, 1);
      }

      // Clear AoR assignments for this OG
      if (state.brigade_aor) {
        const aorKeys = Object.keys(state.brigade_aor).sort(strictCompare);
        for (const sid of aorKeys) {
          if (state.brigade_aor[sid] === fid) {
            state.brigade_aor[sid] = null;
          }
        }
      }
    } else {
      // OG exhaustion: attack-rate cohesion drain per turn
      f.cohesion = Math.max(0, (f.cohesion ?? OG_INITIAL_COHESION) - OG_COHESION_DRAIN_PER_TURN);
    }
  }

  return dissolved;
}

// ---------------------------------------------------------------------------
// Pressure bonus
// ---------------------------------------------------------------------------

/**
 * Compute OG pressure bonus on a front edge.
 * Returns the coordination multiplier (1.3) if any OG covers a settlement
 * on this edge; otherwise returns 1.0.
 *
 * Edge ID format: "sidA:sidB".
 */
export function computeOGPressureBonus(state: GameState, edgeId: string): number {
  if (!state.brigade_aor || !state.formations) return 1.0;

  const separatorIdx = edgeId.indexOf(':');
  if (separatorIdx < 0) return 1.0;

  const sidA = edgeId.slice(0, separatorIdx);
  const sidB = edgeId.slice(separatorIdx + 1);

  const brigA = state.brigade_aor[sidA];
  if (brigA && state.formations[brigA]?.kind === 'og') return OG_COORDINATION_BONUS;

  const brigB = state.brigade_aor[sidB];
  if (brigB && state.formations[brigB]?.kind === 'og') return OG_COORDINATION_BONUS;

  return 1.0;
}
