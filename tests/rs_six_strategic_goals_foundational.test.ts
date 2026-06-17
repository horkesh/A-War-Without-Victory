/**
 * RS Six Strategic Goals — foundational decision-event §6 guard (Free War keystone).
 *
 * BACKGROUND. The "RS Six Strategic Goals" foundational decision event is the
 * 12 May 1992 16th Session of the Assembly of the Serbian People in BiH at which
 * the six strategic objectives were adopted and at which Gen. Ratko Mladić warned
 * the Assembly that the program implied genocide. It is the keystone RS decision
 * of the Free War model. The content already ships:
 *   - decision event `rs_strategic_goals` ("The Assembly Speaks") in
 *     `data/scenarios/events/war_1992.json`
 *   - Ring-2 historical essay `essay_rs_strategic_goals` in
 *     `data/scenarios/essays/rs_strategic_goals.json`
 *   - Free War dilemma-spine wiring (`rs_six_strategic_goals`, sensitive=true) in
 *     `src/ui/map/data/dilemmaSpine.ts`
 *
 * This is a DATA-DRIVEN GUARD (no new behavior, calibration-INERT): it pins the
 * §6-critical and Free-War-keystone invariants of the SHIPPED data so a future
 * edit cannot silently:
 *   - drop one of the six goals or the Mladić genocide-warning beat,
 *   - flip the historical-default path off `all_six` (the documented historical
 *     adoption — the calibration railroad, `bot_response_logic: 'historical'`),
 *   - turn the atrocity-warning option into a rewarded path (SENSITIVE_HISTORY
 *     gate §0/§8: atrocity is a consequence, never a lever).
 *
 * §6 self-assessment (SENSITIVE_HISTORY_DESIGN_GATE.md):
 *   - Atrocity-is-never-rewarded: the test asserts NO response option carries a
 *     negative `humanitarian_impact.war_crimes_delta`, and that any option
 *     touching war crimes only ever INCREMENTS the war-crimes counter (a cost).
 *   - Representation, not a lever: the genocide warning lives in narrative +
 *     Ring-2 essay (the historical record), not as a player-authored "commit
 *     genocide" branch. The six goals are adopted as historical fact on the
 *     default path; the player's only divergence is intensity, which only ever
 *     adds cost (war crimes) — never a discount.
 *   - Calibration-inert: assertions read shipped JSON; they author nothing and
 *     mutate no GameState. The historical-default id is pinned to `all_six` so
 *     the byte-identical calibration railroad cannot drift.
 *
 * Determinism: pure file reads + structural assertions. No RNG, no Date.now,
 * no GameState mutation.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

import { DILEMMA_SPINE } from '../src/ui/map/data/dilemmaSpine.js';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import { selectAIDefaultResponse } from '../src/sim/events/ai_default_response.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
import type { GameState } from '../src/state/game_state.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson<T>(rel: string): T {
    return JSON.parse(readFileSync(path.join(REPO_ROOT, rel), 'utf8')) as T;
}

const WAR_1992 = readJson<EventDefinition[]>('data/scenarios/events/war_1992.json');
const EVENT = WAR_1992.find((e) => e.id === 'rs_strategic_goals');

function makeOpeningState(playerFaction: 'RBiH' | 'RS' | 'HRHB'): GameState {
    return {
        schema_version: 1,
        factions: { RBiH: {} as any, RS: {} as any, HRHB: {} as any },
        meta: { turn: 2, phase: 'war', player_faction: playerFaction } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
            event_flags: {},
        },
        political: { political_controllers: {} } as any,
        displacement: {} as any,
        economic: {} as any,
    } as unknown as GameState;
}

/** The six strategic goals, as historically adopted (12 May 1992, 16th Session).
 *  Each entry is a distinct term set the shipped narrative MUST mention so a
 *  future edit cannot quietly drop a goal. Sourced from the Official Gazette of
 *  Republika Srpska (1993) / ICTY Karadžić IT-95-5/18-T. */
const SIX_GOALS_TERMS: ReadonlyArray<{ goal: string; mustMention: readonly string[] }> = [
    { goal: '1. Separation from the other two national communities', mustMention: ['separation'] },
    { goal: '2. Corridor between Semberija and Krajina (Posavina corridor)', mustMention: ['posavina', 'corridor'] },
    { goal: '3. Drina valley corridor / eliminate the Drina as a border', mustMention: ['drina', 'border'] },
    { goal: '4. Border on the Una and Neretva rivers', mustMention: ['una', 'neretva'] },
    { goal: '5. Division of Sarajevo', mustMention: ['division', 'sarajevo'] },
    { goal: '6. Access to the sea', mustMention: ['access', 'sea'] },
];

describe('RS Six Strategic Goals — foundational decision-event §6 guard', () => {
    it('the foundational decision event ships and is an RS, once-only, player-respondent decision', () => {
        expect(EVENT, 'rs_strategic_goals must exist in war_1992.json').toBeDefined();
        const e = EVENT!;
        expect(e.responding_faction).toBe('RS');
        expect(e.once).toBe(true);
        expect(e.requires_player_response).toBe(true);
        // Foundational: fires in the opening weeks (12 May 1992 ≈ turn 1-3).
        expect(e.trigger.turn_min).toBe(1);
        expect(e.trigger.turn_max).toBeLessThanOrEqual(3);
        expect(e.family).toBe('rs_strategic_goals');
    });

    it('all six strategic goals are represented in the narrative (none silently dropped)', () => {
        const text = (EVENT!.narrative ?? '').toLowerCase();
        expect(text.length).toBeGreaterThan(0);
        for (const { goal, mustMention } of SIX_GOALS_TERMS) {
            for (const term of mustMention) {
                expect(text.includes(term.toLowerCase()), `goal "${goal}" missing distinct term "${term}"`).toBe(true);
            }
        }
    });

    it("Mladić's genocide warning is represented as historical record (the warning beat is present)", () => {
        const text = (EVENT!.narrative ?? '').toLowerCase();
        // The narrative carries the army commander's warning that the goals
        // require actions that constitute genocide (Karadžić/Mladić judgments).
        expect(text.includes('genocide'), 'narrative must carry the genocide warning beat').toBe(true);
        expect(text.includes('warn'), 'narrative must frame it as a warning').toBe(true);
    });

    it('the historical-default path is the documented adoption (all_six) and bots replay it (calibration railroad)', () => {
        const e = EVENT!;
        // The documented history: the Assembly ADOPTED all six goals on 12 May 1992.
        expect(e.historical_default_response_id).toBe('all_six');
        // Bots replay the historical default → calibration byte-identical.
        expect(e.bot_response_logic).toBe('historical');
        const defaultOpt = e.response_options?.find((o) => o.id === 'all_six');
        expect(defaultOpt, 'all_six option must exist').toBeDefined();
        expect(defaultOpt!.historical_marker ?? 'historical_default').toBe('historical_default');
        expect(selectAIDefaultResponse(e).id).toBe('all_six');
    });

    it('queues as an RS player opening decision in-window and not for other player factions', () => {
        const e = EVENT!;
        const rsState = makeOpeningState('RS');
        updateEventReadiness(rsState, [e]);
        evaluateEvents(rsState, () => 0.5, 2, [e]);

        const pending = rsState.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(1);
        expect(pending[0]!.event_id).toBe('rs_strategic_goals');
        expect(pending[0]!.faction).toBe('RS');
        expect(pending[0]!.requires_player_response).toBe(true);

        const rbihState = makeOpeningState('RBiH');
        updateEventReadiness(rbihState, [e]);
        evaluateEvents(rbihState, () => 0.5, 2, [e]);
        expect((rbihState.military.pending_event_decisions ?? []).some((p) => p.event_id === 'rs_strategic_goals')).toBe(false);

        const lateState = makeOpeningState('RS');
        lateState.meta.turn = 4;
        updateEventReadiness(lateState, [e]);
        evaluateEvents(lateState, () => 0.5, 4, [e]);
        expect((lateState.military.pending_event_decisions ?? []).some((p) => p.event_id === 'rs_strategic_goals')).toBe(false);
    });

    it('§6 bright line — NO response option rewards atrocity (war_crimes_delta is never negative; never a lever)', () => {
        const options: EventResponseOption[] = EVENT!.response_options ?? [];
        expect(options.length).toBeGreaterThanOrEqual(2);
        for (const opt of options) {
            for (const eff of opt.effects ?? []) {
                if (eff.kind === 'humanitarian_impact') {
                    // war_crimes_delta may only ADD cost. A negative delta would
                    // "launder" war crimes — a Ring-3 refused surface.
                    expect((eff.war_crimes_delta ?? 0) >= 0, `option ${opt.id} must not reduce war_crimes_events`).toBe(true);
                }
                // No option may carry a control_change (territory reward) — the goals
                // are a political platform, not a free land grab. Territory is earned
                // (or not) through ordinary combat downstream, never granted here.
                expect(eff.kind, `option ${opt.id} must not grant territory directly`).not.toBe('control_change');
            }
        }
    });

    it('the maximum-intensity (atrocity-warned) path is strictly costlier, not rewarded', () => {
        const options = EVENT!.response_options ?? [];
        const aggressive = options.find((o) => o.id === 'aggressive');
        // If the maximum-force option exists, it must carry an atrocity COST
        // (a positive war_crimes increment), never a discount.
        if (aggressive) {
            const warCrimes = (aggressive.effects ?? []).find((e) => e.kind === 'humanitarian_impact');
            expect(warCrimes, 'the maximum-force path must register a war-crimes cost').toBeDefined();
            expect((warCrimes as { war_crimes_delta?: number }).war_crimes_delta ?? 0).toBeGreaterThan(0);
        }
    });

    it('the Free War dilemma-spine wires the keystone to its decision event and Ring-2 essay, flagged sensitive', () => {
        const spine = DILEMMA_SPINE.find((d) => d.decisionEventId === 'rs_strategic_goals');
        expect(spine, 'dilemma-spine must include the Six Strategic Goals keystone').toBeDefined();
        expect(spine!.sensitive).toBe(true);
        expect(spine!.essayId).toBe('essay_rs_strategic_goals');
        expect(spine!.keystoneEventIds).toContain('rs_strategic_goals');
    });

    it('the Ring-2 historical essay ships, is ICTY/ICJ-cited, and records the 12 May 1992 session + Mladić warning', () => {
        const essay = readJson<{ id: string; event_id: string; sources: string[]; content: string }>(
            'data/scenarios/essays/rs_strategic_goals.json',
        );
        expect(essay.id).toBe('essay_rs_strategic_goals');
        expect(essay.event_id).toBe('rs_strategic_goals');
        // ICTY/ICJ grounding (SENSITIVE_HISTORY gate §5: BB acceptable, Wikipedia not).
        const joined = essay.sources.join(' ');
        expect(joined.includes('ICTY') || joined.includes('IT-95-5/18-T')).toBe(true);
        expect(joined.includes('ICJ')).toBe(true);
        const c = essay.content;
        expect(c.includes('12 May 1992')).toBe(true);
        expect(c.includes('Mladić') || c.includes('Mladic')).toBe(true);
        expect(c.toLowerCase().includes('genocide') || c.toLowerCase().includes('ethnic cleansing')).toBe(true);
    });
});
