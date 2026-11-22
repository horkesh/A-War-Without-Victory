/**
 * Parity pin for relief-donor legality (lane C batch 2, item 9, accepted as FINAL).
 *
 * Ruling: "Relief-donor legality is checked at three sites with deliberate differences
 * (own-pool narrowing in the commander, prestage participants and D3 contact-cell refusal
 * in the sector layer); a parity test pins them."
 *
 * The three sites, each driven through its exported entry point (src is untouched):
 *   COMMANDER  computeEmptySectorReliefReassignments   (commander/decide.ts)
 *              legal  <=> the donor is named for the empty sector.
 *   PREDICATE  isSectorUnstaffableByFaction via annotateUnstaffedFrontSectors
 *              (corps_front_sectors.ts)  legal <=> the empty sector is NOT flagged unstaffed_front
 *              when this brigade is the only candidate donor.
 *   RESCUE     the zero-assigned rescue donor filter inside ensureMinimumSectorCoverage
 *              (brigade_assignment.ts, isZeroAssignedRescueEligible)
 *              legal <=> an own reserve brigade of a frontless sector is promoted onto its front.
 *
 * Shared rules (all three agree): a plain idle own brigade is legal; a brigade on an active
 * operation, on loan, under a movement order, in transit or disrupted is refused.
 * Deliberate differences (each pinned both ways):
 *   - own-pool narrowing: COMMANDER only. A frontless sector that lists an own rear brigade is
 *     served from that rear alone, never from a foreign line brigade; PREDICATE counts any legal donor.
 *   - prestage participants (queued dated pre-planned op heads): refused by PREDICATE and RESCUE
 *     (sector layer, buildOperationParticipantSet), legal for COMMANDER (participating_brigades only).
 *   - D3 contact-cell refusal (defender engagement on a still-held cell inside the recapture
 *     window): RESCUE only.
 * Also observed and pinned (not named in the ruling): a dug-in brigade is a legal relief donor for
 * COMMANDER and PREDICATE (package P2 step 1) but refused by RESCUE.
 */
import { describe, expect, it } from 'vitest';

import { ensureMinimumSectorCoverage } from '../src/sim/combat/brigade_assignment.js';
import { computeEmptySectorReliefReassignments } from '../src/sim/combat/commander/decide.js';
import { annotateUnstaffedFrontSectors } from '../src/sim/combat/corps_front_sectors.js';

const CORPS = 'vrs_herzegovina';
const FACTION = 'RS';
const TURN = 60;
// Head of vrs_herzegovina's queue: enqueue_from 58, brigade rs_gacko_brigade on its axis.
const PRESTAGE_OP = 'Lukavac 93 — TG Kalinovik';
const PRESTAGE_BRIGADE = 'rs_gacko_brigade';
const DONOR = 'donor_b';

const D1 = 'op:t:donor_front';
const MID = 'op:t:mid';
const EF = 'op:t:empty_front';
const ALL_CELLS = [D1, MID, EF];

function adjacencyOf(chain: string[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (let i = 0; i < chain.length - 1; i++) {
        adj.set(chain[i]!, [...(adj.get(chain[i]!) ?? []), chain[i + 1]!]);
        adj.set(chain[i + 1]!, [...(adj.get(chain[i + 1]!) ?? []), chain[i]!]);
    }
    return adj;
}
const ADJ = adjacencyOf([D1, MID, EF]);

function makeSector(id: string, front: string, b: { assigned?: string[]; reserve?: string[]; rear?: string[] } = {}): any {
    const edge = `${id}:edge`;
    return {
        sector_id: id,
        corps_id: CORPS,
        faction: FACTION,
        opposing_factions: ['RBiH'],
        edge_ids: [edge],
        length_edges: 1,
        territory_osids: [front],
        assigned_brigade_ids: b.assigned ?? [],
        reserve_brigade_ids: b.reserve ?? [],
        rear_brigade_ids: b.rear ?? [],
        sub_segments: [{
            sub_segment_id: `${id}:sub`,
            edge_ids: [edge],
            friendly_osids: [front],
            enemy_osids: [`${front}:enemy`],
            primary_brigade_ids: b.assigned ?? [],
            length_edges: 1,
        }],
        density: 0,
        threat_ratio: 2,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeBrigade(id: string, location: string): any {
    return {
        id,
        name: id,
        kind: 'brigade',
        faction: FACTION,
        status: 'active',
        readiness: 'active',
        created_turn: 1,
        assignment: null,
        corps_id: CORPS,
        location_osid: location,
        home_osid: location,
        personnel: 900,
        cohesion: 70,
        morale: 75,
        disrupted_turns: 0,
    };
}

function makeState(formations: Record<string, any>, sectors: any[]): any {
    const controllers: Record<string, string> = {};
    for (const cell of ALL_CELLS) controllers[cell] = FACTION;
    return {
        meta: { turn: TURN, phase: 'war' },
        factions: [{ id: FACTION }],
        political: { political_controllers: controllers },
        military: {
            formations,
            corps_front_sectors: Object.fromEntries(sectors.map((s) => [s.sector_id, s])),
            corps_command: {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
            brigade_posture_orders: [],
        },
    };
}

function briefingOf(state: any, sectors: any[], formations: Record<string, any>): any {
    return {
        corps_id: CORPS,
        faction: FACTION,
        turn: TURN,
        sectors,
        brigades: Object.values(formations),
        state_ref: state,
        must_hold_osids: [],
        spatial: {
            adjacency: ADJ,
            friendlyOsidsByFaction: new Map([[FACTION, new Set(ALL_CELLS)]]),
            componentsByFaction: new Map(),
        },
    };
}

function annotate(sectors: any[], state: any, formations: Record<string, any>): void {
    annotateUnstaffedFrontSectors(
        Object.fromEntries(sectors.map((s) => [s.sector_id, s])),
        state,
        formations,
        ADJ as any,
    );
}

/** A condition applied to the donor candidate and the shared state. */
interface Case {
    name: string;
    apply: (brigade: any, state: any) => void;
}

const CASES = {
    plain: { name: 'plain idle own brigade', apply: () => undefined } as Case,
    activeOp: {
        name: 'on an active operation',
        apply: (b, s) => {
            s.military.corps_command[CORPS] = {
                active_operations: [{ type: 'attack', phase: 'execution', participating_brigades: [b.id] }],
            };
        },
    } as Case,
    loaned: { name: 'on elite loan', apply: (b) => { b.elite_loan_state = { on_loan: true, loaned_to_corps: 'other_corps' }; } } as Case,
    ordered: {
        name: 'under a movement order',
        apply: (b, s) => { s.military.brigade_movement_orders[b.id] = { destination_sids: ['op:t:elsewhere'] }; },
    } as Case,
    inTransit: {
        name: 'in transit',
        apply: (b, s) => { s.military.brigade_movement_state[b.id] = { status: 'in_transit' }; },
    } as Case,
    disrupted: { name: 'disrupted', apply: (b) => { b.disrupted_turns = 2; } } as Case,
    dugIn: { name: 'dug in', apply: (b) => { b.posture = 'dig_in'; } } as Case,
    contact: {
        name: 'standing on a D3 contact cell',
        apply: (b, s) => {
            b.brigade_history = { engagements: [{ turn: TURN - 3, osid: b.location_osid, role: 'defender', battle_id: 'b:1' }] };
            s.political.political_controllers[b.location_osid] = FACTION;
        },
    } as Case,
    staleContact: {
        name: 'defender engagement outside the recapture window',
        apply: (b, s) => {
            b.brigade_history = { engagements: [{ turn: TURN - 20, osid: b.location_osid, role: 'defender', battle_id: 'b:1' }] };
            s.political.political_controllers[b.location_osid] = FACTION;
        },
    } as Case,
};

/** Prestage-held: the brigade id is on the axis of the queued head of its corps queue. */
const prestageApply: Case['apply'] = (_b, s) => {
    s.military.corps_command[CORPS] = { queued_operations: [PRESTAGE_OP] };
};

/** Candidate donor is the rear brigade of donor sector D; sector E (no pool) is empty. */
function commanderLegal(c: Case, donorId = DONOR): boolean {
    const donor = makeBrigade(donorId, D1);
    const formations: Record<string, any> = { [donorId]: donor };
    const sectors = [makeSector('sector:d', D1, { rear: [donorId] }), makeSector('sector:e', EF)];
    const state = makeState(formations, sectors);
    c.apply(donor, state);
    const out = computeEmptySectorReliefReassignments(briefingOf(state, sectors, formations));
    return out.some((r) => r.brigade_id === donorId && r.to_sector_id === 'sector:e');
}

/** Legal <=> the empty sector is not flagged unstaffed although this is the only candidate donor. */
function predicateLegal(c: Case, donorId = DONOR): boolean {
    const donor = makeBrigade(donorId, D1);
    const formations: Record<string, any> = { [donorId]: donor };
    const sectors = [makeSector('sector:d', D1, { rear: [donorId] }), makeSector('sector:e', EF)];
    const state = makeState(formations, sectors);
    c.apply(donor, state);
    annotate(sectors, state, formations);
    return sectors[1]!.unstaffed_front !== true;
}

/** Frontless sector Z lists the candidate as its own reserve, one hop from its front cell. */
function rescueLegal(c: Case, donorId = DONOR): boolean {
    const donor = makeBrigade(donorId, MID);
    const formations: Record<string, any> = { [donorId]: donor };
    const zero = makeSector('sector:z', EF, { reserve: [donorId] });
    const state = makeState(formations, [zero]);
    c.apply(donor, state);
    const components = new Map(ALL_CELLS.map((cell) => [cell, 0] as [string, number]));
    ensureMinimumSectorCoverage([zero], formations, ADJ as any, new Set(ALL_CELLS), components, state);
    return zero.assigned_brigade_ids.includes(donorId);
}

describe('relief-donor legality parity (commander / unstaffable predicate / zero-assigned rescue)', () => {
    it('sanity: the plain brigade is legal at all three sites (non-vacuous fixtures)', () => {
        expect(commanderLegal(CASES.plain)).toBe(true);
        expect(predicateLegal(CASES.plain)).toBe(true);
        expect(rescueLegal(CASES.plain)).toBe(true);
    });

    describe('shared rules: all three sites agree', () => {
        for (const key of ['activeOp', 'loaned', 'ordered', 'inTransit', 'disrupted'] as const) {
            it(`refuses a donor ${CASES[key].name} at all three sites`, () => {
                expect(commanderLegal(CASES[key]), 'commander').toBe(false);
                expect(predicateLegal(CASES[key]), 'predicate (empty sector flagged unstaffed)').toBe(false);
                expect(rescueLegal(CASES[key]), 'rescue').toBe(false);
            });
        }
    });

    describe('deliberate difference: prestage participants (sector layer only)', () => {
        const prestage: Case = { name: 'prestage participant', apply: prestageApply };

        it('COMMANDER treats a prestage-held brigade as a legal donor (participating_brigades only)', () => {
            expect(commanderLegal(prestage, PRESTAGE_BRIGADE)).toBe(true);
        });
        it('PREDICATE refuses it (control: the same brigade without the queued op is legal)', () => {
            expect(predicateLegal(prestage, PRESTAGE_BRIGADE)).toBe(false);
            expect(predicateLegal(CASES.plain, PRESTAGE_BRIGADE)).toBe(true);
        });
        it('RESCUE refuses it (control: the same brigade without the queued op is promoted)', () => {
            expect(rescueLegal(prestage, PRESTAGE_BRIGADE)).toBe(false);
            expect(rescueLegal(CASES.plain, PRESTAGE_BRIGADE)).toBe(true);
        });
    });

    describe('deliberate difference: D3 contact-cell refusal (RESCUE only)', () => {
        it('COMMANDER and PREDICATE still treat a brigade on a contact cell as a legal donor', () => {
            expect(commanderLegal(CASES.contact)).toBe(true);
            expect(predicateLegal(CASES.contact)).toBe(true);
        });
        it('RESCUE refuses it (control: a stale engagement is not a contact)', () => {
            expect(rescueLegal(CASES.contact)).toBe(false);
            expect(rescueLegal(CASES.staleContact)).toBe(true);
        });
    });

    describe('observed (not named in the ruling): dug-in donors', () => {
        it('COMMANDER and PREDICATE accept a dug-in donor (package P2 step 1); RESCUE refuses it', () => {
            expect(commanderLegal(CASES.dugIn)).toBe(true);
            expect(predicateLegal(CASES.dugIn)).toBe(true);
            expect(rescueLegal(CASES.dugIn)).toBe(false);
        });
    });

    describe('deliberate difference: own-pool narrowing (COMMANDER only)', () => {
        /**
         * Sector E is frontless and lists an own rear brigade `own_r`. A foreign sector D holds a
         * plainly legal rear brigade `foreign_f`. `own_r` is on an operation unless `ownRearLegal`.
         */
        function ownPoolScenario(ownRearLegal: boolean) {
            const formations: Record<string, any> = {
                foreign_f: makeBrigade('foreign_f', D1),
                own_r: makeBrigade('own_r', MID),
            };
            const sectors = [
                makeSector('sector:d', D1, { rear: ['foreign_f'] }),
                makeSector('sector:e', EF, { rear: ['own_r'] }),
            ];
            const state = makeState(formations, sectors);
            if (!ownRearLegal) {
                state.military.corps_command[CORPS] = {
                    active_operations: [{ type: 'attack', phase: 'execution', participating_brigades: ['own_r'] }],
                };
            }
            return { formations, sectors, state };
        }

        it('COMMANDER never borrows the foreign brigade while the sector lists an own pool (nobody is sent)', () => {
            const f = ownPoolScenario(false);
            expect(computeEmptySectorReliefReassignments(briefingOf(f.state, f.sectors, f.formations))).toEqual([]);
        });

        it('PREDICATE counts any legal donor: the same sector is NOT flagged unstaffed (drift (a), item 10)', () => {
            const f = ownPoolScenario(false);
            annotate(f.sectors, f.state, f.formations);
            expect(f.sectors[1]!.unstaffed_front).not.toBe(true);
        });

        it('with a legal own rear the COMMANDER serves it from the own rear alone, not the foreign brigade', () => {
            const f = ownPoolScenario(true);
            const out = computeEmptySectorReliefReassignments(briefingOf(f.state, f.sectors, f.formations));
            expect(out.map((r) => r.brigade_id)).toEqual(['own_r']);
        });

        it('control: without an own pool the COMMANDER does borrow the foreign brigade', () => {
            const formations: Record<string, any> = { foreign_f: makeBrigade('foreign_f', D1) };
            const sectors = [makeSector('sector:d', D1, { rear: ['foreign_f'] }), makeSector('sector:e', EF)];
            const state = makeState(formations, sectors);
            const out = computeEmptySectorReliefReassignments(briefingOf(state, sectors, formations));
            expect(out.map((r) => r.brigade_id)).toEqual(['foreign_f']);
        });
    });
});
