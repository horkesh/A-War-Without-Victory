// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  WARROOM_1992_SCENE_URLS,
  WARROOM_SCENE_URLS,
} from '../../src/ui/map/components/warroom/warroom-asset-urls';
import { WarroomScenePlate } from '../../src/ui/map/components/warroom/WarroomScenePlate';
import {
  OPENING_WARROOM_SCENES,
  WARROOM_MAP_ANCHOR_BOUNDS,
} from '../../src/ui/map/components/opening/openingScenes';

describe('Warroom scene continuity', () => {
  afterEach(() => cleanup());

  it('projects the exact 1992 scene URL for every canonical faction', () => {
    expect(Object.keys(WARROOM_1992_SCENE_URLS)).toEqual(['RBiH', 'RS', 'HRHB']);
    expect(WARROOM_1992_SCENE_URLS).toEqual({
      RBiH: WARROOM_SCENE_URLS.RBiH[1992],
      RS: WARROOM_SCENE_URLS.RS[1992],
      HRHB: WARROOM_SCENE_URLS.HRHB[1992],
    });
    expect(WARROOM_1992_SCENE_URLS.RBiH).toContain('hq_rbih_1992');
    expect(WARROOM_1992_SCENE_URLS.RS).toContain('hq_rs_1992');
    expect(WARROOM_1992_SCENE_URLS.HRHB).toContain('hq_hrhb_1992');
  });

  it('derives each opening camera origin from its canonical map bounds', () => {
    expect(WARROOM_MAP_ANCHOR_BOUNDS).toEqual({
      RBiH: { x: 854, y: 576, width: 602, height: 325 },
      RS: { x: 925, y: 502, width: 518, height: 315 },
      HRHB: { x: 1115, y: 534, width: 460, height: 267 },
    });

    for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
      const bounds = WARROOM_MAP_ANCHOR_BOUNDS[faction];
      const expected = `${((bounds.x + bounds.width / 2) / 2752) * 100}% ${((bounds.y + bounds.height / 2) / 1536) * 100}%`;
      expect(OPENING_WARROOM_SCENES[faction]).toEqual({
        id: faction,
        src: WARROOM_1992_SCENE_URLS[faction],
        transformOrigin: expected,
      });
    }
  });

  it('renders a passive decorative image in a fixed aspect-fit stage', () => {
    render(createElement(
      'div',
      { style: { width: 1200, height: 700 } },
      createElement(
        WarroomScenePlate,
        { src: '/room.webp', state: 'incoming', transformOrigin: '42% 48%' },
        createElement('button', { type: 'button' }, 'Hotspot'),
      ),
    ));

    const plate = screen.getByTestId('warroom-scene-plate');
    const image = screen.getByRole('presentation');
    expect(plate.style.width).toMatch(/^min\(100%, [\d.]+vh\)$/);
    expect(plate.style.height).toMatch(/^min\(100%, [\d.]+vw\)$/);
    expect(plate.style.aspectRatio).toBe('1.7916666666666667');
    expect(plate.style.transform).toBe('translate(-50%, -50%)');
    expect(plate.style.transformOrigin).toBe('42% 48%');
    expect(plate.getAttribute('data-scene-state')).toBe('incoming');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('draggable')).toBe('false');
    expect(image.style.pointerEvents).toBe('none');
    expect(screen.getByRole('button', { name: 'Hotspot' })).toBeTruthy();
  });

  it('composes the playable overlays as children of the same scene plate', () => {
    const shell = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
    const plateStart = shell.indexOf('<WarroomScenePlate');
    const plateEnd = shell.indexOf('</WarroomScenePlate>', plateStart);
    const playablePlate = shell.slice(plateStart, plateEnd);
    const toolbar = playablePlate.indexOf('<WarroomToolbar onNavigate={onNavigate} />');
    const status = playablePlate.indexOf('{statusDock}');
    const projectedMap = playablePlate.indexOf('<WarroomProjectedMap');
    const dateBoard = playablePlate.indexOf('<WarroomDateBoard');
    const hotspots = playablePlate.indexOf('<WarroomHotspot');

    expect(plateStart).toBeGreaterThan(0);
    expect(plateEnd).toBeGreaterThan(plateStart);
    expect(toolbar).toBeGreaterThan(0);
    expect(status).toBeGreaterThan(toolbar);
    expect(projectedMap).toBeGreaterThan(status);
    expect(dateBoard).toBeGreaterThan(projectedMap);
    expect(hotspots).toBeGreaterThan(dateBoard);
  });
});
