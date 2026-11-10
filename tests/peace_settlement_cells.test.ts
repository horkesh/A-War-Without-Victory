/**
 * Per-cell opening assignments on the Dayton map (DC plan, stage 1).
 *
 * The municipality quota pass in peace_settlement.ts fills area shares in sorted cell
 * order, so inside a split municipality the alphabet decides which cell falls to the
 * other entity: in the signed RS fixture Sapna (the Federation municipal seat) and
 * Teočak went to RS while peripheral cells kept the Federation quota. An audited cell
 * table fixes named cells before the quota pass; everything else is unchanged.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState } from '../src/state/game_state.js';
import {
    computeSettlementControllers,
    computeSettlementControllersWith,
    type SettlementCellTable,
} from '../src/sim/negotiation/peace_settlement.js';

const root = process.cwd();
const painted = JSON.parse(readFileSync(resolve(root, 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, string>;
const derived = JSON.parse(readFileSync(resolve(root, 'data/derived/peace/plan_cell_assignments.json'), 'utf8')) as {
    schema_version: number; plans: Record<string, SettlementCellTable>;
};
const source = JSON.parse(readFileSync(resolve(root, 'data/source/peace_plans/dayton_cell_assignments.json'), 'utf8')) as {
    cells: Record<string, { entity: string; faction: string | null; confidence: string }>;
};
const areas = JSON.parse(readFileSync(resolve(root, 'data/derived/operational/osid_areas.json'), 'utf8')).areas as Record<string, number>;

/** The wartime map of the signed RS fixture in Zvornik and Ugljevik, over the painted October 1995 base. */
function fixtureState(): GameState {
    const wartime: Record<string, string> = { ...painted };
    const rs = ['op:zvornik:donja_kamenica', 'op:zvornik:gornji_sepak_2', 'op:zvornik:kozluk_2', 'op:zvornik:krizevici', 'op:zvornik:novo_selo', 'op:zvornik:zvornik',
        'op:ugljevik:donja_trnova_2', 'op:ugljevik:ugljevik_2', 'op:ugljevik:zabrdje_2'];
    const rbih = ['op:zvornik:djulici', 'op:zvornik:rastosnica_2', 'op:zvornik:sapna', 'op:ugljevik:jasikovac', 'op:ugljevik:srednja_trnova_2', 'op:ugljevik:teocak_krstac_2'];
    for (const o of rs) wartime[o] = 'RS';
    for (const o of rbih) wartime[o] = 'RBiH';
    return {
        meta: { turn: 188, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: 'RS' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {} },
        political: { political_controllers: wartime },
        displacement: {},
    } as unknown as GameState;
}

const SAPNA = 'op:zvornik:sapna';
const TEOCAK = 'op:ugljevik:teocak_krstac_2';

describe('quota pass without a cell table (the recorded defect)', () => {
    it('sends Sapna to RS by sorted-order quota exhaustion (Teočak is now held by the enclave rule, DC A6)', () => {
        const { controllers } = computeSettlementControllersWith(fixtureState(), 'dayton', {}, {});
        expect(controllers[SAPNA]).toBe('RS');
        expect(controllers[TEOCAK]).toBe('RBiH');
    });
});

describe('audited cells fix the opening line before the quota pass', () => {
    const table: SettlementCellTable = {
        [SAPNA]: { faction: 'RBiH', special: false, confidence: 'verified' },
        [TEOCAK]: { faction: 'RBiH', special: false, confidence: 'verified' },
        'op:zvornik:djulici': { faction: 'RS', special: false, confidence: 'verified' },
    };

    it('keeps the named cells with their audited side and lets the rest fall to the quota', () => {
        const { controllers } = computeSettlementControllersWith(fixtureState(), 'dayton', {}, table);
        expect(controllers[SAPNA]).toBe('RBiH');
        expect(controllers[TEOCAK]).toBe('RBiH');
        expect(controllers['op:zvornik:djulici']).toBe('RS');
    });

    it('charges fixed cells against the quota so the municipality share is not inflated', () => {
        const base = computeSettlementControllersWith(fixtureState(), 'dayton', {}, {}).controllers;
        const fixed = computeSettlementControllersWith(fixtureState(), 'dayton', {}, table).controllers;
        const fedArea = (c: Record<string, string>, mun: string) => Object.keys(c).filter(o => o.startsWith(`op:${mun}:`) && c[o] !== 'RS').reduce((s, o) => s + (areas[o] ?? 0), 0);
        // Zvornik: the Federation keeps Rastošnica + Sapna (131.5 km²) and loses Đulići (22.8),
        // which is within one cell of the 123.6 km² quota; the fixed table never grants a
        // whole second quota on top of the audited cells.
        expect(fedArea(fixed, 'zvornik')).toBeLessThan(fedArea(base, 'zvornik') + areas[SAPNA]! + 1);
    });

    it('a special cell stays with its wartime holder and is listed as special', () => {
        const { controllers, special } = computeSettlementControllersWith(fixtureState(), 'dayton', {},
            { [SAPNA]: { faction: null, special: true, confidence: 'verified' } });
        expect(special).toContain(SAPNA);
        expect(controllers[SAPNA]).toBe('RBiH');
    });

    it('a Federation cell with no named party takes the wartime Federation holder', () => {
        const { controllers } = computeSettlementControllersWith(fixtureState(), 'dayton', {},
            { [TEOCAK]: { faction: null, special: false, confidence: 'approximate' } });
        expect(controllers[TEOCAK]).toBe('RBiH');
    });

    it('is deterministic and ignores key order', () => {
        const a = computeSettlementControllersWith(fixtureState(), 'dayton', {}, table);
        const reversed = Object.fromEntries(Object.entries(table).reverse()) as SettlementCellTable;
        const b = computeSettlementControllersWith(fixtureState(), 'dayton', {}, reversed);
        expect(a).toEqual(b);
    });
});

describe('derived cell table', () => {
    it('matches the source file row for row (unresolved rows dropped) and is what the resolver uses', () => {
        const dayton = derived.plans.dayton ?? {};
        const kept = Object.entries(source.cells).filter(([, row]) => row.confidence !== 'unresolved');
        expect(Object.keys(dayton).length).toBe(kept.length);
        for (const [osid, row] of kept) {
            expect(areas[osid], `${osid} is not a map cell`).toBeDefined();
            expect(dayton[osid]?.special).toBe(row.entity === 'special');
            if (row.entity === 'RS') expect(dayton[osid]?.faction).toBe('RS');
        }
        const viaTable = computeSettlementControllersWith(fixtureState(), 'dayton', {}, dayton);
        expect(computeSettlementControllers(fixtureState(), 'dayton')).toEqual(viaTable);
    });

    it('once audited, Sapna and Teočak open on the Federation side', () => {
        const dayton = derived.plans.dayton ?? {};
        if (!dayton[SAPNA] || !dayton[TEOCAK]) return; // audit not yet landed; the mechanism tests above cover the rule
        const { controllers } = computeSettlementControllers(fixtureState(), 'dayton');
        expect(controllers[SAPNA]).not.toBe('RS');
        expect(controllers[TEOCAK]).not.toBe('RS');
    });
});

describe('the contiguity pass respects verified cells (historian audit, 2026-11-08)', () => {
    const LUKAVICA = 'op:novo_sarajevo:lukavica';
    const POSAVINA = new Set(['orasje', 'bosanski_samac', 'odzak']);
    const side = (f: string) => (f === 'RS' ? 'RS' : 'FED');

    function paintedState(): GameState {
        return { ...fixtureState(), political: { political_controllers: { ...painted } } } as unknown as GameState;
    }

    it('never routes the Goražde corridor through Istočno Sarajevo: Lukavica stays RS after the pass', () => {
        const dayton = derived.plans.dayton ?? {};
        if (dayton[LUKAVICA]?.confidence !== 'verified') return;
        const before = computeSettlementControllersWith(paintedState(), 'dayton', {}, dayton, { contiguity: false }).controllers;
        const after = computeSettlementControllers(paintedState(), 'dayton').controllers;
        expect(before[LUKAVICA]).toBe('RS');
        expect(after[LUKAVICA]).toBe('RS');
    });

    it('leaves each entity in one piece apart from the Posavina canton exclaves', async () => {
        const { getSettlementAdjacency } = await import('../src/sim/negotiation/peace_settlement.js');
        const adj = getSettlementAdjacency();
        const map = computeSettlementControllers(paintedState(), 'dayton').controllers;
        const seen = new Set<string>();
        const components: Array<{ side: string; cells: string[] }> = [];
        for (const start of Object.keys(map).sort()) {
            if (seen.has(start)) continue;
            const s = side(map[start]!);
            const cells: string[] = [];
            const queue = [start];
            seen.add(start);
            while (queue.length) {
                const o = queue.pop()!;
                cells.push(o);
                for (const n of adj.get(o) ?? []) if (!seen.has(n) && map[n] && side(map[n]!) === s) { seen.add(n); queue.push(n); }
            }
            components.push({ side: s, cells });
        }
        const rs = components.filter(c => c.side === 'RS');
        const fed = components.filter(c => c.side === 'FED').sort((a, b) => b.cells.length - a.cells.length);
        expect(rs).toHaveLength(1);
        for (const comp of fed.slice(1)) {
            expect(comp.cells.every(o => POSAVINA.has(o.split(':')[1]!)), `detached Federation piece outside Posavina: ${comp.cells.slice(0, 4).join(', ')}`).toBe(true);
        }
    });
});
