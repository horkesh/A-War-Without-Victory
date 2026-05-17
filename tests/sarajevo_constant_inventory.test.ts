import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve('tools/diagnostics/sarajevo_constant_inventory.cjs');
const OUTPUT = resolve('docs/40_reports/working/SARAJEVO_CONSTANT_INVENTORY.md');

describe('Sarajevo constant inventory diagnostic', () => {
    it('emits a deterministic inventory of Sarajevo-named numeric constants', () => {
        const first = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
        const firstArtifact = readFileSync(OUTPUT, 'utf8');
        const second = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
        const secondArtifact = readFileSync(OUTPUT, 'utf8');

        expect(second).toBe(first);
        expect(secondArtifact).toBe(firstArtifact);
        expect(firstArtifact).toContain('| file:line | constant | current value | source-tier | migration scope |');
        expect(firstArtifact).toContain('src/sim/combat/sarajevo_siege_params.ts');
        expect(firstArtifact).toContain('DEFAULT_SARAJEVO_DEFENSE_BONUS');
        expect(firstArtifact).toContain('DEFAULT_SARAJEVO_ATTACKER_CASUALTY_MULT');
        expect(firstArtifact).toContain('DEFAULT_SARAJEVO_INTEGRITY_FLOOR');
        expect(firstArtifact).toContain('RBiH Sarajevo siege exhaustion');
        expect(firstArtifact).toContain('RS Sarajevo siege exhaustion');
    });
});
