// @vitest-environment jsdom
/**
 * Phase H Packet 7 — Catalog Wire-Up integration test suite.
 *
 * Validates that the four Phase H bridges shipped in H3-H6 are actually
 * receiving an event catalog at their mount sites (not just structurally
 * accepting one). Each bridge accepts an optional `eventCatalog` +
 * `state` prop and degrades gracefully when absent — this packet supplies
 * both at the App-level mount sites:
 *
 *   - H3 `EventDecisionModal`: catalog + raw `GameState` threaded inline
 *     from `App.tsx` so the Decision Context section activates.
 *   - H5 `CodexPanel` (via `CodexPanelWrapper`): catalog + raw state
 *     threaded so the Unlock State section activates.
 *   - H6 `WrappedOverlay` → `generateWrappedSlides`: catalog threaded so
 *     causality slides F1/F2/F3 appear after the canonical 10.
 *   - H4 `BranchTagBadgeRow`: mounted inside `BottomStatusStrip` faction
 *     indicator zone, fed catalog + raw state.
 *
 * Plus: the raw `GameState` substrate is preserved through `parseGameState`
 * on the `LoadedGameState.rawGameState` field — a runtime-only handle
 * (not persisted to save).
 *
 * Backward-compat: every existing test for H3 / H4 / H5 / H6 components
 * MUST continue to pass; this packet only ADDS catalog wiring at the
 * mount sites, never removes prop optionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { loadEventDefinitionsFull } from '../../src/ui/map/data/DataLoader.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { BranchTagBadgeRow } from '../../src/ui/map/components/BranchTagBadgeRow.js';
import { BottomStatusStrip } from '../../src/ui/map/components/BottomStatusStrip.js';
import { CodexPanel } from '../../src/ui/map/components/CodexPanel.js';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { generateWrappedSlides } from '../../src/ui/map/components/chronicle/generateWrappedSlides.js';
import type { EventDefinition, EventResponseOption } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

// ---------------------------------------------------------------------------
// Mock the fetch surface used by `loadEventDefinitionsFull`.
// ---------------------------------------------------------------------------

const FAKE_FOUNDATIONAL_EVENT: EventDefinition = {
    id: 'rbih_state_identity_1992',
    title: 'State Identity Decision',
    trigger: { turn_min: 1, phase: 'war' },
    effect: { kind: 'narrative', text: 'noop' },
    family: 'rbih_identity',
    source_tier: 'icty_icj_un',
    source_note: 'BB1 chapter 4, ICTY Krstic verdict.',
    historical_default_response_id: 'opt_civic',
    response_options: [
        {
            id: 'opt_civic',
            label: 'Affirm civic state identity',
            effects: [],
            sets_flags: { rbih_civic_identity: true },
            historical_marker: 'historical_default',
        } as EventResponseOption,
    ],
} as EventDefinition;

beforeEach(() => {
    // Stub global fetch to serve the synthetic catalog files. The full loader
    // probes 5 JSON files; non-1992 files return empty arrays.
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.endsWith('/war_1992.json')) {
            return {
                ok: true,
                json: async () => [FAKE_FOUNDATIONAL_EVENT],
            } as unknown as Response;
        }
        return {
            ok: true,
            json: async () => [],
        } as unknown as Response;
    }));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useGameStore.setState({ loadedGameState: null, devMode: false });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase H Packet 7 — Catalog Wire-Up Integration', () => {
    it('exposes a browser-side full-EventDefinition catalog loader', async () => {
        const catalog = await loadEventDefinitionsFull();
        expect(catalog).toBeInstanceOf(Map);
        expect(catalog.size).toBeGreaterThan(0);
        const def = catalog.get('rbih_state_identity_1992');
        expect(def).toBeDefined();
        // Confirm canonical-shape fields preserved (used by H3/H5 bridges).
        expect(def?.family).toBe('rbih_identity');
        expect(def?.source_tier).toBe('icty_icj_un');
        expect(def?.source_note).toContain('BB1');
        expect(def?.historical_default_response_id).toBe('opt_civic');
    });

    it('preserves rawGameState on LoadedGameState through parseGameState', () => {
        const fakeSave = {
            meta: { turn: 12, phase: 'war', date: '1992-06-29' },
            political: {
                political_controllers: {},
                initial_political_controllers: {},
            },
            military: {
                formations: {},
                fired_event_ids: ['rbih_state_identity_1992'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_decision_log: [],
                event_causality_log: [],
            },
        };
        const loaded = parseGameState(fakeSave);
        expect(loaded.rawGameState).toBeDefined();
        expect(loaded.rawGameState?.military?.fired_event_ids).toEqual([
            'rbih_state_identity_1992',
        ]);
    });

    it('EventDecisionModal renders Decision Context when supplied catalog + state', () => {
        // The family/source taxonomy row is a developer-only diagnostic gated
        // behind the `devMode` store flag (QA Batch E), so enable DEV mode
        // before asserting it renders (player default hides it — covered in the
        // dedicated decision-context unit suite).
        useGameStore.setState({ devMode: true });
        const catalog = new Map<string, EventDefinition>([
            [FAKE_FOUNDATIONAL_EVENT.id, FAKE_FOUNDATIONAL_EVENT],
        ]);
        const decision = {
            event_id: FAKE_FOUNDATIONAL_EVENT.id,
            event_title: FAKE_FOUNDATIONAL_EVENT.title ?? 'Untitled',
            narrative: 'Pick a state identity.',
            turn_fired: 1,
            faction: 'RBiH' as const,
            historical_default_response_id: 'opt_civic',
            response_options: FAKE_FOUNDATIONAL_EVENT.response_options as EventResponseOption[],
        };
        const state = { military: { event_causality_log: [] } } as unknown as GameState;
        render(createElement(EventDecisionModal, {
            decision,
            onRespond: () => undefined,
            eventCatalog: catalog,
            state,
        }));
        expect(screen.getByTestId('decision-context-section')).toBeTruthy();
        expect(
            screen.getByTestId('decision-context-family-source').textContent,
        ).toContain('rbih_identity');
    });

    it('CodexPanel renders Unlock State section when supplied catalog + state', () => {
        // The Unlock State block is a developer-only diagnostic gated behind
        // the `devMode` store flag, so enable DEV mode before asserting it
        // renders (player default hides it — covered in the dedicated unit suite).
        useGameStore.setState({ devMode: true });
        const catalog = new Map<string, EventDefinition>([
            [FAKE_FOUNDATIONAL_EVENT.id, FAKE_FOUNDATIONAL_EVENT],
        ]);
        const state = {
            military: {
                fired_event_ids: [FAKE_FOUNDATIONAL_EVENT.id],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_causality_log: [],
                event_decision_log: [],
                event_last_fired_turn: {},
            },
        } as unknown as GameState;
        render(createElement(CodexPanel, {
            isOpen: true,
            onClose: () => undefined,
            eventCatalog: catalog,
            state,
        }));
        expect(screen.getByTestId('codex-unlock-state-section')).toBeTruthy();
    });

    it('generateWrappedSlides appends causality slides when catalog supplied', () => {
        const catalog = new Map<string, EventDefinition>([
            [FAKE_FOUNDATIONAL_EVENT.id, FAKE_FOUNDATIONAL_EVENT],
        ]);
        const state = {
            player_faction: 'RBiH',
            turn: 12,
            phase: 'war',
            turnSummaries: [],
            formations: [],
            firedEvents: [],
            historicalEventsByTurn: [],
            military: {
                fired_event_ids: [FAKE_FOUNDATIONAL_EVENT.id],
                event_decision_log: [
                    {
                        turn: 1,
                        event_id: FAKE_FOUNDATIONAL_EVENT.id,
                        response_id: 'opt_civic',
                        faction: 'RBiH',
                        decision_source: 'player',
                    },
                ],
                event_causality_log: [],
            },
        };
        const baseline = generateWrappedSlides(state);
        const withCatalog = generateWrappedSlides(state, catalog);
        // Catalog adds at least the F1 foundational_choice slide.
        expect(withCatalog.length).toBeGreaterThan(baseline.length);
        const foundational = withCatalog.find((s) => s.id === 'foundational_choice');
        expect(foundational).toBeDefined();
        expect(foundational?.title).toBe('Foundational Choice');
    });

    it('BranchTagBadgeRow renders chips when wired via BottomStatusStrip-style host', () => {
        const catalog = new Map<string, EventDefinition>([
            [FAKE_FOUNDATIONAL_EVENT.id, FAKE_FOUNDATIONAL_EVENT],
        ]);
        const state = {
            military: {
                fired_event_ids: [FAKE_FOUNDATIONAL_EVENT.id],
                event_decision_log: [
                    {
                        turn: 1,
                        event_id: FAKE_FOUNDATIONAL_EVENT.id,
                        response_id: 'opt_civic',
                        faction: 'RBiH',
                        decision_source: 'player',
                    },
                ],
            },
        } as unknown as GameState;
        render(createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));
        const row = screen.queryByTestId('branch-tag-badge-row');
        expect(row).toBeTruthy();
        expect(row?.getAttribute('data-faction')).toBe('RBiH');
    });

    it('BottomStatusStrip mounts BranchTagBadgeRow when supplied catalog + rawGameState', () => {
        const catalog = new Map<string, EventDefinition>([
            [FAKE_FOUNDATIONAL_EVENT.id, FAKE_FOUNDATIONAL_EVENT],
        ]);
        const rawGameState = {
            military: {
                fired_event_ids: [FAKE_FOUNDATIONAL_EVENT.id],
                event_decision_log: [
                    {
                        turn: 1,
                        event_id: FAKE_FOUNDATIONAL_EVENT.id,
                        response_id: 'opt_civic',
                        faction: 'RBiH',
                        decision_source: 'player',
                    },
                ],
            },
        } as unknown as GameState;
        useGameStore.setState({
            loadedGameState: {
                label: 'Turn 12',
                turn: 12,
                phase: 'war',
                formations: [],
                militiaPools: [],
                controlBySettlement: {},
                statusBySettlement: {},
                brigadeAorByFormationId: {},
                attackOrders: [],
                aorOrders: [],
                recentControlEvents: [],
                allControlEvents: [],
                displacementEventLog: [],
                battlesByOsid: {},
                movementsByOsid: {},
                supplyTransitionsByOsid: {},
                historicalEventsByTurn: [],
                player_faction: 'RBiH',
                rawGameState,
            } as any,
            mapMode: 'political',
            devMode: false,
        });
        render(createElement(BottomStatusStrip as any, { eventCatalog: catalog }));
        const row = screen.queryByTestId('branch-tag-badge-row');
        expect(row).toBeTruthy();
        expect(row?.getAttribute('data-faction')).toBe('RBiH');
    });

    it('BottomStatusStrip omits BranchTagBadgeRow when catalog is absent (graceful degradation)', () => {
        // No catalog prop, no rawGameState — the badge row must not render.
        useGameStore.setState({
            loadedGameState: {
                label: 'Turn 12',
                turn: 12,
                phase: 'war',
                formations: [],
                militiaPools: [],
                controlBySettlement: {},
                statusBySettlement: {},
                brigadeAorByFormationId: {},
                attackOrders: [],
                aorOrders: [],
                recentControlEvents: [],
                allControlEvents: [],
                displacementEventLog: [],
                battlesByOsid: {},
                movementsByOsid: {},
                supplyTransitionsByOsid: {},
                historicalEventsByTurn: [],
                player_faction: 'RBiH',
            } as any,
            mapMode: 'political',
            devMode: false,
        });
        render(createElement(BottomStatusStrip));
        expect(screen.queryByTestId('branch-tag-badge-row')).toBeNull();
    });
});
