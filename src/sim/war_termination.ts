/**
 * War termination detection: victory conditions, turn limit, faction collapse.
 * Called once per turn from the war_phases pipeline after combat/supply steps.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { evaluateVictoryConditions } from '../scenario/victory_conditions.js';
import { freezeEndgameSnapshot } from './endgame/endgame_snapshot.js';

/** Default max turns (4 years at 1 turn/week). */
const DEFAULT_MAX_TURNS = 208;

/** Canonical faction IDs in deterministic order. */
const FACTION_IDS = ['HRHB', 'RBiH', 'RS'] as const;

export interface WarTerminationResult {
    game_over: boolean;
    outcome: string | null;
    /** Faction that won (if any). */
    winner: string | null;
    /** Detail on what triggered termination. */
    trigger: 'victory_condition' | 'turn_limit' | 'faction_collapse' | 'negotiated_peace' | null;
}

/**
 * Check all war termination conditions in priority order:
 * 1. Scenario victory conditions (from evaluateVictoryConditions)
 * 2. Faction collapse (0 active formations)
 * 3. Turn limit stalemate
 *
 * Returns the first triggered condition, or a no-termination result.
 */
export function checkWarTermination(state: GameState): WarTerminationResult {
    // Already game over — skip re-evaluation
    if (state.meta.game_over) {
        return {
            game_over: true,
            outcome: state.meta.outcome ?? 'unknown',
            winner: null,
            trigger: null
        };
    }

    // 1. Scenario victory conditions.
    //
    // Free War Phase 3, Part B — DISARM THE CONQUEST WIN IN EMERGENT MODE.
    // Owner decision (locked 2026-06-01): there is no winning the Bosnian War.
    // The free, emergent war ends only via negotiated settlement / timeout /
    // collapse — never "hold N settlements + stay fresh ⇒ victory." So in
    // emergent mode we skip the min_controlled_settlements/max_exhaustion
    // victory-condition check entirely (the "competence escape hatch" off).
    // Historical/unset mode is unchanged; calibration baselines never set
    // victory_conditions, so this is byte-identical for them either way.
    const conquestWinDisarmed = state.meta.decision_mode === 'emergent';
    const victoryEval = conquestWinDisarmed
        ? null
        : evaluateVictoryConditions(state, state.meta.victory_conditions);
    if (victoryEval && (victoryEval.result === 'winner' || victoryEval.result === 'co_winners')) {
        const winner = victoryEval.winner ?? victoryEval.co_winners[0] ?? null;
        const outcome = victoryEval.result === 'co_winners'
            ? `co_victory:${victoryEval.co_winners.join(',')}`
            : `victory:${winner}`;
        return {
            game_over: true,
            outcome,
            winner,
            trigger: 'victory_condition'
        };
    }

    // 2. Negotiated peace — consequence events set war_ended_early when a peace plan is implemented
    const flags = state.military.event_flags;
    if (flags?.['war_ended_early'] === true) {
        const earlyPeaceId = flags['early_peace_implemented'] ? String(flags['early_peace_implemented']) : 'negotiated';
        return {
            game_over: true,
            outcome: `negotiated_peace:${earlyPeaceId}`,
            winner: null,
            trigger: 'negotiated_peace'
        };
    }

    // 3. Faction collapse — any faction with 0 active brigades is collapsed
    const collapseResult = checkFactionCollapse(state);
    if (collapseResult) {
        return collapseResult;
    }

    // 4. Turn limit stalemate
    const maxTurns = state.meta.max_turns ?? DEFAULT_MAX_TURNS;
    if (state.meta.turn >= maxTurns) {
        return {
            game_over: true,
            outcome: 'timeout_stalemate',
            winner: null,
            trigger: 'turn_limit'
        };
    }

    return { game_over: false, outcome: null, winner: null, trigger: null };
}

/**
 * Check if any faction has 0 active brigade formations.
 * A faction is "collapsed" when it has zero brigades in the formations registry.
 * If only one faction remains active, that faction wins.
 */
function checkFactionCollapse(state: GameState): WarTerminationResult | null {
    const formations = state.military.formations ?? {};
    const activeFactions = new Set<string>();

    // Count active brigades per faction (sorted iteration for determinism)
    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const f = formations[formationId];
        if (!f) continue;
        const kind = f.kind ?? 'brigade';
        if (kind !== 'brigade') continue;
        if (!f.faction) continue;
        activeFactions.add(f.faction);
    }

    // Check which canonical factions have collapsed
    const collapsedFactions: string[] = [];
    for (const factionId of FACTION_IDS) {
        // Only check factions that exist in the game
        const factionExists = (state.factions ?? []).some(f => f.id === factionId);
        if (factionExists && !activeFactions.has(factionId)) {
            collapsedFactions.push(factionId);
        }
    }

    if (collapsedFactions.length === 0) return null;

    // Determine surviving factions
    const survivingFactions = FACTION_IDS.filter(
        fid => (state.factions ?? []).some(f => f.id === fid) && activeFactions.has(fid)
    );

    if (survivingFactions.length === 1) {
        return {
            game_over: true,
            outcome: `faction_collapse:${collapsedFactions.join(',')}:winner:${survivingFactions[0]}`,
            winner: survivingFactions[0]!,
            trigger: 'faction_collapse'
        };
    }

    if (survivingFactions.length === 0) {
        // All factions collapsed — mutual destruction
        return {
            game_over: true,
            outcome: 'mutual_collapse',
            winner: null,
            trigger: 'faction_collapse'
        };
    }

    // Multiple factions collapsed but 2+ remain — mark collapsed factions but game continues
    // (Only trigger game over when 0 or 1 faction remains)
    if (collapsedFactions.length >= 2) {
        return {
            game_over: true,
            outcome: `faction_collapse:${collapsedFactions.join(',')}:winner:${survivingFactions[0]}`,
            winner: survivingFactions[0]!,
            trigger: 'faction_collapse'
        };
    }

    // One faction collapsed, two remain — game continues
    return null;
}

/**
 * Apply war termination result to game state.
 * Sets meta.game_over and meta.outcome when triggered.
 *
 * LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): also freezes the endgame snapshot
 * once game_over is set. The frozen snapshot preserves verdict / cost
 * ledger / historical comparison across save/load round-trip so post-
 * termination engine drift cannot perturb the verdict. Idempotent —
 * subsequent calls are no-ops.
 */
export function applyWarTermination(state: GameState, result: WarTerminationResult): void {
    if (!result.game_over) return;
    state.meta.game_over = true;
    state.meta.outcome = result.outcome ?? 'unknown';
    freezeEndgameSnapshot(state);
}
