/**
 * LANE-NIGHTSHIFT-A4-ARMY-CO-ROSTER-PERSONALITIES
 *
 * DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md (eee308e0)
 * Predecessors: A1 18136710  •  A2 ba6955bf  •  A3 c8ff93d8
 *
 * Tests cover the A4 surface:
 *   • loadArmyCoRoster + schema integrity
 *   • applyRosterToOfficers (idempotent stubbornness population +
 *     per-faction political-leader tolerance)
 *   • evaluateScheduledTransitions (informational marker;
 *     processOfficerSuccession remains canonical relief owner)
 *   • applyEmergentVariationRules (competence decay, stubbornness
 *     escalation; cooldown halving retired with the autonomous launch, B4)
 *   • Pipeline integration (war_phases ordering)
 *   • Determinism + backward-compat + faction-symmetric mechanism
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { withoutComments } from './helpers/sourceComments.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type {
    NamedOfficer,
    NamedOfficerState,
} from '../src/state/officer_types.js';
import {
    applyRosterToOfficers,
    evaluateScheduledTransitions,
    applyEmergentVariationRules,
    A4_PIPELINE_STEP_NAME,
    A4_DEFAULT_COMPETENCE_DECAY_PER_12W,
    A4_DEFAULT_STUBBORNNESS_ESCALATION,
    A4_DEFAULT_STUBBORNNESS_CAP,
    A4_DEFAULT_EARLY_RELIEF_PC_COST,
    type ArmyCoRoster,
} from '../src/sim/combat/army_co_lifecycle.js';
import {
    _resetArmyCoRosterCache,
    applyArmyCoRosterStep,
    loadArmyCoRoster,
} from '../src/sim/combat/army_co_roster_loader.js';

// ---------------------------------------------------------------------------
// Helper — strip TS/JS comments so static-grep guards inspect only executable
// code (block AND line comments).
// ---------------------------------------------------------------------------
function stripComments(src: string): string {
    let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
    out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return out;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeOfficer(overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id: 'fixture_army',
        name: 'Fixture Army CO',
        faction: 'RS',
        rank: 'army_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.05,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        ...overrides,
    };
}

function makeOfficerState(overrides: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: 'fixture_army',
        status: 'active',
        assigned_corps_id: null,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
        ...overrides,
    };
}

function makeBaseState(turn = 10): GameState {
    return {
        meta: { turn, phase: 'war' },
        political: { political_controllers: {} },
        military: {
            formations: {},
            corps_command: {},
            named_officer_data: [],
            named_officers: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

beforeEach(() => {
    _resetArmyCoRosterCache();
    delete process.env.A4_ARMY_CO_ROSTER_DISABLED;
});

// ===========================================================================
// T1 — Roster JSON loads with valid schema
// ===========================================================================
describe('A4 — loadArmyCoRoster', () => {
    it('T1 — roster JSON loads with valid schema (3 factions × per-officer schedule)', () => {
        const roster = loadArmyCoRoster();
        expect(roster).not.toBeNull();
        expect(roster!.schema_version).toBeTruthy();
        expect(roster!.ddr_commit).toBe('eee308e0');
        const factions: FactionId[] = ['RS', 'RBiH', 'HRHB'];
        for (const faction of factions) {
            const factionRoster = roster!.rosters[faction];
            expect(factionRoster).toBeDefined();
            expect(Array.isArray(factionRoster.schedule)).toBe(true);
            expect(factionRoster.schedule.length).toBeGreaterThanOrEqual(1);
            for (const entry of factionRoster.schedule) {
                expect(typeof entry.officer_id).toBe('string');
                expect(typeof entry.tenure_start).toBe('number');
                expect(entry.tenure_end_default === null || typeof entry.tenure_end_default === 'number').toBe(true);
                expect(entry.stubbornness).toBeGreaterThanOrEqual(1);
                expect(entry.stubbornness).toBeLessThanOrEqual(5);
            }
        }
        // Political leader tolerance: 3 factions, 1-5 each
        expect(roster!.political_leader_tolerance.RS).toBeGreaterThanOrEqual(1);
        expect(roster!.political_leader_tolerance.RS).toBeLessThanOrEqual(5);
        expect(roster!.political_leader_tolerance.RBiH).toBeGreaterThanOrEqual(1);
        expect(roster!.political_leader_tolerance.HRHB).toBeGreaterThanOrEqual(1);
        // Variation rules surface
        expect(roster!.variation_rules.keep_past_schedule.competence_decay_per_12w).toBe(A4_DEFAULT_COMPETENCE_DECAY_PER_12W);
        expect(roster!.variation_rules.keep_past_schedule.stubbornness_escalation).toBe(A4_DEFAULT_STUBBORNNESS_ESCALATION);
        expect(roster!.variation_rules.keep_past_schedule.stubbornness_cap).toBe(A4_DEFAULT_STUBBORNNESS_CAP);
        expect(roster!.variation_rules.early_relief.political_capital_cost).toBe(A4_DEFAULT_EARLY_RELIEF_PC_COST);
    });
});

// ===========================================================================
// T2 — Stubbornness applied to NamedOfficer at scenario init (DDR-locked
// values: Mladić=5, Halilović=4, Delić=2, Petković=2, Praljak=3, Roso=2)
// ===========================================================================
describe('A4 — applyRosterToOfficers', () => {
    it('T2 — DDR-locked stubbornness values applied to canonical officers', () => {
        const roster = loadArmyCoRoster();
        expect(roster).not.toBeNull();
        const state = makeBaseState();
        const officers: NamedOfficer[] = [
            makeOfficer({ id: 'vrs_mladic', faction: 'RS', stubbornness: undefined }),
            makeOfficer({ id: 'arbih_halilovic', faction: 'RBiH', stubbornness: undefined }),
            makeOfficer({ id: 'arbih_delic', faction: 'RBiH', stubbornness: undefined }),
            makeOfficer({ id: 'hvo_petkovic', faction: 'HRHB', stubbornness: undefined }),
            makeOfficer({ id: 'hvo_praljak', faction: 'HRHB', stubbornness: undefined }),
            makeOfficer({ id: 'hvo_roso', faction: 'HRHB', stubbornness: undefined }),
        ];
        state.military.named_officer_data = officers;
        applyRosterToOfficers(state, roster!);
        const byId: Record<string, NamedOfficer> = {};
        for (const o of state.military.named_officer_data!) byId[o.id] = o;
        expect(byId.vrs_mladic.stubbornness).toBe(5);
        expect(byId.arbih_halilovic.stubbornness).toBe(4);
        expect(byId.arbih_delic.stubbornness).toBe(2);
        expect(byId.hvo_petkovic.stubbornness).toBe(2);
        expect(byId.hvo_praljak.stubbornness).toBe(3);
        expect(byId.hvo_roso.stubbornness).toBe(2);
    });

    it('T2b — the roster owns stubbornness: it replaces the migration-10 default and a second call changes nothing (RF-ROSTER)', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState();
        // Save migration 10 writes 3 on every officer; the old "only when undefined"
        // rule left Mladić at 3. The roster value (5) must win.
        state.military.named_officer_data = [makeOfficer({ id: 'vrs_mladic', faction: 'RS', stubbornness: 3 })];
        applyRosterToOfficers(state, roster!);
        expect(state.military.named_officer_data![0].stubbornness).toBe(5);
        const once = JSON.stringify(state);
        applyRosterToOfficers(state, roster!);
        expect(JSON.stringify(state)).toBe(once);
    });

    it('T2c — an older save (every chief at 3) migrates to the roster values, keeping a recorded overstay escalation (RF-ROSTER)', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(70);
        const ids: Array<[string, FactionId]> = [
            ['vrs_mladic', 'RS'], ['arbih_halilovic', 'RBiH'], ['arbih_delic', 'RBiH'],
            ['hvo_petkovic', 'HRHB'], ['hvo_praljak', 'HRHB'], ['hvo_roso', 'HRHB'],
        ];
        state.military.named_officer_data = ids.map(([id, faction]) => makeOfficer({ id, faction, stubbornness: 3 }));
        state.military.named_officers = Object.fromEntries(ids.map(([id]) => [id, makeOfficerState({ officer_id: id })]));
        // Petković was kept past schedule from turn 60 (escalation already applied once).
        (state.military.named_officers!.hvo_petkovic as NamedOfficerState & { kept_past_schedule_since_turn?: number }).kept_past_schedule_since_turn = 60;
        const loaded = JSON.parse(JSON.stringify(state)) as GameState; // save round-trip
        applyRosterToOfficers(loaded, roster!);
        const byId = Object.fromEntries(loaded.military.named_officer_data!.map((o) => [o.id, o.stubbornness]));
        expect(byId).toEqual({ vrs_mladic: 5, arbih_halilovic: 4, arbih_delic: 2, hvo_petkovic: 3, hvo_praljak: 3, hvo_roso: 2 });
    });
});

// ===========================================================================
// T3 — Override_tolerance applied per faction (Karadžić=4, Izetbegović=3, Boban=2)
// ===========================================================================
describe('A4 — political-leader tolerance', () => {
    it('T3 — override_tolerance applied to per-faction map at init', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState();
        applyRosterToOfficers(state, roster!);
        type LooseMilitary = GameState['military'] & { army_co_political_tolerance?: Record<string, number> };
        const mil = state.military as LooseMilitary;
        expect(mil.army_co_political_tolerance).toBeDefined();
        expect(mil.army_co_political_tolerance!.RS).toBe(4);
        expect(mil.army_co_political_tolerance!.RBiH).toBe(3);
        expect(mil.army_co_political_tolerance!.HRHB).toBe(2);
    });
});

// ===========================================================================
// T4 — Scheduled transition: officer at tenure_end_default does NOT
// double-fire relief (processOfficerSuccession remains canonical owner)
// ===========================================================================
describe('A4 — overstay escalation survives a save on the overstay turn (RF-ROSTER, determinism seat C1)', () => {
    for (const turn of [61, 70]) {
        it(`step at turn ${turn} (${turn === 61 ? 'first overstay turn' : 'marker first set late'}) → save → load gives the same stubbornness`, async () => {
            const { applyMigrations } = await import('../src/state/save_migration.js');
            const roster = loadArmyCoRoster();
            const state = makeBaseState(turn);
            state.military.named_officer_data = [makeOfficer({ id: 'arbih_halilovic', faction: 'RBiH', rank: 'army_commander', available_until_turn: 60, stubbornness: 3 })];
            state.military.named_officers = { arbih_halilovic: makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }) };
            applyArmyCoRosterStep(state);
            // Roster 4 + one-shot escalation 1, because the overstay is on record.
            expect(state.military.named_officer_data![0].stubbornness).toBe(5);
            const saved = JSON.stringify(state);
            const loaded = JSON.parse(saved) as GameState;
            applyMigrations(loaded);
            expect(loaded.military.named_officer_data![0].stubbornness).toBe(5);
            // A second step on the next turn keeps it (no double escalation).
            loaded.meta.turn = turn + 1;
            applyArmyCoRosterStep(loaded);
            expect(loaded.military.named_officer_data![0].stubbornness).toBe(5);
        });
    }
});

describe('A4 — evaluateScheduledTransitions', () => {
    it('T4 — kept-past-schedule marker recorded but NO relief event emitted (canonical owner is processOfficerSuccession)', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(70); // turn 70, past Halilović tenure_end (60)
        state.military.named_officer_data = [
            makeOfficer({
                id: 'arbih_halilovic',
                faction: 'RBiH',
                rank: 'army_commander',
                available_until_turn: 60,
            }),
        ];
        state.military.named_officers = {
            arbih_halilovic: makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }),
        };
        evaluateScheduledTransitions(state, 70, roster!);
        type LooseOS = NamedOfficerState & { kept_past_schedule_since_turn?: number };
        const os = state.military.named_officers!.arbih_halilovic as LooseOS;
        expect(os.kept_past_schedule_since_turn).toBe(61);
        // No relief event fired by A4 itself — pending_officer_events stays empty.
        expect(state.military.pending_officer_events ?? []).toHaveLength(0);
    });
});

// ===========================================================================
// T5 — Keep-past-schedule degradation: officer held 12 turns past schedule
// → competence decreases by 0.05 (linear: -0.05 / 12 per turn × 12 turns).
// B1 (freeze cut): the rule runs once per turn, as in the pipeline. The old code
// lost decayPerTurn × n(n+1)/2 after n turns (quadratic); the old single-call test
// could not see it.
// ===========================================================================
describe('A4 — applyEmergentVariationRules', () => {
    function heldPastSchedule() {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(61);
        state.military.named_officer_data = [
            makeOfficer({
                id: 'arbih_halilovic',
                faction: 'RBiH',
                rank: 'army_commander',
                competence: 3,
                stubbornness: 4,
                available_until_turn: 60,
            }),
        ];
        state.military.named_officers = {
            arbih_halilovic: makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }),
        };
        const competenceAfter = (lastTurn: number): number => {
            for (let t = 61; t <= lastTurn; t++) {
                evaluateScheduledTransitions(state, t, roster!);
                applyEmergentVariationRules(state, t, roster!);
            }
            return state.military.named_officer_data!.find(o => o.id === 'arbih_halilovic')!.competence;
        };
        return { competenceAfter };
    }

    it('T5 — held 12 turns past schedule (one call per turn) → competence decay -0.05, linear', () => {
        // Overstay turns 61..72 = 12. Decay = (-0.05/12) × 12 = -0.05 (quadratic gave -0.325).
        expect(heldPastSchedule().competenceAfter(72)).toBeCloseTo(3 - 0.05, 9);
    });

    it('T5b — the per-turn loss is constant: 24 turns cost exactly twice 12', () => {
        const loss12 = 3 - heldPastSchedule().competenceAfter(72);
        const loss24 = 3 - heldPastSchedule().competenceAfter(84);
        expect(loss24).toBeCloseTo(2 * loss12, 9);
    });
});

// ===========================================================================
// T6 — Keep-past-schedule stubbornness escalation +1 capped at 5
// ===========================================================================
describe('A4 — stubbornness escalation', () => {
    it('T6 — stubbornness +1 (capped at 5) at first overstay', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(61); // first turn past tenure_end=60
        state.military.named_officer_data = [
            makeOfficer({
                id: 'arbih_halilovic',
                faction: 'RBiH',
                rank: 'army_commander',
                stubbornness: 4,
                available_until_turn: 60,
            }),
        ];
        state.military.named_officers = {
            arbih_halilovic: makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }),
        };
        evaluateScheduledTransitions(state, 61, roster!);
        applyEmergentVariationRules(state, 61, roster!);
        const officer = state.military.named_officer_data!.find(o => o.id === 'arbih_halilovic')!;
        expect(officer.stubbornness).toBe(5);

        // Cap: officer at stubbornness=5 stays at 5.
        const state2 = makeBaseState(61);
        state2.military.named_officer_data = [
            makeOfficer({
                id: 'vrs_mladic',
                faction: 'RS',
                rank: 'army_commander',
                stubbornness: 5,
                available_until_turn: 60,
            }),
        ];
        state2.military.named_officers = {
            vrs_mladic: makeOfficerState({ officer_id: 'vrs_mladic', status: 'active' }),
        };
        evaluateScheduledTransitions(state2, 61, roster!);
        applyEmergentVariationRules(state2, 61, roster!);
        const mladic = state2.military.named_officer_data!.find(o => o.id === 'vrs_mladic')!;
        expect(mladic.stubbornness).toBe(5);
    });

    it('T6b (B4) — an overstay no longer rewrites last_autonomous_launch_turn: cooldown halving is retired', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(61);
        state.military.named_officer_data = [
            makeOfficer({
                id: 'arbih_halilovic',
                faction: 'RBiH',
                rank: 'army_commander',
                stubbornness: 4,
                available_until_turn: 60,
            }),
        ];
        type LooseOS = NamedOfficerState & {
            last_autonomous_launch_turn?: number;
            cooldown_halved_applied?: boolean;
        };
        const initialOS = makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }) as LooseOS;
        initialOS.last_autonomous_launch_turn = 50;
        state.military.named_officers = { arbih_halilovic: initialOS };
        evaluateScheduledTransitions(state, 61, roster!);
        applyEmergentVariationRules(state, 61, roster!);
        const os = state.military.named_officers!.arbih_halilovic as LooseOS;
        expect(os.cooldown_halved_applied).toBeUndefined();
        expect(os.last_autonomous_launch_turn).toBe(50);
        expect('cooldown_halving' in roster!.variation_rules.keep_past_schedule).toBe(false);
    });
});

// ===========================================================================
// T7 — Early-relief political_capital cost = 4 (DDR Q5)
// ===========================================================================
describe('A4 — early-relief surface', () => {
    it('T7 — early-relief political_capital cost surfaced as A4_DEFAULT_EARLY_RELIEF_PC_COST = 4', () => {
        // The cost is the constant the IPC handler / political-bot consumes
        // (existing 2-PC override in A3 is the routine override; A4 raises the
        // cost to 4 for an EARLY relief, mirroring DDR Q5).
        expect(A4_DEFAULT_EARLY_RELIEF_PC_COST).toBe(4);
        // And the roster JSON exposes the same value through variation_rules.
        const roster = loadArmyCoRoster();
        expect(roster!.variation_rules.early_relief.political_capital_cost).toBe(4);
    });
});

// ===========================================================================
// T8 — Faction-symmetric mechanism (static-grep guard)
// ===========================================================================
describe('A4 — faction-symmetric mechanism', () => {
    it('T8 — no per-faction branches in source (static-grep, code-only)', () => {
        const path = resolve('src/sim/combat/army_co_lifecycle.ts');
        const src = readFileSync(path, 'utf8');
        const code = stripComments(src);
        // Allowed: type unions / canonical-faction LIST literals (sorted iteration).
        // Forbidden: control-flow branches keyed on a specific faction.
        const forbidden = [
            /if\s*\(\s*faction\s*===\s*['"]RS['"]/,
            /if\s*\(\s*faction\s*===\s*['"]RBiH['"]/,
            /if\s*\(\s*faction\s*===\s*['"]HRHB['"]/,
            /switch\s*\(\s*faction\s*\)/,
        ];
        for (const re of forbidden) {
            expect(re.test(code)).toBe(false);
        }
    });
});

// ===========================================================================
// T9 — Determinism (re-run produces byte-identical roster + state)
// ===========================================================================
describe('A4 — determinism', () => {
    it('T9 — re-run produces identical state (byte-identical JSON serialization)', () => {
        const roster1 = loadArmyCoRoster();
        const roster2 = loadArmyCoRoster();
        expect(JSON.stringify(roster1)).toBe(JSON.stringify(roster2));

        const stateA = makeBaseState(72);
        stateA.military.named_officer_data = [
            makeOfficer({ id: 'arbih_halilovic', faction: 'RBiH', stubbornness: 4, available_until_turn: 60 }),
            makeOfficer({ id: 'vrs_mladic', faction: 'RS', stubbornness: 5 }),
            makeOfficer({ id: 'hvo_petkovic', faction: 'HRHB', stubbornness: 2, available_until_turn: 64 }),
        ];
        stateA.military.named_officers = {
            arbih_halilovic: makeOfficerState({ officer_id: 'arbih_halilovic', status: 'active' }),
            vrs_mladic: makeOfficerState({ officer_id: 'vrs_mladic', status: 'active' }),
            hvo_petkovic: makeOfficerState({ officer_id: 'hvo_petkovic', status: 'active' }),
        };
        const stateB = JSON.parse(JSON.stringify(stateA));

        applyRosterToOfficers(stateA, roster1!);
        evaluateScheduledTransitions(stateA, 72, roster1!);
        applyEmergentVariationRules(stateA, 72, roster1!);

        applyRosterToOfficers(stateB, roster2!);
        evaluateScheduledTransitions(stateB, 72, roster2!);
        applyEmergentVariationRules(stateB, 72, roster2!);

        expect(JSON.stringify(stateA)).toBe(JSON.stringify(stateB));
    });

    it('T9b — no Math.random / Date.now / new Date in source (static-grep, code-only)', () => {
        const path = resolve('src/sim/combat/army_co_lifecycle.ts');
        const src = readFileSync(path, 'utf8');
        const code = stripComments(src);
        expect(/Math\s*\.\s*random/.test(code)).toBe(false);
        expect(/Date\s*\.\s*now/.test(code)).toBe(false);
        expect(/new\s+Date\s*\(/.test(code)).toBe(false);
    });
});

// ===========================================================================
// T10 — Backward-compat: pre-A4 saves load with default-undefined → no
// behavior change. Officers without stubbornness or kept_past_schedule_since_turn
// markers must pass through evaluateScheduledTransitions /
// applyEmergentVariationRules without mutation.
// ===========================================================================
describe('A4 — backward-compat', () => {
    it('T10 — pre-A4 saves (no roster fields populated) behave as no-op', () => {
        const roster = loadArmyCoRoster();
        const state = makeBaseState(40);
        // Pre-A4 save: officers with no stubbornness, no available_until_turn.
        state.military.named_officer_data = [
            makeOfficer({ id: 'arbih_unknown', faction: 'RBiH', rank: 'army_commander', stubbornness: undefined }),
        ];
        state.military.named_officers = {
            arbih_unknown: makeOfficerState({ officer_id: 'arbih_unknown', status: 'active' }),
        };
        const before = JSON.stringify(state.military);
        evaluateScheduledTransitions(state, 40, roster!);
        applyEmergentVariationRules(state, 40, roster!);
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
    });

    it('T10b — A4_ARMY_CO_ROSTER_DISABLED env var short-circuits the pipeline step', () => {
        process.env.A4_ARMY_CO_ROSTER_DISABLED = 'true';
        const state = makeBaseState();
        state.military.named_officer_data = [makeOfficer({ id: 'vrs_mladic', faction: 'RS' })];
        const before = JSON.stringify(state.military);
        applyArmyCoRosterStep(state);
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
        delete process.env.A4_ARMY_CO_ROSTER_DISABLED;
    });
});

// ===========================================================================
// T11 — Pipeline ordering: evaluate-army-co-transitions BEFORE
// apply-army-directive-interpretation AND AFTER evaluate-army-hq-gathering.
// ===========================================================================
describe('A4 — pipeline integration', () => {
    it('T11 — pipeline step name + ordering vs A1 and generate-bot-corps-orders (A3 retired, B3)', () => {
        expect(A4_PIPELINE_STEP_NAME).toBe('evaluate-army-co-transitions');
        const path = resolve('src/sim/turn_phases/war_phases.ts');
        expect(existsSync(path)).toBe(true);
        const src = readFileSync(path, 'utf8');
        const idxArmyHQ = src.indexOf("name: 'evaluate-army-hq-gathering'");
        const idxA4Step = src.indexOf('name: A4_PIPELINE_STEP_NAME');
        const idxBotOrders = src.indexOf("name: 'generate-bot-corps-orders'");
        expect(idxArmyHQ).toBeGreaterThan(0);
        expect(idxA4Step).toBeGreaterThan(idxArmyHQ);
        expect(idxBotOrders).toBeGreaterThan(idxA4Step);
        expect(withoutComments(src)).not.toContain('name: A3_PIPELINE_STEP_NAME');
    });
});

// ===========================================================================
// T12 — DDR cited in source (compliance breadcrumb)
// ===========================================================================
describe('A4 — DDR provenance', () => {
    it('T12 — DDR commit cited in roster JSON + loader source', () => {
        const rosterRaw = readFileSync(resolve('data/scenarios/army_co_roster.json'), 'utf8');
        expect(rosterRaw).toContain('eee308e0');
        const lifecycleRaw = readFileSync(resolve('src/sim/combat/army_co_lifecycle.ts'), 'utf8');
        expect(lifecycleRaw).toContain('eee308e0');
        expect(lifecycleRaw).toContain('18136710'); // A1
        expect(lifecycleRaw).toContain('ba6955bf'); // A2
        expect(lifecycleRaw).toContain('c8ff93d8'); // A3
    });
});
