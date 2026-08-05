/**
 * Verify that hvo_central_bosnia gets sectors when HRHB-RBiH fronts appear.
 *
 * Currently hvo_central_bosnia has 0 sectors because HRHB and RBiH are allies —
 * no front edges exist between them. When the alliance drops below 0.20
 * (mobilizing), front edges should appear and the sector partition system
 * should create sectors for hvo_central_bosnia brigades at Kiseljak/Vitez OSIDs.
 */
import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { computeFrontEdgesOsid } from '../src/map/front_edges.js';
import { CURRENT_SCHEMA_VERSION, type FactionId, type FormationState, type GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'HRHB' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        ...overrides,
    } as FormationState;
}

/**
 * Minimal state with:
 *  - HRHB faction: hvo_central_bosnia corps + 3 brigades at Kiseljak/Vitez OSIDs
 *  - RBiH faction: arbih_3rd_corps + 1 brigade at adjacent OSIDs
 *  - Alliance below 0.20 (not allied)
 *  - HRHB-RBiH OSID front edges pre-computed
 */
function makeState(alliance: number): GameState {
    // Synthetic OSIDs: hrhb controls kiseljak_1, kiseljak_2, vitez_1
    // RBiH controls fojnica_1, fojnica_2, busovaca_rbih_1
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 30,
            seed: 'hvo-central-bosnia-sectors',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
            rbih_hrhb_war_earliest_turn: 26,
        } as GameState['meta'],
        factions: [
            { id: 'HRHB' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as unknown as GameState['factions'],
        military: {
            formations: {
                // HRHB corps
                hvo_central_bosnia: makeFormation('hvo_central_bosnia', {
                    kind: 'corps',
                    faction: 'HRHB' as FactionId,
                    location_osid: 'op:kiseljak:kiseljak_1',
                    personnel: 50,
                }),
                hvo_main_staff: makeFormation('hvo_main_staff', {
                    kind: 'corps',
                    faction: 'HRHB' as FactionId,
                    location_osid: 'op:kiseljak:kiseljak_1',
                    personnel: 50,
                }),
                // HRHB brigades at Kiseljak/Vitez
                hvo_ban_jelacic: makeFormation('hvo_ban_jelacic', {
                    faction: 'HRHB' as FactionId,
                    corps_id: 'hvo_central_bosnia',
                    location_osid: 'op:kiseljak:kiseljak_1',
                }),
                hvo_viteska: makeFormation('hvo_viteska', {
                    faction: 'HRHB' as FactionId,
                    corps_id: 'hvo_central_bosnia',
                    location_osid: 'op:vitez:vitez_1',
                }),
                hvo_nikola_subic: makeFormation('hvo_nikola_subic', {
                    faction: 'HRHB' as FactionId,
                    corps_id: 'hvo_central_bosnia',
                    location_osid: 'op:kiseljak:kiseljak_2',
                }),
                // RBiH corps
                arbih_3rd_corps: makeFormation('arbih_3rd_corps', {
                    kind: 'corps',
                    faction: 'RBiH' as FactionId,
                    location_osid: 'op:fojnica:fojnica_1',
                    personnel: 50,
                }),
                arbih_general_staff: makeFormation('arbih_general_staff', {
                    kind: 'corps',
                    faction: 'RBiH' as FactionId,
                    location_osid: 'op:fojnica:fojnica_1',
                    personnel: 50,
                }),
                // RBiH brigade
                arbih_317th: makeFormation('arbih_317th', {
                    faction: 'RBiH' as FactionId,
                    corps_id: 'arbih_3rd_corps',
                    location_osid: 'op:fojnica:fojnica_1',
                }),
            },
            war_front_edges_osid: [
                // HRHB-RBiH front edges: kiseljak_1↔fojnica_1, kiseljak_2↔fojnica_2, vitez_1↔busovaca_rbih_1
                { edge_id: 'op:fojnica:fojnica_1__op:kiseljak:kiseljak_1', a: 'op:fojnica:fojnica_1', b: 'op:kiseljak:kiseljak_1', side_a: 'RBiH', side_b: 'HRHB' },
                { edge_id: 'op:fojnica:fojnica_2__op:kiseljak:kiseljak_2', a: 'op:fojnica:fojnica_2', b: 'op:kiseljak:kiseljak_2', side_a: 'RBiH', side_b: 'HRHB' },
                { edge_id: 'op:busovaca:busovaca_rbih_1__op:vitez:vitez_1', a: 'op:busovaca:busovaca_rbih_1', b: 'op:vitez:vitez_1', side_a: 'RBiH', side_b: 'HRHB' },
                { edge_id: 'op:fojnica:fojnica_1__op:kiseljak:kiseljak_2', a: 'op:fojnica:fojnica_1', b: 'op:kiseljak:kiseljak_2', side_a: 'RBiH', side_b: 'HRHB' },
                { edge_id: 'op:busovaca:busovaca_rbih_1__op:kiseljak:kiseljak_1', a: 'op:busovaca:busovaca_rbih_1', b: 'op:kiseljak:kiseljak_1', side_a: 'RBiH', side_b: 'HRHB' },
            ],
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
            corps_front_sectors: {},
            sector_intel: {},
        } as GameState['military'],
        political: {
            political_controllers: {
                'op:kiseljak:kiseljak_1': 'HRHB',
                'op:kiseljak:kiseljak_2': 'HRHB',
                'op:vitez:vitez_1': 'HRHB',
                'op:fojnica:fojnica_1': 'RBiH',
                'op:fojnica:fojnica_2': 'RBiH',
                'op:busovaca:busovaca_rbih_1': 'RBiH',
            },
            war_alliance_rbih_hrhb: alliance,
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;
    return state;
}

/**
 * Build EdgeRecord array that matches the OSID topology.
 * Includes both cross-faction edges (front) and same-faction internal edges.
 */
function makeEdges(): EdgeRecord[] {
    return [
        // Internal HRHB edges
        { a: 'op:kiseljak:kiseljak_1', b: 'op:kiseljak:kiseljak_2' },
        { a: 'op:kiseljak:kiseljak_1', b: 'op:vitez:vitez_1' },
        { a: 'op:kiseljak:kiseljak_2', b: 'op:vitez:vitez_1' },
        // Internal RBiH edges
        { a: 'op:fojnica:fojnica_1', b: 'op:fojnica:fojnica_2' },
        { a: 'op:fojnica:fojnica_1', b: 'op:busovaca:busovaca_rbih_1' },
        // Cross-faction edges (HRHB-RBiH front)
        { a: 'op:kiseljak:kiseljak_1', b: 'op:fojnica:fojnica_1' },
        { a: 'op:kiseljak:kiseljak_2', b: 'op:fojnica:fojnica_2' },
        { a: 'op:vitez:vitez_1', b: 'op:busovaca:busovaca_rbih_1' },
        { a: 'op:kiseljak:kiseljak_2', b: 'op:fojnica:fojnica_1' },
        { a: 'op:kiseljak:kiseljak_1', b: 'op:busovaca:busovaca_rbih_1' },
    ] as EdgeRecord[];
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('hvo_central_bosnia gets sectors when HRHB-RBiH fronts appear', () => {
    it('produces at least 1 sector for hvo_central_bosnia when alliance < 0.20', () => {
        const state = makeState(0.10); // alliance below 0.20 → not allied
        const edges = makeEdges();

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const hvoCBSectors = Object.values(sectors).filter(
            s => s.corps_id === 'hvo_central_bosnia'
        );

        expect(hvoCBSectors.length).toBeGreaterThanOrEqual(1);

        // At least some brigades are assigned
        const assignedBrigades = hvoCBSectors.flatMap(s => s.assigned_brigade_ids);
        expect(assignedBrigades.length).toBeGreaterThan(0);

        // All assigned brigades belong to hvo_central_bosnia
        const hvoBrigadeIds = ['hvo_ban_jelacic', 'hvo_viteska', 'hvo_nikola_subic'];
        for (const bid of assignedBrigades) {
            expect(hvoBrigadeIds).toContain(bid);
        }
    });

    it('produces 0 sectors for hvo_central_bosnia when alliance > 0.20 (still allied)', () => {
        const state = makeState(0.50); // alliance above 0.20 → allied
        // When allied, war_front_edges_osid should have no HRHB-RBiH edges.
        // Simulate: re-derive front edges from scratch (no HRHB-RBiH edges).
        state.military.war_front_edges_osid = [];

        const edges = makeEdges();
        const sectors = buildCorpsFrontSectors(state, edges, null);
        const hvoCBSectors = Object.values(sectors).filter(
            s => s.corps_id === 'hvo_central_bosnia'
        );

        expect(hvoCBSectors.length).toBe(0);
    });

    it('computeFrontEdgesOsid includes HRHB-RBiH edges when not allied and past earliest turn', () => {
        const state = makeState(0.10);
        const edges = makeEdges();

        const frontEdges = computeFrontEdgesOsid(state, edges, new Map());
        const hrhbRbihEdges = frontEdges.filter(
            e =>
                (e.side_a === 'HRHB' && e.side_b === 'RBiH') ||
                (e.side_a === 'RBiH' && e.side_b === 'HRHB')
        );

        expect(hrhbRbihEdges.length).toBeGreaterThan(0);
    });

    it('computeFrontEdgesOsid excludes HRHB-RBiH edges when still allied', () => {
        const state = makeState(0.50); // above threshold
        const edges = makeEdges();

        const frontEdges = computeFrontEdgesOsid(state, edges, new Map());
        const hrhbRbihEdges = frontEdges.filter(
            e =>
                (e.side_a === 'HRHB' && e.side_b === 'RBiH') ||
                (e.side_a === 'RBiH' && e.side_b === 'HRHB')
        );

        expect(hrhbRbihEdges.length).toBe(0);
    });

    it('computeFrontEdgesOsid excludes HRHB-RBiH edges before earliest war turn', () => {
        const state = makeState(0.10); // below threshold BUT before earliest turn
        state.meta.turn = 20; // before rbih_hrhb_war_earliest_turn=26
        const edges = makeEdges();

        const frontEdges = computeFrontEdgesOsid(state, edges, new Map());
        const hrhbRbihEdges = frontEdges.filter(
            e =>
                (e.side_a === 'HRHB' && e.side_b === 'RBiH') ||
                (e.side_a === 'RBiH' && e.side_b === 'HRHB')
        );

        expect(hrhbRbihEdges.length).toBe(0);
    });

    it('RBiH also gets sectors against HRHB (arbih_3rd_corps)', () => {
        const state = makeState(0.10);
        const edges = makeEdges();

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const rbihSectors = Object.values(sectors).filter(
            s => s.corps_id === 'arbih_3rd_corps'
        );

        expect(rbihSectors.length).toBeGreaterThanOrEqual(1);

        // Check opposing faction is HRHB
        for (const sector of rbihSectors) {
            expect(sector.opposing_factions).toContain('HRHB');
        }
    });
});
