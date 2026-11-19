// @vitest-environment jsdom
/**
 * §6 design T copy wiring (ui-ux F2-F4) and the §4 copy panel's signed strings (s6_tm_copy_narrative.md
 * rows 1-4, 2026-11-19, EN and BCS).
 *
 * - The filed-ahead note shows on an answer-ahead card only while its card is unfired.
 * - The pause footer's "takes effect this week" body is not shown on such a card.
 * - The Chronicle dates a filed answer's effect on the turn it applied.
 * - No surface calls a filed answer in force before it applies.
 */
import { readFileSync } from 'node:fs';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { generateChronicleEntries } from '../../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { setLocale, t } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
import war1992Events from '../../data/scenarios/events/war_1992.json';

afterEach(() => {
    cleanup();
    setLocale('en');
});

const CATALOG = new Map((war1992Events as EventDefinition[]).map((def) => [def.id, def]));
const ANSWER_AHEAD = ['rbih_state_identity', 'rs_strategic_goals', 'hrhb_political_goal', 'rbih_paramilitary_policy_1992'];

function decisionFor(eventId: string): PendingEventDecision {
    const def = CATALOG.get(eventId)!;
    return {
        event_id: def.id,
        event_title: def.title ?? def.id,
        narrative: def.narrative,
        category: def.category,
        turn_fired: 0,
        faction: def.responding_faction ?? 'RBiH',
        requires_player_response: true,
        historical_default_response_id: def.historical_default_response_id,
        response_options: def.response_options ?? [],
    } as PendingEventDecision;
}

function stateWith(firedIds: string[]): GameState {
    return {
        meta: { turn: 0, player_faction: 'RBiH' },
        military: {
            fired_event_ids: [...firedIds],
            event_fire_counts: Object.fromEntries(firedIds.map((id) => [id, 1])),
            event_last_fired_turn: Object.fromEntries(firedIds.map((id) => [id, 0])),
            event_causality_log: [],
            event_decision_log: [],
            enabled_event_ids: [],
            closed_event_ids: [],
            pending_event_decisions: [],
        },
    } as unknown as GameState;
}

function renderCard(eventId: string, state: GameState, paused = false) {
    return render(React.createElement(EventDecisionModal, {
        decision: decisionFor(eventId),
        eventCatalog: CATALOG,
        state,
        onRespond: () => undefined,
        ...(paused ? { turnPause: { onContinue: () => undefined } } : {}),
    }));
}

describe('filed-ahead note on the decision card', () => {
    it.each(ANSWER_AHEAD)('%s: shown while the card is unfired, gone once it has fired', (eventId) => {
        const unfired = renderCard(eventId, stateWith([]));
        const note = screen.getByTestId('event-decision-filed-ahead');
        expect(note.getAttribute('role')).toBe('note');
        expect(note.textContent).toContain(t('eventDecision.filedAhead.label'));
        expect(note.textContent).toContain(t('eventDecision.filedAhead.body'));
        unfired.unmount();

        renderCard(eventId, stateWith([eventId]));
        expect(screen.queryByTestId('event-decision-filed-ahead')).toBeNull();
    });

    it('never shows on the RS policy card (it applies when answered) or without a state to judge by', () => {
        renderCard('rs_paramilitary_policy_1992', stateWith([]));
        expect(screen.queryByTestId('event-decision-filed-ahead')).toBeNull();
        cleanup();
        render(React.createElement(EventDecisionModal, {
            decision: decisionFor('rbih_paramilitary_policy_1992'),
            eventCatalog: CATALOG,
            onRespond: () => undefined,
        }));
        expect(screen.queryByTestId('event-decision-filed-ahead')).toBeNull();
    });

    it('the pause footer does not promise "this week" on a card that will only be filed', () => {
        renderCard('rbih_paramilitary_policy_1992', stateWith([]), true);
        expect(screen.getByTestId('event-decision-turn-paused').textContent).not.toContain(t('eventDecision.turnPaused.body'));
        cleanup();
        renderCard('rs_paramilitary_policy_1992', stateWith([]), true);
        expect(screen.getByTestId('event-decision-turn-paused').textContent).toContain(t('eventDecision.turnPaused.body'));
    });
});

describe('the Chronicle dates a filed answer on the turn it applied', () => {
    it('adds one filed-answer line on the fire turn, none while the card is unfired', () => {
        const base = {
            meta: { turn: 5, phase: 'war', player_faction: 'HRHB' },
            military: {
                fired_event_ids: ['hrhb_political_goal'],
                event_fire_counts: { hrhb_political_goal: 1 },
                event_last_fired_turn: { hrhb_political_goal: 4 },
                event_decision_log: [{ event_id: 'hrhb_political_goal', response_id: 'croat_republic', decision_source: 'player', faction: 'HRHB', turn: 0 }],
                event_causality_log: [],
                enabled_event_ids: [],
                closed_event_ids: [],
                pending_event_decisions: [],
                formations: {},
            },
            political: { political_controllers: {} },
            turn_summaries: [],
        } as unknown as GameState;
        const entries = generateChronicleEntries(parseGameState(base), CATALOG);
        const applied = entries.filter((entry) => entry.id === 'filed-answer-applied:hrhb_political_goal');
        expect(applied).toHaveLength(1);
        expect(applied[0]!.turn).toBe(4);
        // Signed row 3: the filing date and the date the effect applied, never "this week".
        expect(applied[0]!.detail.startsWith(`Your answer filed on ${turnToDateString(0)} took effect on ${turnToDateString(4)}: `)).toBe(true);
        expect(applied[0]!.detail.endsWith('.')).toBe(true);
        expect(applied[0]!.detail).not.toMatch(/\{|\}|this week/);

        const unfired = structuredClone(base) as any;
        unfired.military.fired_event_ids = [];
        unfired.military.event_fire_counts = {};
        unfired.military.event_last_fired_turn = {};
        expect(generateChronicleEntries(parseGameState(unfired), CATALOG)
            .filter((entry) => entry.id?.startsWith('filed-answer-applied:'))).toEqual([]);
    });

    it.each(['bot_ai_default', 'bot_political', 'bot_v1'] as const)(
        'never labels a %s answer as "Your answer" (historian condition, row 3)',
        (source) => {
            // The card applied at t4 with an automatic answer on the player's own faction row (Observer, staff).
            const state = {
                meta: { turn: 5, phase: 'war', player_faction: 'HRHB' },
                military: {
                    fired_event_ids: ['hrhb_political_goal'],
                    event_fire_counts: { hrhb_political_goal: 1 },
                    event_last_fired_turn: { hrhb_political_goal: 4 },
                    event_decision_log: [{ event_id: 'hrhb_political_goal', response_id: 'croat_republic', decision_source: source, faction: 'HRHB', turn: 0 }],
                    event_causality_log: [],
                    enabled_event_ids: [],
                    closed_event_ids: [],
                    pending_event_decisions: [],
                    formations: {},
                },
                political: { political_controllers: {} },
                turn_summaries: [],
            } as unknown as GameState;
            const parsed = parseGameState(state);
            expect((parsed.firedEvents ?? []).some((event) => event.filedAnswerAppliedTurn !== undefined)).toBe(false);
            const entries = generateChronicleEntries(parsed, CATALOG);
            expect(entries.filter((entry) => entry.id?.startsWith('filed-answer-applied:'))).toEqual([]);
            expect(entries.some((entry) => /Your answer filed on/.test(entry.detail))).toBe(false);
        },
    );
});

describe('the signed §4 copy for the T rows (s6_tm_copy_narrative.md, 2026-11-19)', () => {
    it.each([
        ['en', enMessages, {
            'eventDecision.filedAhead.label': 'Takes effect when due',
            'eventDecision.filedAhead.body': 'Your answer is filed when you give it. It takes effect when this decision comes due. The effects listed with each response apply then, not now. Until then nothing is requested or sent in your name under this answer.',
            'firedEvent.wrapper.filedAnswerApplied': 'Your answer filed on {filedDate} took effect on {appliedDate}: {response}.',
            // Row 4: no copy change; the body is guarded on answer-ahead cards instead.
            'eventDecision.turnPaused.body': 'Answer now and your decision takes effect this week, before movement and combat. If you continue without answering, the decision stays on your desk and takes effect only from next week.',
        }],
        ['bcs', bcsMessages, {
            'eventDecision.filedAhead.label': 'Stupa na snagu kad dođe na red',
            'eventDecision.filedAhead.body': 'Vaš odgovor se arhivira čim ga date. Stupa na snagu kad ova odluka dođe na red. Efekti navedeni uz svaki odgovor primjenjuju se tada, a ne sada. Do tada se po ovom odgovoru ništa ne traži niti šalje u vaše ime.',
            'firedEvent.wrapper.filedAnswerApplied': 'Vaš odgovor od {filedDate} stupio je na snagu {appliedDate}: {response}.',
            'eventDecision.turnPaused.body': 'Odgovorite sada i vaša odluka djeluje ove sedmice, prije pokreta i borbi. Ako nastavite bez odgovora, odluka ostaje na vašem stolu i djeluje tek od sljedeće sedmice.',
        }],
    ] as const)('%s', (_locale, messages, expected) => {
        for (const [key, value] of Object.entries(expected)) {
            expect((messages as Record<string, string>)[key], key).toBe(value);
        }
    });

    it('the first-hour browser gate checks the same signed note on every birth card and the RBiH policy card', () => {
        const gate = readFileSync('tools/ui/first_hour_browser_gate.cjs', 'utf8');
        expect(gate).toContain(`const FILED_AHEAD_NOTE_LABEL = '${enMessages['eventDecision.filedAhead.label']}';`);
        expect(gate).toContain(`const FILED_AHEAD_NOTE_BODY = '${enMessages['eventDecision.filedAhead.body']}';`);
        expect(gate).toContain('assertFiledAheadNote(summary, `${flow.faction}:${flow.eventId}`, decisionDialog);');
        expect(gate).toContain('assertFiledAheadNote(summary, `${flow.faction}:rbih_paramilitary_policy_1992`, await dialogText(page));');
    });

    it('renders the signed BCS note on an unfired answer-ahead card and hides the pause body there', () => {
        setLocale('bcs');
        renderCard('rbih_paramilitary_policy_1992', stateWith([]), true);
        const note = screen.getByTestId('event-decision-filed-ahead');
        expect(note.textContent).toContain('Stupa na snagu kad dođe na red');
        expect(note.textContent).toContain('Do tada se po ovom odgovoru ništa ne traži niti šalje u vaše ime.');
        expect(screen.getByTestId('event-decision-turn-paused').textContent).toContain('Potez je zaustavljen prije borbi');
        expect(screen.getByTestId('event-decision-turn-paused').textContent).not.toContain('djeluje ove sedmice');
    });
});

describe('no surface calls a filed answer in force', () => {
    const IN_FORCE_NOW = [
        /\bis (now )?in force\b/i,
        /\bnow in force\b/i,
        /\bin force now\b/i,
        /\b(takes|took) effect (now|today|immediately)\b/i,
        /\balready (applies|applied|in force|in effect|takes effect)\b/i,
        /\bin effect (now|today)\b/i,
        /\bapplies (now|today|immediately)\b/i,
        /\bje (sada )?na snazi\b/i,
        /\bodmah (djeluje|stupa na snagu|vrijedi)\b/i,
    ];
    // Every string a player can read about an answer that is filed but not yet applied.
    const FILED_SURFACE_KEYS = [
        'eventDecision.filedAhead.label',
        'eventDecision.filedAhead.body',
        'eventDecision.recordTrail',
        'firedEvent.wrapper.narrative',
        'firedEvent.wrapper.responseRecorded',
        'recordsContent.archiveSummary.latestDecision',
        'recordsContent.archiveSummary.chronicleFiled',
    ] as const;

    it.each([['en', enMessages], ['bcs', bcsMessages]] as const)('%s strings for filed answers make no in-force claim', (_locale, messages) => {
        for (const key of FILED_SURFACE_KEYS) {
            const value = (messages as Record<string, string>)[key];
            expect(value, key).toBeTruthy();
            for (const pattern of IN_FORCE_NOW) expect(value, `${key} ${pattern}`).not.toMatch(pattern);
        }
    });

    it('the rendered card for a filed answer makes no in-force claim, paused or not', () => {
        for (const eventId of ANSWER_AHEAD) {
            const { container, unmount } = renderCard(eventId, stateWith([]), true);
            for (const pattern of IN_FORCE_NOW) expect(container.textContent, `${eventId} ${pattern}`).not.toMatch(pattern);
            expect(container.textContent).not.toContain(t('eventDecision.turnPaused.body'));
            unmount();
        }
    });
});
