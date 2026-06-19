import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('direct brigade move affordance retirement', () => {
  it('keeps engine-ignored direct move staging out of the live tactical map', () => {
    const mapContainer = read('src/ui/map/map/MapContainer.tsx');
    const store = read('src/ui/map/store/gameStore.ts');
    const ghostPathsBuilder = read('src/ui/map/map/builders/buildGhostPathsGeoJSON.ts');

    expect(mapContainer).not.toContain('stageMoveOrderFromOsid');
    expect(mapContainer).not.toContain("orderModeForFormation === 'move'");
    expect(mapContainer).not.toContain('MOVE_PREVIEW_LAYER_ID');
    expect(store).not.toContain("'attack' | 'move' | 'sector'");
    expect(ghostPathsBuilder).not.toContain("order.type !== 'move'");
  });
});
