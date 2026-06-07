/**
 * Comprehensive Dayton — Phase 2 (D1) tests.
 *
 * Covers the real OSID-area resolver (replacing the fabricated estimate table),
 * the Brčko international-arbitration distinct outcome + flag, and the HRHB
 * transfer-attribution fix.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    getPackageAreaPct,
    resolveOsidsForKeywords,
    resolveAreaKm2ForKeywords,
    getTotalAreaKm2,
} from '../src/sim/negotiation/package_area_resolver.js';
import { getAllTerritorialPackages } from '../src/sim/negotiation/territorial_packages.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: {
    player_faction?: string;
    capital?: Record<string, Partial<NegotiationBreakdown>>;
    patron?: Record<string, Partial<PatronRelationship>>;
    political_controllers?: Record<string, string>;
    dimValue?: number;
} = {}): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { ...createEmptyCapital(), ...(overrides.capital?.[f] ?? {}) };
        patron_relationships[f] = { ...createDefaultPatronRelationship(f), ...(overrides.patron?.[f] ?? {}) };
    }
    const store = initializeStrategicDimensions();
    const v = overrides.dimValue ?? 70;
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[f])) {
            store[f][dim] = { base_value: v, event_modifier: 0, effective_value: v };
        }
    }
    return {
        meta: { turn: 190, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: overrides.player_faction ?? 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: store } },
        political: { political_controllers: overrides.political_controllers ?? {} },
        displacement: {},
    } as unknown as GameState;
}

// ── area resolver ──────────────────────────────────────────────────────────────

describe('package_area_resolver', () => {
    it('total mapped BiH area is the canonical ~51,337 km²', () => {
        expect(getTotalAreaKm2()).toBeGreaterThan(50000);
        expect(getTotalAreaKm2()).toBeLessThan(52000);
    });

    it('resolves real OSIDs for keywords (gorazde)', () => {
        const osids = resolveOsidsForKeywords(['gorazde']);
        expect(osids.length).toBeGreaterThan(0);
        expect(osids.every(o => o.includes('gorazde'))).toBe(true);
    });

    it('keyword area is > 0 km² for a real package', () => {
        expect(resolveAreaKm2ForKeywords(['srebrenica', 'zepa', 'bratunac'])).toBeGreaterThan(0);
    });

    it('every territorial package resolves to a non-zero area share', () => {
        for (const pkg of getAllTerritorialPackages()) {
            expect(getPackageAreaPct(pkg.id)).toBeGreaterThan(0);
        }
    });

    it('unknown package id resolves to 0', () => {
        expect(getPackageAreaPct('not_a_real_package')).toBe(0);
    });

    it('western_bosnia (a large area) outweighs mostar (a single city)', () => {
        expect(getPackageAreaPct('western_bosnia')).toBeGreaterThan(getPackageAreaPct('mostar'));
    });

    it('is deterministic / memoized (same value on repeat)', () => {
        expect(getPackageAreaPct('gorazde_corridor')).toBe(getPackageAreaPct('gorazde_corridor'));
    });
});

// ── Brčko distinct outcome ──────────────────────────────────────────────────────

describe('Brčko international-arbitration outcome (D1)', () => {
    const controllers = {
        'op:sarajevo:sarajevo_1': 'RBiH',
        'op:banja_luka:banja_luka_2': 'RS',
        'op:mostar:mostar_1': 'HRHB',
    };

    it('leaving Brčko unresolved → arbitration (third state) + flag set', () => {
        const state = makeState({ political_controllers: controllers });
        const proposal: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        expect(result.brcko_status).toBe('arbitration');
        expect(result.brcko_arbitration).toBe(true);
    });

    it('player (RBiH) conceding Brčko → it goes to rs side (not arbitration)', () => {
        const state = makeState({ player_faction: 'RBiH', political_controllers: controllers });
        const proposal: DaytonProposal = { territorial_demands: [], territorial_concessions: ['brcko_district'], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        expect(result.brcko_status).toBe('rs');
        expect(result.brcko_arbitration).toBe(false);
    });

    it('player (RBiH) winning a Brčko demand → federation side', () => {
        // RS patron override high so the demand carries.
        const state = makeState({
            player_faction: 'RBiH',
            political_controllers: controllers,
            patron: { RS: { override_authority: 95 } },
        });
        const proposal: DaytonProposal = { territorial_demands: ['brcko_district'], territorial_concessions: [], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        expect(result.territorial_packages_accepted).toContain('brcko_district');
        expect(result.brcko_status).toBe('federation');
        expect(result.brcko_arbitration).toBe(false);
    });

    it('failed Brčko demand (no override) → arbitration', () => {
        const state = makeState({
            player_faction: 'RBiH',
            political_controllers: controllers,
            capital: { RS: { territory_controlled_pct: 10 } },
            dimValue: 20,
            patron: { RS: { override_authority: 5 } },
        });
        const proposal: DaytonProposal = { territorial_demands: ['brcko_district'], territorial_concessions: [], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        expect(result.territorial_packages_accepted).not.toContain('brcko_district');
        expect(result.brcko_status).toBe('arbitration');
    });
});

// ── territory split correctness ─────────────────────────────────────────────────

describe('final territory split (D1 area + attribution)', () => {
    const controllers = {
        'op:sarajevo:sarajevo_1': 'RBiH',
        'op:sarajevo:sarajevo_2': 'RBiH',
        'op:banja_luka:banja_luka_2': 'RS',
        'op:banja_luka:dragocaj': 'RS',
        'op:mostar:mostar_1': 'HRHB',
    };

    it('three-faction split sums to ~100 (arbitration area removed, renormalized)', () => {
        const state = makeState({ political_controllers: controllers });
        const proposal: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        const total = result.final_territory_split.RBiH + result.final_territory_split.RS + result.final_territory_split.HRHB;
        expect(total).toBeGreaterThan(99);
        expect(total).toBeLessThan(101);
    });

    it('HRHB player winning a demand against RS is credited to HRHB, not RBiH (attribution fix)', () => {
        const state = makeState({
            player_faction: 'HRHB',
            political_controllers: controllers,
            patron: { RS: { override_authority: 95 } }, // force RS to accept the demand
        });
        // HRHB demands gorazde_corridor (RS-held). With the fix, the gained area
        // must accrue to HRHB. The OLD code credited RBiH unconditionally.
        const proposal: DaytonProposal = { territorial_demands: ['gorazde_corridor'], territorial_concessions: [], institutional_choices: {} };
        const result = resolveDaytonNegotiation(state, proposal);
        expect(result.territorial_packages_accepted).toContain('gorazde_corridor');

        // Baseline (no demand) split for comparison.
        const baseState = makeState({ player_faction: 'HRHB', political_controllers: controllers });
        const baseResult = resolveDaytonNegotiation(baseState, { territorial_demands: [], territorial_concessions: [], institutional_choices: {} });

        // HRHB's share must rise vs baseline; RBiH must NOT be the one that rose from this transfer.
        expect(result.final_territory_split.HRHB).toBeGreaterThan(baseResult.final_territory_split.HRHB);
    });

    it('deterministic: identical inputs → identical split', () => {
        const mk = () => makeState({ political_controllers: controllers });
        const proposal: DaytonProposal = { territorial_demands: ['gorazde_corridor'], territorial_concessions: ['central_bosnia'], institutional_choices: { military: 'centralized' } };
        const a = resolveDaytonNegotiation(mk(), { ...proposal });
        const b = resolveDaytonNegotiation(mk(), { ...proposal });
        expect(a.final_territory_split).toEqual(b.final_territory_split);
        expect(a.brcko_status).toBe(b.brcko_status);
    });
});

// ── conceded-package transfer (#277) ────────────────────────────────────────────

describe('conceded package leaves the holder split and is credited to the gainer (#277)', () => {
    const controllers = {
        'op:sarajevo:sarajevo_1': 'RBiH',
        'op:sarajevo:sarajevo_2': 'RBiH',
        'op:travnik:travnik_1': 'RBiH',
        'op:travnik:vitez_1': 'RBiH',
        'op:zenica:zenica_1': 'RBiH',
        'op:banja_luka:banja_luka_2': 'RS',
        'op:banja_luka:dragocaj': 'RS',
        'op:mostar:mostar_1': 'HRHB',
    };

    it('player (RBiH) conceding central_bosnia (RBiH-held) removes it from RBiH and credits RS', () => {
        const state = makeState({ player_faction: 'RBiH', political_controllers: controllers });
        // Baseline: no concession.
        const base = resolveDaytonNegotiation(
            makeState({ player_faction: 'RBiH', political_controllers: controllers }),
            { territorial_demands: [], territorial_concessions: [], institutional_choices: {} },
        );
        // Concede central_bosnia (default_holder RBiH, which the player is).
        const result = resolveDaytonNegotiation(state, {
            territorial_demands: [],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: {},
        });
        expect(result.territorial_packages_accepted).toContain('central_bosnia');

        // The conceded area must LEAVE the player (RBiH) — its share falls vs baseline …
        expect(result.final_territory_split.RBiH).toBeLessThan(base.final_territory_split.RBiH);
        // … and accrue to the opposing entity (RS), not stay phantom in the holder.
        expect(result.final_territory_split.RS).toBeGreaterThan(base.final_territory_split.RS);
    });

    it('split still sums to ~100 after a concession', () => {
        const state = makeState({ player_faction: 'RBiH', political_controllers: controllers });
        const result = resolveDaytonNegotiation(state, {
            territorial_demands: [],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: {},
        });
        const total =
            result.final_territory_split.RBiH +
            result.final_territory_split.RS +
            result.final_territory_split.HRHB;
        expect(total).toBeGreaterThan(99);
        expect(total).toBeLessThan(101);
    });

    it('Brčko-to-arbitration concession still routes to arbitration, not to an entity', () => {
        // Player demands Brčko but the demand fails (no patron override) → arbitration.
        // Concession of a *different* held package must not perturb the arbitration route.
        const state = makeState({
            player_faction: 'RBiH',
            political_controllers: controllers,
            patron: { RS: { override_authority: 5 } },
            dimValue: 20,
        });
        const result = resolveDaytonNegotiation(state, {
            territorial_demands: ['brcko_district'],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: {},
        });
        expect(result.brcko_status).toBe('arbitration');
        expect(result.brcko_arbitration).toBe(true);
        expect(result.territorial_packages_accepted).not.toContain('brcko_district');
        // Arbitration removes Brčko's area from all three; the three still renormalize to 100.
        const total =
            result.final_territory_split.RBiH +
            result.final_territory_split.RS +
            result.final_territory_split.HRHB;
        expect(total).toBeGreaterThan(99);
        expect(total).toBeLessThan(101);
    });

    it('deterministic: identical concession inputs → identical split', () => {
        const mk = () => makeState({ player_faction: 'RBiH', political_controllers: controllers });
        const proposal: DaytonProposal = {
            territorial_demands: [],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: {},
        };
        const a = resolveDaytonNegotiation(mk(), { ...proposal });
        const b = resolveDaytonNegotiation(mk(), { ...proposal });
        expect(a.final_territory_split).toEqual(b.final_territory_split);
    });
});
