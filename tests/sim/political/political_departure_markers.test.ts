/**
 * B5 political gate: political departures open the divergence gate for the bot factions whose
 * history they rule out; left alone (no player rows, the 1993 war fired) every marker is closed;
 * §6 decisions are carved out.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
    POLITICAL_DEPARTURE_MARKERS,
    POLITICAL_GATE_EXCLUDED_EVENT_IDS,
    POLITICAL_GATE_REVIEWED_ALLOWED_EVENT_IDS,
    CROAT_BOSNIAK_WAR_EVENT_ID,
    CROAT_BOSNIAK_WAR_LAST_TURN,
    isPoliticalGateEligible,
    isPoliticsOffHistoryFor,
} from '../../../src/sim/political/political_departure_markers.js';
import type { GameState } from '../../../src/state/game_state.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';
import { isSensitiveDecisionEvent } from '../../../src/ui/map/data/verdictDecisions.js';

const EVENTS_DIR = resolve(__dirname, '../../../data/scenarios/events');
const allEvents: Array<{ id: string; responding_faction?: string; historical_default_response_id?: string; response_options?: Array<{ id: string }>; trigger: { turn_max?: number } }> =
    readdirSync(EVENTS_DIR)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => {
            const j = JSON.parse(readFileSync(resolve(EVENTS_DIR, f), 'utf8'));
            return Array.isArray(j) ? j : [];
        });
const byId = new Map(allEvents.map((e) => [e.id, e]));

type Row = { event_id: string; response_id: string; decision_source: string; faction: string; turn: number };
function state(opts: { turn: number; rows?: Row[]; warFired?: boolean }): GameState {
    return {
        meta: { turn: opts.turn },
        political: { rbih_hrhb_state: { war_started_turn: opts.warFired === false ? null : 49 } },
        military: {
            event_decision_log: opts.rows ?? [],
            fired_event_ids: opts.warFired === false ? [] : [CROAT_BOSNIAK_WAR_EVENT_ID],
        },
    } as unknown as GameState;
}

describe('marker table is pinned to the event data', () => {
    it('every marker names a real event, its responder, and real non-default responses', () => {
        for (const m of POLITICAL_DEPARTURE_MARKERS) {
            const def = byId.get(m.event_id);
            expect(def, m.event_id).toBeDefined();
            expect(def!.responding_faction, m.event_id).toBe(m.responder);
            const ids = (def!.response_options ?? []).map((o) => o.id);
            for (const r of m.departure_response_ids) {
                expect(ids, `${m.event_id}:${r}`).toContain(r);
                expect(def!.historical_default_response_id, `${m.event_id}:${r}`).not.toBe(r);
            }
            expect(m.opens).not.toContain(m.responder);
        }
    });

    it('the state marker turn is the 1993 war event window close', () => {
        expect(byId.get(CROAT_BOSNIAK_WAR_EVENT_ID)?.trigger.turn_max).toBe(CROAT_BOSNIAK_WAR_LAST_TURN);
    });

    it('every §6 carve-out id and every reviewed allow-list id is a real event', () => {
        for (const id of POLITICAL_GATE_EXCLUDED_EVENT_IDS) expect(byId.has(id), id).toBe(true);
        for (const id of POLITICAL_GATE_REVIEWED_ALLOWED_EVENT_IDS) expect(byId.has(id), id).toBe(true);
    });
});

describe('isPoliticsOffHistoryFor', () => {
    it('is closed left alone: no player rows, the 1993 war fired', () => {
        const s = state({ turn: 150, rows: [{ event_id: 'vance_owen_plan_1993', response_id: 'reject', decision_source: 'bot_political', faction: 'RBiH', turn: 39 }] });
        for (const f of ['RS', 'RBiH', 'HRHB'] as const) expect(isPoliticsOffHistoryFor(s, f)).toBe(false);
    });

    it('a player RBiH rejection of Vance-Owen opens HRHB and RS, not RBiH', () => {
        const s = state({ turn: 60, rows: [{ event_id: 'vance_owen_plan_1993', response_id: 'reject', decision_source: 'player', faction: 'RBiH', turn: 39 }] });
        expect(isPoliticsOffHistoryFor(s, 'HRHB')).toBe(true);
        expect(isPoliticsOffHistoryFor(s, 'RS')).toBe(true);
        expect(isPoliticsOffHistoryFor(s, 'RBiH')).toBe(false);
    });

    it('a player pick of the historical response opens nothing', () => {
        const s = state({ turn: 60, rows: [{ event_id: 'vance_owen_plan_1993', response_id: 'accept', decision_source: 'player', faction: 'RBiH', turn: 39 }] });
        for (const f of ['RS', 'RBiH', 'HRHB'] as const) expect(isPoliticsOffHistoryFor(s, f)).toBe(false);
    });

    it('a non-listed departure (a softer variant) opens nothing', () => {
        const s = state({ turn: 60, rows: [{ event_id: 'hrhb_vance_owen_acceptance_1993', response_id: 'accept_with_modifications', decision_source: 'player', faction: 'HRHB', turn: 46 }] });
        for (const f of ['RS', 'RBiH', 'HRHB'] as const) expect(isPoliticsOffHistoryFor(s, f)).toBe(false);
    });

    it('a 1993 Croat-Bosniak war that never began opens RBiH and HRHB after its window, not before', () => {
        expect(isPoliticsOffHistoryFor(state({ turn: CROAT_BOSNIAK_WAR_LAST_TURN, warFired: false }), 'HRHB')).toBe(false);
        const after = state({ turn: CROAT_BOSNIAK_WAR_LAST_TURN + 1, warFired: false });
        expect(isPoliticsOffHistoryFor(after, 'HRHB')).toBe(true);
        expect(isPoliticsOffHistoryFor(after, 'RBiH')).toBe(true);
        expect(isPoliticsOffHistoryFor(after, 'RS')).toBe(false);
    });
});

describe('§6 carve-out', () => {
    it('is complete: every gate-reachable event the §4 classifier flags is carved out or explicitly reviewed', () => {
        const unreviewed: string[] = [];
        for (const def of allEvents as unknown as EventDefinition[]) {
            const reachable = typeof def.responding_faction === 'string'
                && typeof def.historical_default_response_id === 'string'
                && (def.response_options?.length ?? 0) > 1;
            if (!reachable || !isSensitiveDecisionEvent(def)) continue;
            if (!isPoliticalGateEligible(def.id, def.family)) continue;
            if (POLITICAL_GATE_REVIEWED_ALLOWED_EVENT_IDS.has(def.id)) continue;
            unreviewed.push(def.id);
        }
        expect(unreviewed).toEqual([]);
    });

    it('never applies the political opening to §6 decisions', () => {
        for (const id of POLITICAL_GATE_EXCLUDED_EVENT_IDS) expect(isPoliticalGateEligible(id)).toBe(false);
        expect(isPoliticalGateEligible('hvo_detention_camps_1993')).toBe(false);
        expect(isPoliticalGateEligible('rs_belgrade_pressure_response_1993')).toBe(true);
    });
});
