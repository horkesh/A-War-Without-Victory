import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('GUI audit Batch H supply legend overlap contract', () => {
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

        expect(supplyLegend).toContain("title: 'Known Friendly Supply'");
        expect(supplyLegend).toContain("label: 'Adequate'");
        expect(supplyLegend).toContain("label: 'Strained'");
        expect(supplyLegend).toContain("label: 'Critical'");
        expect(supplyLegend).toContain("label: 'Unknown / not visible'");
        expect(supplyLegend).not.toContain("label: 'Surplus'");
        expect(supplyLegend).not.toContain("value: '<20'");
        expect(supplyLegend).not.toContain("value: '20-60'");
        expect(supplyLegend).not.toContain("value: '>60'");
    });
});
