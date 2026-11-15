// @vitest-environment jsdom
/**
 * OSM credit (ODbL) stays visible: each of the two plates is drawn only while nothing covers it, and
 * one of them is always drawn. The presidential inbox's cards used to sit over the minimap's credit
 * (the QA harness reads a covered text node as occluded and stopped runs at week 3-5).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { osmCreditPlates, useOsmCreditPlates } from '../../src/ui/map/components/OsmAttribution';
import type { PanelRailPanel } from '../../src/ui/map/components/panelRail';
import { useGameStore } from '../../src/ui/map/store/gameStore';

const ALL_PANELS: Array<PanelRailPanel | null> = [
  null, 'inbox', 'settlement', 'formation', 'corps', 'army', 'army_reserve', 'sector', 'operation', 'orbat',
];
const LEFT_RAIL_PANELS: PanelRailPanel[] = ['settlement', 'formation', 'corps', 'army_reserve', 'sector', 'operation', 'orbat'];

afterEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
});

describe('osmCreditPlates', () => {
  it('draws only the war-map credit while the presidential inbox covers the minimap corner', () => {
    expect(osmCreditPlates({ panel: 'inbox', detailRailsVisible: true, operationsPanelOpen: false }))
      .toEqual({ warMap: true, minimap: false });
  });

  it('draws only the minimap credit while an entity rail covers the war-map credit column', () => {
    for (const panel of LEFT_RAIL_PANELS) {
      expect(osmCreditPlates({ panel, detailRailsVisible: true, operationsPanelOpen: false }), panel)
        .toEqual({ warMap: false, minimap: true });
    }
  });

  it('draws the war-map credit while the Operations panel covers the minimap corner', () => {
    expect(osmCreditPlates({ panel: 'inbox', detailRailsVisible: false, operationsPanelOpen: true }))
      .toEqual({ warMap: true, minimap: false });
  });

  it('draws both when no rail is open', () => {
    expect(osmCreditPlates({ panel: null, detailRailsVisible: true, operationsPanelOpen: false }))
      .toEqual({ warMap: true, minimap: true });
  });

  it('always draws at least one credit, in every rail state', () => {
    for (const panel of ALL_PANELS) {
      for (const detailRailsVisible of [true, false]) {
        for (const operationsPanelOpen of [true, false]) {
          // The Operations panel closes the detail rails (shouldRenderTacticalDetailRails).
          if (operationsPanelOpen && detailRailsVisible) continue;
          const plates = osmCreditPlates({ panel, detailRailsVisible, operationsPanelOpen });
          expect(plates.warMap || plates.minimap, `${String(panel)} rails=${detailRailsVisible} ops=${operationsPanelOpen}`).toBe(true);
        }
      }
    }
  });
});

describe('useOsmCreditPlates (reads the game store)', () => {
  it('starts on the inbox: war-map credit only', () => {
    const { result } = renderHook(() => useOsmCreditPlates());
    expect(result.current).toEqual({ warMap: true, minimap: false });
  });

  it('swaps to the minimap credit when a unit rail opens, and back', () => {
    const { result } = renderHook(() => useOsmCreditPlates());
    act(() => { useGameStore.setState({ selectedOsid: 'op:test:a' }); });
    expect(result.current).toEqual({ warMap: false, minimap: true });
    act(() => { useGameStore.setState({ selectedOsid: null }); });
    expect(result.current).toEqual({ warMap: true, minimap: false });
  });

  it('keeps the war-map credit when the Operations panel opens over a selection', () => {
    const { result } = renderHook(() => useOsmCreditPlates());
    act(() => { useGameStore.setState({ selectedOsid: 'op:test:a', isOperationsPanelOpen: true }); });
    expect(result.current).toEqual({ warMap: true, minimap: false });
  });
});

describe('where the credits are mounted', () => {
  it('mounts each plate only when its credit is visible', () => {
    const mapSource = readFileSync(join(process.cwd(), 'src/ui/map/map/MapContainer.tsx'), 'utf8');
    const minimapSource = readFileSync(join(process.cwd(), 'src/ui/map/components/Minimap.tsx'), 'utf8');
    expect(mapSource).toContain('osmCreditPlates.warMap && <OsmAttribution placement="war-map" />');
    expect(minimapSource).toContain('creditPlates.minimap && <OsmAttribution placement="minimap" />');
  });
});
