import { describe, expect, it } from 'vitest';
import {
    AMBER_MISMATCH,
    FACTION_COLORS,
    projectNorthUp,
    resolveControlVisual,
} from '../tools/map/control_snapshot_rendering.js';

describe('control snapshot rendering', () => {
    it('projects larger geographic Y values toward the top of the image', () => {
        const south = projectNorthUp([5, 2], {
            scale: 10,
            offX: 0,
            offY: 0,
            maxY: 10,
            panelOffsetX: 0,
            titleOffsetY: 60,
        });
        const north = projectNorthUp([5, 8], {
            scale: 10,
            offX: 0,
            offY: 0,
            maxY: 10,
            panelOffsetX: 0,
            titleOffsetY: 60,
        });

        expect(north[1]).toBeLessThan(south[1]);
        expect(north).toEqual([50, 80]);
    });

    it('renders a mismatch amber with a marker for the painter-required faction', () => {
        expect(resolveControlVisual('RS', 'RBiH')).toEqual({
            fill: AMBER_MISMATCH,
            desiredMarker: FACTION_COLORS.RBiH,
            mismatch: true,
        });
    });

    it('keeps a matching OSID in its faction color without a marker', () => {
        expect(resolveControlVisual('HRHB', 'HRHB')).toEqual({
            fill: FACTION_COLORS.HRHB,
            desiredMarker: null,
            mismatch: false,
        });
    });
});
