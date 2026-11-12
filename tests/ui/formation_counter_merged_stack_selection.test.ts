// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { buildFormationCounterDomOverlayItems } from '../../src/ui/map/layers/formationCounterDomOverlay.js';
import { buildFormationCounterDeckRows } from '../../src/ui/map/layers/buildTacticalDeckLayers.js';
import { layoutFormationCounters } from '../../src/ui/map/layers/formationCounterLayout.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

// Codex review on #567: when nearby same-side stacks merge, the badge counts the merged
// formations but selection used to open only the top stack's settlement. Both selection
// paths must carry the displayed count and the merged settlements.

function counter(id: string, osid: string, stackIndex: number, stackCount: number) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [17.8, 44.1] },
    properties: {
      id,
      name: `Formation ${id}`,
      icon_id: `icon-${id}`,
      location_osid: osid,
      stack_index: stackIndex,
      stack_count: stackCount,
      is_stack_top: stackIndex === 0,
    },
  };
}

// Eight two-counter stacks at different settlements that all project to one point, so the
// layout has to merge some of them rather than bury one another.
const features = Array.from({ length: 8 }, (_, stack) => [
  counter(`s${stack}a`, `op:test:s${stack}`, 0, 2),
  counter(`s${stack}b`, `op:test:s${stack}`, 1, 2),
]).flat();

const viewportClip = {
  width: 800,
  height: 600,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
  project: () => ({ x: 400, y: 300 }),
};

describe('merged counter stacks open every formation their badge counts', () => {
  it('the layout does merge stacks in this fixture', () => {
    const layout = layoutFormationCounters(features as any, 24, viewportClip as any);
    expect(layout.stacks.some((stack) => stack.mergedOsids.length > 0)).toBe(true);
  });

  it('DOM counters carry the displayed count and the merged settlements', () => {
    const items = buildFormationCounterDomOverlayItems({
      formationsGeoJson: { type: 'FeatureCollection', features } as any,
      formationsVisible: true,
      zoom: 10,
      viewportClip: viewportClip as any,
    });
    const merged = items.filter((item) => (item.properties.merged_osids as string[]).length > 0);
    expect(merged.length).toBeGreaterThan(0);
    for (const item of merged) {
      expect(item.properties.stack_count).toBe(item.stackCount);
      expect(item.stackCount).toBeGreaterThan(2);
      expect(item.properties.merged_osids).not.toContain(item.locationOsid);
    }
  });

  it('Deck badge rows carry the displayed count and the merged settlements', () => {
    const layout = layoutFormationCounters(features as any, 24, viewportClip as any);
    const { rows } = buildFormationCounterDeckRows(layout);
    const mergedBadges = rows.filter((row) => (
      row.properties?.counter_role === 'stack-badge'
      && Array.isArray(row.properties?.merged_osids)
      && (row.properties.merged_osids as string[]).length > 0
    ));
    expect(mergedBadges.length).toBeGreaterThan(0);
    for (const badge of mergedBadges) {
      expect(Number(badge.properties?.stack_count)).toBeGreaterThan(2);
    }
  });

  it('the store keeps the merged settlements with the expanded stack and clears them with it', () => {
    const store = useGameStore.getState();
    store.setExpandedStackOsid('op:test:s0', ['op:test:s3', 'op:test:s0', 'op:test:s1', 'op:test:s3']);
    expect(useGameStore.getState().expandedStackOsid).toBe('op:test:s0');
    expect(useGameStore.getState().expandedStackMergedOsids).toEqual(['op:test:s1', 'op:test:s3']);
    store.setExpandedStackOsid('op:test:s2');
    expect(useGameStore.getState().expandedStackMergedOsids).toEqual([]);
    store.setExpandedStackOsid('op:test:s0', ['op:test:s1']);
    store.setExpandedStackOsid(null);
    expect(useGameStore.getState().expandedStackOsid).toBeNull();
    expect(useGameStore.getState().expandedStackMergedOsids).toEqual([]);
  });
});
