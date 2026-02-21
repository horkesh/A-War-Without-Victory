/**
 * Tests for settlement-level control change (wave + holdout cleanup).
 * Stage 1A of Brigade Operations System.
 */
import { describe, expect, it } from 'vitest';
import type { EdgeRecord, SettlementRecord } from '../src/map/settlements.js';
import type { HoldoutScalingContext } from '../src/sim/phase_i/settlement_control.js';
import { applyWaveFlip, buildSettlementAdjacency, processHoldoutCleanup } from '../src/sim/phase_i/settlement_control.js';
import type { GameState, MunicipalityId, SettlementId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Create minimal GameState for testing. */
function makeState(overrides?: Partial<GameState>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'settlement-test',
            phase: 'phase_i',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as any,
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {},
        ...overrides
    } as GameState;
}

/** Settlement data with ethnicity info. */
function makeSettlementData(sids: Array<{ sid: string; serb: number; bosniak: number }>) {
    const map = new Map<string, { ethnicity: { composition: Record<string, number> } }>();
    for (const s of sids) {
        map.set(s.sid, {
            ethnicity: {
                composition: {
                    serb: s.serb,
                    bosniak: s.bosniak,
                    croat: 1 - s.serb - s.bosniak,
                    other: 0
                }
            }
        });
    }
    return map;
}

describe('applyWaveFlip', () => {
    it('flips settlements with attacker demographic majority', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RBiH',
                S2: 'RBiH',
                S3: 'RBiH'
            }
        });

        const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
        settlementsByMun.set('mun1', ['S1', 'S2', 'S3']);

        const settlementData = makeSettlementData([
            { sid: 'S1', serb: 0.60, bosniak: 0.30 }, // Serb majority → flip
            { sid: 'S2', serb: 0.35, bosniak: 0.55 }, // Bosniak majority → holdout
            { sid: 'S3', serb: 0.45, bosniak: 0.40 }, // Serb plurality → flip
        ]);

        const result = applyWaveFlip(state, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10);

        // S1 and S3 should flip (serb share >= bosniak share or >= 0.30 threshold)
        expect(result.flipped).toContain('S1');
        expect(result.flipped).toContain('S3');

        // S2 should remain a holdout because attacker share does not beat defender share.
        expect(result.flipped).not.toContain('S2');
        expect(result.holdouts).toContain('S2');
    });

    it('creates holdouts for settlements where attacker has very low ethnic share', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RBiH',
                S2: 'RBiH'
            }
        });

        const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
        settlementsByMun.set('mun1', ['S1', 'S2']);

        const settlementData = makeSettlementData([
            { sid: 'S1', serb: 0.10, bosniak: 0.80 }, // Very low serb → holdout
            { sid: 'S2', serb: 0.50, bosniak: 0.40 }, // Serb majority → flip
        ]);

        const result = applyWaveFlip(state, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10);

        expect(result.holdouts).toContain('S1');
        expect(result.flipped).toContain('S2');

        // S1 should have holdout state
        expect(state.settlement_holdouts?.['S1']?.holdout).toBe(true);
        expect(state.settlement_holdouts?.['S1']?.holdout_faction).toBe('RBiH');
        expect(state.settlement_holdouts?.['S1']?.occupying_faction).toBe('RS');
        // Holdouts keep prior control until military cleanup/surrender resolves them.
        expect(state.political_controllers?.['S1']).toBe('RBiH');
    });

    it('skips settlements already controlled by new controller', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RS', // Already RS
                S2: 'RBiH'
            }
        });

        const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
        settlementsByMun.set('mun1', ['S1', 'S2']);

        const settlementData = makeSettlementData([
            { sid: 'S1', serb: 0.80, bosniak: 0.10 },
            { sid: 'S2', serb: 0.80, bosniak: 0.10 },
        ]);

        const result = applyWaveFlip(state, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10);

        expect(result.flipped).not.toContain('S1');
        expect(result.flipped).toContain('S2');
    });

    it('generates correct event types', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RBiH',
                S2: 'RBiH'
            }
        });

        const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
        settlementsByMun.set('mun1', ['S1', 'S2']);

        const settlementData = makeSettlementData([
            { sid: 'S1', serb: 0.80, bosniak: 0.10 },
            { sid: 'S2', serb: 0.05, bosniak: 0.90 },
        ]);

        const result = applyWaveFlip(state, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10);

        const flipEvents = result.events.filter(e => e.mechanism === 'wave_flip');
        const holdoutEvents = result.events.filter(e => e.mechanism === 'holdout_created');

        expect(flipEvents.length).toBe(1);
        expect(flipEvents[0].settlement_id).toBe('S1');
        expect(holdoutEvents.length).toBe(1);
        expect(holdoutEvents[0].settlement_id).toBe('S2');
    });

    it('scales holdout resistance by population and degree when scalingContext provided', () => {
        const state = makeState({
            political_controllers: { S1: 'RBiH', S2: 'RBiH' }
        });
        const settlementsByMun = new Map<MunicipalityId, SettlementId[]>();
        settlementsByMun.set('mun1', ['S1', 'S2']);
        const settlementData = makeSettlementData([
            { sid: 'S1', serb: 0.05, bosniak: 0.90 },
            { sid: 'S2', serb: 0.05, bosniak: 0.90 },
        ]);
        const scalingContext: HoldoutScalingContext = {
            sidToPopulation: new Map([['S1', 500], ['S2', 50000]]),
            sidToDegree: new Map([['S1', 2], ['S2', 12]]),
        };
        const resultNoScale = applyWaveFlip(state, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10);
        const state2 = makeState({ political_controllers: { S1: 'RBiH', S2: 'RBiH' } });
        const resultWithScale = applyWaveFlip(state2, 'mun1', 'RS', 'RBiH', settlementsByMun, settlementData, 10, scalingContext);
        expect(resultNoScale.holdouts).toContain('S1');
        expect(resultNoScale.holdouts).toContain('S2');
        expect(resultWithScale.holdouts).toContain('S1');
        expect(resultWithScale.holdouts).toContain('S2');
        const res1 = state.settlement_holdouts?.['S1']?.holdout_resistance ?? 0;
        const res2 = state.settlement_holdouts?.['S2']?.holdout_resistance ?? 0;
        const res1Scaled = state2.settlement_holdouts?.['S1']?.holdout_resistance ?? 0;
        const res2Scaled = state2.settlement_holdouts?.['S2']?.holdout_resistance ?? 0;
        expect(res1Scaled).toBeGreaterThan(res1);
        expect(res2Scaled).toBeGreaterThan(res2);
        expect(res2Scaled).toBeGreaterThan(res1Scaled);
    });
});

describe('processHoldoutCleanup', () => {
    it('clears holdouts when formation is adjacent', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RS',  // controlled by RS (holdout of RBiH)
                S2: 'RS',  // controlled by RS (normal)
                S3: 'RBiH' // RBiH territory (holdout supply)
            },
            settlement_holdouts: {
                S1: {
                    holdout: true,
                    holdout_faction: 'RBiH',
                    occupying_faction: 'RS',
                    holdout_resistance: 30,
                    holdout_since_turn: 8,
                    isolated_turns: 0
                }
            },
            formations: {
                'brig-1': {
                    id: 'brig-1',
                    faction: 'RS',
                    name: 'Test Brigade',
                    created_turn: 5,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    personnel: 800,
                    cohesion: 60,
                    tags: ['mun:mun1'],
                    hq_sid: 'S2'
                }
            } as any
        });

        const edges: EdgeRecord[] = [
            { a: 'S1', b: 'S2' },
            { a: 'S1', b: 'S3' }
        ];

        const settlements = new Map<string, SettlementRecord>();
        settlements.set('S1', { sid: 'S1', source_id: '1', mun_code: 'mun1', mun: 'Mun1', mun1990_id: 'mun1' });
        settlements.set('S2', { sid: 'S2', source_id: '2', mun_code: 'mun1', mun: 'Mun1', mun1990_id: 'mun1' });
        settlements.set('S3', { sid: 'S3', source_id: '3', mun_code: 'mun2', mun: 'Mun2', mun1990_id: 'mun2' });

        const events = processHoldoutCleanup(state, 11, edges, settlements);

        // Holdout should be cleared (brigade has strength 800*0.6=480 > 30*50/100=15)
        expect(state.settlement_holdouts?.['S1']).toBeUndefined();
        expect(events.length).toBe(1);
        expect(events[0].mechanism).toBe('holdout_cleared');
    });

    it('surrenders holdouts after isolation period', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RS',  // RS controls, RBiH holdout
                S2: 'RS',  // RS territory (no RBiH connection)
            },
            settlement_holdouts: {
                S1: {
                    holdout: true,
                    holdout_faction: 'RBiH',
                    occupying_faction: 'RS',
                    holdout_resistance: 80,
                    holdout_since_turn: 5,
                    isolated_turns: 3  // Will become 4 → surrender
                }
            },
            formations: {}
        });

        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const settlements = new Map<string, SettlementRecord>();
        settlements.set('S1', { sid: 'S1', source_id: '1', mun_code: 'mun1', mun: 'Mun1', mun1990_id: 'mun1' });
        settlements.set('S2', { sid: 'S2', source_id: '2', mun_code: 'mun1', mun: 'Mun1', mun1990_id: 'mun1' });

        const events = processHoldoutCleanup(state, 11, edges, settlements);

        expect(state.settlement_holdouts?.['S1']).toBeUndefined();
        expect(events.length).toBe(1);
        expect(events[0].mechanism).toBe('holdout_surrendered');
    });

    it('resets isolation counter when supply connection exists', () => {
        const state = makeState({
            political_controllers: {
                S1: 'RS',   // RS controls, RBiH holdout
                S2: 'RBiH', // RBiH still controls adjacent
            },
            settlement_holdouts: {
                S1: {
                    holdout: true,
                    holdout_faction: 'RBiH',
                    occupying_faction: 'RS',
                    holdout_resistance: 80,
                    holdout_since_turn: 5,
                    isolated_turns: 2
                }
            },
            formations: {}
        });

        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const settlements = new Map<string, SettlementRecord>();
        settlements.set('S1', { sid: 'S1', source_id: '1', mun_code: 'mun1', mun: 'Mun1', mun1990_id: 'mun1' });
        settlements.set('S2', { sid: 'S2', source_id: '2', mun_code: 'mun2', mun: 'Mun2', mun1990_id: 'mun2' });

        processHoldoutCleanup(state, 11, edges, settlements);

        // Holdout faction (RBiH) still has S2 adjacent → supply exists → isolation reset
        const holdout = state.settlement_holdouts?.['S1'];
        expect(holdout?.isolated_turns).toBe(0);
        // Holdout still exists (no brigade to clear it)
        expect(holdout?.holdout).toBe(true);
    });
});

describe('buildSettlementAdjacency', () => {
    it('builds bidirectional adjacency', () => {
        const edges: EdgeRecord[] = [
            { a: 'S1', b: 'S2' },
            { a: 'S2', b: 'S3' }
        ];
        const adj = buildSettlementAdjacency(edges);
        expect(adj.get('S1')?.has('S2')).toBe(true);
        expect(adj.get('S2')?.has('S1')).toBe(true);
        expect(adj.get('S2')?.has('S3')).toBe(true);
        expect(adj.get('S1')?.has('S3')).toBe(false);
    });
});
