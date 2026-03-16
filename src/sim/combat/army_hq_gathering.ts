/**
 * Army HQ Gathering — v0.4.7
 * Periodic command meetings producing multi-turn campaign plans.
 * Deterministic: no RNG, no timestamps.
 */

import type { GameState, FactionId, FormationState } from '../../state/game_state.js';
import {
    GATHERING_CADENCE_RS, GATHERING_CADENCE_HRHB, getGatheringCadenceRBiH,
    EMERGENCY_COOLDOWN,
} from './army_hq_gathering_constants.js';

// ── Emergency event IDs that trigger an immediate gathering ──────────────────
const EMERGENCY_EVENT_IDS = new Set([
    'nato_deliberate_force_1995',
    'operation_storm_1995',
    'croat_bosniak_war_begins_1993',
    'washington_agreement_1994',
]);

// ── Corps communication constraints ─────────────────────────────────────────
// ARBiH enclaved corps cannot attend in person
const ARBIH_EXCLUDED_CORPS = new Set([
    'arbih_general_staff',  // staff, not a field corps — excluded from gathering
]);

const ARBIH_RADIO_CORPS = new Set([
    'arbih_5th_corps',  // Bihać pocket, isolated throughout war
]);

// Sarajevo (1st Corps) is radio-only until roughly turn 60 (Igman trail / tunnel)
const SARAJEVO_TUNNEL_TURN = 60;

// HVO Posavina pocket — radio only
const HVO_RADIO_CORPS = new Set([
    'hvo_northwest_bosnia',  // Orašje pocket, isolated
]);

/** Personnel threshold per brigade that indicates corps-level collapse. */
const CORPS_COLLAPSE_AVG_PERSONNEL = 500;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the number of turns between regular gatherings for a faction.
 */
export function getGatheringCadence(faction: FactionId, turn: number): number {
    switch (faction) {
        case 'RS':   return GATHERING_CADENCE_RS;
        case 'HRHB': return GATHERING_CADENCE_HRHB;
        case 'RBiH': return getGatheringCadenceRBiH(turn);
        default:     return GATHERING_CADENCE_RS; // fallback
    }
}

export interface GatheringDecision {
    gather: boolean;
    reason: string;
}

/**
 * Determines whether a faction should hold a gathering this turn.
 * Returns the decision and the trigger reason.
 */
export function shouldGather(
    state: GameState,
    faction: FactionId,
    currentTurn: number,
): GatheringDecision {
    const lastGatheringTurn = state.military.last_gathering_turn?.[faction] ?? 0;
    const cadence = getGatheringCadence(faction, currentTurn);

    // 1. Regular cadence
    if (currentTurn - lastGatheringTurn >= cadence) {
        return { gather: true, reason: 'regular_cadence' };
    }

    // 2. Emergency triggers (only if cooldown has elapsed)
    if (currentTurn - lastGatheringTurn >= EMERGENCY_COOLDOWN) {
        // 2a. Corps strength collapse — any corps with critically low average personnel
        if (hasCorpsStrengthCollapse(state, faction)) {
            return { gather: true, reason: 'corps_strength_collapse' };
        }

        // 2b. Emergency event fired since last gathering
        if (hasEmergencyEventSinceLastGathering(state, lastGatheringTurn)) {
            return { gather: true, reason: 'emergency_event' };
        }
    }

    return { gather: false, reason: '' };
}

/**
 * Determines the communication mode for a corps attending a gathering.
 * - 'full': corps commander attends in person
 * - 'radio': corps receives orders via radio (delay applies)
 * - 'excluded': corps is cut off, cannot participate
 */
export function canCorpsAttendGathering(
    corpsId: string,
    faction: FactionId,
    state: GameState,
): 'full' | 'radio' | 'excluded' {
    const turn = state.meta.turn;

    if (faction === 'RBiH') {
        if (ARBIH_EXCLUDED_CORPS.has(corpsId)) return 'excluded';
        if (ARBIH_RADIO_CORPS.has(corpsId)) return 'radio';
        // Sarajevo: radio before tunnel, full after
        if (corpsId === 'arbih_1st_corps') {
            return turn < SARAJEVO_TUNNEL_TURN ? 'radio' : 'full';
        }
    }

    if (faction === 'HRHB') {
        if (HVO_RADIO_CORPS.has(corpsId)) return 'radio';
    }

    // VRS and all other corps: full attendance
    return 'full';
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Check if any corps of the given faction has critically low average brigade personnel.
 * Groups active brigades by corps_id; if any corps averages below threshold → collapse.
 */
function hasCorpsStrengthCollapse(state: GameState, faction: FactionId): boolean {
    const corpsBuckets = new Map<string, { totalPersonnel: number; count: number }>();

    for (const fmn of Object.values(state.military.formations)) {
        if (fmn.faction !== faction) continue;
        if (fmn.status !== 'active') continue;
        if (!fmn.corps_id) continue;
        // Only count brigades (default kind)
        const kind = fmn.kind ?? 'brigade';
        if (kind !== 'brigade') continue;

        const bucket = corpsBuckets.get(fmn.corps_id);
        const pers = fmn.personnel ?? 1000;
        if (bucket) {
            bucket.totalPersonnel += pers;
            bucket.count += 1;
        } else {
            corpsBuckets.set(fmn.corps_id, { totalPersonnel: pers, count: 1 });
        }
    }

    for (const [, bucket] of corpsBuckets) {
        if (bucket.count > 0 && bucket.totalPersonnel / bucket.count < CORPS_COLLAPSE_AVG_PERSONNEL) {
            return true;
        }
    }

    return false;
}

/**
 * Check if any emergency event has been fired since the last gathering.
 * Uses `state.political.fired_event_ids` (a flat array of event ID strings).
 * Since we don't track *when* each event fired, this is a conservative check:
 * we treat any matching event as potentially recent.
 * In practice, emergency events fire at most once, so once seen it stays permanent —
 * the cooldown + cadence prevent infinite re-triggering.
 */
function hasEmergencyEventSinceLastGathering(
    state: GameState,
    _lastGatheringTurn: number,
): boolean {
    const firedIds = state.political?.fired_event_ids;
    if (!firedIds || firedIds.length === 0) return false;

    for (const id of firedIds) {
        if (EMERGENCY_EVENT_IDS.has(id)) return true;
    }
    return false;
}
