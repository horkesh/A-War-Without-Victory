/**
 * FRESH-COUNT (rulings §75; fable_consults/14_forecast_gap.md, appendix A).
 *
 * Fall-1995 mechanic E-A3, the multi-axis simultaneity penalty, reads
 * `state.military.active_offensives_against_corps`: for each defender corps, the number of
 * enemy CorpsOperations in `execution` whose objectives include at least one OSID held by the
 * defender corps's faction (`computeDefenderPowerBreakdown`, combat_math.ts, applies
 * 1.0x / 0.9x / 0.8x / 0.7x). The count is per FACTION of the defender corps, not per corps
 * (register: a design ruling, not part of this change).
 *
 * The field is a derived, transient projection (`TRANSIENT_MILITARY_STATE_FIELDS`,
 * serializeGameState.ts): it is never saved. It used to be built once, by the war step
 * `build-active-offensives-cache`, and every earlier reader in the turn read the previous
 * turn's value, or nothing after a save was loaded. So a resumed save made different launch
 * decisions than the uninterrupted run (SAVE-RESUME-TRANSIENT, §74), and an operation that
 * entered execution in `advance-sector-offensives` was not counted by that turn's brigade gate.
 *
 * Now it is derived from state before EVERY war step (`runNamedPhase`, turn_pipeline.ts), and
 * by any between-turn reader that forecasts from a state snapshot
 * (`withFreshActiveOffensivesCount`). Nothing reads it across a turn boundary, so a resumed
 * save computes the same value as the uninterrupted run. Do NOT serialize it.
 *
 * Deterministic: corps ids iterate in strictCompare order; the count is a pure function of state.
 */
import type { FactionId, FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Pure: the multi-axis count for every defender corps facing at least one enemy offensive. */
export function countActiveOffensivesAgainstCorps(state: GameState): Record<FormationId, number> {
    const corpsCommand = state.military.corps_command;
    const formations = state.military.formations ?? {};
    const pc = state.political?.political_controllers ?? {};
    const cache: Record<FormationId, number> = {};
    if (!corpsCommand) return cache;

    // Active enemy offensives: {attackerFaction, objectives}. Probes are non-territorial and
    // excluded; feints count (distraction pressure, consistent with the E-A3 model).
    const activeOffensives: Array<{ attackerFaction: FactionId; objectives: string[] }> = [];
    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const attackerCorpsId of corpsIds) {
        const attackerCmd = corpsCommand[attackerCorpsId];
        if (!attackerCmd) continue;
        const attackerCorps = formations[attackerCorpsId];
        if (!attackerCorps) continue;
        for (const op of attackerCmd.active_operations) {
            if (op.phase !== 'execution') continue;
            if (op.type === 'reorganization' || op.type === 'strategic_defense' || op.type === 'probe') continue;
            const objectives: string[] = [];
            if (op.objectives) for (const o of op.objectives) objectives.push(o);
            if (op.axes) {
                for (const axis of op.axes) {
                    if (axis.objectives) for (const o of axis.objectives) objectives.push(o);
                }
            }
            if (objectives.length === 0) continue;
            activeOffensives.push({ attackerFaction: attackerCorps.faction, objectives });
        }
    }

    for (const defenderCorpsId of corpsIds) {
        const defenderCorps = formations[defenderCorpsId];
        if (!defenderCorps) continue;
        const defenderFaction = defenderCorps.faction;
        let count = 0;
        for (const off of activeOffensives) {
            if (off.attackerFaction === defenderFaction) continue;
            if (off.objectives.some((osid) => pc[osid] === defenderFaction)) count++;
        }
        if (count > 0) cache[defenderCorpsId] = count;
    }
    return cache;
}

/** Writes the fresh count into the transient field. War phase only, as the old step did. */
export function refreshActiveOffensivesAgainstCorps(state: GameState): void {
    if (state.meta?.phase !== 'war' || !state.military) return;
    state.military.active_offensives_against_corps = countActiveOffensivesAgainstCorps(state);
}

/**
 * For a between-turn forecast reader: a shallow copy of `state` whose transient count is fresh.
 * The argument is not mutated.
 */
export function withFreshActiveOffensivesCount(state: GameState): GameState {
    if (state.meta?.phase !== 'war' || !state.military) return state;
    return {
        ...state,
        military: { ...state.military, active_offensives_against_corps: countActiveOffensivesAgainstCorps(state) },
    };
}
