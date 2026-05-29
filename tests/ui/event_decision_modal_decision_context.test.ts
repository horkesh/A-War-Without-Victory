// @vitest-environment jsdom
/**
 * Phase H Packet 3 — Component A (Decision Context expansion) test suite.
 *
 * Covers the new optional `eventCatalog` + `state` props on
 * `EventDecisionModal` that drive the Decision Context section
 * (family + source_tier badge, ancestry chain, source-dossier excerpt).
 *
 * Backward-compatibility tests for the existing modal behaviour live in
 * `event_decision_modal_phase3.test.ts` + `event_decision_modal_catalog.test.ts`.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../../src/state/game_state.js';

afterEach(() => cleanup());

const BASE_DECISION = {
    event_id: 'phase_h_packet_3_test_event',
    event_title: 'Phase H Packet 3 Test Event',
    narrative: 'A narrative for the decision context expansion test.',
    turn_fired: 12,
    faction: 'RBiH' as const,
    historical_default_response_id: 'opt_a',
    response_options: [
        { id: 'opt_a', label: 'Option A', effects: [], historical_marker: 'historical_default' as const },
        { id: 'opt_b', label: 'Option B', effects: [], historical_marker: 'counterfactual' as const },
    ],
};

function buildEventDef(overrides: Partial<EventDefinition> = {}): EventDefinition {
    return {
        id: BASE_DECISION.event_id,
        title: BASE_DECISION.event_title,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test_family_h3',
        source_tier: 'icty_icj_un',
        source_note: 'Short source note from catalog.',
        response_options: BASE_DECISION.response_options,
        historical_default_response_id: BASE_DECISION.historical_default_response_id,
        ...overrides,
    };
}

function buildStateWithAncestry(targetEventId: string, ancestors: string[]): GameState {
    // Build a chain: ancestors[0] -> ancestors[1] -> ... -> targetEventId via
    // `enables` edges in event_causality_log. `getCausalAncestors` walks
    // reverse adjacency over `kind === 'enables'` rows.
    const log: CausalityLogEntry[] = [];
    let prev: string | null = null;
    for (const id of ancestors) {
        if (prev !== null) {
            log.push({
                turn: 1,
                from_event: prev,
                to_event: id,
                to_flag: null,
                kind: 'enables',
            });
        }
        prev = id;
    }
    if (prev !== null) {
        log.push({
            turn: 1,
            from_event: prev,
            to_event: targetEventId,
            to_flag: null,
            kind: 'enables',
        });
    }
    // Minimal GameState shape — only the fields read by getCausalAncestors
    // are populated. Cast through unknown to avoid pulling the full state
    // builder; the helper only reads `state.military.event_causality_log`.
    return {
        military: {
            event_causality_log: log,
        },
    } as unknown as GameState;
}

describe('EventDecisionModal Decision Context (Phase H Packet 3)', () => {
    it('renders Decision Context with family + source tier when eventCatalog is provided', () => {
        const eventDef = buildEventDef();
        const catalog = new Map<string, EventDefinition>([[eventDef.id, eventDef]]);

        render(React.createElement(EventDecisionModal, {
            decision: BASE_DECISION,
            onRespond: () => undefined,
            eventCatalog: catalog,
        }));

        expect(screen.getByText('Decision Context')).toBeTruthy();
        expect(screen.getByText(/Family: test_family_h3 \| Source: icty_icj_un/)).toBeTruthy();
    });

    it('renders ancestry chain when state with a populated causality log is provided', () => {
        const eventDef = buildEventDef();
        const catalog = new Map<string, EventDefinition>([[eventDef.id, eventDef]]);
        const state = buildStateWithAncestry(eventDef.id, ['foundational_event_a', 'foundational_event_b']);

        render(React.createElement(EventDecisionModal, {
            decision: BASE_DECISION,
            onRespond: () => undefined,
            eventCatalog: catalog,
            state,
        }));

        // Sorted via strictCompare; both ancestor ids should appear comma-separated.
        const ancestryRow = screen.getByText(/Ancestry:/);
        expect(ancestryRow.textContent).toContain('foundational_event_a');
        expect(ancestryRow.textContent).toContain('foundational_event_b');
    });

    it('omits the Decision Context section entirely when neither eventCatalog nor state is provided (graceful degradation)', () => {
        render(React.createElement(EventDecisionModal, {
            decision: BASE_DECISION,
            onRespond: () => undefined,
        }));

        // Section heading must not appear when the caller does not opt in
        // by passing eventCatalog/state. Existing source-note dossier in
        // the sidebar is unaffected (covered by phase3 tests).
        expect(screen.queryByText('Decision Context')).toBeNull();
    });

    it('truncates source dossier excerpt at 200 chars with ellipsis suffix', () => {
        const longNote = 'A'.repeat(250);
        const eventDef = buildEventDef({ source_note: longNote, historical_source: undefined });
        const catalog = new Map<string, EventDefinition>([[eventDef.id, eventDef]]);

        render(React.createElement(EventDecisionModal, {
            decision: BASE_DECISION,
            onRespond: () => undefined,
            eventCatalog: catalog,
        }));

        const dossierRow = screen.getByText(/Source dossier:/);
        // Expect: "Source dossier: " + 200 chars + "..."
        expect(dossierRow.textContent?.endsWith('...')).toBe(true);
        // Body length: leading "Source dossier: " (16) + 200 + 3 ellipsis = 219
        const aRunLength = (dossierRow.textContent?.match(/A+/g)?.[0]?.length) ?? 0;
        expect(aRunLength).toBe(200);
    });

    it('does not truncate source dossier when under 200 chars', () => {
        const shortNote = 'Short citation under the limit.';
        const eventDef = buildEventDef({ source_note: shortNote, historical_source: undefined });
        const catalog = new Map<string, EventDefinition>([[eventDef.id, eventDef]]);

        render(React.createElement(EventDecisionModal, {
            decision: BASE_DECISION,
            onRespond: () => undefined,
            eventCatalog: catalog,
        }));

        const dossierRow = screen.getByText(/Source dossier:/);
        expect(dossierRow.textContent).toContain(shortNote);
        expect(dossierRow.textContent?.endsWith('...')).toBe(false);
    });
});
