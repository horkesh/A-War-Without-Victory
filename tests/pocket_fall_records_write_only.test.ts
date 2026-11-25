/**
 * A9 P0-A (SD13, 8-seat §6 ruling D5-D6, 2026-11-25): the pocket-fall record and its booked-once marker are
 * stored for display only. Nothing in the simulation may read `displacement.pocket_fall_records`, and only
 * the pocket-fall step itself reads `pocket_fall_originals_booked_by_side`. No scoring, endgame, combat or
 * event-log code names the pocket fall at all. Old saves load without the fields; a save round trip is
 * byte-identical. The UI pass extends the allow-lists below (keep them sorted).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { deserializeState, serializeState } from '../src/state/serialize.js';
import { withoutComments } from './helpers/sourceComments.js';

const ROOT = process.cwd();

/** Files (src, tools, scripts) allowed to name `pocket_fall_records`. Sorted; extend for the display pass. */
const RECORDS_ALLOWED_FILES = [
    'src/desktop/player_visible_state.cjs', // display projection, own side only
    'src/state/game_state.ts',
    'src/state/pocket_fall.ts',
    'src/ui/map/data/GameStateAdapter.ts', // display read model (Ledger and enclave card)
] as const;

/** Files allowed to name the booked-once marker. Only the step and the state type. */
const MARKER_ALLOWED_FILES = [
    'src/state/game_state.ts',
    'src/state/pocket_fall.ts',
] as const;

/** Places that must never name the pocket fall (scoring, endgame, combat, the displacement event log). */
const FORBIDDEN_ROOTS = ['src/sim/negotiation', 'src/sim/endgame', 'src/sim/combat'] as const;
const FORBIDDEN_FILES = ['src/state/displacement_event_log.ts'] as const;

function walk(dir: string, out: string[]): void {
    for (const name of readdirSync(dir).sort()) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx|cjs|js|mjs)$/.test(name)) out.push(full);
    }
}

function filesMatching(pattern: RegExp, roots: readonly string[] = ['src', 'tools', 'scripts']): string[] {
    const files: string[] = [];
    for (const root of roots) walk(join(ROOT, root), files);
    return files
        .filter((f) => !f.includes(`${sep}i18n${sep}`))
        .filter((f) => pattern.test(withoutComments(readFileSync(f, 'utf8'))))
        .map((f) => relative(ROOT, f).split(sep).join('/'))
        .sort();
}

describe('P0-A pocket-fall record: write-only source scan', () => {
    it('the allow-lists are sorted', () => {
        expect([...RECORDS_ALLOWED_FILES]).toEqual([...RECORDS_ALLOWED_FILES].sort());
        expect([...MARKER_ALLOWED_FILES]).toEqual([...MARKER_ALLOWED_FILES].sort());
    });

    it('only the allowed files name pocket_fall_records', () => {
        expect(filesMatching(/pocket_fall_records/)).toEqual([...RECORDS_ALLOWED_FILES]);
    });

    it('only the step and the state type name the booked-once marker', () => {
        expect(filesMatching(/pocket_fall_originals_booked_by_side/)).toEqual([...MARKER_ALLOWED_FILES]);
    });

    it('the step only appends to the record, never reads it for a decision', () => {
        const src = withoutComments(readFileSync(join(ROOT, 'src/state/pocket_fall.ts'), 'utf8'));
        expect(src.match(/pocket_fall_records/g)).toHaveLength(1);
        expect(src).toContain('(state.displacement.pocket_fall_records ??= [])');
    });

    it('scoring, endgame, combat and the displacement event log never name the pocket fall', () => {
        expect(filesMatching(/pocket_fall/i, FORBIDDEN_ROOTS)).toEqual([]);
        for (const file of FORBIDDEN_FILES) {
            expect(withoutComments(readFileSync(join(ROOT, file), 'utf8'))).not.toMatch(/pocket_fall/i);
        }
    });

    it('the step books nothing into the event log, aggregates, civilian casualties or pools', () => {
        const src = withoutComments(readFileSync(join(ROOT, 'src/state/pocket_fall.ts'), 'utf8'));
        for (const name of [
            'appendDisplacementEvent',
            'pushDisplacementEventLogFromMun',
            'recordCivilianDisplacementCasualties',
            'displacement_humanitarian_aggregates',
            'displacement_origin_dest_arrivals',
            'civilian_casualties',
            'militia_pools',
            'formations',
        ]) {
            expect(src).not.toContain(name);
        }
    });
});

describe('P0-A pocket-fall record: saves', () => {
    const OLD_SAVE = readFileSync(join(ROOT, 'tests/fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');

    it('an old save without the fields loads, and re-serializes without inventing them', () => {
        const state = deserializeState(OLD_SAVE);
        expect(state.displacement.pocket_fall_records).toBeUndefined();
        const once = serializeState(state);
        expect(once).not.toContain('pocket_fall_records');
        expect(once).not.toContain('pocket_fall_originals_booked_by_side');
        expect(serializeState(deserializeState(once))).toBe(once);
    });

    it('a save carrying both fields round-trips byte for byte', () => {
        const state = deserializeState(OLD_SAVE);
        state.displacement.pocket_fall_records = [{
            turn: 170, mun_id: 'srebrenica', side: 'RBiH', captor: 'RS', left: 100, routed: 60, fled_abroad: 40,
            killed: 23, negotiated: false, reason: 'pocket_fall',
        }, {
            turn: 172, mun_id: 'rogatica', side: 'RBiH', captor: 'RS', left: 50, routed: 50, fled_abroad: 0,
            killed: null, negotiated: true, reason: 'pocket_fall',
        }];
        const munId = Object.keys(state.displacement.displacement_state).sort()[0]!;
        state.displacement.displacement_state[munId]!.pocket_fall_originals_booked_by_side = { RBiH: 170 };
        const once = serializeState(state);
        const back = deserializeState(once);
        expect(serializeState(back)).toBe(once);
        expect(back.displacement.pocket_fall_records?.[1]?.killed).toBeNull();
        expect(back.displacement.displacement_state[munId]!.pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });
    });
});
