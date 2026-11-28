/**
 * MASS-DOCTRINE contract (rulings §75; fable_consults/14_forecast_gap.md, appendix B;
 * Systems Manual "Attack gate: the mass doctrine").
 *
 * A bot's go or no-go forecasts by mass: men, ground, supply and posture, with no fire
 * comparison. The battle and the launch estimate price the attacker's firepower deficit.
 * Mirroring the deficit into the bot gate was measured (Fable 14): battles fall under the
 * 2.35/wk floor, the Farz tripwire trips, and a careful ARBiH wins the Ozren line. So a bot
 * caller that starts pricing the deficit is a doctrine change, not a fix.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';
import type {FactionId, GameState} from '../src/state/game_state.js';
import type {EdgeRecord} from '../src/map/settlements.js';
import {makeAttackComposition, makeAttackFormation} from './_helpers/combat.js';
import {initializeCasualtyLedger} from '../src/state/casualty_ledger.js';
import {buildOsidAdjacency} from '../src/sim/combat/osid_adjacency.js';
import {predictCombatOutcome} from '../src/sim/combat/combat_predictor.js';
import {getAttackerFirepowerDeficitMult} from '../src/sim/combat/combat_math.js';

const MEMO = 'fable_consults/14_forecast_gap.md (rulings §75, MASS-DOCTRINE)';
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
        else if (/\.tsx?$/.test(name)) out.push(p);
    }
    return out;
}

/** Every `predictCombatOutcome(` call in src with its first argument. */
function predictorCalls(): Array<{file: string; line: number; firstArg: string}> {
    const calls: Array<{file: string; line: number; firstArg: string}> = [];
    for (const file of sourceFiles(SRC)) {
        const text = readFileSync(file, 'utf8');
        const re = /predictCombatOutcome\(\s*([^,)\s]+)/g;
        for (let m = re.exec(text); m; m = re.exec(text)) {
            const before = text.slice(Math.max(0, m.index - 16), m.index);
            if (/function\s+$/.test(before)) continue;
            const line = text.slice(0, m.index).split('\n').length;
            calls.push({file: relative(process.cwd(), file).replace(/\\/g, '/'), line, firstArg: m[1]!});
        }
    }
    return calls;
}

/** The only src caller allowed a priced forecast. Empty: the directive card's priced
 *  numbers (operation_prediction.ts, memo appendix B) are a separate, UI-seated change. */
const PRICED_ALLOWLIST: readonly string[] = [];

describe('MASS-DOCTRINE: bot gates forecast by mass', () => {
    it('every src caller of predictCombatOutcome passes an explicit pricing, and bot callers pass by_mass', () => {
        const calls = predictorCalls();
        // The bot gates named in the memo, plus the card and predictAllAdjacentTargets.
        expect(calls.length).toBeGreaterThanOrEqual(8);
        const offenders = calls.filter((c) =>
            c.firstArg !== "'by_mass'" && !PRICED_ALLOWLIST.includes(c.file));
        expect(offenders, `A bot caller no longer forecasts by mass. This is the ARBiH mass doctrine, not a defect: see ${MEMO}. `
            + `Pricing the deficit in a bot gate needs a ruling. Offenders: ${JSON.stringify(offenders)}`).toEqual([]);
    });

    function fixture(): {state: GameState; edges: EdgeRecord[]} {
        const S = 'op:test:stage', T = 'op:test:target';
        const att: FactionId = 'RBiH', def: FactionId = 'RS';
        // An infantry attacker against an equipped defender: a deep firepower deficit.
        const A = makeAttackFormation({id: 'A', faction: att, location_osid: S, posture: 'attack', corps_id: 'C',
            composition: makeAttackComposition({tanks: 0, artillery: 0})});
        const D = makeAttackFormation({id: 'D', faction: def, location_osid: T, posture: 'defend', corps_id: 'E'});
        const state = {
            meta: {turn: 60, phase: 'war', scenario_start_date: {year: 1992, month: 4, day: 6},
                firepower_deficit_penalty_enabled: true},
            factions: [{id: att}, {id: def}],
            political: {political_controllers: {[S]: att, [T]: def}, control_events: []},
            military: {formations: {A, D}, corps_command: {}, brigade_attack_orders: {},
                casualty_ledger: initializeCasualtyLedger([att, def])},
            displacement: {},
        } as unknown as GameState;
        return {state, edges: [{a: S, b: T}] as EdgeRecord[]};
    }

    it('by_mass leaves the deficit out of power_ratio and returns it; priced applies it', () => {
        const f = fixture();
        const adjacency = buildOsidAdjacency(f.edges);
        const before = JSON.stringify(f.state);
        const byMass = predictCombatOutcome('by_mass', f.state, 'A', 'op:test:target', adjacency, new Map(), {}, 'attack')!;
        const priced = predictCombatOutcome('priced', f.state, 'A', 'op:test:target', adjacency, new Map(), {}, 'attack')!;
        expect(JSON.stringify(f.state)).toBe(before);
        const deficit = getAttackerFirepowerDeficitMult(f.state,
            [f.state.military.formations!.A!], [f.state.military.formations!.D!]);
        expect(deficit).toBeLessThan(1);
        expect(byMass.firepower_deficit_mult).toBe(deficit);
        expect(priced.firepower_deficit_mult).toBe(deficit);
        expect(byMass.defender_power).toBe(priced.defender_power);
        expect(priced.attacker_power).toBeCloseTo(byMass.attacker_power * deficit, 9);
        expect(priced.power_ratio).toBeLessThan(byMass.power_ratio);
    });

    it('after Storm the deficit is 1 and both forecasts agree', () => {
        const f = fixture();
        (f.state.meta as {operation_storm_triggered?: boolean}).operation_storm_triggered = true;
        const adjacency = buildOsidAdjacency(f.edges);
        const byMass = predictCombatOutcome('by_mass', f.state, 'A', 'op:test:target', adjacency, new Map(), {}, 'attack')!;
        const priced = predictCombatOutcome('priced', f.state, 'A', 'op:test:target', adjacency, new Map(), {}, 'attack')!;
        expect(byMass.firepower_deficit_mult).toBe(1);
        expect(priced.power_ratio).toBe(byMass.power_ratio);
    });
});
