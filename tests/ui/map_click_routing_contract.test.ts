import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  resolveMapFormationInspectionTarget,
  resolveMapSectorInspectionTarget,
  resolveMapSettlementInspectionTarget,
} from '../../src/ui/map/map/mapSelectionRouting.js';

function loadedState(): LoadedGameState {
  return {
    label: 'test',
    turn: 1,
    phase: 'war',
    formations: [
      {
        id: 'brigade_alpha',
        faction: 'RBiH',
        name: 'Alpha Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'corps_alpha',
        location_osid: 'sarajevo_1',
        sectorOverrideId: 'sector_south',
      },
      {
        id: 'brigade_bravo',
        faction: 'RBiH',
        name: 'Bravo Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'corps_bravo',
        location_osid: 'tuzla_1',
      },
      {
        id: 'corps_alpha',
        faction: 'RBiH',
        name: 'Alpha Corps',
        kind: 'corps_asset',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        hq_osid: 'zenica_hq_1',
      },
    ],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    corpsFrontSectors: [
      {
        sector_id: 'sector_alpha',
        corps_id: 'corps_alpha',
        corps_name: 'Alpha Corps',
        display_name: 'Alpha Sector',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_1'],
        territory_osids: ['sarajevo_1'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: ['brigade_alpha'],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
      },
      {
        sector_id: 'sector_south',
        corps_id: 'corps_alpha',
        corps_name: 'Alpha Corps',
        display_name: 'South Sector',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_2'],
        territory_osids: ['sarajevo_2'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
      },
    ],
    frontEdgesOsid: [
      {
        edge_id: 'edge_1',
        a: 'sarajevo_1',
        b: 'pale_1',
        side_a: 'RBiH',
        side_b: 'RS',
      },
    ],
  } as unknown as LoadedGameState;
}

describe('direct tactical map click routing', () => {
  it('routes sector clicks with known corps context through the compound sector target', () => {
    expect(resolveMapSectorInspectionTarget('sector_alpha', loadedState())).toEqual({
      kind: 'field-sector-in-corps',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
    });
  });

  it('routes settlement clicks with known sector and corps context through the compound sector target', () => {
    expect(resolveMapSettlementInspectionTarget('sarajevo_1', loadedState())).toEqual({
      kind: 'field-sector-in-corps',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });

    expect(resolveMapSettlementInspectionTarget('unknown_osid', loadedState())).toEqual({
      kind: 'field-settlement',
      osid: 'unknown_osid',
    });
  });

  it('routes formation marker clicks through sector context before falling back to corps context', () => {
    expect(resolveMapFormationInspectionTarget('brigade_alpha', {
      sector_id: 'sector_alpha',
      corps_id: 'corps_alpha',
      location_osid: 'sarajevo_1',
    }, loadedState())).toEqual({
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });

    expect(resolveMapFormationInspectionTarget('brigade_bravo', {
      corps_id: 'corps_bravo',
      location_osid: 'tuzla_1',
    }, loadedState())).toEqual({
      kind: 'field-formation-in-corps',
      formationId: 'brigade_bravo',
      corpsId: 'corps_bravo',
      osid: 'tuzla_1',
    });
  });

  it('resolves stack clicks from loaded formation and sector state when marker props are absent', () => {
    expect(resolveMapFormationInspectionTarget('brigade_alpha', null, loadedState())).toEqual({
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_south',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });
  });

  it('uses command HQ anchors for command formations without tactical location_osid', () => {
    expect(resolveMapFormationInspectionTarget('corps_alpha', null, loadedState())).toEqual({
      kind: 'field-formation-at-settlement',
      formationId: 'corps_alpha',
      osid: 'zenica_hq_1',
    });
  });

  it('keeps MapContainer direct clicks on the field inspection route', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');

    expect(source).toContain('inspectFormationFromMap(id, props)');
    expect(source).toContain('inspectSectorFromMap(sectorId, props)');
    expect(source).toContain('inspectSectorFromMap(sectorId, null, osid)');
    expect(source).toContain('inspectSettlementFromMap(osid, osidToSector.get(osid))');
    expect(source).toContain("kind: 'field-formation-in-corps'");
    expect(source).not.toMatch(/setSelectedFormationId\(id\)/);
    expect(source).not.toMatch(/contextMenu[\s\S]{0,1200}setSelectedCorpsId\(corpsId\)/);
    expect(source).not.toMatch(/(?:\.|\b)setSelectedCorpsFrontSectorId\(sectorId\)/);
  });

  it('opens the stack chooser before inspecting a formation from stacked counters', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');
    const deckStackBranchStart = source.indexOf('const stackCount = typeof props.stack_count');
    const deckStackBranchEnd = source.indexOf('map.addControl(deckOverlay)', deckStackBranchStart);
    const deckStackBranch = source.slice(deckStackBranchStart, deckStackBranchEnd);

    expect(deckStackBranchStart).toBeGreaterThan(-1);
    expect(deckStackBranch).toContain('if (osid && stackCount > 1) {');
    expect(deckStackBranch).toContain('store.setExpandedStackOsid(osid)');
    expect(deckStackBranch.indexOf('store.setExpandedStackOsid(osid)')).toBeLessThan(
      deckStackBranch.indexOf('inspectFormationFromMap(clickTarget.formationId, props)'),
    );

    const mapLibreHandlerStart = source.indexOf('onFormationClick: (id, props, point) => {');
    const mapLibreHandlerEnd = source.indexOf('onFrontEdgeClick:', mapLibreHandlerStart);
    const mapLibreHandler = source.slice(mapLibreHandlerStart, mapLibreHandlerEnd);

    expect(mapLibreHandlerStart).toBeGreaterThan(-1);
    expect(mapLibreHandler).toContain('if (stackSize > 1) {');
    expect(mapLibreHandler).toContain('setExpandedStackOsid(osid)');
    expect(mapLibreHandler.indexOf('setExpandedStackOsid(osid)')).toBeLessThan(
      mapLibreHandler.indexOf('inspectFormationFromMap(id, props)'),
    );
  });

  it('rejects empty attack-mode clicks before creating an attack confirmation', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');

    expect(source).toContain("if (!osid) {");
    expect(source).toContain("setLoadError(t('map.attack.selectTarget'))");
    expect(source.indexOf("setLoadError(t('map.attack.selectTarget'))")).toBeLessThan(
      source.indexOf('setPendingAttackConfirmation({ attackerFormationId: selectedFormationId, targetOsid: osid })'),
    );
  });
});
