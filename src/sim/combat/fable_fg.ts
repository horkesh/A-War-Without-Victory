// FABLE CONSULT 14 instrument. Not for merge. Switched by AWWV_FABLE_FG (comma list):
//   mirror  the predictor applies the resolver's firepower deficit
//   phase   active_offensives_against_corps is rebuilt from state before every war step
// AWWV_FABLE_FGLOG=<path> appends one JSON line per battle and per direct-objective gate.
import { appendFileSync } from 'node:fs';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

const FLAGS = process.env.AWWV_FABLE_FG ?? '';
export const FABLE_MIRROR = FLAGS.includes('mirror');
export const FABLE_PHASE = FLAGS.includes('phase');
const LOG = process.env.AWWV_FABLE_FGLOG ?? '';
const buf: string[] = [];

export function fableLog(row: Record<string, unknown>): void {
    if (!LOG) return;
    buf.push(JSON.stringify(row));
    if (buf.length >= 500) fableFlush();
}

export function fableFlush(): void {
    if (!LOG || buf.length === 0) return;
    appendFileSync(LOG, buf.join('\n') + '\n');
    buf.length = 0;
}

/** Same arithmetic as the `build-active-offensives-cache` step (war_phases.ts). */
export function fableRebuildActiveOffensives(state: GameState): void {
    if (state.meta.phase !== 'war') return;
    const corpsCommand = state.military.corps_command;
    const formations = state.military.formations ?? {};
    const pc = state.political.political_controllers ?? {};
    const cache: Record<string, number> = {};
    if (!corpsCommand) {
        state.military.active_offensives_against_corps = cache;
        return;
    }
    const activeOffensives: Array<{ attackerFaction: FactionId; objectives: string[] }> = [];
    for (const attackerCorpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const attackerCmd = corpsCommand[attackerCorpsId];
        if (!attackerCmd) continue;
        const attackerCorps = formations[attackerCorpsId];
        if (!attackerCorps) continue;
        for (const op of attackerCmd.active_operations) {
            if (op.phase !== 'execution') continue;
            if (op.type === 'reorganization' || op.type === 'strategic_defense' || op.type === 'probe') continue;
            const objectives: string[] = [];
            if (op.objectives) for (const o of op.objectives) objectives.push(o);
            if (op.axes) for (const axis of op.axes) if (axis.objectives) for (const o of axis.objectives) objectives.push(o);
            if (objectives.length === 0) continue;
            activeOffensives.push({ attackerFaction: attackerCorps.faction, objectives });
        }
    }
    for (const defenderCorpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const defenderCorps = formations[defenderCorpsId];
        if (!defenderCorps) continue;
        let count = 0;
        for (const off of activeOffensives) {
            if (off.attackerFaction === defenderCorps.faction) continue;
            if (off.objectives.some((osid) => pc[osid] === defenderCorps.faction)) count++;
        }
        if (count > 0) cache[defenderCorpsId] = count;
    }
    state.military.active_offensives_against_corps = cache;
}
