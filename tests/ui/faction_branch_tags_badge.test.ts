// @vitest-environment jsdom
/**
 * Phase H Packet 4 — Component D (Branch-tag faction badge) test suite.
 *
 * Covers the standalone `BranchTagBadgeRow` component shipped in
 * `src/ui/map/components/BranchTagBadgeRow.tsx`. The component consumes
 * the H2 wave 1 helper `getBranchTagsActive` and surfaces faction-relevant
 * branch tags as a chip row. Conservative scope per H1 §6: data display
 * only, graceful degradation when state / catalog absent or no tags
 * active, deterministic alphabetical ordering.
 *
 * Mirrors the jsdom + @testing-library/react pattern established by
 * `tests/ui/event_decision_modal_decision_context.test.ts` (H3).
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BranchTagBadgeRow } from '../../src/ui/map/components/BranchTagBadgeRow.js';
import type { EventDefinition, EventResponseOption } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';

afterEach(() => cleanup());

/** Build a minimal EventDefinition with a single response option whose
 *  `sets_flags` payload carries the requested tags as boolean keys.
 *  Mirrors the canonical foundational-decision pattern from
 *  `data/scenarios/events/*.json` (e.g. `rbih_state_identity_1992`).
 */
function buildEventDef(id: string, responseId: string, tags: string[]): EventDefinition {
    const setsFlags: Record<string, boolean> = {};
    for (const tag of tags) setsFlags[tag] = true;
    const option: EventResponseOption = {
        id: responseId,
        label: `Option ${responseId}`,
        effects: [],
        sets_flags: setsFlags,
    };
    return {
        id,
        title: `Event ${id}`,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        response_options: [option],
    } as unknown as EventDefinition;
}

/** Minimal GameState shape — only the fields read by
 *  `getBranchTagsActive` (`military.fired_event_ids` +
 *  `military.event_decision_log`) are populated. */
function buildState(opts: {
    fired: string[];
    decisions: Array<{ event_id: string; response_id: string; faction: string | null; turn: number }>;
}): GameState {
    return {
        military: {
            fired_event_ids: opts.fired,
            event_decision_log: opts.decisions.map((d) => ({
                event_id: d.event_id,
                response_id: d.response_id,
                decision_source: 'player' as const,
                faction: d.faction,
                turn: d.turn,
            })),
        },
    } as unknown as GameState;
}

describe('BranchTagBadgeRow (Phase H Packet 4)', () => {
    it('renders active tags when state + catalog are provided', () => {
        const def = buildEventDef('rbih_state_identity_1992', 'civic', ['rbih_civic']);
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            decisions: [{ event_id: def.id, response_id: 'civic', faction: 'RBiH', turn: 3 }],
        });

        render(React.createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));

        const row = screen.getByTestId('branch-tag-badge-row');
        expect(row.parentElement?.className).toContain('flex-1');
        expect(row.parentElement?.className).toContain('min-w-10');
        expect(row.parentElement?.className).not.toContain('shrink-0');
        expect(row.getAttribute('data-faction')).toBe('RBiH');
        const chips = screen.getAllByTestId('branch-tag-chip');
        expect(chips).toHaveLength(1);
        expect(chips[0].getAttribute('data-tag')).toBe('rbih_civic');
        expect(chips[0].textContent).toBe('Civic republic');
        expect(row.textContent).not.toContain('rbih_civic');
    });

    it('omits gracefully when state absent', () => {
        const def = buildEventDef('rs_assembly_1992', 'override', ['rs_assembly_override']);
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const { container } = render(React.createElement(BranchTagBadgeRow, {
            faction: 'RS',
            eventCatalog: catalog,
        }));
        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId('branch-tag-badge-row')).toBeNull();
    });

    it('omits gracefully when no tags are active for the faction', () => {
        // Catalog event sets only an RS tag; we ask for RBiH → no chips.
        const def = buildEventDef('rs_only_event', 'choice', ['rs_aggressive']);
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            decisions: [{ event_id: def.id, response_id: 'choice', faction: 'RS', turn: 1 }],
        });
        const { container } = render(React.createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));
        expect(container.firstChild).toBeNull();
    });

    it('filters per-faction so RBiH state only surfaces rbih_* tags', () => {
        // Two events fire: one RBiH-tagged, one RS-tagged. Asking for RBiH
        // must return only the RBiH tag (filter via lowercased prefix).
        const rbihDef = buildEventDef('rbih_event', 'civic', ['rbih_civic']);
        const rsDef = buildEventDef('rs_event', 'override', ['rs_assembly_override']);
        const catalog = new Map<string, EventDefinition>([
            [rbihDef.id, rbihDef],
            [rsDef.id, rsDef],
        ]);
        const state = buildState({
            fired: [rbihDef.id, rsDef.id],
            decisions: [
                { event_id: rbihDef.id, response_id: 'civic', faction: 'RBiH', turn: 2 },
                { event_id: rsDef.id, response_id: 'override', faction: 'RS', turn: 2 },
            ],
        });

        render(React.createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));

        const chips = screen.getAllByTestId('branch-tag-chip');
        expect(chips).toHaveLength(1);
        expect(chips[0].getAttribute('data-tag')).toBe('rbih_civic');
    });

    it('renders tags in deterministic alphabetical order', () => {
        // Three RBiH tags arranged so input order differs from sorted order.
        // getBranchTagsActive sorts via strictCompare → component renders alphabetically.
        const defA = buildEventDef('evt_a', 'pick', ['rbih_paramilitary_allow']); // 'p'
        const defB = buildEventDef('evt_b', 'pick', ['rbih_civic']);              // 'c'
        const defC = buildEventDef('evt_c', 'pick', ['rbih_dayton_accept']);      // 'd'
        const catalog = new Map<string, EventDefinition>([
            [defA.id, defA],
            [defB.id, defB],
            [defC.id, defC],
        ]);
        // Fire in non-alphabetical order — render must still be alphabetical.
        const state = buildState({
            fired: [defA.id, defB.id, defC.id],
            decisions: [
                { event_id: defA.id, response_id: 'pick', faction: 'RBiH', turn: 5 },
                { event_id: defB.id, response_id: 'pick', faction: 'RBiH', turn: 4 },
                { event_id: defC.id, response_id: 'pick', faction: 'RBiH', turn: 6 },
            ],
        });

        render(React.createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));

        const compact = screen.getByRole('button', { name: /3 active paths/i });
        fireEvent.click(compact);
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'Civic republic',
            'Dayton acceptance',
            'Paramilitary authorization',
        ]);
    });

    it('exposes count + tag list via title tooltip', () => {
        const def = buildEventDef('hrhb_test', 'pick', [
            'hrhb_alliance_sustained',
            'hrhb_dayton_accept',
        ]);
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            decisions: [{ event_id: def.id, response_id: 'pick', faction: 'HRHB', turn: 8 }],
        });

        render(React.createElement(BranchTagBadgeRow, {
            faction: 'HRHB',
            eventCatalog: catalog,
            state,
        }));

        const row = screen.getByTestId('branch-tag-badge-row');
        const title = row.getAttribute('title') ?? '';
        expect(title).toContain('(2)');
        expect(title).toContain('Alliance sustained');
        expect(title).toContain('Dayton acceptance');
        expect(title).not.toContain('hrhb_alliance_sustained');
        expect(title).not.toContain('hrhb_dayton_accept');
    });

    it('keeps raw machine tags out of player-visible chip text and tooltip', () => {
        const def = buildEventDef('rbih_state_identity', 'civic', ['rbih_state_identity']);
        const catalog = new Map<string, EventDefinition>([[def.id, def]]);
        const state = buildState({
            fired: [def.id],
            decisions: [{ event_id: def.id, response_id: 'civic', faction: 'RBiH', turn: 0 }],
        });

        render(React.createElement(BranchTagBadgeRow, {
            faction: 'RBiH',
            eventCatalog: catalog,
            state,
        }));

        const row = screen.getByTestId('branch-tag-badge-row');
        const chip = screen.getByTestId('branch-tag-chip');
        expect(chip.getAttribute('data-tag')).toBe('rbih_state_identity');
        expect(chip.textContent).toBe('Civic republic');
        expect(row.textContent).not.toContain('rbih_state_identity');
        expect(row.textContent).not.toContain('[');
        expect(row.getAttribute('title')).not.toContain('rbih_state_identity');
    });
});
