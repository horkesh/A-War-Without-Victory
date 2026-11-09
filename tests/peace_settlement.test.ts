/**
 * Peace settlement consequences (owner, 2026-11-07): an accepted plan or a signed/imposed
 * Dayton settles on the plan's MAP and constitutional terms, not on the front line.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    SETTLEMENT_STATUS,
    applyPeaceSettlement,
    capGradeBySettlement,
    computeSettlementControllers,
    planCellAssignments,
    settlementTerritoryPct,
    settlementControllersFor,
} from '../src/sim/negotiation/peace_settlement.js';
import { resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import {
    buildHistoricalDefaultDaytonProposal,
    initiateDaytonNegotiation,
    resolveDaytonNegotiation,
} from '../src/sim/negotiation/dayton_negotiation.js';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';

const root = process.cwd();
const painted = JSON.parse(readFileSync(resolve(root, 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;
const shares = JSON.parse(readFileSync(resolve(root, 'data/derived/peace/plan_settlement_shares.json'), 'utf8'));
const areas = JSON.parse(readFileSync(resolve(root, 'data/derived/operational/osid_areas.json'), 'utf8')).areas as Record<string, number>;

function makeState(player: 'RBiH' | 'RS' | 'HRHB' = 'RBiH', territory: Record<string, number> = { RBiH: 32, RS: 47, HRHB: 21 }): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { ...createEmptyCapital(), territory_controlled_pct: territory[f]! };
        patron_relationships[f] = { patron_id: 'international_community', support_level: 50, override_authority: 10, sanctions_active: false, relationship_events: [] };
    }
    const dims = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) dims[f]!.internal_cohesion = { base_value: 60, event_modifier: 0, effective_value: 60 };
    return {
        meta: { turn: 120, war_start_turn: 0, phase: 'war', seed: 1, date: '1994-07-20', game_over: false, player_faction: player, decision_mode: 'historical' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: dims },
        },
        political: { political_controllers: { ...painted } },
        displacement: {},
    } as unknown as GameState;
}

function mapTotals(plan: string): Record<string, number> {
    const munArea: Record<string, number> = {};
    for (const [o, a] of Object.entries(areas)) { const m = o.split(':')[1]!; munArea[m] = (munArea[m] ?? 0) + a; }
    const total = Object.values(munArea).reduce((s, a) => s + a, 0);
    const out: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, special: 0 };
    for (const [m, v] of Object.entries(shares.plans[plan] as Record<string, Record<string, number>>)) {
        for (const k of Object.keys(out)) out[k] += (v[k] ?? 0) * (munArea[m] ?? 0) / 100;
    }
    for (const k of Object.keys(out)) out[k] = (100 * out[k]!) / total;
    return out;
}

/** Shares of BiH by side in a plan's cell table (all cells listed for the map-read plans). */
function cellTotals(plan: 'vance_owen' | 'owen_stoltenberg'): Record<string, number> {
    const cells = planCellAssignments(plan);
    const total = Object.values(areas).reduce((s, a) => s + a, 0);
    const out: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, special: 0 };
    for (const [o, row] of Object.entries(cells)) out[row.special ? 'special' : row.faction ?? 'RBiH'] += areas[o] ?? 0;
    for (const k of Object.keys(out)) out[k] = (100 * out[k]!) / total;
    return out;
}

describe('plans read off their own maps (2026-11-09)', () => {
    it('list every simulated settlement and reproduce the plans\' published Serb shares', () => {
        for (const plan of ['vance_owen', 'owen_stoltenberg'] as const) {
            expect(Object.keys(planCellAssignments(plan)).sort()).toEqual(Object.keys(areas).sort());
        }
        // Vance–Owen, January 1993 map: Serb-led provinces about 43 % (research §1.2).
        expect(cellTotals('vance_owen').RS).toBeCloseTo(43.7, 0);
        // Owen–Stoltenberg, Geneva scan: the published 52.5 % plus the scan's own reading.
        expect(cellTotals('owen_stoltenberg').RS).toBeGreaterThan(51);
        expect(cellTotals('owen_stoltenberg').RS).toBeLessThan(57);
    });
});

describe('researched plan maps', () => {
    it('reproduce the published Serb shares', () => {
        expect(mapTotals('vance_owen').RS).toBeCloseTo(43.0, 0);
        expect(mapTotals('owen_stoltenberg').RS).toBeCloseTo(52.3, 0);
        expect(mapTotals('contact_group').RS).toBeCloseTo(48.9, 0);
        expect(mapTotals('dayton').RS).toBeCloseTo(48.3, 0);
    });

    it('agree with the plan definitions (special land counted with RBiH) within 2 points', () => {
        for (const plan of ['vance_owen', 'owen_stoltenberg', 'contact_group', 'dayton']) {
            const t = mapTotals(plan);
            const split = getPeacePlanById(plan)!.proposed_split;
            expect(Math.abs(t.RS! - split.RS), `${plan} RS`).toBeLessThanOrEqual(2);
            expect(Math.abs(t.HRHB! - split.HRHB), `${plan} HRHB`).toBeLessThanOrEqual(2);
            expect(Math.abs(t.RBiH! + t.special! - split.RBiH), `${plan} RBiH`).toBeLessThanOrEqual(2);
        }
    });
});

describe('computeSettlementControllers', () => {
    it('lands the OSID-level settlement close to the plan map and is deterministic', () => {
        for (const plan of ['vance_owen', 'owen_stoltenberg', 'contact_group', 'dayton'] as const) {
            const a = computeSettlementControllers(makeState(), plan);
            const b = computeSettlementControllers(makeState(), plan);
            expect(JSON.stringify(a)).toBe(JSON.stringify(b));
            const pct = settlementTerritoryPct(a.controllers);
            if (plan === 'vance_owen' || plan === 'owen_stoltenberg') {
                // Read cell by cell off the plan's own map (2026-11-09): RS gets exactly its cells,
                // plus whatever special (shared administration) land it holds at the time.
                const t = cellTotals(plan);
                expect(pct.RS!, plan).toBeGreaterThanOrEqual(t.RS! - 0.01);
                expect(pct.RS!, plan).toBeLessThanOrEqual(t.RS! + t.special! + 0.01);
            } else {
                expect(Math.abs(pct.RS! - mapTotals(plan).RS!), plan).toBeLessThanOrEqual(2.5);
            }
        }
    });

    it('moves land that the front line and the map disagree on (Dayton: Srebrenica to RS, Mrkonjic Grad to RS)', () => {
        const { controllers } = computeSettlementControllers(makeState(), 'dayton');
        expect(controllers['op:srebrenica:srebrenica_2']).toBe('RS');
        const mrkonjic = Object.keys(controllers).filter((o) => o.startsWith('op:mrkonjic_grad:'));
        expect(mrkonjic.length).toBeGreaterThan(0);
        expect(mrkonjic.every((o) => controllers[o] === 'RS')).toBe(true);
    });
});

describe('accepted peace plans settle on the map and its terms', () => {
    it('Vance-Owen: map shares replace the front line, RS is capped at C, wartime control is untouched', () => {
        const state = makeState('RBiH', { RBiH: 24, RS: 63, HRHB: 12 });
        state.military.negotiation!.pending_peace_plan = {
            plan_id: 'vance_owen', turn_offered: 40, bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };
        const wartimeBefore = JSON.stringify(state.political.political_controllers);
        const r = resolvePeacePlan(state, 'vance_owen', 'accepted');
        expect(r.all_accepted).toBe(true);
        const settlement = state.military.negotiation!.settlement!;
        expect(settlement.plan_id).toBe('vance_owen');
        expect(settlement.territory_pct.RS).toBeGreaterThan(41);
        // Read off the January 1993 map (2026-11-09): 43.7 % Serb-led provinces, plus the
        // Sarajevo-province land RS holds, which a special province leaves with its holder.
        expect(settlement.territory_pct.RS).toBeLessThan(48);
        expect(settlement.status.RS!.named).toBe(false);
        expect(JSON.stringify(state.political.political_controllers)).toBe(wartimeBefore);
        const rs = computeFactionVerdict(state, 'RS');
        expect(['C', 'D', 'F']).toContain(rs.grade);
        expect(rs.capital_breakdown?.territory_controlled_pct).toBeCloseTo(settlement.territory_pct.RS!, 6);
    });

    it('a plan someone rejects records no settlement', () => {
        const state = makeState('RBiH');
        state.military.negotiation!.pending_peace_plan = {
            plan_id: 'contact_group', turn_offered: 118, bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        resolvePeacePlan(state, 'contact_group', 'accepted');
        expect(state.military.negotiation!.settlement).toBeUndefined();
    });
});

describe('Dayton settles on the Dayton map and names Republika Srpska', () => {
    it('historical-default Dayton gives RS about 48% as a named, contiguous entity with its army', () => {
        const state = makeState('RBiH');
        state.meta.turn = 188;
        state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state) as never;
        resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());
        const s = state.military.negotiation!.settlement!;
        expect(s.plan_id).toBe('dayton');
        expect(s.territory_pct.RS).toBeGreaterThan(46.5);
        expect(s.territory_pct.RS).toBeLessThan(50.5);
        expect(SETTLEMENT_STATUS.dayton.RS).toMatchObject({ named: true, contiguous: true, own_army: true, max_grade: null });
        expect(s.map_overrides).toBeUndefined();
    });

    it('a package the player concedes moves to the other side on the settlement map', () => {
        const state = makeState('RBiH');
        state.meta.turn = 188;
        state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state) as never;
        resolveDaytonNegotiation(state, { territorial_demands: [], territorial_concessions: ['central_bosnia'], institutional_choices: {} });
        const s = state.military.negotiation!.settlement!;
        if (state.military.negotiation!.dayton_result!.territorial_packages_accepted.includes('central_bosnia')) {
            const map = settlementControllersFor(state)!;
            expect(Object.keys(s.map_overrides ?? {}).length).toBeGreaterThan(0);
            for (const o of Object.keys(s.map_overrides ?? {})) expect(map[o]).toBe('RS');
        }
    });
});

describe('capGradeBySettlement', () => {
    it('only lowers, and only where the terms set a cap', () => {
        const state = makeState();
        const s = applyPeaceSettlement(state, 'vance_owen');
        expect(capGradeBySettlement('A', s, 'RS')).toBe('C');
        expect(capGradeBySettlement('D', s, 'RS')).toBe('D');
        expect(capGradeBySettlement('A', s, 'HRHB')).toBe('A');
        expect(capGradeBySettlement('A+', undefined, 'RS')).toBe('A+');
    });
});
