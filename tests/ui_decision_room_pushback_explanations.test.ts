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
import { buildPlayerArmyCoPushbackVisibility } from '../src/ui/map/data/playerArmyCoPushbackVisibility.js';
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
        // A trace that is not the weekly reading of a political directive (here the army's own
        // launch proposal) still raises the card.
        const state = makeState({
            armyCoDecisionTraces: {
                RBiH: [
                    {
                        turn: 30,
                        campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL',
                        rationale: 'General Delić pushes back and proposes an operation of his own — the corps asks for an override.',
                    },
                ],
            },
        } as Partial<LooseLGS>);
        const view = buildPresidentialDecisionRoomView({ state });
        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');
        expect(card).toBeDefined();
        const joined = [card!.explanation, ...card!.evidence].join(' ');
        expect(/AUTONOMOUS|proposes|push/i.test(joined)).toBe(true);
    });

    // Command-loop L1 (2A step A0): the weekly reading of a political directive the President never
    // gave is one Army HQ Records line, not a Decision Room card (the visibility projection itself
    // is unchanged; the card builder no longer reads it).
    it('does not raise a card from the weekly directive trace or its pushback event', () => {
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
            pendingOfficerEvents: [
                {
                    event_id: 'army:RBiH:directive:30',
                    type: 'army_directive_pushback',
                    faction: 'RBiH',
                    turn: 30,
                    officer_id: 'rbih_army_co',
                    officer_name: 'General Delić',
                    officer_competence: 5,
                    officer_aggressiveness: 4,
                    officer_defensive_skill: 4,
                    acknowledged: false,
                    reason: 'General Delić pushes back on the political directive.',
                    overridable: true,
                },
            ],
        } as Partial<LooseLGS>);
        const view = buildPresidentialDecisionRoomView({ state });
        expect(view.cards.find((c) => c.id === 'pushback:player-army-co')).toBeUndefined();
        expect(view.advanceReadiness.items).toEqual([]);
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

    it('localizes generated Army CO pushback copy without localizing authored reasons', async () => {
        const { setLocale } = await import('../src/ui/map/i18n/index.js');
        try {
            setLocale('bcs', undefined);
            const view = buildPlayerArmyCoPushbackVisibility(makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'pe_army_co_proposal_no_reason',
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
                    },
                ],
            }));

            expect(view?.headline).toBe('Komanda armije predlaže autonomnu operaciju.');
            expect(view?.rationale).toContain('predložila je operaciju');
            expect(view?.evidence).toEqual(['1 autonomni operativni prijedlog']);
            expect([view?.headline, view?.rationale, ...(view?.evidence ?? [])].join(' ')).not.toMatch(/Army command|autonomous operation proposal/);
        } finally {
            setLocale('en', undefined);
        }
    });
});

// A refused or objected-to corps order is a corps order, not a political directive.
describe('order-level pushback names the order, not a political directive', () => {
    type OfficerEvent = NonNullable<LoadedGameState['pendingOfficerEvents']>[number];
    function officerEvent(type: OfficerEvent['type'], id: string, reason?: string): OfficerEvent {
        return {
            event_id: id,
            type,
            faction: 'RBiH',
            turn: 30,
            officer_id: 'arbih_corps_co',
            officer_name: 'General Halilovic',
            officer_competence: 5,
            officer_aggressiveness: 4,
            officer_defensive_skill: 4,
            corps_id: 'arbih_1st_corps',
            corps_name: '1st Corps',
            acknowledged: false,
            ...(reason ? { reason } : {}),
        };
    }

    it('headlines an order_refused event as a refused corps order', () => {
        const view = buildPlayerArmyCoPushbackVisibility(makeState({
            pendingOfficerEvents: [officerEvent('order_refused', 'pe_refused', 'The corps commander refuses the order.')],
        }));
        expect(view?.severity).toBe('blocking');
        expect(view?.headline).toBe('A corps commander refused an order.');
        expect(view?.headline).not.toMatch(/political directive|Army CO/i);
        expect(view?.evidence).toContain('1 order refused');
    });

    it('also names the order in the card the Decision Room shows', () => {
        const view = buildPresidentialDecisionRoomView({
            state: makeState({ pendingOfficerEvents: [officerEvent('order_refused', 'pe_refused')] }),
        });
        const card = view.cards.find((c) => c.id === 'pushback:player-army-co');
        expect(card?.title).toBe('A corps commander refused an order.');
        // No authored reason: the fallback rationale also speaks of the order.
        expect(card?.explanation).toBe('A corps commander has refused the order as given. Review the rationale before advancing.');
    });

    it('headlines order_pushback and order_modified as an objection to an order', () => {
        for (const type of ['order_pushback', 'order_modified'] as const) {
            const view = buildPlayerArmyCoPushbackVisibility(makeState({
                pendingOfficerEvents: [officerEvent(type, `pe_${type}`)],
            }));
            expect(view?.headline, type).toBe('A corps commander objected to an order.');
            expect(view?.rationale, type).toBe('A corps commander has objected to the order as given. Review the rationale before advancing.');
        }
    });

    it('keeps the political-directive wording for the army\'s own reading of a directive', () => {
        const fromEvent = buildPlayerArmyCoPushbackVisibility(makeState({
            pendingOfficerEvents: [officerEvent('army_directive_pushback', 'pe_directive')],
        }));
        expect(fromEvent?.headline).toBe('Army CO pushed back on political directive.');
        const fromTrace = buildPlayerArmyCoPushbackVisibility(makeState({
            armyCoDecisionTraces: {
                RBiH: [{
                    turn: 30,
                    campaign_role: 'PRESS_OFFENSIVE',
                    rationale: 'General Delić pushes back on the political directive.',
                }],
            },
        } as Partial<LooseLGS>));
        expect(fromTrace?.headline).toBe('Army CO pushed back on political directive.');
    });

    it('is written in BCS', async () => {
        const { setLocale } = await import('../src/ui/map/i18n/index.js');
        try {
            setLocale('bcs', undefined);
            const refused = buildPlayerArmyCoPushbackVisibility(makeState({
                pendingOfficerEvents: [officerEvent('order_refused', 'pe_refused_bcs')],
            }));
            expect(refused?.headline).toBe('Komandant korpusa odbio je naredbu.');
            expect(refused?.rationale).toBe('Komandant korpusa odbio je naredbu u ovom obliku. Pregledajte obrazloženje prije napredovanja.');
            const objection = buildPlayerArmyCoPushbackVisibility(makeState({
                pendingOfficerEvents: [officerEvent('order_pushback', 'pe_pushback_bcs')],
            }));
            expect(objection?.headline).toBe('Komandant korpusa prigovorio je naredbi.');
            expect([refused?.headline, objection?.headline].join(' ')).not.toMatch(/politi/i);
        } finally {
            setLocale('en', undefined);
        }
    });
});
