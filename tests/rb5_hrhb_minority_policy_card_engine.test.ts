// RB5: the HRHB minority-policy card driven through the real event engine (evaluateEvents + resolveEventDecisionCore),
// never by hand-writing the decision row. Gate-level fixtures live in rb5_hrhb_minority_policy_halt.test.ts.
import { describe, expect, test } from 'vitest';

import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { countBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';
import {
    MINORITY_POLICY_CARD_ID_BY_FACTION,
    MINORITY_POLICY_DEFAULT_RESPONSE_ID,
    MINORITY_POLICY_HALT_FLAG_BY_FACTION,
    MINORITY_POLICY_HALT_RESPONSE_ID,
    hasMinorityExpulsionPolicy,
} from '../src/state/displacement_takeover.js';
import type { GameState } from '../src/state/game_state.js';

const CARD_ID = MINORITY_POLICY_CARD_ID_BY_FACTION.HRHB!;
const HALT_FLAG = MINORITY_POLICY_HALT_FLAG_BY_FACTION.HRHB!;
const CARD = loadEventDefinitions(0).find((def) => def.id === CARD_ID)!;
const noRng = () => 0;
const WAR_STARTED = 49;
const FIRE_TURN = WAR_STARTED + 1;

type Meta = Record<string, unknown>;

function state(meta: Meta, warStarted: number | null = WAR_STARTED, turn = FIRE_TURN): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'rb5-card-engine', schema_version: 1, ...meta },
        factions: [],
        military: {
            formations: {},
            fired_event_ids: [],
            event_flags: {},
            event_decision_log: [],
            pending_event_decisions: [],
            negotiation: { strategic_dimensions: initializeStrategicDimensions() },
        } as any,
        political: { rbih_hrhb_state: warStarted === null ? {} : { war_started_turn: warStarted } } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

const humanMeta = (level: number): Meta => ({ player_faction: 'HRHB', autonomy_level: level, headless_scenario_auto_control: false });
const fire = (s: GameState, turn = s.meta.turn) => evaluateEvents(s, noRng, turn, [CARD]);
const rows = (s: GameState) => s.military.event_decision_log.filter((r) => r.event_id === CARD_ID);
const confidence = (s: GameState) => (s.military.negotiation as any).strategic_dimensions.HRHB.patron_confidence;

describe('RB5 card through the event engine', () => {
    test('the card is required, once, HRHB, default no_halt', () => {
        expect(CARD.once).toBe(true);
        expect(CARD.requires_player_response).toBe(true);
        expect(CARD.responding_faction).toBe('HRHB');
        expect(CARD.historical_default_response_id).toBe(MINORITY_POLICY_DEFAULT_RESPONSE_ID);
        expect(MINORITY_POLICY_DEFAULT_RESPONSE_ID).toBe('no_halt');
        expect(MINORITY_POLICY_HALT_RESPONSE_ID).toBe('order_halt');
    });

    for (const level of [0, 1, 2]) {
        test(`human HRHB autonomy ${level}: fires after war start, pending, blocks advance; silence would apply the default`, () => {
            const s = state(humanMeta(level), null, WAR_STARTED);
            fire(s);
            expect(s.military.pending_event_decisions).toEqual([]);
            expect(s.military.fired_event_ids).not.toContain(CARD_ID);

            s.political!.rbih_hrhb_state = { war_started_turn: WAR_STARTED } as any;
            s.meta.turn = FIRE_TURN;
            const report = fire(s);
            expect(report.fired.map((f) => f.id)).toEqual([CARD_ID]);
            const pending = s.military.pending_event_decisions!;
            expect(pending.map((p) => p.event_id)).toEqual([CARD_ID]);
            expect(pending[0].faction).toBe('HRHB');
            expect(pending[0].requires_player_response).toBe(true);
            expect(countBlockingPlayerDecisions(s as any, 'HRHB')).toBe(1);
            expect(rows(s)).toEqual([]);
            // Player-override model (H-20, 2026-11-25; was false): while the card waits at the pause, only a halt refuses;
            // silence is the default, which the staff apply when the turn resumes (tests/sim/player_override_s6.test.ts).
            expect(hasMinorityExpulsionPolicy(s, 'HRHB')).toBe(true);
        });
    }

    test('order_halt: flag set, patron_confidence -10 exactly, no policy, unblocked', () => {
        const s = state(humanMeta(1));
        fire(s);
        const before = JSON.parse(JSON.stringify(confidence(s)));
        resolveEventDecisionCore(s, CARD_ID, 'order_halt');
        expect(s.military.event_flags[HALT_FLAG]).toBe(true);
        expect(confidence(s).event_modifier - before.event_modifier).toBe(-10);
        expect(confidence(s).effective_value).toBe(Math.max(0, Math.min(100, before.base_value + before.event_modifier - 10)));
        expect(hasMinorityExpulsionPolicy(s, 'HRHB')).toBe(false);
        expect(rows(s)).toEqual([expect.objectContaining({ response_id: 'order_halt', decision_source: 'player', faction: 'HRHB' })]);
        expect(countBlockingPlayerDecisions(s as any, 'HRHB')).toBe(0);
    });

    test('no_halt: no flag, no confidence change, row on record this turn, policy true the same turn', () => {
        const s = state(humanMeta(2));
        fire(s);
        const before = JSON.parse(JSON.stringify(confidence(s)));
        resolveEventDecisionCore(s, CARD_ID, 'no_halt');
        expect(s.military.event_flags[HALT_FLAG]).toBeUndefined();
        expect(confidence(s)).toEqual(before);
        expect(rows(s)).toEqual([
            expect.objectContaining({ response_id: 'no_halt', decision_source: 'player', faction: 'HRHB', turn: FIRE_TURN }),
        ]);
        expect(hasMinorityExpulsionPolicy(s, 'HRHB')).toBe(true);
    });

    test('Observer (autonomy 3): auto-answered with the historical default, bot_ai_default, policy true', () => {
        const s = state(humanMeta(3));
        const before = JSON.parse(JSON.stringify(confidence(s)));
        fire(s);
        expect(s.military.pending_event_decisions).toEqual([]);
        expect(rows(s)).toEqual([
            expect.objectContaining({ response_id: 'no_halt', decision_source: 'bot_ai_default', faction: 'HRHB', turn: FIRE_TURN }),
        ]);
        expect(s.military.event_flags[HALT_FLAG]).toBeUndefined();
        expect(confidence(s)).toEqual(before);
        expect(hasMinorityExpulsionPolicy(s, 'HRHB')).toBe(true);
    });

    test('answer once: no refire, a second resolve is refused and changes nothing', () => {
        const s = state(humanMeta(0));
        fire(s);
        resolveEventDecisionCore(s, CARD_ID, 'order_halt');
        for (let t = FIRE_TURN + 1; t <= FIRE_TURN + 5; t++) {
            s.meta.turn = t;
            expect(fire(s, t).fired).toEqual([]);
        }
        expect(s.military.pending_event_decisions).toEqual([]);
        expect(s.military.fired_event_ids.filter((id) => id === CARD_ID)).toEqual([CARD_ID]);
        expect(s.military.event_fire_counts?.[CARD_ID]).toBe(1);
        const after = JSON.stringify(s.military);
        expect(() => resolveEventDecisionCore(s, CARD_ID, 'no_halt')).toThrow(/No pending decision/);
        expect(() => resolveEventDecisionCore(s, CARD_ID, 'order_halt')).toThrow(/No pending decision/);
        expect(JSON.stringify(s.military)).toBe(after);
        expect(rows(s)).toHaveLength(1);
        expect(s.military.event_flags[HALT_FLAG]).toBe(true);
    });

    test('bot HRHB (player is another side): fires and is auto-answered no_halt, no halt flag', () => {
        for (const player of ['RBiH', 'RS']) {
            const s = state({ player_faction: player, autonomy_level: 0, headless_scenario_auto_control: false });
            fire(s);
            expect(s.military.pending_event_decisions).toEqual([]);
            expect(rows(s)).toEqual([
                expect.objectContaining({ response_id: 'no_halt', decision_source: 'bot_ai_default', faction: 'HRHB' }),
            ]);
            expect(s.military.event_flags[HALT_FLAG]).toBeUndefined();
            expect(hasMinorityExpulsionPolicy(s, 'HRHB')).toBe(true);
        }
        const headless = state({});
        fire(headless);
        expect(rows(headless).map((r) => [r.response_id, r.decision_source])).toEqual([['no_halt', 'bot_ai_default']]);
    });
});
