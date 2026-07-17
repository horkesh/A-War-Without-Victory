import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  resolveFormationNavigationAnchor,
  resolveFormationPhysicalLocationOsid,
} from '../../src/ui/map/map/builders/resolveFormationLocationOsid.js';
import {
  resolveMapFormationInspectionTarget,
  resolveMapSectorInspectionTarget,
  resolveMapSettlementInspectionTarget,
} from '../../src/ui/map/map/mapSelectionRouting.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

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
        aorSettlementIds: ['zavidovici_1', 'banovici_1'],
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
    expect(resolveMapSectorInspectionTarget('sector_alpha', loadedState(), { osid: 'sarajevo_1' })).toEqual({
      kind: 'field-sector-in-corps',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
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

  it('keeps command HQ anchors out of physical formation routing', () => {
    expect(resolveMapFormationInspectionTarget('corps_alpha', null, loadedState())).toEqual({
      kind: 'field-formation-in-corps',
      formationId: 'corps_alpha',
      corpsId: 'corps_alpha',
      osid: null,
    });

    expect(resolveMapFormationInspectionTarget('corps_alpha', {
      hq_osid: 'zenica_hq_1',
    }, loadedState())).toEqual({
      kind: 'field-formation-in-corps',
      formationId: 'corps_alpha',
      corpsId: 'corps_alpha',
      osid: null,
    });
  });

  it('separates physical formation locations from navigation anchors', () => {
    const centroidLookup = new Map<string, [number, number]>([
      ['sarajevo_1', [18.4, 43.8]],
      ['banovici_1', [18.5, 44.4]],
      ['zavidovici_1', [18.2, 44.4]],
      ['zenica_hq_1', [17.9, 44.2]],
    ]);
    const state = loadedState();
    const brigade = state.formations.find((formation) => formation.id === 'brigade_alpha');
    const command = state.formations.find((formation) => formation.id === 'corps_alpha');

    expect(resolveFormationPhysicalLocationOsid(brigade, centroidLookup)).toBe('sarajevo_1');
    expect(resolveFormationNavigationAnchor(brigade, centroidLookup)).toEqual({ osid: 'sarajevo_1', source: 'location' });

    expect(resolveFormationPhysicalLocationOsid(command, centroidLookup)).toBeNull();
    expect(resolveFormationNavigationAnchor(command, centroidLookup)).toEqual({ osid: 'banovici_1', source: 'aor' });

    expect(resolveFormationNavigationAnchor({
      ...command!,
      aorSettlementIds: ['missing_aor'],
    }, centroidLookup)).toEqual({ osid: 'zenica_hq_1', source: 'hq' });
  });

  it('does not set selectedOsid when inspecting a command-only formation anchor', () => {
    const store = useGameStore.getState();

    store.inspectOnFieldTarget({
      kind: 'field-formation-in-corps',
      formationId: 'corps_alpha',
      corpsId: 'corps_alpha',
      osid: null,
    });

    const afterCommandInspect = useGameStore.getState();
    expect(afterCommandInspect.selectedFormationId).toBe('corps_alpha');
    expect(afterCommandInspect.selectedCorpsId).toBe('corps_alpha');
    expect(afterCommandInspect.selectedOsid).toBeNull();

    store.inspectOnFieldTarget({
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState().selectedOsid).toBe('sarajevo_1');
  });

  it('keeps MapContainer direct clicks on the field inspection route', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');

    expect(source).toContain('inspectFormationFromMap(id, props)');
    expect(source).toContain('resolveFormationNavigationAnchor(formation, lookup)');
    expect(source).toContain('inspectSectorFromMap(sectorId, props)');
    expect(source).toContain('inspectSectorFromMap(sectorId, null, osid)');
    expect(source).toContain('inspectSettlementFromMap(osid, osidToSector.get(osid))');
    expect(source).toContain("inspectOnField(store, { kind: 'field-settlement', osid })");
    expect(source).not.toContain('resolveMapSettlementInspectionTarget(osid');
    expect(source).toContain("kind: 'field-formation-in-corps'");
    expect(source).not.toMatch(/setSelectedFormationId\(id\)/);
    expect(source).not.toMatch(/contextMenu[\s\S]{0,1200}setSelectedCorpsId\(corpsId\)/);
    expect(source).not.toMatch(/(?:\.|\b)setSelectedCorpsFrontSectorId\(sectorId\)/);
  });

  it('lets selected formations and sectors pan before broad corps bounds', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');
    const formationPanIndex = source.indexOf('resolveFormationNavigationAnchor(formation, lookup)');
    const corpsPanIndex = source.indexOf('const corpsPanKey = `corps:${selectedCorpsId}`');

    expect(formationPanIndex).toBeGreaterThan(-1);
    expect(corpsPanIndex).toBeGreaterThan(-1);
    expect(formationPanIndex).toBeLessThan(corpsPanIndex);
    expect(source).toMatch(/if \(\s*selectedCorpsId\s*&& !selectedFormationId\s*&& !selectedCorpsFrontSectorId/);
  });

  it('keeps physical map builders on physical formation locations only', () => {
    const builderPaths = [
      '../../src/ui/map/map/builders/buildFormationsGeoJSON.ts',
      '../../src/ui/map/map/builders/buildOrderArrowsGeoJSON.ts',
      '../../src/ui/map/map/builders/buildGhostPathsGeoJSON.ts',
    ];

    for (const builderPath of builderPaths) {
      const source = readFileSync(new URL(builderPath, import.meta.url), 'utf8');
      expect(source).toContain('resolveFormationPhysicalLocationOsid');
      expect(source).not.toContain('resolveFormationNavigationAnchor');
    }
  });

  it('keeps generic map selection stack-aware while named counters remain exact', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');
    const helperStart = source.indexOf('function handleFormationCounterSelection(');
    const helperEnd = source.indexOf('/** Layer IDs for front lines', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helper).toContain("selectionIntent: 'stack-aware' | 'exact' = 'stack-aware'");
    expect(helper).toContain("if (selectionIntent === 'stack-aware' && osid && stackCount > 1) {");
    expect(helper).toContain('store.setExpandedStackOsid(osid)');
    expect(helper.indexOf('store.setExpandedStackOsid(osid)')).toBeLessThan(
      helper.indexOf('inspectMarkerContactOrFormation(formationId, properties)'),
    );
    expect(source).toContain("onCounterSelect: (item, intent) => handleFormationCounterSelection(item.id, item.properties, intent)");

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

  it('limits both nearest-formation fallbacks to current visible viewport counters', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');
    const fallbackHelperStart = source.indexOf('const getVisibleFormationClickFallback =');
    const fallbackHelperEnd = source.indexOf('const applyDeckLayerSelection =', fallbackHelperStart);
    const fallbackHelper = source.slice(fallbackHelperStart, fallbackHelperEnd);
    const deckFallbackStart = source.indexOf('const formationFallback =');
    const deckFallbackEnd = source.indexOf('const frontFeature =', deckFallbackStart);
    const deckFallback = source.slice(deckFallbackStart, deckFallbackEnd);
    const mapLibreFallbackStart = source.indexOf('getFormationClickFallback: (point) => {');
    const mapLibreFallbackEnd = source.indexOf('onOsidClick:', mapLibreFallbackStart);
    const mapLibreFallback = source.slice(mapLibreFallbackStart, mapLibreFallbackEnd);

    expect(source).toContain('buildFormationCounterDomOverlayItems');
    expect(source).toContain('visibleFormationCounterItemsRef.current = buildFormationCounterDomOverlayItems(args)');
    expect(fallbackHelperStart).toBeGreaterThan(-1);
    expect(fallbackHelper).toContain('if (!currentMapStateReadyRef.current || !useGameStore.getState().formationsVisible) return null;');
    expect(fallbackHelper).toContain('items: visibleFormationCounterItemsRef.current');
    expect(deckFallback).toContain('getVisibleFormationClickFallback({ x: info.x, y: info.y })');
    expect(deckFallback).not.toContain('lastFormationsGeoJsonRef.current.features');
    expect(mapLibreFallback).toContain('return getVisibleFormationClickFallback(point);');
    expect(mapLibreFallback).not.toContain('lastFormationsGeoJsonRef.current.features');
  });

  it('does not retain direct attack-mode confirmation routing in the presidential command model', () => {
    const source = readFileSync(new URL('../../src/ui/map/map/MapContainer.tsx', import.meta.url), 'utf8');

    expect(source).not.toContain("setLoadError(t('map.attack.selectTarget'))");
    expect(source).not.toContain('setPendingAttackConfirmation(');
  });
});
