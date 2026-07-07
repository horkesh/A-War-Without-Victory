// @vitest-environment jsdom
/**
 * QA Batch D — DecisionHistoryOverlay (Authored Choices) player-facing hygiene.
 *
 * Two regressions are locked here:
 *   1. The `[family=...]` row diagnostic is a developer-only taxonomy leak and
 *      must be gated behind the `diagMode` store flag (mirrors the PR #130
 *      Codex unlock-state dev-gate). Visible when diagMode === true; hidden
 *      when diagMode === false.
 *   2. Expanded "downstream descendants" must render resolved event TITLES
 *      (via the catalog) or a humanized label — never the raw event id.
 *
 * Pattern mirrors tests/ui/codex_panel_unlock_state.test.ts (jsdom +
 * @testing-library/react + a mocked gameStore so `diagMode` is controllable).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../../src/state/game_state.js';

// `diagMode: true` by default so the `[family=]` diagnostic renders; the
// hidden-for-players case flips this to false explicitly.
let storeState: Record<string, any> = { diagMode: true };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { DecisionHistoryOverlay } = await import('../../src/ui/map/components/DecisionHistoryOverlay');

function buildEventDef(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
    return {
        id,
        title: `Title for ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'rbih_identity',
        source_tier: 'icty_icj_un',
        response_options: [
            { id: 'opt_a', label: 'Option A', effects: [] },
        ],
        ...overrides,
    } as unknown as EventDefinition;
}

/** Minimal GameState exposing the player decision log + causality log that the
 *  overlay reads via getPlayerDecisionHistory / getCausalDescendants. */
function buildState(opts: {
    decisions: Array<{ event_id: string; response_id: string; turn: number }>;
    causalityLog?: CausalityLogEntry[];
}): GameState {
    return {
        military: {
            event_decision_log: opts.decisions.map((d) => ({
                event_id: d.event_id,
                response_id: d.response_id,
                decision_source: 'player',
                faction: 'RBiH',
                turn: d.turn,
            })),
            event_causality_log: opts.causalityLog ?? [],
            fired_event_ids: [],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

function renderOverlay(props: {
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    state?: GameState;
} = {}) {
    return render(createElement(DecisionHistoryOverlay, {
        isOpen: true,
        onClose: () => undefined,
        ...props,
    }));
}

describe('DecisionHistoryOverlay — Batch D player-facing hygiene', () => {
    beforeEach(() => {
        storeState = { diagMode: true };
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the [family=] diagnostic when diagMode is true', () => {
        const def = buildEventDef('evt_decision', { family: 'rbih_identity' });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            decisions: [{ event_id: 'evt_decision', response_id: 'opt_a', turn: 3 }],
        });

        renderOverlay({ eventCatalog: catalog, state });

        const family = screen.getByTestId('decision-history-family');
        expect(family.textContent).toContain('[family=rbih_identity]');
    });

    it('hides the [family=] diagnostic when diagMode is false (player default — no taxonomy leak)', () => {
        storeState = { devMode: true, diagMode: false };
        const def = buildEventDef('evt_decision', { family: 'rbih_identity' });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            decisions: [{ event_id: 'evt_decision', response_id: 'opt_a', turn: 3 }],
        });

        renderOverlay({ eventCatalog: catalog, state });

        expect(screen.queryByTestId('decision-history-family')).toBeNull();
        // The decision row itself still renders (only the diagnostic is gated).
        expect(screen.getByTestId('decision-history-row')).toBeTruthy();
    });

    it('resolves downstream descendant event ids to catalog titles (never raw ids)', () => {
        const root = buildEventDef('root_event', { title: 'Root Event Title' });
        const child = buildEventDef('child_event', { title: 'Child Event Title' });
        const catalog = new Map<string, EventDefinition>([
            [root.id, root],
            [child.id, child],
        ]);
        const causalityLog: CausalityLogEntry[] = [
            { turn: 1, from_event: 'root_event', to_event: 'child_event', to_flag: null, kind: 'enables' },
        ];
        const state = buildState({
            decisions: [{ event_id: 'root_event', response_id: 'opt_a', turn: 1 }],
            causalityLog,
        });

        renderOverlay({ eventCatalog: catalog, state });

        // Expand the row to compute + render descendants.
        fireEvent.click(screen.getByTestId('decision-history-row').querySelector('button')!);

        const descendantRow = screen.getByTestId('decision-history-descendant-row');
        expect(descendantRow.textContent).toContain('Child Event Title');
        // Raw id must not leak into the visible text (kept only in data-* attr).
        expect(descendantRow.textContent).not.toContain('child_event');
        expect(descendantRow.getAttribute('data-event-id')).toBe('child_event');
    });

    it('humanizes a descendant id absent from the catalog (no raw slug)', () => {
        const root = buildEventDef('root_event', { title: 'Root Event Title' });
        // child_event deliberately NOT in catalog.
        const catalog = new Map<string, EventDefinition>([[root.id, root]]);
        const causalityLog: CausalityLogEntry[] = [
            { turn: 1, from_event: 'root_event', to_event: 'srebrenica_falls', to_flag: null, kind: 'enables' },
        ];
        const state = buildState({
            decisions: [{ event_id: 'root_event', response_id: 'opt_a', turn: 1 }],
            causalityLog,
        });

        renderOverlay({ eventCatalog: catalog, state });

        fireEvent.click(screen.getByTestId('decision-history-row').querySelector('button')!);

        const descendantRow = screen.getByTestId('decision-history-descendant-row');
        // Humanized (Title Case, no underscores) — never the raw snake_case id.
        expect(descendantRow.textContent).toContain('Srebrenica Falls');
        expect(descendantRow.textContent).not.toContain('srebrenica_falls');
    });

    it('humanizes decision and response labels absent from the catalog', () => {
        storeState = { diagMode: false };
        const state = buildState({
            decisions: [{ event_id: 'rbih_state_identity', response_id: 'bosniak_national', turn: 1 }],
        });

        renderOverlay({ eventCatalog: new Map(), state });

        expect(screen.getByTestId('decision-history-event-id').textContent).toBe('Rbih State Identity');
        expect(screen.getByTestId('decision-history-chosen-option').textContent).toBe('Bosniak National');
        expect(screen.getByTestId('decision-history-row').textContent).not.toContain('rbih_state_identity');
        expect(screen.getByTestId('decision-history-row').textContent).not.toContain('bosniak_national');
        expect(screen.getByTestId('decision-history-row').getAttribute('data-event-id')).toBeNull();
        expect(screen.getByTestId('decision-history-row').getAttribute('data-response-id')).toBeNull();
        expect(screen.getByTestId('decision-history-event-id').getAttribute('data-event-id')).toBeNull();
        expect(screen.getByTestId('decision-history-chosen-option').getAttribute('data-response-id')).toBeNull();
    });

    it('does not expose source-note dossier excerpts to players when diagMode is false', () => {
        storeState = { diagMode: false };
        const def = buildEventDef('root_event', {
            title: 'Root Event Title',
            source_note: 'Authoring note: opens csq_future_peace_plan and The Vance-Owen Peace Plan if selected.',
        });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            decisions: [{ event_id: 'root_event', response_id: 'opt_a', turn: 1 }],
        });

        renderOverlay({ eventCatalog: catalog, state });
        fireEvent.click(screen.getByTestId('decision-history-row').querySelector('button')!);

        const expandedText = screen.getByTestId('decision-history-row-expanded').textContent ?? '';
        expect(screen.queryByTestId('decision-history-source-note')).toBeNull();
        expect(expandedText).not.toMatch(/csq_future|Vance-Owen|Authoring note/i);
    });

    it('keeps source-note dossier excerpts available only in diagnostics mode', () => {
        storeState = { diagMode: true };
        const def = buildEventDef('root_event', {
            title: 'Root Event Title',
            source_note: 'Authoring note: opens csq_future_peace_plan.',
        });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            decisions: [{ event_id: 'root_event', response_id: 'opt_a', turn: 1 }],
        });

        renderOverlay({ eventCatalog: catalog, state });
        fireEvent.click(screen.getByTestId('decision-history-row').querySelector('button')!);

        expect(screen.getByTestId('decision-history-source-note').textContent).toContain('csq_future_peace_plan');
    });
});
