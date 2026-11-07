import { expect, it, vi } from 'vitest';
import { enableOpsMapTerrainIfAvailable } from '../../src/ui/map/components/ops_modal/opsTerrain';

it('keeps a valid planning map usable when its style has no optional terrain source', () => {
    const setTerrain = vi.fn(() => { throw new Error('missing terrain source'); });
    expect(enableOpsMapTerrainIfAvailable({ getSource: () => undefined, setTerrain })).toBe(false);
    expect(setTerrain).not.toHaveBeenCalled();
});

it('preserves existing terrain activation when the source is supplied by the style', () => {
    const setTerrain = vi.fn();
    expect(enableOpsMapTerrainIfAvailable({ getSource: () => ({}), setTerrain })).toBe(true);
    expect(setTerrain).toHaveBeenCalledWith({ source: 'terrain-dem', exaggeration: 2.5 });
});
