// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { MapModeLegend } from '../../src/ui/map/components/MapModeLegend.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

afterEach(() => {
  cleanup();
  setLocale('en');
  useGameStore.setState(useGameStore.getInitialState());
});

describe('political map counter legend', () => {
  it('keeps faction and counter semantics visible in political mode', () => {
    useGameStore.setState({ mapMode: 'political' });

    render(createElement(MapModeLegend));

    expect(screen.getByTestId('map-mode-legend')).toBeTruthy();
    expect(screen.getByText('ARBiH')).toBeTruthy();
    expect(screen.getByText('VRS')).toBeTruthy();
    expect(screen.getByText('HVO')).toBeTruthy();
    expect(screen.getByTestId('map-counter-legend-sample')).toBeTruthy();
    expect(screen.getByText('Type / echelon')).toBeTruthy();
    expect(screen.getByText('Strength / morale')).toBeTruthy();
    expect(screen.getByText('Selected')).toBeTruthy();
    expect(screen.getByText('Stack size')).toBeTruthy();
    expect(screen.getByTestId('map-counter-stack-badge').textContent).toBe('3');
  });

  it('names the unidentified enemy contact chip and the fog, scouted and enclave ground marks', () => {
    useGameStore.setState({ mapMode: 'political' });

    render(createElement(MapModeLegend));

    expect(screen.getByTestId('map-legend-enemy-contact').textContent).toContain('?');
    expect(screen.getByText('Spotted enemy unit, unidentified')).toBeTruthy();
    expect(screen.getByText('Scouted ground (side tint)')).toBeTruthy();
    expect(screen.getByText('Fogged: not recently scouted')).toBeTruthy();
    expect(screen.getByText('Enclave: cut-off pocket')).toBeTruthy();
  });

  it('localizes the ground marks in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({ mapMode: 'political' });

    render(createElement(MapModeLegend));

    expect(screen.getByText('Uočena neprijateljska jedinica, neidentificirana')).toBeTruthy();
    expect(screen.getByText('Izviđeno tlo (boja strane)')).toBeTruthy();
    expect(screen.getByText('Pod maglom: nedavno neizviđeno')).toBeTruthy();
    expect(screen.getByText('Enklava: odsječen džep')).toBeTruthy();
  });

  it('localizes the compact counter key in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({ mapMode: 'political' });

    render(createElement(MapModeLegend));

    expect(screen.getByText('Tip / ešalon')).toBeTruthy();
    expect(screen.getByText('Jačina / moral')).toBeTruthy();
    expect(screen.getByText('Odabrano')).toBeTruthy();
    expect(screen.getByText('Veličina grupe')).toBeTruthy();
  });
});
