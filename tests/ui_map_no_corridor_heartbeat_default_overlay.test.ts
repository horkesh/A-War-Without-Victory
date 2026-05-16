import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tactical map default corridor heartbeat overlay', () => {
  it('keeps the red/green corridor heartbeat path network out of the default map', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).toContain('const CORRIDOR_HEARTBEAT_FEATURE_FLAG = false;');
  });
});
