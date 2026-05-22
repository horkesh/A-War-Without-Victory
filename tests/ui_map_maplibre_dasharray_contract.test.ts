import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mapContainerSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
const mapStyle = JSON.parse(readFileSync('src/ui/map/map/awwv_map_style.json', 'utf8')) as {
  layers: Array<{ id: string; paint?: Record<string, unknown> }>;
};

function layerPaint(id: string): Record<string, unknown> {
  const layer = mapStyle.layers.find((entry) => entry.id === id);
  if (!layer?.paint) throw new Error(`Missing paint for layer ${id}`);
  return layer.paint;
}

function isLiteralDashArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
}

describe('MapLibre dasharray contract', () => {
  it('keeps front-line stripe dasharray literal instead of setting a data-driven expression at runtime', () => {
    expect(isLiteralDashArray(layerPaint('front-line-stripe')['line-dasharray'])).toBe(true);
    expect(mapContainerSource).not.toContain("setPaintProperty('front-line-stripe', 'line-dasharray'");
  });

  it('keeps supply reach outline dasharrays literal on separate filtered layers', () => {
    expect(mapContainerSource).not.toMatch(/'line-dasharray':\s*\[\s*['\"]case['\"]/);
    expect(mapContainerSource).toContain("id: SUPPLY_REACH_OUTLINE_LAYER_ID");
    expect(mapContainerSource).toContain("id: SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID");
  });
});
