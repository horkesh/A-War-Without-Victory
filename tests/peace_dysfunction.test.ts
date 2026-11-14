/**
 * Comprehensive Dayton — Phase 1 keystone tests (peace_dysfunction_index).
 *
 * Covers: the formula sub-components, the outcome_class cap, every-decision-mode
 * computation (R8 ending truth pass, 2026-11-14: no emergent gate), the per-side
 * `ownFaction` reading, back-compat (non-Dayton), the 188w baseline never reaching a
 * signed Dayton, and save/load round-trip of the frozen field on the endgame snapshot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    it('is computed in historical mode, identically to emergent mode (no emergent gate)', () => {
        const historical = makeState({ decision_mode: 'historical', dayton: makeDaytonResult() });
        const emergent = makeState({ decision_mode: 'emergent', dayton: makeDaytonResult() });
        const bd = computePeaceDysfunctionBreakdown(historical);
        expect(bd).not.toBeNull();
        expect(bd).toEqual(computePeaceDysfunctionBreakdown(emergent));
        expect(computePeaceDysfunctionIndex(historical)).toBe(bd!.index);
    });

    it('is computed when decision_mode is unset', () => {
        const state = makeState({ dayton: makeDaytonResult() });
        expect(computePeaceDysfunctionBreakdown(state)).toEqual(
            computePeaceDysfunctionBreakdown(makeState({ decision_mode: 'emergent', dayton: makeDaytonResult() })),
        );
    });

    it('the committed 188w historical baseline never reaches a signed Dayton, so it computes nothing', () => {
        // Byte-identity of the calibration baselines now rests on this, not on a mode gate:
        // the 188-week run ends at turn 188 with game_over false and no dayton_result.
        const save = JSON.parse(readFileSync(resolve(process.cwd(), 'data/derived/latest_run_final_save.json'), 'utf8')) as GameState;
        expect(save.meta.turn).toBe(188);
        expect(save.meta.game_over).toBe(false);
        expect(save.military?.negotiation?.dayton_result).toBeUndefined();
        expect(computePeaceDysfunctionBreakdown(save)).toBeNull();
    });

    it('a side\'s own reading counts only that side\'s rupture flags', () => {
        const ruptures = [{ id: 'r1', recorded_turn: 170, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'genocide_condemnation' }];
        const state = makeState({ decision_mode: 'historical', dayton: makeDaytonResult(), ruptures });

        const pooled = computePeaceDysfunctionBreakdown(state)!;
        const rs = computePeaceDysfunctionBreakdown(state, 'RS')!;
        const rbih = computePeaceDysfunctionBreakdown(state, 'RBiH')!;

        // Settlement-wide reading pools every side's flags; RS's own reading holds its own crime.
        expect(pooled.condemnation_component).toBe(100);
        expect(pooled.flags).toContain('ratified_cleansing');
        expect(rs.condemnation_component).toBe(100);
        expect(rs.flags).toContain('ratified_cleansing');
        // Another side's crime never enters the victims' reading.
        expect(rbih.condemnation_component).toBe(0);
        expect(rbih.flags).not.toContain('ratified_cleansing');
        expect(rbih.index).toBeLessThan(rs.index);
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

    it('does not touch clean-win classes below the graduated soft band (< 45)', () => {
        // Graduated cap (institutional-architecture expansion 2026-06-07): a 45-59
        // soft band now drops strategic_success → survival, so the "no cap" case
        // must sit BELOW 45. The existing 60 hard cap (above) is unchanged.
        expect(capOutcomeByPeaceDysfunction('strategic_success', 44)).toBe('strategic_success');
        expect(capOutcomeByPeaceDysfunction('survival', 10)).toBe('survival');
        // 45-59 soft band: strategic_success → survival (one notch), others untouched.
        expect(capOutcomeByPeaceDysfunction('strategic_success', PEACE_DYSFUNCTION_CAP_THRESHOLD - 1)).toBe('survival');
        expect(capOutcomeByPeaceDysfunction('survival', PEACE_DYSFUNCTION_CAP_THRESHOLD - 1)).toBe('survival');
        expect(capOutcomeByPeaceDysfunction('negotiated_escape', 50)).toBe('negotiated_escape');
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

    it('freezes the index in historical mode too (every decision mode)', () => {
        const dayton = makeDaytonResult();
        const state = makeState({ decision_mode: 'historical', dayton, outcome: 'dayton' });
        freezeEndgameSnapshot(state);
        const snap = (state.meta as { endgame_snapshot?: { peace_dysfunction_index?: number; peace_dysfunction?: { index: number } } }).endgame_snapshot!;
        expect(typeof snap.peace_dysfunction_index).toBe('number');
        expect(snap.peace_dysfunction!.index).toBe(snap.peace_dysfunction_index);
        expect(snap.peace_dysfunction_index).toBe(computePeaceDysfunctionBreakdown(
            makeState({ decision_mode: 'emergent', dayton: makeDaytonResult(), outcome: 'dayton' }),
        )!.index);
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
