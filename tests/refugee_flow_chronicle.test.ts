import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { buildRefugeeFlowChronicleEntries } from '../src/ui/map/components/chronicle/refugeeFlowChronicle.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import {
    REFUGEE_MILESTONE_RUNGS,
    REFUGEE_SURGE_ABSOLUTE_FLOOR,
} from '../src/ui/map/data/refugeeFlow.js';

function rawStateWith(recentByTurn: Record<number, number>): GameState {
    return {
        displacement: {
            displacement_recent_by_turn: recentByTurn,
        },
    } as unknown as GameState;
}

function makeTurnSummary(turn: number) {
    return {
        turn,
        battles: [], notable_flips: [], events_fired: [], notable_events: [],
        decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
        displacement_total: 0, displacement_by_ethnicity: {},
        territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
        movements: [], supply_transitions: [],
    };
}

describe('refugee-flow Chronicle cadence beats (D2 mid-1995 void)', () => {
    it('returns [] when raw state or the per-turn tally is absent', () => {
        expect(buildRefugeeFlowChronicleEntries(undefined, 188)).toEqual([]);
        expect(buildRefugeeFlowChronicleEntries({ displacement: {} } as any, 188)).toEqual([]);
        expect(buildRefugeeFlowChronicleEntries({} as any, 188)).toEqual([]);
    });

    it('emits no milestone beat below the lowest rung', () => {
        // Cumulative 1,000 never reaches the 250k floor; the single spike DOES
        // surge (first turn, >= absolute floor), so only the surge appears.
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith({ 10: 1000 }), 188);
        expect(entries.some(e => e.id?.startsWith('refugee-milestone-'))).toBe(false);
        expect(entries.filter(e => e.id?.startsWith('refugee-surge-')).map(e => e.id)).toEqual(['refugee-surge-10']);
    });

    it('pins each cumulative-milestone beat to the FIRST turn its rung is crossed', () => {
        // Steady 100k/turn: 250k crossed at w3 (300k), 500k at w5, 750k at w8 (800k).
        const recent: Record<number, number> = {};
        for (let t = 1; t <= 10; t++) recent[t] = 100_000;
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 10);
        const milestones = entries.filter(e => e.id?.startsWith('refugee-milestone-'));
        const byId = new Map(milestones.map(e => [e.id, e.turn]));
        expect(byId.get('refugee-milestone-250000')).toBe(3);
        expect(byId.get('refugee-milestone-500000')).toBe(5);
        expect(byId.get('refugee-milestone-750000')).toBe(8);
        // 1,000,000 is reached exactly at w10.
        expect(byId.get('refugee-milestone-1000000')).toBe(10);
    });

    it('a single large turn crosses several rungs at once — one beat each, all at that turn', () => {
        // One catastrophic week of 700k (the 1992-expulsion texture) crosses
        // 250k + 500k in the same turn.
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith({ 5: 700_000 }), 188);
        const milestones = entries.filter(e => e.id?.startsWith('refugee-milestone-'));
        expect(milestones.map(e => e.id)).toEqual([
            'refugee-milestone-250000',
            'refugee-milestone-500000',
        ]);
        expect(milestones.every(e => e.turn === 5)).toBe(true);
    });

    it('detects single-turn surges against the prior week (>= floor AND >= 3x prior)', () => {
        // w1 baseline 200 (below floor, no surge); w2 steady; w3 spike 3460 vs 588 prior.
        const recent = { 1: 200, 2: 588, 3: 3460, 4: 300 };
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        const surges = entries.filter(e => e.id?.startsWith('refugee-surge-'));
        // Only w3 qualifies (3460 >= 1000 AND >= 3*588).
        expect(surges.map(e => e.id)).toEqual(['refugee-surge-3']);
        expect(surges[0].turn).toBe(3);
        expect(surges[0].detail).toContain('3,460');
    });

    it('compares surge flow to the actual prior week, treating missing weeks as zero', () => {
        const recent = { 1: 1000, 3: 2000 };
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        const surges = entries.filter(e => e.id?.startsWith('refugee-surge-'));
        expect(surges.map(e => e.id)).toEqual(['refugee-surge-1', 'refugee-surge-3']);
    });

    it('does NOT surge on the steady late-war trickle (no false cadence noise)', () => {
        // The void baseline: ~200-300/week, gently declining. No turn is >= floor.
        const recent: Record<number, number> = {};
        for (let t = 141; t <= 159; t++) recent[t] = 300 - (t - 141) * 5;
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 159);
        expect(entries.filter(e => e.id?.startsWith('refugee-surge-')).length).toBe(0);
    });

    it('FILLS the w140-160 void: a real enclave-flight profile fires beats in-window', () => {
        // Reconstructed from the 188w close-out run: front-loaded 1992 expulsions
        // (cumulative ~1.49M by w140), then the slow grind + the w140/w160 flight
        // waves push the 1.5M rung across at w161, and surges land at w140/w160.
        const recent: Record<number, number> = {};
        recent[5] = 1_480_000;          // early-war expulsion mass (lands the low rungs in 1992)
        for (let t = 6; t <= 139; t++) recent[t] = 50; // long quiet grind → ~1,486,700 by w139
        recent[140] = 3460;             // enclave-flight wave (surge, prior ~50) → ~1,490,160
        for (let t = 141; t <= 159; t++) recent[t] = 250; // void trickle → ~1,494,910 by w159
        recent[160] = 6000;             // second flight wave — pushes cumulative over 1.5M, surges
        recent[161] = 200;
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);

        const inVoid = entries.filter(e => e.turn >= 140 && e.turn <= 161);
        expect(inVoid.length).toBeGreaterThanOrEqual(3);
        // The 1.5M milestone lands in the void (crossed by the w160 wave).
        const m15 = entries.find(e => e.id === 'refugee-milestone-1500000');
        expect(m15).toBeDefined();
        expect(m15!.turn).toBe(160);
        // Both enclave-flight weeks surge.
        expect(entries.some(e => e.id === 'refugee-surge-140')).toBe(true);
        expect(entries.some(e => e.id === 'refugee-surge-160')).toBe(true);
    });

    it('§6 guardrail: cadence prose names no atrocity, perpetrator, or enclave', () => {
        const recent: Record<number, number> = { 5: 700_000, 140: 3460, 160: 6000 };
        for (let t = 6; t <= 139; t++) recent[t] = 6000; // climb the upper rungs
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        expect(entries.length).toBeGreaterThan(0);
        const forbidden = /srebrenica|žepa|zepa|genocide|massacre|mladic|mladić|vrs|serb|muslim|bosniak|atrocit|cleans|RBiH|RS|HRHB/i;
        for (const e of entries) {
            expect(e.title).not.toMatch(forbidden);
            expect(e.detail).not.toMatch(forbidden);
            expect(e.type).toBe('humanitarian');
        }
    });

    it('only the >= 1M rungs headline; lower rungs are quiet ledger beats', () => {
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith({ 5: 1_300_000 }), 188);
        expect(entries.find(e => e.id === 'refugee-milestone-250000')?.headline).toBe(false);
        expect(entries.find(e => e.id === 'refugee-milestone-1000000')?.headline).toBe(true);
        expect(entries.find(e => e.id === 'refugee-milestone-1250000')?.headline).toBe(true);
    });

    it('is deterministic — identical state yields identical entries', () => {
        const recent = { 5: 700_000, 34: 1_250_000 - 700_000, 140: 3460, 160: 6000 };
        const a = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        const b = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        expect(a).toEqual(b);
    });

    it('ignores turns beyond the latest recorded turn (never dates a beat in the future)', () => {
        const recent = { 5: 700_000, 200: 9_000_000 };
        const entries = buildRefugeeFlowChronicleEntries(rawStateWith(recent), 188);
        // The w200 mega-tally is out of bounds: no beat at w200, and the upper
        // rungs it would have crossed do not fire.
        expect(entries.some(e => e.turn === 200)).toBe(false);
        expect(entries.some(e => e.id === 'refugee-milestone-2000000')).toBe(false);
    });

    it('integrates into generateChronicleEntries via rawGameState', () => {
        const state = {
            turn: 188,
            turnSummaries: [makeTurnSummary(40), makeTurnSummary(160), makeTurnSummary(188)],
            firedEvents: [],
            rawGameState: rawStateWith({ 5: 700_000, 160: 1_000_000 }),
        };
        const entries = generateChronicleEntries(state as any);
        const beats = entries.filter(e => typeof e.id === 'string' && e.id.startsWith('refugee-'));
        expect(beats.length).toBeGreaterThan(0);
        // Sorted by turn alongside the rest of the chronicle.
        const turns = entries.map(e => e.turn);
        expect(turns).toEqual([...turns].sort((a, b) => a - b));
    });

    it('emits nothing through generateChronicleEntries when rawGameState is absent', () => {
        const state = {
            turn: 188,
            turnSummaries: [makeTurnSummary(188)],
            firedEvents: [],
        };
        const entries = generateChronicleEntries(state as any);
        expect(entries.some(e => typeof e.id === 'string' && e.id.startsWith('refugee-'))).toBe(false);
    });

    it('rungs and surge floor are sane constants', () => {
        // Guards against an accidental retune that would empty the void of cadence.
        expect(REFUGEE_MILESTONE_RUNGS[0]).toBe(250_000);
        expect([...REFUGEE_MILESTONE_RUNGS]).toEqual([...REFUGEE_MILESTONE_RUNGS].sort((a, b) => a - b));
        expect(REFUGEE_SURGE_ABSOLUTE_FLOOR).toBeGreaterThan(0);
    });
});
