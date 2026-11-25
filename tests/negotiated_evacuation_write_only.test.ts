/**
 * A9 P1 (SD13, 8-seat §6 ruling D9, 2026-11-25): the negotiated-evacuation convoy records are stored for display
 * only, and the episode state is read only by the convoy rule. Nothing in scoring, endgame or combat names them;
 * the convoy rule books nothing into the displacement event log. Old saves load without the fields; a save round
 * trip is byte-identical. The display pass extends the allow-lists below (keep them sorted).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { deserializeState, serializeState } from '../src/state/serialize.js';
import { withoutComments } from './helpers/sourceComments.js';

const ROOT = process.cwd();

/** Files (src, tools, scripts) allowed to name `negotiated_evacuation_records`. Sorted; extend for the display pass. */
const RECORDS_ALLOWED_FILES = [
    'src/state/displacement.ts',
    'src/state/game_state.ts',
] as const;

/** Files allowed to name the episode state. Only the convoy rule (and its refusal writer) and the state type. */
const EPISODE_ALLOWED_FILES = [
    'src/state/displacement.ts',
    'src/state/game_state.ts',
] as const;

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

describe('A9 P1 convoy records: write-only source scan', () => {
    it('the allow-lists are sorted', () => {
        expect([...RECORDS_ALLOWED_FILES]).toEqual([...RECORDS_ALLOWED_FILES].sort());
        expect([...EPISODE_ALLOWED_FILES]).toEqual([...EPISODE_ALLOWED_FILES].sort());
    });

    it('only the allowed files name negotiated_evacuation_records', () => {
        expect(filesMatching(/negotiated_evacuation_records/)).toEqual([...RECORDS_ALLOWED_FILES]);
    });

    it('only the convoy rule and the state type name the episode state', () => {
        expect(filesMatching(/negotiated_evacuation_by_side/)).toEqual([...EPISODE_ALLOWED_FILES]);
    });

    it('the convoy rule only appends to the records, never reads them for a decision', () => {
        const src = withoutComments(readFileSync(join(ROOT, 'src/state/displacement.ts'), 'utf8'));
        expect(src.match(/negotiated_evacuation_records/g)).toHaveLength(1);
        expect(src).toContain('(state.displacement.negotiated_evacuation_records ??= [])');
    });

    it('scoring, endgame, combat and the displacement event log never name the convoy state', () => {
        const pattern = /negotiated_evacuation_records|negotiated_evacuation_by_side|NegotiatedEvacuation/;
        expect(filesMatching(pattern, FORBIDDEN_ROOTS)).toEqual([]);
        for (const file of FORBIDDEN_FILES) {
            expect(withoutComments(readFileSync(join(ROOT, file), 'utf8'))).not.toMatch(pattern);
        }
    });
});

describe('A9 P1 convoy state: saves', () => {
    const OLD_SAVE = readFileSync(join(ROOT, 'tests/fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');

    it('an old save without the fields loads, and re-serializes without inventing them', () => {
        const state = deserializeState(OLD_SAVE);
        expect(state.displacement.negotiated_evacuation_records).toBeUndefined();
        const once = serializeState(state);
        expect(once).not.toContain('negotiated_evacuation_records');
        expect(once).not.toContain('negotiated_evacuation_by_side');
        expect(serializeState(deserializeState(once))).toBe(once);
    });

    it('a save carrying both fields round-trips byte for byte', () => {
        const state = deserializeState(OLD_SAVE);
        state.displacement.negotiated_evacuation_records = [{
            turn: 50, mun_id: 'srebrenica', side: 'RBiH', besieger: 'RS', people: 2_100, from_sheltered: 2_000,
            from_residents: 100, convoy: 1, episode_people: 2_100, reason: 'negotiated_evacuation',
        }];
        const munId = Object.keys(state.displacement.displacement_state).sort()[0]!;
        state.displacement.displacement_state[munId]!.negotiated_evacuation_by_side = {
            RBiH: { opened_turn: 50, convoys: 1, people: 2_100, last_convoy_turn: 50, refused_turn: null },
        };
        const once = serializeState(state);
        const back = deserializeState(once);
        expect(serializeState(back)).toBe(once);
        expect(back.displacement.displacement_state[munId]!.negotiated_evacuation_by_side?.RBiH?.refused_turn).toBeNull();
        expect(back.displacement.negotiated_evacuation_records?.[0]?.reason).toBe('negotiated_evacuation');
    });
});
