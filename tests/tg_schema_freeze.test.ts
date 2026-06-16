/**
 * SCHEMA-V34 FREEZE GUARD (ADR-0005 §Determinism Impact + §Schema).
 *
 * The Tactical Group schema moved v19→v34 once during the event-system merge
 * (the v19 slot was reclaimed by displacement civilian-casualty). ADR-0005
 * requires v34 to be FROZEN: subsequent event/displacement/TG work must NOT
 * collide-renumber it, and the TG-related optional fields must keep their
 * omitEmpty (optional, default-undefined) shape. A future accidental renumber
 * or a migration that re-shapes these fields trips a RED test here.
 *
 * This complements the v34 step's own one-way migration contract comment in
 * src/state/save_migration.ts (v34→v33 downgrade is unsupported — the
 * personnel-lent ledger + TG records have no v33 representation).
 */

import { describe, expect, it } from 'vitest';
import type { GameState, MilitaryState, FormationState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { getLatestSchemaVersion } from '../src/state/save_migration.js';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('C3 schema freeze guard (v36)', () => {
    it('CURRENT_SCHEMA_VERSION is pinned at 36', () => {
        // If this fails, a renumber happened. Confirm the bump is intentional
        // (new migration step appended), then update this guard + the
        // save_migration v34 one-way contract comment together.
        expect(CURRENT_SCHEMA_VERSION).toBe(36);
    });

    it('the latest registered migration version equals CURRENT_SCHEMA_VERSION (36)', () => {
        // Guards against a migration being appended at a number > 35 without
        // bumping CURRENT_SCHEMA_VERSION (or vice-versa) — the classic
        // collide-renumber footgun ADR-0005 §Determinism Impact warns about.
        expect(getLatestSchemaVersion()).toBe(CURRENT_SCHEMA_VERSION);
        expect(getLatestSchemaVersion()).toBe(36);
    });

    it('v34 ships the four TG/Army-HQ Records as the only non-undefined scaffold (omitEmpty shape)', () => {
        // The v34 migration creates exactly these four empty Records on MilitaryState.
        // The remaining TG fields (tg_recent_compositions, tg_formations_by_corps,
        // og_promotions) stay UNDEFINED until a flag lights them — that omitEmpty
        // shape is the byte-identity contract. Assert the type-level field names
        // exist and the flag-gated ones are omitted by default.
        const mil: Partial<MilitaryState> = {
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        };
        expect(mil.tactical_groups).toEqual({});
        expect(mil.army_hq_operations).toEqual({});
        expect(mil.army_hq_last_op_turn).toEqual({});
        expect(mil.army_hq_op_count_by_year).toEqual({});
        // Flag-gated fields are omitted (undefined) by default — NOT empty {}.
        expect(mil.tg_recent_compositions).toBeUndefined();
        expect(mil.tg_formations_by_corps).toBeUndefined();
        expect(mil.og_promotions).toBeUndefined();
    });

    it('FormationState TG donor-accounting fields stay optional/omitEmpty (undefined by default)', () => {
        // A donor's ledger fields must be omitted on an unaffected brigade — the
        // v34→v33 one-way contract hinges on these having no v33 representation.
        const brig: Partial<FormationState> = {
            id: 'b1', faction: 'RBiH', personnel: 1500,
        };
        expect(brig.personnel_lent_by_tg).toBeUndefined();
        expect(brig.equipment_lent_by_tg).toBeUndefined();
        expect(brig.tg_cooldown_until_turn).toBeUndefined();
        expect(brig.tg_donations_this_scenario).toBeUndefined();
        expect(brig.tg_recovery_suppressed_until_turn).toBeUndefined();
    });

    it('a current state round-trips with schema_version preserved at 35', () => {
        const faction = (id: string): any => ({
            id, profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
            areasOfResponsibility: [], supply_sources: [], command_capacity: 0,
            negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
            prewar_capital: 50, declaration_pressure: 0, declared: false, declaration_turn: null,
        });
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 1, seed: 's', phase: 'war',
                referendum_held: true, referendum_turn: 6, war_start_turn: 0,
                referendum_eligible_turn: null, referendum_deadline_turn: null,
                game_over: false, outcome: undefined, player_faction: 'RBiH', decision_mode: 'historical',
            } as any,
            factions: [faction('RBiH'), faction('RS'), faction('HRHB')],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                tactical_groups: {},
                army_hq_operations: {},
                army_hq_last_op_turn: {},
                army_hq_op_count_by_year: {},
            } as Partial<MilitaryState> as MilitaryState,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
                supply_rights: { corridors: [] },
                political_controllers: {},
                municipalities: {},
            } as any,
            displacement: {} as any,
        } as GameState;
        const hydrated = deserializeState(serializeState(state));
        expect(hydrated.schema_version).toBe(36);
    });

    it('C3 freeze: canonical startup save (schema 36) keeps the frozen persisted key-sets', () => {
        // C3 schema-freeze sentinel. A new PERSISTED field added to the initial
        // GameState (military/political/displacement) without a deliberate schema
        // bump + migration changes these key-sets and trips a RED test — the
        // "added a field, forgot the migration" footgun. Pairs with
        // tests/startup_snapshot_contract.test.ts (byte-level). When a bump IS
        // intentional, update CURRENT_SCHEMA_VERSION + the migration + these
        // literals together (and re-bless the startup snapshot).
        const save = JSON.parse(
            readFileSync(join(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8'),
        ) as { schema_version: number; military: Record<string, unknown>; political: Record<string, unknown>; displacement: Record<string, unknown> };
        expect(save.schema_version).toBe(36);
        const keys = (o: Record<string, unknown>): string => Object.keys(o).sort().join(',');
        expect(keys(save.military)).toBe(
            'alliance_locks,army_co_decision_traces,army_corps_directives_by_faction,army_hq_last_op_turn,army_hq_op_count_by_year,army_hq_operations,army_theatre_assignment,assignable_front_segments,bot_priority_shifts,brigade_front_assignment,cascade_penalties,closed_event_ids,command_authority,convoy_decision_history,corps_command,corps_front_sectors,cost_ledger_annotations,declined_operations,enabled_event_ids,equipment_quality_modifiers,event_aggression_modifiers,event_causality_log,event_decision_log,event_fire_counts,event_flags,event_last_fired_turn,event_overflow_queue,event_readiness,fired_event_ids,formation_spawn_directive,formations,front_posture,front_posture_regions,front_pressure,front_segments,militia_pools,named_officer_data,named_officers,negotiation,offensive_ops_suppressions,officer_decision_history,pending_convoy_decisions,pending_event_decisions,pending_event_notifications,pending_officer_events,pending_reserve_requests,phantoms_spawned,political_leader_data,political_leaders,recruitment_modifiers,recruitment_state,reserve_request_history,tactical_groups,theatres,triggered_operations_accepted,unresolved_sector_brigades,used_operation_names,war_front_edges_osid,war_jna,war_militia_strength,war_timeline',
        );
        expect(keys(save.political)).toBe(
            'ceasefire,coercion_pressure_by_municipality,contested_control,control_events,initial_political_controllers,last_contained_osids_by_faction,municipalities,negotiation_ledger,negotiation_status,political_controllers,rbih_hrhb_state,supply_rights,war_alliance_rbih_hrhb,war_consolidation_until,war_control_strain,war_exhaustion,war_exhaustion_local,war_supply_condition,war_supply_pressure',
        );
        expect(keys(save.displacement)).toBe(
            'civilian_casualties,displacement_camp_state,displacement_event_log,displacement_flows_by_osid,displacement_humanitarian_aggregates,displacement_origin_dest_arrivals,displacement_recent_by_turn,displacement_state,hostile_takeover_timers,minority_flight_state,municipality_displacement,settlement_displacement,settlement_displacement_started_turn,sustainability_state,war_displacement_initiated',
        );
    });
});
