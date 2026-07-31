import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { parsePlayerVisibleWarroomState } from '../src/ui/warroom/data/player_visible_state_adapter.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

const require = createRequire(import.meta.url);

type Projector = {
  projectPlayerVisibleState: (state: any) => any;
  projectPlayerVisibleStateJson: (stateJson: string) => string;
  projectPlayerVisibleReplaySequenceJson: (sequenceJson: string) => string;
};

function loadProjector(): Projector {
  return require('../src/desktop/player_visible_state.cjs') as Projector;
}

function makeState() {
  return {
    schema_version: 34,
    meta: {
      turn: 8,
      phase: 'war',
      player_faction: 'RS',
      date: '1992-05-24',
      autonomy_level: 0,
      autonomy_level_pending: 1,
      tutorial_state: { dismissed: false, completed_steps: [] },
      pending_proposal_reviews: [
        { id: 'rs_proposal', faction: 'RS', description: 'Own proposal' },
        { id: 'rbih_proposal', faction: 'RBiH', description: 'Hidden proposal' },
      ],
      hidden_engine_trace: { enemy_plan: 'SECRET_META_PLAN' },
    },
    factions: [
      { id: 'RS', profile: { authority_floor: 50 }, patron_state: { confidence: 40 } },
      { id: 'RBiH', profile: { authority_floor: 20 }, patron_state: { confidence: 99, secret: 'SECRET_PATRON' } },
      { id: 'HRHB', profile: { authority_floor: 30 } },
    ],
    military: {
      formations: {
        rs_corps: {
          id: 'rs_corps', faction: 'RS', kind: 'corps', name: 'Own Corps', status: 'active', readiness: 'active',
        },
        rs_brigade: {
          id: 'rs_brigade', faction: 'RS', kind: 'brigade', name: 'Own Brigade', status: 'active', readiness: 'active',
          location_osid: 'op:own:front', personnel: 2100, cohesion: 73, corps_id: 'rs_corps',
        },
        rbih_visible: {
          id: 'rbih_visible', faction: 'RBiH', kind: 'brigade', name: 'SECRET VISIBLE BRIGADE', status: 'active', readiness: 'active',
          location_osid: 'op:enemy:front', personnel: 1900, cohesion: 88, corps_id: 'rbih_corps',
        },
        rbih_hidden: {
          id: 'rbih_hidden', faction: 'RBiH', kind: 'brigade', name: 'SECRET HIDDEN BRIGADE', status: 'active', readiness: 'active',
          location_osid: 'op:enemy:rear', personnel: 2400, cohesion: 91, corps_id: 'rbih_corps',
        },
        rbih_corps: {
          id: 'rbih_corps', faction: 'RBiH', kind: 'corps', name: 'SECRET ENEMY CORPS', status: 'active', readiness: 'active',
        },
      },
      war_front_edges_osid: [
        { edge_id: 'edge:front', a: 'op:own:front', b: 'op:enemy:front', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'edge:other-war', a: 'op:rbih', b: 'op:hrhb', side_a: 'RBiH', side_b: 'HRHB' },
      ],
      front_edges: [
        { edge_id: 'edge:front', a: 'op:own:front', b: 'op:enemy:front', side_a: 'RS', side_b: 'RBiH' },
      ],
      corps_front_sectors: {
        'sector:rs_corps:0': {
          sector_id: 'sector:rs_corps:0', corps_id: 'rs_corps', faction: 'RS', opposing_factions: ['RBiH'],
          edge_ids: ['edge:front'], territory_osids: ['op:own:front'], assigned_brigade_ids: ['rs_brigade'],
          reserve_brigade_ids: [], length_edges: 1, density: 1, threat_ratio: 1.4, defensive_power: 20,
          sector_stance: 'defend', stance_source: 'bot',
          sub_segments: [{ sub_segment_id: 'subseg:rs:0', edge_ids: ['edge:front'], friendly_osids: ['op:own:front'], enemy_osids: ['op:enemy:front'], primary_brigade_ids: ['rs_brigade'], length_edges: 1 }],
        },
        'sector:rbih_corps:0': {
          sector_id: 'sector:rbih_corps:0', corps_id: 'rbih_corps', faction: 'RBiH', opposing_factions: ['RS'],
          edge_ids: ['edge:front'], territory_osids: ['op:enemy:front', 'op:enemy:rear'], assigned_brigade_ids: ['rbih_visible', 'rbih_hidden'],
          reserve_brigade_ids: [], length_edges: 1, density: 2, threat_ratio: 9.9, defensive_power: 999,
          sector_stance: 'attack', stance_source: 'bot',
          sub_segments: [{ sub_segment_id: 'subseg:rbih:0', edge_ids: ['edge:front'], friendly_osids: ['op:enemy:front'], enemy_osids: ['op:own:front'], primary_brigade_ids: ['rbih_visible'], length_edges: 1 }],
        },
      },
      sector_intel: {
        'sector:rs_corps:0': [{
          enemy_sector_id: 'sector:rbih_corps:0', front_edge_count: 1, strength_category: 'dense',
          posture_observed: 'offensive_prep', offensive_signs: true, confidence: 0.83,
          turns_in_contact: 3, visible_brigade_ids: ['rbih_visible'],
        }],
        'sector:rbih_corps:0': [{
          enemy_sector_id: 'sector:rs_corps:0', confidence: 1, visible_brigade_ids: ['rs_brigade'],
          hidden_estimate: 'SECRET_ENEMY_INTEL',
        }],
      },
      corps_command: {
        rs_corps: {
          stance: 'balanced', corps_exhaustion: 2, command_span: 5, active_ogs: [],
          active_operations: [{ name: 'Own Operation', phase: 'planning', objectives: ['op:enemy:front'], participating_brigades: ['rs_brigade'] }],
        },
        rbih_corps: {
          stance: 'offensive', corps_exhaustion: 0, secret_plan: 'SECRET_CORPS_PLAN',
          active_operations: [{ name: 'SECRET ENEMY OPERATION', phase: 'execution', objectives: ['op:own:front'], participating_brigades: ['rbih_visible', 'rbih_hidden'] }],
        },
      },
      named_officer_data: [
        { id: 'rs_officer', faction: 'RS', name: 'Own Officer', rank: 'general' },
        { id: 'rbih_officer', faction: 'RBiH', name: 'SECRET ENEMY OFFICER', rank: 'general' },
      ],
      named_officers: {
        rs_officer: { officer_id: 'rs_officer', status: 'active', assigned_corps_id: 'rs_corps' },
        rbih_officer: { officer_id: 'rbih_officer', status: 'active', assigned_corps_id: 'rbih_corps', secret: 'SECRET_OFFICER_STATE' },
      },
      pending_officer_events: [
        { event_id: 'rs_officer_event', faction: 'RS', officer_id: 'rs_officer' },
        { event_id: 'rbih_officer_event', faction: 'RBiH', officer_id: 'rbih_officer' },
      ],
      friction_events: [
        { officer_id: 'rs_officer', turn: 8, type: 'ignored_stance', resolved: false },
        { officer_id: 'rbih_officer', turn: 8, type: 'ignored_stance', resolved: false },
      ],
      militia_pools: {
        'mun:RS': { mun_id: 'mun', faction: 'RS', available: 100 },
        'mun:RBiH': { mun_id: 'mun', faction: 'RBiH', available: 900, secret: 'SECRET_POOL' },
      },
      recruitment_state: {
        recruitment_capital: { RS: { points: 4 }, RBiH: { points: 99 } },
        equipment_pools: { RS: { points: 3 }, RBiH: { points: 88 } },
        recruited_brigade_ids: ['rs_brigade', 'rbih_hidden'],
        max_recruits_per_faction_per_turn: 2,
      },
      army_stance: { RS: 'balanced', RBiH: 'offensive' },
      general_supply_reserve: { RS: 55, RBiH: 91 },
      heavy_munitions_reserve: { RS: 44, RBiH: 92 },
      casualty_ledger: {
        RS: { killed: 10, wounded: 20, per_formation: { rs_brigade: { killed: 10 } } },
        RBiH: { killed: 30, wounded: 40, per_formation: { rbih_visible: { killed: 30 } } },
      },
      pending_reserve_requests: [
        { request_id: 'rs_request', faction: 'RS', corps_id: 'rs_corps' },
        { request_id: 'rbih_request', faction: 'RBiH', corps_id: 'rbih_corps' },
      ],
      last_briefing: {
        turn: 8,
        faction: 'RBiH',
        headline: 'SECRET ENEMY BRIEFING',
        items: [{ id: 'secret', title: 'SECRET BRIEFING ITEM' }],
      },
      pending_event_decisions: [
        { event_id: 'rs_decision', faction: 'RS', title: 'Own decision' },
        { event_id: 'rbih_decision', faction: 'RBiH', title: 'SECRET ENEMY DECISION' },
      ],
      pending_event_notifications: [
        { notification_id: 'to_rs', event_id: 'public_event', source_faction: 'RBiH', target_faction: 'RS', headline: 'Report', body: 'Public consequence' },
        { notification_id: 'to_rbih', event_id: 'hidden_event', source_faction: 'RS', target_faction: 'RBiH', headline: 'SECRET NOTICE', body: 'SECRET NOTICE BODY' },
      ],
      event_decision_log: [
        { event_id: 'rs_decision', faction: 'RS', response_id: 'approve', resolved_turn: 7 },
        { event_id: 'rbih_decision', faction: 'RBiH', response_id: 'secret', resolved_turn: 7 },
      ],
      fired_event_ids: ['public_event', 'rs_decision', 'hidden_enemy_event'],
      enabled_event_ids: ['promised_event', 'hidden_enemy_event'],
      closed_event_ids: ['closed_by_rs', 'hidden_closed_event'],
      event_causality_log: [
        { turn: 7, from_event: 'rs_decision', to_event: 'promised_event', to_flag: null, kind: 'enables', source_response_id: 'approve' },
        { turn: 7, from_event: 'rbih_decision', to_event: 'hidden_enemy_event', to_flag: null, kind: 'enables', source_response_id: 'secret' },
      ],
      event_flags: { jna_withdrawn: true, secret_enemy_preparation: 99 },
      negotiation: {
        capital: { RS: 30, RBiH: 90 },
        patron_relationships: { RS: { patron: 'FRY' }, RBiH: { patron: 'international' } },
        strategic_dimensions: { RS: { military_credibility: { base_value: 40 } }, RBiH: { military_credibility: { base_value: 90 } } },
        pending_counter_offers: [
          { id: 'offer_to_rs', targetFaction: 'RS', author: 'RBiH' },
          { id: 'offer_to_rbih', targetFaction: 'RBiH', author: 'RS' },
        ],
      },
      engine_trace: { opponent_inputs: 'SECRET_ENGINE_TRACE' },
    },
    political: {
      political_controllers: { 'op:own:front': 'RS', 'op:enemy:front': 'RBiH', 'op:enemy:rear': 'RBiH' },
      initial_political_controllers: { 'op:own:front': 'RS', 'op:enemy:front': 'RBiH', 'op:enemy:rear': 'RBiH' },
      contested_control: {},
      control_events: [],
      war_exhaustion: { RS: 10, RBiH: 20 },
      war_supply_condition: { RS: 60, RBiH: 80 },
      war_supply_pressure: { RS: 4, RBiH: 1 },
      hidden_authority_trace: { RBiH: 'SECRET_POLITICAL_TRACE' },
    },
    displacement: {
      civilian_casualties: { RS: { killed: 1, fled_abroad: 2 }, RBiH: { killed: 3, fled_abroad: 4 } },
      displacement_event_log: [],
      displacement_state: {},
    },
    operation_history: [
      { operation_id: 'rs_op', operation_name: 'Own Operation', faction: 'RS', corps_id: 'rs_corps', ended_turn: 7 },
      { operation_id: 'rbih_op', operation_name: 'SECRET COMPLETED OPERATION', faction: 'RBiH', corps_id: 'rbih_corps', ended_turn: 7 },
    ],
    pending_paramilitary_requests: [
      { request_id: 'rs_paramilitary', faction: 'RS', target_osid: 'op:enemy:rear' },
      { request_id: 'rbih_paramilitary', faction: 'RBiH', target_osid: 'op:own:front' },
    ],
    paramilitary_decision_history: [
      { decision_id: 'rs_paramilitary_decision', faction: 'RS' },
      { decision_id: 'rbih_paramilitary_decision', faction: 'RBiH' },
    ],
    paramilitary_deployment_count: { RS: 2, RBiH: 9, HRHB: 3 },
    turn_summaries: [{
      turn: 8,
      battles: [
        {
          osid: 'op:enemy:front', attacker_faction: 'RS', defender_faction: 'RBiH',
          primary_attacker_id: 'rs_brigade', primary_defender_id: 'rbih_visible', all_attacker_ids: ['rs_brigade'],
          outcome: 'stalemate', attacker_casualties: 10, defender_casualties: 12, territory_flipped: false, was_concentrated: false,
          defender_contributions: [{ brigade_id: 'rbih_visible', distance_hops: 0, casualties_taken: 12 }],
        },
        {
          osid: 'op:other:hidden', attacker_faction: 'RBiH', defender_faction: 'HRHB',
          primary_attacker_id: 'rbih_hidden', primary_defender_id: 'hrhb_hidden', all_attacker_ids: ['rbih_hidden'],
          outcome: 'attacker_victory', attacker_casualties: 1, defender_casualties: 2, territory_flipped: true, was_concentrated: false,
        },
      ],
      territory_net: { RS: 0, RBiH: 1, HRHB: -1 },
      notable_flips: [], displacement_total: 0, displacement_by_ethnicity: {},
      decoration_awards: [
        { formation_id: 'rs_brigade', formation_name: 'Own Brigade', faction: 'RS', decoration: { id: 'own_award' } },
        { formation_id: 'rbih_visible', formation_name: 'SECRET VISIBLE BRIGADE', faction: 'RBiH', decoration: { id: 'hidden_award' } },
      ],
      arc_transitions: [],
      formation_spawns: [{ formation_id: 'rbih_hidden', formation_name: 'SECRET HIDDEN BRIGADE', faction: 'RBiH', kind: 'brigade' }],
      formation_destructions: [],
      supply_deltas: { RS: -1, RBiH: 4 }, heavy_munitions_deltas: { RS: -2, RBiH: 5 },
      movements: [
        { formation_id: 'rs_brigade', formation_name: 'Own Brigade', from_osid: 'op:own:rear', to_osid: 'op:own:front' },
        { formation_id: 'rbih_hidden', formation_name: 'SECRET HIDDEN BRIGADE', from_osid: 'op:enemy:rear', to_osid: 'op:enemy:front' },
      ],
      supply_transitions: [], events_fired: [{ id: 'public_event', text: 'Public event' }], notable_events: [],
      territory_snapshot: { RS: 50, RBiH: 40, HRHB: 10 }, supply_snapshot: { RS: 55, RBiH: 91 },
    }],
  };
}

describe('desktop player-visible state projection', () => {
  it('keeps own command truth while replacing visible enemies with reduced contacts', () => {
    const projected = loadProjector().projectPlayerVisibleState(makeState());

    expect(Object.keys(projected.military.formations)).toEqual([
      'contact:RBiH:op:enemy:front',
      'rs_brigade',
      'rs_corps',
    ]);
    expect(projected.military.formations.rs_brigade).toMatchObject({
      name: 'Own Brigade', personnel: 2100, cohesion: 73, corps_id: 'rs_corps',
    });
    expect(projected.military.formations['contact:RBiH:op:enemy:front']).toEqual({
      created_turn: 8,
      faction: 'RBiH',
      id: 'contact:RBiH:op:enemy:front',
      kind: 'brigade',
      location_osid: 'op:enemy:front',
      name: 'Enemy contact',
      readiness: 'active',
      status: 'active',
      tags: ['player_visible_contact'],
    });
    expect(projected.military.corps_command).toEqual({ rs_corps: expect.objectContaining({ stance: 'balanced' }) });
    expect(projected.military.corps_front_sectors).toHaveProperty('sector:rs_corps:0');
    expect(projected.military.corps_front_sectors).not.toHaveProperty('sector:rbih_corps:0');
    expect(projected.military.named_officer_data.map((officer: any) => officer.id)).toEqual(['rs_officer']);
    expect(Object.keys(projected.military.named_officers)).toEqual(['rs_officer']);
    expect(projected.operation_history.map((operation: any) => operation.operation_id)).toEqual(['rs_op']);
  });

  it('scopes intel, resources, decisions, proposals, and notifications to the player', () => {
    const projected = loadProjector().projectPlayerVisibleState(makeState());
    const intel = projected.military.sector_intel['sector:rs_corps:0'][0];

    expect(Object.keys(projected.military.sector_intel)).toEqual(['sector:rs_corps:0']);
    expect(intel.enemy_sector_id).toBe('contact-sector:0');
    expect(intel.visible_brigade_ids).toEqual(['contact:RBiH:op:enemy:front']);
    expect(intel.confidence).toBe(0.75);
    expect(projected.military.general_supply_reserve).toEqual({ RS: 55 });
    expect(projected.military.heavy_munitions_reserve).toEqual({ RS: 44 });
    expect(projected.military.army_stance).toEqual({ RS: 'balanced' });
    expect(projected.military.recruitment_state.recruitment_capital).toEqual({ RS: { points: 4 } });
    expect(projected.military.recruitment_state.recruited_brigade_ids).toEqual(['rs_brigade']);
    expect(projected.military.pending_event_decisions.map((row: any) => row.event_id)).toEqual(['rs_decision']);
    expect(projected.military.pending_event_notifications.map((row: any) => row.notification_id)).toEqual(['to_rs']);
    expect(projected.meta.pending_proposal_reviews.map((row: any) => row.id)).toEqual(['rs_proposal']);
    expect(projected.pending_paramilitary_requests.map((row: any) => row.request_id)).toEqual(['rs_paramilitary']);
    expect(projected.paramilitary_deployment_count).toEqual({ RS: 2 });
    expect(projected.factions.map((faction: any) => faction.id)).toEqual(['RS']);
  });

  it('keeps the player informed about a pending autonomy transition', () => {
    const projected = loadProjector().projectPlayerVisibleState(makeState());

    expect(projected.meta.autonomy_level).toBe(0);
    expect(projected.meta.autonomy_level_pending).toBe(1);
  });

  it('keeps pending peace-plan terms visible while redacting precomputed bot responses', () => {
    const state = makeState();
    const negotiation = state.military.negotiation as typeof state.military.negotiation & {
      pending_peace_plan?: {
        plan_id: string;
        turn_offered: number;
        bot_responses: Record<string, string>;
      };
    };
    negotiation.pending_peace_plan = {
      plan_id: 'vance_owen',
      turn_offered: 40,
      bot_responses: { RBiH: 'accepted', HRHB: 'rejected' },
    };

    const projected = loadProjector().projectPlayerVisibleState(state);

    expect(projected.military.negotiation.pending_peace_plan).toEqual({
      plan_id: 'vance_owen',
      turn_offered: 40,
      bot_responses: {},
    });
    expect(negotiation.pending_peace_plan?.bot_responses).toEqual({
      RBiH: 'accepted',
      HRHB: 'rejected',
    });
  });

  it('redacts opponent identities from player-visible battle history', () => {
    const projected = loadProjector().projectPlayerVisibleState(makeState());
    const summary = projected.turn_summaries[0];

    expect(summary.battles).toHaveLength(1);
    expect(summary.battles[0]).toMatchObject({
      osid: 'op:enemy:front',
      primary_attacker_id: 'rs_brigade',
      primary_defender_id: null,
      all_attacker_ids: ['rs_brigade'],
    });
    expect(summary.battles[0].defender_contributions).toBeUndefined();
    expect(summary.decoration_awards.map((row: any) => row.formation_id)).toEqual(['rs_brigade']);
    expect(summary.formation_spawns).toEqual([]);
    expect(summary.movements.map((row: any) => row.formation_id)).toEqual(['rs_brigade']);
    expect(summary.supply_deltas).toEqual({ RS: -1 });
    expect(summary.supply_snapshot).toEqual({ RS: 55 });
    expect(summary.territory_snapshot).toEqual({ RS: 50, RBiH: 40, HRHB: 10 });
  });

  it('exposes only fired or player-caused event causality', () => {
    const projected = loadProjector().projectPlayerVisibleState(makeState());

    expect(projected.military.event_decision_log.map((row: any) => row.event_id)).toEqual(['rs_decision']);
    expect(projected.military.event_causality_log).toEqual([
      expect.objectContaining({ from_event: 'rs_decision', to_event: 'promised_event' }),
    ]);
    expect(projected.military.enabled_event_ids).toEqual(['promised_event']);
    expect(projected.military.fired_event_ids).toEqual(['public_event', 'rs_decision']);
    expect(projected.military.event_flags).toEqual({ jna_withdrawn: true });
  });

  it('does not leak known hidden opponent or engine values anywhere in the payload', () => {
    const json = loadProjector().projectPlayerVisibleStateJson(JSON.stringify(makeState()));

    for (const forbidden of [
      'rbih_visible',
      'rbih_hidden',
      'rbih_corps',
      'rbih_officer',
      'SECRET VISIBLE BRIGADE',
      'SECRET HIDDEN BRIGADE',
      'SECRET ENEMY CORPS',
      'SECRET ENEMY OPERATION',
      'SECRET COMPLETED OPERATION',
      'SECRET_CORPS_PLAN',
      'SECRET_ENGINE_TRACE',
      'SECRET_META_PLAN',
      'SECRET_POLITICAL_TRACE',
      'SECRET ENEMY BRIEFING',
      'SECRET BRIEFING ITEM',
      'hidden_enemy_event',
    ]) {
      expect(json, forbidden).not.toContain(forbidden);
    }
  });

  it('returns a conservative empty military projection without an active player faction', () => {
    const state = makeState();
    delete (state.meta as any).player_faction;
    const projected = loadProjector().projectPlayerVisibleState(state);

    expect(projected.meta).toMatchObject({ turn: 8, phase: 'war' });
    expect(projected.meta.player_faction).toBeNull();
    expect(projected.military.formations).toEqual({});
    expect(projected.military.corps_command).toEqual({});
    expect(projected.military.corps_front_sectors).toEqual({});
    expect(projected.operation_history).toEqual([]);
    expect(projected.political.political_controllers).toEqual(state.political.political_controllers);
  });

  it('is deterministic, deeply detached, and parseable by the existing renderer adapter', () => {
    const projector = loadProjector();
    const source = makeState();
    const before = structuredClone(source);
    const first = projector.projectPlayerVisibleStateJson(JSON.stringify(source));
    const second = projector.projectPlayerVisibleStateJson(JSON.stringify(source));
    const projected = JSON.parse(first);

    projected.military.formations.rs_brigade.name = 'Changed in renderer';
    expect(source).toEqual(before);
    expect(first).toBe(second);

    const loaded = parseGameState(JSON.parse(first));
    expect(loaded.player_faction).toBe('RS');
    expect(loaded.formations.map((formation) => formation.id)).toEqual([
      'contact:RBiH:op:enemy:front',
      'rs_brigade',
      'rs_corps',
      'vrs_main_staff',
    ]);
    expect(loaded.operations?.map((operation) => operation.name)).toEqual(['Own Operation']);
    expect(loaded.namedOfficerData?.map((officer) => officer.id)).toEqual(['rs_officer']);
  });

  it('loads a freshly generated current RS campaign through the Warroom player-visible adapter', async () => {
    const projector = loadProjector();
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    const canonicalJson = serializeState(state);
    const projectedJson = projector.projectPlayerVisibleStateJson(canonicalJson);

    expect(() => deserializeState(projectedJson)).toThrow();

    const warroomState = parsePlayerVisibleWarroomState(projectedJson);
    expect(warroomState.meta.player_faction).toBe('RS');
    expect(warroomState.meta.player_visible_projection).toBe(1);
    expect(Object.values(warroomState.military.formations).filter((formation) => formation.faction === 'RS').length)
      .toBeGreaterThan(0);
    expect(Object.values(warroomState.military.corps_command ?? {}).length).toBeGreaterThan(0);
    expect(() => parseGameState(JSON.parse(projectedJson))).not.toThrow();
  }, 120_000);

  it('projects every replay frame instead of sending canonical saves to the renderer', () => {
    const projector = loadProjector();
    const turnEight = makeState();
    const turnNine = makeState();
    turnNine.meta.turn = 9;

    const sequence = JSON.parse(projector.projectPlayerVisibleReplaySequenceJson(JSON.stringify([turnEight, turnNine])));
    expect(sequence.map((state: any) => state.meta.turn)).toEqual([8, 9]);
    expect(sequence.every((state: any) => !JSON.stringify(state).includes('rbih_hidden'))).toBe(true);
    expect(sequence.every((state: any) => Object.keys(state.military.corps_command).join(',') === 'rs_corps')).toBe(true);
  });

  it('routes desktop push, pull, and replay IPC through the shared projection module', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');

    expect(source).toContain("require('./player_visible_state.cjs')");
    expect(source).toContain('const playerVisibleStateJson = projectPlayerVisibleStateJson(stateJson);');
    expect(source).toContain("registerIpcHandler('get-current-game-state', async () => projectCurrentGameStateForRenderer());");
    expect(source).toContain('projectPlayerVisibleReplaySequenceJson(sequenceJson, getActivePlayerFaction())');

    const pullHandlers = source.match(/registerIpcHandler\('get-current-game-state',[^\n]+/g) ?? [];
    expect(pullHandlers).toEqual([
      "registerIpcHandler('get-current-game-state', async () => projectCurrentGameStateForRenderer());",
    ]);

    const tacticalLoadStart = source.indexOf("win.webContents.on('did-finish-load'");
    const tacticalLoadEnd = source.indexOf('return { win, targetUrl };', tacticalLoadStart);
    const tacticalLoadBlock = source.slice(tacticalLoadStart, tacticalLoadEnd);
    expect(tacticalLoadBlock).toContain('projectCurrentGameStateForRenderer()');
    expect(tacticalLoadBlock).not.toContain("send('game-state-updated', currentGameStateJson)");
  });

  it('keeps canonical state out of every mutating IPC response', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const mutationHandlers = [
      ['load-scenario-dialog', 'start-new-campaign'],
      ['start-new-campaign', 'load-state-dialog'],
      ['load-state-dialog', 'advance-turn'],
      ['advance-turn', 'save-game'],
      ['apply-recruitment', 'stage-attack-order'],
      ['resolve-paramilitary-requests', 'resolve-dayton'],
    ] as const;

    for (const [name, nextName] of mutationHandlers) {
      const start = source.indexOf(`ipcMain.handle('${name}'`);
      const end = source.indexOf(`ipcMain.handle('${nextName}'`, start);
      expect(start, name).toBeGreaterThanOrEqual(0);
      expect(end, name).toBeGreaterThan(start);
      expect(source.slice(start, end), name).not.toMatch(/return\s+\{[\s\S]*?stateJson\s*:/);
    }
  });

  it('uses the explicit projected-state adapter for every desktop Warroom ingestion path', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'ui', 'warroom', 'warroom.ts'), 'utf8');
    const applyStart = source.indexOf('private applyGameStateFromJson');
    const applyEnd = source.indexOf('//', applyStart + 'private applyGameStateFromJson'.length);
    const applyBlock = source.slice(applyStart, applyEnd);

    expect(source).toContain("import { parsePlayerVisibleWarroomState } from './data/player_visible_state_adapter.js';");
    expect(applyBlock).toContain('this.gameState = parsePlayerVisibleWarroomState(stateJson);');
    expect(applyBlock).not.toContain('deserializeState(stateJson)');
    expect(source).not.toContain('result.stateJson');
  });

  it('keeps projected state subscriptions data-only so mutation handlers own navigation', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'ui', 'warroom', 'warroom.ts'), 'utf8');
    const subscriptionStart = source.indexOf('this.desktopBridge.subscribeGameStateUpdated');
    const subscriptionEnd = source.indexOf('});', subscriptionStart);
    const subscriptionBlock = source.slice(subscriptionStart, subscriptionEnd);

    expect(subscriptionStart).toBeGreaterThanOrEqual(0);
    expect(subscriptionBlock).toContain('this.handleDesktopGameStateUpdated(stateJson);');
    expect(subscriptionBlock).not.toContain('this.showScreen(');
    expect(subscriptionBlock).not.toContain('this.showLoadedGameShellScene(');
  });

  it('delivers an embedded mutation response before broadcasting its resulting state update', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'ui', 'warroom', 'warroom.ts'), 'utf8');
    const invokeStart = source.indexOf('private async handleEmbeddedBridgeInvoke');
    const invokeEnd = source.indexOf('private broadcastEmbeddedBridgeEvent', invokeStart);
    const invokeBlock = source.slice(invokeStart, invokeEnd);

    expect(source).toContain('private pendingEmbeddedGameStateJson: string | null = null;');
    expect(source).toContain('this.handleDesktopGameStateUpdated(stateJson);');
    expect(invokeBlock).toContain('this.flushPendingEmbeddedGameState();');
    expect(invokeBlock.indexOf("type: 'awwv-bridge:response'"))
      .toBeLessThan(invokeBlock.indexOf('this.flushPendingEmbeddedGameState();'));
  });

  it('synchronizes Continue availability when canonical campaign state becomes available', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'ui', 'warroom', 'warroom.ts'), 'utf8');
    const applyStart = source.indexOf('private applyGameStateFromJson');
    const applyEnd = source.indexOf('/** STEP 1:', applyStart);
    const applyBlock = source.slice(applyStart, applyEnd);
    const menuStart = source.indexOf('private showMainMenu');
    const menuEnd = source.indexOf('/** STEP 2:', menuStart);
    const menuBlock = source.slice(menuStart, menuEnd);

    expect(source).toContain('private syncContinueAvailability(): void');
    expect(applyBlock).toContain('this.syncContinueAvailability();');
    expect(menuBlock).toContain('this.syncContinueAvailability();');
  });
});
