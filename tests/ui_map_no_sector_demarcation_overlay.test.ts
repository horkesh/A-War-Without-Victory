import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tactical map sector demarcation overlay', () => {
  it('does not materialize sector demarcation line sources or layers', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).not.toContain('sector-demarcation');
    expect(source).not.toContain('buildSectorDemarcationGeoJSON');
  });
});
