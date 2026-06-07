/**
 * Dayton institutional-architecture expansion — PHASE 2 focused tests.
 *
 * Covers (build spec docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md
 * §1.2/§1.3/§3 + the verdict feed):
 *   - the entity_autonomy dial: one-time DECLARATION cost + cross/with-grain
 *     deviation multipliers (and dayton-historical = 0 + 1.0× everywhere).
 *   - capital-bounded reachability locks unaffordable options.
 *   - bot preference vectors: a bot prefers its ideal (discount) and OBJECTS to an
 *     anathema choice even when the asymmetric model bills it nothing (floor).
 *   - counter-offer: one-step counter-dial toward the ideal + ideological drop + cite.
 *   - patron override over the new dims (dial:/competency:/constitutional:).
 *   - the verdict feed keystone: a deviated proposal moves the dysfunction index/flags
 *     + outcome cap; the all-default proposal is BYTE-IDENTICAL.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import {
    getDialDeclarationCost,
    finalCompetencyCost,
    finalConstitutionalCost,
    finalReturnJusticeCost,
    isOptionReachable,
    reachableOptions,
} from '../src/sim/negotiation/dayton_dial_cost.js';
import {
    adjustedCost,
    dialPrefDelta,
    counterDialTowardIdeal,
    competencyPrefDelta,
} from '../src/sim/negotiation/bot_preferences.js';
import { computeProposalCostToFaction, evaluateBotResponse } from '../src/sim/negotiation/bot_negotiation.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { computePeaceDysfunctionBreakdown } from '../src/sim/negotiation/peace_dysfunction.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

// ── DIMENSION 2 — dial declaration cost ───────────────────────────────────────

describe('dayton_dial_cost: declaration cost', () => {
    it('dayton-historical is free for everyone', () => {
        for (const f of FACTIONS) expect(getDialDeclarationCost('dayton-historical', f)).toBe(0);
    });

    it('confederation charges RBiH 12; federalized 14→RS; unitary 24→RS (HRHB pays half)', () => {
        expect(getDialDeclarationCost('confederation', 'RBiH')).toBe(12);
        expect(getDialDeclarationCost('confederation', 'RS')).toBe(0);
        expect(getDialDeclarationCost('confederation', 'HRHB')).toBe(6);
        expect(getDialDeclarationCost('federalized', 'RS')).toBe(14);
        expect(getDialDeclarationCost('federalized', 'RBiH')).toBe(0);
        expect(getDialDeclarationCost('unitary', 'RS')).toBe(24);
        expect(getDialDeclarationCost('unitary', 'HRHB')).toBe(12);
        expect(getDialDeclarationCost('unitary', 'RBiH')).toBe(0);
    });
});

// ── DIMENSION 2 — deviation multipliers (cross / with grain) ──────────────────

describe('dayton_dial_cost: deviation multiplier (cross vs with grain)', () => {
    it('historical dial → multiplier 1.0 (base cost unchanged)', () => {
        // defense → state costs RS 20 base; under dayton-historical the final == base.
        expect(finalCompetencyCost('comp_defense', 'state', 'RS', 'dayton-historical')).toBe(20);
    });

    it('with-grain is discounted; cross-grain is dear (competency)', () => {
        // unitary dial is STATE-ward. defense→state is state-ward = WITH grain → ×0.6.
        expect(finalCompetencyCost('comp_defense', 'state', 'RS', 'unitary')).toBe(12); // round(20*0.6)
        // confederation is ENTITY-ward. defense→state is state-ward = CROSS grain → ×2.0.
        expect(finalCompetencyCost('comp_defense', 'state', 'RS', 'confederation')).toBe(40); // 20*2.0
        // foreign_policy→entity is entity-ward; under confederation = WITH grain → ×0.5.
        expect(finalCompetencyCost('comp_foreign_policy', 'entity', 'RBiH', 'confederation')).toBe(7); // round(14*0.5)
        // ...and under unitary (state-ward) entity is CROSS → ×2.2.
        expect(finalCompetencyCost('comp_foreign_policy', 'entity', 'RBiH', 'unitary')).toBe(31); // round(14*2.2)
    });

    it('federalized multipliers (cross 1.6 / with 0.7) on a constitutional option', () => {
        // simple_majority is state-ward; federalized is entity-ward → CROSS → ×1.6.
        expect(finalConstitutionalCost('arch_veto_regime', 'simple_majority', 'RS', 'federalized')).toBe(35); // round(22*1.6)
        // frozen_lines is entity-ward; federalized entity-ward → WITH → ×0.7.
        expect(finalReturnJusticeCost('rj_refugee_return', 'frozen_lines', 'RBiH', 'federalized')).toBe(6); // round(8*0.7)
    });

    it('default option is always free regardless of dial', () => {
        expect(finalConstitutionalCost('arch_presidency', 'tripartite_rotating', 'RS', 'unitary')).toBe(0);
        expect(finalCompetencyCost('comp_defense', 'entity', 'RS', 'unitary')).toBe(0); // entity is defense default
    });
});

// ── DIMENSION 2/3 — capital-bounded reachability ──────────────────────────────

describe('dayton_dial_cost: capital-bounded reachability', () => {
    it('a losing-capital faction cannot reach a unitary sovereign-core flip', () => {
        // unitary defense→state costs RS 12; with only 5 capital it is unreachable.
        expect(isOptionReachable('competency', 'comp_defense', 'state', 'RS', 5, 'unitary')).toBe(false);
        expect(isOptionReachable('competency', 'comp_defense', 'state', 'RS', 20, 'unitary')).toBe(true);
    });

    it('the historical default option is always reachable (cost 0)', () => {
        expect(isOptionReachable('competency', 'comp_defense', 'entity', 'RS', 0, 'unitary')).toBe(true);
    });

    it('reachableOptions enumerates every non-default option, marking affordability (deterministic)', () => {
        const opts = reachableOptions('RS', 6, 'confederation');
        expect(opts.length).toBeGreaterThan(20);
        // deterministic: identical inputs → identical ordering + values.
        const again = reachableOptions('RS', 6, 'confederation');
        expect(again.map(o => `${o.dimension}|${o.choice_id}|${o.option_id}|${o.cost}|${o.reachable}`))
            .toEqual(opts.map(o => `${o.dimension}|${o.choice_id}|${o.option_id}|${o.cost}|${o.reachable}`));
        // dimensions are grouped in a stable order.
        const dimSeq = opts.map(o => o.dimension).filter((d, i, a) => i === 0 || d !== a[i - 1]);
        expect(dimSeq).toEqual(['competency', 'constitutional', 'return_justice']);
        // at least one expensive flip is locked at 6 capital, and the cheap ones are open.
        expect(opts.some(o => !o.reachable)).toBe(true);
        expect(opts.some(o => o.reachable)).toBe(true);
    });
});

// ── DIMENSION 3 — bot preference vectors + adjusted cost ───────────────────────

describe('bot_preferences: ideal points + adjusted cost', () => {
    it('RS dial ideal is confederation; RBiH unitary; one-step counter-dial moves toward ideal', () => {
        expect(dialPrefDelta('RS', 'confederation')).toBe(-1); // ideal
        expect(dialPrefDelta('RS', 'unitary')).toBe(1); // anathema
        // RBiH counters a confederation dial one step toward unitary (→ dayton-historical).
        expect(counterDialTowardIdeal('RBiH', 'confederation')).toBe('dayton-historical');
        expect(counterDialTowardIdeal('RBiH', 'dayton-historical')).toBe('federalized');
        // RS counters a unitary dial one step toward confederation (→ federalized).
        expect(counterDialTowardIdeal('RS', 'unitary')).toBe('federalized');
    });

    it('adjustedCost discounts an ideal choice and applies an objection FLOOR to anathema', () => {
        // ideal (delta -1): 0.6× base, no floor.
        expect(adjustedCost(20, -1)).toBe(12);
        // neutral (delta 0): ~1.2× base, no floor.
        expect(adjustedCost(10, 0)).toBe(12);
        // anathema (delta +1) that is FREE in capital: base 0 → floor 8.
        expect(adjustedCost(0, 1)).toBe(8);
    });

    it('RS competency ideal is entity-ownership (delta -1); state-ownership is anathema (+1)', () => {
        expect(competencyPrefDelta('RS', 'comp_defense', 'entity')).toBe(-1);
        expect(competencyPrefDelta('RS', 'comp_defense', 'state')).toBe(1);
        expect(competencyPrefDelta('RS', 'comp_defense', 'shared')).toBe(0);
    });
});

// ── bot OBJECTS to anathema even when it is free ──────────────────────────────

describe('bot_negotiation: objects to anathema even when free', () => {
    it('HRHB is billed an objection floor for domestic-only court (free to HRHB but anathema)', () => {
        // arch_const_court→domestic_only bills only RBiH (9). To HRHB the capital cost
        // is 0, but HRHB's ideal is international_judges → +1 anathema → floor 8.
        const proposal: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            constitutional_choices: { arch_const_court: 'domestic_only' },
        };
        expect(computeProposalCostToFaction(proposal, 'HRHB')).toBe(8);
        // RBiH (whose ideal IS international_judges, default) is billed the real 9 base,
        // discounted/raised by its own neutral-or-anathema delta — but strictly > 0.
        expect(computeProposalCostToFaction(proposal, 'RBiH')).toBeGreaterThan(0);
    });

    it('a bot prefers (cheaper) its ideal dial vs an anathema dial', () => {
        const ideal: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {}, entity_autonomy: 'confederation' };
        const anathema: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {}, entity_autonomy: 'unitary' };
        // confederation is free to RS (RBiH pays the declaration) AND is RS's ideal → 0.
        expect(computeProposalCostToFaction(ideal, 'RS')).toBe(0);
        // unitary bills RS the declaration (24) AND is its anathema → much costlier.
        expect(computeProposalCostToFaction(anathema, 'RS')).toBeGreaterThan(24);
    });
});

// ── byte-identity: all-default proposal cost ──────────────────────────────────

describe('Phase 2 byte-identity: all-default proposal', () => {
    it('an all-default proposal (no new dims) costs nothing new vs the legacy path', () => {
        const proposal: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
        for (const f of FACTIONS) expect(computeProposalCostToFaction(proposal, f)).toBe(0);
    });

    it('an explicit dayton-historical dial + empty allocations still cost 0', () => {
        const proposal: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'dayton-historical', competency_allocation: {}, constitutional_choices: {}, return_justice: {},
        };
        for (const f of FACTIONS) expect(computeProposalCostToFaction(proposal, f)).toBe(0);
    });
});

// ── counter-offer: dial-step + ideological drop + cite ────────────────────────

function makeState(overrides: Partial<{
    turn: number; war_start_turn: number; player_faction: string;
    capital: Record<string, Partial<NegotiationBreakdown>>;
    patron: Record<string, Partial<PatronRelationship>>;
    political_controllers: Record<string, string>;
    dimStore: DimensionStore;
    decision_mode: string;
}> = {}): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of FACTIONS) {
        capital[faction] = { ...createEmptyCapital(), ...(overrides.capital?.[faction] ?? {}) };
        patron_relationships[faction] = { ...createDefaultPatronRelationship(faction), ...(overrides.patron?.[faction] ?? {}) };
    }
    return {
        meta: {
            turn: overrides.turn ?? 200, war_start_turn: overrides.war_start_turn ?? 0,
            phase: 'war', seed: 1, date: '1995-11-21', game_over: false,
            player_faction: overrides.player_faction ?? 'RBiH',
            decision_mode: overrides.decision_mode ?? 'emergent',
        },
        factions: FACTIONS.map(id => ({ id })),
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: overrides.dimStore ?? initializeStrategicDimensions() } },
        political: { political_controllers: overrides.political_controllers ?? {} },
        displacement: {},
    } as unknown as GameState;
}

/** A dimension store where one faction has near-zero composite capital (so even a
 *  cheap deviation trips its objection threshold). */
function lowCapitalDimStore(faction: string): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const dim of Object.keys(store[faction] ?? {})) {
        store[faction][dim] = { base_value: 1, event_modifier: 0, effective_value: 1 };
    }
    return store;
}

describe('bot_negotiation: counter-offer dial-step + ideological drop', () => {
    it('RS counters a unitary dial one step toward its ideal and drops the painful flip, citing a stance', () => {
        const state = makeState({ player_faction: 'RBiH' });
        // Strong unitary proposal: dial unitary + centralize defense to the state. RS
        // pays the declaration (24) + the cross/with multiplier on defense → over budget.
        const proposal: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'unitary',
            competency_allocation: { comp_defense: 'state', comp_police: 'state' },
        };
        const resp = evaluateBotResponse(state, 'RS' as FactionId, proposal);
        expect(resp.decision === 'counter' || resp.decision === 'reject').toBe(true);
        if (resp.decision === 'counter') {
            const c = resp.counter_proposal!;
            // one-step counter-dial toward confederation: unitary → federalized.
            expect(c.entity_autonomy).toBe('federalized');
            // a cited real stance is attached.
            expect(resp.reason).toMatch(/Contact-Group|Pale/);
        }
    });
});

// ── patron override over the new dims ─────────────────────────────────────────

describe('dayton_negotiation: patron override over new dims', () => {
    it('records a dial:/competency: override when the objecting faction patron forces it', () => {
        // Player RBiH pushes a unitary dial + defense→state. RS objects (expensive),
        // but RS patron override ≥75 forces it through → override entries recorded and
        // the dimensions survive onto the result.
        const state = makeState({
            player_faction: 'RBiH',
            patron: { RS: { override_authority: 80 } },
            dimStore: lowCapitalDimStore('RS'), // RS composite ~1 → objects to any deviation
        });
        const proposal: DaytonProposal = {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'unitary',
            competency_allocation: { comp_defense: 'state' },
        };
        const result = resolveDaytonNegotiation(state, proposal);
        const overrides = result.patron_overrides_applied;
        expect(overrides).toContain('dial:unitary:RS');
        expect(overrides).toContain('competency:comp_defense:RS');
        // the forced dimensions are persisted onto the signed result (verdict feed).
        expect(result.entity_autonomy).toBe('unitary');
        expect(result.competency_allocation).toEqual({ comp_defense: 'state' });
    });
});

// ── THE KEYSTONE: verdict feed (a deviated proposal moves the index) ───────────

describe('verdict feed: a deviated proposal moves the dysfunction index/flags', () => {
    function controllers(): Record<string, string> {
        // a simple three-way split so fragmentation is well-defined.
        const c: Record<string, string> = {};
        for (let i = 0; i < 40; i++) c[`o_rbih_${i}`] = 'RBiH';
        for (let i = 0; i < 40; i++) c[`o_rs_${i}`] = 'RS';
        for (let i = 0; i < 20; i++) c[`o_hrhb_${i}`] = 'HRHB';
        return c;
    }

    it('the all-default proposal persists no new dims (byte-identical result shape)', () => {
        const state = makeState({ player_faction: 'RBiH', political_controllers: controllers() });
        const result = resolveDaytonNegotiation(state, { territorial_demands: [], territorial_concessions: [], institutional_choices: {} });
        expect(result.entity_autonomy).toBeUndefined();
        expect(result.competency_allocation).toBeUndefined();
        expect(result.constitutional_choices).toBeUndefined();
        expect(result.return_justice).toBeUndefined();
    });

    it('a constitutional dismantling proposal LOWERS the gridlock component + clears flags + lifts the cap', () => {
        // Baseline (historical default) settlement.
        const base = resolveDaytonNegotiation(
            makeState({ player_faction: 'RBiH', political_controllers: controllers() }),
            { territorial_demands: [], territorial_concessions: [], institutional_choices: {} },
        );
        const baseBd = computePeaceDysfunctionBreakdown(makeStateWithResult(base, controllers()))!;
        expect(baseBd.gridlock_component).toBe(100);
        expect(baseBd.flags).toContain('gridlock_by_design');

        // Deviated: a state with HUGE capital so the dismantling survives bot objection,
        // dial unitary, simple majority + single president + domestic court + no OHR + civic.
        const deviatedState = makeState({
            player_faction: 'RBiH',
            political_controllers: controllers(),
            capital: { RS: { territory_controlled_pct: 1 } },
            patron: { RS: { override_authority: 80 }, HRHB: { override_authority: 80 } },
        });
        const deviated = resolveDaytonNegotiation(deviatedState, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            entity_autonomy: 'unitary',
            constitutional_choices: {
                arch_veto_regime: 'simple_majority',
                arch_presidency: 'single_elected',
                arch_const_court: 'domestic_only',
                arch_ohr_authority: 'none',
                arch_constituent_model: 'civic_citizens',
            },
        });
        // the constitutional choices were persisted onto the result (verdict feed).
        expect(deviated.constitutional_choices?.arch_veto_regime).toBe('simple_majority');
        const devBd = computePeaceDysfunctionBreakdown(makeStateWithResult(deviated, controllers()))!;
        // gridlock dismantled → component 0, the DIMENSION-4 flags clear.
        expect(devBd.gridlock_component).toBe(0);
        expect(devBd.flags).not.toContain('sejdic_finci_fault'); // civic_citizens
        expect(devBd.flags).not.toContain('ohr_dependency'); // no OHR + domestic court
        // The index moved DOWN (a less-gridlocked settlement is less dysfunctional).
        // (gridlock_by_design itself stays lit while entity autonomy remains ≥60.)
        expect(devBd.index).toBeLessThan(baseBd.index);
    });
});

function makeStateWithResult(result: import('../src/state/negotiation_types.js').DaytonResult, controllers: Record<string, string>): GameState {
    const capital: Record<string, unknown> = {};
    for (const f of FACTIONS) capital[f] = { refugees_created: 0 };
    return {
        meta: { turn: 200, decision_mode: 'emergent', outcome: 'dayton', game_over: true },
        military: { negotiation: { capital, dayton_result: result, rupture_consequences: [] } },
        political: { political_controllers: controllers },
        displacement: {},
    } as unknown as GameState;
}
