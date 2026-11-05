import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';
import type { CommanderOutput } from '../../src/sim/combat/commander/commander_state.js';
import { buildProbeOperation } from '../../src/sim/combat/corps_operation_helpers.js';
import {
    initializeNamedOfficers,
    releaseOperationCommander,
} from '../../src/sim/combat/officer_system.js';
import { tickPreparation } from '../../src/sim/combat/operation_preparation.js';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsOperation,
    type FormationId,
    type GameState,
    type MilitaryState,
} from '../../src/state/game_state.js';
import type { NamedOfficer } from '../../src/state/officer_types.js';
import { makeCommanderMinimalState } from '../_helpers/commander.js';

const FOURTH_CORPS = 'arbih_4th_corps' as FormationId;
const THIRD_CORPS = 'arbih_3rd_corps' as FormationId;
const S_DELIC = 'arbih_s_delic';
const HODZIC = 'arbih_hodzic';

function authoredOfficers(): NamedOfficer[] {
    const path = join(process.cwd(), 'data', 'scenarios', 'officers', 'apr1992_officers.json');
    const file = JSON.parse(readFileSync(path, 'utf8')) as { officers: NamedOfficer[] };
    return file.officers.filter((officer) => officer.id === S_DELIC || officer.id === HODZIC);
}

function formation(id: string, corpsId: FormationId, locationOsid?: string): any {
    return {
        id,
        name: id,
        faction: 'RBiH',
        corps_id: corpsId,
        kind: id === corpsId ? 'corps' : 'brigade',
        status: 'active',
        personnel: id === corpsId ? 0 : 1200,
        morale: 80,
        cohesion: 70,
        experience: 50,
        location_osid: locationOsid,
        created_turn: 0,
        assignment: null,
    };
}

function state(): GameState {
    const military: MilitaryState = {
        formations: {
            [FOURTH_CORPS]: formation(FOURTH_CORPS, FOURTH_CORPS),
            [THIRD_CORPS]: formation(THIRD_CORPS, THIRD_CORPS),
            arbih_4th_muslim_light: formation('arbih_4th_muslim_light', FOURTH_CORPS, 'op:konjic:konjic_2'),
            arbih_717th_slavna_mountain: formation('arbih_717th_slavna_mountain', THIRD_CORPS, 'op:donji_vakuf:prusac_2'),
            arbih_770th_slavna_mountain: formation('arbih_770th_slavna_mountain', THIRD_CORPS, 'op:novi_travnik:novi_travnik_2'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        theatres: {},
        army_theatre_assignment: {},
        corps_front_sectors: {},
        sector_intel: {},
        army_co_decision_traces: {},
        army_corps_directives_by_faction: {},
        fired_event_ids: [],
        event_decision_log: [],
        event_readiness: {},
        event_fire_counts: {},
        event_last_fired_turn: {},
        event_flags: {},
        enabled_event_ids: [],
        phantoms_spawned: [],
        brigade_movement_orders: {},
        corps_command: {
            [FOURTH_CORPS]: {
                command_span: 5, subordinate_count: 1, og_slots: 0, active_ogs: [],
                corps_exhaustion: 0, stance: 'offensive', active_operations: [],
            },
            [THIRD_CORPS]: {
                command_span: 5, subordinate_count: 2, og_slots: 0, active_ogs: [],
                corps_exhaustion: 0, stance: 'offensive', active_operations: [],
            },
        },
    };
    const result = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 178, phase: 'war', seed: 'probe-officer-preparation', autonomy_level: 0 },
        factions: [{ id: 'RBiH' }],
        military,
        political: {
            political_controllers: {}, war_consolidation_until: {}, war_control_strain: {},
            war_supply_pressure: {}, war_supply_condition: {}, war_exhaustion: {}, war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {}, hostile_takeover_timers: {}, displacement_camp_state: {},
            minority_flight_state: {}, displacement_event_log: [], sustainability_state: {},
            war_displacement_initiated: {}, settlement_displacement: {},
            settlement_displacement_started_turn: {}, municipality_displacement: {}, civilian_casualties: {},
            displacement_humanitarian_aggregates: {}, displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {}, displacement_flows_by_osid: {},
        },
    } as unknown as GameState;
    initializeNamedOfficers(result, authoredOfficers());
    return result;
}

function output(operation: CorpsOperation): CommanderOutput {
    return {
        directive: {
            assigned_front_ids: [], offensive_targets: [], hold_osids: [], avoid_osids: [],
            max_attackers_per_target: 1, reserve_fraction: 0, min_attack_outcome: 'stalemate', aggression_modifier: 0,
        },
        operations: [operation],
        sector_stances: [],
        updated_state: makeCommanderMinimalState({
            current_plan: null, last_assessment_turn: 178, last_plan_action: 'none', last_plan_reason: 'fixture',
        }),
        reinforcement_requests: [], prepositioning_orders: [], plan_updates: [], garrison_locks: [],
    };
}

function jajceRecovery(): CorpsOperation {
    // This is authored input at the admission boundary. The test exercises the
    // production admission and preparation initializers, not scenario generation.
    return {
        name: 'Operation Jajce Recovery',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 178,
        phase_started_turn: 178,
        planning_duration: 3,
        participating_brigades: ['arbih_717th_slavna_mountain', 'arbih_770th_slavna_mountain'],
        objectives: ['op:jajce:grdovo'],
        sector_id: `sector:${THIRD_CORPS}:3`,
    } as CorpsOperation;
}

function admit(state: GameState, corpsId: FormationId, operation: CorpsOperation): CorpsOperation {
    applyCommanderOutput(state, corpsId, output(operation));
    return state.military.corps_command![corpsId]!.active_operations.at(-1)!;
}

describe('4th Corps probe officer allocation -> Jajce preparation sequence', () => {
    it('uses the authored stronger reserve officer for Jajce and initializes the production preparation maximum to four', () => {
        const game = state();
        const authored = authoredOfficers();
        expect(authored.map(({ id, competence, aggressiveness }) => ({ id, competence, aggressiveness }))).toEqual([
            { id: S_DELIC, competence: 4, aggressiveness: 4 },
            { id: HODZIC, competence: 3, aggressiveness: 5 },
        ]);

        const jajce = admit(game, THIRD_CORPS, jajceRecovery());
        expect(jajce.commander_officer_id).toBe(S_DELIC);
        expect(game.military.named_officers![S_DELIC]).toMatchObject({
            status: 'active', assigned_operation: 'Operation Jajce Recovery',
        });
        expect(game.military.named_officers![HODZIC]!.status).toBe('reserve');

        tickPreparation(game, jajce, THIRD_CORPS, 'RBiH', 1);
        expect(jajce.preparation_max_turns).toBe(4);
        expect(jajce.preparation_turns_elapsed).toBe(1);

        releaseOperationCommander(game, jajce);
        expect(game.military.named_officers![S_DELIC]).toMatchObject({ status: 'reserve' });
        expect(game.military.named_officers![S_DELIC]!.assigned_operation).toBeUndefined();
    });

    it('admits a real 4th Corps probe first, preserving its officer while Jajce receives Hodzic and initializes to three', () => {
        const game = state();
        const probe = admit(game, FOURTH_CORPS, buildProbeOperation(
            FOURTH_CORPS,
            178,
            'arbih_4th_muslim_light' as FormationId,
            `sector:${FOURTH_CORPS}:0`,
            ['op:konjic:bijela_2'],
        ));
        expect(probe).toMatchObject({
            name: 'probe_arbih_4th_corps_t178', type: 'probe', commander_officer_id: S_DELIC,
        });

        const jajce = admit(game, THIRD_CORPS, jajceRecovery());
        expect(jajce.commander_officer_id).toBe(HODZIC);
        expect(game.military.named_officers![S_DELIC]).toMatchObject({
            status: 'active', assigned_operation: 'probe_arbih_4th_corps_t178',
        });
        expect(game.military.named_officers![HODZIC]).toMatchObject({
            status: 'active', assigned_operation: 'Operation Jajce Recovery',
        });

        tickPreparation(game, jajce, THIRD_CORPS, 'RBiH', 1);
        expect(jajce.preparation_max_turns).toBe(3);
        expect(jajce.preparation_turns_elapsed).toBe(1);

        releaseOperationCommander(game, jajce);
        expect(game.military.named_officers![HODZIC]!.status).toBe('reserve');
        expect(game.military.named_officers![S_DELIC]).toMatchObject({
            status: 'active', assigned_operation: 'probe_arbih_4th_corps_t178',
        });
        releaseOperationCommander(game, probe);
        expect(game.military.named_officers![S_DELIC]!.status).toBe('reserve');
        expect(game.military.named_officers![S_DELIC]!.assigned_operation).toBeUndefined();
    });
});
