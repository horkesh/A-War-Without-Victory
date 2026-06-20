/**
 * Focused tests for deriveInboxItems — presidential inbox item derivation.
 *
 * Covers:
 *  - Event decisions produce blocking inbox items
 *  - Peace plans produce urgent inbox items with correct planName
 *  - Reserve requests produce army_reserve action items
 *  - Officer events produce army_hq_personnel action items
 *  - Autonomy proposals produce autonomy_panel action items from pendingProposalReviews
 *  - Operation opportunities route to Army HQ dossiers, not the generic autonomy panel
 *  - Opening brief appears when openingBriefDismissed is false and player_faction is set
 *  - Empty state returns only date marker
 */

import { describe, it, expect } from 'vitest';
import { deriveInboxItems, countActionableItems, hasBlockingItems, resolveEventQueueIndex } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

// ---------------------------------------------------------------------------
// Minimal stub factory — only fields that deriveInboxItems actually reads
// ---------------------------------------------------------------------------
function makeStub(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'test',
        turn: 5,
        phase: 'war',
        player_faction: 'RBiH',
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
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        ...overrides,
    } as LoadedGameState;
}

// ---------------------------------------------------------------------------
// 1. Event decisions
// ---------------------------------------------------------------------------
describe('deriveInboxItems — event decisions', () => {
    it('returns blocking items for pending event decisions', () => {
        const state = makeStub({
            pendingEventDecisions: [
                {
                    event_id: 'evt_1',
                    event_title: 'Srebrenica Crisis',
                    turn_fired: 5,
                    faction: 'RBiH',
                    response_options: [
                        { id: 'opt_a', label: 'Accept', effects: [] },
                        { id: 'opt_b', label: 'Reject', effects: [] },
                    ],
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const eventItems = items.filter(i => i.type === 'event_decision');
        expect(eventItems).toHaveLength(1);
        expect(eventItems[0].severity).toBe('blocking');
        expect(eventItems[0].action).toBe('event_modal');
        expect(eventItems[0].id).toBe('event:evt_1');
        expect(eventItems[0].title).toBe('Srebrenica Crisis');
        expect(hasBlockingItems(items)).toBe(true);
    });

    it('labels pending event timing with a calendar date instead of raw turn copy', () => {
        const state = makeStub({
            pendingEventDecisions: [
                {
                    event_id: 'evt_opening',
                    event_title: 'What Is Bosnia?',
                    turn_fired: 0,
                    faction: 'RBiH',
                    response_options: [
                        { id: 'opt_a', label: 'Accept', effects: [] },
                    ],
                },
            ],
        });

        const items = deriveInboxItems(state, null);
        const eventItems = items.filter(i => i.type === 'event_decision');

        expect(eventItems).toHaveLength(1);
        expect(eventItems[0].subtitle).toContain('6 Apr 1992');
        expect(eventItems[0].subtitle).not.toMatch(/\bturn\s+0\b/i);
    });

    it('returns multiple items for multiple pending decisions', () => {
        const state = makeStub({
            pendingEventDecisions: [
                { event_id: 'evt_1', event_title: 'Crisis A', turn_fired: 3, faction: 'RBiH', response_options: [{ id: 'a', label: 'A', effects: [] }] },
                { event_id: 'evt_2', event_title: 'Crisis B', turn_fired: 4, faction: 'RBiH', response_options: [{ id: 'b', label: 'B', effects: [] }] },
            ],
        });
        const items = deriveInboxItems(state, null);
        const eventItems = items.filter(i => i.type === 'event_decision');
        expect(eventItems).toHaveLength(2);
    });

    it('filters faction-owned action queues to the player faction', () => {
        const state = makeStub({
            player_faction: 'RS',
            pendingEventDecisions: [
                { event_id: 'evt_rs', event_title: 'RS Crisis', turn_fired: 5, faction: 'RS', response_options: [{ id: 'a', label: 'A', effects: [] }] },
                { event_id: 'evt_rbih', event_title: 'RBiH Crisis', turn_fired: 5, faction: 'RBiH', response_options: [{ id: 'b', label: 'B', effects: [] }] },
            ],
            pendingProposalReviews: [
                { id: 'PROP_rs', turn: 5, faction: 'RS', domain: 'ops', description: 'RS proposal' },
                { id: 'PROP_rbih', turn: 5, faction: 'RBiH', domain: 'ops', description: 'RBiH proposal' },
            ],
            pendingReserveRequests: [
                {
                    request_id: 'reserve_rs', corps_id: 'drina_corps', faction: 'RS', reason: 'test',
                    priority: 1, severityBand: 'routine' as const, travel_hops: 1, description: 'test',
                    suggested_brigade_id: null, turn_requested: 5,
                },
                {
                    request_id: 'reserve_rbih', corps_id: 'first_corps', faction: 'RBiH', reason: 'test',
                    priority: 1, severityBand: 'routine' as const, travel_hops: 1, description: 'test',
                    suggested_brigade_id: null, turn_requested: 5,
                },
            ],
            pendingOfficerEvents: [
                {
                    event_id: 'off_rs',
                    type: 'officer_available',
                    faction: 'RS',
                    turn: 5,
                    officer_id: 'rs_officer',
                    officer_name: 'RS Officer',
                    officer_competence: 0.7,
                    officer_aggressiveness: 0.6,
                    officer_defensive_skill: 0.6,
                    acknowledged: false,
                },
                {
                    event_id: 'off_rbih',
                    type: 'officer_available',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'rbih_officer',
                    officer_name: 'RBiH Officer',
                    officer_competence: 0.7,
                    officer_aggressiveness: 0.6,
                    officer_defensive_skill: 0.6,
                    acknowledged: false,
                },
            ],
        });

        const itemIds = deriveInboxItems(state, null).map(i => i.id);

        expect(itemIds).toContain('event:evt_rs');
        expect(itemIds).toContain('proposal:PROP_rs');
        expect(itemIds).toContain('reserve:reserve_rs');
        expect(itemIds).toContain('officer:officer_available:rs_officer');
        expect(itemIds).not.toContain('event:evt_rbih');
        expect(itemIds).not.toContain('proposal:PROP_rbih');
        expect(itemIds).not.toContain('reserve:reserve_rbih');
        expect(itemIds).not.toContain('officer:officer_available:rbih_officer');
    });
});

// ---------------------------------------------------------------------------
// 2. Peace plan
// ---------------------------------------------------------------------------
describe('deriveInboxItems — peace plan', () => {
    it('returns urgent item for pending peace plan with correct planName', () => {
        const state = makeStub({
            pendingPeacePlan: {
                planId: 'vance_owen',
                planName: 'Vance-Owen Peace Plan',
                narrative: 'International mediators propose a canton-based solution.',
                turnOffered: 10,
                proposedSplit: { RBiH: 30, RS: 49, HRHB: 21 },
                institutionalModel: 'cantons',
                botResponses: { RS: 'rejected' },
            },
        });
        const items = deriveInboxItems(state, null);
        const peaceItems = items.filter(i => i.type === 'peace_plan');
        expect(peaceItems).toHaveLength(1);
        expect(peaceItems[0].severity).toBe('urgent');
        expect(peaceItems[0].action).toBe('peace_plan_modal');
        expect(peaceItems[0].title).toBe('Vance-Owen Peace Plan');
        expect(peaceItems[0].id).toBe('peace:vance_owen');
    });

    it('falls back to "Peace Proposal" when planName is undefined', () => {
        const state = makeStub({
            pendingPeacePlan: {
                planId: 'unknown',
                planName: undefined as unknown as string,
                narrative: 'A plan.',
                turnOffered: 10,
                proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 },
                institutionalModel: 'unknown',
                botResponses: {},
            },
        });
        const items = deriveInboxItems(state, null);
        const peaceItems = items.filter(i => i.type === 'peace_plan');
        expect(peaceItems[0].title).toBe('Peace Proposal');
    });
});

// ---------------------------------------------------------------------------
// 3. Dayton and convoy decisions
// ---------------------------------------------------------------------------
describe('deriveInboxItems - Dayton and convoy decisions', () => {
    it('surfaces a pending Dayton negotiation as a blocking inbox item', () => {
        const state = makeStub({
            pendingDayton: {
                territorialPackages: [],
                institutionalPackages: [],
                factionCapital: { RBiH: 50, RS: 50, HRHB: 50 },
                patronOverride: { RBiH: 0, RS: 0, HRHB: 0 },
            },
        });

        const daytonItems = deriveInboxItems(state, null).filter(i => i.type === 'dayton_negotiation');

        expect(daytonItems).toHaveLength(1);
        expect(daytonItems[0]).toMatchObject({
            id: 'dayton:5',
            severity: 'blocking',
            action: 'dayton_modal',
            title: 'Dayton Negotiation',
        });
    });

    it('surfaces pending convoy decisions and routes them to the convoy decision modal', () => {
        const state = makeStub({
            pendingConvoyDecisions: [
                {
                    id: 'convoy_1',
                    target_enclave: 'Gorazde',
                    route_faction: 'RS',
                    supply_amount: 25,
                },
            ],
        });

        const convoyItems = deriveInboxItems(state, null).filter(i => i.type === 'convoy_decision');

        expect(convoyItems).toHaveLength(1);
        expect(convoyItems[0]).toMatchObject({
            id: 'convoy:convoy_1',
            severity: 'normal',
            action: 'convoy_decision_modal',
            title: 'Humanitarian Convoy',
        });
        expect(convoyItems[0].subtitle).toContain('allow, block, or divert');
    });
});

// ---------------------------------------------------------------------------
// 4. Reserve requests
// ---------------------------------------------------------------------------
describe('deriveInboxItems — reserve requests', () => {
    it('returns reserve request items with army_reserve action', () => {
        const state = makeStub({
            formations: [
                { id: 'first_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps', status: 'active' },
            ] as LoadedGameState['formations'],
            pendingReserveRequests: [
                {
                    request_id: 'req_1',
                    corps_id: 'first_corps',
                    faction: 'RBiH',
                    reason: 'Sector under pressure',
                    purpose: 'defensive',
                    priority: 1,
                    severityBand: 'routine' as const,
                    travel_hops: 2,
                    description: 'Needs reinforcement.',
                    suggested_brigade_id: null,
                    turn_requested: 5,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const reserveItems = items.filter(i => i.type === 'reserve_request');
        expect(reserveItems).toHaveLength(1);
        expect(reserveItems[0].action).toBe('army_reserve');
        expect(reserveItems[0].severity).toBe('normal');
        expect(reserveItems[0].subtitle).toContain('1st Corps');
        expect(reserveItems[0].subtitle).not.toContain('first_corps');
        expect(reserveItems[0].subtitle).toContain('defensive');
    });
});

// ---------------------------------------------------------------------------
// 4. Officer events
// ---------------------------------------------------------------------------
describe('deriveInboxItems — officer events', () => {
    it('returns officer event items with army_hq_personnel action', () => {
        const state = makeStub({
            pendingOfficerEvents: [
                {
                    event_id: 'off_1',
                    type: 'replacement_suggested',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'halilovic',
                    officer_name: 'Sefer Halilovic',
                    officer_competence: 0.6,
                    officer_aggressiveness: 0.7,
                    officer_defensive_skill: 0.5,
                    acknowledged: false,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const officerItems = items.filter(i => i.type === 'officer_event');
        expect(officerItems).toHaveLength(1);
        expect(officerItems[0].action).toBe('army_hq_personnel');
        expect(officerItems[0].title).toBe('Commander Replacement');
        expect(officerItems[0].subtitle).toContain('Sefer Halilovic');
    });

    it('uses generic title for non-replacement officer events', () => {
        const state = makeStub({
            player_faction: 'RS',
            pendingOfficerEvents: [
                {
                    event_id: 'off_2',
                    type: 'officer_available',
                    faction: 'RS',
                    turn: 3,
                    officer_id: 'mladic',
                    officer_name: 'Ratko Mladic',
                    officer_competence: 0.9,
                    officer_aggressiveness: 0.9,
                    officer_defensive_skill: 0.7,
                    acknowledged: false,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const officerItems = items.filter(i => i.type === 'officer_event');
        expect(officerItems[0].title).toBe('Personnel Matter');
    });
});

// ---------------------------------------------------------------------------
// 5. Autonomy proposals
// ---------------------------------------------------------------------------
describe('deriveInboxItems — autonomy proposals', () => {
    it('produces autonomy_proposal items from pendingProposalReviews', () => {
        const state = makeStub({
            pendingProposalReviews: [
                { id: 'PROP_5_ops_0', turn: 5, faction: 'RBiH', domain: 'ops', description: 'Launch operation Corridor' },
                { id: 'PROP_5_ops_1', turn: 5, faction: 'RBiH', domain: 'ops', description: 'Reinforce 1st Corps sector' },
            ],
        });
        const items = deriveInboxItems(state, null);
        const proposalItems = items.filter(i => i.type === 'autonomy_proposal');
        expect(proposalItems).toHaveLength(2);
        expect(proposalItems[0].id).toBe('proposal:PROP_5_ops_0');
        expect(proposalItems[0].severity).toBe('normal');
        expect(proposalItems[0].action).toBe('autonomy_panel');
        expect(proposalItems[0].title).toBe('Command Proposal');
        expect(proposalItems[0].subtitle).toBe('Launch operation Corridor');
        expect(proposalItems[1].id).toBe('proposal:PROP_5_ops_1');
    });

    it('routes OPPORTUNITY proposals to the presidential Decision Room', () => {
        const state = makeStub({
            pendingProposalReviews: [
                {
                    id: 'PROP_176_opportunity_0',
                    turn: 176,
                    faction: 'RBiH',
                    domain: 'ops',
                    description: 'Operation Sana - staff recommendation: approve',
                    proposed_action: 'OPPORTUNITY:OPP_175_sana_95',
                    current_value: 'pending_review',
                    proposed_value: 'approve',
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const opportunityItems = items.filter(i => i.type === 'operation_opportunity');
        expect(opportunityItems).toHaveLength(1);
        expect(opportunityItems[0].id).toBe('opportunity:PROP_176_opportunity_0');
        expect(opportunityItems[0].severity).toBe('normal');
        expect(opportunityItems[0].action).toBe('decision_room');
        expect(opportunityItems[0].title).toBe('Operation Sana');
        expect(opportunityItems[0].subtitle).toBe('Staff recommends authorization.');
        expect(opportunityItems[0].subtitle).not.toContain('approve');
        expect(items.filter(i => i.type === 'autonomy_proposal')).toHaveLength(0);
    });

    it('does not produce items when pendingProposalReviews is undefined', () => {
        const state = makeStub();
        const items = deriveInboxItems(state, null);
        const proposalItems = items.filter(i => i.type === 'autonomy_proposal');
        expect(proposalItems).toHaveLength(0);
    });

    it('does not produce items when pendingProposalReviews is empty', () => {
        const state = makeStub({ pendingProposalReviews: [] });
        const items = deriveInboxItems(state, null);
        const proposalItems = items.filter(i => i.type === 'autonomy_proposal');
        expect(proposalItems).toHaveLength(0);
    });

    it('uses fallback subtitle when description is empty', () => {
        const state = makeStub({
            player_faction: 'RS',
            pendingProposalReviews: [
                { id: 'PROP_3_military_0', turn: 3, faction: 'RS', domain: 'military', description: '' },
            ],
        });
        const items = deriveInboxItems(state, null);
        const proposalItems = items.filter(i => i.type === 'autonomy_proposal');
        expect(proposalItems).toHaveLength(1);
        expect(proposalItems[0].subtitle).toBe('military proposal requires your review.');
    });

    it('autonomy proposals sort between peace plan and reserve requests', () => {
        const state = makeStub({
            pendingPeacePlan: {
                planId: 'vance', planName: 'Vance Plan', narrative: '', turnOffered: 5,
                proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 }, institutionalModel: 'cantons', botResponses: {},
            },
            pendingProposalReviews: [
                { id: 'PROP_5_ops_0', turn: 5, faction: 'RBiH', domain: 'ops', description: 'Test' },
            ],
            pendingReserveRequests: [
                {
                    request_id: 'req_1', corps_id: 'test_corps', faction: 'RBiH', reason: 'test',
                    priority: 1, severityBand: 'routine' as const, travel_hops: 1, description: 'test',
                    suggested_brigade_id: null, turn_requested: 5,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const types = items.map(i => i.type);
        const peaceIdx = types.indexOf('peace_plan');
        const proposalIdx = types.indexOf('autonomy_proposal');
        const reserveIdx = types.indexOf('reserve_request');
        expect(peaceIdx).toBeLessThan(proposalIdx);
        expect(proposalIdx).toBeLessThan(reserveIdx);
    });
});

// ---------------------------------------------------------------------------
// 6. Opening brief conditions
// ---------------------------------------------------------------------------
describe('deriveInboxItems — opening brief conditions', () => {
    it('always includes a date situation marker', () => {
        const state = makeStub({ turn: 10 });
        const items = deriveInboxItems(state, null);
        const dateItems = items.filter(i => i.id.startsWith('sit:date:'));
        expect(dateItems).toHaveLength(1);
        expect(dateItems[0].type).toBe('situation');
        expect(dateItems[0].action).toBe('decision_room');
    });

    it('returns empty array for null state', () => {
        const items = deriveInboxItems(null, null);
        expect(items).toEqual([]);
    });

    it('player_faction field drives territory gain/loss filtering', () => {
        const state = makeStub({
            turn: 5,
            player_faction: 'RBiH',
            recentControlEvents: [
                { turn: 5, settlementId: 'op:bihac:bihac_2', from: 'RBiH', to: 'RS', mechanism: 'attack', municipalityId: 'bihac' },
                { turn: 5, settlementId: 'op:tuzla:tuzla_2', from: 'RS', to: 'RBiH', mechanism: 'attack', municipalityId: 'tuzla' },
            ],
        });
        const items = deriveInboxItems(state, null);
        const losses = items.filter(i => i.id.startsWith('sit:territory_loss'));
        const gains = items.filter(i => i.id.startsWith('sit:territory_gain'));
        expect(losses).toHaveLength(1);
        expect(gains).toHaveLength(1);
        expect(losses[0].action).toBe('decision_room');
        expect(gains[0].action).toBe('decision_room');
    });

    it('does not report startup control painting as turn-zero territory gained or lost', () => {
        const state = makeStub({
            turn: 0,
            player_faction: 'RBiH',
            recentControlEvents: [
                { turn: 0, settlementId: 'op:bihac:bihac_2', from: 'RBiH', to: 'RS', mechanism: 'initial_control', municipalityId: 'bihac' },
                { turn: 0, settlementId: 'op:tuzla:tuzla_2', from: 'RS', to: 'RBiH', mechanism: 'initial_control', municipalityId: 'tuzla' },
            ],
        });

        const items = deriveInboxItems(state, null);

        expect(items.some(i => i.id.startsWith('sit:territory_loss'))).toBe(false);
        expect(items.some(i => i.id.startsWith('sit:territory_gain'))).toBe(false);
        expect(items.filter(i => i.id === 'sit:date:0')).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// 7. Priority ordering
// ---------------------------------------------------------------------------
describe('deriveInboxItems — priority ordering', () => {
    it('sorts items by priority (blocking event first, then peace plan, then reserve, then situation)', () => {
        const state = makeStub({
            pendingEventDecisions: [
                { event_id: 'evt_1', event_title: 'Crisis', turn_fired: 5, faction: 'RBiH', response_options: [{ id: 'a', label: 'A', effects: [] }] },
            ],
            pendingPeacePlan: {
                planId: 'vance', planName: 'Vance Plan', narrative: '', turnOffered: 5,
                proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 }, institutionalModel: 'cantons', botResponses: {},
            },
            pendingReserveRequests: [
                {
                    request_id: 'req_1', corps_id: 'test_corps', faction: 'RBiH', reason: 'test',
                    priority: 1, severityBand: 'routine' as const, travel_hops: 1, description: 'test',
                    suggested_brigade_id: null, turn_requested: 5,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const types = items.map(i => i.type);
        const eventIdx = types.indexOf('event_decision');
        const peaceIdx = types.indexOf('peace_plan');
        const reserveIdx = types.indexOf('reserve_request');
        const situationIdx = types.indexOf('situation');
        expect(eventIdx).toBeLessThan(peaceIdx);
        expect(peaceIdx).toBeLessThan(reserveIdx);
        expect(reserveIdx).toBeLessThan(situationIdx);
    });
});

// ---------------------------------------------------------------------------
// 8. countActionableItems and hasBlockingItems
// ---------------------------------------------------------------------------
describe('countActionableItems / hasBlockingItems', () => {
    it('countActionableItems excludes situation items', () => {
        const state = makeStub({
            pendingReserveRequests: [
                {
                    request_id: 'req_1', corps_id: 'test', faction: 'RBiH', reason: 'x',
                    priority: 1, severityBand: 'routine' as const, travel_hops: 1, description: 'x',
                    suggested_brigade_id: null, turn_requested: 5,
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        // Should have 1 reserve + 1 date situation = 2 total, 1 actionable
        expect(countActionableItems(items)).toBe(1);
    });

    it('hasBlockingItems returns false when no blocking items', () => {
        const state = makeStub();
        const items = deriveInboxItems(state, null);
        expect(hasBlockingItems(items)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 9. resolveEventQueueIndex — direct behavioral proof of identity routing
// ---------------------------------------------------------------------------
describe('resolveEventQueueIndex — inbox click → queue index resolution', () => {
    const queue = [
        { id: 'evt_alpha' },
        { id: 'evt_beta' },
        { id: 'evt_gamma' },
    ];

    it('clicking event:evt_beta resolves to queue index 1, not 0', () => {
        expect(resolveEventQueueIndex('event:evt_beta', queue)).toBe(1);
    });

    it('clicking event:evt_gamma resolves to queue index 2', () => {
        expect(resolveEventQueueIndex('event:evt_gamma', queue)).toBe(2);
    });

    it('clicking event:evt_alpha resolves to queue index 0', () => {
        expect(resolveEventQueueIndex('event:evt_alpha', queue)).toBe(0);
    });

    it('malformed itemId (no event: prefix) falls back to 0', () => {
        expect(resolveEventQueueIndex('garbage', queue)).toBe(0);
        expect(resolveEventQueueIndex('peace:vance_owen', queue)).toBe(0);
        expect(resolveEventQueueIndex('reserve:req_1', queue)).toBe(0);
    });

    it('event: prefix with non-existent event_id falls back to 0', () => {
        expect(resolveEventQueueIndex('event:nonexistent', queue)).toBe(0);
    });

    it('empty queue falls back to 0', () => {
        expect(resolveEventQueueIndex('event:evt_alpha', [])).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 10. Save-load dismissal reset contract (Lane 1)
// ---------------------------------------------------------------------------
describe('deriveInboxItems — save-load dismissal reset contract', () => {
    it('peace plan item is derivable from fresh state (dismissal is UI-side, not derivation-side)', () => {
        // Contract: deriveInboxItems always produces a peace plan item when
        // pendingPeacePlan is present. The dismissal flag is React state in App.tsx
        // and is reset by a useEffect watching lastLoadedStateFingerprint.
        // This test verifies the derivation side: the item is always produced.
        const state = makeStub({
            pendingPeacePlan: {
                planId: 'vance', planName: 'Vance Plan', narrative: '', turnOffered: 5,
                proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 }, institutionalModel: 'cantons', botResponses: {},
            },
        });
        const items1 = deriveInboxItems(state, null);
        expect(items1.filter(i => i.type === 'peace_plan')).toHaveLength(1);

        // Derive again from same state — still produces the item (no internal dismissal memory)
        const items2 = deriveInboxItems(state, null);
        expect(items2.filter(i => i.type === 'peace_plan')).toHaveLength(1);
    });

    it('event decisions are derivable from fresh state (acknowledgement is UI-side)', () => {
        const state = makeStub({
            pendingEventDecisions: [
                { event_id: 'evt_1', event_title: 'Crisis', turn_fired: 5, faction: 'RBiH', response_options: [{ id: 'a', label: 'A', effects: [] }] },
            ],
        });
        const items1 = deriveInboxItems(state, null);
        expect(items1.filter(i => i.type === 'event_decision')).toHaveLength(1);

        const items2 = deriveInboxItems(state, null);
        expect(items2.filter(i => i.type === 'event_decision')).toHaveLength(1);
    });
});
