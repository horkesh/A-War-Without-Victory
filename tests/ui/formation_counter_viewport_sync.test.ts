import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('formation counter viewport synchronization', () => {
  it('reprojects the visible DOM counters throughout pan and zoom movement', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).toContain("map.on('move', scheduleCounterViewportSync)");
    expect(source).toContain('formationCounterDomOverlayRef.current.dataset.awwvFormationCounterNeedsUpdate = \'false\'');
    expect(source).not.toContain("map.on('zoom', () => {");

    const selectionRender = source.slice(
      source.indexOf('const viewportClip = buildFormationCounterViewportClip(map);'),
      source.indexOf('if (!deckLayerRenderInputsChanged', source.indexOf('const viewportClip = buildFormationCounterViewportClip(map);')),
    );
    expect(selectionRender).toContain('viewportClip,');
  });
});
