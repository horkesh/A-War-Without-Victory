import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapContainerSource = () => readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

describe('MapContainer radial context menu i18n boundary', () => {
  it('routes radial menu labels through map.context i18n keys', () => {
    const source = mapContainerSource();

    expect(source).toContain("label: t('map.context.viewUnit')");
    expect(source).toContain("label: t('map.context.viewCorps')");
    expect(source).toContain("label: t('map.context.settlement')");
    expect(source).toContain("label: t('map.context.viewSector')");
    expect(source).toContain("label: t('map.context.sectorDetail')");
    expect(source).toContain("label: t('map.context.deselect')");
    expect(source).toContain("contextMenu.type === 'front' ? t('map.context.front')");
  });

  it('does not embed English radial menu copy in MapContainer', () => {
    const source = mapContainerSource();

    for (const stale of [
      "label: 'View Unit'",
      "label: 'View Corps'",
      "label: 'Settlement'",
      "label: 'View Sector'",
      "label: 'Sector Detail'",
      "label: 'Deselect'",
      "contextMenu.type === 'front' ? 'Front'",
    ]) {
      expect(source).not.toContain(stale);
    }
  });
});
