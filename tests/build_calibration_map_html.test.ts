import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const TOOL = resolve('tools/build_calibration_map_html.mjs');
const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('build_calibration_map_html', () => {
    test('embeds deterministic OSID hover regions and controller metadata', () => {
        const dir = mkdtempSync(join(tmpdir(), 'awwv-calibration-map-'));
        tempDirs.push(dir);
        const pngPath = join(dir, 'map.png');
        const outPath = join(dir, 'map.html');
        const secondOutPath = join(dir, 'map-second.html');
        const geoPath = join(dir, 'operational.geojson');
        const savePath = join(dir, 'save.json');
        const paintedPath = join(dir, 'painted.json');

        writeFileSync(pngPath, Buffer.from('89504e470d0a1a0a', 'hex'));
        writeFileSync(geoPath, JSON.stringify({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { osid: 'op:zeta:second', settlement_name: 'Second', mun1990_name: 'Zeta' },
                    geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] },
                },
                {
                    type: 'Feature',
                    properties: { osid: 'op:alpha:first', settlement_name: 'First', mun1990_name: 'Alpha' },
                    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
                },
            ],
        }));
        writeFileSync(savePath, JSON.stringify({
            political: { political_controllers: { 'op:alpha:first': 'RS', 'op:zeta:second': 'RBiH' } },
        }));
        writeFileSync(paintedPath, JSON.stringify({
            meta: { changelog: [{ osid: 'op:alpha:first', from: 'RBiH', to: 'RS' }] },
            by_settlement_id: { 'op:alpha:first': 'RS', 'op:zeta:second': 'HRHB' },
        }));

        const args = [
            pngPath, outPath, 'January 1993', '1 / 2 correct', 'fixture',
            geoPath, savePath, paintedPath,
        ];
        execFileSync(process.execPath, [TOOL, ...args]);
        // (spread copy instead of Array.prototype.with — repo tsconfig lib predates es2023)
        const secondArgs = [...args];
        secondArgs[1] = secondOutPath;
        execFileSync(process.execPath, [TOOL, ...secondArgs]);

        const html = readFileSync(outPath, 'utf8');
        expect(html).toContain('class="hit-region"');
        expect(html).toContain('id="map-tooltip"');
        expect(html).toContain('Simulated control');
        expect(html).toContain('Painted control');
        expect(html).toContain('Reference changed');
        expect(html.indexOf('op:alpha:first')).toBeLessThan(html.indexOf('op:zeta:second'));
        expect(readFileSync(secondOutPath, 'utf8')).toBe(html);
    });

    test('the merge map is authoritative regardless of what the painted file contains', () => {
        // The repo's painted_control_jan1993_improved.json carries entries for the
        // merge children themselves, several disagreeing with their mapped parent.
        // Resolution must NOT be conditional on "absent from painted", or those
        // children become live scored cells and invent mismatches against ground
        // the engine never simulates.
        //
        // Built entirely from TRACKED inputs (the merge map) plus a synthetic
        // save/painted pair — runs/ is gitignored, so a fixture reaching into it
        // would ENOENT in a clean checkout.
        const mergeMap = JSON.parse(readFileSync(resolve('data/derived/operational/micro_osid_merge_map.json'), 'utf8')) as Record<string, string>;
        const [child, parent] = Object.entries(mergeMap)[0]!;

        const dir = mkdtempSync(join(tmpdir(), 'awwv-authoritative-'));
        tempDirs.push(dir);
        const png = join(dir, 'm.png');
        const geo = join(dir, 'geo.geojson');
        const save = join(dir, 'save.json');
        const paintedPath = join(dir, 'painted.json');
        const out = join(dir, 'out.html');
        writeFileSync(png, Buffer.from('89504e470d0a1a0a', 'hex'));
        writeFileSync(geo, JSON.stringify({
            type: 'FeatureCollection',
            features: [child, parent].map((osid, i) => ({
                type: 'Feature',
                properties: { osid, settlement_name: osid, mun1990_name: 'Mun' },
                geometry: { type: 'Polygon', coordinates: [[[i, 0], [i + 1, 0], [i + 1, 1], [i, 1], [i, 0]]] },
            })),
        }));
        // only the PARENT is simulated — the child was merged away
        writeFileSync(save, JSON.stringify({ political: { political_controllers: { [parent]: 'RS' } } }));
        // the painted reference nonetheless carries the child, DISAGREEING with the parent
        writeFileSync(paintedPath, JSON.stringify({
            meta: { changelog: [] },
            by_settlement_id: { [parent]: 'RS', [child]: 'HRHB' },
        }));

        execFileSync(process.execPath, [TOOL, png, out, 'title', 'score', 'footer', geo, save, paintedPath]);
        const details = JSON.parse(readFileSync(out, 'utf8').match(/const osids=(.*?);const hitLayer/s)![1]!) as Array<{
            osid: string; mergedInto: string | null; painted: string | null; mismatch: boolean;
        }>;

        const childRow = details.find(row => row.osid === child)!;
        const parentRow = details.find(row => row.osid === parent)!;
        // resolved despite having its own painted entry
        expect(childRow.mergedInto).toBe(parent);
        // and scored as the parent — never on its own disagreeing value
        expect(childRow.painted).toBe('RS');
        expect(childRow.painted).toBe(parentRow.painted);
        expect(childRow.mismatch).toBe(parentRow.mismatch);
        expect(childRow.mismatch).toBe(false);

        // the scored universe is the parents only
        const scored = new Set(details.map(row => row.mergedInto ?? row.osid));
        expect(scored.size).toBe(1);
    });
});
