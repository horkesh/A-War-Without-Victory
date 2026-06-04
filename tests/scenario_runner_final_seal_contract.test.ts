import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('scenario runner final seal contract', () => {
    it('passes full operational edges and spatial context to the final-save sector seal', () => {
        const source = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        const finalSaveBlock = source.slice(
            source.indexOf("const finalSavePath = join(outDir, 'final_save.json');"),
            source.indexOf('const finalSerialized =', source.indexOf("const finalSavePath = join(outDir, 'final_save.json');")),
        );

        expect(finalSaveBlock).toContain('const finalOperationalEdges');
        expect(finalSaveBlock).toContain('const finalSpatial');
        expect(finalSaveBlock).toMatch(/sealFinalSectorTruthFromCurrentSectors\(\s*state,\s*finalOperationalEdges,/);
        expect(finalSaveBlock).toMatch(/sealFinalSectorTruthFromCurrentSectors\([\s\S]*finalSpatial,[\s\S]*\)/);
        expect(finalSaveBlock).not.toMatch(/sealFinalSectorTruthFromCurrentSectors\(\s*state,\s*state\.military\.war_front_edges_osid/);
    });
});
