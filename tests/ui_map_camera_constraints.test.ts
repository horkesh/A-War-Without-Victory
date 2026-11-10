import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tactical map camera constraints', () => {
  const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

  it('starts and resets the map at the fixed 30 degree tactical pitch', () => {
    expect(source).toContain('const TACTICAL_MAP_PITCH_DEGREES = 30;');
    expect(source).toContain('pitch: TACTICAL_MAP_PITCH_DEGREES');
    expect(source).toContain('minPitch: TACTICAL_MAP_PITCH_DEGREES');
    expect(source).toContain('maxPitch: TACTICAL_MAP_PITCH_DEGREES');
  });

  it('constrains panning to the operational Bosnia and Herzegovina data bounds', () => {
    expect(source).toContain('const BOSNIA_MAX_BOUNDS');
    expect(source).toContain('[15.45, 42.55719]');
    expect(source).toContain('[19.92, 45.270542]');
    // North–south panning stays on these bounds; east–west widens to the window's shape
    // so a wide, short screen can zoom out to the whole country (R8, 2026-11-10).
    expect(source).toContain('maxBounds: aspectFittedMaxBounds(BOSNIA_MAX_BOUNDS, mapContainer.clientWidth, mapContainer.clientHeight)');
    expect(source).toContain("map.on('resize', () => {");
    expect(source).toContain('if (!map.getMaxBounds()) return;');
  });

  it('fits the bounds to the window shape without changing their north–south extent', async () => {
    const { aspectFittedMaxBounds } = await import('../src/ui/map/map/aspectFittedBounds.js');
    const base: [[number, number], [number, number]] = [[15.45, 42.55719], [19.92, 45.270542]];
    // Narrow window: unchanged.
    expect(aspectFittedMaxBounds(base, 800, 900)).toEqual(base);
    // The owner's 2293 × 960 ultrawide: widened east and west only, symmetrically.
    const wide = aspectFittedMaxBounds(base, 2293, 960);
    expect(wide[0][1]).toBe(base[0][1]);
    expect(wide[1][1]).toBe(base[1][1]);
    expect(wide[0][0]).toBeLessThan(base[0][0]);
    expect(wide[1][0]).toBeGreaterThan(base[1][0]);
    expect(base[0][0] - wide[0][0]).toBeCloseTo(wide[1][0] - base[1][0], 9);
    // Degenerate sizes leave the bounds alone.
    expect(aspectFittedMaxBounds(base, 0, 960)).toEqual(base);
  });

  it('allows zooming out far enough to fit the country on a short window', () => {
    expect(source).toContain('const TACTICAL_MAP_MIN_ZOOM = 6.3;');
    expect(source).toContain('minZoom: TACTICAL_MAP_MIN_ZOOM');
    expect(source).not.toContain('minZoom: 7.8');
  });

  it('disables user pitch and rotate gestures so the fixed tactical angle is stable', () => {
    expect(source).toContain('dragRotate: false');
    expect(source).toContain('touchPitch: false');
  });

  it('direct map formation clicks route through field inspection instead of bare setters', () => {
    expect(source).toContain('function inspectFormationFromMap(formationId: string');
    expect(source).toContain('resolveMapFormationInspectionTarget(formationId, properties, store.loadedGameState)');
    expect(source).not.toContain('function selectFormationFromMap(formationId: string)');
    expect(source).not.toContain('useGameStore.getState().setSelectedFormationId(formationId)');
    const storeSource = readFileSync('src/ui/map/store/gameStore.ts', 'utf8');
    expect(storeSource).toContain('inspectOnFieldTarget: (target) => {');
    expect(storeSource).toContain("if (target.kind === 'field-formation-in-sector')");
    expect(storeSource).toContain('selectedFormationId: target.formationId');
  });
});
