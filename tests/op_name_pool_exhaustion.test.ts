/**
 * OP-NAME-GARBLE (rulings §43, register item 3). Once a faction had used every pool name
 * twice, `pickOperationName` fell back to `Operacija <turn>-<last 4 chars of the corps id>`,
 * which named a player-visible ARBiH 2nd Corps operation "Operacija 177-orps" (Fable consult
 * 12, pair 2 emergent, week 177). A long game must keep drawing real pool names: generation 3,
 * 4, and so on.
 */
import { describe, expect, it } from 'vitest';
import { OPERATION_NAMES, pickOperationName } from '../src/sim/combat/operation_names.js';

function stateWithGenerationsUsed(faction: string, generations: number) {
    const used: Record<string, number> = {};
    for (const name of OPERATION_NAMES[faction]!) {
        used[name] = 1;
        for (let g = 2; g <= generations; g++) used[`${name} ${g}`] = 1;
    }
    return { military: { used_operation_names: used } } as any;
}

describe('operation names after the pool is used twice', () => {
    it('draws a third-generation pool name, never a corps-id fragment', () => {
        const state = stateWithGenerationsUsed('RBiH', 2);
        const name = pickOperationName('arbih_2nd_corps', 177, 'RBiH', state);
        expect(name).not.toContain('orps');
        expect(name.endsWith(' 3')).toBe(true);
        expect(OPERATION_NAMES.RBiH).toContain(name.slice(0, -2));
        expect(state.military.used_operation_names[name]).toBe(177);
    });

    it('keeps names unique across a whole further generation and beyond', () => {
        const state = stateWithGenerationsUsed('RS', 2);
        const pool = OPERATION_NAMES.RS!;
        const seen = new Set<string>();
        for (let i = 0; i < pool.length + 5; i++) {
            const name = pickOperationName(`corps_${i}`, 100 + i, 'RS', state);
            expect(seen.has(name), `duplicate ${name}`).toBe(false);
            expect(/^Operacija \d/.test(name), `fallback name ${name}`).toBe(false);
            seen.add(name);
        }
    });

    it('is deterministic for the same corps, turn and used set', () => {
        const a = pickOperationName('arbih_2nd_corps', 177, 'RBiH', stateWithGenerationsUsed('RBiH', 2));
        const b = pickOperationName('arbih_2nd_corps', 177, 'RBiH', stateWithGenerationsUsed('RBiH', 2));
        expect(a).toBe(b);
    });
});
