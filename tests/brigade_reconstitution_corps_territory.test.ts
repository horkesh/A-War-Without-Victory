/**
 * Tests for the same-corps territory gate in `findRefugeeMunicipality`.
 *
 * Regression context (n1582 → n1585 long-run believability packet, 2026-04-30):
 * After RBiH captured Foča/Čajniče/Višegrad/Kalinovik, vrs_herzegovina and
 * vrs_drina brigades were:
 *   1. flagged stranded by `stranded_brigade_lifecycle` (BFS to same-corps front
 *      sector territory failed),
 *   2. collapsed (cohesion ≤ 10 or 12+ turn hold) → status=inactive, lifecycle=destroyed,
 *   3. reconstituted 5 turns later via `brigade_reconstitution.ts` Path B at
 *      `op:banja_luka:banja_luka_2` because Banja Luka was the largest RS
 *      displacement-receiving municipality with adequate pool.
 *
 * The reconstituted brigade kept its original corps_id (vrs_herzegovina /
 * vrs_drina) but now physically sat inside vrs_1st_krajina sector territory,
 * breaking sector ownership and producing artifactual cross-corps drift. The
 * downstream consequence was the Goražde siege erosion (4 → 1 brigades near
 * target) plus the RS late-war morale-collapse cluster amplification.
 *
 * The fix in `findRefugeeMunicipality` adds a same-corps territory gate: refugee
 * placement must land within an OSID owned by the brigade's own corps via
 * `corps_front_sectors[*].territory_osids`. If no candidate qualifies, the
 * brigade stays destroyed (historically accurate when corps territory is fully
 * overrun — corps disband, units do not teleport to a foreign corps's HQ).
 */

import { describe, it, expect } from 'vitest';
import { reconstituteBrigades, RECONSTITUTION_DELAY_TURNS, RECONSTITUTION_MIN_POOL } from '../src/sim/combat/brigade_reconstitution.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

// ─── Test state builder ─────────────────────────────────────────────────────

interface Opts {
    /** Corps ID for the destroyed brigade. Default: vrs_herzegovina. */
    corpsId?: string;
    /** Add own-corps sector territory at the placement OSIDs in this list. */
    sameCorpsTerritory?: string[];
    /** Add a vrs_1st_krajina sector that owns banja_luka territory (the artifact destination). */
    addBanjaLukaForeignSector?: boolean;
    /** Override homeOsid controller. Default: RBiH (home lost → forces Path B). */
    homeOsidController?: string;
    /** Add an additional refugee-target muni and its arrivals + pool. */
    refugeeMuni?: { mun: string; osid: string; arrivals: number; pool: number };
}

function buildState(opts: Opts = {}): GameState {
    const corpsId = opts.corpsId ?? 'vrs_herzegovina';
    const turn = 110;
    const destroyed: FormationState = {
        id: 'rs_test_brigade',
        name: 'Test Brigade',
        faction: 'RS',
        kind: 'brigade',
        status: 'inactive',
        lifecycle_status: 'destroyed',
        personnel: 0,
        cohesion: 0,
        morale: 0,
        max_personnel: 2000,
        location_osid: 'op:cajnice:cajnice_2',
        home_osid: 'op:cajnice:cajnice_2',
        origin_mun: 'cajnice',
        corps_id: corpsId,
        destruction_turn: turn - RECONSTITUTION_DELAY_TURNS - 1,
        composition: {
            infantry: 0, tanks: 0, artillery: 0, aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
        readiness: 'forming',
        officer_quality: 0.4,
    } as unknown as FormationState;

    const political_controllers: Record<string, string> = {
        // Home OSID lost to RBiH (forces Path B refugee placement)
        'op:cajnice:cajnice_2': opts.homeOsidController ?? 'RBiH',
        // Banja Luka — RS-controlled, the artifact destination
        'op:banja_luka:banja_luka_2': 'RS',
        'op:banja_luka:dragocaj': 'RS',
    };
    if (opts.sameCorpsTerritory) {
        for (const osid of opts.sameCorpsTerritory) political_controllers[osid] = 'RS';
    }
    if (opts.refugeeMuni) {
        political_controllers[opts.refugeeMuni.osid] = 'RS';
    }

    const corps_front_sectors: Record<string, any> = {};
    if (opts.sameCorpsTerritory && opts.sameCorpsTerritory.length > 0) {
        corps_front_sectors[`sector:${corpsId}:0`] = {
            id: `sector:${corpsId}:0`,
            corps_id: corpsId,
            faction: 'RS',
            territory_osids: opts.sameCorpsTerritory,
            front_edges: [],
            sub_segments: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
        };
    }
    if (opts.addBanjaLukaForeignSector) {
        corps_front_sectors['sector:vrs_1st_krajina:0'] = {
            id: 'sector:vrs_1st_krajina:0',
            corps_id: 'vrs_1st_krajina',
            faction: 'RS',
            territory_osids: ['op:banja_luka:banja_luka_2', 'op:banja_luka:dragocaj'],
            front_edges: [],
            sub_segments: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
        };
    }

    const arrivalsBanjaLuka = 5000;
    const arrivalsRefugee = opts.refugeeMuni?.arrivals ?? 0;

    const displacement_event_log = [
        // The artifact pull: cajnice → banja_luka, large arrivals
        {
            turn: 95, origin_mun: 'cajnice', dest_mun: 'banja_luka',
            ethnicity: 'RS', displaced: arrivalsBanjaLuka, killed: 0, fled_abroad: 0, settled: arrivalsBanjaLuka,
        },
    ];
    if (opts.refugeeMuni) {
        displacement_event_log.push({
            turn: 95, origin_mun: 'cajnice', dest_mun: opts.refugeeMuni.mun,
            ethnicity: 'RS', displaced: arrivalsRefugee, killed: 0, fled_abroad: 0, settled: arrivalsRefugee,
        });
    }

    const militia_pools: Record<string, any> = {
        [militiaPoolKey('banja_luka' as any, 'RS')]: { mun_id: 'banja_luka', faction: 'RS', available: 5000, committed: 0, exhausted: false, updated_turn: turn - 1 },
    };
    if (opts.refugeeMuni) {
        militia_pools[militiaPoolKey(opts.refugeeMuni.mun as any, 'RS')] = { mun_id: opts.refugeeMuni.mun, faction: 'RS', available: opts.refugeeMuni.pool, committed: 0, exhausted: false, updated_turn: turn - 1 };
    }

    return {
        meta: { turn, phase: 'war', seed: 'recon-test' } as unknown as GameState['meta'],
        military: {
            formations: { rs_test_brigade: destroyed },
            militia_pools,
            corps_front_sectors,
            corps_command: { [corpsId]: { active_operations: [] } } as any,
            strategic_reserves: { RBiH: 0, RS: 0, HRHB: 0 },
        } as any,
        political: {
            political_controllers,
        } as any,
        displacement: {
            displacement_event_log,
        } as any,
    } as unknown as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('brigade_reconstitution: same-corps territory gate', () => {
    it('REGRESSION: refuses to reconstitute a vrs_herzegovina brigade at op:banja_luka:banja_luka_2 (foreign corps territory)', () => {
        // The classic n1585 artifact: home (cajnice) lost to RBiH; banja_luka is
        // the largest displacement-receiving RS muni; banja_luka is in
        // vrs_1st_krajina territory. The fix must refuse this placement.
        const state = buildState({
            corpsId: 'vrs_herzegovina',
            // No same-corps territory exists — corps territory has been fully overrun
            sameCorpsTerritory: undefined,
            // Banja Luka is foreign-corps territory
            addBanjaLukaForeignSector: true,
        });

        const before = state.military.formations!.rs_test_brigade!;
        expect(before.status).toBe('inactive');
        expect(before.lifecycle_status).toBe('destroyed');

        const report = reconstituteBrigades(state);

        expect(report.reconstituted_count).toBe(0);
        const after = state.military.formations!.rs_test_brigade!;
        // Brigade stays destroyed — historically accurate when corps territory is gone
        expect(after.status).toBe('inactive');
        expect(after.lifecycle_status).toBe('destroyed');
        // Brigade did NOT teleport to banja_luka
        expect(after.location_osid).not.toBe('op:banja_luka:banja_luka_2');
    });

    it('refuses banja_luka placement even when own-corps territory exists ELSEWHERE (own-corps gate, not just territory existence)', () => {
        // vrs_herzegovina still owns trebinje, but no displacement evidence cajnice→trebinje
        // (only cajnice→banja_luka). Banja Luka is foreign-corps. The gate must still
        // refuse banja_luka — because it's not in vrs_herzegovina territory — even though
        // vrs_herzegovina has territory somewhere else.
        const state = buildState({
            corpsId: 'vrs_herzegovina',
            sameCorpsTerritory: ['op:trebinje:trebinje_2'],
            addBanjaLukaForeignSector: true,
        });
        // No refugeeMuni → only banja_luka is in displacement_event_log

        const report = reconstituteBrigades(state);

        expect(report.reconstituted_count).toBe(0);
        const after = state.military.formations!.rs_test_brigade!;
        expect(after.location_osid).not.toBe('op:banja_luka:banja_luka_2');
    });

    it('ALLOWS reconstitution at a same-corps territory muni when displacement evidence supports it (Srebrenica→Tuzla pattern)', () => {
        // Positive case: vrs_herzegovina still owns trebinje; cajnice population
        // displaced to trebinje (smaller than banja_luka but valid). The gate must
        // pick trebinje (own corps) and skip banja_luka (foreign corps).
        const state = buildState({
            corpsId: 'vrs_herzegovina',
            sameCorpsTerritory: ['op:trebinje:trebinje_2'],
            refugeeMuni: { mun: 'trebinje', osid: 'op:trebinje:trebinje_2', arrivals: 1000, pool: 1000 },
            addBanjaLukaForeignSector: true,
        });

        const report = reconstituteBrigades(state);

        expect(report.reconstituted_count).toBe(1);
        const after = state.military.formations!.rs_test_brigade!;
        expect(after.location_osid).toBe('op:trebinje:trebinje_2');
        expect(after.status).toBe('active');
    });

    it('REGRESSION: mixed municipality — alphabetically first friendly OSID is foreign-corps, later one is same-corps; same-corps OSID is selected', () => {
        // Codex review finding: the prior implementation called
        // findFriendlyOsidInMunicipality (returns alphabetically first friendly
        // OSID), then applied the territory gate. In a mixed municipality where
        // the first friendly OSID is foreign-corps and a later friendly OSID is
        // same-corps, that produced a false negative — the candidate was
        // rejected even though a valid same-corps OSID existed in the same muni.
        //
        // The fix moves the territory gate into OSID-selection time (filter,
        // then sort, then pick first qualifying OSID). This test forces the
        // alphabetical foreign-corps OSID to come first; reconstitution must
        // succeed at the later same-corps OSID.
        const turn = 110;
        const destroyed = {
            id: 'rs_test_brigade', name: 'Test Brigade', faction: 'RS', kind: 'brigade',
            status: 'inactive', lifecycle_status: 'destroyed',
            personnel: 0, cohesion: 0, morale: 0, max_personnel: 2000,
            location_osid: 'op:cajnice:cajnice_2', home_osid: 'op:cajnice:cajnice_2',
            origin_mun: 'cajnice', corps_id: 'vrs_herzegovina',
            destruction_turn: turn - 6,
            composition: {
                infantry: 0, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
            },
            readiness: 'forming', officer_quality: 0.4,
        } as unknown as FormationState;

        const state = {
            meta: { turn, phase: 'war', seed: 'mixed-mun-test' } as any,
            military: {
                formations: { rs_test_brigade: destroyed },
                militia_pools: {
                    [militiaPoolKey('mostar' as any, 'RS')]: {
                        mun_id: 'mostar', faction: 'RS', available: 5000, committed: 0,
                        exhausted: false, updated_turn: turn - 1,
                    },
                },
                corps_front_sectors: {
                    // vrs_herzegovina sector owns ONLY the alphabetically LATER OSID
                    'sector:vrs_herzegovina:0': {
                        id: 'sector:vrs_herzegovina:0',
                        corps_id: 'vrs_herzegovina', faction: 'RS',
                        territory_osids: ['op:mostar:zzzz_own_corps_2'],
                        front_edges: [], sub_segments: [],
                        assigned_brigade_ids: [], reserve_brigade_ids: [],
                    },
                    // foreign-corps sector owns the alphabetically FIRST OSID
                    'sector:vrs_1st_krajina:0': {
                        id: 'sector:vrs_1st_krajina:0',
                        corps_id: 'vrs_1st_krajina', faction: 'RS',
                        territory_osids: ['op:mostar:aaaa_foreign_corps_2'],
                        front_edges: [], sub_segments: [],
                        assigned_brigade_ids: [], reserve_brigade_ids: [],
                    },
                },
                corps_command: { vrs_herzegovina: { active_operations: [] } } as any,
                strategic_reserves: { RBiH: 0, RS: 0, HRHB: 0 },
            } as any,
            political: {
                political_controllers: {
                    // Home OSID lost — forces Path B
                    'op:cajnice:cajnice_2': 'RBiH',
                    // Mixed mun: both friendly RS OSIDs
                    'op:mostar:aaaa_foreign_corps_2': 'RS',
                    'op:mostar:zzzz_own_corps_2': 'RS',
                },
            } as any,
            displacement: {
                displacement_event_log: [
                    {
                        turn: 95, origin_mun: 'cajnice', dest_mun: 'mostar',
                        ethnicity: 'RS', displaced: 1000, killed: 0, fled_abroad: 0, settled: 1000,
                    },
                ],
            } as any,
        } as unknown as GameState;

        // Sanity: confirm the alphabetical ordering of the two friendly OSIDs
        // in this muni puts the foreign-corps OSID first. If this fails, the
        // test is no longer exercising the false-negative case.
        const sortedFriendly = ['op:mostar:aaaa_foreign_corps_2', 'op:mostar:zzzz_own_corps_2'].sort();
        expect(sortedFriendly[0]).toBe('op:mostar:aaaa_foreign_corps_2');

        const report = reconstituteBrigades(state);

        expect(report.reconstituted_count).toBe(1);
        const after = state.military.formations!.rs_test_brigade!;
        // Must select the same-corps OSID, not the foreign-corps OSID, even
        // though the foreign-corps OSID is alphabetically first.
        expect(after.location_osid).toBe('op:mostar:zzzz_own_corps_2');
        expect(after.location_osid).not.toBe('op:mostar:aaaa_foreign_corps_2');
        expect(after.status).toBe('active');
    });

    it('PRESERVES Path A: home OSID still controlled with adequate pool reconstitutes at home (no behavior change)', () => {
        // Home OSID still RS-controlled — Path A applies, gate is irrelevant.
        const state = buildState({
            corpsId: 'vrs_herzegovina',
            homeOsidController: 'RS',
            // Add home pool
            sameCorpsTerritory: ['op:cajnice:cajnice_2'],
        });
        // Add militia pool for cajnice (home muni)
        state.military.militia_pools![militiaPoolKey('cajnice' as any, 'RS')] = {
            mun_id: 'cajnice', faction: 'RS', available: 5000, committed: 0, exhausted: false, updated_turn: state.meta!.turn! - 1,
        } as any;

        const report = reconstituteBrigades(state);

        expect(report.reconstituted_count).toBe(1);
        const after = state.military.formations!.rs_test_brigade!;
        // Reconstituted in home muni, NOT banja_luka
        expect(after.location_osid).toBe('op:cajnice:cajnice_2');
        expect(after.status).toBe('active');
    });
});
