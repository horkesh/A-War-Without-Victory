import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

const require = createRequire(import.meta.url);
const { fileOfficerDecisionRecord } = require('../src/desktop/officer_decision_history.cjs') as {
  fileOfficerDecisionRecord: (
    state: any,
    event: any,
    decision: 'acknowledged' | 'override_confirmed' | 'replacement_accepted',
    details?: Record<string, unknown>,
  ) => void;
};

describe('desktop officer decision history', () => {
  it('files officer acknowledgements into deterministic persisted history', () => {
    const state: any = { military: {} };
    const event = {
      event_id: 'evt-b',
      type: 'order_pushback',
      faction: 'RS',
      turn: 8,
      officer_id: 'commander_b',
      corps_id: 'vrs_drina_corps',
    };

    fileOfficerDecisionRecord(state, event, 'acknowledged');

    expect(state.military.officer_decision_history).toEqual([
      {
        id: 'officer:8:evt-b:acknowledged',
        turn: 8,
        faction: 'RS',
        event_id: 'evt-b',
        event_type: 'order_pushback',
        officer_id: 'commander_b',
        corps_id: 'vrs_drina_corps',
        decision: 'acknowledged',
      },
    ]);
  });

  it('dedupes and sorts replacement decisions by turn then id', () => {
    const state: any = {
      military: {
        officer_decision_history: [
          {
            id: 'officer:10:evt-z:acknowledged',
            turn: 10,
            faction: 'RS',
            event_id: 'evt-z',
            event_type: 'order_modified',
            officer_id: 'commander_z',
            decision: 'acknowledged',
          },
        ],
      },
    };
    const event = {
      event_id: 'evt-a',
      type: 'replacement_suggested',
      faction: 'RS',
      turn: 9,
      officer_id: 'new_commander',
      current_commander_id: 'old_commander',
      corps_id: 'vrs_drina_corps',
    };

    fileOfficerDecisionRecord(state, event, 'replacement_accepted', {
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
    });
    fileOfficerDecisionRecord(state, event, 'replacement_accepted', {
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
    });

    expect(state.military.officer_decision_history).toEqual([
      expect.objectContaining({ id: 'officer:9:evt-a:replacement_accepted' }),
      expect.objectContaining({ id: 'officer:10:evt-z:acknowledged' }),
    ]);
    expect(state.military.officer_decision_history[0]).toMatchObject({
      current_commander_id: 'old_commander',
      new_officer_id: 'new_commander',
      outgoing_officer_id: 'old_commander',
      matter_key: 'replacement:old_commander:vrs_drina_corps:new_commander',
    });
  });

  it('dedupes turn-stamped replacement events by stable matter identity', () => {
    const state: any = { military: {} };
    const baseEvent = {
      type: 'replacement_suggested',
      faction: 'RS',
      officer_id: 'new_commander',
      current_commander_id: 'old_commander',
      corps_id: 'vrs_drina_corps',
    };

    fileOfficerDecisionRecord(state, {
      ...baseEvent,
      event_id: 'replacement_old_commander_t18',
      turn: 18,
    }, 'acknowledged');
    fileOfficerDecisionRecord(state, {
      ...baseEvent,
      event_id: 'replacement_old_commander_t19',
      turn: 19,
    }, 'acknowledged');

    expect(state.military.officer_decision_history).toHaveLength(1);
    expect(state.military.officer_decision_history[0]).toMatchObject({
      turn: 19,
      event_id: 'replacement_old_commander_t19',
      matter_key: 'replacement:old_commander:vrs_drina_corps:new_commander',
    });
  });

  it('replaces a legacy replacement row that predates persisted matter keys', () => {
    const state: any = {
      military: {
        officer_decision_history: [{
          id: 'officer:18:replacement_old_commander_t18:acknowledged',
          turn: 18,
          faction: 'RS',
          event_id: 'replacement_old_commander_t18',
          event_type: 'replacement_suggested',
          officer_id: 'new_commander',
          current_commander_id: 'old_commander',
          corps_id: 'vrs_drina_corps',
          decision: 'acknowledged',
        }],
      },
    };

    fileOfficerDecisionRecord(state, {
      event_id: 'replacement:old_commander:vrs_drina_corps:new_commander',
      type: 'replacement_suggested',
      faction: 'RS',
      turn: 19,
      officer_id: 'new_commander',
      current_commander_id: 'old_commander',
      corps_id: 'vrs_drina_corps',
    }, 'acknowledged');

    expect(state.military.officer_decision_history).toHaveLength(1);
    expect(state.military.officer_decision_history[0]).toMatchObject({
      turn: 19,
      matter_key: 'replacement:old_commander:vrs_drina_corps:new_commander',
    });
  });

  it('writes history rows that survive current schema save/load roundtrip', () => {
    const state: any = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: {
        turn: 8,
        seed: 'desktop-officer-history-roundtrip',
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
      factions: [],
      paramilitary_decision_history: [],
      military: {
        front_segments: {},
        theatres: {},
        army_theatre_assignment: {},
        formations: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        assignable_front_segments: [],
        brigade_front_assignment: {},
        militia_pools: {},
        war_militia_strength: {},
        war_jna: { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 },
        army_co_decision_traces: {},
        army_corps_directives_by_faction: {},
        event_decision_log: [],
        fired_event_ids: [],
        event_readiness: {},
        event_fire_counts: {},
        event_last_fired_turn: {},
        event_flags: {},
        enabled_event_ids: [],
        event_overflow_queue: [],
        pending_event_decisions: [],
        pending_event_notifications: [],
        event_aggression_modifiers: [],
        recruitment_modifiers: [],
        equipment_quality_modifiers: [],
        cost_ledger_annotations: [],
        pending_convoy_decisions: [],
        convoy_decision_history: [],
        pending_reserve_requests: [],
        reserve_request_history: [],
        triggered_operations_accepted: {},
        declined_operations: {},
        used_operation_names: {},
        pending_officer_events: [],
        officer_decision_history: [],
        phantoms_spawned: [],
      },
      political: {
        political_controllers: {},
        negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null, last_counter_turn: {} },
        ceasefire: {},
        negotiation_ledger: [],
        supply_rights: { corridors: [] },
        municipalities: {},
        war_consolidation_until: {},
        war_control_strain: {},
        war_supply_pressure: {},
        war_supply_condition: {},
        war_exhaustion: {},
        war_exhaustion_local: {},
      },
      displacement: {
        displacement_state: {},
        civilian_casualties: {},
        war_displacement_initiated: {},
        hostile_takeover_timers: {},
        displacement_camp_state: {},
        minority_flight_state: {},
        settlement_displacement: {},
        settlement_displacement_started_turn: {},
        municipality_displacement: {},
        displacement_event_log: [],
        sustainability_state: {},
        displacement_humanitarian_aggregates: {},
        displacement_origin_dest_arrivals: {},
        displacement_recent_by_turn: {},
      },
    };
    const event = {
      event_id: 'evt-roundtrip',
      type: 'army_directive_pushback',
      faction: 'RBiH',
      turn: 8,
      officer_id: 'army_co',
      current_commander_id: 'army_co',
      corps_id: 'arbih_1st_corps',
    };

    fileOfficerDecisionRecord(state, event, 'override_confirmed');

    const restored = deserializeState(serializeState(state));
    expect(restored.military.officer_decision_history).toEqual([
      {
        id: 'officer:8:evt-roundtrip:override_confirmed',
        turn: 8,
        faction: 'RBiH',
        event_id: 'evt-roundtrip',
        event_type: 'army_directive_pushback',
        officer_id: 'army_co',
        current_commander_id: 'army_co',
        corps_id: 'arbih_1st_corps',
        decision: 'override_confirmed',
      },
    ]);
  });
});
