/**
 * Comprehensive Dayton — Phase 1 keystone tests (peace_dysfunction_index).
 *
 * Covers: the formula sub-components, the outcome_class cap, emergent-gating,
 * back-compat (non-Dayton / non-emergent), and save/load round-trip of the
 * frozen field on the endgame snapshot.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { DaytonResult } from '../src/state/negotiation_types.js';
import {
    computePeaceDysfunctionIndex,
    computePeaceDysfunctionBreakdown,
    capOutcomeByPeaceDysfunction,
    PEACE_DYSFUNCTION_CAP_THRESHOLD,
} from '../src/sim/negotiation/peace_dysfunction.js';
import { computeEntityAutonomyIndex } from '../src/sim/negotiation/institutional_packages.js';
import { freezeEndgameSnapshot } from '../src/sim/endgame/endgame_snapshot.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeDaytonResult(overrides: Partial<DaytonResult> = {}): DaytonResult {
    return {
        territorial_packages_accepted: [],
        territorial_packages_rejected: [],
        institutional_choices: {},
        final_territory_split: { RBiH: 30, RS: 49, HRHB: 21 },
        patron_overrides_applied: [],
        ...overrides,
    };
}

function makeState(opts: {
    decision_mode?: string;
    dayton?: DaytonResult | undefined;
    refugees?: Record<string, number>;
    ruptures?: Array<{ id: string; recorded_turn: number; perpetrator_faction: string; description: string; condemnation_flag: string }>;
    outcome?: string;
} = {}): GameState {
    const capital: Record<string, unknown> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { refugees_created: opts.refugees?.[f] ?? 0 };
    }
    return {
        meta: {
            turn: 200,
            decision_mode: opts.decision_mode,
            outcome: opts.outcome ?? (opts.dayton ? 'dayton' : 'timeout_stalemate'),
            game_over: true,
        },
        military: {
            negotiation: {
                capital,
                dayton_result: opts.dayton,
                rupture_consequences: opts.ruptures ?? [],
            },
        },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

// ── entity_autonomy_index (D2 derivation used by D3) ──────────────────────────

describe('computeEntityAutonomyIndex', () => {
    it('all decentralized → 100 (historical Dayton default)', () => {
        const choices = {
            military: 'decentralized', economy: 'decentralized', police: 'decentralized',
            judiciary: 'decentralized', presidency: 'decentralized', education: 'decentralized',
        } as const;
        expect(computeEntityAutonomyIndex(choices)).toBe(100);
    });

    it('all centralized → 0 (unitary state)', () => {
        const choices = {
            military: 'centralized', economy: 'centralized', police: 'centralized',
            judiciary: 'centralized', presidency: 'centralized', education: 'centralized',
        } as const;
        expect(computeEntityAutonomyIndex(choices)).toBe(0);
    });

    it('empty map defaults to 100 (unmade choices = historical decentralized)', () => {
        expect(computeEntityAutonomyIndex({})).toBe(100);
    });

    it('is weighted: centralizing military (heaviest) drops more than education (lightest)', () => {
        const base = { military: 'decentralized', economy: 'decentralized', police: 'decentralized', judiciary: 'decentralized', presidency: 'decentralized', education: 'decentralized' } as Record<string, 'centralized' | 'decentralized'>;
        const milCentral = computeEntityAutonomyIndex({ ...base, military: 'centralized' });
        const eduCentral = computeEntityAutonomyIndex({ ...base, education: 'centralized' });
        expect(milCentral).toBeLessThan(eduCentral);
    });

    it('is independent of key order (deterministic)', () => {
        const a = computeEntityAutonomyIndex({ military: 'centralized', education: 'decentralized' });
        const b = computeEntityAutonomyIndex({ education: 'decentralized', military: 'centralized' });
        expect(a).toBe(b);
    });
});

// ── peace_dysfunction breakdown / index ───────────────────────────────────────

describe('computePeaceDysfunctionBreakdown', () => {
    it('returns null when not emergent mode (byte-identical guard)', () => {
        const state = makeState({ decision_mode: 'historical', dayton: makeDaytonResult() });
        expect(computePeaceDysfunctionBreakdown(state)).toBeNull();
        expect(computePeaceDysfunctionIndex(state)).toBeNull();
    });

    it('returns null when decision_mode unset', () => {
        const state = makeState({ dayton: makeDaytonResult() });
        expect(computePeaceDysfunctionBreakdown(state)).toBeNull();
    });

    it('returns null when there is no Dayton result', () => {
        const state = makeState({ decision_mode: 'emergent', dayton: undefined });
        expect(computePeaceDysfunctionBreakdown(state)).toBeNull();
    });

    it('historical-Dayton settlement reads as highly dysfunctional', () => {
        // All decentralized (autonomy=100), arbitration Brčko, condemnation, refugees.
        const dayton = makeDaytonResult({
            entity_autonomy_index: 100,
            brcko_status: 'arbitration',
            brcko_arbitration: true,
        });
        const state = makeState({
            decision_mode: 'emergent',
            dayton,
            refugees: { RBiH: 100_000, RS: 150_000, HRHB: 30_000 },
            ruptures: [{ id: 'r1', recorded_turn: 100, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'genocide_condemnation' }],
        });
        const bd = computePeaceDysfunctionBreakdown(state)!;
        expect(bd).not.toBeNull();
        expect(bd.index).toBeGreaterThan(PEACE_DYSFUNCTION_CAP_THRESHOLD);
        expect(bd.autonomy_component).toBe(100);
        expect(bd.brcko_component).toBe(100);
        expect(bd.condemnation_component).toBe(100); // genocide saturates
        expect(bd.flags).toContain('brcko_unresolved');
        expect(bd.flags).toContain('ratified_cleansing');
    });

    it('a clean, centralized, resolved settlement reads low', () => {
        const dayton = makeDaytonResult({
            entity_autonomy_index: 0,
            brcko_status: 'federation',
            brcko_arbitration: false,
            final_territory_split: { RBiH: 90, RS: 8, HRHB: 2 }, // cohesive, not fragmented
        });
        const state = makeState({ decision_mode: 'emergent', dayton, refugees: { RBiH: 0, RS: 0, HRHB: 0 } });
        const bd = computePeaceDysfunctionBreakdown(state)!;
        expect(bd.autonomy_component).toBe(0);
        expect(bd.brcko_component).toBe(20);
        expect(bd.condemnation_component).toBe(0);
        expect(bd.index).toBeLessThan(PEACE_DYSFUNCTION_CAP_THRESHOLD);
    });

    it('index and components are all in [0,100]', () => {
        const state = makeState({ decision_mode: 'emergent', dayton: makeDaytonResult({ brcko_status: 'arbitration' }), refugees: { RS: 500_000 } });
        const bd = computePeaceDysfunctionBreakdown(state)!;
        for (const v of [bd.index, bd.autonomy_component, bd.fragmentation_component, bd.brcko_component, bd.refugees_component, bd.condemnation_component]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
        }
    });

    it('deterministic: same inputs → identical breakdown', () => {
        const mk = () => makeState({ decision_mode: 'emergent', dayton: makeDaytonResult({ brcko_status: 'arbitration', entity_autonomy_index: 75 }), refugees: { RBiH: 40_000, RS: 60_000 } });
        expect(computePeaceDysfunctionBreakdown(mk())).toEqual(computePeaceDysfunctionBreakdown(mk()));
    });

    it('refugees component saturates and raises refugees_not_returned flag', () => {
        const state = makeState({ decision_mode: 'emergent', dayton: makeDaytonResult(), refugees: { RBiH: 300_000 } });
        const bd = computePeaceDysfunctionBreakdown(state)!;
        expect(bd.refugees_component).toBe(100);
        expect(bd.flags).toContain('refugees_not_returned');
    });
});

// ── outcome_class cap ──────────────────────────────────────────────────────────

describe('capOutcomeByPeaceDysfunction', () => {
    it('caps clean-win classes to hollow_victory at/above threshold', () => {
        for (const cls of ['strategic_success', 'survival', 'negotiated_escape']) {
            expect(capOutcomeByPeaceDysfunction(cls, PEACE_DYSFUNCTION_CAP_THRESHOLD)).toBe('hollow_victory');
            expect(capOutcomeByPeaceDysfunction(cls, 95)).toBe('hollow_victory');
        }
    });

    it('does not touch clean-win classes below threshold', () => {
        expect(capOutcomeByPeaceDysfunction('strategic_success', PEACE_DYSFUNCTION_CAP_THRESHOLD - 1)).toBe('strategic_success');
        expect(capOutcomeByPeaceDysfunction('survival', 10)).toBe('survival');
    });

    it('never improves a worse outcome', () => {
        for (const cls of ['hollow_victory', 'pyrrhic_success', 'failure', 'collapse']) {
            expect(capOutcomeByPeaceDysfunction(cls, 95)).toBe(cls);
        }
    });

    it('is a no-op when index is null/undefined (non-emergent, non-Dayton)', () => {
        expect(capOutcomeByPeaceDysfunction('strategic_success', null)).toBe('strategic_success');
        expect(capOutcomeByPeaceDysfunction('survival', undefined)).toBe('survival');
    });
});

// ── endgame snapshot freeze + save/load round-trip ─────────────────────────────

describe('peace_dysfunction frozen on endgame snapshot', () => {
    it('freezes the index + breakdown for an emergent Dayton ending', () => {
        const dayton = makeDaytonResult({ entity_autonomy_index: 100, brcko_status: 'arbitration', brcko_arbitration: true });
        const state = makeState({ decision_mode: 'emergent', dayton, outcome: 'dayton', refugees: { RS: 120_000 } });
        freezeEndgameSnapshot(state);
        const snap = (state.meta as { endgame_snapshot?: { peace_dysfunction_index?: number; peace_dysfunction?: { index: number } } }).endgame_snapshot!;
        expect(snap.peace_dysfunction_index).toBeGreaterThan(0);
        expect(snap.peace_dysfunction).toBeDefined();
        expect(snap.peace_dysfunction!.index).toBe(snap.peace_dysfunction_index);
    });

    it('does NOT freeze the index in historical mode (byte-identical guard)', () => {
        const dayton = makeDaytonResult();
        const state = makeState({ decision_mode: 'historical', dayton, outcome: 'dayton' });
        freezeEndgameSnapshot(state);
        const snap = (state.meta as { endgame_snapshot?: { peace_dysfunction_index?: number } }).endgame_snapshot!;
        expect(snap.peace_dysfunction_index).toBeUndefined();
    });

    it('survives a JSON save/load round-trip', () => {
        const dayton = makeDaytonResult({ entity_autonomy_index: 100, brcko_status: 'arbitration', brcko_arbitration: true });
        const state = makeState({ decision_mode: 'emergent', dayton, outcome: 'dayton', refugees: { RS: 120_000 } });
        freezeEndgameSnapshot(state);
        const restored = JSON.parse(JSON.stringify(state));
        const before = (state.meta as { endgame_snapshot: { peace_dysfunction_index: number; peace_dysfunction: unknown } }).endgame_snapshot;
        const after = restored.meta.endgame_snapshot;
        expect(after.peace_dysfunction_index).toBe(before.peace_dysfunction_index);
        expect(after.peace_dysfunction).toEqual(before.peace_dysfunction);
    });
});
