/**
 * UI-2 Decision Room Pushback Explanations (Batch 41).
 *
 * Verifies that the Presidential Decision Room surfaces existing Army CO
 * pushback rationale (PARTIAL / REFUSED traces + order_pushback / order_refused
 * pending events) as a compact card. The card reuses the existing pushback
 * signal — the Decision Room is NOT a second owner of pushback truth.
 *
 * Faction-symmetric: same projection for RBiH / RS / HRHB. Enemy traces and
 * events are never read.
 */
import { describe, expect, it } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

type LooseLGS = LoadedGameState & {
    armyCoDecisionTraces?: Record<string, Array<{
        turn: number;
        campaign_role: string;
        rationale: string;
    }>>;
};

function makeState(overrides: Partial<LooseLGS> = {}): LoadedGameState {
    return {
        label: 'Test',
        turn: 30,
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
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RBiH',
        ...overrides,
    } as LoadedGameState;
}

describe('PresidentialDecisionRoom pushback explanations card', () => {
    it('emits no pushback card when there are no objections, warnings, or refusals', () => {
        const view = buildPresidentialDecisionRoomView({ state: makeState() });
        expect(view.cards.find((c) => c.id === 'pushback:player-army-co')).toBeUndefined();
    });

    it('emits a blocking pushback card when player has an order_refused event', () => {
        const view = buildPresidentialDecisionRoomView({
            state: makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'pe_refused_1',
                        type: 'order_refused',
                        faction: 'RBiH',
                        turn: 30,
                        officer_id: 'arbih_co',
                        officer_name: 'General Delić',
                        officer_competence: 6,
                        officer_aggressiveness: 5,
                        officer_defensive_skill: 6,
                        corps_name: '1st Corps',
                        acknowledged: false,
                        reason: 'Brigade allocations infeasible — Sarajevo garrison cannot be stripped.',
                    },
                ],
            }),
        });
        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');
        expect(card).toBeDefined();
        expect(card!.severity).toBe('blocking');
        expect(card).toMatchObject({
            category: 'command',
            navigationTarget: {
                kind: 'decision-room',
                lens: 'command',
                cardId: 'pushback:player-army-co',
            },
            sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
        });
        const joined = [card!.explanation, ...card!.evidence].join(' ');
        expect(/refused|infeasible|garrison/i.test(joined)).toBe(true);
    });

    it('emits a warning pushback card when player has order_pushback / order_modified events', () => {
        const view = buildPresidentialDecisionRoomView({
            state: makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'pe_pushback_1',
                        type: 'order_pushback',
                        faction: 'RBiH',
                        turn: 30,
                        officer_id: 'arbih_co',
                        officer_name: 'General Delić',
                        officer_competence: 6,
                        officer_aggressiveness: 5,
                        officer_defensive_skill: 6,
                        corps_name: '1st Corps',
                        acknowledged: false,
                        reason: 'Pushes back on press offensive — corps reports rifle-only brigades.',
                    },
                ],
            }),
        });
        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');
        expect(card).toBeDefined();
        expect(card!.severity === 'critical' || card!.severity === 'warning').toBe(true);
        expect(card).toMatchObject({
            category: 'command',
            navigationTarget: {
                kind: 'decision-room',
                lens: 'command',
                cardId: 'pushback:player-army-co',
            },
            sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
        });
        const joined = [card!.explanation, ...card!.evidence].join(' ');
        expect(/push.*back|rifle/i.test(joined)).toBe(true);
    });

    it('emits a command-review operation proposal card for autonomous Army CO proposals', () => {
        const view = buildPresidentialDecisionRoomView({
            state: makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'pe_army_co_proposal_1',
                        type: 'army_co_proposes_op',
                        faction: 'RBiH',
                        turn: 30,
                        officer_id: 'arbih_co',
                        officer_name: 'General Halilovic',
                        officer_competence: 6,
                        officer_aggressiveness: 5,
                        officer_defensive_skill: 6,
                        corps_name: 'Army HQ',
                        acknowledged: false,
                        reason: 'Army command proposes an autonomous operation toward Vlasenica.',
                    },
                ],
            }),
        });

        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');

        expect(card).toBeDefined();
        expect(card).toMatchObject({
            category: 'command',
            severity: 'warning',
            navigationTarget: {
                kind: 'decision-room',
                lens: 'command',
                cardId: 'pushback:player-army-co',
            },
            sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
        });
        const joined = [card!.title, card!.explanation, ...card!.evidence].join(' ');
        expect(/autonomous|proposes|operation/i.test(joined)).toBe(true);
        expect(joined).not.toMatch(/refused a political directive|pushed back on political directive/i);
    });

    it('emits a pushback card from an army CO decision trace with PARTIAL / REFUSED rationale', () => {
        const state = makeState({
            armyCoDecisionTraces: {
                RBiH: [
                    {
                        turn: 30,
                        campaign_role: 'PRESS_OFFENSIVE',
                        rationale: 'General Delić pushes back on the political directive — corps allocations will deviate from the literal reading.',
                    },
                ],
            },
        } as Partial<LooseLGS>);
        const view = buildPresidentialDecisionRoomView({ state });
        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');
        expect(card).toBeDefined();
        const joined = [card!.explanation, ...card!.evidence].join(' ');
        expect(/PRESS_OFFENSIVE|deviate|push/i.test(joined)).toBe(true);
    });

    it('does not leak enemy pushback signals into the player Decision Room card', () => {
        const enemyOnly = buildPresidentialDecisionRoomView({
            state: makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'pe_refused_rs',
                        type: 'order_refused',
                        faction: 'RS',
                        turn: 30,
                        officer_id: 'rs_co',
                        officer_name: 'General Mladić',
                        officer_competence: 7,
                        officer_aggressiveness: 7,
                        officer_defensive_skill: 6,
                        acknowledged: false,
                        reason: 'RS Main Staff overrides directive.',
                    },
                ],
                armyCoDecisionTraces: {
                    RS: [
                        {
                            turn: 30,
                            campaign_role: 'HOLD_KORIDOR',
                            rationale: 'Mladić refused political directive entirely.',
                        },
                    ],
                } as LooseLGS['armyCoDecisionTraces'],
            } as Partial<LooseLGS>),
        });
        expect(enemyOnly.cards.find((c) => c.id === 'pushback:player-army-co')).toBeUndefined();
    });
});
