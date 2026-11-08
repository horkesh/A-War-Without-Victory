/**
 * Fixes from the Dayton rounds walkthrough (2026-11-08,
 * F:/AWWV-worktrees/.dayton-design/rounds-walkthrough/FINDINGS.md).
 *  1. A deal moves only the parties' own ground across the inter-entity line, never a
 *     Federation partner's cells; a player never concedes its own protected ground
 *     (Brčko excepted); the contiguity pass never cuts a protected heartland.
 *  2. The desktop validator refuses what the room does not offer.
 *  3. One autonomy measure: naming a power at its historical owner changes nothing.
 *  4. The mediator's deadline widens every delegation's willingness each round.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { initiateDaytonNegotiation, resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { computeSettlementControllers, computeSettlementControllersWith, planCellAssignments, settlementControllersFor } from '../src/sim/negotiation/peace_settlement.js';
import { parseDaytonProposal } from '../src/desktop/dayton_proposal.js';
import { getTerritorialPackageById } from '../src/sim/negotiation/territorial_packages.js';
import { playerMayConcede } from '../src/sim/negotiation/patron_leverage.js';
import { resolveOsidsForKeywords } from '../src/sim/negotiation/package_area_resolver.js';
import { computeTreatyAutonomyIndex } from '../src/sim/negotiation/institutional_packages.js';
import { computePeaceDysfunctionBreakdown } from '../src/sim/negotiation/peace_dysfunction.js';
import { evaluateBotResponse } from '../src/sim/negotiation/bot_negotiation.js';
import { tableDaytonRound } from '../src/sim/negotiation/dayton_rounds.js';

const root = process.cwd();
const painted = JSON.parse(readFileSync(resolve(root, 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;
const areas = JSON.parse(readFileSync(resolve(root, 'data/derived/operational/osid_areas.json'), 'utf8')).areas as Record<string, number>;

function makeState(player: FactionId, composite = 80, override = 10): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    const dims = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = createEmptyCapital();
        patron_relationships[f] = { patron_id: 'international_community', support_level: 50, override_authority: override, sanctions_active: false, relationship_events: [] };
        for (const dim of Object.keys(dims[f]!)) dims[f]![dim] = { base_value: composite, event_modifier: 0, effective_value: composite };
    }
    const state = {
        meta: { turn: 188, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: player },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: dims } },
        political: { political_controllers: { ...painted } },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state);
    return state;
}

const E: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
const diff = (a: Record<string, string>, b: Record<string, string>) => Object.keys(a).filter(o => a[o] !== b[o]).sort();

describe('1. deals move only the parties\' own ground', () => {
    it('a player never concedes its own protected ground, Brčko excepted', () => {
        expect(playerMayConcede(getTerritorialPackageById('mostar')!, 'HRHB')).toBe(false);
        expect(playerMayConcede(getTerritorialPackageById('posavina_pocket')!, 'RS')).toBe(false);
        expect(playerMayConcede(getTerritorialPackageById('brcko_district')!, 'RS')).toBe(true);
        expect(playerMayConcede(getTerritorialPackageById('central_bosnia')!, 'RBiH')).toBe(true);
        expect(() => parseDaytonProposal({ ...E, territorial_concessions: ['mostar'] }, makeState('HRHB'))).toThrow(/territorial_concessions/);
    });

    it('a Federation concession hands RS only the conceding party\'s cells, never its partner\'s', () => {
        const base = makeState('RBiH');
        resolveDaytonNegotiation(base, { ...E });
        const conceded = makeState('RBiH');
        resolveDaytonNegotiation(conceded, parseDaytonProposal({ ...E, territorial_concessions: ['central_bosnia'] }, conceded));
        const before = settlementControllersFor(base)!;
        const after = settlementControllersFor(conceded)!;
        const pkgCells = new Set(resolveOsidsForKeywords(getTerritorialPackageById('central_bosnia')!.osid_keywords ?? []));
        for (const o of diff(before, after)) {
            if (!pkgCells.has(o)) continue;
            // Inside the package only RBiH's own cells may change hands.
            expect(before[o], `${o} was ${before[o]}`).toBe('RBiH');
        }
        expect(diff(before, after).filter(o => pkgCells.has(o) && before[o] === 'HRHB')).toEqual([]);
    });

    it('the contiguity pass never cuts a protected heartland (RS gains in western Bosnia leave Banja Luka alone)', () => {
        const state = makeState('RS');
        const overrides: Record<string, FactionId> = {};
        for (const o of Object.keys(areas)) if (o.startsWith('op:glamoc:') || o.startsWith('op:bosansko_grahovo:')) overrides[o] = 'RS';
        const table = planCellAssignments('dayton');
        const base = computeSettlementControllersWith(state, 'dayton', {}, table).controllers;
        const won = computeSettlementControllersWith(state, 'dayton', overrides, table).controllers;
        const changed = diff(base, won);
        expect(changed.filter(o => o.startsWith('op:banja_luka:') || o.startsWith('op:laktasi:') || o.startsWith('op:celinac:'))).toEqual([]);
        expect(changed.some(o => o.startsWith('op:glamoc:'))).toBe(true);
    });

    it('the mediator\'s default map is unchanged by these rules where no deal is made', () => {
        const state = makeState('RBiH');
        expect(computeSettlementControllers(state, 'dayton')).toEqual(computeSettlementControllersWith(state, 'dayton', {}, planCellAssignments('dayton')));
    });
});

describe('2. the validator refuses what the room does not offer', () => {
    it('refuses a Federation partner\'s ground, demanding one\'s own, and conceding another\'s', () => {
        expect(() => parseDaytonProposal({ ...E, territorial_demands: ['central_bosnia'] }, makeState('HRHB'))).toThrow(/territorial_demands/);
        expect(() => parseDaytonProposal({ ...E, territorial_demands: ['central_bosnia'] }, makeState('RBiH'))).toThrow(/territorial_demands/);
        expect(() => parseDaytonProposal({ ...E, territorial_concessions: ['sarajevo_suburbs'] }, makeState('RBiH'))).toThrow(/territorial_concessions/);
        expect(parseDaytonProposal({ ...E, territorial_demands: ['sarajevo_suburbs'] }, makeState('RBiH')).territorial_demands).toEqual(['sarajevo_suburbs']);
    });

    it('the Goražde corridor is Federation ground in the draft: RS may demand it, RBiH may not give it up', () => {
        expect(getTerritorialPackageById('gorazde_corridor')!.default_holder).toBe('RBiH');
        expect(() => parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, makeState('RBiH'))).toThrow(/territorial_demands/);
        expect(() => parseDaytonProposal({ ...E, territorial_concessions: ['gorazde_corridor'] }, makeState('RBiH'))).toThrow(/territorial_concessions/);
        expect(parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, makeState('RS')).territorial_demands).toEqual(['gorazde_corridor']);
        // RBiH's delegation refuses (protected ground) and no patron can force it: the corridor survives signing.
        const state = makeState('RS', 80, 100);
        const result = resolveDaytonNegotiation(state, parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, state));
        expect(result.territorial_packages_accepted).not.toContain('gorazde_corridor');
        const map = settlementControllersFor(state)!;
        for (const o of resolveOsidsForKeywords(getTerritorialPackageById('gorazde_corridor')!.osid_keywords)) expect(map[o]).not.toBe('RS');
    });
});

describe('3. one autonomy measure', () => {
    it('the historical default reads 100 with or without rows named at their historical owner', () => {
        expect(computeTreatyAutonomyIndex({})).toBe(100);
        expect(computeTreatyAutonomyIndex({ competency_allocation: { comp_education: 'entity', comp_customs: 'state', comp_foreign_policy: 'state' } })).toBe(100);
    });

    it('dysfunction does not move when a competency is merely named at its default', () => {
        const signed = (comp?: Record<string, 'state' | 'entity' | 'shared'>) => {
            const s = makeState('RBiH');
            // The dysfunction breakdown runs in emergent campaigns only.
            (s.meta as { decision_mode?: string }).decision_mode = 'emergent';
            resolveDaytonNegotiation(s, { ...E, ...(comp ? { competency_allocation: comp } : {}) });
            return computePeaceDysfunctionBreakdown(s)!.index;
        };
        expect(signed({ comp_education: 'entity', comp_customs: 'state' })).toBe(signed());
    });

    it('real deviations move it: a state army reads lower than history, entity customs cannot exceed it', () => {
        expect(computeTreatyAutonomyIndex({ competency_allocation: { comp_defense: 'state' } })).toBeLessThan(100);
        expect(computeTreatyAutonomyIndex({ competency_allocation: { comp_customs: 'entity' } })).toBe(100);
    });
});

describe('4. the mediator\'s deadline', () => {
    it('a demand just beyond a delegation\'s limit in round 1 is accepted by round 3', () => {
        // RS concedes the Sarajevo suburbs at cost 12; capital 18 → limit 10.8 in round 1, 12.6 by round 3.
        const state = makeState('RBiH', 18, 0);
        const draft = { ...E, territorial_demands: ['sarajevo_suburbs'] };
        const r1 = tableDaytonRound(state, draft, evaluateBotResponse);
        tableDaytonRound(state, draft, evaluateBotResponse);
        const r3 = tableDaytonRound(state, draft, evaluateBotResponse);
        expect(r1.ok && r1.round.responses.RS!.decision).not.toBe('accept');
        expect(r3.ok && r3.round.responses.RS!.decision).toBe('accept');
    });
});
