/**
 * Command loop L7: army clashes (proposal 2A step A1; owner decision 4, 2026-11-14).
 *
 * Covers: plan-conflict detection per act, the compliance gate (anything short of full raises a
 * clash, the category kept as severity; full compliance is a silent Record line; the appendix A
 * chief table), the live-president gate (headless and other factions never), volume
 * caps (one open, 8 weeks apart, 4 a calendar year, all `not_put`), lapse at Advance, the three
 * answers through the desktop IPC module (Accept restages and refunds, Insist debits 15 and records
 * one override on the army commander, Replace stages the corps commander's replacement for 25 and
 * never touches the army commander), validation, old-save migration, canonical round-trip, the
 * advisory manifest family, the player-visible projection, and the attribution firewall.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { withoutComments } from '../helpers/sourceComments.js';
import { describe, expect, it } from 'vitest';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import {
    ARMY_CLASH_MAX_PER_YEAR,
    armyClashYear,
    armyComplianceForAct,
    detectPlanConflict,
    raiseArmyClash,
    sweepLapsedArmyClashes,
} from '../../src/sim/combat/army_clashes.js';
import { validateGameStateShape } from '../../src/state/validateGameState.js';
import { serializeGameState } from '../../src/state/serializeGameState.js';
import { countBlockingPlayerDecisions, summarizePlayerDecisions } from '../../src/state/player_decision_manifest.js';
import { computeFullVerdict } from '../../src/sim/negotiation/scoring.js';
import { ARMY_CLASH_INSIST_COST } from '../../src/ui/map/utils/commandAuthority.js';

const requireCjs = createRequire(import.meta.url);
const ipc = requireCjs('../../src/desktop/army_clash_ipc.cjs') as {
    ARMY_CLASH_INSIST_COST: number;
    recordArmyClashAnswer: (state: unknown, payload: Record<string, unknown>) => { ok: boolean; error?: string; cost?: number };
};
const { projectPlayerVisibleState } = requireCjs('../../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState?: (state: unknown) => any;
};

// ---------------------------------------------------------------------------
// Fixture: RBiH president, one army commander, two corps (c_main primary, c_eco economy).
// ---------------------------------------------------------------------------

interface FixtureOptions {
    turn?: number;
    competence?: number;
    stubbornness?: number;
    aggressiveness?: number;
    headless?: boolean;
    player?: FactionId | null;
    acting?: boolean;
    authority?: number;
}

function makeState(opts: FixtureOptions = {}): GameState {
    const turn = opts.turn ?? 40;
    const state = {
        schema_version: 1,
        meta: {
            turn,
            phase: 'war',
            seed: 'army-clash-test',
            autonomy_level: 1,
            ...(opts.player === null ? {} : { player_faction: opts.player ?? 'RBiH' }),
            ...(opts.headless ? { headless_scenario_auto_control: true } : {}),
            pending_proposal_reviews: [],
        },
        political: { political_controllers: {} },
        military: {
            formations: {
                c_main: { id: 'c_main', faction: 'RBiH', kind: 'corps', name: '2nd Corps' },
                c_eco: { id: 'c_eco', faction: 'RBiH', kind: 'corps', name: '7th Corps' },
            },
            named_officer_data: [
                {
                    id: 'army_chief', name: 'Army Chief', faction: 'RBiH', rank: 'army_commander',
                    competence: opts.competence ?? 2, aggressiveness: opts.aggressiveness ?? 4,
                    ...(opts.stubbornness !== undefined ? { stubbornness: opts.stubbornness } : {}),
                },
                { id: 'co_main', name: 'Corps Commander', faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3 },
                { id: 'co_reserve', name: 'Reserve Officer', faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3 },
            ],
            named_officers: {
                army_chief: { status: 'active', ...(opts.acting ? { acting_commander: true } : {}) },
                co_main: { status: 'active', assigned_corps_id: 'c_main' },
                co_reserve: { status: 'reserve' },
            },
            campaign_plans: {
                RBiH: {
                    issued_turn: turn - 2,
                    valid_until_turn: turn + 4,
                    emergency: false,
                    trigger_reason: 'scheduled',
                    front_priorities: [
                        { corps_id: 'c_main', role: 'primary', suggested_stance: 'offensive', offensive_targets: ['op:doboj:doboj_1'] },
                        { corps_id: 'c_eco', role: 'economy', suggested_stance: 'defensive' },
                    ],
                    synchronized_operations: [],
                    force_transfers: [],
                    excluded_corps: [],
                },
            },
            corps_command: {
                c_main: {
                    active_operations: [
                        { name: 'Operation Doboj', type: 'sector_attack', phase: 'execution', started_turn: turn - 1, phase_started_turn: turn - 1, participating_brigades: [], target_settlements: ['op:doboj:doboj_1'] },
                        { name: 'Operation Elsewhere', type: 'sector_attack', phase: 'execution', started_turn: turn - 1, phase_started_turn: turn - 1, participating_brigades: [], target_settlements: ['op:tuzla:tuzla_9'] },
                    ],
                },
                c_eco: { active_operations: [] },
            },
            command_authority: { current: opts.authority ?? 60, max: 100, spent_this_turn: 0, lifetime_spent: 0 },
            operation_opportunities: [],
        },
    };
    return state as unknown as GameState;
}

/** Stage a halt as the desktop handler does, then raise. */
function stageHalt(state: GameState, opName: string, cost = 25) {
    const cc = (state.military.corps_command as any).c_main;
    cc.pending_op_halt = { op_id: opName, op_name: opName, turn: state.meta.turn, ca_cost: cost };
    (state.military.command_authority as any).current -= cost;
    return raiseArmyClash(state, 'RBiH', { act: 'stop_op', corpsId: 'c_main', orderRef: opName, stagedCost: cost });
}

const clashFields = (state: GameState) => ({
    open: state.meta.army_clashes ?? [],
    history: state.meta.army_clash_history ?? [],
    bookkeeping: state.military.army_clash_state,
});

function strip(state: GameState): GameState {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.meta.army_clashes;
    delete copy.meta.army_clash_history;
    delete copy.military.army_clash_state;
    return copy;
}

// ---------------------------------------------------------------------------

describe('detectPlanConflict', () => {
    it('stop op: the plan objective of the corps conflicts; an unrelated operation does not', () => {
        const state = makeState();
        expect(detectPlanConflict(state, 'RBiH', { act: 'stop_op', corpsId: 'c_main', orderRef: 'Operation Doboj' })).toBe('plan_objective');
        expect(detectPlanConflict(state, 'RBiH', { act: 'stop_op', corpsId: 'c_main', orderRef: 'Operation Elsewhere' })).toBeNull();
    });

    it('stop op: a main-effort corps conflicts whatever the objective', () => {
        const state = makeState();
        (state.military.campaign_plans as any).RBiH.synchronized_operations = [
            { name: 'Sync', participants: [{ corps_id: 'c_main', role: 'main_effort', target_osids: [], min_brigades: 2 }], launch_window_start: 0, launch_window_end: 99, target_area: [] },
        ];
        expect(detectPlanConflict(state, 'RBiH', { act: 'stop_op', corpsId: 'c_main', orderRef: 'Operation Elsewhere' })).toBe('main_effort');
    });

    it('request op conflicts only for an economy or containment corps; withhold only for a primary corps', () => {
        const state = makeState();
        expect(detectPlanConflict(state, 'RBiH', { act: 'request_op', corpsId: 'c_eco', orderRef: 'op:x:y' })).toBe('economy_corps');
        expect(detectPlanConflict(state, 'RBiH', { act: 'request_op', corpsId: 'c_main', orderRef: 'op:x:y' })).toBeNull();
        expect(detectPlanConflict(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'plan_1' })).toBe('primary_corps');
        expect(detectPlanConflict(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_eco', orderRef: 'plan_1' })).toBeNull();
    });

    it('reads the plan only while it is valid', () => {
        const state = makeState();
        (state.military.campaign_plans as any).RBiH.valid_until_turn = state.meta.turn - 1;
        expect(detectPlanConflict(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'plan_1' })).toBeNull();
    });

    it('decline: conflicts only when staff recommended approval and every required check is green', () => {
        const state = makeState();
        (state.military as any).operation_opportunities = [{
            opportunity_id: 'not_in_catalog', proposal_id: 'OPP_40_x', eligibility_turn: 40, expires_turn: 60,
            status: 'eligible_pending_review', approver_faction: 'RBiH',
            last_axis_evaluation: [{ axis: 'a', mode: 'required', green: true, reason: '' }, { axis: 'b', mode: 'optional', green: false, reason: '' }],
        }];
        state.meta.pending_proposal_reviews = [{ id: 'PROP_40_opportunity_0', turn: 40, faction: 'RBiH', domain: 'ops', description: 'X', proposed_action: 'OPPORTUNITY:OPP_40_x', proposed_value: 'approve' }];
        const input = { act: 'decline_opportunity' as const, corpsId: 'c_main', orderRef: 'OPP_40_x' };
        expect(detectPlanConflict(state, 'RBiH', input)).toBe('staff_recommended');
        (state.military as any).operation_opportunities[0].last_axis_evaluation[0].green = false;
        expect(detectPlanConflict(state, 'RBiH', input)).toBeNull();
        (state.military as any).operation_opportunities[0].last_axis_evaluation[0].green = true;
        state.meta.pending_proposal_reviews![0]!.proposed_value = 'delay';
        expect(detectPlanConflict(state, 'RBiH', input)).toBeNull();
    });
});

describe('compliance gate and live-president gate', () => {
    // Fable consult 1, appendix A: the army chiefs by act, under today's masked stubbornness (all 3)
    // and the army_co_roster.json values. "clash" = compliance short of full.
    const CHIEFS: Array<[string, number, number, number]> = [
        // name, competence, aggressiveness, roster stubbornness
        ['Mladić', 4, 5, 5], ['Halilović', 3, 4, 4], ['Delić', 4, 3, 2], ['Roso', 5, 3, 2], ['Praljak', 2, 5, 3],
    ];
    const EXPECTED: Record<string, { masked: [boolean, boolean]; roster: [boolean, boolean] }> = {
        // [request op (press offensive), stop op (hold)]
        Mladić: { masked: [false, true], roster: [true, true] },
        Halilović: { masked: [true, true], roster: [true, true] },
        Delić: { masked: [true, true], roster: [true, true] },
        Roso: { masked: [true, true], roster: [false, false] },
        Praljak: { masked: [true, true], roster: [true, true] },
    };
    it.each(CHIEFS)('%s clashes per the appendix A table (masked and roster stubbornness)', (name, competence, aggressiveness, roster) => {
        for (const [key, stubbornness] of [['masked', 3], ['roster', roster]] as const) {
            const clashes = (['request_op', 'stop_op'] as const).map((act) =>
                armyComplianceForAct(makeState({ competence, aggressiveness, stubbornness }), 'RBiH', act)?.category !== 'full');
            expect(clashes, `${name} ${key}`).toEqual(EXPECTED[name]![key]);
        }
    });

    it('uses the A3 formula against the verb the act implies; acting commanders always comply', () => {
        expect(armyComplianceForAct(makeState({ competence: 2 }), 'RBiH', 'stop_op')?.category).toBe('partial');
        expect(armyComplianceForAct(makeState({ competence: 3 }), 'RBiH', 'stop_op')?.category).toBe('modified');
        // A cautious chief told to press offensive is misaligned: (3 + 5 - 3) / 10 - 0.20 = 0.30.
        expect(armyComplianceForAct(makeState({ competence: 3, aggressiveness: 2 }), 'RBiH', 'request_op')?.category).toBe('partial');
        expect(armyComplianceForAct(makeState({ acting: true }), 'RBiH', 'stop_op')).toBeNull();
    });

    it('raises a clash on conflict plus partial compliance', () => {
        const state = makeState();
        expect(stageHalt(state, 'Operation Doboj')).toEqual({ outcome: 'raised', clashId: 'CLASH_40_RBiH' });
        const clash = state.meta.army_clashes![0]!;
        expect(clash).toMatchObject({
            act: 'stop_op', corps_id: 'c_main', army_officer_id: 'army_chief', conflict: 'plan_objective',
            compliance: 'partial', counter_order: 'continue_operation', order_ref: 'Operation Doboj', staged_cost: 25,
        });
        expect(state.military.army_clash_state).toEqual({
            raised_by_faction_year: { [`RBiH:${armyClashYear(40)}`]: 1 },
            last_clash_turn_by_faction: { RBiH: 40 },
            last_clash_turn_by_officer: { army_chief: 40 },
        });
    });

    it('anything short of full compliance raises a clash, with the category as its severity', () => {
        const state = makeState({ competence: 3 });
        expect(stageHalt(state, 'Operation Doboj').outcome).toBe('raised');
        expect(state.meta.army_clashes![0]!.compliance).toBe('modified');
    });

    it('a fully complying chief files a silent Record line, no card', () => {
        // (5 + 5 - 2) / 10 = 0.80: full.
        const state = makeState({ competence: 5, stubbornness: 2, aggressiveness: 3 });
        expect(stageHalt(state, 'Operation Doboj').outcome).toBe('noted');
        expect(state.meta.army_clashes).toBeUndefined();
        expect(state.meta.army_clash_history?.[0]?.outcome).toBe('noted');
        expect(state.military.army_clash_state).toBeUndefined();
    });

    it('does nothing without a conflict, under headless auto-control, with no player, or for another faction', () => {
        const none = (s: GameState) => expect(clashFields(s)).toEqual({ open: [], history: [], bookkeeping: undefined });
        const noConflict = makeState();
        expect(stageHalt(noConflict, 'Operation Elsewhere').outcome).toBe('none');
        none(noConflict);
        const headless = makeState({ headless: true });
        expect(stageHalt(headless, 'Operation Doboj').outcome).toBe('none');
        none(headless);
        const noPlayer = makeState({ player: null });
        expect(stageHalt(noPlayer, 'Operation Doboj').outcome).toBe('none');
        none(noPlayer);
        const other = makeState({ player: 'RS' });
        expect(raiseArmyClash(other, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'p' }).outcome).toBe('none');
        none(other);
    });
});

describe('volume caps and lapse', () => {
    it('one open clash at a time; the next is not_put', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        const second = raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'plan_2', proposalId: 'P' });
        expect(second).toEqual({ outcome: 'not_put', receiptId: 'CLASH_40_RBiH_2' });
        expect(state.meta.army_clashes).toHaveLength(1);
    });

    it('at least 8 weeks between clashes, at most 4 a calendar year', () => {
        const state = makeState({ turn: 40 });
        stageHalt(state, 'Operation Doboj');
        (state.military.campaign_plans as any).RBiH.valid_until_turn = 200;
        state.meta.turn = 47;
        sweepLapsedArmyClashes(state);
        expect(state.meta.army_clash_history?.at(-1)?.outcome).toBe('lapsed');
        expect(raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'p', proposalId: 'P' }).outcome).toBe('not_put');
        state.meta.turn = 48;
        expect(raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'p', proposalId: 'P' }).outcome).toBe('raised');

        const capped = makeState({ turn: 40 });
        (capped.military as any).army_clash_state = {
            raised_by_faction_year: { [`RBiH:${armyClashYear(40)}`]: ARMY_CLASH_MAX_PER_YEAR },
            last_clash_turn_by_faction: { RBiH: 20 },
            last_clash_turn_by_officer: {},
        };
        expect(stageHalt(capped, 'Operation Doboj').outcome).toBe('not_put');
    });

    it('an unanswered clash lapses at the next turn: the order stood, no override recorded', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        state.meta.turn += 1;
        expect(sweepLapsedArmyClashes(state)).toBe(1);
        expect(state.meta.army_clashes).toBeUndefined();
        expect(state.meta.army_clash_history?.at(-1)).toMatchObject({ id: 'CLASH_40_RBiH', outcome: 'lapsed', resolved_turn: 41, cost: 0 });
        expect((state.military.corps_command as any).c_main.pending_op_halt).toBeDefined();
        expect((state.military.named_officers as any).army_chief.recent_overrides).toBeUndefined();
    });

    it('a later clash refers back to the previous one', () => {
        const state = makeState({ turn: 40 });
        stageHalt(state, 'Operation Doboj');
        state.meta.turn = 50;
        (state.military.campaign_plans as any).RBiH.valid_until_turn = 200;
        raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'p', proposalId: 'P' });
        expect(state.meta.army_clashes![0]!.previous_clash_id).toBe('CLASH_40_RBiH');
    });
});

describe('answers (desktop IPC)', () => {
    it('Insist costs 15 in both the UI and the IPC', () => {
        expect(ipc.ARMY_CLASH_INSIST_COST).toBe(15);
        expect(ARMY_CLASH_INSIST_COST).toBe(15);
    });

    it('Accept a stop op: the halt is withdrawn and its Authority refunded, free', () => {
        const state = makeState({ authority: 60 });
        stageHalt(state, 'Operation Doboj');
        expect((state.military.command_authority as any).current).toBe(35);
        expect(ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'accept' })).toEqual({ ok: true, cost: 0 });
        expect((state.military.corps_command as any).c_main.pending_op_halt).toBeUndefined();
        expect((state.military.command_authority as any).current).toBe(60);
        expect(state.meta.army_clashes).toBeUndefined();
        expect(state.meta.army_clash_history?.at(-1)).toMatchObject({ outcome: 'accept', cost: 0 });
    });

    it('Accept a withheld plan: the corps launches it', () => {
        const state = makeState();
        state.meta.pending_proposal_reviews = [{ id: 'PROP_W', turn: 40, faction: 'RBiH', domain: 'ops', description: 'Operation approval', proposed_action: 'APPROVE_OP:c_main:plan_7', accepted: false, resolved_turn: 40 }];
        (state.military.corps_command as any).c_main.player_op_response = { plan_id: 'plan_7', approved: false, turn: 40 };
        raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'plan_7', proposalId: 'PROP_W' });
        // Backing the plan after all pays the owner decision 1 price (10), as any approval does.
        expect(ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'accept' })).toEqual({ ok: true, cost: 10 });
        expect(state.meta.pending_proposal_reviews![0]!.accepted).toBe(true);
        expect((state.military.corps_command as any).c_main.player_op_response).toEqual({ plan_id: 'plan_7', approved: true, turn: 40 });
        expect((state.military.command_authority as any).current).toBe(50);
        expect(state.meta.army_clash_history?.at(-1)).toMatchObject({ outcome: 'accept', cost: 10 });
    });

    it('Accept of a withheld plan is refused when the backing price cannot be paid, changing nothing', () => {
        const state = makeState({ authority: 6 });
        state.meta.pending_proposal_reviews = [{ id: 'PROP_W', turn: 40, faction: 'RBiH', domain: 'ops', description: 'Operation approval', proposed_action: 'APPROVE_OP:c_main:plan_7', accepted: false, resolved_turn: 40 }];
        raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'plan_7', proposalId: 'PROP_W' });
        const before = JSON.stringify(state);
        expect(ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'accept' })).toEqual({ ok: false, error: 'insufficient_command_authority (6/10)' });
        expect(JSON.stringify(state)).toBe(before);
    });

    it('Insist: the order stands, 15 Authority, one override on the army commander only', () => {
        const state = makeState({ authority: 60 });
        stageHalt(state, 'Operation Doboj');
        expect(ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'insist' })).toEqual({ ok: true, cost: 15 });
        expect((state.military.corps_command as any).c_main.pending_op_halt).toBeDefined();
        expect((state.military.command_authority as any).current).toBe(20);
        expect((state.military.named_officers as any).army_chief.recent_overrides).toEqual([{ turn: 40, resolution: 'override' }]);
        expect((state.military.named_officers as any).co_main.recent_overrides).toBeUndefined();
    });

    it('Replace: the corps commander is staged for replacement at 25; the army commander is never touched', () => {
        const state = makeState({ authority: 60 });
        stageHalt(state, 'Operation Doboj');
        expect(ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'replace' })).toEqual({ ok: true, cost: 25 });
        expect((state.military.corps_command as any).c_main.pending_co_replacement).toMatchObject({ replacement_officer_id: 'co_reserve', ca_cost: 25 });
        expect((state.military.command_authority as any).current).toBe(10);
        expect((state.military.named_officers as any).army_chief).toEqual({ status: 'active' });
    });

    it('refuses an unaffordable Insist, a lapsed clash, another faction and an unknown id, changing nothing', () => {
        const poor = makeState({ authority: 30 });
        stageHalt(poor, 'Operation Doboj');
        const before = JSON.stringify(poor);
        expect(ipc.recordArmyClashAnswer(poor, { clashId: 'CLASH_40_RBiH', answer: 'insist' })).toEqual({ ok: false, error: 'insufficient_command_authority (5/15)' });
        expect(JSON.stringify(poor)).toBe(before);
        const lapsed = makeState();
        stageHalt(lapsed, 'Operation Doboj');
        lapsed.meta.turn += 1;
        expect(ipc.recordArmyClashAnswer(lapsed, { clashId: 'CLASH_40_RBiH', answer: 'accept' }).error).toBe('clash_lapsed');
        expect(ipc.recordArmyClashAnswer(makeState(), { clashId: 'nope', answer: 'accept' }).error).toBe('not_found');
        const wrong = makeState();
        stageHalt(wrong, 'Operation Doboj');
        wrong.meta.player_faction = 'RS';
        expect(ipc.recordArmyClashAnswer(wrong, { clashId: 'CLASH_40_RBiH', answer: 'accept' }).error).toBe('wrong_faction');
        expect(ipc.recordArmyClashAnswer(wrong, { clashId: 'CLASH_40_RBiH', answer: 'surrender' }).error).toBe('invalid_answer');
    });
});

describe('save, validation, manifest, projection, firewall', () => {
    const clashErrors = (state: unknown): string[] => {
        const result = validateGameStateShape(state as never) as { ok: boolean; errors?: string[] };
        return (result.ok ? [] : result.errors ?? []).filter((e) => e.includes('army_clash'));
    };

    it('validates open clashes, receipts and bookkeeping, and flags malformed rows', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        raiseArmyClash(state, 'RBiH', { act: 'withhold_plan', corpsId: 'c_main', orderRef: 'p', proposalId: 'P' });
        expect(clashErrors(state)).toEqual([]);
        (state.meta.army_clashes![0] as any).compliance = 'full';
        (state.meta.army_clash_history![0] as any).outcome = 'surrender';
        (state.military.army_clash_state as any).last_clash_turn_by_faction = { RBiH: 'soon' };
        expect(clashErrors(state)).toEqual([
            'meta.army_clashes[0] is malformed',
            'meta.army_clash_history[0] is malformed',
            'military.army_clash_state.last_clash_turn_by_faction must be a record of integers',
        ]);
    });

    it('old saves load unchanged: the real startup save has none of the fields and validates', () => {
        const startup = JSON.parse(readFileSync('data/derived/startup/apr_1992_initial_save.json', 'utf8'));
        expect('army_clashes' in startup.meta).toBe(false);
        expect('army_clash_history' in startup.meta).toBe(false);
        expect('army_clash_state' in startup.military).toBe(false);
        expect(clashErrors(startup)).toEqual([]);
        expect((validateGameStateShape(startup) as { ok: boolean }).ok).toBe(true);
        expect(summarizePlayerDecisions(startup, 'RBiH').families.find((f) => f.id === 'army_clash')?.count).toBe(0);
        // Serializing an old save adds nothing.
        expect(serializeGameState(startup)).not.toContain('army_clash');
    });

    it('round-trips through canonical serialization', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        const once = serializeGameState(state);
        expect(serializeGameState(JSON.parse(once))).toBe(once);
        expect(JSON.parse(once).meta.army_clashes).toHaveLength(1);
    });

    it('an open clash is advisory and never blocks Advance; a lapsed one is not counted', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        const family = () => summarizePlayerDecisions(state as never, 'RBiH').families.find((f) => f.id === 'army_clash');
        expect(family()?.count).toBe(1);
        expect(family()?.blockingCount).toBe(0);
        expect(countBlockingPlayerDecisions(state as never, 'RBiH')).toBe(0);
        state.meta.turn += 1;
        expect(family()?.count).toBe(0);
    });

    it('the player-visible projection carries only the player\'s own clashes and never the bookkeeping', () => {
        expect(typeof projectPlayerVisibleState).toBe('function');
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        state.meta.army_clash_history = [{ id: 'CLASH_1_RS', faction: 'RS', turn: 1, act: 'stop_op', corps_id: 'x', army_officer_id: 'y', conflict: 'main_effort', outcome: 'insist', resolved_turn: 1, cost: 15 }];
        const projected = projectPlayerVisibleState!(state);
        expect(projected.meta.army_clashes).toHaveLength(1);
        expect(projected.meta.army_clash_history).toEqual([]);
        expect(projected.military?.army_clash_state).toBeUndefined();
    });

    it('no grade, condemnation, attribution or verdict module reads army-clash state', () => {
        const roots = ['src/sim/endgame', 'src/sim/negotiation', 'src/sim/events', 'src/sim/codex'];
        const offenders: string[] = [];
        const walk = (dir: string): void => {
            let entries: string[];
            try { entries = readdirSync(dir); } catch { return; }
            for (const entry of entries) {
                const path = join(dir, entry);
                if (statSync(path).isDirectory()) { walk(path); continue; }
                if (!/\.(ts|cjs|js)$/.test(entry)) continue;
                if (/army_clash|armyClash/.test(withoutComments(readFileSync(path, 'utf8')))) offenders.push(path);
            }
        };
        for (const root of roots) walk(root);
        expect(offenders).toEqual([]);
    });

    it('the verdict is identical with and without army-clash records', () => {
        const state = makeState();
        stageHalt(state, 'Operation Doboj');
        ipc.recordArmyClashAnswer(state, { clashId: 'CLASH_40_RBiH', answer: 'accept' });
        stageHalt(state, 'Operation Doboj');
        const verdictOf = (s: unknown): string => {
            try { return JSON.stringify(computeFullVerdict(s as GameState)); } catch (err) { return `throws:${(err as Error).message}`; }
        };
        expect(state.meta.army_clash_history!.length).toBeGreaterThan(0);
        expect(verdictOf(state)).toBe(verdictOf(strip(state)));
    });
});
