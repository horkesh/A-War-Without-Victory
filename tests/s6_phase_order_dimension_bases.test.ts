/**
 * §6 phase order (ruling 2026-11-17, unanimous): the one base owner runs at three points.
 *
 * `computeDimensionBaseValues` is still the only base_value writer (§6 E3a1 D2). Before this
 * ruling it ran once, mid-turn (`compute-dimension-bases`), so support, standing and capital
 * written later in the turn (negotiation steps) or between turns (IPC plan answers, unpaused
 * decisions) reached the base one turn late. The owner now runs through one helper,
 * `recomputeDimensionBases`, at:
 *   (a) `refresh-dimension-bases-turn-start` — after ensure-negotiation-state, before
 *       update-event-readiness; skipped on the first war turn;
 *   (b) `compute-dimension-bases` — mid-turn, unchanged;
 *   (c) `refresh-dimension-bases` — after compute-negotiation-capital, before
 *       evaluate-dayton-trigger.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { runNamedPhase, runTurn, type TurnContext, type TurnInput } from '../src/sim/turn_pipeline.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { warPhaseNegotiationSteps } from '../src/sim/turn_phases/war_phase_negotiation_steps.js';
import { cloneGameState } from '../src/state/clone.js';
import { CURRENT_SCHEMA_VERSION, type FactionId, type GameState } from '../src/state/game_state.js';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import {
    computeDimensionBaseValues,
    computeInternationalStandingBase,
    type DimensionStore,
} from '../src/sim/events/strategic_dimensions.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, PendingEventDecision } from '../src/sim/events/event_types.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { initializeNegotiationState } from '../src/sim/negotiation/initialize_negotiation_state.js';
import { resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { getCompositeCapital } from '../src/sim/negotiation/bot_negotiation.js';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];
const TURN_START_STEP = 'refresh-dimension-bases-turn-start';
const MID_TURN_STEP = 'compute-dimension-bases';
const END_STEP = 'refresh-dimension-bases';
const DELIVERY_CARD = 'csq_patron_equipment_delivery_confirmed';
const BACK_CHANNEL_CARD = 'csq_back_channel_communication_RS';

const ALL_EVENT_DEFINITIONS: EventDefinition[] = loadEventDefinitions(0);
const BELGRADE_CARDS = ALL_EVENT_DEFINITIONS.filter((d) => d.id === DELIVERY_CARD || d.id === BACK_CHANNEL_CARD);

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/** A minimal war-phase state of the shape the runTurn determinism tests use. */
function makeWarState(turn: number, playerFaction?: FactionId): GameState {
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 's6-phase-order',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0,
            ...(playerFaction ? { player_faction: playerFaction } : {}),
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {},
        displacement: {},
    } as unknown as GameState;
    initializeNegotiationState(state);
    return state;
}

/** Bring every base in line with its inputs (what the end of the previous turn leaves). */
function settleBases(state: GameState): void {
    const store = state.military.negotiation!.strategic_dimensions!;
    for (const faction of FACTIONS) computeDimensionBaseValues(store, state, faction);
}

function store(state: GameState): DimensionStore {
    return state.military.negotiation!.strategic_dimensions!;
}

function support(state: GameState, faction: FactionId): number {
    return state.military.negotiation!.patron_relationships[faction]!.support_level;
}

/**
 * Run the real war pipeline steps of the NEXT turn up to (not including) `stopBefore`,
 * exactly as runTurn does: clone, increment meta.turn, then the named phases in order.
 */
async function runNextTurnUntil(state: GameState, stopBefore: string, input: TurnInput): Promise<TurnContext> {
    const working = cloneGameState(state);
    working.meta = { ...working.meta, seed: input.seed, turn: working.meta.turn + 1 };
    const context: TurnContext = {
        state: working,
        rng: () => { throw new Error('no simulation randomness'); },
        input,
        report: { seed: input.seed, phases: [] },
    };
    for (const step of warPhases) {
        if (step.name === stopBefore) return context;
        await runNamedPhase(context, step, 'war');
    }
    throw new Error(`step ${stopBefore} not found in warPhases`);
}

async function runStep(context: TurnContext, name: string): Promise<void> {
    const step = warPhases.find((s) => s.name === name);
    if (!step) throw new Error(`step ${name} not found in warPhases`);
    await runNamedPhase(context, step, 'war');
}

function firedIds(context: TurnContext): string[] {
    return (context.report.events_fired ?? []).map((e) => e.id);
}

describe('§6 phase order test 1: turn-boundary consistency (headless)', () => {
    it('after a negotiation-step support write, every pc base equals support and every standing base equals its formula', async () => {
        // Week 118 hands-off: evaluate-peace-plans resolves the Contact Group plan in the
        // negotiation steps, RS rejects (historical), which costs RS support and standing.
        const state = makeWarState(117);
        settleBases(state);
        const rsSupportBefore = support(state, 'RS');

        const { nextState } = await runTurn(state, { seed: 's6-phase-order-t1', settlementEdges: [] });

        expect(nextState.meta.turn).toBe(118);
        expect(nextState.military.negotiation!.peace_plan_history.map((p) => p.plan_id)).toContain('contact_group');
        // Precondition: a negotiation step wrote RS support this turn.
        expect(support(nextState, 'RS')).toBeLessThan(rsSupportBefore);
        const actual = Object.fromEntries(FACTIONS.map((faction) => [faction, {
            pc_base: store(nextState)[faction]!.patron_confidence.base_value,
            standing_base: store(nextState)[faction]!.international_standing.base_value,
        }]));
        const expected = Object.fromEntries(FACTIONS.map((faction) => [faction, {
            pc_base: Math.max(0, Math.min(100, support(nextState, faction))),
            standing_base: computeInternationalStandingBase(nextState, faction),
        }]));
        expect(actual).toEqual(expected);
    });
});

describe('§6 phase order test 2: the desktop gap (plan answered between turns)', () => {
    function desktopStateAtWeek118(): GameState {
        const state = makeWarState(118, 'RBiH');
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 58;
        neg.patron_relationships.RS!.override_authority = 0;
        settleBases(state); // end of t118: RS pc base 58, consistent
        neg.pending_peace_plan = {
            plan_id: 'contact_group',
            turn_offered: 118,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };
        return state;
    }

    it('the harness is live: with a consistent pc ≥ 55 and override ≥ 20, the delivery card fires at t119', async () => {
        const state = makeWarState(118, 'RBiH');
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 58;
        neg.patron_relationships.RS!.override_authority = 30;
        settleBases(state);

        const context = await runNextTurnUntil(state, 'evaluate-events', { seed: 's6-t2-control', eventDefinitions: BELGRADE_CARDS, settlementEdges: [] });
        await runStep(context, 'evaluate-events');

        expect(firedIds(context)).toContain(DELIVERY_CARD);
    });

    it('resolvePeacePlan between turns with RS rejecting: at t119 evaluate-events the pc base equals support and the delivery card does not fire', async () => {
        const state = desktopStateAtWeek118();

        // Between turns (IPC resolve-peace-plan): the RBiH player accepts, the RS bot rejects.
        resolvePeacePlan(state, 'contact_group', 'accepted');
        const neg = state.military.negotiation!;
        expect(neg.patron_relationships.RS!.support_level).toBe(53);
        expect(neg.patron_relationships.RS!.override_authority).toBe(30);
        // The base is stale between turns (display-only known limit).
        expect(store(state).RS!.patron_confidence.base_value).toBe(58);

        const context = await runNextTurnUntil(state, 'evaluate-events', { seed: 's6-t2', eventDefinitions: BELGRADE_CARDS, settlementEdges: [] });
        expect(context.state.meta.turn).toBe(119);
        const pcBaseAtEvaluateEvents = store(context.state).RS!.patron_confidence.base_value;

        await runStep(context, 'evaluate-events');
        expect({
            pc_base_at_evaluate_events: pcBaseAtEvaluateEvents,
            delivery_fired: firedIds(context).includes(DELIVERY_CARD),
        }).toEqual({
            pc_base_at_evaluate_events: support(context.state, 'RS'),
            delivery_fired: false,
        });
        expect(support(context.state, 'RS')).toBe(53);
    });
});

describe('§6 phase order test 3: an unpaused between-turn decision with a support choice', () => {
    const SPECIAL_DECISIONS = new Set(['vance_owen_plan_1993', 'owen_stoltenberg_plan_1993', 'os_rbih_tactical_acceptance_1993']);
    const isSupportWriter = (e: { kind: string }) => e.kind === 'patron_pressure' || e.kind === 'patron_support';

    /** The first catalog choice (by event id) whose only mechanical effect is a patron-support delta. */
    function findSupportChoice() {
        const defs = ALL_EVENT_DEFINITIONS.slice().sort((a, b) => strictCompare(a.id, b.id));
        for (const def of defs) {
            if (SPECIAL_DECISIONS.has(def.id)) continue;
            for (const option of def.response_options ?? []) {
                const effects = (option.effects ?? []) as Array<{ kind: string; faction?: FactionId; delta?: number }>;
                const writers = effects.filter(isSupportWriter);
                if (writers.length !== 1) continue;
                if (!effects.every((e) => isSupportWriter(e) || e.kind === 'narrative')) continue;
                const writer = writers[0]!;
                if (!writer.faction || !writer.delta) continue;
                return { def, option, faction: writer.faction, delta: writer.delta };
            }
        }
        return undefined;
    }

    it('the next evaluate-events sees the pc base equal to the new support', async () => {
        const choice = findSupportChoice();
        expect(choice, 'catalog has a choice whose only effect is a patron-support delta').toBeDefined();
        const { def, option, faction } = choice!;

        const state = makeWarState(60, 'RBiH');
        state.military.negotiation!.patron_relationships[faction]!.support_level = 50;
        settleBases(state);
        const pending: PendingEventDecision = {
            event_id: def.id,
            event_title: def.title ?? def.id,
            turn_fired: 60,
            response_options: def.response_options!,
            faction,
            requires_player_response: true,
        };
        state.military.pending_event_decisions = [pending];

        // Between turns, with the turn not paused (IPC respond-to-event-decision).
        resolveEventDecision(state, def.id, option.id);
        expect(support(state, faction), 'the choice moved support').not.toBe(50);
        expect(store(state)[faction]!.patron_confidence.base_value, 'stale between turns').toBe(50);

        const context = await runNextTurnUntil(state, 'evaluate-events', { seed: 's6-t3', eventDefinitions: [], settlementEdges: [] });
        expect({
            faction,
            choice: `${def.id}#${option.id}`,
            pc_base_at_evaluate_events: store(context.state)[faction]!.patron_confidence.base_value,
        }).toEqual({
            faction,
            choice: `${def.id}#${option.id}`,
            pc_base_at_evaluate_events: Math.max(0, Math.min(100, support(context.state, faction))),
        });
    });
});

describe('§6 phase order test 4: Dayton parity', () => {
    it('the menu faction_capital equals the live composite at the boundary, and the boundary bases are current', async () => {
        const state = makeWarState(187, 'RBiH');
        const neg = state.military.negotiation!;
        // Last turn's capital record: the mid-turn base reads it; compute-negotiation-capital
        // rebuilds it this turn (no controllers → 0 % territory), after the mid-turn base.
        for (const faction of FACTIONS) neg.capital[faction]!.territory_controlled_pct = 40;
        settleBases(state);

        const { nextState } = await runTurn(state, { seed: 's6-t4', settlementEdges: [] });
        const nextNeg = nextState.military.negotiation!;

        expect(nextState.meta.turn).toBe(188);
        expect(nextNeg.pending_dayton).toBeDefined();
        expect(nextNeg.capital.RBiH!.territory_controlled_pct).toBe(0);
        const live = getCompositeCapital(nextNeg.capital.RBiH!, 'RBiH', nextNeg.strategic_dimensions);
        expect(nextNeg.pending_dayton!.faction_capital.RBiH).toBe(live);

        // The live store already equals a fresh base recompute, so the turn-start refresh,
        // submission and resolution all price on the same composite as the menu.
        const fresh = cloneGameState(nextState);
        settleBases(fresh);
        expect(store(nextState)).toEqual(store(fresh));
    });
});

describe('§6 phase order test 5: the first war turn', () => {
    it('the turn-start refresh is skipped on turn 1; desktop-born and headless-born states read the same initialised bases', async () => {
        // Headless birth: the startup snapshot carries an empty negotiation record, and
        // ensure-negotiation-state creates the store at turn 1.
        const headless = makeWarState(0);
        headless.military.negotiation = { capital: {}, patron_relationships: {}, peace_plan_history: [], pending_counter_offers: [] } as never;
        // Desktop birth: initializeNegotiationState at startNewCampaign.
        const desktop = makeWarState(0, 'RBiH');

        const input = { seed: 's6-t5', eventDefinitions: [], settlementEdges: [] };
        const headlessCtx = await runNextTurnUntil(headless, 'evaluate-events', input);
        const desktopCtx = await runNextTurnUntil(desktop, 'evaluate-events', input);

        expect(headlessCtx.state.meta.turn).toBe(1);
        expect(headlessCtx.report.phases.map((p) => p.name)).toContain(TURN_START_STEP);
        for (const ctx of [headlessCtx, desktopCtx]) {
            for (const faction of FACTIONS) {
                for (const dim of Object.values(store(ctx.state)[faction]!)) expect(dim.base_value).toBe(50);
            }
        }
        expect(store(desktopCtx.state)).toEqual(store(headlessCtx.state));
    });

    it('from turn 2 the turn-start refresh runs, identically for both births', async () => {
        const headless = makeWarState(1);
        const desktop = makeWarState(1, 'RBiH');
        const input = { seed: 's6-t5b', eventDefinitions: [], settlementEdges: [] };
        const headlessCtx = await runNextTurnUntil(headless, 'evaluate-events', input);
        const desktopCtx = await runNextTurnUntil(desktop, 'evaluate-events', input);

        // Zeroed capital → territorial_legitimacy base 0 once the owner has run.
        expect(store(headlessCtx.state).RS!.territorial_legitimacy.base_value).toBe(0);
        expect(store(desktopCtx.state)).toEqual(store(headlessCtx.state));
    });
});

describe('§6 phase order test 6: idempotence and determinism', () => {
    function midWarState(): GameState {
        const state = makeWarState(50);
        const neg = state.military.negotiation!;
        neg.capital.RS!.territory_controlled_pct = 63;
        neg.capital.RBiH!.territory_controlled_pct = 24;
        neg.capital.HRHB!.territory_controlled_pct = 13;
        neg.capital.RS!.war_crimes_events = 3;
        neg.patron_relationships.RS!.support_level = 47;
        neg.peace_plan_history = [
            { plan_id: 'vance_owen', turn_offered: 40, responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, resolved: true },
        ];
        store(state).RS!.patron_confidence.event_modifier = -4;
        return state;
    }

    it('(c) then (a) with nothing between gives a byte-identical serialized state', async () => {
        const state = midWarState();
        const context: TurnContext = { state, rng: () => { throw new Error('no randomness'); }, input: { seed: 's6-t6' }, report: { seed: 's6-t6', phases: [] } };
        const endStep = warPhaseNegotiationSteps.find((s) => s.name === END_STEP);
        expect(endStep, `${END_STEP} step`).toBeDefined();
        await runNamedPhase(context, endStep!, 'war');
        const afterEnd = JSON.stringify(state);
        await runStep(context, TURN_START_STEP);
        expect(JSON.stringify(state)).toBe(afterEnd);
    });

    it('a same-state double runTurn is identical', async () => {
        const state = midWarState();
        const first = await runTurn(state, { seed: 's6-t6-double', settlementEdges: [] });
        const second = await runTurn(state, { seed: 's6-t6-double', settlementEdges: [] });
        expect(second.nextState).toEqual(first.nextState);
        expect(second.report).toEqual(first.report);
    });

    it('a save/reload at a turn boundary continues identically', async () => {
        const input = { seed: 's6-t6-save', settlementEdges: [] };
        // Start from a loaded save, so the comparison is not about the migration defaults a
        // hand-built state lacks (meta.player_faction, decision_mode, …).
        const firstTurn = (await runTurn(midWarState(), input)).nextState;
        const loaded = deserializeState(serializeState(firstTurn));
        const boundary = (await runTurn(loaded, input)).nextState;
        const reloaded = deserializeState(serializeState(boundary));

        const fromMemory = (await runTurn(boundary, input)).nextState;
        const fromSave = (await runTurn(reloaded, input)).nextState;
        expect(serializeState(fromSave)).toBe(serializeState(fromMemory));
    });
});

describe('§6 phase order test 7: one helper, three call sites, one owner (source scan)', () => {
    function listSourceFiles(dir: string, out: string[] = []): string[] {
        for (const name of readdirSync(dir).sort()) {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) listSourceFiles(full, out);
            else if (/\.(ts|tsx|cjs|mjs|js)$/.test(name)) out.push(full);
        }
        return out;
    }

    function codeLines(file: string): Array<{ rel: string; line: number; text: string }> {
        const rel = relative('.', file).replace(/\\/g, '/');
        return readFileSync(file, 'utf8').split(/\r?\n/)
            .map((text, i) => ({ rel, line: i + 1, text }))
            .filter(({ text }) => !/^\s*(\/\/|\*|\/\*)/.test(text));
    }

    function stepSource(source: string, stepName: string): string {
        const start = source.indexOf(`name: '${stepName}'`);
        expect(start, `step ${stepName} in source`).toBeGreaterThanOrEqual(0);
        const next = source.indexOf("name: '", start + 1);
        return source.slice(start, next === -1 ? undefined : next);
    }

    it('computeDimensionBaseValues is called only by the helper; the helper has exactly three call sites', () => {
        const ownerCalls: string[] = [];
        const helperCalls: string[] = [];
        for (const file of listSourceFiles('src')) {
            for (const { rel, line, text } of codeLines(file)) {
                if (/\bcomputeDimensionBaseValues\(/.test(text) && !/export function computeDimensionBaseValues\(/.test(text)) {
                    ownerCalls.push(`${rel}:${line}`);
                }
                if (/\brecomputeDimensionBases\(/.test(text) && !/export function recomputeDimensionBases\(/.test(text)) {
                    helperCalls.push(`${rel}:${line}`);
                }
            }
        }
        // One owner, called from one place: inside recomputeDimensionBases.
        expect(ownerCalls).toHaveLength(1);
        expect(ownerCalls[0]).toMatch(/^src\/sim\/events\/strategic_dimensions\.ts:/);
        const dims = readFileSync('src/sim/events/strategic_dimensions.ts', 'utf8');
        const helperStart = dims.indexOf('export function recomputeDimensionBases(');
        expect(helperStart).toBeGreaterThanOrEqual(0);
        const helperBody = dims.slice(helperStart, dims.indexOf('\n}\n', helperStart));
        expect(helperBody).toContain('computeDimensionBaseValues(');
        expect(helperBody).toMatch(/\['RBiH', 'RS', 'HRHB'\]/);

        // Three call sites: turn start and mid-turn in war_phases.ts, the end refresh in the
        // negotiation steps.
        expect(helperCalls.map((c) => c.replace(/:\d+$/, '')).sort()).toEqual([
            'src/sim/turn_phases/war_phase_negotiation_steps.ts',
            'src/sim/turn_phases/war_phases.ts',
            'src/sim/turn_phases/war_phases.ts',
        ]);
        const war = readFileSync('src/sim/turn_phases/war_phases.ts', 'utf8');
        const negotiation = readFileSync('src/sim/turn_phases/war_phase_negotiation_steps.ts', 'utf8');
        expect(stepSource(war, TURN_START_STEP)).toContain('recomputeDimensionBases(context.state)');
        expect(stepSource(war, MID_TURN_STEP)).toContain('recomputeDimensionBases(context.state)');
        expect(stepSource(negotiation, END_STEP)).toContain('recomputeDimensionBases(context.state)');
    });
});
