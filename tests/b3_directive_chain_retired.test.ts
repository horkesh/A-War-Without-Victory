/**
 * Freeze cut B3 + B2 (2026-11-16): the political-directive chain is retired.
 *
 * - Save migration v39 empties the stale directive slots, drains the undrainable
 *   `army_directive_pushback` events and drops the staff's directive-reading
 *   traces, keeping autonomous-launch traces and every other officer event.
 * - The command briefing no longer counts `army_directive_pushback` as a pending
 *   order interpretation (no handler or UI could ever clear it).
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { applyMigrations } from '../src/state/save_migration.js';
import { assembleCommandBriefing } from '../src/sim/briefing/collect_briefing.js';

function pushback(faction: string, turn: number, acknowledged = false): Record<string, unknown> {
    return {
        event_id: `army:${faction}:directive:${turn}`,
        type: 'army_directive_pushback',
        faction,
        turn,
        officer_id: `${faction}_army_co`,
        acknowledged,
        reason: 'The Main Staff pushed back on the standing directive.',
    };
}

function legacyMilitary(): Record<string, unknown> {
    return {
        political_directives_by_faction: {
            RBiH: { verb: 'HONOR_TRUCE', magnitude: 'standard', permission_flags: [], directive_id: 'b1:RBiH:HONOR_TRUCE:120' },
        },
        army_corps_directives_by_faction: {
            RBiH: { arbih_2nd_corps: { corps_id: 'arbih_2nd_corps', role: 'economy', deviated: true } },
        },
        army_co_decision_traces: {
            RBiH: [
                { turn: 119, campaign_role: 'HONOR_TRUCE', rationale: 'PARTIAL: staff reading of policy' },
                { turn: 120, campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL', rationale: 'proposal', raw_directive_id: 'x' },
            ],
            RS: [{ turn: 120, campaign_role: 'PREPARE_RESERVE', rationale: 'REFUSED' }],
        },
        pending_officer_events: [
            pushback('RBiH', 119),
            pushback('RS', 120),
            pushback('HRHB', 120, true),
            { event_id: 'officer:RBiH:avail:120', type: 'officer_available', faction: 'RBiH', turn: 120, officer_id: 'x', acknowledged: false },
        ],
    };
}

describe('B3/B2 — save migration v39', () => {
    it('empties both directive slots, drains unacknowledged pushback, keeps other events and launch traces', () => {
        const state = { schema_version: 38, meta: { turn: 120 }, military: legacyMilitary() } as unknown as GameState;
        applyMigrations(state);
        const mil = state.military as unknown as Record<string, any>;
        expect(state.schema_version).toBeGreaterThanOrEqual(39);
        expect('political_directives_by_faction' in mil).toBe(false);
        expect(mil.army_corps_directives_by_faction).toEqual({});
        expect(mil.pending_officer_events.map((e: { event_id: string }) => e.event_id)).toEqual([
            'army:HRHB:directive:120',
            'officer:RBiH:avail:120',
        ]);
        expect(mil.army_co_decision_traces).toEqual({
            RBiH: [{ turn: 120, campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL', rationale: 'proposal', raw_directive_id: 'x' }],
        });
    });

    it('is idempotent and deterministic', () => {
        const a = { schema_version: 38, meta: { turn: 120 }, military: legacyMilitary() } as unknown as GameState;
        const b = { schema_version: 38, meta: { turn: 120 }, military: legacyMilitary() } as unknown as GameState;
        applyMigrations(a);
        applyMigrations(b);
        expect(JSON.stringify(a.military)).toBe(JSON.stringify(b.military));
        const once = JSON.stringify(a.military);
        applyMigrations(a);
        expect(JSON.stringify(a.military)).toBe(once);
    });
});

describe('B2 — the command briefing tells the truth about pending interpretations', () => {
    it('unacknowledged army_directive_pushback events are not counted as pending order interpretations', () => {
        const state = {
            meta: { turn: 120, player_faction: 'RBiH' },
            military: { pending_officer_events: [pushback('RBiH', 118), pushback('RBiH', 119), pushback('RBiH', 120)] },
            political: {},
        } as unknown as GameState;
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const items = (briefing as unknown as { items: Array<{ id: string }> }).items ?? [];
        expect(items.some((i) => i.id === 'cmd-order-interpretations')).toBe(false);
    });

    it('a real order pushback is still counted', () => {
        const state = {
            meta: { turn: 120, player_faction: 'RBiH' },
            military: {
                pending_officer_events: [
                    pushback('RBiH', 120),
                    { event_id: 'o:1', type: 'order_pushback', faction: 'RBiH', turn: 120, officer_id: 'c', acknowledged: false },
                ],
            },
            political: {},
        } as unknown as GameState;
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const items = (briefing as unknown as { items: Array<{ id: string; title: string }> }).items ?? [];
        const interp = items.find((i) => i.id === 'cmd-order-interpretations');
        expect(interp?.title).toBe('1 order interpretation pending');
    });
});
