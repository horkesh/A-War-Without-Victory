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

    test('published January map exposes every operational polygon and changed reference cell', () => {
        const html = readFileSync(resolve('docs/60_visualisations/20260830_january_1993_calibration_map.html'), 'utf8');
        const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
        expect(script).toBeTruthy();
        expect(() => new Function(script!)).not.toThrow();

        const detailsSource = script!.match(/const osids=(.*?);const hitLayer/s)?.[1];
        expect(detailsSource).toBeTruthy();
        const details = JSON.parse(detailsSource!) as Array<{
            osid: string;
            changed: boolean;
            mismatch: boolean;
            painted: string | null;
        }>;

        expect(html.match(/class="hit-region"/g)).toHaveLength(744);
        expect(details).toHaveLength(744);
        expect(details.every((row, index) => index === 0 || details[index - 1]!.osid < row.osid)).toBe(true);
        expect(details.filter(row => row.painted !== null)).toHaveLength(712);
        expect(details.filter(row => row.mismatch)).toHaveLength(11);
        expect(details.filter(row => row.changed)).toHaveLength(11);
    });
});
