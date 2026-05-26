import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';

function migrationFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5,
            seed: 'migration-fixture',
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: null,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            peace_war_start_control_path: null,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            player_faction: 'RBiH',
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
            {
                id: 'RS',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            theatres: {},
            army_theatre_assignment: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            minority_flight_state: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            sustainability_state: {},
            civilian_casualties: {},
        },
        ...overrides,
    };
}

describe('nested migration ownership contracts', () => {
    it('migrateState canonicalizes nested military and political owner fields directly', () => {
        const payload = JSON.stringify(migrationFixture({
        military: {
            formations: {},
            front_segments: {},
            front_posture: { ARBiH: { assignments: {} } },
            front_posture_regions: { ARBiH: { assignments: {} } },
            front_pressure: {},
            militia_pools: {
                'mun1:ARBiH': {
                    mun_id: 'mun1',
                    faction: 'ARBiH',
                    available: 1,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 0,
                },
            },
            theatres: {},
            army_theatre_assignment: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [
                { id: 'n2', faction_id: 'RS', turn: 2, type: 'gain', amount: 2, reason: 'y' },
                { id: 'n1', faction_id: 'ARBiH', turn: 1, type: 'spend', amount: 1, reason: 'x' },
            ],
            supply_rights: {
                corridors: [
                    { id: 'c2', treaty_id: 't2', beneficiary: 'ARBiH', scope: { kind: 'region', region_id: 'r2' }, since_turn: 2, until_turn: null },
                    { id: 'c1', treaty_id: 't1', beneficiary: 'RS', scope: { kind: 'region', region_id: 'r1' }, since_turn: 1, until_turn: null },
                ],
            },
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        }));

        const hydrated = deserializeState(payload);

        expect(Object.keys(hydrated.military.front_posture)).toEqual(['RBiH']);
        expect(Object.keys(hydrated.military.front_posture_regions)).toEqual(['RBiH']);

        const militiaPool = hydrated.military.militia_pools['mun1:ARBiH'] as any;
        expect(militiaPool.faction).toBe('RBiH');
        expect(militiaPool.fatigue).toBe(0);

        expect(hydrated.political.negotiation_ledger?.map((entry: any) => entry.faction_id)).toEqual(['RS', 'RBiH']);
        expect(
            hydrated.political.supply_rights?.corridors.map((corridor: any) => `${corridor.id}:${corridor.beneficiary}`)
        ).toEqual(['c1:RS', 'c2:RBiH']);
    });

    it('migrateState materializes missing nested Phase I sibling defaults at the canonical owners', () => {
        const payload = JSON.stringify(migrationFixture({
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            theatres: {},
            army_theatre_assignment: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            war_militia_strength: { m1: { RBiH: 10 } },
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
        },
        political: {
            political_controllers: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            war_consolidation_until: { m1: 3 },
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            minority_flight_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            war_displacement_initiated: { m1: 4 },
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            sustainability_state: {},
            civilian_casualties: {},
        },
        }));

        const hydrated = deserializeState(payload);

        expect(hydrated.military.war_militia_strength).toEqual({ m1: { RBiH: 10 } });
        expect(hydrated.political.war_consolidation_until).toEqual({ m1: 3 });
        expect(hydrated.displacement.war_displacement_initiated).toEqual({ m1: 4 });
        expect(hydrated.political.war_control_strain).toEqual({});
        expect(hydrated.military.war_jna).toEqual({
            transition_begun: false,
            withdrawal_progress: 0,
            asset_transfer_rs: 0,
        });
    });

    it('migrateState materializes missing nested Phase F sibling defaults under displacement', () => {
        const payload = JSON.stringify(migrationFixture({
        schema_version: 15,
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            settlement_displacement: { SID_001: 0.25 },
        },
        }));

        const hydrated = deserializeState(payload);

        expect(hydrated.displacement.settlement_displacement).toEqual({ SID_001: 0.25 });
        expect(hydrated.displacement.settlement_displacement_started_turn).toEqual({});
        expect(hydrated.displacement.municipality_displacement).toEqual({});
    });

    it('migrateState rescues legacy top-level residue into nested owners before defaulting', () => {
        const payload = JSON.stringify({
            ...migrationFixture({
                schema_version: 15,
                political: {
                    political_controllers: {},
                    negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                    ceasefire: {},
                    municipalities: {},
                    war_consolidation_until: {},
                    war_control_strain: {},
                    war_supply_pressure: {},
                    war_supply_condition: {},
                    war_exhaustion: {},
                    war_exhaustion_local: {},
                },
                displacement: {
                    displacement_event_log: [],
                    displacement_humanitarian_aggregates: {},
                    displacement_origin_dest_arrivals: {},
                    displacement_recent_by_turn: {},
                },
            }),
            negotiation_ledger: [
                { id: 'n1', faction_id: 'ARBiH', turn: 1, type: 'spend', amount: 1, reason: 'x' },
            ],
            supply_rights: {
                corridors: [
                    { id: 'c1', treaty_id: 't1', beneficiary: 'ARBiH', scope: { kind: 'region', region_id: 'r1' }, since_turn: 1, until_turn: null },
                ],
            },
            settlement_displacement: { SID_009: 0.4 },
            municipality_displacement: { mun9: 0.2 },
        });

        const hydrated = deserializeState(payload) as any;

        expect(hydrated.political.negotiation_ledger.map((entry: any) => entry.faction_id)).toEqual(['RBiH']);
        expect(hydrated.political.supply_rights.corridors.map((corridor: any) => corridor.beneficiary)).toEqual(['RBiH']);
        expect(hydrated.displacement.settlement_displacement).toEqual({ SID_009: 0.4 });
        expect(hydrated.displacement.municipality_displacement).toEqual({ mun9: 0.2 });
        expect(Object.prototype.hasOwnProperty.call(hydrated, 'negotiation_ledger')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(hydrated, 'supply_rights')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(hydrated, 'settlement_displacement')).toBe(false);
    });

    it('migrateState preserves pre-v18 top-level displacement lazy-map rescue but not v18 residue repair', () => {
        const legacyPayload = JSON.stringify({
            ...migrationFixture({
                schema_version: 17,
                displacement: {
                    displacement_event_log: [],
                    displacement_humanitarian_aggregates: {},
                    displacement_origin_dest_arrivals: {},
                    displacement_recent_by_turn: {},
                    settlement_displacement: {},
                    settlement_displacement_started_turn: {},
                    municipality_displacement: {},
                    war_displacement_initiated: {},
                    hostile_takeover_timers: {},
                    displacement_camp_state: {},
                },
            }),
            displacement_state: { legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 } },
            minority_flight_state: { legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 } },
            sustainability_state: { legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false } },
        });

        const hydratedLegacy = deserializeState(legacyPayload) as any;

        expect(hydratedLegacy.displacement.displacement_state).toEqual({
            legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 },
        });
        expect(hydratedLegacy.displacement.minority_flight_state).toEqual({
            legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 },
        });
        expect(hydratedLegacy.displacement.sustainability_state).toEqual({
            legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false },
        });
        expect(Object.prototype.hasOwnProperty.call(hydratedLegacy, 'displacement_state')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(hydratedLegacy, 'minority_flight_state')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(hydratedLegacy, 'sustainability_state')).toBe(false);

        const currentPayload = JSON.stringify({
            ...migrationFixture({
                schema_version: CURRENT_SCHEMA_VERSION,
                displacement: {
                    displacement_event_log: [],
                    displacement_humanitarian_aggregates: {},
                    displacement_origin_dest_arrivals: {},
                    displacement_recent_by_turn: {},
                    settlement_displacement: {},
                    settlement_displacement_started_turn: {},
                    municipality_displacement: {},
                    war_displacement_initiated: {},
                    hostile_takeover_timers: {},
                    displacement_camp_state: {},
                },
            }),
            displacement_state: { legacy_mun: { original_population: 10, displaced_out: 0, displaced_in: 0, lost_population: 0 } },
            minority_flight_state: { legacy_sid: { settlement_id: 'legacy_sid', flight_turn: 1 } },
            sustainability_state: { legacy_mun: { mun_id: 'legacy_mun', sustainability_score: 1, collapsed: false } },
        });

        expect(() => deserializeState(currentPayload)).toThrow(
            /Save schema validation failed after migration[\s\S]*v18[\s\S]*displacement\.displacement_state/
        );
    });
});
