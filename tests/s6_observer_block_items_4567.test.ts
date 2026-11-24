/**
 * §6 mechanics batch (ruled 6/6, 2026-11-23; notes s6_mech_r3_final.md): items 5, 6 and 4 in one change, plus the item 7 pin.
 *
 * Item 5: the Observer drain answers a routed peace-plan card through `selectBotEventResponse(..., true)`, so a plan answer
 *         already on record for that side wins over the card's raw authored default (as at fire time).
 * Item 6: at Observer a pending card the drain will answer (authored default among its own options, not an unfired
 *         answer-ahead card) no longer hard-blocks Advance. ONE predicate decides both; cards with no default and unfired
 *         opening cards keep blocking.
 * Item 4: a paramilitary request blocks Advance only while its faction is manual. When the faction stops being manual, its
 *         undecided requests are deleted WITHOUT writing history: at apply-autonomy-transition (the advance that raises the
 *         level) and in detect (saves already at levels 1-3). The staff default then acts on the next detect.
 * Item 7: `meta.player_faction` is assigned only at startup, harness init or migration (pin).
 *
 * Synthetic minimal states. Deterministic: no Math.random(), no wall clock.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import type { EventDefinition, EventResponseOption, PendingEventDecision } from '../src/sim/events/event_types.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { isObserverDrainablePendingDecision } from '../src/sim/events/observer_drain.js';
import { listBlockingPlayerDecisions, summarizePlayerDecisions } from '../src/state/player_decision_manifest.js';
import { detectParamilitaryTargets } from '../src/sim/combat/paramilitary_sweep.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

const noRng = () => 0;
const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

function makeNegotiation(): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    return { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() };
}

function eventState(playerFaction: FactionId, turn: number, autonomy: number): GameState {
    return {
        meta: {
            turn, phase: 'war', schema_version: 1, seed: 's6-observer-block', date: '1994-01-01', war_start_turn: 0,
            player_faction: playerFaction, autonomy_level: autonomy, headless_scenario_auto_control: false,
        },
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_flags: {},
            enabled_event_ids: [],
            pending_event_decisions: [],
            negotiation: makeNegotiation(),
        },
        political: { political_controllers: {}, municipalities: {} },
        displacement: {},
    } as unknown as GameState;
}

function option(id: string, planAnswer?: { plan_id: string; response: 'accepted' | 'rejected' } | null): EventResponseOption {
    return {
        id, label: id, effects: [], aggression_affinity: 0, risk_level: 0.5,
        ...(planAnswer !== undefined ? { plan_answer: planAnswer } : {}),
    } as unknown as EventResponseOption;
}

function card(id: string, faction: FactionId, defaultId: string | undefined, options: EventResponseOption[]): EventDefinition {
    return {
        id,
        trigger: { turn_min: 1, turn_max: 1, phase: 'war' },
        effect: { kind: 'narrative', text: id },
        once: true,
        requires_player_response: true,
        responding_faction: faction,
        bot_response_logic: 'historical',
        ...(defaultId ? { historical_default_response_id: defaultId } : {}),
        response_options: options,
    } as EventDefinition;
}

/** A card that fired earlier and was left on the desk at levels 0-2 (the queue branch's row shape). */
function leaveOnDesk(state: GameState, def: EventDefinition, firedTurn: number): void {
    const military = state.military;
    military.fired_event_ids = [...(military.fired_event_ids ?? []), def.id];
    military.event_fire_counts = { ...(military.event_fire_counts ?? {}), [def.id]: 1 };
    const row: PendingEventDecision = {
        event_id: def.id,
        event_title: def.id,
        turn_fired: firedTurn,
        response_options: def.response_options!,
        faction: def.responding_faction as FactionId,
        requires_player_response: def.requires_player_response,
        ...(def.historical_default_response_id ? { historical_default_response_id: def.historical_default_response_id } : {}),
    } as PendingEventDecision;
    military.pending_event_decisions = [...(military.pending_event_decisions ?? []), row];
}

function blockingEventIds(state: GameState): string[] {
    return listBlockingPlayerDecisions(state as never)
        .filter((item) => item.familyId === 'event_decision')
        .map((item) => item.id);
}

// ─── Item 5 ───────────────────────────────────────────────────────────────────────────────

// Mirrors the shipped RS Contact Group card: the authored default is a refusal.
const CG_RS = card('rs_contact_group_response_1994', 'RS', 'reject_51_49_plan', [
    option('reject_51_49_plan', { plan_id: 'contact_group', response: 'rejected' }),
    option('accept_51_49_plan', { plan_id: 'contact_group', response: 'accepted' }),
    option('negotiate_amendments', { plan_id: 'contact_group', response: 'rejected' }),
]);

describe('§6 item 5: the Observer drain routes a peace-plan card through the plan owner', () => {
    it('a plan already resolved with RS accepting: the drained card applies the accept option, not the raw default', () => {
        const state = eventState('RS', 121, 3);
        state.military.negotiation!.peace_plan_history.push({
            plan_id: 'contact_group', turn_offered: 118, resolved: true, resolved_turn: 120,
            responses: { RBiH: 'accepted', RS: 'accepted', HRHB: 'accepted' },
        });
        leaveOnDesk(state, CG_RS, 119);

        evaluateEvents(state, noRng, 121, [CG_RS]);

        expect(state.military.pending_event_decisions ?? []).toEqual([]);
        const row = (state.military.event_decision_log ?? []).find((entry) => entry.event_id === CG_RS.id);
        expect(row).toMatchObject({ response_id: 'accept_51_49_plan', decision_source: 'bot_ai_default', faction: 'RS' });
    });

    it('no plan answer on record: the drained card still applies the authored default (unchanged for every other card)', () => {
        const state = eventState('RS', 119, 3);
        leaveOnDesk(state, CG_RS, 118);

        evaluateEvents(state, noRng, 119, [CG_RS]);

        const row = (state.military.event_decision_log ?? []).find((entry) => entry.event_id === CG_RS.id);
        expect(row).toMatchObject({ response_id: 'reject_51_49_plan', decision_source: 'bot_ai_default' });
    });
});

// ─── Item 6 ───────────────────────────────────────────────────────────────────────────────

const WITH_DEFAULT = card('s6_block_with_default', 'RS', 'hold', [option('hold'), option('yield')]);
const NO_DEFAULT = card('s6_block_no_default', 'RS', undefined, [option('hold'), option('yield')]);
const STALE_DEFAULT = card('s6_block_stale_default', 'RS', 'gone', [option('hold'), option('yield')]);

function deskOfThree(autonomy: number): GameState {
    const state = eventState('RS', 10, autonomy);
    leaveOnDesk(state, WITH_DEFAULT, 8);
    leaveOnDesk(state, NO_DEFAULT, 8);
    leaveOnDesk(state, STALE_DEFAULT, 8);
    return state;
}

describe('§6 item 6: at Observer a card the drain will answer does not hard-block Advance', () => {
    it.each([0, 1, 2])('autonomy %i: every required card blocks (unchanged)', (level) => {
        expect(blockingEventIds(deskOfThree(level))).toEqual([WITH_DEFAULT.id, NO_DEFAULT.id, STALE_DEFAULT.id]);
    });

    it('Observer: the card with an authored default is advisory; no default and a default outside its options keep blocking', () => {
        const state = deskOfThree(3);
        expect(blockingEventIds(state)).toEqual([NO_DEFAULT.id, STALE_DEFAULT.id]);
        const eventFamily = summarizePlayerDecisions(state as never).families.find((family) => family.id === 'event_decision')!;
        expect(eventFamily.instances.find((item) => item.id === WITH_DEFAULT.id)).toMatchObject({
            blocking: false,
            gatePolicy: 'advisory',
        });
    });

    it('one predicate: the drain answers exactly the cards the manifest stopped blocking', () => {
        const state = deskOfThree(3);
        const advisory = (state.military.pending_event_decisions ?? [])
            .filter((row) => isObserverDrainablePendingDecision(state, row))
            .map((row) => row.event_id);
        expect(advisory).toEqual([WITH_DEFAULT.id]);

        evaluateEvents(state, noRng, 10, [WITH_DEFAULT, NO_DEFAULT, STALE_DEFAULT]);

        const answered = (state.military.event_decision_log ?? []).map((entry) => entry.event_id);
        expect(answered).toEqual(advisory);
        expect((state.military.pending_event_decisions ?? []).map((row) => row.event_id)).toEqual([NO_DEFAULT.id, STALE_DEFAULT.id]);
        expect(blockingEventIds(state)).toEqual([NO_DEFAULT.id, STALE_DEFAULT.id]);
    });

    it('an unfired opening (answer-ahead) card keeps blocking at Observer and is not drained', () => {
        const state = eventState('RS', 0, 3);
        const goals = loadEventDefinitions(0).find((def) => def.id === 'rs_strategic_goals')!;
        expect(goals.historical_default_response_id).toBeTruthy();
        state.military.pending_event_decisions = [{
            event_id: goals.id,
            event_title: goals.id,
            turn_fired: 0,
            response_options: goals.response_options!,
            faction: 'RS',
            requires_player_response: true,
            historical_default_response_id: goals.historical_default_response_id,
        } as PendingEventDecision];
        expect(isObserverDrainablePendingDecision(state, state.military.pending_event_decisions[0]!)).toBe(false);
        expect(blockingEventIds(state)).toEqual([goals.id]);
    });

    it('a pending raise to Observer still blocks: the manifest reads the level the drain reads', () => {
        const state = deskOfThree(2);
        state.meta.autonomy_level_pending = 3;
        expect(blockingEventIds(state)).toEqual([WITH_DEFAULT.id, NO_DEFAULT.id, STALE_DEFAULT.id]);
    });
});

// ─── Item 4 ───────────────────────────────────────────────────────────────────────────────

const TARGET = 'op:testmun:pocket';
const RING = ['op:testmun:ring_a', 'op:testmun:ring_b', 'op:testmun:ring_c'];

function graph(): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    const edges = [
        ...RING.map((cell) => ({ a: cell, b: TARGET }) as EdgeRecord),
        { a: RING[0], b: RING[1] } as EdgeRecord,
        { a: RING[1], b: RING[2] } as EdgeRecord,
    ];
    const reverseMap = new Map<string, string[]>();
    for (const cell of [TARGET, ...RING]) reverseMap.set(cell, [cell]);
    return { edges, reverseMap };
}

/** One undefended `victim` cell surrounded by `owner` (the binding tests' pocket), at `turn`. */
function pocket(owner: FactionId, victim: FactionId, meta: Partial<GameState['meta']>, turn = 5): GameState {
    const controllers: Record<string, FactionId> = { [TARGET]: victim };
    for (const cell of RING) controllers[cell] = owner;
    const penetration = {
        patriotska_liga: 0, sda_penetration: 0, paramilitary_rs: 0, sds_penetration: 0, paramilitary_hrhb: 0, hdz_penetration: 0,
        ...(owner === 'HRHB' ? { paramilitary_hrhb: 70, hdz_penetration: 60 } : {}),
        ...(owner === 'RS' ? { paramilitary_rs: 70, sds_penetration: 60 } : {}),
    };
    return {
        meta: { turn, phase: 'war', schema_version: 1, seed: 's6-item4', ...meta } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: { formations: {}, casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']) } as never,
        political: { political_controllers: controllers, municipalities: { testmun: { organizational_penetration: penetration } } } as never,
        displacement: {
            civilian_casualties: {
                RS: { killed: 0, fled_abroad: 0 }, RBiH: { killed: 0, fled_abroad: 0 }, HRHB: { killed: 0, fled_abroad: 0 },
            },
        } as never,
        paramilitary_policy: 'ask',
    } as unknown as GameState;
}

type Level = 0 | 1 | 2 | 3;

function human(faction: FactionId, level: Level): Partial<GameState['meta']> {
    return { player_faction: faction, autonomy_level: level, headless_scenario_auto_control: false };
}

function leftoverRequest(state: GameState, faction: FactionId): void {
    state.pending_paramilitary_requests = [{
        target_osid: TARGET, faction, strength: 150, estimated_civilian_risk: 100, mode: 'rear_pocket',
    } as NonNullable<GameState['pending_paramilitary_requests']>[number]];
}

const CATALOG = loadEventDefinitions(0);

function detect(state: GameState) {
    const { edges, reverseMap } = graph();
    return detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
}

async function transition(state: GameState): Promise<void> {
    const step = warPhases.find((phase) => phase.name === 'apply-autonomy-transition');
    if (!step) throw new Error('no apply-autonomy-transition phase');
    await step.run({ state, input: {}, report: {} } as never);
}

function paramilitaryBlocking(state: GameState): number {
    return listBlockingPlayerDecisions(state as never).filter((item) => item.familyId === 'paramilitary_request').length;
}

describe('§6 item 4: a paramilitary request blocks only while its faction is manual', () => {
    it.each([1, 2, 3] as const)('manifest: an undecided request at autonomy %i does not block Advance', (level) => {
        const state = pocket('HRHB', 'RS', human('HRHB', level));
        leftoverRequest(state, 'HRHB');
        expect(paramilitaryBlocking(state)).toBe(0);
    });

    it('manifest: at Full Control the request still blocks (unchanged)', () => {
        const state = pocket('HRHB', 'RS', human('HRHB', 0));
        leftoverRequest(state, 'HRHB');
        expect(paramilitaryBlocking(state)).toBe(1);
    });

    it.each([1, 2, 3] as const)('HRHB 0→%i: the transition deletes the request, writes no history, and the staff sweep the target next turn', async (level) => {
        const state = pocket('HRHB', 'RS', { ...human('HRHB', 0), autonomy_level_pending: level });
        leftoverRequest(state, 'HRHB');

        await transition(state);

        expect(state.meta.autonomy_level).toBe(level);
        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
        expect(paramilitaryBlocking(state)).toBe(0);

        state.meta.turn = 6;
        const report = detect(state);
        expect(report.spawned.filter((spawn) => spawn.faction === 'HRHB').map((spawn) => spawn.target_osid)).toEqual([TARGET]);
        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
    });

    it.each([1, 2, 3] as const)('RS 0→%i under ask: the transition deletes the request, writes no history, and the staff send nothing', async (level) => {
        const state = pocket('RS', 'RBiH', { ...human('RS', 0), autonomy_level_pending: level });
        leftoverRequest(state, 'RS');

        await transition(state);

        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);

        state.meta.turn = 6;
        const report = detect(state);
        expect(report.spawned.filter((spawn) => spawn.faction === 'RS')).toEqual([]);
        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
    });

    it('a save already at a level of 1-3 with a leftover request: detect deletes it before building targets, no history', () => {
        const state = pocket('HRHB', 'RS', human('HRHB', 2));
        leftoverRequest(state, 'HRHB');

        const report = detect(state);

        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
        expect(report.spawned.filter((spawn) => spawn.faction === 'HRHB').map((spawn) => spawn.target_osid)).toEqual([TARGET]);
    });

    it('a decided request of a non-manual faction is kept for its resolver (only undecided requests are deleted)', async () => {
        const state = pocket('HRHB', 'RS', { ...human('HRHB', 0), autonomy_level_pending: 2 });
        leftoverRequest(state, 'HRHB');
        state.pending_paramilitary_requests![0]!.decision = 'deny';
        await transition(state);
        expect((state.pending_paramilitary_requests ?? []).map((request) => request.decision)).toEqual(['deny']);
    });

    it('headless (no player faction): detect never creates the request field', () => {
        const state = pocket('HRHB', 'RS', { headless_scenario_auto_control: true });
        detect(state);
        expect(Object.prototype.hasOwnProperty.call(state, 'pending_paramilitary_requests')).toBe(false);
    });

    it('a transition with no request field leaves it absent', async () => {
        const state = pocket('HRHB', 'RS', { ...human('HRHB', 0), autonomy_level_pending: 3 });
        await transition(state);
        expect(Object.prototype.hasOwnProperty.call(state, 'pending_paramilitary_requests')).toBe(false);
    });
});

// ─── Item 7 ───────────────────────────────────────────────────────────────────────────────

function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
        else if (/\.(ts|tsx|cjs|mjs|js)$/.test(name)) out.push(full);
    }
    return out;
}

describe('§6 item 7 (RETIRE, pinned): meta.player_faction is assigned only at startup, harness init or migration', () => {
    it('every direct assignment in src/ is one of the four known writers', () => {
        const root = join(__dirname, '..');
        const writers: string[] = [];
        for (const file of sourceFiles(join(root, 'src'))) {
            const lines = readFileSync(file, 'utf8').split(/\r?\n/);
            lines.forEach((line, index) => {
                // `player_faction=${...}` inside a template string is a receipt's expression text, not a write.
                if (/\bmeta\??\.player_faction\s*=(?!=)(?!\$\{)/.test(line)) {
                    writers.push(`${relative(root, file).replace(/\\/g, '/')}:${index + 1}`);
                }
            });
        }
        // desktop_sim.ts: campaign startup; scenario_runner.ts: harness init; save_migration.ts: migration;
        // warroom.ts: the legacy warroom start. A new writer would let the player faction change mid-campaign,
        // which item 7's RETIRE ruling rests on never happening.
        expect(writers.map((writer) => writer.replace(/:\d+$/, ''))).toEqual([
            'src/desktop/desktop_sim.ts',
            'src/scenario/scenario_runner.ts',
            'src/state/save_migration.ts',
            'src/ui/warroom/warroom.ts',
        ]);
    });
});
