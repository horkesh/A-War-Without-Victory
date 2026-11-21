/**
 * Defence fix D3 (seats r2, 2026-11-18): relief in place on contact cells.
 *
 * Contact cell = a front cell the faction still holds that appears as `engagement.osid`
 * of a defender engagement in persisted brigade_history, within the commander's
 * recapture window, from the turn after the engagement.
 *
 * Every test here either moves a brigade that the parent commit leaves in place, or
 * pairs a guard with a positive control, so each fails on the parent commit.
 *
 * Toy front (one RS sector, corps vrs_test): a ladder.
 *   e1  e2  e3  e4  e5  e6     (RBiH)
 *   f1 -f2 -f3 -f4 -f5 -f6     (RS front cells)
 *   r1 -r2 -r3 -r4 -r5 -r6     (RS rear road; ri - fi)
 */
import { describe, expect, it } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { ensureMinimumSectorCoverage } from '../src/sim/combat/brigade_assignment.js';
import { buildContactOsidsByFaction } from '../src/sim/combat/contact_cells.js';
import { _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { CorpsFrontSector, CorpsFrontSubSegment, FormationId, FormationState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { SectorTopologyNarrowReadState } from '../src/sim/combat/sector_topology_narrow_reads.js';
import { makeAdjacency } from './_helpers/adjacency.js';

const TURN = 10;
const CORPS = 'vrs_test';
const FRONT = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
const REAR = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const ENEMY = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'];

function ladderAdjacency(): Map<string, string[]> {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < FRONT.length; i++) {
        pairs.push([FRONT[i]!, REAR[i]!]);
        pairs.push([FRONT[i]!, ENEMY[i]!]);
        if (i + 1 < FRONT.length) {
            pairs.push([FRONT[i]!, FRONT[i + 1]!]);
            pairs.push([REAR[i]!, REAR[i + 1]!]);
            pairs.push([ENEMY[i]!, ENEMY[i + 1]!]);
        }
    }
    return makeAdjacency(pairs);
}

function controllers(faction = 'RS', enemy = 'RBiH'): Record<string, string> {
    const result: Record<string, string> = {};
    for (const osid of [...FRONT, ...REAR]) result[osid] = faction;
    for (const osid of ENEMY) result[osid] = enemy;
    return result;
}

function brigade(id: string, location: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        created_turn: 0,
        assignment: null,
        corps_id: CORPS,
        location_osid: location,
        personnel: 1000,
        cohesion: 60,
        morale: 60,
        posture: 'defend',
        entrenchment_turns: 6,
        disrupted_turns: 0,
        ...overrides,
    } as FormationState;
}

function defenderEngagement(osid: string, turn: number, battleId?: string) {
    return {
        ...(battleId ? { battle_id: battleId } : {}),
        turn,
        osid,
        role: 'defender' as const,
        outcome: 'stalemate' as const,
        casualties_taken: 50,
        casualties_inflicted: 50,
        enemy_faction: 'RBiH' as const,
        territory_flipped: false,
        was_concentrated: false,
    };
}

/** A formation that carries the defender engagements (inactive: never a candidate). */
function historyCarrier(engagements: ReturnType<typeof defenderEngagement>[], overrides: Partial<FormationState> = {}): FormationState {
    return brigade('hist', 'r6', {
        status: 'inactive',
        brigade_history: { engagements } as FormationState['brigade_history'],
        ...overrides,
    });
}

function sector(overrides: Partial<CorpsFrontSector> = {}, primary: string[] = []): CorpsFrontSector {
    const subSegment: CorpsFrontSubSegment = {
        sub_segment_id: 'subseg:vrs_test:0',
        edge_ids: FRONT.map((osid, index) => `edge:${osid}:${ENEMY[index]}`),
        friendly_osids: [...FRONT],
        enemy_osids: [...ENEMY],
        length_edges: FRONT.length,
        primary_brigade_ids: [...primary],
    };
    return {
        sector_id: 'sector:vrs_test:0',
        corps_id: CORPS,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [...subSegment.edge_ids],
        sub_segments: [subSegment],
        length_edges: FRONT.length,
        territory_osids: [...FRONT, ...REAR],
        assigned_brigade_ids: [...primary],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
        ...overrides,
    } as CorpsFrontSector;
}

function makeState(formations: Record<string, FormationState>, extra: Record<string, unknown> = {}): any {
    return {
        meta: { turn: TURN },
        political: { political_controllers: controllers() },
        military: {
            formations,
            brigade_movement_orders: {},
            ...extra,
        },
    };
}

function run(state: any, sectors: CorpsFrontSector[]): void {
    state.military.corps_front_sectors = Object.fromEntries(sectors.map((s) => [s.sector_id, s]));
    distributeBrigadesToFront(state, sectors, ladderAdjacency());
}

function orderTarget(state: any, id: string): string | undefined {
    return state.military.brigade_movement_orders?.[id]?.destination_sids?.[0];
}

describe('D3 contact cells', () => {
    it('reads engagement.osid of defender engagements from the turn after, inside the recapture window, on held cells only', () => {
        const formations = {
            hist: historyCarrier([
                defenderEngagement('f1', TURN - 1),                       // contact
                defenderEngagement('f2', TURN),                           // same turn: not yet
                defenderEngagement('f3', TURN - 9),                       // older than the window
                defenderEngagement('f4', TURN - 1, `${TURN - 1}:f4:friction:hist`), // friction: not an attack
                defenderEngagement('e5', TURN - 1),                       // lost cell (enemy-held): G3
            ], { location_osid: 'f6', status: 'active' }),                // G4: location f6 is not a contact
        };
        const contacts = buildContactOsidsByFaction(formations, controllers(), TURN);
        expect([...(contacts.get('RS') ?? [])].sort()).toEqual(['f1']);
    });
});

describe('D3 R1: an empty contact cell is taken by the nearest eligible same-corps brigade', () => {
    it('moves an adjacent same-corps brigade directly onto the empty contact cell', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            near: brigade('near', 'r1'),
            far: brigade('far', 'r3'),
            other_corps: brigade('other_corps', 'r2', { corps_id: 'vrs_other' }),
        });
        run(state, [sector()]);

        expect(state.military.formations.near.location_osid).toBe('f1');
        expect(state.military.formations.near.entrenchment_turns).toBe(0);
        expect(orderTarget(state, 'far')).toBeUndefined();
        expect(state.military.formations.far.location_osid).toBe('r3');
        expect(state.military.formations.other_corps.location_osid).toBe('r2');
    });

    it('sorts by distance first, then by power at the cell, then by id, and marches a distant relief', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            weak_d3: brigade('weak_d3', 'r3', { personnel: 800 }),
            strong_d3: brigade('strong_d3', 'f4', { personnel: 2000 }),   // quiet front cell, no contact neighbour
            strongest_d5: brigade('strongest_d5', 'r5', { personnel: 3000 }),
        });
        run(state, [sector()]);

        expect(orderTarget(state, 'strong_d3')).toBe('f1');
        expect(state.military.formations.strong_d3.location_osid).toBe('f4');
        expect(orderTarget(state, 'weak_d3')).toBeUndefined();
        expect(orderTarget(state, 'strongest_d5')).toBeUndefined();
    });

    it('relieves only from the turn after the engagement and inside the recapture window', () => {
        const state = makeState({
            hist: historyCarrier([
                defenderEngagement('f1', TURN - 1),
                defenderEngagement('f3', TURN),
                defenderEngagement('f5', TURN - 9),
            ]),
            b1: brigade('b1', 'r1'),
            b3: brigade('b3', 'r3'),
            b5: brigade('b5', 'r5'),
        });
        run(state, [sector()]);

        expect(state.military.formations.b1.location_osid).toBe('f1');
        expect(state.military.formations.b3.location_osid).toBe('r3');
        expect(state.military.formations.b5.location_osid).toBe('r5');
        expect(orderTarget(state, 'b3')).toBeUndefined();
        expect(orderTarget(state, 'b5')).toBeUndefined();
    });

    it('G4: relieves the engagement cell, not the cell the credited defender stands on; friction is not contact', () => {
        const state = makeState({
            hist: historyCarrier([
                defenderEngagement('f1', TURN - 1),
                defenderEngagement('f6', TURN - 1, `${TURN - 1}:f6:friction:hist`),
            ], { status: 'active', location_osid: 'r4' }),
            b1: brigade('b1', 'r1'),
            b6: brigade('b6', 'r6'),
        });
        // Leave f4 (the credited defender's neighbourhood) and f6 (friction) empty too.
        run(state, [sector()]);

        expect(state.military.formations.b1.location_osid).toBe('f1');
        expect(state.military.formations.b6.location_osid).toBe('r6');
        expect(orderTarget(state, 'b6')).toBeUndefined();
    });

    it('G3: never relieves into a cell lost since the engagement', () => {
        const state = makeState({
            hist: historyCarrier([
                defenderEngagement('f1', TURN - 1),
                defenderEngagement('f3', TURN - 1),
            ]),
            b1: brigade('b1', 'r1'),
            b3: brigade('b3', 'r3'),
        });
        state.political.political_controllers.f1 = 'RBiH';
        run(state, [sector()]);

        expect(state.military.formations.b1.location_osid).toBe('r1');
        expect(orderTarget(state, 'b1')).toBeUndefined();
        expect(state.military.formations.b3.location_osid).toBe('f3');
    });

    it('G1: active-operation participants (any phase) and queued pre-planned brigades are never relief donors', () => {
        const def = _ALL_PRE_PLANNED.find((candidate) =>
            candidate.enqueue_from == null
            && candidate.prestage_from == null
            && candidate.axes.some((axis) => axis.brigades.length > 0));
        expect(def, 'a queued pre-planned definition with brigades').toBeDefined();
        const queuedId = def!.axes.find((axis) => axis.brigades.length > 0)!.brigades[0]!;
        const corps = def!.corps;
        const faction = def!.faction;
        const enemy = faction === 'RS' ? 'RBiH' : 'RS';

        const formations: Record<string, FormationState> = {
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)], { faction, corps_id: corps }),
            planner: brigade('planner', 'r1', { faction, corps_id: corps }),
            [queuedId]: brigade(queuedId, 'r2', { faction, corps_id: corps }),
            free: brigade('free', 'r3', { faction, corps_id: corps }),
        };
        const state = makeState(formations, {
            corps_command: {
                [corps]: {
                    active_operations: [{
                        id: 'op_probe', name: 'probe', type: 'probe', phase: 'planning',
                        participating_brigades: ['planner'],
                    }],
                    queued_operations: [def!.name],
                },
            },
        });
        state.political.political_controllers = controllers(faction, enemy);
        run(state, [sector({ corps_id: corps, faction, opposing_factions: [enemy] })]);

        expect(state.military.formations.planner.location_osid).toBe('r1');
        expect(orderTarget(state, 'planner')).toBeUndefined();
        expect(state.military.formations[queuedId].location_osid).toBe('r2');
        expect(orderTarget(state, queuedId)).toBeUndefined();
        expect(orderTarget(state, 'free')).toBe('f1');
    });

    it('never takes a donor standing on a must-hold cell, on loan, or digging in', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            must_hold: brigade('must_hold', 'r1'),
            loaned: brigade('loaned', 'r2', {
                elite_loan_state: { on_loan: true, loaned_to_corps: CORPS, loan_start_turn: 5 } as FormationState['elite_loan_state'],
            }),
            dug_in: brigade('dug_in', 'r3', { posture: 'dig_in' }),
            digging: brigade('digging', 'r4'),
            free: brigade('free', 'r5'),
        }, {
            must_hold_osids_by_corps: { [CORPS]: ['r1'] },
            brigade_posture_orders: [{ brigade_id: 'digging', posture: 'dig_in' }],
        });
        run(state, [sector()]);

        for (const id of ['must_hold', 'loaned', 'dug_in', 'digging']) {
            expect(orderTarget(state, id), id).toBeUndefined();
        }
        expect(state.military.formations.must_hold.location_osid).toBe('r1');
        expect(orderTarget(state, 'free')).toBe('f1');
    });

    it('keeps the existing donor guards: disrupted, in transit, already ordered, and home distance', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            disrupted: brigade('disrupted', 'r1', { disrupted_turns: 2 }),
            moving: brigade('moving', 'r2'),
            ordered: brigade('ordered', 'r3'),
            far_home: brigade('far_home', 'r4', { home_osid: 'r6' }),          // f1 is 6 hops from r6
            free: brigade('free', 'r5', { home_osid: 'r1' }),
        }, {
            brigade_movement_state: { moving: { status: 'in_transit', destination_sids: ['r6'] } },
        });
        state.military.brigade_movement_orders = { ordered: { destination_sids: ['r6'], stance: 'column' } };
        run(state, [sector()]);

        expect(state.military.formations.disrupted.location_osid).toBe('r1');
        expect(orderTarget(state, 'moving')).toBeUndefined();
        expect(orderTarget(state, 'ordered')).toBe('r6');
        expect(orderTarget(state, 'far_home')).toBeUndefined();
        expect(orderTarget(state, 'free')).toBe('f1');
    });

    it('sends one relief per cell at a time: a cell with a relief on the way is skipped', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1), defenderEngagement('f3', TURN - 1)]),
            en_route: brigade('en_route', 'r6'),
            b1: brigade('b1', 'r1'),
            b3: brigade('b3', 'r3'),
        });
        state.military.brigade_movement_orders = { en_route: { destination_sids: ['f1'], stance: 'column' } };
        run(state, [sector()]);

        expect(state.military.formations.b1.location_osid).toBe('r1');
        expect(orderTarget(state, 'b1')).toBeUndefined();
        expect(state.military.formations.b3.location_osid).toBe('f3');
    });

    it('a donor never leaves a contact cell, and a front donor must stand on a quiet cell with no contact neighbour', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1), defenderEngagement('f3', TURN - 1)]),
            on_contact: brigade('on_contact', 'f3', { personnel: 3000 }),
            next_to_contact: brigade('next_to_contact', 'f2', { personnel: 3000 }),
            quiet: brigade('quiet', 'f5'),
        });
        run(state, [sector()]);

        expect(state.military.formations.on_contact.location_osid).toBe('f3');
        expect(orderTarget(state, 'on_contact')).toBeUndefined();
        expect(state.military.formations.next_to_contact.location_osid).toBe('f2');
        expect(orderTarget(state, 'next_to_contact')).toBeUndefined();
        expect(orderTarget(state, 'quiet')).toBe('f1');
    });

    it('Phase A never unstacks a fresh brigade off a contact cell', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            s1: brigade('s1', 'f1', { entrenchment_turns: 0 }),
            s2: brigade('s2', 'f1', { entrenchment_turns: 0 }),
            s3: brigade('s3', 'f1', { entrenchment_turns: 6 }),
        });
        run(state, [sector({}, ['s1', 's2', 's3'])]);

        expect(['s1', 's2', 's3'].map((id) => state.military.formations[id].location_osid)).toEqual(['f1', 'f1', 'f1']);
    });

    it('a relief placed on a contact cell is not pulled off it by the later distribution passes', () => {
        // `near` is a primary of another sector (g-line); Phase B would march it there.
        const gSector = sector({
            sector_id: 'sector:vrs_test:1',
            territory_osids: ['g1', 'g2'],
            sub_segments: [{
                sub_segment_id: 'subseg:vrs_test:1',
                edge_ids: ['edge:g1:x1', 'edge:g2:x2'],
                friendly_osids: ['g1', 'g2'],
                enemy_osids: ['x1', 'x2'],
                length_edges: 2,
                primary_brigade_ids: ['near'],
            }],
            assigned_brigade_ids: ['near'],
        });
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            near: brigade('near', 'r1'),
        });
        Object.assign(state.political.political_controllers, { g1: 'RS', g2: 'RS', x1: 'RBiH', x2: 'RBiH' });
        state.military.corps_front_sectors = {};
        const adjacency = ladderAdjacency();
        for (const [a, b] of [['r1', 'g1'], ['g1', 'g2'], ['g1', 'x1'], ['g2', 'x2']] as const) {
            adjacency.set(a, [...(adjacency.get(a) ?? []), b].sort());
            adjacency.set(b, [...(adjacency.get(b) ?? []), a].sort());
        }
        const sectors = [sector(), gSector];
        state.military.corps_front_sectors = Object.fromEntries(sectors.map((s) => [s.sector_id, s]));
        distributeBrigadesToFront(state, sectors, adjacency);

        expect(state.military.formations.near.location_osid).toBe('f1');
        expect(orderTarget(state, 'near')).toBeUndefined();
    });
});

describe('D3 R2: a stronger brigade relieves an outpowered occupant', () => {
    it('marches in a candidate that outpowers the occupant as arrived; the occupant stays until the relief is on the cell (G2)', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 400, morale: 20, entrenchment_turns: 6 }),
            fresh: brigade('fresh', 'r3', { personnel: 2500, morale: 80 }),
        });
        run(state, [sector()]);

        expect(orderTarget(state, 'fresh')).toBe('f1');
        expect(state.military.formations.spent.location_osid).toBe('f1');
        expect(orderTarget(state, 'spent')).toBeUndefined();
    });

    it('an adjacent relief moves onto the cell, then the occupant takes the cell the relief vacated', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 400, morale: 20, entrenchment_turns: 6 }),
            fresh: brigade('fresh', 'r1', { personnel: 2500, morale: 80 }),
        });
        run(state, [sector()]);

        expect(state.military.formations.fresh.location_osid).toBe('f1');
        expect(state.military.formations.spent.location_osid).toBe('r1');
        expect(state.military.formations.spent.entrenchment_turns).toBe(0);
    });

    it('once both stand on the cell, the weaker leaves for the nearest vacant quiet front cell of its corps', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 400, morale: 20, entrenchment_turns: 6 }),
            arrived: brigade('arrived', 'f1', { personnel: 2500, morale: 80, entrenchment_turns: 1 }),
        });
        run(state, [sector()]);

        expect(state.military.formations.arrived.location_osid).toBe('f1');
        expect(state.military.formations.spent.location_osid).toBe('f2');
    });

    // Codex #826 r4655197592: the departing (weaker) occupant obeys the donor's movement guards.
    // A loaned brigade, one with posture dig_in, or one with a pending dig-in order never
    // moves for a relief; it stays and the cell keeps two defenders. A plain occupant still leaves.
    const heldInPlace: Array<[string, Partial<FormationState>, boolean]> = [
        ['loaned', { elite_loan_state: { on_loan: true, loaned_to_corps: CORPS, loan_start_turn: 5 } as FormationState['elite_loan_state'] }, false],
        ['dig_in posture', { posture: 'dig_in' }, false],
        ['pending dig-in order', {}, true],
    ];

    it.each(heldInPlace)('a %s occupant does not take the cell an adjacent relief vacated', (_label, overrides, pendingOrder) => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 400, morale: 20, entrenchment_turns: 6, ...overrides }),
            fresh: brigade('fresh', 'r1', { personnel: 2500, morale: 80 }),
        }, pendingOrder ? { brigade_posture_orders: [{ brigade_id: 'spent', posture: 'dig_in' }] } : {});
        run(state, [sector()]);

        expect(state.military.formations.fresh.location_osid).toBe('f1');
        expect(state.military.formations.spent.location_osid).toBe('f1');
        expect(orderTarget(state, 'spent')).toBeUndefined();
    });

    it.each(heldInPlace)('a %s occupant does not leave for a vacant quiet front cell once both stand on the cell', (_label, overrides, pendingOrder) => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 400, morale: 20, entrenchment_turns: 6, ...overrides }),
            arrived: brigade('arrived', 'f1', { personnel: 2500, morale: 80, entrenchment_turns: 1 }),
        }, pendingOrder ? { brigade_posture_orders: [{ brigade_id: 'spent', posture: 'dig_in' }] } : {});
        run(state, [sector()]);

        expect(state.military.formations.arrived.location_osid).toBe('f1');
        expect(state.military.formations.spent.location_osid).toBe('f1');
        expect(orderTarget(state, 'spent')).toBeUndefined();
    });

    it('is strict: a candidate weaker as arrived than the dug-in occupant does not displace it', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1), defenderEngagement('f5', TURN - 1)]),
            // Larger on paper, but at entrenchment 0 weaker than the dug-in occupant.
            dug_in_occupant: brigade('dug_in_occupant', 'f1', { personnel: 1000, entrenchment_turns: 12 }),
            paper_stronger: brigade('paper_stronger', 'r1', { personnel: 1050, home_osid: 'r1' }),
            // Positive control (home distance keeps each candidate on its own cell).
            weak_occupant: brigade('weak_occupant', 'f5', { personnel: 300, morale: 20 }),
            strong_candidate: brigade('strong_candidate', 'r5', { personnel: 2500, morale: 80, home_osid: 'r5' }),
        });
        run(state, [sector()]);

        expect(state.military.formations.dug_in_occupant.location_osid).toBe('f1');
        expect(state.military.formations.paper_stronger.location_osid).toBe('r1');
        expect(orderTarget(state, 'paper_stronger')).toBeUndefined();
        expect(state.military.formations.strong_candidate.location_osid).toBe('f5');
        expect(state.military.formations.weak_occupant.location_osid).toBe('r5');
    });

    it('is strict: an exactly equal candidate does not displace the occupant', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1), defenderEngagement('f5', TURN - 1)]),
            equal_occupant: brigade('equal_occupant', 'f1', { personnel: 1100, entrenchment_turns: 0 }),
            equal_candidate: brigade('equal_candidate', 'r1', { personnel: 1100, entrenchment_turns: 0, home_osid: 'r1' }),
            weak_occupant: brigade('weak_occupant', 'f5', { personnel: 300, morale: 20 }),
            strong_candidate: brigade('strong_candidate', 'r5', { personnel: 2500, morale: 80, home_osid: 'r5' }),
        });
        run(state, [sector()]);

        expect(state.military.formations.equal_occupant.location_osid).toBe('f1');
        expect(state.military.formations.equal_candidate.location_osid).toBe('r1');
        expect(state.military.formations.strong_candidate.location_osid).toBe('f5');
    });

    it('G1: never displaces an occupant in an operation (any phase), and a participant on the cell does not leave it', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1), defenderEngagement('f3', TURN - 1), defenderEngagement('f5', TURN - 1)]),
            op_occupant: brigade('op_occupant', 'f1', { personnel: 300, morale: 20 }),
            strong_1: brigade('strong_1', 'r1', { personnel: 2500, morale: 80 }),
            op_pair_weak: brigade('op_pair_weak', 'f3', { personnel: 300, morale: 20 }),
            pair_strong: brigade('pair_strong', 'f3', { personnel: 2500, morale: 80, entrenchment_turns: 1 }),
            weak_5: brigade('weak_5', 'f5', { personnel: 300, morale: 20 }),
            strong_5: brigade('strong_5', 'r5', { personnel: 2500, morale: 80 }),
        }, {
            corps_command: {
                [CORPS]: {
                    active_operations: [{
                        id: 'op_hold', name: 'hold', type: 'probe', phase: 'planning',
                        participating_brigades: ['op_occupant', 'op_pair_weak'],
                    }],
                },
            },
        });
        run(state, [sector()]);

        expect(state.military.formations.op_occupant.location_osid).toBe('f1');
        expect(state.military.formations.strong_1.location_osid).toBe('r1');
        expect(orderTarget(state, 'strong_1')).toBeUndefined();
        expect(state.military.formations.op_pair_weak.location_osid).toBe('f3');
        expect(state.military.formations.pair_strong.location_osid).toBe('f3');
        expect(state.military.formations.strong_5.location_osid).toBe('f5');
        expect(state.military.formations.weak_5.location_osid).toBe('r5');
    });

    it('does not oscillate: the relieved brigade does not swap back over the next five turns', () => {
        const state = makeState({
            hist: historyCarrier([defenderEngagement('f1', TURN - 1)]),
            spent: brigade('spent', 'f1', { personnel: 700, morale: 40, entrenchment_turns: 6 }),
            fresh: brigade('fresh', 'r1', { personnel: 2500, morale: 80 }),
        });
        const positions: string[] = [];
        for (let turn = TURN; turn < TURN + 5; turn++) {
            state.meta.turn = turn;
            // The cell keeps being attacked every turn.
            state.military.formations.hist.brigade_history.engagements.push(defenderEngagement('f1', turn - 1));
            run(state, [sector()]);
            positions.push(`${state.military.formations.fresh.location_osid}/${state.military.formations.spent.location_osid}`);
            for (const id of ['fresh', 'spent']) {
                const formation = state.military.formations[id];
                formation.entrenchment_turns = Math.min(12, (formation.entrenchment_turns ?? 0) + 1.2);
                formation.morale = Math.min(100, (formation.morale ?? 50) + 5);   // the relieved brigade recovers
            }
        }
        expect(positions).toEqual(['f1/r1', 'f1/r1', 'f1/r1', 'f1/r1', 'f1/r1']);
    });
});

describe('D3: the coverage passes respect "a donor never leaves a contact cell"', () => {
    function coverageSector(id: string, front: string[], assigned: string[], threat: number): CorpsFrontSector {
        const subSegment: CorpsFrontSubSegment = {
            sub_segment_id: `subseg:${id}`,
            edge_ids: front.map((osid, index) => `${id}:edge:${index}:${osid}`),
            friendly_osids: front,
            enemy_osids: front.map((_, index) => `${id}:enemy:${index}`),
            length_edges: front.length,
            primary_brigade_ids: [],
        };
        return {
            sector_id: id,
            corps_id: 'corps_a',
            faction: 'RS',
            opposing_factions: ['RBiH'],
            edge_ids: [...subSegment.edge_ids],
            sub_segments: [subSegment],
            length_edges: subSegment.length_edges,
            territory_osids: [...front],
            assigned_brigade_ids: [...assigned],
            reserve_brigade_ids: [],
            density: assigned.length / Math.max(1, subSegment.length_edges),
            threat_ratio: threat,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        } as CorpsFrontSector;
    }

    it('does not peel a front donor standing on a contact cell into a thin sibling sector', () => {
        const recipientFront = Array.from({ length: 17 }, (_, index) => `op:recipient:f${index + 1}`);
        const recipient = coverageSector('sector:corps_a:recipient', recipientFront, ['brig_recipient'], 4800);
        const donor = coverageSector('sector:corps_a:donor', ['op:donor:f1', 'op:donor:f2', 'op:donor:f3', 'op:donor:f4'],
            ['brig_front_a', 'brig_front_b', 'brig_front_c'], 40);

        const coverageBrigade = (id: string, location: string, personnel: number): FormationState => brigade(id, location, {
            corps_id: 'corps_a', home_osid: location, personnel, cohesion: 65, morale: 70, entrenchment_turns: 0,
        });
        const formations: Record<FormationId, FormationState> = {
            brig_recipient: coverageBrigade('brig_recipient', 'op:recipient:f1', 1200),
            brig_front_a: coverageBrigade('brig_front_a', 'op:donor:f1', 1200),
            brig_front_b: coverageBrigade('brig_front_b', 'op:donor:f2', 1100),
            brig_front_c: coverageBrigade('brig_front_c', 'op:donor:f3', 900),
        };
        // brig_front_a's cell was attacked last turn and is still held.
        formations.brig_recipient.brigade_history = {
            engagements: [defenderEngagement('op:donor:f1', TURN - 1)],
        } as FormationState['brigade_history'];

        const adjacency = makeAdjacency<Osid>([
            ['op:donor:f1', 'op:recipient:f2'],
            ['op:donor:f2', 'op:recipient:f3'],
            ['op:donor:f1', 'op:donor:f2'],
            ['op:donor:f2', 'op:donor:f3'],
            ['op:donor:f3', 'op:donor:f4'],
        ] as Array<[Osid, Osid]>);
        const friendlyOsids = new Set<string>([...recipient.territory_osids, ...donor.territory_osids]);
        const componentOf = new Map<string, number>([...friendlyOsids].map((osid) => [osid, 0] as const));
        const readState = {
            meta: { turn: TURN },
            political: { political_controllers: Object.fromEntries([...friendlyOsids].map((osid) => [osid, 'RS'])) },
            military: { formations },
            factions: [{ id: 'RS' }],
        } as unknown as SectorTopologyNarrowReadState;

        ensureMinimumSectorCoverage([recipient, donor], formations, adjacency, friendlyOsids, componentOf, readState);

        expect(formations.brig_front_a.location_osid).toBe('op:donor:f1');
        expect(donor.assigned_brigade_ids).toContain('brig_front_a');
        expect(formations.brig_front_b.location_osid).toBe('op:recipient:f3');
        expect(recipient.assigned_brigade_ids).toContain('brig_front_b');
    });
});
