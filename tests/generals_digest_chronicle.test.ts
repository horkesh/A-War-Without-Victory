import { describe, expect, it } from 'vitest';
import { buildGeneralsDigestChronicleEntries } from '../src/ui/map/components/chronicle/generalsDigestChronicle.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import {
    assertDigestProseClean,
    deriveActiveOps,
    deriveDigestTurn,
    factionFromCorpsId,
    formatDigestCorpsName,
    isQuietWeek,
    DIGEST_FORBIDDEN_VOCAB,
} from '../src/ui/map/data/generalsDigest.js';

/** A minimal TurnSummary-shaped object. */
function summary(turn: number, over: Record<string, unknown> = {}) {
    return {
        turn,
        battles: [],
        notable_flips: [],
        events_fired: [],
        notable_events: [],
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        territory_net: {},
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        ...over,
    };
}

function corpsCommandWith(ops: Record<string, { name: string; phase: string }[]>) {
    const out: Record<string, unknown> = {};
    for (const [corpsId, list] of Object.entries(ops)) {
        out[corpsId] = { active_operations: list.map((o) => ({ name: o.name, phase: o.phase })) };
    }
    return out;
}

describe('generals-digest helpers', () => {
    it('maps corps-id prefixes to factions', () => {
        expect(factionFromCorpsId('arbih_2nd_corps')).toBe('RBiH');
        expect(factionFromCorpsId('vrs_drina')).toBe('RS');
        expect(factionFromCorpsId('hvo_central_bosnia')).toBe('HRHB');
        expect(factionFromCorpsId('main_staff')).toBeNull();
    });

    it('formats corps display names, stripping the faction prefix', () => {
        expect(formatDigestCorpsName('arbih_2nd_corps')).toBe('2nd Corps');
        expect(formatDigestCorpsName('vrs_sarajevo_romanija')).toBe('Sarajevo Romanija');
        expect(formatDigestCorpsName('hvo_central_bosnia')).toBe('Central Bosnia');
    });

    it('derives active ops for the player faction only, sorted, execution flagged', () => {
        const cmd = corpsCommandWith({
            arbih_1st_corps: [{ name: 'operation_trnovo', phase: 'execution' }],
            arbih_2nd_corps: [{ name: 'Operation Olovo', phase: 'planning' }],
            vrs_drina: [{ name: 'should_not_appear', phase: 'execution' }],
        });
        const ops = deriveActiveOps(cmd, 'RBiH');
        expect(ops.map((o) => o.corpsId)).toEqual(['arbih_1st_corps', 'arbih_2nd_corps']);
        expect(ops[0].opName).toBe('Trnovo');
        expect(ops[0].pressing).toBe(true);
        expect(ops[1].opName).toBe('Operation Olovo');
        expect(ops[1].pressing).toBe(false);
    });

    it('ignores recovery-phase ops (not "doing something this week")', () => {
        const cmd = corpsCommandWith({
            arbih_3rd_corps: [{ name: 'winding_down', phase: 'recovery' }],
        });
        expect(deriveActiveOps(cmd, 'RBiH')).toEqual([]);
    });

    it('returns [] for absent / malformed corps_command', () => {
        expect(deriveActiveOps(undefined, 'RBiH')).toEqual([]);
        expect(deriveActiveOps(null, 'RBiH')).toEqual([]);
        expect(deriveActiveOps('nope', 'RBiH')).toEqual([]);
    });

    it('scopes battles, attrition, and territory to the player faction', () => {
        const s = summary(40, {
            battles: [
                { attacker_faction: 'RBiH', defender_faction: 'RS', attacker_casualties: 30, defender_casualties: 50 },
                { attacker_faction: 'RS', defender_faction: 'RBiH', attacker_casualties: 20, defender_casualties: 15 },
                { attacker_faction: 'RS', defender_faction: 'HRHB', attacker_casualties: 99, defender_casualties: 99 },
            ],
            territory_net: { RBiH: 2, RS: -2 },
            formation_destructions: [
                { faction: 'RBiH', formation_id: 'b1', formation_name: 'X' },
                { faction: 'RS', formation_id: 'b2', formation_name: 'Y' },
            ],
            notable_flips: [
                { from: 'RS', to: 'RBiH', significance: 'municipality_seat' },
                { from: 'RBiH', to: 'RS', significance: 'corridor' },
            ],
        });
        const d = deriveDigestTurn(s, 'RBiH', undefined);
        // Player a party to battles 1 (attacker, 30) + 2 (defender, 15); battle 3 excluded.
        expect(d.battleCount).toBe(2);
        expect(d.friendlyCasualties).toBe(45);
        expect(d.netTerritory).toBe(2);
        expect(d.ownFormationsDestroyed).toBe(1);
        expect(d.notableGains).toBe(1);
        expect(d.notableLosses).toBe(1);
    });

    it('identifies a quiet week (no ops, battles, ground, or losses)', () => {
        const d = deriveDigestTurn(summary(50), 'RBiH', undefined);
        expect(isQuietWeek(d)).toBe(true);
    });
});

describe('generals-digest Chronicle beats (D2 task #42)', () => {
    it('returns [] for an observer (no player faction)', () => {
        expect(buildGeneralsDigestChronicleEntries([summary(10)], null, undefined, 10)).toEqual([]);
        expect(buildGeneralsDigestChronicleEntries([summary(10)], 'observer', undefined, 10)).toEqual([]);
    });

    it('returns [] with no turn history', () => {
        expect(buildGeneralsDigestChronicleEntries([], 'RBiH', undefined, 10)).toEqual([]);
        expect(buildGeneralsDigestChronicleEntries(undefined, 'RBiH', undefined, 10)).toEqual([]);
    });

    it('emits one stable-id beat per turn, dated at that turn, sorted ascending', () => {
        const entries = buildGeneralsDigestChronicleEntries(
            [summary(12), summary(40), summary(30)],
            'RBiH',
            undefined,
            40,
        );
        expect(entries.map((e) => e.id)).toEqual([
            'generals-digest-12',
            'generals-digest-30',
            'generals-digest-40',
        ]);
        expect(entries.map((e) => e.turn)).toEqual([12, 30, 40]);
        expect(entries.every((e) => e.type === 'military')).toBe(true);
    });

    it('only the LATEST turn reads the live corps_command snapshot', () => {
        const cmd = corpsCommandWith({
            arbih_2nd_corps: [{ name: 'Operation Olovo', phase: 'execution' }],
        });
        const entries = buildGeneralsDigestChronicleEntries(
            [summary(39), summary(40)],
            'RBiH',
            cmd,
            40,
        );
        const w39 = entries.find((e) => e.turn === 39)!;
        const w40 = entries.find((e) => e.turn === 40)!;
        // w40 is enriched with the live op (pressing → headline); w39 is the quiet week.
        expect(w40.detail).toContain('2nd Corps');
        expect(w40.detail).toContain('Operation Olovo');
        expect(w40.headline).toBe(true);
        expect(w39.title).toBe('The fronts were quiet this week');
        expect(w39.headline).toBe(false);
    });

    it('a quiet week emits an ambient, non-headline "fronts quiet" beat with no metadata', () => {
        const entries = buildGeneralsDigestChronicleEntries([summary(77)], 'RBiH', undefined, 77);
        expect(entries).toHaveLength(1);
        expect(entries[0].title).toBe('The fronts were quiet this week');
        expect(entries[0].headline).toBe(false);
        expect(entries[0].metadata).toBeUndefined();
    });

    it('reports ground gained and own attrition in the prose', () => {
        const s = summary(120, {
            battles: [
                { attacker_faction: 'RBiH', defender_faction: 'RS', attacker_casualties: 200, defender_casualties: 100 },
            ],
            territory_net: { RBiH: 3 },
            formation_destructions: [{ faction: 'RBiH', formation_id: 'b1', formation_name: 'X' }],
        });
        const entries = buildGeneralsDigestChronicleEntries([s], 'RBiH', undefined, 120);
        expect(entries).toHaveLength(1);
        const e = entries[0];
        expect(e.detail).toContain('3 settlements taken');
        expect(e.detail).toContain('1 of your formations lost');
        // Own formation loss → headline.
        expect(e.headline).toBe(true);
        expect(e.metadata?.netFriendlyTerritory).toBe(3);
        expect(e.metadata?.ownFormationsDestroyed).toBe(1);
    });

    it('reports ground given up when the player loses settlements', () => {
        const s = summary(85, { territory_net: { RBiH: -2 }, battles: [
            { attacker_faction: 'RS', defender_faction: 'RBiH', attacker_casualties: 10, defender_casualties: 40 },
        ] });
        const entries = buildGeneralsDigestChronicleEntries([s], 'RBiH', undefined, 85);
        expect(entries[0].detail).toContain('2 settlements given up');
    });

    it('is deterministic — identical inputs yield identical entries', () => {
        const summaries = [summary(10, { territory_net: { RBiH: 1 } }), summary(20)];
        const cmd = corpsCommandWith({ arbih_1st_corps: [{ name: 'op_x', phase: 'execution' }] });
        const a = buildGeneralsDigestChronicleEntries(summaries, 'RBiH', cmd, 20);
        const b = buildGeneralsDigestChronicleEntries(summaries, 'RBiH', cmd, 20);
        expect(a).toEqual(b);
    });

    it('is faction-aware — RS player sees RS corps, not RBiH', () => {
        const cmd = corpsCommandWith({
            arbih_1st_corps: [{ name: 'arbih_op', phase: 'execution' }],
            vrs_drina: [{ name: 'vrs_op', phase: 'execution' }],
        });
        const entries = buildGeneralsDigestChronicleEntries([summary(60)], 'RS', cmd, 60);
        expect(entries[0].detail).toContain('Drina');
        expect(entries[0].detail).not.toContain('1st Corps');
    });

    it('§6 guardrail: digest prose carries no atrocity / perpetrator / enclave vocabulary', () => {
        // A rich week across many activity shapes — exercise every prose branch.
        const summaries = [
            summary(160, {
                battles: [
                    { attacker_faction: 'RBiH', defender_faction: 'RS', attacker_casualties: 300, defender_casualties: 100 },
                ],
                territory_net: { RBiH: 2 },
                formation_destructions: [{ faction: 'RBiH', formation_id: 'b1', formation_name: 'X' }],
                notable_flips: [{ from: 'RS', to: 'RBiH', significance: 'municipality_seat' }],
            }),
            summary(161, { territory_net: { RBiH: -1 } }),
            summary(162),
        ];
        const cmd = corpsCommandWith({
            arbih_2nd_corps: [{ name: 'Operation Olovo', phase: 'execution' }],
            arbih_5th_corps: [{ name: 'una_sweep', phase: 'planning' }],
        });
        const entries = buildGeneralsDigestChronicleEntries(summaries, 'RBiH', cmd, 162);
        expect(entries.length).toBeGreaterThan(0);
        for (const e of entries) {
            expect(e.title).not.toMatch(DIGEST_FORBIDDEN_VOCAB);
            expect(e.detail).not.toMatch(DIGEST_FORBIDDEN_VOCAB);
            // The guard helper must not throw on any emitted prose.
            expect(() => assertDigestProseClean(e.title)).not.toThrow();
            expect(() => assertDigestProseClean(e.detail)).not.toThrow();
        }
    });

    it('the forbidden-vocab guard actually fires on §6-sensitive text', () => {
        expect(() => assertDigestProseClean('the Srebrenica enclave fell')).toThrow();
        expect(() => assertDigestProseClean('a clean military week')).not.toThrow();
    });

    it('integrates into generateChronicleEntries via turnSummaries + rawGameState', () => {
        const state = {
            turn: 40,
            player_faction: 'RBiH',
            turnSummaries: [summary(12), summary(40, { territory_net: { RBiH: 1 } })],
            firedEvents: [],
            rawGameState: {
                military: {
                    corps_command: corpsCommandWith({
                        arbih_1st_corps: [{ name: 'Operation Trnovo', phase: 'execution' }],
                    }),
                },
            },
        };
        const entries = generateChronicleEntries(state as any);
        const beats = entries.filter((e) => typeof e.id === 'string' && e.id.startsWith('generals-digest-'));
        expect(beats.length).toBe(2);
        // Sorted alongside the rest of the chronicle.
        const turns = entries.map((e) => e.turn);
        expect(turns).toEqual([...turns].sort((a, b) => a - b));
    });

    it('emits no digest through generateChronicleEntries when there is no player faction', () => {
        const state = {
            turn: 40,
            player_faction: null,
            turnSummaries: [summary(40)],
            firedEvents: [],
        };
        const entries = generateChronicleEntries(state as any);
        expect(entries.some((e) => typeof e.id === 'string' && e.id.startsWith('generals-digest-'))).toBe(false);
    });
});
