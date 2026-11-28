import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Orchestrator ruling §77 (2026-11-28; §6 panel (b) 4/4): G1 records ONE dated, single-cell
// EXPECTED-RED, op:sekovici:kastijelj_2 at week 176 in the historical run, owned by the engine row
// DRINA-HOME-DEFENCE. It never reads as "G1 green", and any other G1 row still turns G1 red.
const require = createRequire(import.meta.url);
const gate = require('../tools/lib/farz_objective_gate.cjs');

const KASTIJELJ = 'op:sekovici:kastijelj_2';
const CORPS: Record<string, string> = {
    arbih_116th_mountain: 'arbih_2nd_corps', b3: 'arbih_3rd_corps', b2: 'arbih_2nd_corps',
};
const corpsOf = (id: string) => CORPS[id] ?? null;
const row = (osid: string, turn: number, attacker = 'arbih_116th_mountain') => ({ osid, turn, attacker });

describe('G1 expected-red (§77)', () => {
    it('holds exactly one dated entry, citing §77 and DRINA-HOME-DEFENCE, historical mode only', () => {
        expect(gate.G1_EXPECTED_RED).toEqual([{
            osid: KASTIJELJ, turn: 176, mode: 'historical', corps: 'arbih_2nd_corps',
            recorded: '2026-11-28', ruling: '§77', row: 'DRINA-HOME-DEFENCE',
        }]);
        expect(Object.isFrozen(gate.G1_EXPECTED_RED)).toBe(true);
    });

    it('the Kastijelj cell at week 176 by the 2nd Corps in the historical run is red-expected', () => {
        const s = gate.splitG1ExpectedRed([row(KASTIJELJ, 176)], { mode: 'historical', corpsOf });
        expect(s.matched.map((r: { osid: string }) => r.osid)).toEqual([KASTIJELJ]);
        expect(s.unexpected).toEqual([]);
        expect(s.unused).toEqual([]);
    });

    it('a second G1 cell still turns G1 red', () => {
        const s = gate.splitG1ExpectedRed([row(KASTIJELJ, 176), row('op:sekovici:sekovici_2', 180)], { mode: 'historical', corpsOf });
        expect(s.matched).toHaveLength(1);
        expect(s.unexpected.map((r: { osid: string }) => r.osid)).toEqual(['op:sekovici:sekovici_2']);
    });

    it('the same cell in another week, in the emergent run, or by another corps stays red', () => {
        const otherWeek = gate.splitG1ExpectedRed([row(KASTIJELJ, 175)], { mode: 'historical', corpsOf });
        const emergent = gate.splitG1ExpectedRed([row(KASTIJELJ, 176)], { mode: 'emergent', corpsOf });
        const otherCorps = gate.splitG1ExpectedRed([row(KASTIJELJ, 176, 'b3')], { mode: 'historical', corpsOf });
        for (const s of [otherWeek, emergent, otherCorps]) {
            expect(s.matched).toEqual([]);
            expect(s.unexpected).toHaveLength(1);
        }
    });

    it('the entry covers one capture only: a retake of the same cell in the same week is red', () => {
        const s = gate.splitG1ExpectedRed([row(KASTIJELJ, 176), row(KASTIJELJ, 176, 'b2')], { mode: 'historical', corpsOf });
        expect(s.matched).toHaveLength(1);
        expect(s.unexpected).toHaveLength(1);
    });

    it('an entry that does not fire is reported unused (stale records stay visible)', () => {
        const s = gate.splitG1ExpectedRed([], { mode: 'historical', corpsOf });
        expect(s.unused.map((x: { osid: string }) => x.osid)).toEqual([KASTIJELJ]);
        expect(gate.splitG1ExpectedRed([], { mode: 'emergent', corpsOf }).unused).toEqual([]);
    });

    it('the verify tool breaks G1 only on unexpected rows and never prints the expected one as a pass', () => {
        const src = readFileSync(new URL('../tools/verify_checkpoints.cjs', import.meta.url), 'utf8');
        expect(src).toMatch(/const g1 = splitG1ExpectedRed\(eastRows, \{ mode: farzMode, corpsOf \}\);/);
        expect(src).toMatch(/if \(g1\.unexpected\.length > 0\) \{\s*farzGateBroken\+\+;/);
        expect(src).toMatch(/RED-EXPECTED t\$\{r\.turn\}[^\n]*NOT green/);
        expect(src).toMatch(/G1 RED-EXPECTED: \$\{g1\.matched\.length\}[^\n]*G1 is NOT green/);
        expect(src).not.toMatch(/eastRows\.length === 0\) console\.log\([^\n]*\n\s*else \{\s*farzGateBroken\+\+;/);
    });
});
