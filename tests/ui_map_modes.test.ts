import { describe, expect, it } from 'vitest';

import { MAP_MODES } from '../src/ui/map/utils/mapModes';

describe('MAP_MODES', () => {
  it('exposes authority and legitimacy as distinct map modes', () => {
    expect(MAP_MODES.map((mode) => mode.id)).toContain('authority');
    expect(MAP_MODES.map((mode) => mode.id)).toContain('legitimacy');
    expect(MAP_MODES.find((mode) => mode.id === 'authority')?.key).toBe('8');
    expect(MAP_MODES.find((mode) => mode.id === 'legitimacy')?.key).toBe('9');
  });
});
