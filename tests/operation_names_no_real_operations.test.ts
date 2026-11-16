/**
 * RB6 (historian check, 2026-11-16): the bot operation-name pools hold fictional names only.
 * 'Operacija Džihad' was never an ARBiH operation and, as a label on ordinary ARBiH operations, echoes the foreign
 * El Mujahed detachment and Serb propaganda. Eleven more entries were real operation names of 1991-95 (Sabur-95,
 * Oluja, Bljesak, Udar, Proboj, Vihor) or loaded names (Hajka, Gazija, Grad, Odmazda). Each was replaced IN ITS SLOT, so
 * pool lengths and the deterministic starting index are unchanged.
 */
import { describe, expect, it } from 'vitest';

import { OPERATION_NAMES, pickOperationName } from '../src/sim/combat/operation_names';
import { isHistoricalOperationNameReserved, normalizeOperationNameStem } from '../src/sim/combat/historical_operation_names';

const REMOVED = ['Džihad', 'Sabur', 'Oluja', 'Bljesak', 'Udar', 'Proboj', 'Vihor', 'Hajka', 'Gazija', 'Grad', 'Odmazda'];

/** slot index -> name, per faction (the replacements, in the slots of the names they replaced). */
const SLOTS: Record<string, Array<[string, string]>> = {
    RS: [['Granit', 'Vihor'], ['Smreka', 'Odmazda'], ['Nasip', 'Udar']],
    RBiH: [['Temelj', 'Sabur'], ['Ždral', 'Hajka'], ['Snijeg', 'Oluja'], ['Prevoj', 'Džihad'], ['Vedrina', 'Gazija'], ['Magla', 'Grad']],
    HRHB: [['Bujica', 'Bljesak'], ['Mećava', 'Vihor'], ['Mlaz', 'Udar'], ['Zalet', 'Proboj']],
};

describe('operation name pools', () => {
    it('hold none of the real or loaded names that were removed', () => {
        const stems = new Set(REMOVED.map(normalizeOperationNameStem));
        const present = Object.entries(OPERATION_NAMES).flatMap(([faction, pool]) => pool.filter((name) => stems.has(normalizeOperationNameStem(name))).map((name) => `${faction}:${name}`));
        expect(present).toEqual([]);
    });

    it('hold the replacements, each in a distinct slot of its own faction pool, and none is reserved or repeated inside its pool', () => {
        for (const [faction, replacements] of Object.entries(SLOTS)) {
            const pool = OPERATION_NAMES[faction]!;
            for (const [name] of replacements) {
                expect(pool, `${faction} ${name}`).toContain(`Operacija ${name}`);
                expect(isHistoricalOperationNameReserved(`Operacija ${name}`)).toBe(false);
            }
            expect(new Set(pool).size).toBe(pool.length);
        }
        const replacementNames = Object.values(SLOTS).flat().map(([name]) => name);
        expect(new Set(replacementNames).size).toBe(replacementNames.length);
    });

    it('keep their lengths, so the deterministic selection is unchanged', () => {
        expect(Object.fromEntries(Object.entries(OPERATION_NAMES).map(([f, pool]) => [f, pool.length]))).toEqual({ RS: 38, RBiH: 39, HRHB: 35 });
        expect(pickOperationName('corps_1', 10, 'RBiH')).toBe(pickOperationName('corps_1', 10, 'RBiH'));
    });
});
