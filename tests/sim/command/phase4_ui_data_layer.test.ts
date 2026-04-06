/**
 * Tests for v0.8.3 Phase 4 — UI Data Layer (types, adapter, briefing).
 *
 * Covers:
 * 1. derivePendingOfficerEvents maps order_refused event (reason, corps_name)
 * 2. derivePendingOfficerEvents maps order_modified event
 * 3. derivePendingOfficerEvents excludes acknowledged events
 * 4. Adapter sets is_cowed=true when cowed_until_turn >= current_turn
 * 5. Adapter sets is_cowed=false when cowed_until_turn < current_turn (expired)
 * 6. Briefing collector emits cmd-order-interpretations as critical for refusal
 * 7. Briefing collector emits cmd-officer-events for personnel events separately
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { parseGameState } from '../../../src/ui/map/data/GameStateAdapter.js';
import { assembleCommandBriefing } from '../../../src/sim/briefing/collect_briefing.js';

// ═══════════════════════════════════════════════════════════════════════════
// Minimal raw state helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Minimal raw game state that satisfies parseGameState() validation.
 * All optional fields omitted — only the structural minimums required.
 */
function makeRawState(overrides: Record<string, unknown> = {}): any {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH', ...((overrides.meta as object) ?? {}) },
        military: {
            formations: {},
            named_officer_data: [],
            named_officers: {},
            brigade_movement_state: {},
            ...((overrides.military as object) ?? {}),
        },
        political: {
            controllers: {},
        },
        factions: [],
        ...overrides,
    };
}

/**
 * Minimal state for assembleCommandBriefing (sim-side, not adapter).
 */
function makeBriefingState(overrides: Record<string, unknown> = {}): any {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH' },
        factions: [],
        military: {
            formations: {},
            corps_command: {},
            negotiation: {},
            ...((overrides.military as object) ?? {}),
        },
        political: {},
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1 — derivePendingOfficerEvents (via parseGameState)
// ═══════════════════════════════════════════════════════════════════════════

describe('derivePendingOfficerEvents', () => {
    it('maps order_refused event — has reason and corps_name', () => {
        const raw = makeRawState({
            military: {
                formations: {
                    arbih_1st_corps: { faction: 'RBiH', kind: 'corps_asset', name: '1st Corps', status: 'active' },
                },
                named_officer_data: [
                    { id: 'o1', name: 'Test Officer', faction: 'RBiH', rank: 'corps_commander',
                      competence: 3, aggressiveness: 1, defensive_skill: 3, political_reliability: 2 },
                ],
                named_officers: {
                    o1: { status: 'active', assigned_corps_id: 'arbih_1st_corps', acting_commander: false,
                          turns_in_command: 5, battles: 2, victories: 1 },
                },
                brigade_movement_state: {},
                pending_officer_events: [
                    {
                        event_id: 'evt-refused-1',
                        type: 'order_refused',
                        faction: 'RBiH',
                        turn: 10,
                        officer_id: 'o1',
                        corps_id: 'arbih_1st_corps',
                        acknowledged: false,
                        reason: 'Officer judged the operation too risky given current readiness.',
                        overridable: true,
                        override_action: 'force_launch',
                    },
                ],
            },
        });

        const parsed = parseGameState(raw);
        expect(parsed.pendingOfficerEvents).toBeDefined();
        expect(parsed.pendingOfficerEvents!.length).toBe(1);

        const evt = parsed.pendingOfficerEvents![0];
        expect(evt.type).toBe('order_refused');
        expect(evt.reason).toBe('Officer judged the operation too risky given current readiness.');
        expect(evt.corps_name).toBeTruthy(); // getPlayerSafeCorpsName returns something non-empty
        expect(evt.corps_id).toBe('arbih_1st_corps');
        expect(evt.overridable).toBe(true);
        expect(evt.override_action).toBe('force_launch');
    });

    it('maps order_modified event — reason and overridable=false', () => {
        const raw = makeRawState({
            military: {
                formations: {
                    vrs_drina_corps: { faction: 'RS', kind: 'corps_asset', name: 'Drina Corps', status: 'active' },
                },
                named_officer_data: [
                    { id: 'o2', name: 'Another Officer', faction: 'RS', rank: 'corps_commander',
                      competence: 4, aggressiveness: 2, defensive_skill: 4, political_reliability: 3 },
                ],
                named_officers: {
                    o2: { status: 'active', assigned_corps_id: 'vrs_drina_corps', acting_commander: false,
                          turns_in_command: 3, battles: 0, victories: 0 },
                },
                brigade_movement_state: {},
                pending_officer_events: [
                    {
                        event_id: 'evt-mod-1',
                        type: 'order_modified',
                        faction: 'RS',
                        turn: 10,
                        officer_id: 'o2',
                        corps_id: 'vrs_drina_corps',
                        acknowledged: false,
                        reason: 'Extended planning duration by 2 turns due to cautious temperament.',
                        overridable: false,
                    },
                ],
            },
        });

        const parsed = parseGameState(raw);
        expect(parsed.pendingOfficerEvents!.length).toBe(1);

        const evt = parsed.pendingOfficerEvents![0];
        expect(evt.type).toBe('order_modified');
        expect(evt.reason).toBe('Extended planning duration by 2 turns due to cautious temperament.');
        expect(evt.overridable).toBe(false);
        expect(evt.override_action).toBeUndefined();
    });

    it('does NOT include acknowledged events', () => {
        const raw = makeRawState({
            military: {
                formations: {},
                named_officer_data: [
                    { id: 'o3', name: 'Third Officer', faction: 'RBiH', rank: 'corps_commander',
                      competence: 3, aggressiveness: 3, defensive_skill: 3, political_reliability: 3 },
                ],
                named_officers: {
                    o3: { status: 'active', assigned_corps_id: null, acting_commander: false,
                          turns_in_command: 0, battles: 0, victories: 0 },
                },
                brigade_movement_state: {},
                pending_officer_events: [
                    {
                        event_id: 'evt-ack-1',
                        type: 'order_pushback',
                        faction: 'RBiH',
                        turn: 9,
                        officer_id: 'o3',
                        acknowledged: true,  // already acknowledged
                        reason: 'Some pushback reason.',
                    },
                ],
            },
        });

        const parsed = parseGameState(raw);
        // acknowledged event must be filtered out
        expect(!parsed.pendingOfficerEvents || parsed.pendingOfficerEvents.length === 0).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2 — is_cowed field (via parseGameState)
// ═══════════════════════════════════════════════════════════════════════════

describe('NamedOfficerView is_cowed', () => {
    function makeOfficerRaw(cowedUntilTurn: number | undefined, currentTurn: number) {
        return makeRawState({
            meta: { turn: currentTurn, phase: 'war', player_faction: 'RBiH' },
            military: {
                formations: {},
                named_officer_data: [
                    { id: 'co1', name: 'Cowed Officer', faction: 'RBiH', rank: 'corps_commander',
                      competence: 3, aggressiveness: 3, defensive_skill: 3, political_reliability: 1 },
                ],
                named_officers: {
                    co1: {
                        status: 'active',
                        assigned_corps_id: null,
                        acting_commander: false,
                        turns_in_command: 0,
                        battles: 0,
                        victories: 0,
                        ...(cowedUntilTurn !== undefined ? { cowed_until_turn: cowedUntilTurn } : {}),
                    },
                },
                brigade_movement_state: {},
            },
        });
    }

    it('sets is_cowed=true when cowed_until_turn >= current turn', () => {
        // turn=10, cowed_until_turn=12 → still cowed (10 <= 12)
        const raw = makeOfficerRaw(12, 10);
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'co1');
        expect(officer).toBeDefined();
        expect(officer!.is_cowed).toBe(true);
        expect(officer!.cowed_until_turn).toBe(12);
    });

    it('sets is_cowed=false when cowed_until_turn < current turn (expired)', () => {
        // turn=15, cowed_until_turn=12 → expired (15 > 12)
        const raw = makeOfficerRaw(12, 15);
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'co1');
        expect(officer).toBeDefined();
        expect(officer!.is_cowed).toBe(false);
        expect(officer!.cowed_until_turn).toBe(12);
    });

    it('sets is_cowed=false when cowed_until_turn is absent', () => {
        const raw = makeOfficerRaw(undefined, 10);
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'co1');
        expect(officer).toBeDefined();
        expect(officer!.is_cowed).toBe(false);
        expect(officer!.cowed_until_turn).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3 — Briefing collector separation (via assembleCommandBriefing)
// ═══════════════════════════════════════════════════════════════════════════

describe('Command briefing collector — Phase 3 event separation', () => {
    it('emits cmd-order-interpretations as critical when order_refused present', () => {
        const state = makeBriefingState({
            military: {
                formations: {},
                corps_command: {},
                negotiation: {},
                pending_officer_events: [
                    { event_id: 'e1', type: 'order_refused', faction: 'RBiH', turn: 10,
                      officer_id: 'o1', acknowledged: false, reason: 'Refused the order.' },
                ],
            },
        });

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const item = briefing.items.find(i => i.id === 'cmd-order-interpretations');
        expect(item).toBeDefined();
        expect(item!.severity).toBe('critical');
        expect(item!.title).toContain('1 order interpretation');
        expect(item!.detail).toContain('refused');
    });

    it('emits cmd-order-interpretations as warning for order_modified (no refusal)', () => {
        const state = makeBriefingState({
            military: {
                formations: {},
                corps_command: {},
                negotiation: {},
                pending_officer_events: [
                    { event_id: 'e2', type: 'order_modified', faction: 'RBiH', turn: 10,
                      officer_id: 'o2', acknowledged: false, reason: 'Modified duration.' },
                ],
            },
        });

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const item = briefing.items.find(i => i.id === 'cmd-order-interpretations');
        expect(item).toBeDefined();
        expect(item!.severity).toBe('warning');
    });

    it('emits cmd-officer-events separately for personnel events', () => {
        const state = makeBriefingState({
            military: {
                formations: {},
                corps_command: {},
                negotiation: {},
                pending_officer_events: [
                    { event_id: 'e3', type: 'officer_available', faction: 'RBiH', turn: 10,
                      officer_id: 'o3', acknowledged: false },
                    { event_id: 'e4', type: 'replacement_suggested', faction: 'RBiH', turn: 10,
                      officer_id: 'o4', acknowledged: false },
                ],
            },
        });

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const personnelItem = briefing.items.find(i => i.id === 'cmd-officer-events');
        expect(personnelItem).toBeDefined();
        expect(personnelItem!.severity).toBe('warning');
        expect(personnelItem!.title).toContain('2 officer events');
        // interpretation item must be absent when there are no interp events
        const interpItem = briefing.items.find(i => i.id === 'cmd-order-interpretations');
        expect(interpItem).toBeUndefined();
    });

    it('emits both items when both interp and personnel events are present', () => {
        const state = makeBriefingState({
            military: {
                formations: {},
                corps_command: {},
                negotiation: {},
                pending_officer_events: [
                    { event_id: 'e5', type: 'order_pushback', faction: 'RBiH', turn: 10,
                      officer_id: 'o5', acknowledged: false },
                    { event_id: 'e6', type: 'officer_available', faction: 'RBiH', turn: 10,
                      officer_id: 'o6', acknowledged: false },
                ],
            },
        });

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const interpItem = briefing.items.find(i => i.id === 'cmd-order-interpretations');
        const personnelItem = briefing.items.find(i => i.id === 'cmd-officer-events');
        expect(interpItem).toBeDefined();
        expect(personnelItem).toBeDefined();
    });

    it('does not emit cmd-order-interpretations for acknowledged events', () => {
        const state = makeBriefingState({
            military: {
                formations: {},
                corps_command: {},
                negotiation: {},
                pending_officer_events: [
                    { event_id: 'e7', type: 'order_refused', faction: 'RBiH', turn: 9,
                      officer_id: 'o7', acknowledged: true },  // already ack'd
                ],
            },
        });

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const item = briefing.items.find(i => i.id === 'cmd-order-interpretations');
        expect(item).toBeUndefined();
    });
});
