import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('April 1994 hover-map generator', () => {
    it('initializes OSID data before applying controller colors', () => {
        const dir = mkdtempSync(join(tmpdir(), 'awwv-hover-map-'));
        tempDirs.push(dir);
        const runDir = join(dir, 'run');
        mkdirSync(runDir);
        writeFileSync(join(runDir, 'final_save.json'), JSON.stringify({
            political: { political_controllers: { 'op:lopare:lopare_selo_2': 'RS' } },
        }));
        writeFileSync(join(runDir, 'initial_save.json'), JSON.stringify({
            political: { political_controllers: { 'op:lopare:lopare_selo_2': 'RS' } },
        }));
        const paintedPath = join(dir, 'painted.json');
        writeFileSync(paintedPath, JSON.stringify({
            by_settlement_id: { 'op:lopare:lopare_selo_2': 'RS' },
        }));
        const templatePath = join(dir, 'template.html');
        writeFileSync(templatePath, `<style>.hit-region{fill:transparent;stroke:transparent;stroke-width:2;}.hit-region:hover,.hit-region:focus{fill:rgba(255,255,255,.16);stroke:rgba(255,255,255,.95);}</style><svg><path class="hit-region" data-index="0"/></svg><script>const image=document.getElementById('image');const osids=[{"osid":"op:lopare:lopare_selo_2","settlement":"Lopare Selo","municipality":"Lopare"}];</script><div>0 / 712 correct · 0.00%</div>`);
        const outputPath = join(dir, 'map.html');

        execFileSync(process.execPath, [
            'tools/generate_apr1994_hover_map.cjs',
            templatePath,
            runDir,
            paintedPath,
            outputPath,
        ]);

        const output = readFileSync(outputPath, 'utf8');
        expect(output.indexOf('const osids=')).toBeLessThan(output.indexOf("document.querySelectorAll('.hit-region')"));
        expect(output).toContain("controlFill[item.simulated]");
        expect(output).toContain('"simulated":"RS"');
    });
});
