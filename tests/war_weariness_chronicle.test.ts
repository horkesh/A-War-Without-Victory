import { describe, expect, it } from 'vitest';
import type { FactionId, GameState } from '../src/state/game_state.js';
import { buildWarWearinessChronicleEntries } from '../src/ui/map/components/chronicle/warWearinessChronicle.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { recordWarWearinessBandCrossings } from '../src/state/exhaustion.js';

function rawStateWith(
    warExhaustion: Record<string, number>,
    collapseEligibility?: any,
    bandFirstReached?: Record<string, Partial<Record<string, number>>>,
): GameState {
    return {
        political: {
            war_exhaustion: warExhaustion,
            ...(collapseEligibility ? { collapse_eligibility: collapseEligibility } : {}),
            ...(bandFirstReached ? { war_weariness_band_first_reached: bandFirstReached } : {}),
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

    it('integrates into generateChronicleEntries via rawGameState; falls back to latest turn when the first-reached anchor is absent (legacy save)', () => {
        const state = {
            turn: 80,
            turnSummaries: [makeTurnSummary(40), makeTurnSummary(80)],
            firedEvents: [],
            rawGameState: rawStateWith({ RBiH: 9000 }),
        };
        const entries = generateChronicleEntries(state as any);
        const beats = entries.filter(e => typeof e.id === 'string' && e.id.startsWith('war-weariness-'));
        expect(beats.length).toBe(3);
        // No anchor on this raw state ⇒ degrade to the latest turn (still emitted).
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

    // --- Codex #402: each beat pins to the FIRST-crossing turn and fires ONCE ---

    it('pins each beat to the turn the band was first reached (not the latest turn)', () => {
        // RS at 9000 → collapsing; anchor says strained@12, cracking@31, collapsing@58.
        const entries = buildWarWearinessChronicleEntries(
            rawStateWith({ RS: 9000 }, undefined, {
                RS: { strained: 12, cracking: 31, collapsing: 58 },
            }),
            188, // latest turn is far in the future; must be IGNORED in favour of the anchor
        );
        const byId = new Map(entries.map(e => [e.id, e.turn]));
        expect(byId.get('war-weariness-RS-strained')).toBe(12);
        expect(byId.get('war-weariness-RS-cracking')).toBe(31);
        expect(byId.get('war-weariness-RS-collapsing')).toBe(58);
        // None re-dated to the moving latest turn.
        expect(entries.some(e => e.turn === 188)).toBe(false);
    });

    it('the crossing beat appears EXACTLY ONCE across many consecutive turns after the crossing (#402 regression)', () => {
        // Simulate the live read on turns 60..70, AFTER RS crossed collapsing at w58.
        // Before the fix, the collapsing beat re-emitted dated at each new latest
        // turn (60, 61, ... 70) → a fresh current-week item every week. With the
        // anchor, it must stay pinned at 58 on every read.
        const anchor = { RS: { strained: 12, cracking: 31, collapsing: 58 } };
        const collapsingTurns: number[] = [];
        for (let latest = 60; latest <= 70; latest++) {
            const entries = buildWarWearinessChronicleEntries(
                rawStateWith({ RS: 9000 }, undefined, anchor),
                latest,
            );
            const collapsing = entries.filter(e => e.id === 'war-weariness-RS-collapsing');
            // Stable id ⇒ a single render never duplicates within itself.
            expect(collapsing.length).toBe(1);
            collapsingTurns.push(collapsing[0].turn);
        }
        // Across all 11 reads the beat is pinned to the SAME crossing week (58).
        expect(new Set(collapsingTurns)).toEqual(new Set([58]));
        // Concretely: the Chronicle UI groups by turn, so this beat lands in
        // exactly ONE turn-group (week 58) regardless of how far the war has run.
        expect(collapsingTurns.every(t => t === 58)).toBe(true);
    });
});

describe('recordWarWearinessBandCrossings (#402 observational anchor)', () => {
    function simState(turn: number, warExhaustion: Record<string, number>, prior?: any): any {
        return {
            meta: { turn },
            factions: (['HRHB', 'RBiH', 'RS'] as FactionId[]).map(id => ({ id })),
            political: {
                war_exhaustion: warExhaustion,
                ...(prior ? { war_weariness_band_first_reached: prior } : {}),
            },
        };
    }

    it('writes nothing for a steady-only faction set (no-crossing path = byte-identical)', () => {
        const s = simState(5, { HRHB: 1000, RBiH: 500, RS: 3999 }); // all below strained (40 ⇒ 4000)
        recordWarWearinessBandCrossings(s as GameState);
        expect(s.political.war_weariness_band_first_reached).toBeUndefined();
    });

    it('stamps the current turn the FIRST time a band is crossed, and NEVER overwrites it', () => {
        const s = simState(13, { RS: 4200 }); // strained (42 ⇒ 4200)
        recordWarWearinessBandCrossings(s as GameState);
        expect(s.political.war_weariness_band_first_reached.RS).toEqual({ strained: 13 });

        // Later turn, deeper band: strained stays at 13, cracking stamps the new turn.
        s.meta.turn = 40;
        s.political.war_exhaustion.RS = 7000; // cracking (70)
        recordWarWearinessBandCrossings(s as GameState);
        expect(s.political.war_weariness_band_first_reached.RS).toEqual({ strained: 13, cracking: 40 });

        // Re-run at an even later turn at the SAME band ⇒ no field moves (idempotent).
        s.meta.turn = 99;
        recordWarWearinessBandCrossings(s as GameState);
        expect(s.political.war_weariness_band_first_reached.RS).toEqual({ strained: 13, cracking: 40 });
    });

    it('records all bands crossed in a single jump, each pinned to that turn, all factions', () => {
        const s = simState(70, { HRHB: 4500, RBiH: 7000, RS: 9000 });
        recordWarWearinessBandCrossings(s as GameState);
        const m = s.political.war_weariness_band_first_reached;
        expect(m.HRHB).toEqual({ strained: 70 });
        expect(m.RBiH).toEqual({ strained: 70, cracking: 70 });
        expect(m.RS).toEqual({ strained: 70, cracking: 70, collapsing: 70 });
    });

    it('is deterministic — identical state in yields identical anchor out', () => {
        const a = simState(50, { RBiH: 9000, RS: 7000 });
        const b = simState(50, { RBiH: 9000, RS: 7000 });
        recordWarWearinessBandCrossings(a as GameState);
        recordWarWearinessBandCrossings(b as GameState);
        expect(a.political.war_weariness_band_first_reached).toEqual(b.political.war_weariness_band_first_reached);
    });
});
