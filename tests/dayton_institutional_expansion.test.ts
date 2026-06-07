/**
 * Dayton institutional-architecture expansion — Phase 1 focused tests.
 *
 * Covers (per the build spec
 * docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md):
 *   - DIMENSION 3 competency cost: default owner == free; deviation charges the
 *     correct side; shared splits.
 *   - DIMENSION 4 constitutional cost + DIMENSION 5 return/justice cost: default
 *     option == free; deviations charge the documented payer.
 *   - the gridlock component (DIMENSION 4) — historical default = 100.
 *   - the two NEW structural flags (ohr_dependency, sejdic_finci_fault) and the
 *     extended gridlock_by_design trip.
 *   - the graduated outcome-class cap bands (45 / 60 / 80+ratified_cleansing).
 *   - the all-default byte-identity pin (the historical-default index is unchanged
 *     in its structural autonomy + brcko contributions, gridlock=100).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { DaytonResult } from '../src/state/negotiation_types.js';
import {
    COMPETENCY_PACKAGES,
    getCompetencyById,
    getCompetencyCost,
} from '../src/sim/negotiation/competency_packages.js';
import {
    computeExtendedEntityAutonomyIndex,
    ENTITY_AUTONOMY_DEFAULT,
} from '../src/sim/negotiation/institutional_packages.js';
import {
    CONSTITUTIONAL_CHOICES,
    RETURN_JUSTICE_CHOICES,
    getConstitutionalCost,
    getReturnJusticeCost,
    getDefaultOptionId,
} from '../src/sim/negotiation/constitutional_packages.js';
import {
    computePeaceDysfunctionBreakdown,
    capOutcomeByPeaceDysfunction,
} from '../src/sim/negotiation/peace_dysfunction.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

// ── helpers (mirror peace_dysfunction.test.ts) ────────────────────────────────

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
    dayton?: DaytonResult;
    refugees?: Record<string, number>;
    ruptures?: Array<{ id: string; recorded_turn: number; perpetrator_faction: string; description: string; condemnation_flag: string }>;
} = {}): GameState {
    const capital: Record<string, unknown> = {};
    for (const f of FACTIONS) capital[f] = { refugees_created: opts.refugees?.[f] ?? 0 };
    return {
        meta: { turn: 200, decision_mode: 'emergent', outcome: 'dayton', game_over: true },
        military: { negotiation: { capital, dayton_result: opts.dayton, rupture_consequences: opts.ruptures ?? [] } },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

// ── DIMENSION 3 — competency cost ─────────────────────────────────────────────

describe('competency_packages: getCompetencyCost', () => {
    it('there are exactly 16 competencies', () => {
        expect(COMPETENCY_PACKAGES.length).toBe(16);
    });

    it('every competency at its historical default owner costs 0 for ALL factions', () => {
        for (const comp of COMPETENCY_PACKAGES) {
            for (const f of FACTIONS) {
                expect(getCompetencyCost(comp, comp.default_owner, f)).toBe(0);
            }
        }
    });

    it('centralizing (→ state) charges RS; decentralizing (→ entity) charges RBiH', () => {
        const defense = getCompetencyById('comp_defense')!; // entity default, sovereign-core
        // centralize defense → state: costs RS the sovereign-core state band (20).
        expect(getCompetencyCost(defense, 'state', 'RS')).toBe(20);
        expect(getCompetencyCost(defense, 'state', 'RBiH')).toBe(0);
        expect(getCompetencyCost(defense, 'state', 'HRHB')).toBe(10); // floor(20*0.5)

        const foreign = getCompetencyById('comp_foreign_policy')!; // state default, sovereign-core
        // decentralize foreign policy → entity: costs RBiH the sovereign-core entity band (14).
        expect(getCompetencyCost(foreign, 'entity', 'RBiH')).toBe(14);
        expect(getCompetencyCost(foreign, 'entity', 'RS')).toBe(0);
        expect(getCompetencyCost(foreign, 'entity', 'HRHB')).toBe(7); // floor(14*0.5)
    });

    it('a shared allocation splits cost between both entities (HRHB a quarter)', () => {
        const police = getCompetencyById('comp_police')!; // coercive, entity default
        // → shared (coercive shared band 12): RS and RBiH pay floor(12*0.5)=6, HRHB floor(12*0.25)=3.
        expect(getCompetencyCost(police, 'shared', 'RS')).toBe(6);
        expect(getCompetencyCost(police, 'shared', 'RBiH')).toBe(6);
        expect(getCompetencyCost(police, 'shared', 'HRHB')).toBe(3);
    });

    it('entity_autonomy dial default is dayton-historical', () => {
        expect(ENTITY_AUTONOMY_DEFAULT).toBe('dayton-historical');
    });
});

// ── DIMENSION 4/5 — constitutional + return/justice cost ──────────────────────

describe('constitutional_packages: default option costs 0', () => {
    it('every constitutional default option costs 0 for all factions', () => {
        for (const choice of CONSTITUTIONAL_CHOICES) {
            const def = getDefaultOptionId(choice.id)!;
            for (const f of FACTIONS) expect(getConstitutionalCost(choice.id, def, f)).toBe(0);
        }
    });

    it('every return/justice default option costs 0 for all factions', () => {
        for (const choice of RETURN_JUSTICE_CHOICES) {
            const def = getDefaultOptionId(choice.id)!;
            for (const f of FACTIONS) expect(getReturnJusticeCost(choice.id, def, f)).toBe(0);
        }
    });

    it('deviations charge the documented payer', () => {
        expect(getConstitutionalCost('arch_presidency', 'single_elected', 'RS')).toBe(18);
        expect(getConstitutionalCost('arch_presidency', 'collective_civic', 'RS')).toBe(20);
        expect(getConstitutionalCost('arch_presidency', 'collective_civic', 'HRHB')).toBe(8);
        expect(getConstitutionalCost('arch_const_court', 'domestic_only', 'RBiH')).toBe(9);
        expect(getConstitutionalCost('arch_ohr_authority', 'none', 'RS')).toBe(16);
        expect(getReturnJusticeCost('rj_refugee_return', 'full_right_of_return', 'RS')).toBe(12);
        expect(getReturnJusticeCost('rj_refugee_return', 'frozen_lines', 'RBiH')).toBe(8);
        expect(getReturnJusticeCost('rj_icty_cooperation', 'full', 'RS')).toBe(14);
        // non_cooperation is free in CAPITAL (its penalty lands in the dysfunction floor).
        for (const f of FACTIONS) expect(getReturnJusticeCost('rj_icty_cooperation', 'non_cooperation', f)).toBe(0);
    });
});

// ── extended autonomy index (DIMENSION 3 fold) ────────────────────────────────

describe('computeExtendedEntityAutonomyIndex', () => {
    it('empty inputs reproduce the historical default deterministically', () => {
        const a = computeExtendedEntityAutonomyIndex({});
        const b = computeExtendedEntityAutonomyIndex({}, {});
        expect(a).toBe(b);
        expect(a).toBeGreaterThan(40); // above the functional floor → contributes dysfunction
        expect(a).toBeLessThanOrEqual(100);
    });

    it('centralizing competencies toward the state LOWERS the index', () => {
        const allState: Record<string, 'state'> = {};
        for (const c of COMPETENCY_PACKAGES) allState[c.id] = 'state';
        const centralized = computeExtendedEntityAutonomyIndex({ military: 'centralized', economy: 'centralized', police: 'centralized', judiciary: 'centralized', presidency: 'centralized', education: 'centralized' }, allState);
        expect(centralized).toBe(0);
    });

    it('is independent of key order', () => {
        const x = computeExtendedEntityAutonomyIndex({}, { comp_defense: 'state', comp_police: 'entity' });
        const y = computeExtendedEntityAutonomyIndex({}, { comp_police: 'entity', comp_defense: 'state' });
        expect(x).toBe(y);
    });
});

// ── DIMENSION 4 — gridlock component + new flags ──────────────────────────────

describe('peace_dysfunction: gridlock component (DIMENSION 4)', () => {
    it('historical-default constitutional architecture → gridlock 100', () => {
        // No constitutional_choices on the result ⇒ all defaults ⇒ maximal gridlock.
        const bd = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ entity_autonomy_index: 100 }) }))!;
        expect(bd.gridlock_component).toBe(100);
        expect(bd.flags).toContain('gridlock_by_design');
        expect(bd.flags).toContain('ohr_dependency');
        expect(bd.flags).toContain('sejdic_finci_fault');
    });

    it('dismantling gridlock (simple majority / single president / domestic court / no OHR / civic) drops the component and clears the flags', () => {
        const dayton = makeDaytonResult({
            entity_autonomy_index: 0,
            brcko_status: 'federation',
            final_territory_split: { RBiH: 90, RS: 8, HRHB: 2 },
            constitutional_choices: {
                arch_veto_regime: 'simple_majority',
                arch_presidency: 'single_elected',
                arch_const_court: 'domestic_only',
                arch_ohr_authority: 'none',
                arch_constituent_model: 'civic_citizens',
            },
        });
        const bd = computePeaceDysfunctionBreakdown(makeState({ dayton }))!;
        expect(bd.gridlock_component).toBe(0);
        expect(bd.flags).not.toContain('gridlock_by_design');
        expect(bd.flags).not.toContain('ohr_dependency');
        expect(bd.flags).not.toContain('sejdic_finci_fault');
    });

    it('international judges alone still raise ohr_dependency', () => {
        const dayton = makeDaytonResult({
            entity_autonomy_index: 0,
            constitutional_choices: { arch_ohr_authority: 'none', arch_const_court: 'international_judges', arch_veto_regime: 'simple_majority', arch_presidency: 'single_elected', arch_constituent_model: 'civic_citizens' },
        });
        const bd = computePeaceDysfunctionBreakdown(makeState({ dayton }))!;
        expect(bd.flags).toContain('ohr_dependency');
    });
});

// ── DIMENSION 5 — return/justice modifiers ────────────────────────────────────

describe('peace_dysfunction: DIMENSION 5 return/justice modifiers', () => {
    it('full right of return halves the refugees component; frozen lines raises it', () => {
        const base = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult(), refugees: { RBiH: 100_000 } }))!;
        const full = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ return_justice: { rj_refugee_return: 'full_right_of_return' } }), refugees: { RBiH: 100_000 } }))!;
        const frozen = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ return_justice: { rj_refugee_return: 'frozen_lines' } }), refugees: { RBiH: 100_000 } }))!;
        expect(full.refugees_component).toBeCloseTo(base.refugees_component * 0.5, 1);
        expect(frozen.refugees_component).toBeGreaterThan(base.refugees_component);
    });

    it('ICTY non-cooperation FLOORS the condemnation component to ≥75 (cannot buy down a rupture)', () => {
        // No locked rupture, but ICTY refused → condemnation floored to 75.
        const noRupture = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ return_justice: { rj_icty_cooperation: 'non_cooperation' } }) }))!;
        expect(noRupture.condemnation_component).toBe(75);
        // With a (non-genocide) rupture that would score 50, the floor still lifts it to 75.
        const withRupture = computePeaceDysfunctionBreakdown(makeState({
            dayton: makeDaytonResult({ return_justice: { rj_icty_cooperation: 'non_cooperation' } }),
            ruptures: [{ id: 'r', recorded_turn: 1, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'atrocity_condemnation' }],
        }))!;
        expect(withRupture.condemnation_component).toBe(75);
    });

    it('return/justice NEVER lowers a genocide condemnation below 100', () => {
        const bd = computePeaceDysfunctionBreakdown(makeState({
            dayton: makeDaytonResult({ return_justice: { rj_icty_cooperation: 'full' } }),
            ruptures: [{ id: 'g', recorded_turn: 1, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'genocide_condemnation' }],
        }))!;
        expect(bd.condemnation_component).toBe(100);
    });
});

// ── graduated outcome-class cap ───────────────────────────────────────────────

describe('capOutcomeByPeaceDysfunction: graduated bands', () => {
    it('< 45 → no cap', () => {
        expect(capOutcomeByPeaceDysfunction('strategic_success', 44.9)).toBe('strategic_success');
    });

    it('45–59 → strategic_success drops one notch to survival', () => {
        expect(capOutcomeByPeaceDysfunction('strategic_success', 45)).toBe('survival');
        expect(capOutcomeByPeaceDysfunction('strategic_success', 59.9)).toBe('survival');
        // survival / negotiated_escape untouched in the soft band
        expect(capOutcomeByPeaceDysfunction('survival', 50)).toBe('survival');
        expect(capOutcomeByPeaceDysfunction('negotiated_escape', 50)).toBe('negotiated_escape');
    });

    it('≥ 60 → existing hard cap: clean-win → hollow_victory', () => {
        for (const cls of ['strategic_success', 'survival', 'negotiated_escape']) {
            expect(capOutcomeByPeaceDysfunction(cls, 60)).toBe('hollow_victory');
        }
    });

    it('≥ 80 AND ratified_cleansing → failure', () => {
        expect(capOutcomeByPeaceDysfunction('strategic_success', 85, ['ratified_cleansing'])).toBe('failure');
        expect(capOutcomeByPeaceDysfunction('pyrrhic_success', 85, ['ratified_cleansing'])).toBe('failure');
        // collapse (already worse) is never touched
        expect(capOutcomeByPeaceDysfunction('collapse', 95, ['ratified_cleansing'])).toBe('collapse');
        // ≥80 WITHOUT the flag falls back to the hard cap (clean-win → hollow)
        expect(capOutcomeByPeaceDysfunction('strategic_success', 85)).toBe('hollow_victory');
        expect(capOutcomeByPeaceDysfunction('pyrrhic_success', 85)).toBe('pyrrhic_success');
    });
});

// ── all-default byte-identity pin ─────────────────────────────────────────────

describe('all-default settlement: byte-identity pin', () => {
    it('historical-default autonomy + brcko contributions are unchanged; gridlock=100', () => {
        // Empty proposal ⇒ all-decentralized institutional choices (entity_autonomy_index
        // = 100), arbitration Brčko, no Dim-3/4/5 overrides. The autonomy + brcko
        // components must be exactly the legacy values; gridlock is the new 100.
        const dayton = makeDaytonResult({ entity_autonomy_index: 100, brcko_status: 'arbitration', brcko_arbitration: true });
        const bd = computePeaceDysfunctionBreakdown(makeState({
            dayton,
            refugees: { RBiH: 100_000, RS: 150_000, HRHB: 30_000 }, // historical, saturating
            ruptures: [{ id: 'g', recorded_turn: 1, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'genocide_condemnation' }],
        }))!;
        expect(bd.autonomy_component).toBe(100);   // legacy value preserved (D2 index path)
        expect(bd.brcko_component).toBe(100);       // arbitration → unchanged
        expect(bd.refugees_component).toBe(100);    // voluntary default ×1.0, saturated
        expect(bd.condemnation_component).toBe(100); // genocide saturates
        expect(bd.gridlock_component).toBe(100);    // historical constitutional default
        // The historical-default index is the documented pinned constant. Derivation:
        // 100*.26 + 94.5*.22 + 100*.12 + 100*.08 + 100*.18 + 100*.14 = 98.79 → 98.8.
        expect(bd.index).toBeCloseTo(98.8, 1);
        // Semantic invariant preserved across the re-weight: the historical Dayton
        // settlement still reads as maximally dysfunctional (well above the 60 cap).
        expect(bd.index).toBeGreaterThan(60);
    });

    it('an empty competency allocation does NOT change the historical autonomy component', () => {
        const withEmptyComp = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ entity_autonomy_index: 100, competency_allocation: {} }) }))!;
        const withoutComp = computePeaceDysfunctionBreakdown(makeState({ dayton: makeDaytonResult({ entity_autonomy_index: 100 }) }))!;
        expect(withEmptyComp.autonomy_component).toBe(withoutComp.autonomy_component);
        expect(withEmptyComp.autonomy_component).toBe(100);
    });
});
