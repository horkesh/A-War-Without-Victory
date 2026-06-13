/**
 * HRHB (Herceg-Bosna / HVO) Jul–Sep 1992 decision-event content (task #35).
 *
 * Three new player-decision events in the "ambiguous ally" period BEFORE the
 * open 1993 Croat–Bosniak war:
 *   - hrhb_herceg_bosna_consolidation_1992  (turn 13–18, ~3 Jul 1992 HZ HB statute)
 *   - hrhb_summer_alliance_strain_1992       (turn 14–24, Jul 1992 arms/barracks friction)
 *   - hrhb_zagreb_supply_channel_1992        (turn 16–24, Aug–Sep 1992 Zagreb patron channel)
 *
 * These tests assert:
 *   1. Each event loads in the real catalog with the expected trigger window,
 *      responding faction, and historical default.
 *   2. The event fires as an HRHB player decision when its hrhb_political_goal
 *      gate is satisfied and the calendar window is open.
 *   3. The HISTORICAL-DEFAULT path is calibration-INERT: the bot/AI default
 *      option carries only audit-only `cost_ledger_annotation` effects and a
 *      read-model flag — never a control/territory/morale/supply/alliance/
 *      equipment effect — so the historical-bot run is byte-identical on
 *      territory (the 40w structural fingerprint hashes control_counts +
 *      anchor_checks only; political dimension_shifts feed the Dayton composite,
 *      not territory).
 *
 * Determinism: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { GameState } from '../src/state/game_state';
import type { EventDefinition } from '../src/sim/events/event_types';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader';
import { selectAIDefaultResponse, applyAIDefaultResponse } from '../src/sim/events/ai_default_response';
import { evaluateEvents } from '../src/sim/events/evaluate_events';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = resolve(MODULE_DIR, '../data/scenarios/events');

const NEW_EVENT_IDS = [
    'hrhb_herceg_bosna_consolidation_1992',
    'hrhb_summer_alliance_strain_1992',
    'hrhb_zagreb_supply_channel_1992',
] as const;

/** Effect kinds that are provably territory/combat-inert: narrative is a no-op,
 *  cost_ledger_annotation is audit-only (read by buildCostLedger, never drives
 *  mechanics). Anything else can perturb the historical calibration path. */
const INERT_EFFECT_KINDS = new Set(['narrative', 'cost_ledger_annotation']);

/** Political dimensions are scored into the Dayton composite (political layer),
 *  never territory — so dimension_shifts are permitted on the historical path. */

function loadCatalog(): EventDefinition[] {
    return loadEventDefinitionsFromDir(0, EVENTS_DIR);
}

function getEvent(catalog: EventDefinition[], id: string): EventDefinition {
    const def = catalog.find((e) => e.id === id);
    if (!def) throw new Error(`event ${id} not found in catalog`);
    return def;
}

function makeHrhbState(turn: number, playerFaction: string | undefined): GameState {
    return {
        schema_version: 1,
        factions: { RBiH: {} as any, RS: {} as any, HRHB: {} as any },
        meta: { turn, phase: 'war', player_faction: playerFaction } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
            // hrhb_political_goal gate satisfied (set by the H1 keystone dilemma).
            event_flags: { hrhb_political_goal: 'croat_republic' },
        },
        political: { political_controllers: {} } as any,
        displacement: {} as any,
        economic: {} as any,
    } as unknown as GameState;
}

describe('HRHB Jul–Sep 1992 events — catalog contract', () => {
    const catalog = loadCatalog();

    it('all three events load in the real catalog', () => {
        for (const id of NEW_EVENT_IDS) {
            expect(catalog.some((e) => e.id === id), `${id} present`).toBe(true);
        }
    });

    it.each([
        ['hrhb_herceg_bosna_consolidation_1992', 13, 18, 'formalize_institutions'],
        ['hrhb_summer_alliance_strain_1992', 14, 24, 'accept_local_consolidation'],
        ['hrhb_zagreb_supply_channel_1992', 16, 24, 'deepen_patron_channel'],
    ] as const)(
        '%s fires in the Jul–Sep 1992 window with HRHB responding + historical default',
        (id, turnMin, turnMax, defaultId) => {
            const def = getEvent(catalog, id);
            expect(def.trigger.turn_min).toBe(turnMin);
            expect(def.trigger.turn_max).toBe(turnMax);
            // Jul 1992 = turn 13, Sep 1992 ends ~turn 25 → all in the ambiguous-ally band, < week 26 open-war gate.
            expect(def.trigger.turn_min).toBeGreaterThanOrEqual(13);
            expect(def.trigger.turn_max).toBeLessThan(26);
            expect(def.responding_faction).toBe('HRHB');
            expect(def.requires_player_response).toBe(true);
            expect(def.bot_response_logic).toBe('historical');
            expect(def.historical_default_response_id).toBe(defaultId);
            // historical default must be a real option id
            expect(def.response_options?.some((o) => o.id === defaultId)).toBe(true);
        },
    );

    it('each event is gated on the hrhb_political_goal keystone (cannot fire before H1)', () => {
        for (const id of NEW_EVENT_IDS) {
            const def = getEvent(catalog, id);
            const cond = def.trigger.condition as any;
            expect(cond?.type).toBe('or');
            const flags = (cond.conditions as any[]).map((c) => c.flag);
            expect(flags.every((f: string) => f === 'hrhb_political_goal')).toBe(true);
        }
    });
});

describe('HRHB Jul–Sep 1992 events — historical-default path is calibration-INERT', () => {
    const catalog = loadCatalog();

    it.each(NEW_EVENT_IDS)('%s historical default uses only inert effect kinds', (id) => {
        const def = getEvent(catalog, id);
        const chosen = selectAIDefaultResponse(def);
        expect(chosen.id).toBe(def.historical_default_response_id);
        const kinds = (chosen.effects ?? []).map((e) => e.kind);
        for (const k of kinds) {
            expect(INERT_EFFECT_KINDS.has(k), `${id} default effect kind '${k}' must be inert`).toBe(true);
        }
        // historical default must NOT carry a control_change effect anywhere
        expect(kinds.includes('control_change' as any)).toBe(false);
    });

    it.each(NEW_EVENT_IDS)(
        '%s historical-default application leaves political_controllers untouched',
        (id) => {
            const def = getEvent(catalog, id);
            // Seed a controller map; the inert default must not flip any OSID.
            const state = makeHrhbState(def.trigger.turn_min ?? 13, undefined);
            (state.political as any).political_controllers = {
                'op:mostar:mostar_zapad_2': 'HRHB',
                'op:busovaca:kaonik': 'RBiH',
            };
            const before = JSON.stringify((state.political as any).political_controllers);
            applyAIDefaultResponse(state, def);
            const after = JSON.stringify((state.political as any).political_controllers);
            expect(after).toBe(before);
            // No control_events were appended either.
            expect(((state.political as any).control_events ?? []).length).toBe(0);
        },
    );
});

describe('HRHB Jul–Sep 1992 events — firing as an HRHB player decision', () => {
    const catalog = loadCatalog();
    const rng = () => 0.5;

    it.each([
        ['hrhb_herceg_bosna_consolidation_1992', 14],
        ['hrhb_summer_alliance_strain_1992', 18],
        ['hrhb_zagreb_supply_channel_1992', 20],
    ] as const)('%s queues as a pending HRHB decision at turn %d', (id, turn) => {
        const def = getEvent(catalog, id);
        const state = makeHrhbState(turn, 'HRHB');
        // Evaluate using a single-event registry to isolate the row under test.
        evaluateEvents(state, rng, turn, [def]);
        const pending = state.military.pending_event_decisions ?? [];
        const mine = pending.find((p) => p.event_id === id);
        expect(mine, `${id} pending at turn ${turn}`).toBeDefined();
        expect(mine!.faction).toBe('HRHB');
        expect(mine!.requires_player_response).toBe(true);
        expect(mine!.response_options.length).toBe(3);
    });

    it('does NOT fire before its hrhb_political_goal gate is set', () => {
        const def = getEvent(catalog, 'hrhb_herceg_bosna_consolidation_1992');
        const state = makeHrhbState(14, 'HRHB');
        // Clear the gate flag → trigger condition fails.
        (state.military as any).event_flags = {};
        evaluateEvents(state, rng, 14, [def]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.some((p) => p.event_id === def.id)).toBe(false);
    });

    it('does NOT fire outside its calendar window', () => {
        const def = getEvent(catalog, 'hrhb_herceg_bosna_consolidation_1992');
        // turn 26 is past turn_max 18 (and past the week-26 open-war gate).
        const state = makeHrhbState(26, 'HRHB');
        evaluateEvents(state, rng, 26, [def]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.some((p) => p.event_id === def.id)).toBe(false);
    });
});
