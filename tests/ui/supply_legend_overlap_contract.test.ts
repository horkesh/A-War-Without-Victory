// @vitest-environment jsdom

import { readFileSync } from 'node:fs';

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapModeLegend } from '../../src/ui/map/components/MapModeLegend.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

describe('GUI audit Batch H supply legend overlap contract', () => {
    afterEach(() => {
        cleanup();
        setLocale('en', undefined);
        useGameStore.setState({
            mapMode: 'political',
            loadedGameState: null,
        });
    });

    it('keeps the supply logistics panel outside the left OOB sidebar column', () => {
        const source = readFileSync('src/ui/map/components/SupplyPanel.tsx', 'utf8');

        expect(source).toContain('data-testid="supply-logistics-panel"');
        expect(source).toContain("left: 'calc(15.5rem + 12px)'");
        expect(source).not.toContain("left: '12px'");
    });

    it('keeps the map-mode legend outside the left OOB sidebar column', () => {
        const source = readFileSync('src/ui/map/components/MapModeLegend.tsx', 'utf8');

        expect(source).toContain('data-testid="map-mode-legend"');
        expect(source).toContain("left: 'calc(15.5rem + 1rem)'");
        expect(source).not.toContain('bottom-24 left-4');
    });

    it('describes player-safe supply classes instead of stale surplus thresholds', () => {
        const source = readFileSync('src/ui/map/components/MapModeLegend.tsx', 'utf8');
        const supplyLegend = source.slice(
            source.indexOf("supply: {"),
            source.indexOf("casualties: {")
        );

        expect(supplyLegend).toContain("titleKey: 'map.legend.supply.title'");
        expect(supplyLegend).toContain("labelKey: 'map.legend.supply.adequate'");
        expect(supplyLegend).toContain("labelKey: 'map.legend.supply.strained'");
        expect(supplyLegend).toContain("labelKey: 'map.legend.supply.critical'");
        expect(supplyLegend).toContain("labelKey: 'map.legend.supply.unknown'");
        expect(supplyLegend).not.toContain("label: 'Surplus'");
        expect(supplyLegend).not.toContain("value: '<20'");
        expect(supplyLegend).not.toContain("value: '20-60'");
        expect(supplyLegend).not.toContain("value: '>60'");
    });

    it('renders the supply legend through the active locale', () => {
        setLocale('bcs', undefined);
        useGameStore.setState({
            mapMode: 'supply',
        });

        render(createElement(MapModeLegend));

        expect(screen.getByText('Poznato prijateljsko snabdijevanje')).toBeTruthy();
        expect(screen.getByText('Uredno')).toBeTruthy();
        expect(screen.getByText('Napregnuto')).toBeTruthy();
        expect(screen.queryByText('Known Friendly Supply')).toBeNull();
        expect(screen.queryByText('Adequate')).toBeNull();
    });
});
