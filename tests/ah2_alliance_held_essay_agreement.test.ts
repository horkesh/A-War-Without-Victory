/**
 * AH-2 (§6 bright-line sitting 2026-11-26, 8/8 on the r2 text; round 3 8/8 on operand A).
 *
 * The retired `federation_never_fractured` read (no writer anywhere) is replaced by:
 * - essay lines: `GAME_OVER AND NOT EVENT:croat_bosniak_war_begins_1993`;
 * - the `alliance_held` ghost: alliance `war_started_turn` null AND the onset event not fired, from t70.
 *
 * Every visible line is worded to be true at any ending, including one before onset could
 * happen (a t30 collapse). The predicate and the essay lines agree on the states where the
 * alliance record and the onset event coincide. A state with `war_started_turn` set and the
 * onset event unfired is a REGISTERED divergence (round 3, Q2), excluded here and not asserted.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState } from '../src/state/game_state.js';
import {
    evaluateEssayCondition,
    resolveCodexEssay,
    type EssayEntry,
} from '../src/ui/map/components/codex/codexEssayResolver.js';

const ONSET = 'croat_bosniak_war_begins_1993';

const essayIndex = JSON.parse(
    readFileSync(resolve(__dirname, '..', 'data', 'scenarios', 'essays', 'essay_index.json'), 'utf8'),
) as { essays: EssayEntry[] } | EssayEntry[];
const essays: EssayEntry[] = Array.isArray(essayIndex) ? essayIndex : essayIndex.essays;
const ahmici = essays.find((e) => e.id === 'essay_ahmici_massacre_1993')!;
const note = ahmici.dynamic_sections!.find((s) => s.id === 'v091_ahmici_federation_held_note')!;

function ghostState(onsetFired: boolean, warStartedTurn: number | null): GameState {
    return {
        meta: { turn: 188, phase: 'war', player_faction: 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        paramilitary_policy: 'ask',
        political: { rbih_hrhb_state: { war_started_turn: warStartedTurn } },
        military: {
            event_flags: {},
            event_fire_counts: onsetFired ? { [ONSET]: 1 } : {},
            event_decision_log: [],
            fired_event_ids: onsetFired ? [ONSET] : [],
            event_last_fired_turn: onsetFired ? { [ONSET]: 49 } : {},
            event_causality_log: [],
            negotiation: { capital: {}, patron_relationships: {}, peace_plan_history: [] },
        },
    } as unknown as GameState;
}

const ghostShows = (state: GameState, turn: number) =>
    buildGhostEntries(state, turn).some((g) => g.ghost_id === 'alliance_held');

describe('AH-2: the federation_never_fractured read is retired', () => {
    it('no essay line reads the flag', () => {
        const raw = JSON.stringify(ahmici);
        expect(raw).not.toContain('federation_never_fractured');
        expect(ahmici.ghost_when).toBe(`GAME_OVER AND NOT EVENT:${ONSET}`);
        expect(note.condition).toBe(`GAME_OVER AND NOT EVENT:${ONSET}`);
    });

    it('war fired hides the note; never fired shows it', () => {
        const fired = { firedEventIds: new Set([ONSET]), gameOver: true };
        const never = { firedEventIds: new Set<string>(), gameOver: true };
        expect(evaluateEssayCondition(note.condition, fired)).toBe(false);
        expect(evaluateEssayCondition(note.condition, never)).toBe(true);
        expect(evaluateEssayCondition(ahmici.ghost_when, fired)).toBe(false);
        expect(evaluateEssayCondition(ahmici.ghost_when, never)).toBe(true);
    });

    it('a t30 ending shows the amended wording, true at any ending (EN and BCS)', () => {
        const context = { firedEventIds: new Set<string>(), gameOver: true, currentTurn: 30 };
        const en = resolveCodexEssay(ahmici, context, 'en').paragraphs.map((p) => p.text).join('\n');
        const bcs = resolveCodexEssay(ahmici, context, 'bcs').paragraphs.map((p) => p.text).join('\n');
        const enAll = `${en}\n${ahmici.ghost_summary}`;
        expect(enAll).toContain('did not collapse into war before the campaign ended');
        expect(enAll).toContain('In your campaign no Croat-Bosniak war was recorded before it ended.');
        expect(enAll).not.toContain('did not collapse during the spring of 1993');
        expect(enAll).not.toContain('the Lašva Valley operations of April 1993 did not occur');
        const bcsLoc = (ahmici as { localizations?: { bcs?: { ghost_summary?: string } } }).localizations?.bcs;
        const bcsAll = `${bcs}\n${bcsLoc?.ghost_summary ?? ''}`;
        expect(bcsAll).toContain('nije se raspao u rat prije njenog završetka');
        expect(bcsAll).toContain('U vašoj kampanji do njenog završetka nije zabilježen hrvatsko-bošnjački rat.');
    });

    it('predAllianceHeld and the essay lines agree where the alliance record and the onset event coincide', () => {
        // War: alliance fell (t49) and the onset fired. Both hide.
        const war = ghostState(true, 49);
        expect(ghostShows(war, 188)).toBe(false);
        expect(evaluateEssayCondition(note.condition, { firedEventIds: new Set([ONSET]), gameOver: true })).toBe(false);

        // Held: no alliance fall and no onset. Both show (the ghost from t70).
        const held = ghostState(false, null);
        expect(ghostShows(held, 188)).toBe(true);
        expect(evaluateEssayCondition(note.condition, { firedEventIds: new Set<string>(), gameOver: true })).toBe(true);
    });
});
