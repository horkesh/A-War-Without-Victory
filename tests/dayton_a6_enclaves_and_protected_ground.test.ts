/**
 * DC A6 (owner adopted 2026-11-08): a held enclave stays with its holder; protected ground is
 * a price class, very expensive rather than impossible, never carried by a patron.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { FactionId, GameState } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { initiateDaytonNegotiation, resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { evaluateBotResponse } from '../src/sim/negotiation/bot_negotiation.js';
import { computeSettlementControllersWith, getSettlementAdjacency, planCellAssignments } from '../src/sim/negotiation/peace_settlement.js';
import { enforceSettlementContiguity } from '../src/sim/negotiation/settlement_contiguity.js';
import { ENCLAVE_DEFINITIONS } from '../src/sim/combat/enclave_resilience.js';
import { getTerritorialPackageById } from '../src/sim/negotiation/territorial_packages.js';
import { demandPrice, holderConcessionPrice, PROTECTED_CONCESSION_FLOOR, PROTECTED_PRICE_MULTIPLIER } from '../src/sim/negotiation/patron_leverage.js';
import { parseDaytonProposal } from '../src/desktop/dayton_proposal.js';
import { derivePendingDayton } from '../src/ui/map/data/GameStateAdapter.js';

const painted = JSON.parse(readFileSync(resolve(process.cwd(), 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;

function makeState(player: FactionId, composite = 80, override = 10, controllers: Record<string, string> = painted): GameState {
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
        political: { political_controllers: { ...controllers } },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state);
    return state;
}

const E: DaytonProposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };
const pkg = (id: string) => getTerritorialPackageById(id)!;

describe('protected ground is a price class', () => {
    it('costs the demander three times the price and the holder at least the floor', () => {
        expect(PROTECTED_PRICE_MULTIPLIER).toBe(3);
        expect(demandPrice(pkg('brcko_district'), 'RBiH')).toBe(60);
        expect(demandPrice(pkg('brcko_district'), 'RS')).toBe(0);
        expect(demandPrice(pkg('sarajevo_suburbs'), 'RBiH')).toBe(15);
        expect(holderConcessionPrice(pkg('brcko_district'), 'RS')).toBe(54);
        expect(holderConcessionPrice(pkg('posavina_pocket'), 'RS')).toBe(PROTECTED_CONCESSION_FLOOR);
        expect(holderConcessionPrice(pkg('sarajevo_suburbs'), 'RS')).toBe(12);
    });

    it('the pending packet and the player spend use the premium', () => {
        const state = makeState('RBiH');
        const brcko = state.military.negotiation!.pending_dayton!.territorial_packages.find(p => p.id === 'brcko_district')!;
        expect(brcko.demand_cost).toBe(60);
    });

    it('a strong delegation can give it up of its own will', () => {
        // RBiH composite 80: own willingness 48 ≥ 40 for the corridor.
        const state = makeState('RS', 80, 10);
        const response = evaluateBotResponse(state, 'RBiH', { ...E, territorial_demands: ['gorazde_corridor'] });
        expect(response.decision).toBe('accept');
        expect(response.reason_code).toBe('accept');
    });

    it('no patron carries it, at any authority', () => {
        // Composite 50: own willingness 30 < 40; Washington at 100 would carry anything else.
        const state = makeState('RS', 50, 100);
        expect(evaluateBotResponse(state, 'RBiH', { ...E, territorial_demands: ['gorazde_corridor'] }).decision).not.toBe('accept');
        expect(evaluateBotResponse(state, 'RBiH', { ...E, territorial_demands: ['central_bosnia'] }).decision).toBe('accept');
        const result = resolveDaytonNegotiation(state, parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, state));
        expect(result.territorial_packages_accepted).not.toContain('gorazde_corridor');
    });

    it('the counter-offer drops protected ground first and keeps the rest', () => {
        // RS composite 60: own 36 < Brčko's 54, total willingness covers the suburbs (12).
        const state = makeState('RBiH', 60, 10);
        const response = evaluateBotResponse(state, 'RS', { ...E, territorial_demands: ['brcko_district', 'sarajevo_suburbs'] });
        expect(response.decision).toBe('counter');
        expect(response.counter_proposal!.territorial_demands).toEqual(['sarajevo_suburbs']);
    });
});

describe('an enclave held at signature stays with its holder', () => {
    const srebrenica = ENCLAVE_DEFINITIONS.find(e => e.id === 'srebrenica')!;
    const held = { ...painted };
    for (const o of srebrenica.osid_list!) held[o] = 'RBiH';

    it('a fallen enclave follows the map (history: Srebrenica fell in July 1995)', () => {
        const { controllers } = computeSettlementControllersWith(makeState('RBiH'), 'dayton', {}, planCellAssignments('dayton'));
        expect(controllers[srebrenica.capital_osid!]).toBe('RS');
    });

    it('a held enclave keeps every cell its side holds; nothing else moves across the line except the enclave', () => {
        const base = computeSettlementControllersWith(makeState('RBiH'), 'dayton', {}, planCellAssignments('dayton')).controllers;
        const kept = computeSettlementControllersWith(makeState('RBiH', 80, 10, held), 'dayton', {}, planCellAssignments('dayton')).controllers;
        for (const o of srebrenica.osid_list!) expect(kept[o]).toBe('RBiH');
        const side = (f: string | undefined) => (f === 'RS' ? 'RS' : 'FED');
        const crossed = Object.keys(kept).filter(o => side(kept[o]) !== side(base[o]));
        // Only enclave cells change entity: the corridor that would cut RS in two is refused,
        // so no Tuzla or Kalesija cell is handed to RS in return.
        expect(crossed.filter(o => !srebrenica.osid_list!.includes(o))).toEqual([]);
    });

    it('is deterministic', () => {
        const a = computeSettlementControllersWith(makeState('RBiH', 80, 10, held), 'dayton', {}, planCellAssignments('dayton'));
        const b = computeSettlementControllersWith(makeState('RBiH', 80, 10, held), 'dayton', {}, planCellAssignments('dayton'));
        expect(a).toEqual(b);
    });
});

describe('a corridor never cuts the other entity in two', () => {
    /** 10 × 9 grid: Federation main in columns 0-1, RS elsewhere, a protected Federation block at the right edge. */
    function grid(enclaveRows: number[]) {
        const controllers: Record<string, FactionId> = {};
        const adjacency = new Map<string, string[]>();
        const areas: Record<string, number> = {};
        const id = (x: number, y: number) => `c:${x}:${y}`;
        const enclave = new Set<string>();
        for (let y = 0; y < 9; y++) for (let x = 0; x < 10; x++) {
            const inEnclave = x >= 8 && enclaveRows.includes(y);
            if (inEnclave) enclave.add(id(x, y));
            controllers[id(x, y)] = x <= 1 || inEnclave ? 'RBiH' : 'RS';
            areas[id(x, y)] = 1;
            const n: string[] = [];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx!, ny = y + dy!;
                if (nx >= 0 && ny >= 0 && nx < 10 && ny < 9) n.push(id(nx, ny));
            }
            adjacency.set(id(x, y), n.sort());
        }
        return { controllers, adjacency, areas, isProtectedExclave: () => false, isProtectedCell: (o: string, f: FactionId) => f === 'RBiH' && enclave.has(o) };
    }

    it('leaves a held enclave detached when every corridor would split the other side', () => {
        // The block spans rows 3-5 against the edge: any corridor west severs RS north from south.
        expect(enforceSettlementContiguity(grid([3, 4, 5])).changes).toEqual({});
    });

    it('still draws a corridor that leaves the other side whole', () => {
        // The block sits in the bottom corner: a corridor along the bottom row cuts nothing off.
        const { changes } = enforceSettlementContiguity(grid([7, 8]));
        expect(Object.keys(changes).length).toBeGreaterThan(0);
        expect(Object.values(changes).every(f => f === 'RBiH')).toBe(true);
    });
});

describe('the room labels protected ground on both sides', () => {
    it('marks the other side\'s protected ground with its premium price, and the player\'s own as not concedable', () => {
        const rs = derivePendingDayton(makeState('RS'))!;
        const corridor = rs.territorialPackages.find(p => p.id === 'gorazde_corridor')!;
        expect(corridor.theirCore).toBe(true);
        expect(corridor.demandCost).toBe(45);
        expect(rs.territorialPackages.find(p => p.id === 'sarajevo_suburbs')!.theirCore).toBeUndefined();
        const brcko = rs.territorialPackages.find(p => p.id === 'brcko_district')!;
        expect(brcko.theirCore).toBeUndefined();
        expect(derivePendingDayton(makeState('RBiH'))!.territorialPackages.find(p => p.id === 'gorazde_corridor')!.protectedCore).toBe(true);
    });
});

describe('ground never on the table (historian seat, DC A6 panel)', () => {
    it('Mostar and western Herzegovina cannot be demanded by RS, and HRHB would refuse at any willingness', () => {
        expect(() => parseDaytonProposal({ ...E, territorial_demands: ['mostar'] }, makeState('RS'))).toThrow(/territorial_demands/);
        expect(holderConcessionPrice(pkg('mostar'), 'HRHB')).toBe(1000);
        const rs = derivePendingDayton(makeState('RS'))!.territorialPackages.find(p => p.id === 'mostar')!;
        expect(rs.offTable).toBe(true);
        expect(rs.theirCore).toBeUndefined();
    });

    it('the Goražde corridor is demandable by RS only: HRHB cannot raise its partner\'s ground', () => {
        expect(() => parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, makeState('HRHB'))).toThrow(/territorial_demands/);
        expect(parseDaytonProposal({ ...E, territorial_demands: ['gorazde_corridor'] }, makeState('RS')).territorial_demands).toEqual(['gorazde_corridor']);
    });
});

describe('panel conditions (DC A6, 2026-11-08)', () => {
    const srebrenica = ENCLAVE_DEFINITIONS.find(e => e.id === 'srebrenica')!;
    const held = { ...painted };
    for (const o of srebrenica.osid_list!) held[o] = 'RBiH';

    it('no table package hands a held enclave cell to the besieging entity', () => {
        const toRS: Record<string, FactionId> = {};
        for (const o of srebrenica.osid_list!) toRS[o] = 'RS';
        const { controllers } = computeSettlementControllersWith(makeState('RBiH', 80, 10, held), 'dayton', toRS, planCellAssignments('dayton'));
        for (const o of srebrenica.osid_list!) expect(controllers[o]).toBe('RBiH');
    });

    it('the besieging entity stays one piece when the held enclave cannot be joined', () => {
        const { controllers } = computeSettlementControllersWith(makeState('RBiH', 80, 10, held), 'dayton', {}, planCellAssignments('dayton'));
        const adjacency = getSettlementAdjacency();
        const rs = Object.keys(controllers).filter(o => controllers[o] === 'RS').sort();
        const members = new Set(rs);
        const seen = new Set([rs[0]!]);
        const queue = [rs[0]!];
        for (let i = 0; i < queue.length; i++) for (const n of adjacency.get(queue[i]!) ?? []) if (members.has(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
        expect(seen.size).toBe(rs.length);
    });

    it('a refusal over protected ground says so', () => {
        const state = makeState('RBiH', 60, 10);
        const response = evaluateBotResponse(state, 'RS', { ...E, territorial_demands: ['posavina_pocket', 'sarajevo_suburbs'] });
        // posavina 40 + suburbs 12 = 52 > 36 own and > 36 total: an ordinary counter.
        expect(response.reason_code).not.toBe('counter_protected');
        const pressed = makeState('RBiH', 60, 95);
        const r2 = evaluateBotResponse(pressed, 'RS', { ...E, territorial_demands: ['posavina_pocket', 'sarajevo_suburbs'] });
        // Belgrade at 95 lifts total willingness to 57 ≥ 52, but protected ground needs RS's own 36 ≥ 40.
        expect(r2.decision).toBe('counter');
        expect(r2.reason_code).toBe('counter_protected');
        expect(r2.counter_proposal!.territorial_demands).toEqual(['sarajevo_suburbs']);
    });
});
