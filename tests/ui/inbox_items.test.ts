/**
 * Focused tests for deriveInboxItems — presidential inbox item derivation.
 *
 * Covers:
 *  - Required event decisions produce blocking inbox items
 *  - Peace plans produce urgent inbox items with correct planName
 *  - Reserve requests produce army_reserve action items
 *  - Officer events produce army_hq_personnel action items
 *  - Autonomy proposals produce Decision Room action items from pendingProposalReviews
 *  - Operation opportunities route to Decision Room dossiers, not dangling proposal reviews
 *  - Opening brief appears when openingBriefDismissed is false and player_faction is set
 *  - Empty state returns only date marker
 */

import { describe, it, expect, afterEach } from 'vitest';
import { deriveInboxItems, countActionableItems, effectiveInboxSeverity, hasBlockingItems, resolveEventQueueIndex } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import war1992Events from '../../data/scenarios/events/war_1992.json';

afterEach(() => {
    setLocale('en');
});

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

function makeOpportunityDossier(
    proposalId: string,
    reviewId: string,
): NonNullable<LoadedGameState['operationOpportunityProposals']>[number] {
    return {
        proposal_id: proposalId,
        opportunity_id: proposalId.toLowerCase(),
        display_name: 'Operation Opportunity',
        faction: 'RBiH',
        status: 'eligible_pending_review',
        review_id: reviewId,
        prerequisite_axes: [],
        force_quality_traits: [],
        objectives: [],
        staging: [],
        redirect_variants: [],
        available_actions: [],
    };
}

describe('deriveInboxItems — paramilitary requests', () => {
    it('projects exact marginal standing impact from prior deployments and civilian casualties', () => {
        const state = makeStub({
            player_faction: 'RS',
            paramilitaryPolicy: 'ask',
            pendingParamilitaryRequests: [{
                faction: 'RS',
                strength: 150,
                target_osid: 'op:zvornik:zvornik_2',
                estimated_civilian_risk: 250,
            }],
            rawGameState: {
                paramilitary_deployment_count: { RS: 3 },
            } as unknown as LoadedGameState['rawGameState'],
        });

        const item = deriveInboxItems(state, { 'op:zvornik:zvornik_2': 'Zvornik' })
            .find((entry) => entry.type === 'paramilitary_request');

        expect(item?.subtitle).toContain('250 projected civilian casualties');
        expect(item?.subtitle).toContain('+1 war crimes event');
        expect(item?.subtitle).toContain('-10.05 international standing');
        expect(item?.subtitle).toContain('Population source: 1991 census map data');
        expect(item?.subtitle).toContain('Balkan Battlegrounds, Vol. I');
        expect(item?.subtitle).toContain('fixed 5,000-person target baseline');
        expect(item?.subtitle).toContain('not a claim that this exact outcome occurred here');
        expect(item?.subtitle).not.toMatch(/utility|risk[- ]reward/i);
    });
});

describe('deriveInboxItems — historically grounded staff contact', () => {
    it('surfaces the RBiH corps reorganization at turn 24 as review, not an invented choice', () => {
        const state = makeStub({
            turn: 24,
            player_faction: 'RBiH',
            formations: [
                { id: 'arbih_general_staff', name: 'General Staff ARBiH', faction: 'RBiH', kind: 'army_hq', createdTurn: 24 },
                { id: 'arbih_1st_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps', createdTurn: 24 },
                { id: 'arbih_2nd_corps', name: '2nd Corps', faction: 'RBiH', kind: 'corps', createdTurn: 24 },
            ] as LoadedGameState['formations'],
        });

        const items = deriveInboxItems(state, null);
        const briefing = items.find((item) => item.id === 'sit:rbih-corps-reorganization:24');

        expect(briefing).toMatchObject({
            type: 'situation',
            severity: 'info',
            action: 'army_hq_briefing',
            title: 'ARBiH Corps Reorganization',
            actionLabel: 'Review staff recommendation',
            includeInDeskPacket: true,
        });
        expect(briefing?.subtitle).toContain('September–December 1992');
        expect(briefing?.subtitle).toContain('unified, multi-ethnic Army command');
        expect(briefing?.subtitle).toContain('Hold present policy');
        expect(briefing?.subtitle).toContain('Authority in reserve');
        expect(briefing?.subtitle).toContain('No presidential signature is required');
        expect(countActionableItems(items)).toBe(0);
    });

    it('does not fabricate the corps-reorganization briefing outside its authored week', () => {
        const state = makeStub({
            turn: 25,
            player_faction: 'RBiH',
            formations: [
                { id: 'arbih_1st_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps', createdTurn: 24 },
            ] as LoadedGameState['formations'],
        });

        expect(deriveInboxItems(state, null)
            .some((item) => item.id.startsWith('sit:rbih-corps-reorganization:'))).toBe(false);
    });
});

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
                    requires_player_response: true,
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
        expect(eventItems[0].subtitle).toContain('requires your response');
        expect(hasBlockingItems(items)).toBe(true);
    });

    it('routes advisory event decisions to their response modal without making them blocking', () => {
        const state = makeStub({
            pendingEventDecisions: [
                {
                    event_id: 'evt_advisory',
                    event_title: 'Staff Advisory',
                    turn_fired: 5,
                    faction: 'RBiH',
                    requires_player_response: false,
                    response_options: [],
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const eventItems = items.filter(i => i.type === 'event_decision');

        expect(eventItems).toHaveLength(1);
        expect(eventItems[0]).toMatchObject({
            id: 'event:evt_advisory',
            severity: 'normal',
            action: 'event_modal',
            title: 'Staff Advisory',
        });
        expect(eventItems[0].subtitle).toContain('available for review');
        expect(eventItems[0].subtitle).not.toContain('requires your response');
        expect(hasBlockingItems(items)).toBe(false);
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

    it('localizes turn-zero pending foundational decision fallback copy in BCS mode', () => {
        setLocale('bcs');
        const state = makeStub({
            turn: 0,
            pendingEventDecisions: [
                {
                    event_id: 'evt_opening_foundation',
                    event_title: undefined as unknown as string,
                    turn_fired: 0,
                    faction: 'RBiH',
                    response_options: [
                        { id: 'opt_a', label: 'Accept', effects: [] },
                    ],
                },
            ],
            pendingPeacePlan: {
                planId: 'opening_peace',
                planName: undefined as unknown as string,
                narrative: 'A plan.',
                turnOffered: 0,
                proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 },
                institutionalModel: 'unknown',
                botResponses: {},
            },
        });

        const copy = deriveInboxItems(state, null)
            .filter((item) => item.type === 'event_decision' || item.type === 'peace_plan')
            .map((item) => `${item.title} ${item.subtitle}`)
            .join(' ');

        expect(copy).toContain('6 apr 1992');
        expect(copy).not.toMatch(/Decision Required|A presidential decision requires|Peace Proposal|Peace proposal/);
    });

    it('uses catalog-localized BCS title for first-hour event decision packets', () => {
        setLocale('bcs');
        const firstHourCatalog = new Map<string, EventDefinition>(
            (war1992Events as EventDefinition[])
                .filter((eventDef) => eventDef.id === 'rbih_state_identity')
                .map((eventDef) => [eventDef.id, eventDef]),
        );
        const state = makeStub({
            turn: 0,
            pendingEventDecisions: [
                {
                    event_id: 'rbih_state_identity',
                    event_title: 'What Is Bosnia?',
                    turn_fired: 0,
                    faction: 'RBiH',
                    response_options: [
                        { id: 'civic', label: 'Civic multi-ethnic republic', effects: [] },
                    ],
                },
            ],
        });

        const eventItem = deriveInboxItems(state, null, firstHourCatalog).find(i => i.type === 'event_decision');

        expect(eventItem?.title).toBe('Sta je Bosna?');
        expect(eventItem?.title).not.toBe('What Is Bosnia?');
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
        expect(itemIds).toContain('command:review-proposal:PROP_rs');
        expect(itemIds).toContain('reserve:reserve_rs');
        expect(itemIds).toContain('officer:officer_available:rs_officer');
        expect(itemIds).not.toContain('event:evt_rbih');
        expect(itemIds).not.toContain('command:review-proposal:PROP_rbih');
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

    it('does not duplicate Owen-Stoltenberg when its canonical Presidency event is pending', () => {
        const state = makeStub({
            turn: 70,
            pendingPeacePlan: {
                planId: 'owen_stoltenberg',
                planName: 'Owen-Stoltenberg Plan',
                narrative: 'A tripartite framework.',
                turnOffered: 70,
                proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
                institutionalModel: 'union_3_republics',
                botResponses: { RS: 'accepted', HRHB: 'accepted' },
            },
            pendingEventDecisions: [{
                event_id: 'owen_stoltenberg_plan_1993',
                event_title: 'Owen-Stoltenberg Presidency Review',
                turn_fired: 70,
                faction: 'RBiH',
                response_options: [{ id: 'accept', label: 'Conditionally accept', effects: [] }],
            }],
        });

        const items = deriveInboxItems(state, null);

        expect(items.filter((item) => item.id === 'event:owen_stoltenberg_plan_1993')).toHaveLength(1);
        expect(items.filter((item) => item.id === 'peace:owen_stoltenberg')).toHaveLength(0);
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
                    route_faction: 'RBiH',
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

    it('does not surface foreign-route convoy decisions to the player inbox', () => {
        const state = makeStub({
            player_faction: 'RBiH',
            pendingConvoyDecisions: [
                {
                    id: 'convoy_foreign',
                    target_enclave: 'Gorazde',
                    route_faction: 'RS',
                    supply_amount: 25,
                },
                {
                    id: 'convoy_player',
                    target_enclave: 'Bihac',
                    route_faction: 'RBiH',
                    supply_amount: 15,
                },
            ],
        });

        const convoyItems = deriveInboxItems(state, null).filter(i => i.type === 'convoy_decision');

        expect(convoyItems.map((item) => item.id)).toEqual(['convoy:convoy_player']);
    });

    it('does not surface already answered convoy decisions as pending blockers', () => {
        const state = makeStub({
            player_faction: 'RBiH',
            pendingConvoyDecisions: [
                {
                    id: 'convoy_answered',
                    target_enclave: 'Gorazde',
                    route_faction: 'RBiH',
                    supply_amount: 25,
                    decision: 'allow',
                },
            ],
        });

        const items = deriveInboxItems(state, null);

        expect(items.filter(i => i.type === 'convoy_decision')).toHaveLength(0);
        expect(hasBlockingItems(items)).toBe(false);
    });

    it('localizes generated decision and situation inbox items in BCS mode', () => {
        setLocale('bcs');
        const state = makeStub({
            pendingDayton: {
                territorialPackages: [],
                institutionalPackages: [],
                factionCapital: { RBiH: 50, RS: 50, HRHB: 50 },
                patronOverride: { RBiH: 0, RS: 0, HRHB: 0 },
            },
            pendingConvoyDecisions: [
                {
                    id: 'convoy_1',
                    target_enclave: 'Gorazde',
                    route_faction: 'RBiH',
                    supply_amount: 25,
                },
            ],
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
            recentControlEvents: [
                { turn: 5, settlementId: 'op:lost:town', from: 'RBiH', to: 'RS', mechanism: 'combat', municipalityId: 'lost' },
                { turn: 5, settlementId: 'op:gained:town', from: 'RS', to: 'RBiH', mechanism: 'combat', municipalityId: 'gained' },
            ],
        });

        const copy = deriveInboxItems(state, {
            'op:lost:town': 'Lost Town',
            'op:gained:town': 'Gained Town',
        })
            .map((item) => `${item.title} ${item.subtitle}`)
            .join('\n');

        expect(copy).toContain('Daytonsko pregovaranje');
        expect(copy).toContain('Humanitarni konvoj');
        expect(copy).toContain('Zahtjev za rezervom');
        expect(copy).toContain('Izgubljena teritorija');
        expect(copy).toContain('Osvojena teritorija');
        expect(copy).toContain('Situacija na dan');
        expect(copy).not.toMatch(/Dayton Negotiation|A final peace framework|Humanitarian Convoy|allow, block, or divert|Reserve Request|requests reinforcement|defensive|Territory Lost|Territory Gained|Enemy forces captured|Your forces secured|Situation as of/);
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
        expect(reserveItems[0].subtitle).toContain('Defensive');
    });

    it('summarizes the concrete reserve commitment instead of echoing the thin request description', () => {
        const state = makeStub({
            formations: [
                { id: 'first_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps' },
                { id: 'third_corps', name: '3rd Corps', faction: 'RBiH', kind: 'corps' },
                {
                    id: 'guards', name: 'Guards Brigade', faction: 'RBiH', kind: 'brigade',
                    readiness: 'ready', corps_id: 'first_corps', location_osid: 'op:visoko:visoko_2',
                },
            ] as LoadedGameState['formations'],
            pendingReserveRequests: [{
                request_id: 'req_reserve_truth',
                corps_id: 'third_corps',
                faction: 'RBiH',
                reason: 'defensive_gap',
                purpose: 'defensive',
                priority: 80,
                severityBand: 'critical',
                travel_hops: 3,
                description: 'thin raw description',
                suggested_brigade_id: 'guards',
                turn_requested: 5,
            }],
        });

        const item = deriveInboxItems(state, { 'op:visoko:visoko_2': 'Visoko' })
            .find((entry) => entry.id === 'reserve:req_reserve_truth');

        expect(item?.subtitle).toContain('Immediate Army Need');
        expect(item?.subtitle).toContain('Guards Brigade');
        expect(item?.subtitle).toContain('1st Corps');
        expect(item?.subtitle).toContain('3rd Corps');
        expect(item?.subtitle).toContain('about 2 weeks travel');
        expect(item?.subtitle).toContain('Visoko');
        expect(item?.subtitle).not.toContain('thin raw description');
        expect(item?.subtitle).not.toMatch(/first_corps|third_corps|op:visoko/);
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

    it('describes an officer arrival as a non-appointing availability notice', () => {
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
        expect(officerItems[0].title).toBe('Officer Availability Notice');
        expect(officerItems[0].subtitle).toContain('does not appoint');
    });

    it('routes command interpretation officer events to Decision Room command review', () => {
        const state = makeStub({
            player_faction: 'RBiH',
            pendingOfficerEvents: [
                {
                    event_id: 'off_command_1',
                    type: 'order_refused',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'halilovic',
                    officer_name: 'Sefer Halilovic',
                    officer_competence: 0.6,
                    officer_aggressiveness: 0.7,
                    officer_defensive_skill: 0.5,
                    acknowledged: false,
                    reason: 'Refuses the directive as infeasible.',
                },
            ],
        });

        const items = deriveInboxItems(state, null);
        const officerItems = items.filter(i => i.type === 'officer_event');

        expect(officerItems).toHaveLength(1);
        expect(officerItems[0]).toMatchObject({
            action: 'decision_room',
            title: 'Command Interpretation',
        });
    });

    it('routes autonomous Army CO operation proposals to Decision Room command review', () => {
        const state = makeStub({
            player_faction: 'RBiH',
            pendingOfficerEvents: [
                {
                    event_id: 'off_command_proposal_1',
                    type: 'army_co_proposes_op',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'halilovic',
                    officer_name: 'Sefer Halilovic',
                    officer_competence: 0.6,
                    officer_aggressiveness: 0.7,
                    officer_defensive_skill: 0.5,
                    acknowledged: false,
                    reason: 'Army command proposes an autonomous operation before the next directive.',
                },
            ],
        });

        const items = deriveInboxItems(state, null);
        const officerItems = items.filter(i => i.type === 'officer_event');

        expect(officerItems).toHaveLength(1);
        expect(officerItems[0]).toMatchObject({
            action: 'decision_room',
            title: 'Autonomous Operation Proposal',
        });
    });

    it('localizes officer event titles and subtitles in BCS mode', () => {
        setLocale('bcs');
        const state = makeStub({
            player_faction: 'RBiH',
            pendingOfficerEvents: [
                {
                    event_id: 'off_command_1',
                    type: 'order_refused',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'halilovic',
                    officer_name: 'Sefer Halilovic',
                    officer_competence: 0.6,
                    officer_aggressiveness: 0.7,
                    officer_defensive_skill: 0.5,
                    acknowledged: false,
                },
                {
                    event_id: 'off_replacement_1',
                    type: 'replacement_suggested',
                    faction: 'RBiH',
                    turn: 5,
                    officer_id: 'divjak',
                    officer_name: 'Jovan Divjak',
                    officer_competence: 0.6,
                    officer_aggressiveness: 0.7,
                    officer_defensive_skill: 0.5,
                    acknowledged: false,
                },
            ],
        });

        const copy = deriveInboxItems(state, null)
            .filter(i => i.type === 'officer_event')
            .map(i => `${i.title} ${i.subtitle}`)
            .join(' ');

        expect(copy).toContain('Tumačenje komande');
        expect(copy).toContain('Zamjena komandanta');
        expect(copy).toContain('U vezi sa Sefer Halilovic.');
        expect(copy).not.toMatch(/Command Interpretation|Commander Replacement|Regarding|Personnel Matter/);
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
        expect(proposalItems[0].id).toBe('command:review-proposal:PROP_5_ops_0');
        expect(proposalItems[0].severity).toBe('normal');
        expect(proposalItems[0].action).toBe('decision_room');
        expect(proposalItems[0].title).toBe('Command Proposal');
        expect(proposalItems[0].subtitle).toBe('Launch operation Corridor');
        expect(proposalItems[1].id).toBe('command:review-proposal:PROP_5_ops_1');
    });

    it('uses the ready-plan read-model summary for an ordinary operation approval', () => {
        const state = makeStub({
            pendingProposalReviews: [{
                id: 'PROP_30_ops_0',
                turn: 30,
                faction: 'RBiH',
                domain: 'ops',
                description: 'Zone: zone:donji_vakuf. Plan: plan_internal_30',
                proposed_action: 'APPROVE_OP:arbih_1st_corps:plan_internal_30',
            }],
            opProposalCards: [{
                proposal_id: 'PROP_30_ops_0',
                corps_id: 'arbih_1st_corps',
                corps_name: '1st Corps',
                plan_id: 'plan_internal_30',
                op_id: null,
                op_name: 'Relieve Jajce',
                commander: null,
                objective: 'Relieve Jajce',
                targets: ['Jajce'],
                forces: ['Alpha Brigade', 'Beta Brigade'],
                concentration_readiness: '100% concentrated; ready',
                intel_assessment: 'Unreported',
                supply_assessment: 'Unreported',
                risk_assessment: 'Moderate pressure; 70% plan viability',
                recommendation: 'Authorize launch',
                decision_deadline: 'Before the next turn advances',
                force_ratio: 'Unreported',
                opportunity_cost: 'Unreported',
                summary: '1st Corps requests authorization to relieve Jajce with Alpha Brigade and Beta Brigade; decision due before the next turn advances.',
                force_ratio_estimate: null,
                commander_assessment: null,
                donors: [],
                total_personnel_lent: 0,
                override_available: false,
                override_ca_cost: 15,
                framing: 'The field commander requests authorization.',
            }],
        });

        const item = deriveInboxItems(state, null)
            .find((entry) => entry.id === 'command:review-proposal:PROP_30_ops_0');

        expect(item?.subtitle).toBe('1st Corps requests authorization to relieve Jajce with Alpha Brigade and Beta Brigade; decision due before the next turn advances.');
        expect(item?.subtitle).not.toMatch(/arbih_1st_corps|plan_internal_30|zone:donji/);
    });

    it('uses neutral copy when a sparse proposal description contains raw engine tokens', () => {
        const state = makeStub({
            pendingProposalReviews: [{
                id: 'PROP_31_ops_0', turn: 31, faction: 'RBiH', domain: 'ops',
                description: 'Zone: zone:donji_vakuf. Plan: plan_internal_31 for arbih_1st_corps.',
                proposed_action: 'APPROVE_OP:arbih_1st_corps:plan_internal_31',
            }],
        });

        const item = deriveInboxItems(state, null)
            .find((entry) => entry.id === 'command:review-proposal:PROP_31_ops_0');

        expect(item?.subtitle).toBe('operations proposal requires your review.');
        expect(item?.subtitle).not.toMatch(/zone:|plan_internal|arbih_1st_corps/);
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
            operationOpportunityProposals: [
                {
                    proposal_id: 'OPP_175_sana_95',
                    opportunity_id: 'sana_95',
                    display_name: 'Operation Sana',
                    faction: 'RBiH',
                    status: 'eligible_pending_review',
                    review_id: 'PROP_176_opportunity_0',
                    description: 'Operation Sana - staff recommendation: approve',
                    recommendation: 'approve',
                    proposed_action: 'OPPORTUNITY:OPP_175_sana_95',
                    required_axes_green: 1,
                    required_axes_total: 1,
                    optional_axes_green: 0,
                    optional_axes_total: 0,
                    prerequisite_axes: [],
                    force_quality_traits: [],
                    objectives: [],
                    staging: [],
                    redirect_variants: [],
                    available_actions: [],
                },
            ],
        });
        const items = deriveInboxItems(state, null);
        const opportunityItems = items.filter(i => i.type === 'operation_opportunity');
        expect(opportunityItems).toHaveLength(1);
        expect(opportunityItems[0].id).toBe('opportunity:OPP_175_sana_95');
        expect(opportunityItems[0].severity).toBe('normal');
        expect(opportunityItems[0].action).toBe('decision_room');
        expect(opportunityItems[0].title).toBe('Operation Sana');
        expect(opportunityItems[0].subtitle).toBe('Staff recommends authorization.');
        expect(opportunityItems[0].subtitle).not.toContain('approve');
        expect(items.filter(i => i.type === 'autonomy_proposal')).toHaveLength(0);
    });

    it('shows historical operation authorizations as operation-specific review items', () => {
        const state = makeStub({
            pendingProposalReviews: [
                {
                    id: 'PROP_10_historical_op_triggered_vrs_1st_krajina_operation_kotor_varos',
                    turn: 10,
                    faction: 'RS',
                    domain: 'ops',
                    description: 'Operation Kotor Varos - staff requests authorization to proceed.',
                    proposed_action: 'HISTORICAL_OP:triggered:vrs_1st_krajina:Operation Kotor Varos',
                    current_value: 'awaiting_authorization',
                    proposed_value: 'authorize',
                },
            ],
            player_faction: 'RS',
        });

        const items = deriveInboxItems(state, null);
        const proposal = items.find(i => i.id.startsWith('command:review-proposal:'))!;

        expect(proposal.type).toBe('autonomy_proposal');
        expect(proposal.title).toBe('Operation Kotor Varos');
        expect(proposal.severity).toBe('blocking');
        expect(proposal.subtitle).toBe('Presidential signature required before advance.');
        expect(proposal.action).toBe('decision_room');
        expect(hasBlockingItems(items)).toBe(true);
    });

    it('groups multiple historical operation authorizations into one inbox packet', () => {
        const state = makeStub({
            player_faction: 'RS',
            pendingProposalReviews: [
                {
                    id: 'PROP_0_op_prijedor',
                    turn: 0,
                    faction: 'RS',
                    domain: 'ops',
                    description: 'Authorize Operation Prijedor.',
                    proposed_action: 'HISTORICAL_OP:preplanned:vrs_1st_krajina:Operation Prijedor',
                },
                {
                    id: 'PROP_0_op_drina',
                    turn: 0,
                    faction: 'RS',
                    domain: 'ops',
                    description: 'Authorize Operation Drina.',
                    proposed_action: 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina',
                },
                {
                    id: 'PROP_0_op_resolved',
                    turn: 0,
                    faction: 'RS',
                    domain: 'ops',
                    description: 'Already accepted.',
                    proposed_action: 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Visegrad',
                    accepted: true,
                    resolved_turn: 0,
                } as NonNullable<LoadedGameState['pendingProposalReviews']>[number],
            ],
        });

        const proposalItems = deriveInboxItems(state, null).filter(i => i.type === 'autonomy_proposal');

        expect(proposalItems).toHaveLength(1);
        expect(proposalItems[0]).toMatchObject({
            id: 'command:review-proposal:historical-ops',
            title: 'Operation authorizations',
            subtitle: '2 operation plans require presidential signatures before advance.',
            severity: 'blocking',
            updateCount: 2,
            sourceIds: ['PROP_0_op_drina', 'PROP_0_op_prijedor'],
            action: 'decision_room',
        });
    });

    it('does not surface resolved proposal-history rows as active inbox items', () => {
        const state = makeStub({
            player_faction: 'RS',
            pendingProposalReviews: [
                {
                    id: 'PROP_resolved',
                    turn: 0,
                    faction: 'RS',
                    domain: 'ops',
                    description: 'Already accepted.',
                    proposed_action: 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina',
                    accepted: true,
                    resolved_turn: 0,
                } as NonNullable<LoadedGameState['pendingProposalReviews']>[number],
            ],
        });

        const proposalItems = deriveInboxItems(state, null).filter(i => i.type === 'autonomy_proposal');

        expect(proposalItems).toHaveLength(0);
    });

    it('suppresses operation-opportunity inbox rows when no Decision Room dossier exists', () => {
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
            operationOpportunityProposals: [],
        });

        const items = deriveInboxItems(state, null);

        expect(items.filter(i => i.type === 'operation_opportunity')).toHaveLength(0);
        expect(items.filter(i => i.type === 'autonomy_proposal')).toHaveLength(0);
    });

    it('localizes operation-opportunity recommendation and autonomy fallback copy in BCS mode', () => {
        setLocale('bcs');
        const state = makeStub({
            player_faction: 'RBiH',
            pendingProposalReviews: [
                {
                    id: 'PROP_176_opportunity_0',
                    turn: 176,
                    faction: 'RBiH',
                    domain: 'ops',
                    description: '',
                    proposed_action: 'OPPORTUNITY:OPP_175_sana_95',
                    current_value: 'pending_review',
                    proposed_value: 'approve',
                },
                { id: 'PROP_5_military_0', turn: 5, faction: 'RBiH', domain: 'military', description: '' },
            ],
            operationOpportunityProposals: [
                makeOpportunityDossier('OPP_175_sana_95', 'PROP_176_opportunity_0'),
            ],
        });
        const items = deriveInboxItems(state, null);
        const opportunity = items.find(i => i.type === 'operation_opportunity')!;
        const proposal = items.find(i => i.type === 'autonomy_proposal')!;

        expect(opportunity.title).toBe('Operativna prilika');
        expect(opportunity.subtitle).toBe('Stab preporucuje odobrenje.');
        expect(proposal.title).toBe('Komandni prijedlog');
        expect(proposal.subtitle).toBe('Vojni prijedlog trazi pregled.');
        expect(`${opportunity.title} ${opportunity.subtitle} ${proposal.title} ${proposal.subtitle}`)
            .not.toMatch(/Operation Opportunity|Staff recommends|authorization|Command Proposal|proposal requires your review/i);
    });

    it('does not echo non-localized generated proposal descriptions in BCS mode', () => {
        setLocale('bcs');
        const state = makeStub({
            player_faction: 'RBiH',
            pendingProposalReviews: [
                {
                    id: 'PROP_177_opportunity_0',
                    turn: 177,
                    faction: 'RBiH',
                    domain: 'ops',
                    description: 'Launch operation Corridor - staff recommendation: approve',
                    proposed_action: 'OPPORTUNITY:OPP_177_corridor',
                    current_value: 'pending_review',
                    proposed_value: undefined,
                },
                {
                    id: 'PROP_177_military_0',
                    turn: 177,
                    faction: 'RBiH',
                    domain: 'military',
                    description: 'Reinforce 1st Corps sector',
                },
            ],
            operationOpportunityProposals: [
                makeOpportunityDossier('OPP_177_corridor', 'PROP_177_opportunity_0'),
            ],
        });

        const items = deriveInboxItems(state, null);
        const opportunity = items.find(i => i.type === 'operation_opportunity')!;
        const proposal = items.find(i => i.type === 'autonomy_proposal')!;
        const copy = `${opportunity.title} ${opportunity.subtitle} ${proposal.title} ${proposal.subtitle}`;

        expect(opportunity.title).toBe('Operativna prilika');
        expect(opportunity.subtitle).toBe('operativni prijedlog trazi pregled.');
        expect(proposal.title).toBe('Komandni prijedlog');
        expect(proposal.subtitle).toBe('Vojni prijedlog trazi pregled.');
        expect(copy).not.toMatch(/Launch operation|staff recommendation|approve|Reinforce|Corps sector|proposal requires your review/i);
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

    it('treats modal-required convoy items as effective blockers without mutating source severity', () => {
        const state = makeStub({
            player_faction: 'RBiH',
            pendingConvoyDecisions: [
                { id: 'convoy_rbih', target_enclave: 'gorazde', route_faction: 'RBiH', supply_amount: 18 },
            ],
        });
        const items = deriveInboxItems(state, null);
        const convoy = items.find((item) => item.type === 'convoy_decision')!;

        expect(convoy.severity).toBe('normal');
        expect(effectiveInboxSeverity(convoy)).toBe('blocking');
        expect(hasBlockingItems(items)).toBe(true);
    });

    it('derives blocking from the decision manifest while preserving dynamic event advisories', () => {
        expect(effectiveInboxSeverity({ type: 'paramilitary_request', severity: 'normal' })).toBe('blocking');
        expect(effectiveInboxSeverity({ type: 'peace_plan', severity: 'normal' })).toBe('blocking');
        expect(effectiveInboxSeverity({ type: 'reserve_request', severity: 'urgent' })).toBe('urgent');
        expect(effectiveInboxSeverity({ type: 'event_decision', severity: 'normal' })).toBe('normal');
        expect(effectiveInboxSeverity({ type: 'event_decision', severity: 'blocking' })).toBe('blocking');
        expect(effectiveInboxSeverity({ type: 'situation', severity: 'info' })).toBe('info');
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

    it('returns null for malformed or non-event item ids', () => {
        expect(resolveEventQueueIndex('garbage', queue)).toBeNull();
        expect(resolveEventQueueIndex('peace:vance_owen', queue)).toBeNull();
        expect(resolveEventQueueIndex('reserve:req_1', queue)).toBeNull();
    });

    it('returns null when the target event is not in the queue', () => {
        expect(resolveEventQueueIndex('event:nonexistent', queue)).toBeNull();
    });

    it('returns null for an empty queue', () => {
        expect(resolveEventQueueIndex('event:evt_alpha', [])).toBeNull();
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
