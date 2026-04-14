import { describe, expect, it } from 'vitest';
import { buildDisplayFrontEdgeOwnership } from '../src/ui/map/map/builders/displayFrontEdgeOwnership.js';
import type { CorpsFrontSectorView } from '../src/ui/map/data/types.js';

describe('front edge ownership completion', () => {
  it('restores missing faction-side front edges to an existing sector owner', () => {
    const sector: CorpsFrontSectorView = {
      sector_id: 'sector:arbih_1st_corps:2',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      display_name: 'Foča',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      edge_ids: ['op:foca:donje_zesce__op:foca:ustikolina'],
      sub_segments: [{
        sub_segment_id: 'subseg:arbih_1st_corps:2',
        edge_ids: ['op:foca:donje_zesce__op:foca:ustikolina'],
        friendly_osids: ['op:foca:donje_zesce'],
        enemy_osids: ['op:foca:ustikolina'],
        length_edges: 1,
        primary_brigade_ids: [],
      }],
      length_edges: 1,
      territory_osids: ['op:foca:donje_zesce'],
      assigned_brigade_ids: ['arbih_801st_light'],
      reserve_brigade_ids: [],
      density: 1,
      threat_ratio: 1,
      defensive_power: 100,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };

    const osidFrontEdges = [
      {
        edge_id: 'op:foca:donje_zesce__op:foca:ustikolina',
        a: 'op:foca:donje_zesce',
        b: 'op:foca:ustikolina',
        side_a: 'RBiH',
        side_b: 'RS',
      },
      {
        edge_id: 'op:foca:donje_zesce__op:pale:podgrab',
        a: 'op:foca:donje_zesce',
        b: 'op:pale:podgrab',
        side_a: 'RBiH',
        side_b: 'RS',
      },
    ];
    const state = {
      political: {
        political_controllers: {
          'op:foca:donje_zesce': 'RBiH',
          'op:foca:ustikolina': 'RS',
          'op:pale:podgrab': 'RS',
        },
      },
    } as any;
    const adjacency = new Map([
      ['op:foca:donje_zesce', ['op:foca:ustikolina', 'op:pale:podgrab']],
      ['op:foca:ustikolina', ['op:foca:donje_zesce']],
      ['op:pale:podgrab', ['op:foca:donje_zesce']],
    ]);

    const ownership = buildDisplayFrontEdgeOwnership(
      [sector],
      osidFrontEdges,
      new Map(Object.entries(state.political.political_controllers)),
      adjacency,
    );

    expect(ownership.sectorByEdgeAndFaction.get('op:foca:donje_zesce__op:pale:podgrab\0RBiH')).toBe(sector);
    expect(ownership.corpsByEdgeAndFaction.get('op:foca:donje_zesce__op:pale:podgrab\0RBiH')).toBe('arbih_1st_corps');
    expect(ownership.subSegmentByEdgeAndFaction.get('op:foca:donje_zesce__op:foca:ustikolina\0RBiH')).toBe('subseg:arbih_1st_corps:2');
  });

  it('reattaches an orphan front edge to the nearest surviving same-faction sector', () => {
    const sector: CorpsFrontSectorView = {
      sector_id: 'sector:arbih_1st_corps:0',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      display_name: 'Goražde',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      edge_ids: [],
      sub_segments: [],
      length_edges: 0,
      territory_osids: ['op:gorazde:faocici_2'],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      density: 0,
      threat_ratio: 0,
      defensive_power: 0,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 0,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const osidFrontEdges = [{
      edge_id: 'op:foca:donje_zesce__op:pale:podgrab',
      a: 'op:foca:donje_zesce',
      b: 'op:pale:podgrab',
      side_a: 'RBiH',
      side_b: 'RS',
    }];
    const state = {
      political: {
        political_controllers: {
          'op:foca:donje_zesce': 'RBiH',
          'op:gorazde:faocici_2': 'RBiH',
          'op:gorazde:hrancici': 'RBiH',
          'op:pale:podgrab': 'RS',
        },
      },
    } as any;
    const adjacency = new Map([
      ['op:foca:donje_zesce', ['op:gorazde:hrancici']],
      ['op:gorazde:hrancici', ['op:foca:donje_zesce', 'op:gorazde:faocici_2']],
      ['op:gorazde:faocici_2', ['op:gorazde:hrancici']],
      ['op:pale:podgrab', ['op:foca:donje_zesce']],
    ]);

    const ownership = buildDisplayFrontEdgeOwnership(
      [sector],
      osidFrontEdges,
      new Map(Object.entries(state.political.political_controllers)),
      adjacency,
    );

    expect(ownership.sectorByEdgeAndFaction.get('op:foca:donje_zesce__op:pale:podgrab\0RBiH')).toBe(sector);
    expect(ownership.corpsByEdgeAndFaction.get('op:foca:donje_zesce__op:pale:podgrab\0RBiH')).toBe('arbih_1st_corps');
  });

  it('falls back to the nearest same-faction sector when no friendly-territory path exists', () => {
    const sector: CorpsFrontSectorView = {
      sector_id: 'sector:hrhb_herzegovina:0',
      corps_id: 'hvo_herzegovina',
      corps_name: 'Herzegovina',
      display_name: 'Trebinje',
      faction: 'HRHB',
      opposing_factions: ['RBiH'],
      edge_ids: ['op:trebinje:ivanica__op:trebinje:zakovo_2'],
      sub_segments: [{
        sub_segment_id: 'subseg:hvo_herzegovina:0',
        edge_ids: ['op:trebinje:ivanica__op:trebinje:zakovo_2'],
        friendly_osids: ['op:trebinje:ivanica'],
        enemy_osids: ['op:trebinje:zakovo_2'],
        length_edges: 1,
        primary_brigade_ids: [],
      }],
      length_edges: 1,
      territory_osids: ['op:trebinje:ivanica'],
      assigned_brigade_ids: ['hvo_herzegovina_brigade'],
      reserve_brigade_ids: [],
      density: 1,
      threat_ratio: 1,
      defensive_power: 100,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const osidFrontEdges = [{
      edge_id: 'op:konjic:bijela_2__op:konjic:turija',
      a: 'op:konjic:bijela_2',
      b: 'op:konjic:turija',
      side_a: 'RBiH',
      side_b: 'HRHB',
    }];
    const state = {
      political: {
        political_controllers: {
          'op:konjic:bijela_2': 'RBiH',
          'op:konjic:turija': 'HRHB',
          'op:konjic:neutral_gap': 'RBiH',
          'op:trebinje:ivanica': 'HRHB',
        },
      },
    } as any;
    const adjacency = new Map([
      ['op:konjic:bijela_2', ['op:konjic:turija']],
      ['op:konjic:turija', ['op:konjic:bijela_2', 'op:konjic:neutral_gap']],
      ['op:konjic:neutral_gap', ['op:konjic:turija', 'op:trebinje:ivanica']],
      ['op:trebinje:ivanica', ['op:konjic:neutral_gap']],
    ]);

    const ownership = buildDisplayFrontEdgeOwnership(
      [sector],
      osidFrontEdges,
      new Map(Object.entries(state.political.political_controllers)),
      adjacency,
    );

    expect(ownership.sectorByEdgeAndFaction.get('op:konjic:bijela_2__op:konjic:turija\0HRHB')).toBe(sector);
    expect(ownership.corpsByEdgeAndFaction.get('op:konjic:bijela_2__op:konjic:turija\0HRHB')).toBe('hvo_herzegovina');
    expect(ownership.subSegmentByEdgeAndFaction.has('op:konjic:bijela_2__op:konjic:turija\0HRHB')).toBe(false);
  });

  it('demotes rear-only sibling sectors behind a staffed same-corps front owner', () => {
    const staffedSector: CorpsFrontSectorView = {
      sector_id: 'sector:vrs_test:0',
      corps_id: 'vrs_test_corps',
      corps_name: 'Test Corps',
      display_name: 'Forward Line',
      faction: 'RS',
      opposing_factions: ['RBiH'],
      edge_ids: ['op:test:forward__op:test:enemy_a'],
      sub_segments: [{
        sub_segment_id: 'subseg:vrs_test:0',
        edge_ids: ['op:test:forward__op:test:enemy_a'],
        friendly_osids: ['op:test:forward'],
        enemy_osids: ['op:test:enemy_a'],
        length_edges: 1,
        primary_brigade_ids: ['rs_front_brigade'],
      }],
      length_edges: 1,
      territory_osids: ['op:test:forward'],
      assigned_brigade_ids: ['rs_front_brigade'],
      reserve_brigade_ids: [],
      density: 1,
      threat_ratio: 1,
      defensive_power: 100,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const rearOnlySector: CorpsFrontSectorView = {
      sector_id: 'sector:vrs_test:1',
      corps_id: 'vrs_test_corps',
      corps_name: 'Test Corps',
      display_name: 'Rear Stub',
      faction: 'RS',
      opposing_factions: ['RBiH'],
      edge_ids: ['op:test:forward__op:test:enemy_b'],
      sub_segments: [{
        sub_segment_id: 'subseg:vrs_test:1',
        edge_ids: ['op:test:forward__op:test:enemy_b'],
        friendly_osids: ['op:test:forward'],
        enemy_osids: ['op:test:enemy_b'],
        length_edges: 1,
        primary_brigade_ids: [],
      }],
      length_edges: 1,
      territory_osids: ['op:test:forward'],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['rs_rear_brigade'],
      density: 0,
      threat_ratio: 1,
      defensive_power: 0,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const osidFrontEdges = [
      {
        edge_id: 'op:test:forward__op:test:enemy_a',
        a: 'op:test:forward',
        b: 'op:test:enemy_a',
        side_a: 'RS',
        side_b: 'RBiH',
      },
      {
        edge_id: 'op:test:forward__op:test:enemy_b',
        a: 'op:test:forward',
        b: 'op:test:enemy_b',
        side_a: 'RS',
        side_b: 'RBiH',
      },
    ];
    const controllerMap = new Map<string, string | null>([
      ['op:test:forward', 'RS'],
      ['op:test:enemy_a', 'RBiH'],
      ['op:test:enemy_b', 'RBiH'],
    ]);
    const adjacency = new Map<string, string[]>([
      ['op:test:forward', ['op:test:enemy_a', 'op:test:enemy_b']],
      ['op:test:enemy_a', ['op:test:forward']],
      ['op:test:enemy_b', ['op:test:forward']],
    ]);

    const ownership = buildDisplayFrontEdgeOwnership(
      [staffedSector, rearOnlySector],
      osidFrontEdges,
      controllerMap,
      adjacency,
    );

    expect(ownership.sectorByEdgeAndFaction.get('op:test:forward__op:test:enemy_b\0RS')).toBe(staffedSector);
    expect(ownership.corpsByEdgeAndFaction.get('op:test:forward__op:test:enemy_b\0RS')).toBe('vrs_test_corps');
  });

  it('walks outward from a rear-only front stub to the nearest staffed same-faction owner', () => {
    const staffedSector: CorpsFrontSectorView = {
      sector_id: 'sector:vrs_test:0',
      corps_id: 'vrs_test_corps',
      corps_name: 'Test Corps',
      display_name: 'Anchor',
      faction: 'RS',
      opposing_factions: ['RBiH'],
      edge_ids: ['op:test:anchor__op:test:enemy_anchor'],
      sub_segments: [{
        sub_segment_id: 'subseg:vrs_test:0',
        edge_ids: ['op:test:anchor__op:test:enemy_anchor'],
        friendly_osids: ['op:test:anchor'],
        enemy_osids: ['op:test:enemy_anchor'],
        length_edges: 1,
        primary_brigade_ids: ['rs_anchor'],
      }],
      length_edges: 1,
      territory_osids: ['op:test:anchor'],
      assigned_brigade_ids: ['rs_anchor'],
      reserve_brigade_ids: [],
      density: 1,
      threat_ratio: 1,
      defensive_power: 100,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const rearOnlyStub: CorpsFrontSectorView = {
      sector_id: 'sector:vrs_test:1',
      corps_id: 'vrs_test_corps',
      corps_name: 'Test Corps',
      display_name: 'Stub',
      faction: 'RS',
      opposing_factions: ['RBiH'],
      edge_ids: ['op:test:stub__op:test:enemy_stub'],
      sub_segments: [{
        sub_segment_id: 'subseg:vrs_test:1',
        edge_ids: ['op:test:stub__op:test:enemy_stub'],
        friendly_osids: ['op:test:stub'],
        enemy_osids: ['op:test:enemy_stub'],
        length_edges: 1,
        primary_brigade_ids: [],
      }],
      length_edges: 1,
      territory_osids: ['op:test:stub'],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['rs_rear_stub'],
      density: 0,
      threat_ratio: 1,
      defensive_power: 0,
      intel_confidence: 1,
      offensive_signs: false,
      sub_segment_count: 1,
      sector_stance: 'defend',
      stance_source: 'bot',
    };
    const osidFrontEdges = [
      {
        edge_id: 'op:test:anchor__op:test:enemy_anchor',
        a: 'op:test:anchor',
        b: 'op:test:enemy_anchor',
        side_a: 'RS',
        side_b: 'RBiH',
      },
      {
        edge_id: 'op:test:stub__op:test:enemy_stub',
        a: 'op:test:stub',
        b: 'op:test:enemy_stub',
        side_a: 'RS',
        side_b: 'RBiH',
      },
    ];
    const controllerMap = new Map<string, string | null>([
      ['op:test:anchor', 'RS'],
      ['op:test:bridge', 'RS'],
      ['op:test:stub', 'RS'],
      ['op:test:enemy_anchor', 'RBiH'],
      ['op:test:enemy_stub', 'RBiH'],
    ]);
    const adjacency = new Map<string, string[]>([
      ['op:test:anchor', ['op:test:bridge', 'op:test:enemy_anchor']],
      ['op:test:bridge', ['op:test:anchor', 'op:test:stub']],
      ['op:test:stub', ['op:test:bridge', 'op:test:enemy_stub']],
      ['op:test:enemy_anchor', ['op:test:anchor']],
      ['op:test:enemy_stub', ['op:test:stub']],
    ]);

    const ownership = buildDisplayFrontEdgeOwnership(
      [staffedSector, rearOnlyStub],
      osidFrontEdges,
      controllerMap,
      adjacency,
    );

    expect(ownership.sectorByEdgeAndFaction.get('op:test:stub__op:test:enemy_stub\0RS')).toBe(staffedSector);
    expect(ownership.corpsByEdgeAndFaction.get('op:test:stub__op:test:enemy_stub\0RS')).toBe('vrs_test_corps');
  });
});
