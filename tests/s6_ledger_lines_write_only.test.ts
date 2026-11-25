/**
 * Ledger lines 1-2 (§6 + §4 panels, 2026-11-24, `s6_ledger12_ruling.md`): two WRITE-ONLY stored
 * fields for display.
 *   L1 `displacement.moved_on_at_capture_by_people`: cumulative, by people.
 *   L2 `displacement_state[mun].unable_to_leave_by_side`: this week's stock, stamped with the turn.
 * No simulation code may read either field. The projection keeps only the player's own L2 entries,
 * and the UI shows an L2 entry only when its turn stamp is the current turn. Old saves load
 * without the fields, and a save round trip is byte-identical.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { deserializeState, serializeState } from '../src/state/serialize.js';
import { readUnableToLeaveThisWeekByMun } from '../src/ui/map/data/GameStateAdapter.js';
import { withoutComments } from './helpers/sourceComments.js';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleState } = require('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

const ROOT = process.cwd();

function walk(dir: string, out: string[]): void {
    for (const name of readdirSync(dir).sort()) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx|cjs|js|mjs)$/.test(name)) out.push(full);
    }
}

function filesMatching(pattern: RegExp): string[] {
    const files: string[] = [];
    walk(join(ROOT, 'src'), files);
    walk(join(ROOT, 'tools'), files);
    walk(join(ROOT, 'scripts'), files);
    return files
        .filter((f) => !f.includes(`${sep}i18n${sep}`))
        .filter((f) => pattern.test(withoutComments(readFileSync(f, 'utf8'))))
        .map((f) => relative(ROOT, f).split(sep).join('/'))
        .sort();
}

describe('Ledger lines 1-2: write-only source scan', () => {
    it('only the writers, the state type, the projection and the adapter name the stored fields', () => {
        expect(filesMatching(/moved_on_at_capture_by_people|unable_to_leave_by_side/)).toEqual([
            'src/desktop/player_visible_state.cjs',
            'src/state/displacement.ts',
            'src/state/displacement_takeover.ts',
            'src/state/game_state.ts',
            'src/ui/map/data/GameStateAdapter.ts',
        ]);
    });

    it('the engine files only write them (clear, write, increment), never read them for a decision', () => {
        const disp = withoutComments(readFileSync(join(ROOT, 'src/state/displacement.ts'), 'utf8'));
        expect(disp.match(/unable_to_leave_by_side/g)).toHaveLength(3);
        expect(disp).toContain('delete entry.unable_to_leave_by_side');
        expect(disp).toContain('(dispState.unable_to_leave_by_side ??= {})[side] = { amount, turn }');
        const takeover = withoutComments(readFileSync(join(ROOT, 'src/state/displacement_takeover.ts'), 'utf8'));
        expect(takeover.match(/moved_on_at_capture_by_people/g)).toHaveLength(1);
        expect(takeover).toContain('(state.displacement.moved_on_at_capture_by_people ??= {})');
    });

    it('the display views are read only by the adapter, the Ledger and the enclave card', () => {
        expect(filesMatching(/movedOnAtCaptureByPeople|unableToLeaveThisWeek|unable_to_leave_this_week/)).toEqual([
            'src/ui/map/components/EnclaveDashboard.tsx',
            'src/ui/map/components/HumanitarianLedgerPanel.tsx',
            'src/ui/map/data/GameStateAdapter.ts',
            'src/ui/map/data/types.ts',
        ]);
    });

    it('capture_pass_through is the only reason that reaches the reportReason branch', () => {
        const hits = filesMatching(/reportReason:\s*'/);
        expect(hits).toEqual(['src/state/displacement_takeover.ts']);
        const src = withoutComments(readFileSync(join(ROOT, 'src/state/displacement_takeover.ts'), 'utf8'));
        expect(src.match(/reportReason:\s*'[a-z_]+'/g)).toEqual(["reportReason: 'capture_pass_through'"]);
    });
});

function projectionState(playerFaction: string | undefined): Record<string, any> {
    return {
        schema_version: 34,
        meta: { turn: 40, phase: 'war', player_faction: playerFaction },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: { formations: {} },
        political: { political_controllers: { 'op:gorazde:a': 'RBiH', 'op:gorazde:b': 'RS' } },
        displacement: {
            displacement_state: {
                gorazde: { mun_id: 'gorazde', unable_to_leave_by_side: { RBiH: { amount: 410, turn: 40 }, RS: { amount: 12, turn: 40 } } },
                visegrad: { mun_id: 'visegrad', unable_to_leave_by_side: { RS: { amount: 30, turn: 40 } } },
            },
            moved_on_at_capture_by_people: { HRHB: 50, RBiH: 1200 },
            sustainability_state: {},
        },
    };
}

describe('Ledger lines 1-2: projection', () => {
    it('keeps only the player\'s own L2 entries, drops empty containers, passes L1, and never mutates state', () => {
        const state = projectionState('RBiH');
        const before = JSON.stringify(state);
        const projected = projectPlayerVisibleState(state);
        expect(JSON.stringify(state)).toBe(before);
        const ds = projected.displacement.displacement_state;
        expect(ds.gorazde.unable_to_leave_by_side).toEqual({ RBiH: { amount: 410, turn: 40 } });
        expect(ds.visegrad.unable_to_leave_by_side).toBeUndefined();
        expect(JSON.stringify(ds)).not.toContain('"RS":{"amount"');
        expect(projected.displacement.moved_on_at_capture_by_people).toEqual({ HRHB: 50, RBiH: 1200 });
    });

    it('drops every L2 entry when no player faction is set', () => {
        const projected = projectPlayerVisibleState(projectionState(undefined));
        expect(JSON.stringify(projected.displacement.displacement_state)).not.toContain('unable_to_leave_by_side');
    });
});

describe('Ledger line 2: the UI reads this week only', () => {
    const ds = {
        gorazde: { unable_to_leave_by_side: { RBiH: { amount: 410, turn: 40 } } },
        srebrenica: { unable_to_leave_by_side: { RBiH: { amount: 90, turn: 39 } } },
        zvornik: { unable_to_leave_by_side: { RS: { amount: 7, turn: 40 } } },
    };

    it('a one-turn-old stamp is hidden and other sides are ignored', () => {
        expect(readUnableToLeaveThisWeekByMun(ds, 'RBiH', 40)).toEqual({ gorazde: 410 });
        expect(readUnableToLeaveThisWeekByMun(ds, 'RBiH', 41)).toEqual({});
        expect(readUnableToLeaveThisWeekByMun(ds, null, 40)).toEqual({});
    });
});

describe('Ledger lines 1-2: saves', () => {
    const OLD_SAVE = readFileSync(join(ROOT, 'tests/fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');

    it('an old save without the fields loads, and re-serializes without inventing them', () => {
        const state = deserializeState(OLD_SAVE);
        expect(state.displacement.moved_on_at_capture_by_people).toBeUndefined();
        const once = serializeState(state);
        expect(once).not.toContain('moved_on_at_capture_by_people');
        expect(once).not.toContain('unable_to_leave_by_side');
        expect(serializeState(deserializeState(once))).toBe(once);
    });

    it('a save carrying both fields round-trips byte for byte', () => {
        const state = deserializeState(OLD_SAVE);
        state.displacement.moved_on_at_capture_by_people = { RBiH: 1200, HRHB: 50 };
        const munId = Object.keys(state.displacement.displacement_state).sort()[0]!;
        state.displacement.displacement_state[munId]!.unable_to_leave_by_side = { RBiH: { amount: 410, turn: state.meta.turn } };
        const once = serializeState(state);
        const back = deserializeState(once);
        expect(serializeState(back)).toBe(once);
        expect(back.displacement.moved_on_at_capture_by_people).toEqual({ HRHB: 50, RBiH: 1200 });
        expect(back.displacement.displacement_state[munId]!.unable_to_leave_by_side).toEqual({ RBiH: { amount: 410, turn: state.meta.turn } });
    });
});
