// @vitest-environment jsdom
/**
 * Phase H Packet 8 — Component B (Decision History overlay) test suite.
 *
 * Covers the new `DecisionHistoryOverlay` component that lists every
 * player decision in `event_decision_log` filtered by
 * `decision_source === 'player'`, expand-to-show-descendants
 * interaction, and divergence vs historical-default badge.
 *
 * Mirrors the jsdom + @testing-library/react pattern established by
 * H3 (`event_decision_modal_decision_context.test.ts`),
 * H4 (`faction_branch_tags_badge.test.ts`), and
 * H5 (`codex_panel_unlock_state.test.ts`).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DecisionHistoryOverlay } from '../../src/ui/map/components/DecisionHistoryOverlay.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../../src/state/game_state.js';

afterEach(() => cleanup());

function buildEventDef(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
    return {
        id,
        title: `Event ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test_family',
        source_tier: 'icty_icj_un',
        historical_default_response_id: 'opt_a',
        response_options: [
            { id: 'opt_a', label: 'Option A', effects: [] },
            { id: 'opt_b', label: 'Option B', effects: [] },
        ],
        ...overrides,
    } as unknown as EventDefinition;
}

interface DecisionInput {
    event_id: string;
    response_id: string;
    turn: number;
    decision_source?: 'player' | 'bot_political' | 'bot_v1' | 'bot_ai_default';
    faction?: 'RBiH' | 'RS' | 'HRHB' | null;
}

function buildState(opts: {
    decisions: DecisionInput[];
    causalityLog?: CausalityLogEntry[];
}): GameState {
    return {
        military: {
            fired_event_ids: [],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_causality_log: opts.causalityLog ?? [],
            event_decision_log: opts.decisions.map((d) => ({
                event_id: d.event_id,
                response_id: d.response_id,
                decision_source: d.decision_source ?? 'player',
                faction: d.faction ?? 'RBiH',
                turn: d.turn,
            })),
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

function renderOverlay(props: {
    isOpen?: boolean;
    onClose?: () => void;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    state?: GameState;
} = {}) {
    return render(createElement(DecisionHistoryOverlay, {
        isOpen: props.isOpen ?? true,
        onClose: props.onClose ?? (() => undefined),
        eventCatalog: props.eventCatalog,
        state: props.state,
    }));
}

describe('DecisionHistoryOverlay (Phase H Packet 8)', () => {
    it('renders nothing when isOpen is false', () => {
        const state = buildState({
            decisions: [{ event_id: 'evt_a', response_id: 'opt_a', turn: 5 }],
        });
        const catalog = new Map([['evt_a', buildEventDef('evt_a')]]);
        const { container } = renderOverlay({ isOpen: false, eventCatalog: catalog, state });
        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId('decision-history-overlay')).toBeNull();
    });

    it('renders the decision list when isOpen and both props are present', () => {
        const decisions: DecisionInput[] = [
            { event_id: 'evt_alpha', response_id: 'opt_a', turn: 3 },
            { event_id: 'evt_bravo', response_id: 'opt_b', turn: 7 },
        ];
        const catalog = new Map<string, EventDefinition>([
            ['evt_alpha', buildEventDef('evt_alpha', { family: 'family_alpha' })],
            ['evt_bravo', buildEventDef('evt_bravo', { family: 'family_bravo' })],
        ]);
        const state = buildState({ decisions });
        renderOverlay({ eventCatalog: catalog, state });

        expect(screen.getByTestId('decision-history-overlay')).toBeTruthy();
        const rows = screen.getAllByTestId('decision-history-row');
        expect(rows).toHaveLength(2);
        expect(rows[0].getAttribute('data-event-id')).toBe('evt_alpha');
        expect(rows[1].getAttribute('data-event-id')).toBe('evt_bravo');
        // Header count reflects total.
        expect(screen.getByTestId('decision-history-count').textContent).toContain('2 decisions');
    });

    it('renders empty-state when state is absent (graceful degradation)', () => {
        const catalog = new Map<string, EventDefinition>([['evt_x', buildEventDef('evt_x')]]);
        renderOverlay({ eventCatalog: catalog });

        // Overlay is mounted but the empty-state placeholder is shown
        // because state is absent.
        expect(screen.getByTestId('decision-history-overlay')).toBeTruthy();
        expect(screen.getByTestId('decision-history-empty-state')).toBeTruthy();
        expect(screen.queryByTestId('decision-history-list')).toBeNull();
    });

    it('renders empty-state when eventCatalog is absent (graceful degradation)', () => {
        const state = buildState({
            decisions: [{ event_id: 'evt_a', response_id: 'opt_a', turn: 1 }],
        });
        renderOverlay({ state });

        expect(screen.getByTestId('decision-history-overlay')).toBeTruthy();
        expect(screen.getByTestId('decision-history-empty-state')).toBeTruthy();
        expect(screen.queryByTestId('decision-history-list')).toBeNull();
    });

    it('renders no-decisions message when state has no player decisions', () => {
        const catalog = new Map<string, EventDefinition>([['evt_a', buildEventDef('evt_a')]]);
        const state = buildState({
            // Only non-player decisions — should be filtered out.
            decisions: [
                { event_id: 'evt_a', response_id: 'opt_a', turn: 1, decision_source: 'bot_political' },
            ],
        });
        renderOverlay({ eventCatalog: catalog, state });

        expect(screen.getByTestId('decision-history-no-decisions')).toBeTruthy();
        expect(screen.queryByTestId('decision-history-list')).toBeNull();
    });

    it('row click expands to show descendants list', () => {
        // evt_root enables evt_child_a + evt_child_b.
        const causalityLog: CausalityLogEntry[] = [
            { turn: 1, from_event: 'evt_root', to_event: 'evt_child_a', to_flag: null, kind: 'enables' },
            { turn: 1, from_event: 'evt_root', to_event: 'evt_child_b', to_flag: null, kind: 'enables' },
        ];
        const catalog = new Map<string, EventDefinition>([
            ['evt_root', buildEventDef('evt_root')],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'evt_root', response_id: 'opt_b', turn: 4 }],
            causalityLog,
        });
        renderOverlay({ eventCatalog: catalog, state });

        // Pre-click: row exists, no expanded content.
        const row = screen.getByTestId('decision-history-row');
        expect(screen.queryByTestId('decision-history-row-expanded')).toBeNull();

        // Click the toggle button (the inner button).
        const toggle = row.querySelector('button');
        expect(toggle).toBeTruthy();
        fireEvent.click(toggle!);

        // Post-click: expanded section + descendants list.
        expect(screen.getByTestId('decision-history-row-expanded')).toBeTruthy();
        const descRows = screen.getAllByTestId('decision-history-descendant-row');
        expect(descRows).toHaveLength(2);
        const descIds = descRows.map((r) => r.getAttribute('data-event-id')).sort();
        expect(descIds).toEqual(['evt_child_a', 'evt_child_b']);
    });

    it('renders Diverged badge when chosen option differs from historical_default_response_id', () => {
        const catalog = new Map<string, EventDefinition>([
            // Historical default is opt_a; player chose opt_b.
            ['evt_diverged', buildEventDef('evt_diverged', { historical_default_response_id: 'opt_a' })],
            // Historical default is opt_a; player chose opt_a.
            ['evt_historical', buildEventDef('evt_historical', { historical_default_response_id: 'opt_a' })],
        ]);
        const state = buildState({
            decisions: [
                { event_id: 'evt_diverged', response_id: 'opt_b', turn: 2 },
                { event_id: 'evt_historical', response_id: 'opt_a', turn: 5 },
            ],
        });
        renderOverlay({ eventCatalog: catalog, state });

        const rows = screen.getAllByTestId('decision-history-row');
        const divergedRow = rows.find((r) => r.getAttribute('data-event-id') === 'evt_diverged')!;
        const historicalRow = rows.find((r) => r.getAttribute('data-event-id') === 'evt_historical')!;
        expect(divergedRow.querySelector('[data-testid="decision-history-divergence-badge"]')).toBeTruthy();
        expect(divergedRow.querySelector('[data-testid="decision-history-historical-badge"]')).toBeNull();
        expect(historicalRow.querySelector('[data-testid="decision-history-historical-badge"]')).toBeTruthy();
        expect(historicalRow.querySelector('[data-testid="decision-history-divergence-badge"]')).toBeNull();
    });

    it('close button dispatches onClose callback', () => {
        const catalog = new Map<string, EventDefinition>([['evt_a', buildEventDef('evt_a')]]);
        const state = buildState({
            decisions: [{ event_id: 'evt_a', response_id: 'opt_a', turn: 1 }],
        });
        let closeCount = 0;
        renderOverlay({
            eventCatalog: catalog,
            state,
            onClose: () => { closeCount++; },
        });

        const closeBtn = screen.getByTestId('decision-history-close');
        fireEvent.click(closeBtn);
        expect(closeCount).toBe(1);
    });

    it('renders rows in deterministic turn-ascending order', () => {
        // Input deliberately out of order; render must sort by turn ascending.
        const decisions: DecisionInput[] = [
            { event_id: 'evt_late', response_id: 'opt_a', turn: 20 },
            { event_id: 'evt_early', response_id: 'opt_a', turn: 3 },
            { event_id: 'evt_mid', response_id: 'opt_a', turn: 10 },
        ];
        const catalog = new Map<string, EventDefinition>(
            decisions.map((d) => [d.event_id, buildEventDef(d.event_id)]),
        );
        const state = buildState({ decisions });
        renderOverlay({ eventCatalog: catalog, state });

        const rows = screen.getAllByTestId('decision-history-row');
        const order = rows.map((r) => r.getAttribute('data-event-id'));
        expect(order).toEqual(['evt_early', 'evt_mid', 'evt_late']);
    });

    it('row content surfaces resolved title, option prose, and turn without player-facing family taxonomy', () => {
        const catalog = new Map<string, EventDefinition>([
            ['evt_z', buildEventDef('evt_z', { family: 'rbih_civic', title: 'The Sarajevo siege tightens' })],
        ]);
        const state = buildState({
            decisions: [{ event_id: 'evt_z', response_id: 'opt_b', turn: 17 }],
        });
        renderOverlay({ eventCatalog: catalog, state });

        const row = screen.getByTestId('decision-history-row');
        expect(row.getAttribute('data-event-id')).toBe('evt_z');
        expect(row.getAttribute('data-response-id')).toBe('opt_b');
        expect(row.getAttribute('data-turn')).toBe('17');
        // Raw ids upgraded to resolved player-facing prose (title + option label).
        expect(screen.getByTestId('decision-history-event-id').textContent).toBe('The Sarajevo siege tightens');
        expect(screen.getByTestId('decision-history-event-id').getAttribute('data-event-id')).toBe('evt_z');
        expect(screen.queryByTestId('decision-history-family')).toBeNull();
        // Option prose resolved from catalog (label 'Option B'), not raw 'opt_b'.
        expect(screen.getByTestId('decision-history-chosen-option').textContent).toBe('Option B');
        expect(screen.getByTestId('decision-history-chosen-option').getAttribute('data-response-id')).toBe('opt_b');
        expect(screen.getByTestId('decision-history-turn').textContent).toBe('T17');
    });

    it('filters out non-player decisions from the rendered list', () => {
        const catalog = new Map<string, EventDefinition>([
            ['evt_player', buildEventDef('evt_player')],
            ['evt_bot_pol', buildEventDef('evt_bot_pol')],
            ['evt_bot_v1', buildEventDef('evt_bot_v1')],
            ['evt_bot_default', buildEventDef('evt_bot_default')],
        ]);
        const state = buildState({
            decisions: [
                { event_id: 'evt_player', response_id: 'opt_a', turn: 1, decision_source: 'player' },
                { event_id: 'evt_bot_pol', response_id: 'opt_a', turn: 2, decision_source: 'bot_political' },
                { event_id: 'evt_bot_v1', response_id: 'opt_a', turn: 3, decision_source: 'bot_v1' },
                { event_id: 'evt_bot_default', response_id: 'opt_a', turn: 4, decision_source: 'bot_ai_default' },
            ],
        });
        renderOverlay({ eventCatalog: catalog, state });

        const rows = screen.getAllByTestId('decision-history-row');
        expect(rows).toHaveLength(1);
        expect(rows[0].getAttribute('data-event-id')).toBe('evt_player');
    });
});
