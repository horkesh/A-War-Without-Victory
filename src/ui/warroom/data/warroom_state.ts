/**
 * Warroom state singleton — stores previous-turn snapshot
 * for delta-based event generation.
 *
 * Module-level state: survives across turns within a session
 * but resets when the page reloads (by design — no serialization).
 *
 * No Math.random(), no timestamps.
 */

import type { FactionId, GameState, SettlementId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** Minimal snapshot of fields we need to diff between turns. */
export interface PreviousTurnSnapshot {
    turn: number;
    phase: string;
    /** Settlement → controlling faction (or null). */
    politicalControllers: Record<SettlementId, FactionId | null>;
    /** Per-faction cumulative casualty totals. */
    casualtyTotals: Record<string, { killed: number; wounded: number; missingCaptured: number }>;
    /** Per-faction exhaustion level. */
    exhaustion: Record<string, number>;
    /** Per-faction total displacement out. */
    displacementOutTotals: Record<string, number>;
    /** Per-faction civilian casualties (killed). */
    civilianKilled: Record<string, number>;
    /** Set of collapsed municipality IDs. */
    collapsedMunicipalities: string[];
    /** RBiH-HRHB alliance value (if any). */
    allianceValue: number | null;
    /** RBiH-HRHB ceasefire active flag. */
    ceasefireActive: boolean;
    /** Washington agreement signed flag. */
    washingtonSigned: boolean;
}

// Module-level singleton
let _previousSnapshot: PreviousTurnSnapshot | null = null;

/** Get the previous turn snapshot (null on first turn). */
export function getPreviousSnapshot(): PreviousTurnSnapshot | null {
    return _previousSnapshot;
}

/** Store snapshot after a turn completes. */
export function setPreviousSnapshot(snap: PreviousTurnSnapshot): void {
    _previousSnapshot = snap;
}

/**
 * Capture a PreviousTurnSnapshot from the current GameState.
 * Call this BEFORE advancing the turn, so the next turn can diff against it.
 */
export function capturePreviousTurnSnapshot(state: GameState): PreviousTurnSnapshot {
    const factionIds = state.factions.map(f => f.id).sort(strictCompare);

    // Political controllers
    const politicalControllers: Record<SettlementId, FactionId | null> = {};
    if (state.political_controllers) {
        for (const sid of Object.keys(state.political_controllers).sort(strictCompare)) {
            politicalControllers[sid] = state.political_controllers[sid] ?? null;
        }
    }

    // Casualty totals
    const casualtyTotals: Record<string, { killed: number; wounded: number; missingCaptured: number }> = {};
    for (const fid of factionIds) {
        const ledger = state.casualty_ledger?.[fid];
        casualtyTotals[fid] = {
            killed: ledger?.killed ?? 0,
            wounded: ledger?.wounded ?? 0,
            missingCaptured: ledger?.missing_captured ?? 0,
        };
    }

    // Exhaustion
    const exhaustion: Record<string, number> = {};
    for (const fid of factionIds) {
        exhaustion[fid] = state.war_exhaustion?.[fid] ?? 0;
    }

    // Displacement out totals
    const displacementOutTotals: Record<string, number> = {};
    // Displacement is per-municipality, not per-faction. Aggregate by controller.
    if (state.displacement_state) {
        for (const munId of Object.keys(state.displacement_state).sort(strictCompare)) {
            const ds = state.displacement_state[munId];
            if (!ds) continue;
            // Attribute displacement_out to the controller of the municipality
            const controller = state.political_controllers?.[munId] ?? null;
            if (controller) {
                displacementOutTotals[controller] = (displacementOutTotals[controller] ?? 0) + ds.displaced_out;
            }
        }
    }

    // Civilian killed
    const civilianKilled: Record<string, number> = {};
    if (state.civilian_casualties) {
        for (const fid of Object.keys(state.civilian_casualties).sort(strictCompare)) {
            civilianKilled[fid] = state.civilian_casualties[fid]?.killed ?? 0;
        }
    }

    // Collapsed municipalities
    const collapsedMunicipalities: string[] = [];
    if (state.sustainability_state) {
        for (const munId of Object.keys(state.sustainability_state).sort(strictCompare)) {
            if (state.sustainability_state[munId]?.collapsed) {
                collapsedMunicipalities.push(munId);
            }
        }
    }

    // Alliance
    const allianceValue = state.war_alliance_rbih_hrhb ?? null;
    const ceasefireActive = state.rbih_hrhb_state?.ceasefire_active ?? false;
    const washingtonSigned = state.rbih_hrhb_state?.washington_signed ?? false;

    return {
        turn: state.meta.turn,
        phase: state.meta.phase ?? 'peace',
        politicalControllers,
        casualtyTotals,
        exhaustion,
        displacementOutTotals,
        civilianKilled,
        collapsedMunicipalities,
        allianceValue,
        ceasefireActive,
        washingtonSigned,
    };
}
