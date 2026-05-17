import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PARAMILITARY_NAMED_UNITS } from '../data/source/oob/paramilitary_named_units.js';
import { OPERATION_NAMES } from '../src/sim/combat/operation_names.js';

const GENERATOR_SOURCE_FILES = [
    'src/sim/combat/operation_names.ts',
    'tools/claude_plays_vrs/persona_loader.ts',
    'tools/claude_plays_vrs/run_personas.ts',
] as const;

describe('paramilitary named unit pool exclusion', () => {
    it('keeps named paramilitary units out of bot operation name pools', () => {
        const operationPoolNames = Object.values(OPERATION_NAMES).flat();
        for (const unit of PARAMILITARY_NAMED_UNITS) {
            expect(operationPoolNames).not.toContain(unit.name);
        }
    });

    it('keeps generator sources from importing or aliasing the named-unit catalog', () => {
        for (const relPath of GENERATOR_SOURCE_FILES) {
            const source = readFileSync(resolve(process.cwd(), relPath), 'utf8');
            expect(source).not.toContain('paramilitary_named_units');
            for (const unit of PARAMILITARY_NAMED_UNITS) {
                expect(source).not.toContain(unit.name);
            }
            // SOURCE BLOCKED: Scorpions (Skorpioni), pending /historian follow-up PARAMILITARY-NAMED-UNITS-H1.
            expect(source).not.toContain('Scorpions');
            expect(source).not.toContain('Skorpioni');
            // SOURCE BLOCKED: Yellow Wasps (Zute Ose, Vukovic brothers), pending /historian follow-up PARAMILITARY-NAMED-UNITS-H1.
            expect(source).not.toContain('Yellow Wasps');
            expect(source).not.toContain('Zute Ose');
        }
    });
});
