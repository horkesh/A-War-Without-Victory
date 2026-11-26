/**
 * AH-2 (§6 bright-line sitting 2026-11-26, 8/8 on the r2 text; round 3 8/8 on operand A),
 * closed by orchestrator ruling §27 (2026-11-26): ONE shared predicate.
 *
 * The retired `federation_never_fractured` read (no writer anywhere) is replaced by the shared
 * `rbihHrhbAllianceHeld` predicate (src/sim/codex/alliance_held.ts):
 * - essay lines: `GAME_OVER AND ALLIANCE_HELD` (the atom reads the adapter's `allianceHeld`);
 * - the `alliance_held` ghost: the same predicate, from t70 (the ghost body's own "by week seventy").
 *
 * Every visible line keeps the 8/8 wording, true at any ending. The ghost and the essay note can
 * no longer disagree: this file asserts agreement on every combination of the alliance record and
 * the onset event, including the two edge states §27 named (alliance fell with no onset event;
 * the record absent).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rbihHrhbAllianceHeld } from '../src/sim/codex/alliance_held.js';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState } from '../src/state/game_state.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
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

type AllianceRecord = 'absent' | 'held' | 'fell';

function ghostState(onsetFired: boolean, record: AllianceRecord): GameState {
    return {
        meta: { turn: 188, phase: 'war', player_faction: 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        paramilitary_policy: 'ask',
        political: record === 'absent' ? {} : { rbih_hrhb_state: { war_started_turn: record === 'fell' ? 49 : null } },
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

/** The essay context as the CodexPanel builds it: fired ids plus the shared predicate. */
function noteShows(state: GameState, gameOver = true): boolean {
    const firedEventIds = new Set<string>((state.military as { fired_event_ids?: string[] }).fired_event_ids ?? []);
    const context = { firedEventIds, gameOver, allianceHeld: rbihHrhbAllianceHeld(state) };
    return evaluateEssayCondition(note.condition, context);
}

describe('AH-2 / §27: the federation_never_fractured read is retired', () => {
    it('no essay line reads the flag; both lines read the shared ALLIANCE_HELD atom', () => {
        const raw = JSON.stringify(ahmici);
        expect(raw).not.toContain('federation_never_fractured');
        expect(ahmici.ghost_when).toBe('GAME_OVER AND ALLIANCE_HELD');
        expect(note.condition).toBe('GAME_OVER AND ALLIANCE_HELD');
    });

    it('the ALLIANCE_HELD atom fails closed when the context lacks it, and never reads an event flag', () => {
        expect(evaluateEssayCondition('ALLIANCE_HELD', { firedEventIds: new Set() })).toBe(false);
        expect(evaluateEssayCondition('ALLIANCE_HELD', {
            firedEventIds: new Set(),
            eventFlags: { ALLIANCE_HELD: true },
        })).toBe(false);
        expect(evaluateEssayCondition('ALLIANCE_HELD', { firedEventIds: new Set(), allianceHeld: true })).toBe(true);
    });

    it('a t30 ending shows the amended wording, true at any ending (EN and BCS)', () => {
        const context = { firedEventIds: new Set<string>(), gameOver: true, allianceHeld: true, currentTurn: 30 };
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
});

describe('§27: the alliance_held ghost and the essay note read ONE predicate', () => {
    const cases: Array<{ name: string; onset: boolean; record: AllianceRecord; held: boolean }> = [
        { name: 'war: alliance fell and the onset fired', onset: true, record: 'fell', held: false },
        { name: 'held: no fall and no onset', onset: false, record: 'held', held: true },
        { name: 'AH2-EDGE: alliance fell, onset never fired', onset: false, record: 'fell', held: false },
        { name: 'onset fired, alliance record still null', onset: true, record: 'held', held: false },
        { name: 'alliance record absent, no onset', onset: false, record: 'absent', held: false },
        { name: 'alliance record absent, onset fired', onset: true, record: 'absent', held: false },
    ];

    for (const c of cases) {
        it(`${c.name}: ghost (t188) and note agree (${c.held ? 'both show' : 'both hide'})`, () => {
            const state = ghostState(c.onset, c.record);
            expect(rbihHrhbAllianceHeld(state)).toBe(c.held);
            expect(ghostShows(state, 188)).toBe(c.held);
            expect(noteShows(state)).toBe(c.held);
        });
    }

    it('the note still needs GAME_OVER; the ghost keeps its t70 floor', () => {
        const held = ghostState(false, 'held');
        expect(noteShows(held, false)).toBe(false);
        expect(ghostShows(held, 69)).toBe(false);
        expect(ghostShows(held, 70)).toBe(true);
    });

    it('the adapter publishes the same predicate the ghost reads', () => {
        for (const c of cases) {
            const state = ghostState(c.onset, c.record);
            expect(parseGameState(state).allianceHeld).toBe(rbihHrhbAllianceHeld(state));
        }
    });

    it('a non-finite onset count reads as not fired, as the ghost operand reads it', () => {
        const state = ghostState(false, 'held');
        (state.military as { event_fire_counts: Record<string, number> }).event_fire_counts[ONSET] = Number.NaN;
        expect(rbihHrhbAllianceHeld(state)).toBe(true);
        expect(ghostShows(state, 188)).toBe(true);
    });
});
