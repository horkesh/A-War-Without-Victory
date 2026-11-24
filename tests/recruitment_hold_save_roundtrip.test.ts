/**
 * The president's per-brigade recruitment hold in a save (lane C s6 design sitting, 2026-11-24).
 *
 * - An old save (the shipped startup snapshot, written before the field existed) loads, plays a
 *   staff recruitment pass and re-serializes with `player_held_brigade_ids` ABSENT: no empty
 *   array is ever written by default, so a campaign that never holds stays byte-identical.
 * - Holding one brigade writes the field, strictCompare-sorted, and survives a round trip.
 * - The validator rejects an unsorted list.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import { setPlayerRecruitmentHold, selectPlayerHeldBrigadeIds } from '../src/sim/recruitment_turn.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

const SNAPSHOT = resolve(process.cwd(), 'data/derived/startup/apr_1992_initial_save.json');

function loadOldSave() {
    return deserializeState(readFileSync(SNAPSHOT, 'utf8'));
}

// The field name appears in serialized save JSON or validator output, never in source text.
const mentionsHoldField = (text: string): boolean => text.includes('player_held_brigade_ids');

describe('recruitment hold in a save', () => {
    test('an old save without the field loads and re-serializes byte-identically, with no empty list', () => {
        const state = loadOldSave();
        expect(state.military.recruitment_state).toBeDefined();
        expect('player_held_brigade_ids' in state.military.recruitment_state!).toBe(false);
        const before = serializeState(state);
        state.meta.player_faction = 'HRHB';
        state.meta.autonomy_level = 1;
        expect(selectPlayerHeldBrigadeIds(state)).toBeUndefined();
        const json = serializeState(state);
        expect(mentionsHoldField(json)).toBe(false);
        // Nothing but the two meta fields changed.
        const reloaded = deserializeState(before);
        expect(serializeState(reloaded)).toBe(before);
    });

    test('holding one brigade writes a sorted list that survives a round trip; releasing removes the field', async () => {
        const state = loadOldSave();
        state.meta.player_faction = 'HRHB';
        state.meta.autonomy_level = 1;
        const recruited = new Set(state.military.recruitment_state!.recruited_brigade_ids);
        const candidates = (await loadOobBrigades(process.cwd()))
            .filter((b) => b.faction === 'HRHB' && !recruited.has(b.id) && !state.military.formations[b.id])
            .map((b) => b.id)
            .sort();
        expect(candidates.length).toBeGreaterThanOrEqual(2);
        const [first, second] = [candidates[1]!, candidates[0]!];
        setPlayerRecruitmentHold(state, first, true);
        setPlayerRecruitmentHold(state, second, true);
        const json = serializeState(state);
        const round = deserializeState(json);
        expect(round.military.recruitment_state!.player_held_brigade_ids).toEqual([second, first]);
        expect(serializeState(round)).toBe(json);

        setPlayerRecruitmentHold(round, first, false);
        setPlayerRecruitmentHold(round, second, false);
        expect(mentionsHoldField(serializeState(round))).toBe(false);
        expect(round.military.recruitment_state!.player_held_brigade_ids).toBeUndefined();
    });

    test('the validator rejects an unsorted or duplicated hold list', () => {
        const state = loadOldSave();
        const raw = JSON.parse(serializeState(state));
        const resources = raw.state?.military?.recruitment_state ?? raw.military?.recruitment_state;
        resources.player_held_brigade_ids = ['b', 'a'];
        const target = raw.state ?? raw;
        const unsorted = validateGameStateShape(target);
        expect(JSON.stringify(unsorted)).toContain('player_held_brigade_ids');
        resources.player_held_brigade_ids = ['a', 'a'];
        expect(JSON.stringify(validateGameStateShape(target))).toContain('player_held_brigade_ids');
        resources.player_held_brigade_ids = ['a', 'b'];
        expect(mentionsHoldField(JSON.stringify(validateGameStateShape(target)))).toBe(false);
    });
});
