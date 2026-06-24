import { describe, expect, it } from 'vitest';
import type { LoadedGameState, OperationView } from '../src/ui/map/data/types.js';
import {
  filterPlayerFacingActiveOperations,
  filterPlayerFacingFormations,
  filterPlayerFacingMovementsByOsid,
  filterPlayerFacingOperations,
  filterPlayerFacingOperationHistory,
  filterPlayerFacingSectors,
  findPlayerFacingOperationByKey,
  getPlayerFacingFaction,
  filterPlayerVisibleMapFormations,
  isFieldedTacticalFormation,
} from '../src/ui/shared/playerVisibility.js';
import {
  getPlayerSafeBrigadeName,
  getPlayerSafeCorpsName,
  getPlayerSafeDisplayLabel,
  getPlayerSafeEnclaveName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
  getPlayerSafePoliticalFactionName,
} from '../src/ui/map/utils/playerSafeText.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildOperationArrowsGeoJSON } from '../src/ui/map/map/builders/buildOperationArrowsGeoJSON.js';
import { buildFormationsGeoJSON } from '../src/ui/map/map/builders/buildFormationsGeoJSON.js';
import { generateThreatAssessment } from '../src/ui/map/components/army_hq/generateThreatAssessment.js';
import { getFormationsAtOsid, getFormationsCoveringOsid } from '../src/ui/map/utils/formationAtOsid.js';
import { getPlayerVisibleFormationStack } from '../src/ui/map/utils/visibleFormationStack.js';

describe('player visibility helpers', () => {
  it('normalizes player faction and rejects unknown values', () => {
    expect(getPlayerFacingFaction({ player_faction: 'RBiH' } as LoadedGameState)).toBe('RBiH');
    expect(getPlayerFacingFaction({ player_faction: 'RS' } as LoadedGameState)).toBe('RS');
    expect(getPlayerFacingFaction({ player_faction: 'HRHB' } as LoadedGameState)).toBe('HRHB');
    expect(getPlayerFacingFaction({ player_faction: 'UNPROFOR' } as LoadedGameState)).toBeNull();
    expect(getPlayerFacingFaction({} as LoadedGameState)).toBeNull();
  });

  it('filters formations, sectors, and operations to the player faction only', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
        { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', kind: 'corps', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
      ],
      corpsFrontSectors: [
        { sector_id: 's_1', corps_id: 'arbih_3rd_corps', faction: 'RBiH', display_name: 'Tuzla Front', edge_ids: [], length_edges: 2, density: 1, threat_ratio: 1, territory_osids: [], assigned_brigade_ids: [], reserve_brigade_ids: [], offensive_signs: false, intel_confidence: 0.5, combat_strength_class: 'adequate' },
        { sector_id: 's_2', corps_id: 'vrs_1st_krajina', faction: 'RS', display_name: 'Doboj Front', edge_ids: [], length_edges: 2, density: 1, threat_ratio: 1, territory_osids: [], assigned_brigade_ids: [], reserve_brigade_ids: [], offensive_signs: false, intel_confidence: 0.5, combat_strength_class: 'adequate' },
      ],
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', display_name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, current_objective_index: 0, objectives: ['osid_a'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', display_name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
    } as unknown as LoadedGameState;

    expect(filterPlayerFacingFormations(state).map((f) => f.id)).toEqual(['arbih_3rd_corps']);
    expect(filterPlayerFacingSectors(state).map((s) => s.sector_id)).toEqual(['s_1']);
    expect(filterPlayerFacingOperations(state).map((o) => o.name)).toEqual(['Op Tuzla']);
  });

  it('only treats active, non-forming tactical records as fielded while preserving lightweight projection records', () => {
    expect(isFieldedTacticalFormation({ kind: 'brigade' })).toBe(true);
    expect(isFieldedTacticalFormation({ kind: 'operational_group' })).toBe(true);
    expect(isFieldedTacticalFormation({ kind: 'brigade', status: 'ACTIVE', readiness: 'ready' })).toBe(true);
    expect(isFieldedTacticalFormation({ kind: 'brigade', status: 'active', readiness: 'forming' })).toBe(false);
    expect(isFieldedTacticalFormation({ kind: 'brigade', status: 'destroyed' })).toBe(false);
    expect(isFieldedTacticalFormation({ kind: 'corps', status: 'active' })).toBe(false);
  });

  it('does not expose forming or destroyed formations as stationed field units', () => {
    const formations = [
      { id: 'fielded', faction: 'RBiH', name: 'Fielded', kind: 'brigade', readiness: 'ready', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:tuzla' },
      { id: 'covering', faction: 'RBiH', name: 'Covering', kind: 'brigade', readiness: 'ready', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:gradacac', aorSettlementIds: ['op:tuzla'] },
      { id: 'forming', faction: 'RBiH', name: 'Forming', kind: 'brigade', readiness: 'forming', cohesion: 40, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:tuzla' },
      { id: 'destroyed', faction: 'RBiH', name: 'Destroyed', kind: 'brigade', readiness: 'destroyed', cohesion: 0, fatigue: 0, status: 'destroyed', createdTurn: 1, tags: [], location_osid: 'op:tuzla' },
    ] as LoadedGameState['formations'];

    expect(getFormationsAtOsid(formations, 'op:tuzla').map((formation) => formation.id)).toEqual(['fielded']);
    expect(getFormationsCoveringOsid(formations, 'op:tuzla').map((formation) => formation.id)).toEqual(['fielded', 'covering']);
  });

  it('filters operation history and movement logs to player-owned formations only', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [
        { id: 'arbih_b1', faction: 'RBiH', name: '1st Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
        { id: 'rs_b1', faction: 'RS', name: 'Enemy Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
      ],
      operationHistory: [
        {
          operation_id: 'op_1',
          operation_name: 'Own Op',
          corps_id: 'arbih_3rd_corps',
          faction: 'RBiH',
          started_turn: 1,
          ended_turn: 2,
          outcome: 'success',
          objectives_targeted: ['osid_a'],
          objectives_captured: ['osid_a'],
          total_attacks: 1,
          casualties_suffered: { killed: 1, wounded: 2 },
          casualties_inflicted: { killed: 3, wounded: 4 },
          equipment_lost: { tanks: 0, artillery: 0 },
          equipment_destroyed: { tanks: 0, artillery: 0 },
          equipment_captured: { tanks: 0, artillery: 0 },
          grade: { stars: 2, verdict: 'solid', factors: {} },
          duration_turns: 1,
          weekly_log: [],
        },
        {
          operation_id: 'op_2',
          operation_name: 'Enemy Op',
          corps_id: 'vrs_1st_krajina',
          faction: 'RS',
          started_turn: 1,
          ended_turn: 2,
          outcome: 'success',
          objectives_targeted: ['osid_b'],
          objectives_captured: ['osid_b'],
          total_attacks: 1,
          casualties_suffered: { killed: 1, wounded: 2 },
          casualties_inflicted: { killed: 3, wounded: 4 },
          equipment_lost: { tanks: 0, artillery: 0 },
          equipment_destroyed: { tanks: 0, artillery: 0 },
          equipment_captured: { tanks: 0, artillery: 0 },
          grade: { stars: 2, verdict: 'solid', factors: {} },
          duration_turns: 1,
          weekly_log: [],
        },
      ],
      activeOperations: [
        {
          corps_id: 'arbih_3rd_corps',
          operation_name: 'Own Active Op',
          faction: 'RBiH',
          type: 'sector_attack',
          phase: 'planning',
          started_turn: 2,
          participating_brigades: ['arbih_b1'],
          objectives_count: 1,
          objectives_captured: 0,
          attacks: 0,
          weekly_log_length: 1,
        },
        {
          corps_id: 'vrs_1st_krajina',
          operation_name: 'Enemy Active Op',
          faction: 'RS',
          type: 'sector_attack',
          phase: 'execution',
          started_turn: 2,
          participating_brigades: ['rs_b1'],
          objectives_count: 1,
          objectives_captured: 0,
          attacks: 1,
          weekly_log_length: 1,
        },
      ],
      movementsByOsid: {
        osid_a: [
          { turn: 2, formation_id: 'arbih_b1', formation_name: '1st Brigade', type: 'arrived' },
          { turn: 2, formation_id: 'rs_b1', formation_name: 'Enemy Brigade', type: 'arrived' },
        ],
      },
    } as unknown as LoadedGameState;

    expect(filterPlayerFacingActiveOperations(state).map((entry) => entry.operation_name)).toEqual(['Own Active Op']);
    expect(filterPlayerFacingOperationHistory(state).map((entry) => entry.operation_name)).toEqual(['Own Op']);
    expect(filterPlayerFacingMovementsByOsid(state)).toEqual({
      osid_a: [
        { turn: 2, formation_id: 'arbih_b1', formation_name: '1st Brigade', type: 'arrived' },
      ],
    });
  });

  it('operation arrows are built only for player-facing operations', () => {
    const state = {
      player_faction: 'RBiH',
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', display_name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, staging_osid: 'osid_a', current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', display_name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, staging_osid: 'osid_c', current_objective_index: 0, objectives: ['osid_d'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
    } as unknown as LoadedGameState;

    const lookup = new Map<string, [number, number]>([
      ['osid_a', [18, 44]],
      ['osid_b', [18.2, 44.2]],
      ['osid_c', [19, 45]],
      ['osid_d', [19.2, 45.2]],
    ]);

    const geo = buildOperationArrowsGeoJSON(state, lookup);
    const names = geo.features.map((feature) => String((feature.properties as { op_name?: string }).op_name));

    expect(names.some((name) => name.includes('Op Tuzla'))).toBe(true);
    expect(names.some((name) => name.includes('Op Doboj'))).toBe(false);
  });

  it('keeps all own formations plus only fog-visible enemy formations on the map', () => {
    const state = {
      player_faction: 'RBiH',
      fogOfWar: {
        visibleEnemyOsids: ['osid_enemy_visible'],
        visibleEnemySectorIds: [],
      },
      formations: [
        { id: 'own_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_own' },
        { id: 'enemy_seen', faction: 'RS', name: 'Seen Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_enemy_visible' },
        { id: 'enemy_hidden', faction: 'RS', name: 'Hidden Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_enemy_hidden' },
      ],
    } as unknown as LoadedGameState;

    expect(filterPlayerVisibleMapFormations(state).map((f) => f.id)).toEqual(['own_1', 'enemy_seen']);
  });

  it('keeps all map formations visible when inspecting headless saves without a player faction', () => {
    const state = {
      player_faction: null,
      formations: [
        { id: 'arbih_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:own' },
        { id: 'rs_1', faction: 'RS', name: 'RS Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:enemy' },
        { id: 'hrhb_1', faction: 'HRHB', name: 'HVO Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:hvo' },
      ],
    } as unknown as LoadedGameState;

    expect(filterPlayerVisibleMapFormations(state).map((f) => f.id)).toEqual(['arbih_1', 'rs_1', 'hrhb_1']);
  });

  it('parseGameState keeps missing lifecycle unreported instead of active/perfect', () => {
    const parsed = parseGameState({
      meta: { turn: 1, phase: 'war' },
      military: {
        formations: {
          b1: { id: 'b1', faction: 'RBiH', name: 'B1', kind: 'brigade', tags: [] },
        },
      },
      political: { political_controllers: {} },
    } as any);

    expect(parsed.formations[0]).toMatchObject({
      readiness: 'unreported',
      status: 'unreported',
      cohesion: 0,
      fatigue: 0,
    });
    expect(isFieldedTacticalFormation(parsed.formations[0])).toBe(false);
  });

  it('formation geojson excludes enemy formations outside fog visibility', () => {
    const state = {
      player_faction: 'RBiH',
      fogOfWar: {
        visibleEnemyOsids: ['op:enemy_seen'],
        visibleEnemySectorIds: [],
      },
      controlBySettlement: {
        'op:own': 'RBiH',
        'op:enemy_seen': 'RS',
        'op:enemy_hidden': 'RS',
      },
      formations: [
        { id: 'own_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:own', personnel: 1200 },
        { id: 'enemy_seen', faction: 'RS', name: 'Seen Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:enemy_seen', personnel: 1100 },
        { id: 'enemy_hidden', faction: 'RS', name: 'Hidden Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:enemy_hidden', personnel: 1000 },
      ],
    } as unknown as LoadedGameState;

    const baseGeo = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[18, 44], [18.4, 44], [18.4, 44.4], [18, 44.4], [18, 44]]] }, properties: { osid: 'op:own' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[19, 44], [19.4, 44], [19.4, 44.4], [19, 44.4], [19, 44]]] }, properties: { osid: 'op:enemy_seen' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[20, 44], [20.4, 44], [20.4, 44.4], [20, 44.4], [20, 44]]] }, properties: { osid: 'op:enemy_hidden' } },
      ],
    } as const;

    const geo = buildFormationsGeoJSON(state, baseGeo as any);
    expect(geo.features.map((feature) => feature.properties.id)).toEqual(['enemy_seen', 'own_1']);
  });

  it('formation stack expansion only includes player-visible fielded units', () => {
    const state = {
      player_faction: 'RBiH',
      fogOfWar: {
        visibleEnemyOsids: ['op:shared_seen'],
        visibleEnemySectorIds: [],
      },
      formations: [
        { id: 'own_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:shared_hidden', personnel: 1200 },
        { id: 'hidden_enemy', faction: 'RS', name: 'Hidden Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:shared_hidden', personnel: 1000 },
        { id: 'seen_enemy', faction: 'RS', name: 'Seen Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:shared_seen', personnel: 1100 },
        { id: 'forming_own', faction: 'RBiH', name: 'Forming Own', kind: 'brigade', readiness: 'forming', cohesion: 40, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:shared_hidden', personnel: 300 },
        { id: 'aor_only', faction: 'RBiH', name: 'AoR Only', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:rear', aorSettlementIds: ['op:shared_hidden'], personnel: 900 },
        { id: 'hq_anchor', faction: 'RBiH', name: 'HQ Anchor', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], hq_osid: 'op:shared_hidden', personnel: 900 },
      ],
    } as unknown as LoadedGameState;
    const centroids = new Map<string, [number, number]>([
      ['op:shared_hidden', [18, 44]],
      ['op:shared_seen', [19, 44]],
      ['op:rear', [20, 44]],
    ]);

    expect(getPlayerVisibleFormationStack(state, 'op:shared_hidden', centroids).map((formation) => formation.id)).toEqual(['own_1']);
    expect(getPlayerVisibleFormationStack(state, 'op:shared_seen', centroids).map((formation) => formation.id)).toEqual(['seen_enemy']);
  });

  it('orders expanded visible formation stacks by the same deterministic id order as map markers', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [
        { id: 'z_brigade', faction: 'RBiH', name: 'Z Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:stacked', personnel: 1200 },
        { id: 'a_brigade', faction: 'RBiH', name: 'A Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:stacked', personnel: 1100 },
      ],
    } as unknown as LoadedGameState;
    const centroids = new Map<string, [number, number]>([
      ['op:stacked', [18, 44]],
    ]);

    expect(getPlayerVisibleFormationStack(state, 'op:stacked', centroids).map((formation) => formation.id)).toEqual(['a_brigade', 'z_brigade']);
  });

  it('selected operation lookup refuses to expose enemy operations selected by raw key', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [],
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Own Op', display_name: 'Own Op', type: 'sector_attack', phase: 'planning', started_turn: 1, current_objective_index: 0, objectives: ['osid_a'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Enemy Op', display_name: 'Enemy Op', type: 'sector_attack', phase: 'execution', started_turn: 1, current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
      corpsFrontSectors: [],
    } as unknown as LoadedGameState;

    const enemyOperation = findPlayerFacingOperationByKey(
      state,
      'vrs_1st_krajina|Enemy Op',
    );
    expect(enemyOperation).toBeNull();

    const ownOperation = findPlayerFacingOperationByKey(
      state,
      'arbih_3rd_corps|Own Op',
    );
    expect(ownOperation?.name).toBe('Own Op');
  });

  it('humanizes player-facing fallback labels instead of leaking raw ids', () => {
    expect(getPlayerSafeCorpsName('arbih_3rd_corps', 'arbih_3rd_corps')).toBe('3rd Corps');
    expect(getPlayerSafeCorpsName(null, 'arbih_3rd_corps')).toBe('This corps');
    expect(getPlayerSafeBrigadeName('')).toBe('Assigned brigade');
    expect(getPlayerSafeMunicipalityName('bijeljina_center')).toBe('Bijeljina Center');
    expect(getPlayerSafeEnclaveName('gorazde_east')).toBe('Gorazde East');
    expect(getPlayerSafeDisplayLabel('peace_plan_vance_owen', 'Untitled item')).toBe('Peace Plan Vance Owen');
    expect(getPlayerSafePoliticalFactionName('HRHB')).toBe('Croatian Republic of Herzeg-Bosnia');
    expect(getPlayerSafeMilitaryFactionName('VRS')).toBe('VRS');
    expect(getPlayerSafePoliticalFactionName('unknown')).toBe('Unknown faction');
  });

  it('keeps pending officer event labels player-safe when names are missing', () => {
    const state = {
      meta: { turn: 10, phase: 'war', player_faction: 'RBiH' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          arbih_3rd_corps: { faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps' },
        },
        named_officer_data: [
          { id: 'officer_new', faction: 'RBiH', name: '', competence: 0.6, aggressiveness: 0.4, defensive_skill: 0.5 },
        ],
        pending_officer_events: [
          {
            event_id: 'evt_1',
            type: 'replacement_suggested',
            faction: 'RBiH',
            turn: 10,
            officer_id: 'officer_new',
            current_commander_id: 'officer_old',
            corps_id: 'arbih_3rd_corps',
            acknowledged: false,
          },
        ],
      },
      political: {
        political_controllers: {},
        war_exhaustion: { RBiH: 0.1 },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {},
        civilian_casualties: {},
        sustainability_state: {},
      },
    } as any;

    const parsed = parseGameState(state);
    expect(parsed.pendingOfficerEvents?.[0]?.officer_name).toBe('An officer');
    expect(parsed.pendingOfficerEvents?.[0]?.current_commander_name).toBe('An officer');
    expect(parsed.pendingOfficerEvents?.[0]?.corps_name).toBe('3rd Corps');
  });

  it('keeps Army HQ threat assessment titles player-safe when corps names fall back to ids', () => {
    const state = {
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: 'arbih_3rd_corps', kind: 'corps' },
      ],
      corpsFrontSectors: [
        { sector_id: 'sector:arbih_3rd:0', corps_id: 'arbih_3rd_corps', faction: 'RBiH' },
      ],
      sectorIntel: [
        { friendly_sector_id: 'sector:arbih_3rd:0', offensive_signs: true, confidence: 0.8, strength_category: 'dense' },
      ],
    } as any;

    const [item] = generateThreatAssessment(state, 'RBiH');

    expect(item?.title).toContain('3rd Corps front');
    expect(item?.title).not.toContain('arbih_3rd_corps');
  });

});
