/**
 * One operative assignment per power (DC plan stage 3, amendment A4).
 *
 * The packaged clause-review proof showed a signed treaty carrying "Police Forces:
 * decentralized" and "Police: State" on one sheet, because the six legacy toggles and
 * the Annex-4 competency matrix were resolved and displayed independently. These
 * tests pin the reconciliation in `power_overlap.ts`: an explicit competency or
 * constitutional slot wins over a contradicting legacy toggle, a raised legacy toggle
 * with no slot writes the slot on the record, the historical default is untouched,
 * and the binder lists each power once.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { resolveDaytonNegotiation, projectDaytonAgreement } from '../src/sim/negotiation/dayton_negotiation.js';
import { computeProposalCostToFaction, computePlayerProposalSpend } from '../src/sim/negotiation/bot_negotiation.js';
import {
    POWER_OVERLAP,
    effectiveOperativePowers,
    legacyProjection,
    reconcileProposalPowers,
    reconcileResolvedPowers,
} from '../src/sim/negotiation/power_overlap.js';
import { institutionalRows } from '../src/ui/map/dayton_conference/clauses.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { DimensionStore } from '../src/sim/events/strategic_dimensions.js';

// ── Scaffold (mirrors tests/dayton_player_budget_enforcement.test.ts) ─────────

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

function makeDimStore(value: number): DimensionStore {
    const store = initializeStrategicDimensions();
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[faction])) {
            store[faction][dim] = { base_value: value, event_modifier: 0, effective_value: value };
        }
    }
    return store;
}

function makeState(playerFaction: FactionId, composite: number, override = 10): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = makePatron({ override_authority: override });
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

const DEFAULT: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };

describe('power overlap table', () => {
    it('names every legacy toggle once and points each at a real slot', () => {
        expect(POWER_OVERLAP.map(o => o.legacy).sort()).toEqual(['economy', 'education', 'judiciary', 'military', 'police', 'presidency']);
        for (const overlap of POWER_OVERLAP) {
            expect(overlap.slot.startsWith(overlap.kind === 'competency' ? 'comp_' : 'arch_')).toBe(true);
        }
    });
});

describe('reconcileProposalPowers (entry)', () => {
    it('lets an explicit competency slot overrule a contradicting legacy toggle', () => {
        const proposal: DaytonProposal = {
            ...DEFAULT,
            institutional_choices: { police: 'decentralized' },
            competency_allocation: { comp_police: 'state' },
        };
        const out = reconcileProposalPowers(proposal);
        expect(out.institutional_choices.police).toBe('centralized');
        expect(out.competency_allocation).toEqual({ comp_police: 'state' });
        // The input is not mutated.
        expect(proposal.institutional_choices.police).toBe('decentralized');
    });

    it('returns the same object when nothing contradicts (historical default stays byte-identical)', () => {
        expect(reconcileProposalPowers(DEFAULT)).toBe(DEFAULT);
        const legacyOnly: DaytonProposal = { ...DEFAULT, institutional_choices: { military: 'centralized' } };
        expect(reconcileProposalPowers(legacyOnly)).toBe(legacyOnly);
        const slotOnly: DaytonProposal = { ...DEFAULT, competency_allocation: { comp_defense: 'state' } };
        expect(reconcileProposalPowers(slotOnly)).toBe(slotOnly);
    });

    it('does not add a legacy toggle (and its cost) when only the slot is set', () => {
        const slotOnly: DaytonProposal = { ...DEFAULT, competency_allocation: { comp_police: 'state' } };
        const legacyToo: DaytonProposal = { ...slotOnly, institutional_choices: { police: 'centralized' } };
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            expect(computeProposalCostToFaction(slotOnly, faction)).toBeLessThanOrEqual(computeProposalCostToFaction(legacyToo, faction));
            expect(computePlayerProposalSpend(slotOnly, faction)).toBeLessThanOrEqual(computePlayerProposalSpend(legacyToo, faction));
        }
    });
});

describe('reconcileResolvedPowers (record)', () => {
    it('a resolved slot writes its legacy toggle', () => {
        const legacy: Record<string, 'centralized' | 'decentralized'> = { police: 'decentralized', military: 'decentralized' };
        const out = reconcileResolvedPowers(legacy, { competency_allocation: { comp_police: 'state' } }, []);
        expect(legacy.police).toBe('centralized');
        expect(legacy.military).toBe('decentralized');
        expect(out.competency_allocation).toEqual({ comp_police: 'state' });
    });

    it('a raised legacy toggle with no slot writes the slot when it departs from the default', () => {
        const legacy: Record<string, 'centralized' | 'decentralized'> = { military: 'centralized', presidency: 'centralized', education: 'decentralized' };
        const out = reconcileResolvedPowers(legacy, {}, ['military', 'presidency', 'education']);
        expect(out.competency_allocation).toEqual({ comp_defense: 'state' });
        expect(out.constitutional_choices).toEqual({ arch_presidency: 'single_elected' });
    });

    it('a defaulted legacy toggle (not raised) writes nothing', () => {
        const legacy: Record<string, 'centralized' | 'decentralized'> = { military: 'centralized' };
        const out = reconcileResolvedPowers(legacy, {}, []);
        expect(out).toEqual({});
    });
});

describe('resolveDaytonNegotiation carries one answer per power', () => {
    it('historical default: all six legacy toggles decentralized, no operative slots added', () => {
        const result = resolveDaytonNegotiation(makeState('RBiH', 50), { ...DEFAULT });
        expect(result.institutional_choices).toEqual({
            economy: 'decentralized', education: 'decentralized', judiciary: 'decentralized',
            military: 'decentralized', police: 'decentralized', presidency: 'decentralized',
        });
        expect(result.competency_allocation).toBeUndefined();
        expect(result.constitutional_choices).toBeUndefined();
        expect(result.entity_autonomy_index).toBe(100);
    });

    it('an explicit operative slot that survives is mirrored onto the legacy toggle (patron-forced)', () => {
        // Override 95 on every bot: objections are forced through, so comp_police=state survives.
        const state = makeState('RBiH', 100, 95);
        const result = resolveDaytonNegotiation(state, {
            ...DEFAULT,
            institutional_choices: { police: 'decentralized' },
            competency_allocation: { comp_police: 'state' },
        });
        expect(result.competency_allocation?.comp_police).toBe('state');
        expect(result.institutional_choices.police).toBe('centralized');
        expect(result.entity_autonomy_index).toBeLessThan(100);
        const agreement = projectDaytonAgreement(state, {});
        expect(agreement.terms.competency_allocation?.comp_police).toBe('state');
        expect(agreement.terms.institutional_choices.police).toBe('centralized');
    });

    it('a raised legacy toggle that survives writes the operative slot on the record', () => {
        const state = makeState('RBiH', 100, 95);
        const result = resolveDaytonNegotiation(state, { ...DEFAULT, institutional_choices: { military: 'centralized' } });
        expect(result.institutional_choices.military).toBe('centralized');
        expect(result.competency_allocation?.comp_defense).toBe('state');
    });

    it('is deterministic', () => {
        const proposal: DaytonProposal = { ...DEFAULT, institutional_choices: { police: 'decentralized' }, competency_allocation: { comp_police: 'state' } };
        const a = resolveDaytonNegotiation(makeState('RBiH', 100, 95), proposal);
        const b = resolveDaytonNegotiation(makeState('RBiH', 100, 95), proposal);
        expect(a).toEqual(b);
    });
});

describe('binder rows: one row per power', () => {
    it('never lists a legacy toggle id and shows a legacy-only term through its slot', () => {
        const rows = institutionalRows({ institutional_choices: { police: 'centralized', military: 'decentralized' } });
        const ids = rows.map(r => r.id);
        for (const legacy of ['police', 'military', 'economy', 'education', 'judiciary', 'presidency']) expect(ids).not.toContain(legacy);
        expect(ids).toContain('comp_police');
        expect(ids).toContain('comp_defense');
        expect(ids.filter(id => id === 'comp_police')).toHaveLength(1);
    });

    it('with defaults lists the 16 competencies and the constitutional and return choices once each', () => {
        const rows = institutionalRows({ institutional_choices: {} }, true);
        const ids = rows.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter(id => id.startsWith('comp_'))).toHaveLength(16);
        expect(ids).toContain('arch_presidency');
    });

    it('effective and projected views agree on a contradicting pair', () => {
        const terms = { institutional_choices: { police: 'decentralized' as const }, competency_allocation: { comp_police: 'state' as const } };
        expect(effectiveOperativePowers(terms).competency.comp_police).toBe('state');
        expect(legacyProjection(terms).police).toBe('centralized');
    });
});
