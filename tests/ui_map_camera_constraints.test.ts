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
    expect(source).toContain('maxBounds: BOSNIA_MAX_BOUNDS');
  });

  it('disables user pitch and rotate gestures so the fixed tactical angle is stable', () => {
    expect(source).toContain('dragRotate: false');
    expect(source).toContain('touchPitch: false');
  });

  it('direct map formation clicks clear OSID and sector rail context', () => {
    expect(source).toContain('function selectFormationFromMap(formationId: string)');
    expect(source).toContain('useGameStore.getState().setSelectedFormationId(formationId)');
    const storeSource = readFileSync('src/ui/map/store/gameStore.ts', 'utf8');
    expect(storeSource).toContain('setSelectedFormationId: (id) => set(id == null');
    expect(storeSource).toContain('selectedOsid: null');
    expect(storeSource).toContain('selectedCorpsFrontSectorId: null');
  });
});
