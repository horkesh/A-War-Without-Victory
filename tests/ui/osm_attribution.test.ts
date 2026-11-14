// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { OSM_COPYRIGHT_URL, OsmAttribution } from '../../src/ui/map/components/OsmAttribution';
import { Z } from '../../src/ui/shared/zIndex';

type DesktopWindow = Window & { awwv?: unknown };

describe('OpenStreetMap attribution plate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLocale('en');
  });

  afterEach(() => {
    cleanup();
    delete (window as DesktopWindow).awwv;
    window.localStorage.clear();
    setLocale('en');
  });

  it('links the war-map credit to the OSM copyright page in a browser', () => {
    render(createElement(OsmAttribution, { placement: 'war-map' }));

    const link = screen.getByRole('link', { name: 'OpenStreetMap copyright and licence (opens in a new tab)' });
    expect(link.textContent).toBe('© OpenStreetMap contributors');
    expect(link.getAttribute('href')).toBe(OSM_COPYRIGHT_URL);
    expect(OSM_COPYRIGHT_URL).toBe('https://www.openstreetmap.org/copyright');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders plain text without a link inside the Electron app', () => {
    (window as DesktopWindow).awwv = {};
    render(createElement(OsmAttribution, { placement: 'war-map' }));

    const plate = screen.getByTestId('osm-attribution-war-map');
    expect(plate.textContent).toBe('© OpenStreetMap contributors');
    expect(screen.queryByRole('link')).toBeNull();
    // Plain text must not swallow map clicks.
    expect(plate.style.pointerEvents).toBe('none');
  });

  it('uses the BCS credit when BCS is selected', () => {
    setLocale('bcs');
    render(createElement(OsmAttribution, { placement: 'minimap' }));

    expect(screen.getByTestId('osm-attribution-minimap').textContent).toBe('© OpenStreetMap saradnici');
    expect(screen.getByRole('link', { name: 'Autorska prava i licenca OpenStreetMapa (otvara se u novoj kartici)' })).toBeTruthy();
  });

  it('keeps the credit at the 12px text floor on a dark plate with gold text and a green rule', () => {
    render(createElement(OsmAttribution, { placement: 'war-map' }));
    const plate = screen.getByTestId('osm-attribution-war-map');

    expect(plate.style.fontSize).toBe('0.75rem');
    expect(plate.style.color).toBe('rgb(196, 163, 90)');
    expect(plate.style.background).toContain('rgba(16, 19, 15, 0.82)');
    expect(plate.style.border).toContain('rgba(80, 184, 80, 0.38)');
    expect(plate.style.zIndex).toBe(String(Z.MAP_HUD_LOW));
  });

  it('places the war-map plate on the legend column above the bottom strip, as a counter occluder', () => {
    render(createElement(OsmAttribution, { placement: 'war-map' }));
    const plate = screen.getByTestId('osm-attribution-war-map');

    // Bottom-right is the floating Find button's; the legend column clears it and the right rails.
    // calc(17rem + 1rem), the legend's left edge; jsdom folds it to calc(18rem).
    expect(['calc(17rem + 1rem)', 'calc(18rem)']).toContain(plate.style.left);
    expect(plate.style.right).toBe('');
    expect(plate.style.bottom).toBe('calc(var(--awwv-bottom-bar-clearance, 2.5rem) + 0.375rem)');
    expect(plate.getAttribute('data-awwv-counter-occluder')).toBe('true');
  });

  it('lifts the minimap plate clear of the Find button, without a second occluder', () => {
    render(createElement(OsmAttribution, { placement: 'minimap' }));
    const plate = screen.getByTestId('osm-attribution-minimap');

    expect(plate.style.left).toBe('4px');
    expect(plate.style.bottom).toBe('12px');
    expect(plate.hasAttribute('data-awwv-counter-occluder')).toBe(false);
  });

  it('is mounted by the war map and the minimap', () => {
    const mapSource = readFileSync(join(process.cwd(), 'src/ui/map/map/MapContainer.tsx'), 'utf8');
    const minimapSource = readFileSync(join(process.cwd(), 'src/ui/map/components/Minimap.tsx'), 'utf8');

    expect(mapSource).toContain('<OsmAttribution placement="war-map" />');
    expect(minimapSource).toContain('<OsmAttribution placement="minimap" />');
    // Neither MapLibre instance shows its own attribution control; the plate replaces it.
    expect(mapSource).toContain('attributionControl: false');
    expect(minimapSource).toContain('attributionControl: false');
  });
});
