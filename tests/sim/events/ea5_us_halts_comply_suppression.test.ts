/**
 * Task #49 (Codex #324) — E-A5 player agency on `us_halts_federation_advance_1995`.
 *
 * The offensive-ops suppression (launch halt) must live inside the `comply`
 * response option, NOT in the event-level `effects[]` (which apply
 * unconditionally on fire, before any response). A player choosing
 * `push_further` ("Defy Washington") must NOT be suppressed; the historical
 * bot path (`accept_first` → options[0] = `comply`) must behave identically
 * to the pre-fix event-level authoring (same faction/duration/reason writes
 * to `state.military.offensive_ops_suppressions`, same turn).
 *
 * Triage of record: docs/40_reports/proposals/20260609_CODEX_BACKLOG_TRIAGE_49_53.md (Task #49).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyEventEffects } from '../../../src/sim/events/apply_effects.js';
import { selectAIDefaultResponse } from '../../../src/sim/events/ai_default_response.js';
import type { EventDefinition, EventResponseOption } from '../../../src/sim/events/event_types.js';
import type { GameState } from '../../../src/state/game_state.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WAR_1995_PATH = join(HERE, '..', '..', '..', 'data', 'scenarios', 'events', 'war_1995.json');

const EVENT_ID = 'us_halts_federation_advance_1995';

/** Minimal GameState stub (mirrors tests/event_effects.test.ts). */
function makeState(): GameState {
    return {
        schema_version: 1,
        meta: { turn: 184, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'a' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
        } as GameState['political'],
    } as unknown as GameState;
}

describe('E-A5 us_halts_federation_advance_1995 — suppression lives on the comply response (Task #49)', () => {
    let def: EventDefinition;
    let comply: EventResponseOption;
    let pushFurther: EventResponseOption;

    beforeAll(() => {
        const events: EventDefinition[] = JSON.parse(readFileSync(WAR_1995_PATH, 'utf-8'));
        const found = events.find((e) => e.id === EVENT_ID);
        expect(found, `${EVENT_ID} must exist in war_1995.json`).toBeDefined();
        def = found!;
        comply = def.response_options!.find((o) => o.id === 'comply')!;
        pushFurther = def.response_options!.find((o) => o.id === 'push_further')!;
        expect(comply).toBeDefined();
        expect(pushFurther).toBeDefined();
    });

    // ── Data shape ────────────────────────────────────────────────────────────

    it('event-level effects[] no longer carries any offensive_ops_suppression', () => {
        const eventLevel = (def.effects ?? []).filter((e) => e.kind === 'offensive_ops_suppression');
        expect(eventLevel).toHaveLength(0);
    });

    it('comply carries the RBiH + HRHB suppression with the original duration and reason', () => {
        const suppressions = (comply.effects ?? []).filter(
            (e): e is Extract<typeof e, { kind: 'offensive_ops_suppression' }> =>
                e.kind === 'offensive_ops_suppression',
        );
        expect(suppressions.map((s) => s.faction)).toEqual(['RBiH', 'HRHB']);
        for (const s of suppressions) {
            expect(s.duration_turns).toBe(6);
            expect(s.reason).toBe(EVENT_ID);
        }
    });

    it('push_further carries NO offensive_ops_suppression (defiance keeps the front unfrozen)', () => {
        const suppressions = (pushFurther.effects ?? []).filter((e) => e.kind === 'offensive_ops_suppression');
        expect(suppressions).toHaveLength(0);
    });

    it('keeps the event-level aggression modifiers untouched (scope guard)', () => {
        const aggression = (def.effects ?? []).filter((e) => e.kind === 'aggression_modifier');
        expect(aggression.map((e: any) => e.faction)).toEqual(['RBiH', 'HRHB']);
    });

    // ── Historical/bot path pin ───────────────────────────────────────────────

    it('bot path still selects comply (accept_first → options[0])', () => {
        expect(def.bot_response_logic).toBe('accept_first');
        expect(def.response_options![0]!.id).toBe('comply');
        expect(selectAIDefaultResponse(def).id).toBe('comply');
    });

    it('applying comply effects writes the same suppression entries as the old event-level authoring', () => {
        const state = makeState();
        applyEventEffects(state, comply.effects ?? []);
        expect(state.military.offensive_ops_suppressions).toEqual([
            { faction: 'RBiH', expires_turn: 190, reason: EVENT_ID },
            { faction: 'HRHB', expires_turn: 190, reason: EVENT_ID },
        ]);
    });

    it('applying push_further effects writes no suppression entries', () => {
        const state = makeState();
        applyEventEffects(state, pushFurther.effects ?? []);
        expect(state.military.offensive_ops_suppressions ?? []).toHaveLength(0);
    });
});
