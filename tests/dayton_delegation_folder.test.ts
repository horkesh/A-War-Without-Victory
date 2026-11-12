/**
 * Delegation folder (DC amendment A1): the campaign's receipt on the Dayton table.
 * Built from state for the player's faction only; states what the war cost after each
 * refused plan without claiming the refusal caused it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState } from '../src/state/game_state.js';
import { buildDelegationFolder } from '../src/sim/negotiation/delegation_folder.js';
import { initiateDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { derivePendingDayton } from '../src/ui/map/data/GameStateAdapter.js';

const painted = JSON.parse(readFileSync(resolve(process.cwd(), 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;

function battle(turn: number, cas: number) {
    return { osid: `op:x:${turn}`, attacker_faction: 'RS', defender_faction: 'RBiH', primary_attacker_id: 'a', primary_defender_id: 'd',
        all_attacker_ids: ['a'], outcome: 'held', attacker_casualties: cas, defender_casualties: cas, territory_flipped: false, was_concentrated: false };
}

function summary(turn: number, net: Record<string, number>, cas: number, displaced: number) {
    return { turn, battles: [battle(turn, cas)], territory_net: net, notable_flips: [], displacement_total: displaced,
        displacement_by_ethnicity: {}, decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
        supply_deltas: {}, heavy_munitions_deltas: {} };
}

function makeState(player: 'RBiH' | 'RS' | 'HRHB' | null = 'RBiH', mode?: string): GameState {
    // Summaries are stored newest first, as the briefing step writes them.
    const summaries = [
        summary(3, { RBiH: -10, RS: 10 }, 100, 1000),
        summary(2, { RBiH: -5, RS: 5 }, 50, 500),
        summary(1, { RBiH: 4, RS: -4 }, 25, 250),
    ];
    return {
        meta: { turn: 3, war_start_turn: 0, phase: 'war', seed: 1, date: '1992-04-27', game_over: false, ...(player ? { player_faction: player } : {}),
            ...(mode ? { decision_mode: mode } : {}) },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            casualty_ledger: { RBiH: { killed: 2500 }, RS: { killed: 1000 }, HRHB: { killed: 500 } },
            negotiation: {
                capital: {
                    RBiH: { territory_controlled_pct: 30, enclaves_held: ['srebrenica', 'gorazde'], enclaves_lost: ['zepa'], peace_plans_accepted: [], peace_plans_rejected: [],
                        civilian_casualties_caused: 0, war_crimes_events: 0 },
                    RS: { territory_controlled_pct: 50, enclaves_held: [], enclaves_lost: [], peace_plans_accepted: [], peace_plans_rejected: [] },
                },
                patron_relationships: {
                    RBiH: { patron_id: 'international_community', support_level: 50, override_authority: 80, sanctions_active: false, relationship_events: [] },
                    RS: { patron_id: 'serbia', support_level: 50, override_authority: 20, sanctions_active: false, relationship_events: [] },
                },
                peace_plan_history: [
                    { plan_id: 'cutileiro', turn_offered: 0, responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }, resolved: true },
                    { plan_id: 'vance_owen', turn_offered: 1, responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, resolved: true,
                        resolved_turn: 1, dead_at_resolution: { military: 1000, civilian: 200 } },
                    { plan_id: 'owen_stoltenberg', turn_offered: 2, responses: { RBiH: 'rejected', RS: 'rejected', HRHB: 'accepted' }, resolved: true },
                    { plan_id: 'contact_group', turn_offered: 3, responses: { RBiH: 'accepted', RS: 'pending', HRHB: 'accepted' }, resolved: false },
                ],
            },
        },
        political: { political_controllers: { ...painted } },
        displacement: { civilian_casualties: { RBiH: { killed: 600 }, RS: { killed: 200 }, HRHB: { killed: 100 } } },
        turn_summaries: summaries,
    } as unknown as GameState;
}

describe('buildDelegationFolder', () => {
    it('is built for the player only and absent without a player faction', () => {
        expect(buildDelegationFolder(makeState(null))).toBeUndefined();
        expect(buildDelegationFolder(makeState('RS'))?.faction).toBe('RS');
    });

    it('counts settlements now and reconstructs the height of the war from the per-turn deltas', () => {
        const folder = buildDelegationFolder(makeState('RBiH'))!;
        const held = Object.values(painted).filter(v => v === 'RBiH').length;
        expect(folder.settlements.held).toBe(held);
        expect(folder.settlements.total).toBe(Object.keys(painted).length);
        // Start = held + 11 (net -11 over the war); after turn 1 the count was start + 4.
        expect(folder.settlements.peak).toBe(held + 15);
        expect(folder.settlements.peak_turn).toBe(1);
    });

    it('reports enclaves and the patron against the force threshold', () => {
        const folder = buildDelegationFolder(makeState('RBiH'))!;
        expect(folder.enclaves).toEqual({ held: ['gorazde', 'srebrenica'], lost: ['zepa'] });
        expect(folder.patron).toEqual({ override_authority: 80, force_threshold: 75, can_force: true });
        expect(buildDelegationFolder(makeState('RS'))!.patron.can_force).toBe(false);
    });

    it('lists refused catalog plans in order with the cost of the weeks after each, and skips removed or unresolved plans', () => {
        const folder = buildDelegationFolder(makeState('RBiH'))!;
        expect(folder.refused_plans.map(p => p.plan_id)).toEqual(['vance_owen', 'owen_stoltenberg']);
        const [vo, os] = folder.refused_plans;
        expect(vo!.refused_by).toEqual(['RS']);
        expect(vo!.player_answer).toBe('accepted');
        expect(vo!.proposed_split).toEqual({ RBiH: 32, RS: 43, HRHB: 25 });
        // Stamped at the answer (turn 1): 1,000 soldiers and 200 civilians dead then; now 4,000 and 900.
        expect(vo!.dead_since).toEqual({ military: 3000, civilian: 700 });
        // Displaced in turns after 1: 500 + 1,000.
        expect(vo!.displaced_since).toBe(1500);
        expect(vo!.weeks_since).toBe(2);
        expect(os!.refused_by).toEqual(['RBiH', 'RS']);
        // An older save without the stamp: the dead are not invented.
        expect(os!.dead_since).toBeNull();
        expect(os!.displaced_since).toBe(1000);
        // Totals come from the Verdict's sources, not battle tallies.
        expect(folder.war).toEqual({ weeks: 3, dead: { military: 4000, civilian: 900 }, displaced: 1750 });
    });

    it('carries the condemnation the verdict would apply (none in historical mode)', () => {
        expect(buildDelegationFolder(makeState('RBiH'))!.condemnation).toEqual([]);
    });

    it('is deterministic', () => {
        expect(buildDelegationFolder(makeState('RBiH'))).toEqual(buildDelegationFolder(makeState('RBiH')));
    });
});

describe('the folder rides on the pending Dayton packet', () => {
    it('initiateDaytonNegotiation attaches it and the read model passes it to the renderer for the player', () => {
        const state = makeState('RBiH');
        const packet = initiateDaytonNegotiation(state);
        expect(packet.delegation_folder?.faction).toBe('RBiH');
        state.military.negotiation!.pending_dayton = packet;
        expect(derivePendingDayton(state)?.delegationFolder?.faction).toBe('RBiH');
    });

    it('drops a folder that belongs to another faction, and an older packet simply has none', () => {
        const state = makeState('RBiH');
        const packet = initiateDaytonNegotiation(state);
        state.military.negotiation!.pending_dayton = { ...packet, delegation_folder: { ...packet.delegation_folder!, faction: 'RS' } };
        expect(derivePendingDayton(state)?.delegationFolder).toBeUndefined();
        const { delegation_folder: _omit, ...older } = packet;
        state.military.negotiation!.pending_dayton = older;
        expect(derivePendingDayton(state)?.delegationFolder).toBeUndefined();
    });
});
