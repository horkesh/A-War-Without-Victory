import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { buildWarWearinessChronicleEntries } from '../src/ui/map/components/chronicle/warWearinessChronicle.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

function rawStateWith(warExhaustion: Record<string, number>, collapseEligibility?: any): GameState {
    return {
        political: {
            war_exhaustion: warExhaustion,
            ...(collapseEligibility ? { collapse_eligibility: collapseEligibility } : {}),
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

describe('war-weariness Chronicle beats (Collapse Repurpose Design A)', () => {
    it('returns [] when raw state or war_exhaustion is absent', () => {
        expect(buildWarWearinessChronicleEntries(undefined, 10)).toEqual([]);
        expect(buildWarWearinessChronicleEntries({ political: {} } as any, 10)).toEqual([]);
    });

    it('emits no beat for a steady faction (below the strained floor)', () => {
        const entries = buildWarWearinessChronicleEntries(rawStateWith({ RBiH: 1000 }), 12);
        expect(entries).toEqual([]);
    });

    it('emits one beat per crossed band up to the current band (monotonic ⇒ cumulative)', () => {
        // RBiH at 90 → collapsing (rank 3): strained + cracking + collapsing
        const entries = buildWarWearinessChronicleEntries(rawStateWith({ RBiH: 9000 }), 80);
        const ids = entries.map(e => e.id);
        expect(ids).toEqual([
            'war-weariness-RBiH-strained',
            'war-weariness-RBiH-cracking',
            'war-weariness-RBiH-collapsing',
        ]);
        expect(entries.every(e => e.turn === 80)).toBe(true);
        expect(entries.every(e => e.type === 'consequence')).toBe(true);
        // only the deepest band headlines
        expect(entries.find(e => e.id === 'war-weariness-RBiH-collapsing')?.headline).toBe(true);
        expect(entries.find(e => e.id === 'war-weariness-RBiH-strained')?.headline).toBe(false);
    });

    it('a cracking faction gets strained + cracking only (not collapsing)', () => {
        const entries = buildWarWearinessChronicleEntries(rawStateWith({ RBiH: 7000 }), 55);
        expect(entries.map(e => e.id)).toEqual([
            'war-weariness-RBiH-strained',
            'war-weariness-RBiH-cracking',
        ]);
    });

    it('emits beats for ALL three factions — universal war-weariness', () => {
        const entries = buildWarWearinessChronicleEntries(
            rawStateWith({ HRHB: 4500, RBiH: 7000, RS: 9000 }),
            120,
        );
        // HRHB strained(1) + RBiH strained+cracking(2) + RS strained+cracking+collapsing(3) = 6
        expect(entries.length).toBe(6);
        expect(entries.some(e => e.id === 'war-weariness-HRHB-strained')).toBe(true);
        expect(entries.some(e => e.id === 'war-weariness-RS-collapsing')).toBe(true);
        // every faction surfaces a faction-named title
        expect(entries.find(e => e.id === 'war-weariness-RS-collapsing')?.title).toContain('War-weariness');
    });

    it('is deterministic — identical state yields identical entries', () => {
        const a = buildWarWearinessChronicleEntries(rawStateWith({ RBiH: 9000, RS: 7000 }), 80);
        const b = buildWarWearinessChronicleEntries(rawStateWith({ RBiH: 9000, RS: 7000 }), 80);
        expect(a).toEqual(b);
    });

    it('integrates into generateChronicleEntries via rawGameState, dated at the latest turn', () => {
        const state = {
            turn: 80,
            turnSummaries: [makeTurnSummary(40), makeTurnSummary(80)],
            firedEvents: [],
            rawGameState: rawStateWith({ RBiH: 9000 }),
        };
        const entries = generateChronicleEntries(state as any);
        const beats = entries.filter(e => typeof e.id === 'string' && e.id.startsWith('war-weariness-'));
        expect(beats.length).toBe(3);
        expect(beats.every(e => e.turn === 80)).toBe(true);
    });

    it('emits nothing through generateChronicleEntries when rawGameState is absent', () => {
        const state = {
            turn: 80,
            turnSummaries: [makeTurnSummary(80)],
            firedEvents: [],
        };
        const entries = generateChronicleEntries(state as any);
        expect(entries.some(e => typeof e.id === 'string' && e.id.startsWith('war-weariness-'))).toBe(false);
    });
});
