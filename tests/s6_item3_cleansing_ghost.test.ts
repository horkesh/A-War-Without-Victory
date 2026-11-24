/**
 * §6 mechanics item 3 (signed ruling s6_mech_r3_final "Item 3", 6/6, 2026-11-23) and its §4 label panel
 * (historian + narrative-designer, unanimous, 2026-11-24).
 *
 * The `cleansing_refused` ghost shows only when the side refused in fact: zero paramilitary deployments for the
 * run (operand a) AND the deny is the side's own decision (operand b, an OR: an in-person card answer, or an own
 * history row). An automatic answer is the historical default, not the player's decision, so it gives no ghost.
 *
 * Its label is keyed on the side's card DATA: "Campaign divergence" only when a card's historical default is
 * present and not Always deny; otherwise "Campaign record" (no claim about history). Display only.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { FactionId, GameState } from '../src/state/game_state.js';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import {
    PARAMILITARY_POLICY_CARD_BY_FACTION,
    paramilitaryPolicyCardHistoricalDefault,
} from '../src/sim/events/paramilitary_policy_card.js';
import {
    hasInPersonParamilitaryStandingOrder,
    inPersonParamilitaryPolicyCardAnswer,
} from '../src/sim/events/paramilitary_policy_flag.js';
import { EVENT_CATALOG } from './helpers/s6_opening_lane_fixtures.js';

type Order = 'always_allow' | 'always_deny' | 'ask';

interface Fixture {
    faction: FactionId;
    order?: Order;
    /** The card's applied answer and who gave it (omit: the card has not fired). */
    card?: { answer: Order; source: 'player' | 'bot_ai_default'; turn?: number };
    /** Extra decision-log rows for the card, after the first. */
    laterCardRows?: Array<{ answer: Order; source: 'player' | 'bot_ai_default'; turn: number }>;
    /** An own in-person Always deny on record (a standing order row) at this turn. */
    ownDenyTurn?: number;
    deployments?: number;
}

function state(f: Fixture): GameState {
    const card = PARAMILITARY_POLICY_CARD_BY_FACTION[f.faction];
    const military: Record<string, unknown> = {
        event_flags: {},
        event_fire_counts: {},
        fired_event_ids: [],
        event_decision_log: [],
        negotiation: { capital: { [f.faction]: { war_crimes_events: 0, war_crimes_events_emergent: 0 } } },
    };
    if (f.card && card) {
        (military.event_flags as Record<string, unknown>)[card.flag] = f.card.answer;
        (military.event_fire_counts as Record<string, number>)[card.eventId] = 1;
        military.fired_event_ids = [card.eventId];
        const rows = [{ answer: f.card.answer, source: f.card.source, turn: f.card.turn ?? 3 }, ...(f.laterCardRows ?? [])];
        military.event_decision_log = rows.map((row) => ({
            event_id: card.eventId,
            response_id: row.answer,
            decision_source: row.source,
            faction: f.faction,
            turn: row.turn,
        }));
    }
    return {
        paramilitary_policy: f.order ?? 'always_deny',
        meta: { turn: 120, phase: 'war', player_faction: f.faction },
        military,
        political: {},
        ...(f.deployments !== undefined ? { paramilitary_deployment_count: { [f.faction]: f.deployments } } : {}),
        ...(f.ownDenyTurn !== undefined
            ? {
                paramilitary_decision_history: [{
                    kind: 'standing_order',
                    id: `paramilitary_order:${f.ownDenyTurn}:${f.faction}`,
                    turn: f.ownDenyTurn,
                    faction: f.faction,
                    order: 'always_deny',
                }],
            }
            : {}),
    } as unknown as GameState;
}

const ghost = (s: GameState) => buildGhostEntries(s, 120).find((g) => g.ghost_id === 'cleansing_refused');

describe('§6 item 3: the cleansing_refused ghost needs zero deployments and the side\'s own deny (ruling tests)', () => {
    it('deployments, then a late deny: no ghost', () => {
        const late = state({ faction: 'RBiH' as FactionId, ownDenyTurn: 90, deployments: 2 });
        expect(hasInPersonParamilitaryStandingOrder(late, 'RBiH' as FactionId)).toBe(true);
        expect(ghost(late)).toBeUndefined();
        // The same refusal with no deployment on record shows the ghost: the count alone decides.
        expect(ghost(state({ faction: 'RBiH' as FactionId, ownDenyTurn: 90, deployments: 0 }))).toBeDefined();
    });

    it('an automatic RBiH Observer deny (decision_source not player), 0 deployments: no ghost', () => {
        const auto = state({ faction: 'RBiH' as FactionId, card: { answer: 'always_deny', source: 'bot_ai_default' }, deployments: 0 });
        expect(inPersonParamilitaryPolicyCardAnswer(auto, 'RBiH' as FactionId)).toBeNull();
        expect(hasInPersonParamilitaryStandingOrder(auto, 'RBiH' as FactionId)).toBe(false);
        expect(ghost(auto)).toBeUndefined();
    });

    it('an in-person CARD deny with no history row, 0 deployments: ghost (the card-only case)', () => {
        const card = state({ faction: 'RBiH' as FactionId, card: { answer: 'always_deny', source: 'player' }, deployments: 0 });
        // hasInPersonParamilitaryStandingOrder alone is false here (no own row): operand (b) is an OR.
        expect(hasInPersonParamilitaryStandingOrder(card, 'RBiH' as FactionId)).toBe(false);
        expect(inPersonParamilitaryPolicyCardAnswer(card, 'RBiH' as FactionId)).toBe('always_deny');
        const got = ghost(card);
        expect(got).toBeDefined();
        expect(got!.claim_predicate.owner_paths).toContain('state.military.event_decision_log');
        expect(got!.claim_predicate.owner_paths).toContain('state.paramilitary_deployment_count.RBiH');
    });

    it('an in-person Always deny on record (a history row), 0 deployments: ghost', () => {
        // RS: the card applied Always allow automatically; the player then gave Always deny in person.
        const rs = state({
            faction: 'RS' as FactionId,
            card: { answer: 'always_allow', source: 'bot_ai_default' },
            ownDenyTurn: 30,
            deployments: 0,
        });
        expect(inPersonParamilitaryPolicyCardAnswer(rs, 'RS' as FactionId)).toBeNull();
        const got = ghost(rs);
        expect(got).toBeDefined();
        expect(got!.claim_predicate.owner_paths).toContain('state.paramilitary_decision_history');
    });
});

describe('§6 item 3: operand details', () => {
    it('a missing deployment count is none (the engine creates it only when it books one)', () => {
        expect(ghost(state({ faction: 'RBiH' as FactionId, ownDenyTurn: 20 }))).toBeDefined();
    });

    it('the NEWEST card row decides: a later automatic answer is not the player\'s decision', () => {
        const overridden = state({
            faction: 'RBiH' as FactionId,
            card: { answer: 'always_deny', source: 'player', turn: 3 },
            laterCardRows: [{ answer: 'always_deny', source: 'bot_ai_default', turn: 5 }],
            deployments: 0,
        });
        expect(inPersonParamilitaryPolicyCardAnswer(overridden, 'RBiH' as FactionId)).toBeNull();
        expect(ghost(overridden)).toBeUndefined();
    });

    it('an in-person card answer other than Always deny is no refusal', () => {
        const review = state({ faction: 'RS' as FactionId, order: 'always_deny', card: { answer: 'ask', source: 'player' }, deployments: 0 });
        expect(inPersonParamilitaryPolicyCardAnswer(review, 'RS' as FactionId)).toBe('ask');
        expect(ghost(review)).toBeUndefined();
    });

    it('the standing order in force must still be Always deny', () => {
        expect(ghost(state({ faction: 'HRHB' as FactionId, order: 'ask', ownDenyTurn: 20, deployments: 0 }))).toBeUndefined();
    });
});

describe('§6 item 3 §4 label: keyed on the card data, never a faction name', () => {
    it('the registry mirrors each card\'s historical_default_response_id in the event data', () => {
        for (const [faction, card] of Object.entries(PARAMILITARY_POLICY_CARD_BY_FACTION)) {
            const def = EVENT_CATALOG.find((row) => row.id === card!.eventId);
            expect(def, faction).toBeTruthy();
            expect(card!.historicalDefault, faction).toBe(def!.historical_default_response_id);
            expect(paramilitaryPolicyCardHistoricalDefault(faction)).toBe(def!.historical_default_response_id);
        }
        expect(paramilitaryPolicyCardHistoricalDefault('HRHB')).toBeNull();
        expect(paramilitaryPolicyCardHistoricalDefault('toString')).toBeNull();
    });

    it('a card whose default is Always deny (RBiH): "Campaign record", never a departure from history', () => {
        const got = ghost(state({ faction: 'RBiH' as FactionId, card: { answer: 'always_deny', source: 'player' }, deployments: 0 }));
        expect(got!.classification).toBe('campaign_record');
    });

    it('a card whose default is not Always deny (RS): "Campaign divergence"', () => {
        const got = ghost(state({ faction: 'RS' as FactionId, card: { answer: 'always_deny', source: 'player' }, deployments: 0 }));
        expect(got!.classification).toBe('divergence_context');
    });

    it('no card (HRHB): "Campaign record" (fail closed; the no-card allow is an engine fallback)', () => {
        const got = ghost(state({ faction: 'HRHB' as FactionId, ownDenyTurn: 20, deployments: 0 }));
        expect(got!.classification).toBe('campaign_record');
    });

    it('the Codex row and the Verdict read the one classification, with the signed EN and BCS copy', () => {
        const root = process.cwd();
        for (const file of ['src/ui/map/components/CodexPanel.tsx', 'src/ui/map/components/VerdictScreen.tsx']) {
            expect(readFileSync(resolve(root, file), 'utf8'), file)
                .toContain("case 'campaign_record': return t('codex.record.campaignRecord');");
        }
        expect(readFileSync(resolve(root, 'src/ui/map/i18n/messages.en.ts'), 'utf8'))
            .toContain("'codex.record.campaignRecord': 'Campaign record',");
        expect(readFileSync(resolve(root, 'src/ui/map/i18n/messages.bcs.ts'), 'utf8'))
            .toContain("'codex.record.campaignRecord': 'Zapis kampanje',");
    });
});
