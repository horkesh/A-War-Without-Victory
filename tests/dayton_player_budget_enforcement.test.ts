/**
 * Engine-level player-budget enforcement (Dayton #331 review note 1).
 *
 * The DaytonNegotiationModal disables Submit when the player's proposal spends more
 * than their earned negotiation capital, but that check is UI-only. These tests
 * prove the SIM boundary re-checks: a non-UI caller (bot / headless / future API)
 * that hands `resolveDaytonNegotiation` an over-budget proposal has it clamped
 * deterministically — the dearest charged items are dropped until the player's spend
 * fits their available capital. A within-budget proposal passes through unchanged.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import {
    computePlayerProposalSpend,
    clampPlayerProposalToBudget,
} from '../src/sim/negotiation/bot_negotiation.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';

// ── Test scaffold (mirrors tests/dayton_negotiation.test.ts) ─────────────────

function makePatron(overrides: Partial<PatronRelationship> = {}): PatronRelationship {
    return {
        patron_id: 'international_community',
        support_level: 50,
        override_authority: 10,
        sanctions_active: false,
        relationship_events: [],
        ...overrides,
    };
}

/** DimensionStore with every dimension at `value` for all factions → composite = value. */
function makeDimStore(value: number): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[faction])) {
            store[faction][dim] = { base_value: value, event_modifier: 0, effective_value: value };
        }
    }
    return store;
}

function makeState(playerFaction: FactionId, composite: number): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = makePatron();
    }
    return {
        meta: {
            turn: 188, war_start_turn: 0, phase: 'war', seed: 1,
            date: '1995-11-21', game_over: false, player_faction: playerFaction,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital, patron_relationships, peace_plan_history: [],
                strategic_dimensions: makeDimStore(composite),
            },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

// ── computePlayerProposalSpend — the asymmetric cost-to-self model ────────────

describe('computePlayerProposalSpend (player budget model)', () => {
    it('charges the player to DEMAND territory they do not hold', () => {
        // RBiH demands gorazde_corridor (held by RS) → demand cost 15.
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor'],
            territorial_concessions: [],
            institutional_choices: {},
        };
        expect(computePlayerProposalSpend(proposal, 'RBiH')).toBe(15);
        // RS already holds it → demanding it costs RS nothing.
        expect(computePlayerProposalSpend(proposal, 'RS')).toBe(0);
    });

    it('charges the player to CONCEDE territory they hold', () => {
        // RBiH concedes central_bosnia (RBiH-held) → concede cost 8.
        const proposal: DaytonProposal = {
            territorial_demands: [],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: {},
        };
        expect(computePlayerProposalSpend(proposal, 'RBiH')).toBe(8);
        // RS does not hold central_bosnia → conceding it is free to RS.
        expect(computePlayerProposalSpend(proposal, 'RS')).toBe(0);
    });

    it('is 0 for the all-historical default proposal (byte-identity guard)', () => {
        const proposal: DaytonProposal = {
            territorial_demands: [],
            territorial_concessions: [],
            institutional_choices: {},
        };
        expect(computePlayerProposalSpend(proposal, 'RBiH')).toBe(0);
        expect(computePlayerProposalSpend(proposal, 'RS')).toBe(0);
        expect(computePlayerProposalSpend(proposal, 'HRHB')).toBe(0);
    });

    it('is deterministic — same inputs, same spend', () => {
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor', 'brcko_district'],
            territorial_concessions: ['central_bosnia'],
            institutional_choices: { presidency: 'decentralized' },
        };
        expect(computePlayerProposalSpend(proposal, 'RBiH'))
            .toBe(computePlayerProposalSpend(proposal, 'RBiH'));
    });
});

// ── clampPlayerProposalToBudget — the deterministic clamp ────────────────────

describe('clampPlayerProposalToBudget', () => {
    it('returns a within-budget proposal UNCHANGED (no clamp)', () => {
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor'], // 15
            territorial_concessions: [],
            institutional_choices: {},
        };
        const res = clampPlayerProposalToBudget(proposal, 'RBiH', 50);
        expect(res.clamped).toBe(false);
        expect(res.dropped).toEqual([]);
        expect(res.proposal).toBe(proposal); // same reference — untouched
    });

    it('drops the DEAREST items first until the spend fits the budget', () => {
        // RBiH demands srebrenica(25) + brcko(20) + gorazde(15) = 60; budget 30.
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor', 'brcko_district', 'srebrenica_area'],
            territorial_concessions: [],
            institutional_choices: {},
        };
        const res = clampPlayerProposalToBudget(proposal, 'RBiH', 30);
        expect(res.clamped).toBe(true);
        // Drops srebrenica(25) → 35, still > 30, drops brcko(20) → 15 ≤ 30. Stop.
        expect(res.dropped).toEqual(['demand:srebrenica_area', 'demand:brcko_district']);
        expect(res.proposal.territorial_demands).toEqual(['gorazde_corridor']);
        expect(res.finalSpend).toBeLessThanOrEqual(30);
        expect(res.finalSpend).toBe(15);
    });

    it('treats a negative/zero budget as 0 (clamps everything chargeable)', () => {
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor'],
            territorial_concessions: [],
            institutional_choices: {},
        };
        const res = clampPlayerProposalToBudget(proposal, 'RBiH', -5);
        expect(res.clamped).toBe(true);
        expect(res.finalSpend).toBe(0);
        expect(res.proposal.territorial_demands).toEqual([]);
    });

    it('is deterministic — identical inputs yield identical clamps', () => {
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor', 'brcko_district', 'srebrenica_area'],
            territorial_concessions: [],
            institutional_choices: {},
        };
        const a = clampPlayerProposalToBudget(proposal, 'RBiH', 30);
        const b = clampPlayerProposalToBudget(proposal, 'RBiH', 30);
        expect(a.dropped).toEqual(b.dropped);
        expect(a.proposal.territorial_demands).toEqual(b.proposal.territorial_demands);
    });
});

// ── resolveDaytonNegotiation — enforcement AT the sim boundary ───────────────

describe('resolveDaytonNegotiation enforces the player budget at the sim boundary', () => {
    it('an over-budget proposal is clamped before resolution (not honored in full)', () => {
        // Player RBiH, composite capital 30. An over-budget demand stack that the UI
        // would mark "Over Budget" but a non-UI caller could still submit.
        const state = makeState('RBiH', 30);
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor', 'brcko_district', 'srebrenica_area'], // 60 > 30
            territorial_concessions: [],
            institutional_choices: {},
        };

        const result = resolveDaytonNegotiation(state, proposal);

        // The dearest demands (srebrenica, brcko) were dropped by the engine clamp, so
        // they are NOT in the signed settlement — neither accepted nor patron-overridden.
        const touched = new Set([
            ...result.territorial_packages_accepted,
            ...result.patron_overrides_applied.map(o => o.split(':')[1]),
        ]);
        expect(touched.has('srebrenica_area')).toBe(false);
        expect(touched.has('brcko_district')).toBe(false);
        // Game still resolves to a valid Dayton outcome.
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('dayton');
    });

    it('a within-budget proposal resolves identically to the unclamped input', () => {
        const within: DaytonProposal = {
            territorial_demands: ['gorazde_corridor'], // 15 ≤ 50
            territorial_concessions: [],
            institutional_choices: { presidency: 'decentralized' }, // RBiH cost 5 → 20 total
        };
        const a = resolveDaytonNegotiation(makeState('RBiH', 50), { ...within });
        const b = resolveDaytonNegotiation(makeState('RBiH', 50), { ...within });
        expect(a.territorial_packages_accepted).toEqual(b.territorial_packages_accepted);
        expect(a.territorial_packages_rejected).toEqual(b.territorial_packages_rejected);
        expect(a.patron_overrides_applied).toEqual(b.patron_overrides_applied);
        // gorazde was affordable → it survives the (no-op) clamp and is processed.
        const seen = new Set([
            ...a.territorial_packages_accepted,
            ...a.territorial_packages_rejected,
        ]);
        expect(seen.has('gorazde_corridor')).toBe(true);
    });

    it('is deterministic end-to-end for an over-budget proposal', () => {
        const proposal: DaytonProposal = {
            territorial_demands: ['gorazde_corridor', 'brcko_district', 'srebrenica_area'],
            territorial_concessions: [],
            institutional_choices: {},
        };
        const a = resolveDaytonNegotiation(makeState('RBiH', 30), { ...proposal });
        const b = resolveDaytonNegotiation(makeState('RBiH', 30), { ...proposal });
        expect(a.territorial_packages_accepted).toEqual(b.territorial_packages_accepted);
        expect(a.territorial_packages_rejected).toEqual(b.territorial_packages_rejected);
        expect(a.final_territory_split).toEqual(b.final_territory_split);
        expect(a.patron_overrides_applied).toEqual(b.patron_overrides_applied);
    });
});
