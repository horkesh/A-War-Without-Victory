/**
 * Warlord Friction (v0.4.4 — Weight of Command)
 *
 * Low political reliability corps commanders may ignore army stance
 * or launch unauthorized operations. Models the ARBiH warlord problem
 * (Caco, Čelo (Ramiz Dedić), etc.) and VRS corps-level autonomy.
 *
 * Deterministic: explicit reliability cadence, state ranking, and stable ordering.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

const VALID_FACTION_IDS = new Set<string>(['HRHB', 'RBiH', 'RS']);

function readFactionId(value: string): FactionId | null {
    return VALID_FACTION_IDS.has(value) ? value : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type FrictionType = 'ignored_stance' | 'unauthorized_op' | 'refused_release';

export interface FrictionEvent {
    officer_id: string;
    turn: number;
    type: FrictionType;
    resolved: boolean;
}

export interface WarlordFrictionReport {
    events: FrictionEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Reliability threshold: officers at or above this never cause friction. */
const RELIABILITY_THRESHOLD = 3;
const FRICTION_BASE_COOLDOWN_TURNS = 20;

// ═══════════════════════════════════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the explicit friction cadence from political reliability.
 * Returns null for officers with reliability >= 3.
 */
export function getFrictionCooldownTurns(politicalReliability: number): number | null {
    if (politicalReliability >= RELIABILITY_THRESHOLD) return null;
    const reliabilityDeficit = RELIABILITY_THRESHOLD - Math.max(1, politicalReliability);
    return Math.floor(FRICTION_BASE_COOLDOWN_TURNS / reliabilityDeficit);
}

/**
 * Check all active corps commanders for warlord friction this turn.
 * Eligibility is an explicit reliability cadence. When multiple commanders from
 * one faction qualify, reliability deficit, aggressiveness, command tenure, and
 * finally officer ID rank the single event emitted for that faction.
 *
 * Friction effects:
 * - 'ignored_stance': commander ignores army-level stance for this turn
 * - 'unauthorized_op': commander launches an unauthorized operation
 * - 'refused_release': commander refuses to release brigades to army reserve
 *
 * Only applies to factions that haven't passed their warlord_friction_end_week.
 */
export function checkWarlordFriction(state: GameState): WarlordFrictionReport {
    const report: WarlordFrictionReport = { events: [] };

    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return report;

    const turn = state.meta?.turn ?? 0;

    // Ensure friction_events array exists
    if (!state.military.friction_events) {
        state.military.friction_events = [];
    }

    const officerIds = Object.keys(officers).sort(strictCompare);
    const candidates: Array<{
        id: string;
        factionId: FactionId;
        politicalReliability: number;
        aggressiveness: number;
        turnsInCommand: number;
        enclaveLockActive: boolean;
    }> = [];
    for (const id of officerIds) {
        const os = officers[id];
        if (!os) continue;
        if (os.status !== 'active' || !os.assigned_corps_id) continue;

        const data = officerData.find(o => o.id === id);
        if (!data) continue;

        // Check faction friction end week
        const factionId = readFactionId(data.faction);
        if (!factionId) continue;
        const factionConfig = factionId
            ? state.military.war_timeline?.officer_config?.[factionId]
            : undefined;
        if (factionConfig?.warlord_friction_end_week !== undefined
            && turn >= factionConfig.warlord_friction_end_week) {
            continue;
        }

        const cooldownTurns = getFrictionCooldownTurns(data.political_reliability);
        if (cooldownTurns == null || turn % cooldownTurns !== 0) continue;
        let enclaveLockActive = false;
        if (data.enclave_lock) {
            const lock = data.enclave_lock;
            enclaveLockActive = lock.locked_until_turn === undefined || turn < lock.locked_until_turn;
        }

        candidates.push({
            id,
            factionId,
            politicalReliability: data.political_reliability,
            aggressiveness: data.aggressiveness,
            turnsInCommand: os.turns_in_command,
            enclaveLockActive,
        });
    }

    candidates.sort((a, b) => {
        if (a.factionId !== b.factionId) return strictCompare(a.factionId, b.factionId);
        if (a.politicalReliability !== b.politicalReliability) return a.politicalReliability - b.politicalReliability;
        if (a.aggressiveness !== b.aggressiveness) return b.aggressiveness - a.aggressiveness;
        if (a.turnsInCommand !== b.turnsInCommand) return b.turnsInCommand - a.turnsInCommand;
        return strictCompare(a.id, b.id);
    });

    const emittedFactions = new Set<FactionId>();
    for (const candidate of candidates) {
        if (emittedFactions.has(candidate.factionId)) continue;
        emittedFactions.add(candidate.factionId);

        const frictionType: FrictionType = candidate.aggressiveness >= 4
            ? 'unauthorized_op'
            : candidate.politicalReliability <= 1 && !candidate.enclaveLockActive
                ? 'refused_release'
                : 'ignored_stance';

        const event: FrictionEvent = {
            officer_id: candidate.id,
            turn,
            type: frictionType,
            resolved: false,
        };

        state.military.friction_events.push(event);
        report.events.push(event);
    }

    return report;
}
