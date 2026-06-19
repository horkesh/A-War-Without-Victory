// @vitest-environment jsdom
/**
 * Phase H Packet 5 — Component C (Codex unlock-state display) test suite.
 *
 * Covers the new optional `eventCatalog` + `state` props on `CodexPanel`
 * that drive the Unlock State section (aggregate summary +
 * fired / enabled-but-not-fired / closed sub-lists).
 *
 * Backward-compatibility for the existing essay viewer lives in
 * `tests/ui/codex_panel_dynamic_mount.test.ts` (callers there pass only
 * `isOpen` + `onClose` and never see the Unlock State section — this is
 * the graceful-degradation contract validated below).
 *
 * Mirrors the jsdom + @testing-library/react pattern established by
 * Phase H Packets 3 (`event_decision_modal_decision_context.test.ts`)
 * and 4 (`faction_branch_tags_badge.test.ts`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../../src/state/game_state.js';

// `diagMode: true` by default so the Unlock State section (a developer-only
// diagnostic, gated behind the DEDICATED `diagMode` store flag — #130) renders
// and the present/null-condition cases exercise the REAL data conditions rather
// than the diag-gate. The diag-gate itself (incl. the dev:map leak case where
// devMode is true but diagMode is false) is covered by the dedicated cases below.
let storeState: Record<string, any> = { loadedGameState: null, devMode: true, diagMode: true };

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

vi.mock('../../data/scenarios/essays/essay_index.json', () => ({
    default: [
        {
            id: 'essay_unlock_turn_gate',
            event_id: 'codex_unlock_test_event',
            title: 'Turn-gated essay',
            year: 1992,
            category: 'political',
            content: 'Hidden until the turn gate opens.',
            tier: 0,
            unlock_turn_min: 12,
        },
    ],
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CodexPanel } = await import('../../src/ui/map/components/CodexPanel');

function buildEventDef(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
    return {
        id,
        title: `Event ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test_family',
        source_tier: 'icty_icj_un',
        response_options: [
            { id: 'opt_a', label: 'Option A', effects: [] },
        ],
        ...overrides,
    } as unknown as EventDefinition;
}

/**
 * Build a minimal `GameState` exposing the four causality-substrate fields
 * read by `CodexPanel`'s Unlock State derivation + `getEventChainSummary`.
 * - `fired_event_ids`, `enabled_event_ids`, `closed_event_ids` drive the
 *   three sub-lists.
 * - `event_causality_log` drives `getEventChainSummary` (foundational +
 *   downstream + max_depth aggregates).
 */
function buildState(opts: {
    fired: string[];
    enabled: string[];
    closed: string[];
    causalityLog?: CausalityLogEntry[];
}): GameState {
    return {
        military: {
            fired_event_ids: opts.fired,
            enabled_event_ids: opts.enabled,
            closed_event_ids: opts.closed,
            event_causality_log: opts.causalityLog ?? [],
            event_decision_log: [],
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

function renderPanel(props: {
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    state?: GameState;
} = {}) {
    return render(createElement(CodexPanel, {
        isOpen: true,
        onClose: () => undefined,
        ...props,
    }));
}

describe('CodexPanel Unlock State (Phase H Packet 5)', () => {
    beforeEach(() => {
        storeState = { loadedGameState: null, devMode: true, diagMode: true };
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
    });

    it('renders the Unlock State section when both eventCatalog and state are provided', () => {
        const def = buildEventDef('foundational_event_1', { family: 'rbih_identity' });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        expect(screen.getByTestId('codex-unlock-state-section')).toBeTruthy();
        expect(screen.getByText('Unlock State')).toBeTruthy();
        const firedList = screen.getByTestId('codex-unlock-fired-list');
        expect(firedList.textContent).toContain('foundational_event_1');
        expect(firedList.textContent).toContain('[family=rbih_identity]');
        expect(firedList.textContent).toContain('[source=icty_icj_un]');
    });

    it('omits the Unlock State section when diagMode is false (player default — no raw event-code leak)', () => {
        // Even with both eventCatalog + state present, the developer-only
        // diagnostic must stay hidden for players (diagMode === false).
        storeState = { loadedGameState: null, devMode: false, diagMode: false };
        const def = buildEventDef('foundational_event_1', { family: 'rbih_identity' });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        expect(screen.queryByTestId('codex-unlock-state-section')).toBeNull();
    });

    it('#130: omits the Unlock State section in dev:map (devMode true but diagMode false)', () => {
        // dev:map runs with import.meta.env.DEV → generic devMode is auto-enabled.
        // Raw internal event IDs must STILL be hidden from playtesters: the section
        // is gated on the dedicated diagMode (explicit ?diag=1), NOT generic devMode.
        storeState = { loadedGameState: null, devMode: true, diagMode: false };
        const def = buildEventDef('foundational_event_1', { family: 'rbih_identity' });
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        expect(screen.queryByTestId('codex-unlock-state-section')).toBeNull();
    });

    it('omits the Unlock State section when eventCatalog is absent (graceful degradation)', () => {
        const state = buildState({
            fired: ['evt_a'],
            enabled: ['evt_b'],
            closed: ['evt_c'],
        });

        renderPanel({ state });

        expect(screen.queryByTestId('codex-unlock-state-section')).toBeNull();
    });

    it('omits the Unlock State section when state is absent (graceful degradation)', () => {
        const def = buildEventDef('evt_x');
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);

        renderPanel({ eventCatalog: catalog });

        expect(screen.queryByTestId('codex-unlock-state-section')).toBeNull();
    });

    it('renders correct counts for fired / enabled-but-not-fired / closed sub-lists', () => {
        // fired = [a, b], enabled = [b, c, d] (b is fired so it filters out),
        // closed = [e]. Expected sub-list lengths: 2 / 2 / 1.
        const ids = ['evt_a', 'evt_b', 'evt_c', 'evt_d', 'evt_e'];
        const catalog = new Map<string, EventDefinition>(
            ids.map((id) => [id, buildEventDef(id)] as const),
        );
        const state = buildState({
            fired: ['evt_a', 'evt_b'],
            enabled: ['evt_b', 'evt_c', 'evt_d'],
            closed: ['evt_e'],
        });

        renderPanel({ eventCatalog: catalog, state });

        const firedRows = screen.getAllByTestId('codex-unlock-fired-row');
        const enabledRows = screen.getAllByTestId('codex-unlock-enabled-row');
        const closedRows = screen.getAllByTestId('codex-unlock-closed-row');
        expect(firedRows).toHaveLength(2);
        expect(enabledRows).toHaveLength(2);
        expect(closedRows).toHaveLength(1);

        const enabledIds = enabledRows.map((r) => r.getAttribute('data-event-id'));
        expect(enabledIds).not.toContain('evt_b'); // filtered (already fired)
        expect(enabledIds).toContain('evt_c');
        expect(enabledIds).toContain('evt_d');
    });

    it('renders aggregate summary numbers from getEventChainSummary', () => {
        // Build a small chain: foundational_a -> mid_b -> leaf_c.
        // foundational_a has no incoming enables → foundational.
        // mid_b + leaf_c have incoming enables → downstream when fired.
        const causalityLog: CausalityLogEntry[] = [
            { turn: 1, from_event: 'foundational_a', to_event: 'mid_b', to_flag: null, kind: 'enables' },
            { turn: 2, from_event: 'mid_b', to_event: 'leaf_c', to_flag: null, kind: 'enables' },
        ];
        const ids = ['foundational_a', 'mid_b', 'leaf_c'];
        const catalog = new Map<string, EventDefinition>(
            ids.map((id) => [id, buildEventDef(id)] as const),
        );
        const state = buildState({
            fired: ['foundational_a', 'mid_b', 'leaf_c'],
            enabled: [],
            closed: ['closed_evt_x'],
            causalityLog,
        });

        renderPanel({ eventCatalog: catalog, state });

        const summary = screen.getByTestId('codex-unlock-state-summary');
        const text = summary.textContent ?? '';
        // 1 foundational, 2 downstream-fired (mid_b + leaf_c have ancestors),
        // 1 closed, max_depth = 3 (foundational_a -> mid_b -> leaf_c).
        expect(text).toContain('Foundational: 1');
        expect(text).toContain('Fired downstream: 2');
        expect(text).toContain('Closed: 1');
        expect(text).toContain('Max depth: 3');
    });

    it('renders per-event rows with id + family + source_tier from catalog', () => {
        const defA = buildEventDef('evt_a', { family: 'family_alpha', source_tier: 'icty_icj_un' });
        const defB = buildEventDef('evt_b', { family: 'family_beta', source_tier: 'balkan_battlegrounds' });
        const catalog = new Map<string, EventDefinition>([
            [defA.id, defA],
            [defB.id, defB],
        ]);
        const state = buildState({
            fired: ['evt_a', 'evt_b'],
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        const firedRows = screen.getAllByTestId('codex-unlock-fired-row');
        const rowA = firedRows.find((r) => r.getAttribute('data-event-id') === 'evt_a');
        const rowB = firedRows.find((r) => r.getAttribute('data-event-id') === 'evt_b');
        expect(rowA).toBeTruthy();
        expect(rowB).toBeTruthy();
        expect(rowA!.textContent).toContain('[family=family_alpha]');
        expect(rowA!.textContent).toContain('[source=icty_icj_un]');
        expect(rowB!.textContent).toContain('[family=family_beta]');
        expect(rowB!.textContent).toContain('[source=balkan_battlegrounds]');
    });

    it('renders sub-list rows in deterministic alphabetical order', () => {
        // Input fired order is intentionally non-alphabetical; rendered DOM
        // must be alphabetical.
        const ids = ['zulu_event', 'alpha_event', 'mike_event'];
        const catalog = new Map<string, EventDefinition>(
            ids.map((id) => [id, buildEventDef(id)] as const),
        );
        const state = buildState({
            fired: ids,
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        const firedRows = screen.getAllByTestId('codex-unlock-fired-row');
        const order = firedRows.map((r) => r.getAttribute('data-event-id'));
        expect(order).toEqual(['alpha_event', 'mike_event', 'zulu_event']);
    });

    it('renders unknown family / source when an event id is absent from the catalog', () => {
        // Catalog has only evt_known; fired set includes evt_unknown.
        const known = buildEventDef('evt_known', { family: 'fam_known' });
        const catalog = new Map<string, EventDefinition>([[known.id, known]]);
        const state = buildState({
            fired: ['evt_known', 'evt_unknown'],
            enabled: [],
            closed: [],
        });

        renderPanel({ eventCatalog: catalog, state });

        const firedRows = screen.getAllByTestId('codex-unlock-fired-row');
        const unknownRow = firedRows.find((r) => r.getAttribute('data-event-id') === 'evt_unknown');
        expect(unknownRow).toBeTruthy();
        expect(unknownRow!.textContent).toContain('[family=unknown]');
        expect(unknownRow!.textContent).toContain('[source=unknown]');
    });

    it('renders unlock turn hints as player-facing dates instead of raw week labels', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [
                    {
                        id: 'codex_unlock_test_event',
                        turn: 1,
                        title: 'Codex Unlock Test Event',
                        narrative: '',
                        category: 'political',
                        effects: [],
                        isDecision: false,
                    },
                ],
                turn: 4,
            },
            devMode: false,
            diagMode: false,
        };

        renderPanel();

        const hint = screen.getByTestId('codex-unlock-hint');
        expect(hint.textContent).toContain(turnToDateString(12));
        expect(hint.textContent).not.toMatch(/week\s+12/i);
        expect(hint.textContent).not.toContain('W12');
    });

    it('renders dilemma decision timing as a player-facing date instead of a raw W label', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                turn: 40,
                dilemmaSpine: [
                    {
                        dilemmaId: 'vance_owen_plan',
                        title: 'The Vance-Owen Peace Plan',
                        essayId: null,
                        sensitive: false,
                        faced: true,
                        chosenResponseId: 'accept',
                        chosenBranchLabel: 'Accept the Vance-Owen Plan',
                        decisionTurn: 39,
                    },
                ],
            },
            devMode: false,
            diagMode: false,
        };

        renderPanel();

        const branch = screen.getByTestId('codex-dilemma-branch');
        expect(branch.textContent).toContain(turnToDateString(39));
        expect(branch.textContent).not.toContain('(W39)');
    });

    it('renders distance-from-history row timing as a player-facing date instead of a raw W label', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                turn: 40,
                distanceFromHistory: {
                    totalDecided: 1,
                    matchedHistory: 0,
                    diverged: 1,
                    divergencePct: 100,
                    playerDiverged: 1,
                    divergences: [
                        {
                            eventId: 'vance_owen_plan_1993',
                            title: 'The Vance-Owen Peace Plan',
                            chosen: 'Reject the Vance-Owen Plan',
                            historical: 'Accept the Vance-Owen Plan',
                            chosenResponseId: 'reject',
                            historicalResponseId: 'accept',
                            turn: 39,
                            faction: 'RBiH',
                            source: 'player',
                        },
                    ],
                },
            },
            devMode: false,
            diagMode: false,
        };

        renderPanel();

        const row = screen.getByTestId('codex-distance-from-history-row');
        expect(row.textContent).toContain(turnToDateString(39));
        expect(row.textContent).not.toMatch(/\bW39\b/);
    });
});
