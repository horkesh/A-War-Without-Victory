/**
 * `corps_plan` reason-code receipts (2026-11-15): one stdout line per corps per bot pass saying why
 * the corps made or did not make a plan. Default off; observation only.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAllCorpsOrders } from '../../src/sim/combat/bot_corps_ai.js';
import {
    CORPS_EXHAUSTION_PREFIX,
    CORPS_PLAN_PREFIX,
    emitCorpsExhaustionRecord,
    resetReasonCodeTopicCacheForTests,
} from '../../src/sim/combat/reason_code_debug.js';
import type { FactionId, FormationState, GameState } from '../../src/state/game_state.js';

const CORPS = 'arbih_trace_corps';
const OSID_EDGES = [{ a: 'op:t:home', b: 'op:t:front' }];

function brigade(id: string, faction: FactionId, osid: string, personnel: number, maxPersonnel?: number, corps?: string): FormationState {
    return {
        id, name: id, faction, kind: 'brigade', status: 'active', created_turn: 0, assignment: null,
        corps_id: corps ?? null, location_osid: osid, personnel, cohesion: 70, morale: 65,
        ...(maxPersonnel !== undefined ? { max_personnel: maxPersonnel } : {}),
    } as unknown as FormationState;
}

/** An RBiH corps of two 1,800-designed brigades at full strength, facing one RS brigade. */
function makeState(): GameState {
    return {
        meta: { turn: 120, phase: 'war', seed: 'corps-plan-trace' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        political: { political_controllers: { 'op:t:home': 'RBiH', 'op:t:front': 'RS' } },
        military: {
            formations: {
                [CORPS]: { id: CORPS, name: CORPS, faction: 'RBiH', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 },
                b1: brigade('b1', 'RBiH', 'op:t:home', 1800, 1800, CORPS),
                b2: brigade('b2', 'RBiH', 'op:t:home', 1800, 1800, CORPS),
                e1: brigade('e1', 'RS', 'op:t:front', 2000),
            },
            corps_command: {
                [CORPS]: { command_span: 3, subordinate_count: 2, og_slots: 0, active_ogs: [], active_operations: [], corps_exhaustion: 12, stance: 'balanced' },
            },
        },
    } as unknown as GameState;
}

function setFlag(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

function runPass(): { state: GameState; lines: string[] } {
    const state = makeState();
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(String(args[0])); });
    try {
        generateAllCorpsOrders(state, 'RBiH', [] as never, new Map(), null, OSID_EDGES as never);
    } finally {
        spy.mockRestore();
    }
    return { state, lines: lines.filter(l => l.startsWith(CORPS_PLAN_PREFIX)) };
}

afterEach(() => setFlag(undefined));

describe('corps_plan receipts', () => {
    it('are silent when the topic is off', () => {
        setFlag(undefined);
        expect(runPass().lines).toEqual([]);
    });

    it('write one record per corps with stance, exhaustion and both healthy counts when on', () => {
        setFlag('corps_plan');
        const { lines } = runPass();
        expect(lines).toHaveLength(1);
        const rec = JSON.parse(lines[0]!.slice(CORPS_PLAN_PREFIX.length + 1));
        expect(rec).toMatchObject({
            schema_version: 1, turn: 120, faction: 'RBiH', corps_id: CORPS,
            corps_exhaustion: 12, brigades: 2,
            // 1,800 / 3,000 = 0.6 is below the 0.7 line; 1,800 / 1,800 = 1.0 is above it.
            healthy_by_cap: 0, healthy_by_designed: 2,
        });
        expect(typeof rec.stance).toBe('string');
        expect(rec).toHaveProperty('stance_driver');
        expect(rec).toHaveProperty('plan_reason');
    });

    it('exhaustion receipts do not build their payload when off, and write one prefixed line when on', () => {
        const lines: string[] = [];
        const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(String(args[0])); });
        try {
            setFlag(undefined);
            const build = vi.fn(() => ({ corps_id: CORPS, source: 'decay_idle', before: 10, after: 8 }));
            emitCorpsExhaustionRecord(build);
            expect(build).not.toHaveBeenCalled();
            setFlag('corps_plan');
            emitCorpsExhaustionRecord(build);
            expect(build).toHaveBeenCalledTimes(1);
        } finally {
            spy.mockRestore();
        }
        expect(lines).toHaveLength(1);
        expect(lines[0]!.startsWith(CORPS_EXHAUSTION_PREFIX)).toBe(true);
        expect(JSON.parse(lines[0]!.slice(CORPS_EXHAUSTION_PREFIX.length + 1))).toMatchObject({ schema_version: 1, source: 'decay_idle', before: 10, after: 8 });
    });

    it('change no state: the pass leaves the same GameState with the topic on and off', () => {
        setFlag(undefined);
        const off = runPass().state;
        setFlag('corps_plan');
        const on = runPass().state;
        expect(JSON.stringify(on)).toBe(JSON.stringify(off));
    });
});
