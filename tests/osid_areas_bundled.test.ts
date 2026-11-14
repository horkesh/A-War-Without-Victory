/**
 * getOsidAreas() must not depend on a runtime file read.
 *
 * It used to read data/derived/operational/osid_areas.json from the process cwd and, on any error,
 * silently return an empty area map, so turn summaries and negotiation capital reported zero
 * territory for a run started outside the repo root. It now uses the bundled JSON module, like
 * sim/negotiation and the map UI. With every fs read made to throw, the old code returned
 * `areas: {}`; the bundled one still returns all areas.
 */
import { describe, expect, it, vi } from 'vitest';

const probe = vi.hoisted(() => ({
    throwingRead: (): never => { throw new Error('probe: fs read attempted'); },
}));
vi.mock('fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('fs')>()), readFileSync: probe.throwingRead }));
vi.mock('node:fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs')>()), readFileSync: probe.throwingRead }));

import osidAreasJson from '../data/derived/operational/osid_areas.json';
import { getOsidAreas } from '../src/sim/osid_areas.js';

describe('getOsidAreas', () => {
    it('returns every OSID area without reading the filesystem', () => {
        const { total, areas } = getOsidAreas();
        expect(Object.keys(areas)).toHaveLength(osidAreasJson.osid_count);
        expect(Object.keys(areas).length).toBeGreaterThan(0);
        expect(total).toBe(osidAreasJson.total_area_km2);
    });
});
