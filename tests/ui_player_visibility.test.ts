import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, current_objective_index: 0, objectives: ['osid_a'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
    } as unknown as LoadedGameState;

    expect(filterPlayerFacingFormations(state).map((f) => f.id)).toEqual(['arbih_3rd_corps']);
    expect(filterPlayerFacingSectors(state).map((s) => s.sector_id)).toEqual(['s_1']);
    expect(filterPlayerFacingOperations(state).map((o) => o.name)).toEqual(['Op Tuzla']);
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
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, staging_osid: 'osid_a', current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, staging_osid: 'osid_c', current_objective_index: 0, objectives: ['osid_d'], participating_brigade_count: 1 },
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

  it('selected operation lookup refuses to expose enemy operations selected by raw key', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [],
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Own Op', type: 'sector_attack', phase: 'planning', started_turn: 1, current_objective_index: 0, objectives: ['osid_a'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Enemy Op', type: 'sector_attack', phase: 'execution', started_turn: 1, current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
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
      meta: { turn: 10, phase: 'war' },
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

  it('keeps the bottom status strip player-safe instead of acting as an all-faction territory scoreboard', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/BottomStatusStrip.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('Hostile-held');
    expect(source).toContain('Friendly');
    expect(source).not.toContain('orderedFactions.map');
  });

  it('keeps summary shells player-safe instead of showing raw faction ids', () => {
    const situationTabSource = readFileSync(
      new URL('../src/ui/map/components/SituationTab.tsx', import.meta.url),
      'utf8',
    );
    expect(situationTabSource).toContain('Alliance Gauge (Bosniak-Croat)');
    expect(situationTabSource).toContain('getPlayerSafeMilitaryFactionName');

    const warSummarySource = readFileSync(
      new URL('../src/ui/map/components/army_hq/WarSummaryContent.tsx', import.meta.url),
      'utf8',
    );
    expect(warSummarySource).toContain('const { playerFaction, areaPct, personnelByFaction, totalDisplaced, displacedByFaction } = data;');
    expect(warSummarySource).toContain('getPlayerSafeMilitaryFactionName');
  });

  it('keeps the strategic dashboard player-safe when opened from the live bottom strip', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/StrategicDashboard.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('Enemy control remains aggregated here.');
    expect(source).toContain('Hostile-held');
    expect(source).toContain('Enemy losses remain part of staff reporting and records');
  });
});
