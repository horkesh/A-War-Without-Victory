/**
 * Merged-away OSIDs must not appear on the war map as unowned slivers.
 *
 * The GeoJSON carries 744 polygons; the simulation knows 712. The 32 sub-1 km²
 * micro-OSIDs were merged into a same-municipality neighbour, but their geometry
 * was never unioned into the parent — so before this fix `buildControlGeoJSON`
 * passed them through with `controller: null` and the `osid-control-fill` match
 * expression painted them with its neutral fallback: 32 tiny "unowned enclave"
 * patches inside solid faction territory, hoverable and selectable for cells the
 * engine has never heard of.
 *
 * Their ground IS held — by the parent — so they render as the parent and report
 * the parent on hover. Presentational only; nothing here feeds the simulation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { buildControlGeoJSON } from '../../src/ui/map/map/builders/buildControlGeoJSON';
import { buildFrontLinesGeoJSON } from '../../src/ui/map/map/builders/buildFrontLinesGeoJSON';

const mergeMap = JSON.parse(
    readFileSync(resolve('data/derived/operational/micro_osid_merge_map.json'), 'utf8'),
) as Record<string, string>;

const [child, parent] = Object.entries(mergeMap)[0]!;

const fc = (ids: string[]): FeatureCollection => ({
    type: 'FeatureCollection',
    features: ids.map((osid, i) => ({
        type: 'Feature',
        properties: { osid },
        geometry: { type: 'Polygon', coordinates: [[[i, 0], [i + 1, 0], [i + 1, 1], [i, 1], [i, 0]]] },
    })),
});

describe('buildControlGeoJSON: merged-away OSIDs render as their parent', () => {
    it('gives a merge child its parent controller instead of a null fallback fill', () => {
        // the simulation only holds the parent — this is the real shape of state
        const control = { [parent]: 'RS' } as Record<string, string | null>;
        const out = buildControlGeoJSON(fc([child, parent]), control);

        const childOut = out.features[0]!.properties!;
        const parentOut = out.features[1]!.properties!;
        expect(childOut.controller).toBe('RS');
        expect(childOut.controller).toBe(parentOut.controller);
        // the specific regression: null is what produced the grey sliver
        expect(childOut.controller).not.toBeNull();
    });

    it('makes a click on a merge child select the cell the simulation owns', () => {
        const out = buildControlGeoJSON(fc([child]), { [parent]: 'HRHB' });
        const props = out.features[0]!.properties!;
        // interaction layers read properties.osid
        expect(props.osid).toBe(parent);
        // provenance is retained so the original polygon is still identifiable
        expect(props.merged_child_osid).toBe(child);
        expect(props.merged_into).toBe(parent);
    });

    it('leaves ordinary OSIDs completely untouched', () => {
        const live = 'op:sarajevo:centar_1';
        const out = buildControlGeoJSON(fc([live]), { [live]: 'RBiH' });
        const props = out.features[0]!.properties!;
        expect(props.osid).toBe(live);
        expect(props.controller).toBe('RBiH');
        expect(props.merged_into).toBeUndefined();
        expect(props.merged_child_osid).toBeUndefined();
    });

    it('still yields null for a genuinely unknown OSID, so real gaps stay visible', () => {
        const out = buildControlGeoJSON(fc(['op:nowhere:invented']), {});
        expect(out.features[0]!.properties!.controller).toBeNull();
    });

    it('resolves every one of the merged cells, not just the sampled pair', () => {
        const children = Object.keys(mergeMap);
        const control: Record<string, string | null> = {};
        for (const p of new Set(Object.values(mergeMap))) control[p] = 'RS';
        const out = buildControlGeoJSON(fc(children), control);
        expect(out.features).toHaveLength(children.length);
        for (const feature of out.features) {
            expect(feature.properties!.controller).toBe('RS');
        }
    });
});

/**
 * Every caller feeds buildControlGeoJSON's OUTPUT into buildFrontLinesGeoJSON,
 * so the null controller propagated there too: generateFactionBorders skips any
 * edge whose two sides don't both have a controller, which meant the front line
 * went MISSING along the outer boundary of a merge child that faced an enemy
 * cell. Resolving the child to its parent closes that gap as well.
 */
describe('buildFrontLinesGeoJSON: merge children no longer punch holes in the front', () => {
    // three unit squares in a row: parent | child | enemy, sharing exact edges
    const square = (osid: string, x0: number): Feature<Polygon> => ({
        type: 'Feature',
        properties: { osid },
        geometry: {
            type: 'Polygon',
            coordinates: [[[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1], [x0, 0]]],
        },
    });
    const enemy = 'op:test:enemy_1';
    const row: FeatureCollection = {
        type: 'FeatureCollection',
        features: [square(parent, 0), square(child, 1), square(enemy, 2)],
    };
    const control = { [parent]: 'RS', [enemy]: 'RBiH' } as Record<string, string | null>;

    const fronts = buildFrontLinesGeoJSON(buildControlGeoJSON(row, control)).features.filter(
        (f) => f.properties!.lineType === 'front',
    );

    it('draws the front along the boundary the child inherits from its parent', () => {
        expect(fronts.length).toBeGreaterThan(0);
        const pair = new Set(fronts.flatMap((f) => [f.properties!.factionA, f.properties!.factionB]));
        expect(pair).toEqual(new Set(['RS', 'RBiH']));
    });

    it('puts that front on the real faction boundary, not on the internal merge seam', () => {
        const xs = new Set(fronts.flatMap((f) => f.geometry.coordinates.map((c) => c[0])));
        // x=2 is parent-territory vs enemy; x=1 is the seam between child and parent
        expect(xs).toEqual(new Set([2]));
    });
});
