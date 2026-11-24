/**
 * §6 E3b (ruling 2026-11-17, signed 6/6): one authored war-crimes count.
 *
 * `authoredWarCrimeIncidents(state, faction)` = `war_crimes_events_emergent` + every firing of a
 * scripted card marked `authored_by_choice: true` + every chosen response option carrying a
 * `war_crimes_delta`. Counted in incidents, never deltas. Every reader that judges a side's own
 * conduct uses it: the atrocity cost term, all three A+ anchors, and the Codex clean-hands ghosts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    authoredWarCrimeIncidents,
    authoredWarCrimeIncidentTerms,
    buildWarCrimeCardIndex,
    recordedWarCrimeIncidentList,
    recordedWarCrimeIncidents,
    SHIPPED_WAR_CRIME_CARDS,
} from '../src/sim/events/authored_war_crimes.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import { computeFactionGrade, computeWarCostIndex } from '../src/sim/negotiation/scoring.js';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';
import { withoutComments } from './helpers/sourceComments.js';

const row = (partial: Record<string, unknown>): EventDefinition => ({
    trigger: { turn_min: 1 },
    effect: { kind: 'narrative', text: 'x' },
    ...partial,
}) as unknown as EventDefinition;

/** A synthetic catalog: an authored RS card, a non-authored RS card, an unclassified HRHB card, one option-level delta. */
const SYNTHETIC = buildWarCrimeCardIndex([
    row({ id: 'authored_rs', title: 'Authored RS card', authored_by_choice: true, effect: { kind: 'humanitarian_impact', faction: 'RS', war_crimes_delta: 2 } }),
    row({ id: 'record_rs', title: 'Recorded RS card', authored_by_choice: false, effects: [{ kind: 'humanitarian_impact', faction: 'RS', war_crimes_delta: 3 }] }),
    row({ id: 'record_hrhb', title: 'Recorded HRHB card', effect: { kind: 'humanitarian_impact', faction: 'HRHB', war_crimes_delta: 3 } }),
    row({
        id: 'choice_rbih',
        title: 'RBiH choice',
        response_options: [
            { id: 'x', label: 'X', effects: [{ kind: 'humanitarian_impact', faction: 'RBiH', war_crimes_delta: 4 }] },
            { id: 'y', label: 'Y', effects: [{ kind: 'narrative', text: 'none' }] },
        ],
    }),
]);

function view(over: {
    emergent?: Partial<Record<string, number>>;
    fires?: Record<string, number>;
    decisions?: Array<{ event_id: string; response_id: string }>;
}) {
    const capital: Record<string, { war_crimes_events_emergent?: number; war_crimes_events: number }> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = { war_crimes_events: 0, war_crimes_events_emergent: over.emergent?.[faction] ?? 0 };
    }
    return {
        military: {
            event_fire_counts: over.fires ?? {},
            event_decision_log: over.decisions ?? [],
            negotiation: { capital },
        },
    };
}

describe('authoredWarCrimeIncidents: the one shared count', () => {
    it('counts recorded war crimes (war_crimes_events_emergent) alone', () => {
        const state = view({ emergent: { RBiH: 2 } });
        expect(authoredWarCrimeIncidents(state, 'RBiH', SYNTHETIC)).toBe(2);
        expect(recordedWarCrimeIncidents(state, 'RBiH', SYNTHETIC)).toBe(0);
        expect(authoredWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(0);
    });

    it('counts each firing of an authored card once, never its delta', () => {
        const state = view({ fires: { authored_rs: 2 } });
        expect(authoredWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(2);
        expect(recordedWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(2);
    });

    it('a non-authored or unclassified card is in the record but never authored', () => {
        const state = view({ fires: { record_rs: 1, record_hrhb: 1 } });
        expect(authoredWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(0);
        expect(authoredWarCrimeIncidents(state, 'HRHB', SYNTHETIC)).toBe(0);
        expect(recordedWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(1);
        expect(recordedWarCrimeIncidents(state, 'HRHB', SYNTHETIC)).toBe(1);
    });

    it('an option-level war_crimes_delta is authored by default and read from the decision log', () => {
        const state = view({ decisions: [{ event_id: 'choice_rbih', response_id: 'x' }, { event_id: 'choice_rbih', response_id: 'y' }] });
        expect(authoredWarCrimeIncidents(state, 'RBiH', SYNTHETIC)).toBe(1);
        expect(recordedWarCrimeIncidentList(state, 'RBiH', SYNTHETIC)).toEqual([
            { event_id: 'choice_rbih', response_id: 'x', title: 'RBiH choice', count: 1 },
        ]);
    });

    it('sums all three sources and lists its terms with their state paths', () => {
        const state = view({ emergent: { RS: 1 }, fires: { authored_rs: 1, record_rs: 1 } });
        expect(authoredWarCrimeIncidents(state, 'RS', SYNTHETIC)).toBe(2);
        expect(authoredWarCrimeIncidentTerms(state, 'RS', SYNTHETIC)).toEqual([
            { source: 'recorded_war_crime', owner_path: 'state.military.negotiation.capital.RS.war_crimes_events_emergent', count: 1 },
            { source: 'authored_card', owner_path: 'state.military.event_fire_counts.authored_rs', event_id: 'authored_rs', count: 1 },
        ]);
        expect(recordedWarCrimeIncidentList(state, 'RS', SYNTHETIC).map((i) => i.event_id)).toEqual(['authored_rs', 'record_rs']);
    });

    it('the shipped catalog classifies exactly the three choice-dependent war-crimes rows', () => {
        const classified = SHIPPED_WAR_CRIME_CARDS.cards
            .filter((card) => card.authored_by_choice !== undefined)
            .map((card) => [card.event_id, card.authored_by_choice]);
        expect(Object.fromEntries(classified)).toEqual({
            csq_accelerated_camps_discovery_1992: true,
            ahmici_massacre_1993: false,
            un_hostage_crisis_1995: false,
        });
        expect(SHIPPED_WAR_CRIME_CARDS.cards.length).toBe(19);
        expect(SHIPPED_WAR_CRIME_CARDS.options.size).toBe(0);
    });
});

// ─── Readers ──────────────────────────────────────────────────────────────

function cap(over: Partial<NegotiationBreakdown>): NegotiationBreakdown {
    return {
        territory_controlled_pct: 0,
        enclaves_lost: [],
        enclaves_held: [],
        war_crimes_events: 0,
        war_crimes_events_emergent: 0,
        ...over,
    } as unknown as NegotiationBreakdown;
}

function gradeState(faction: string, capital: NegotiationBreakdown, fires: Record<string, number> = {}): GameState {
    return {
        meta: { turn: 188 },
        military: { event_fire_counts: fires, event_decision_log: [], negotiation: { capital: { [faction]: capital } } },
    } as unknown as GameState;
}

describe('A+ anchors: all three sides require authored == 0', () => {
    it('RS: an authored card blocks A+ though the shared counter is at 2', () => {
        const capital = cap({ territory_controlled_pct: 60, war_crimes_events: 2 });
        const state = gradeState('RS', capital, { csq_accelerated_camps_discovery_1992: 1 });
        expect(computeFactionGrade(capital, 'RS', state).grade).not.toBe('A+');
    });

    it('RS: scripted historical records (shared counter 30) no longer block A+', () => {
        const capital = cap({ territory_controlled_pct: 60, war_crimes_events: 30 });
        const state = gradeState('RS', capital, { sarajevo_siege_begins_1992: 1, srebrenica_falls_1995: 1 });
        expect(computeFactionGrade(capital, 'RS', state).grade).toBe('A+');
    });

    it('HRHB: a recorded war crime blocks A+', () => {
        const capital = cap({ territory_controlled_pct: 25, war_crimes_events: 1, war_crimes_events_emergent: 1 });
        expect(computeFactionGrade(capital, 'HRHB', gradeState('HRHB', capital)).grade).not.toBe('A+');
    });

    it('HRHB: the Ahmići card (not authored) does not block A+', () => {
        const capital = cap({ territory_controlled_pct: 25, war_crimes_events: 3 });
        expect(computeFactionGrade(capital, 'HRHB', gradeState('HRHB', capital, { ahmici_massacre_1993: 1 })).grade).toBe('A+');
    });

    it('RBiH: authored blocks A+, scripted records do not', () => {
        const clean = cap({ territory_controlled_pct: 36, war_crimes_events: 13 });
        expect(computeFactionGrade(clean, 'RBiH', gradeState('RBiH', clean, { trusina_killings_1993: 1 })).grade).toBe('A+');
        const authored = cap({ territory_controlled_pct: 36, war_crimes_events: 14, war_crimes_events_emergent: 1 });
        expect(computeFactionGrade(authored, 'RBiH', gradeState('RBiH', authored)).grade).toBe('A');
    });
});

describe('the atrocity cost term counts authored incidents', () => {
    function costState(capital: Partial<NegotiationBreakdown>, fires: Record<string, number> = {}): GameState {
        return {
            meta: { turn: 0, decision_mode: 'emergent' },
            political: { war_exhaustion: {} },
            military: { casualty_ledger: {}, event_fire_counts: fires, event_decision_log: [], negotiation: { capital: { RS: cap(capital) } } },
        } as unknown as GameState;
    }

    it('scripted historical records add nothing; an authored incident does', () => {
        const none = computeWarCostIndex(costState({}), 'RS');
        expect(computeWarCostIndex(costState({ war_crimes_events: 30 }, { srebrenica_falls_1995: 1 }), 'RS')).toBe(none);
        expect(computeWarCostIndex(costState({ war_crimes_events: 2 }, { csq_accelerated_camps_discovery_1992: 1 }), 'RS')).toBeGreaterThan(none);
        expect(computeWarCostIndex(costState({ war_crimes_events: 1, war_crimes_events_emergent: 1 }), 'RS')).toBeGreaterThan(none);
    });
});

describe('Codex clean-hands ghosts read the authored count', () => {
    function codexState(faction: string, capital: Partial<NegotiationBreakdown>, fires: Record<string, number> = {}): GameState {
        return {
            paramilitary_policy: 'always_deny',
            // §6 item 3: the deny is the side's own (an in-person standing order on record).
            paramilitary_decision_history: [
                { kind: 'standing_order', id: `paramilitary_order:10:${faction}`, turn: 10, faction, order: 'always_deny' },
            ],
            meta: { turn: 120, phase: 'war', player_faction: faction },
            military: {
                event_flags: { rear_pocket_discipline_held_through_turn: true },
                event_fire_counts: fires,
                event_decision_log: [],
                negotiation: { capital: { [faction]: cap(capital) } },
            },
            political: {},
        } as unknown as GameState;
    }
    const ids = (state: GameState) => buildGhostEntries(state, 120).map((g) => g.ghost_id);

    it('HRHB: the scripted Ahmići record no longer denies clean hands', () => {
        const state = codexState('HRHB', { war_crimes_events: 3 }, { ahmici_massacre_1993: 1 });
        expect(ids(state)).toContain('cleansing_refused');
        expect(ids(state)).toContain('rear_pocket_sustained');
    });

    it('an authored incident denies clean hands: a recorded war crime, or an authored card', () => {
        expect(ids(codexState('HRHB', { war_crimes_events: 1, war_crimes_events_emergent: 1 }))).not.toContain('cleansing_refused');
        const rs = codexState('RS', { war_crimes_events: 2 }, { csq_accelerated_camps_discovery_1992: 1 });
        expect(ids(rs)).not.toContain('cleansing_refused');
        expect(ids(rs)).not.toContain('rear_pocket_sustained');
    });
});

// ─── Source scan: no reader counts authored incidents on its own ──────────

const REPO = resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
        else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
}

/** Code lines only: comments are stripped by the shared helper, then blank lines are dropped. */
function codeLines(text: string): string[] {
    return withoutComments(text)
        .split('\n')
        .filter((line) => line.trim().length > 0);
}

describe('source scan: one owner of the authored count', () => {
    const files = sourceFiles(join(REPO, 'src')).map((full) => ({
        path: relative(REPO, full).replace(/\\/g, '/'),
        lines: codeLines(readFileSync(full, 'utf8')),
    }));

    it('only the shared module reads war_crimes_events_emergent (plus its writer and the §2a flag)', () => {
        const readers = files.flatMap((file) =>
            file.lines.filter((line) => /\.war_crimes_events_emergent\b/.test(line)).map((line) => `${file.path}: ${line.trim()}`),
        );
        const outside = readers.filter((entry) =>
            !entry.startsWith('src/sim/events/authored_war_crimes.ts:')
            && !entry.startsWith('src/state/war_crimes_record.ts:'),
        );
        // The §2a authorized-cleansing signal (SHDG §2a(ii)(a)) keeps its own canon definition.
        expect(outside).toEqual([
            'src/sim/negotiation/scoring.ts: const emergentWarCrimes = atrocityCapital?.war_crimes_events_emergent ?? 0;',
        ]);
    });

    it('only the shared module, the loader and the type read authored_by_choice', () => {
        const readers = files
            .filter((file) => file.lines.some((line) => /authored_by_choice/.test(line)))
            .map((file) => file.path);
        expect(readers).toEqual([
            'src/sim/events/authored_war_crimes.ts',
            'src/sim/events/event_loader.ts',
            'src/sim/events/event_types.ts',
        ]);
    });

    it('the readers judging conduct call the shared function and never read the shared delta counter', () => {
        for (const path of ['src/sim/negotiation/scoring.ts', 'src/sim/codex/dynamic_section_builder.ts']) {
            const file = files.find((f) => f.path === path)!;
            expect(file.lines.some((line) => /authoredWarCrimeIncident/.test(line)), path).toBe(true);
            expect(file.lines.filter((line) => /\.war_crimes_events\b/.test(line)), path).toEqual([]);
        }
    });
});
