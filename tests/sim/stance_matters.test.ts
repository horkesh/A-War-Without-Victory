/**
 * Posture model option 2: stance matters (plan docs/plans/2026-11-12-posture-model-option2-stance-matters.md,
 * panel docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md, Engine Invariants §14.10c).
 *
 * Covers: gate, generation from persisted baselines, president-caused exclusion, army-stance
 * exclusion, cap + cooldown + not_put receipts, deadline lapse = stood (no effect), confirm,
 * countermand / constrain holds (4 turns from effective-from), reorganize never overridden,
 * patron re-cap + shift, RS Main Staff delay vs RBiH none, overrule window (Confirm only,
 * keyed to the corps, survives a level round trip), no cowing from stance overrules, hold is
 * the last writer (clamps, corridor guard, effective-stance cap), presidential op clears a hold,
 * OG fingerprint matching / lapse / suspension, level change lapses, idempotent re-run, save
 * round-trip, shuffled-input determinism, strip-and-compare inertness, attribution firewall.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
    CorpsCommandState,
    CorpsFrontSector,
    CorpsStance,
    FactionId,
    GameState,
    SectorStance,
} from '../../src/state/game_state.js';
import {
    clampHeldOgStances,
    clearCorpsHoldsForPresidentialOperation,
    computeMainStaffDelayTurns,
    fnv1a32Hex,
    generateStanceMatters,
    isStanceMatterGenerationActive,
    matchSectorsToRecorded,
    refreshStanceBaselines,
    resolveStanceMatters,
    sectorFingerprint,
    STANCE_HOLD_TURNS,
} from '../../src/sim/combat/stance_matters.js';
import {
    capEffectiveStanceByHold,
    clampHeldCorpsStances,
    corpsHoldForbidsNewOffensive,
} from '../../src/sim/combat/stance_matter_holds.js';
import { getEffectiveCorpsStance } from '../../src/sim/combat/corps_command.js';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const { recordStanceMatterAnswer } = requireCjs('../../src/desktop/stance_matter_ipc.cjs') as {
    recordStanceMatterAnswer: (state: unknown, payload: Record<string, unknown>) => { ok: boolean; error?: string };
};
import { serializeGameState } from '../../src/state/serializeGameState.js';
import { summarizePlayerDecisions, countBlockingPlayerDecisions } from '../../src/state/player_decision_manifest.js';
import type { CorpsStanceTrace } from '../../src/sim/combat/bot_corps_stance.js';
import { computeFullVerdict } from '../../src/sim/negotiation/scoring.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function cmd(stance: CorpsStance, extra: Partial<CorpsCommandState> = {}): CorpsCommandState {
    return {
        command_span: 3, subordinate_count: 3, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
        stance, active_operations: [], ...extra,
    } as CorpsCommandState;
}

function corps(id: string, faction: FactionId) {
    return { id, faction, name: `${id} name`, created_turn: 0, status: 'active', assignment: null, kind: 'corps' };
}

function sector(id: string, corpsId: string, faction: FactionId, stance: SectorStance, edges: string[]): CorpsFrontSector {
    return {
        sector_id: id, corps_id: corpsId, faction, opposing_factions: ['RS'], edge_ids: edges, sub_segments: [],
        length_edges: edges.length, territory_osids: [], assigned_brigade_ids: [], reserve_brigade_ids: [],
        density: 1, threat_ratio: 1.2, defensive_power: 100, sector_stance: stance, stance_source: 'bot',
    } as unknown as CorpsFrontSector;
}

interface Opts {
    faction?: FactionId;
    autonomy?: 0 | 1 | 2 | 3;
    headless?: boolean;
    player?: FactionId | null;
    turn?: number;
    corpsStances?: Record<string, CorpsStance>;
    stubbornness?: number;
}

function makeState(opts: Opts = {}): GameState {
    const faction = opts.faction ?? 'RBiH';
    const corpsStances = opts.corpsStances ?? { c_a: 'balanced', c_b: 'balanced', c_c: 'balanced', c_d: 'balanced' };
    const formations: Record<string, unknown> = {};
    const corps_command: Record<string, CorpsCommandState> = {};
    for (const [id, stance] of Object.entries(corpsStances)) {
        formations[id] = corps(id, faction);
        corps_command[id] = cmd(stance);
    }
    return {
        schema_version: 1,
        meta: {
            turn: opts.turn ?? 10,
            phase: 'war',
            seed: 'test',
            player_faction: opts.player === undefined ? faction : opts.player ?? undefined,
            headless_scenario_auto_control: opts.headless ?? false,
            autonomy_level: opts.autonomy ?? 2,
        },
        factions: [{ id: faction }],
        military: {
            formations,
            corps_command,
            corps_front_sectors: {},
            named_officers: {
                army_co: { officer_id: 'army_co', status: 'active', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0, effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false },
                co_a: { officer_id: 'co_a', status: 'active', assigned_corps_id: 'c_a', turns_in_command: 0, battles: 0, victories: 0, effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false },
            },
            named_officer_data: [
                { id: 'army_co', name: 'Army Commander', faction, rank: 'army_commander', competence: 3, aggressiveness: 3, defensive_skill: 3, political_reliability: 3, stubbornness: opts.stubbornness ?? 2 },
                { id: 'co_a', name: 'Commander A', faction, rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3, political_reliability: 3 },
            ],
        },
        political: {},
    } as unknown as GameState;
}

/** Simulate one turn: optional answers already recorded; resolve, then the "bot" writes stances, then generation. */
function runTurn(state: GameState, botStances: Record<string, CorpsStance>, trace = new Map<string, CorpsStanceTrace>()): void {
    resolveStanceMatters(state);
    for (const [id, stance] of Object.entries(botStances)) state.military.corps_command![id]!.stance = stance;
    clampHeldCorpsStances(state, state.meta.player_faction!);
    generateStanceMatters(state, state.meta.player_faction!, trace);
    state.meta.turn += 1;
}

function strip(state: GameState): unknown {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.meta.stance_matters;
    delete copy.meta.stance_matter_history;
    delete copy.military.stance_matter_state;
    return copy;
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

describe('stance matters: gate', () => {
    it('generation is active only for a live president at autonomy 2 in war', () => {
        expect(isStanceMatterGenerationActive(makeState())).toBe(true);
        expect(isStanceMatterGenerationActive(makeState({ headless: true }))).toBe(false);
        expect(isStanceMatterGenerationActive(makeState({ player: null }))).toBe(false);
        expect(isStanceMatterGenerationActive(makeState({ autonomy: 1 }))).toBe(false);
        expect(isStanceMatterGenerationActive(makeState({ autonomy: 3 }))).toBe(false);
    });

    it('headless runs never write any stance-matter field', () => {
        const state = makeState({ headless: true });
        runTurn(state, {});
        runTurn(state, { c_a: 'offensive' });
        runTurn(state, { c_a: 'defensive' });
        expect(state.meta.stance_matters).toBeUndefined();
        expect(state.meta.stance_matter_history).toBeUndefined();
        expect(state.military.stance_matter_state).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

describe('stance matters: generation', () => {
    it('raises no matter on the first turn (no baseline) and one for a real change after', () => {
        const state = makeState();
        runTurn(state, {});
        expect(state.meta.stance_matters).toBeUndefined();
        runTurn(state, { c_a: 'offensive' });
        expect(state.meta.stance_matters?.map((m) => m.id)).toEqual(['STANCE_11_c_a']);
        const matter = state.meta.stance_matters![0]!;
        expect(matter.from_stance).toBe('balanced');
        expect(matter.to_stance).toBe('offensive');
        expect(matter.deadline_turn).toBe(12);
        expect(matter.commander_officer_id).toBe('co_a');
        expect(matter.constraint_options).toEqual(['ceiling_balanced', 'ceiling_defensive']);
        expect(matter.countermand_allowed).toBe(true);
    });

    it('no matter when the stance did not change, nor for a president-caused change', () => {
        const state = makeState();
        runTurn(state, {});
        state.military.corps_command!.c_b!.active_operations.push({ started_turn: 11, authored_by_player: true } as never);
        runTurn(state, { c_a: 'balanced', c_b: 'offensive' });
        expect(state.meta.stance_matters).toBeUndefined();
    });

    it('an army-wide stance governs combat, so the change is recorded not_put (army_stance)', () => {
        const state = makeState();
        runTurn(state, {});
        state.military.army_stance = { RBiH: 'general_offensive' } as never;
        runTurn(state, { c_a: 'offensive' });
        expect(state.meta.stance_matters).toBeUndefined();
        expect(state.meta.stance_matter_history?.[0]).toMatchObject({ outcome: 'not_put', not_put_reason: 'army_stance' });
    });

    it('caps at three matters a turn and records the rest as not_put (cap)', () => {
        const state = makeState();
        runTurn(state, {});
        runTurn(state, { c_a: 'offensive', c_b: 'defensive', c_c: 'offensive', c_d: 'defensive' });
        expect(state.meta.stance_matters).toHaveLength(3);
        expect(state.meta.stance_matter_history?.filter((r) => r.not_put_reason === 'cap')).toHaveLength(1);
    });

    it('groups not_put changes into one Records line per corps, scope and reason per turn', () => {
        const state = makeState();
        state.military.corps_front_sectors = {
            'sector:c_a:0': sector('sector:c_a:0', 'c_a', 'RBiH', 'defend', ['a1', 'a2']),
            'sector:c_a:1': sector('sector:c_a:1', 'c_a', 'RBiH', 'defend', ['b1', 'b2']),
            'sector:c_a:2': sector('sector:c_a:2', 'c_a', 'RBiH', 'defend', ['c1', 'c2']),
        };
        runTurn(state, {});
        for (const id of ['sector:c_a:0', 'sector:c_a:1', 'sector:c_a:2']) state.military.corps_front_sectors[id]!.sector_stance = 'active_defense';
        runTurn(state, {});
        expect(state.meta.stance_matters?.filter((m) => m.scope === 'og')).toHaveLength(1);
        const grouped = state.meta.stance_matter_history?.filter((r) => r.outcome === 'not_put');
        expect(grouped).toHaveLength(1);
        expect(grouped![0]).toMatchObject({ scope: 'og', not_put_reason: 'cooldown', not_put_count: 2 });
    });

    it('cools a corps down for four turns after a matter (not_put: cooldown)', () => {
        const state = makeState();
        runTurn(state, {});
        runTurn(state, { c_a: 'offensive' });
        runTurn(state, { c_a: 'balanced' });
        expect(state.meta.stance_matters ?? []).toEqual([]);
        expect(state.meta.stance_matter_history?.some((r) => r.id === 'STANCE_12_c_a' && r.not_put_reason === 'cooldown')).toBe(true);
    });

    it('is idempotent on a same-turn re-run (no duplicate ids)', () => {
        const state = makeState();
        runTurn(state, {});
        state.military.corps_command!.c_a!.stance = 'offensive';
        generateStanceMatters(state, 'RBiH', new Map());
        state.military.stance_matter_state!.last_corps_stance.c_a = 'balanced';
        state.military.stance_matter_state!.cooldown_until_by_corps = {};
        generateStanceMatters(state, 'RBiH', new Map());
        expect(state.meta.stance_matters?.map((m) => m.id)).toEqual(['STANCE_11_c_a']);
    });

    it('is deterministic under shuffled corps insertion order', () => {
        const a = makeState({ corpsStances: { c_a: 'balanced', c_b: 'balanced', c_c: 'balanced', c_d: 'balanced' } });
        const b = makeState({ corpsStances: { c_d: 'balanced', c_c: 'balanced', c_b: 'balanced', c_a: 'balanced' } });
        for (const s of [a, b]) {
            runTurn(s, {});
            runTurn(s, { c_a: 'offensive', c_b: 'defensive', c_c: 'offensive', c_d: 'reorganize' });
        }
        expect(JSON.stringify(a.meta.stance_matters)).toBe(JSON.stringify(b.meta.stance_matters));
        expect(JSON.stringify(a.meta.stance_matter_history)).toBe(JSON.stringify(b.meta.stance_matter_history));
    });
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function stateWithMatter(opts: Opts = {}): GameState {
    const state = makeState(opts);
    runTurn(state, {});
    runTurn(state, { c_a: 'offensive' });
    return state;
}

describe('stance matters: resolution', () => {
    it('silence: the matter lapses as stood and resolution changes nothing outside its own records', () => {
        const state = stateWithMatter();
        const before = strip(state);
        resolveStanceMatters(state);
        expect(state.meta.stance_matter_history?.find((r) => r.id === 'STANCE_11_c_a')?.outcome).toBe('stood');
        expect(state.meta.stance_matters).toBeUndefined();
        expect(strip(state)).toEqual(before);
    });

    it('confirm: recorded, no hold, no cost', () => {
        const state = stateWithMatter();
        expect(recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'confirm' })).toEqual({ ok: true });
        runTurn(state, { c_a: 'offensive' });
        expect(state.meta.stance_matter_history?.find((r) => r.id === 'STANCE_11_c_a')?.outcome).toBe('confirmed');
        expect(state.military.stance_matter_state?.holds).toEqual([]);
        expect(state.military.named_officers!.co_a!.recent_overrides).toBeUndefined();
    });

    it('countermand: holds the previous stance for four turns from effective-from, then releases', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        const stances: CorpsStance[] = [];
        for (let i = 0; i < STANCE_HOLD_TURNS + 1; i += 1) {
            runTurn(state, { c_a: 'offensive' });
            stances.push(state.military.corps_command!.c_a!.stance);
        }
        expect(stances).toEqual(['balanced', 'balanced', 'balanced', 'balanced', 'offensive']);
        expect(state.meta.stance_matter_history?.find((r) => r.id === 'STANCE_11_c_a')).toMatchObject({
            outcome: 'countermanded', effective_from_turn: 12, until_turn: 15, main_staff_delay_turns: 0,
        });
        // Overrule cost: recent_overrides only, never the cowing fields.
        const officer = state.military.named_officers!.co_a!;
        expect(officer.recent_overrides).toEqual([{ turn: 12, resolution: 'override' }]);
        expect(officer.override_count).toBeUndefined();
        expect(officer.last_override_turn).toBeUndefined();
        expect(officer.cowed_until_turn).toBeUndefined();
    });

    it('constrain: ceiling defensive caps the commander, and is the last writer', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'constrain', constraint: 'ceiling_defensive' });
        runTurn(state, { c_a: 'offensive' });
        expect(state.military.corps_command!.c_a!.stance).toBe('defensive');
        expect(corpsHoldForbidsNewOffensive(state, 'c_a', state.meta.turn - 1)).toBe(true);
    });

    it('a hold never overrides reorganize', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        runTurn(state, { c_a: 'reorganize' });
        expect(state.military.corps_command!.c_a!.stance).toBe('reorganize');
    });

    it('caps the combat-effective stance under an army general offensive (inert without a hold)', () => {
        const state = stateWithMatter();
        state.military.army_stance = { RBiH: 'general_offensive' } as never;
        expect(getEffectiveCorpsStance(state, 'c_a')).toBe('offensive');
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'constrain', constraint: 'ceiling_balanced' });
        runTurn(state, { c_a: 'offensive' });
        state.meta.turn -= 1;
        expect(getEffectiveCorpsStance(state, 'c_a')).toBe('balanced');
        expect(capEffectiveStanceByHold(makeState(), 'c_a', 'offensive')).toBe('offensive');
    });

    it('rejects a malformed or out-of-option constraint at the IPC', () => {
        const state = stateWithMatter();
        expect(recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'constrain', constraint: 'no_active_defense' }))
            .toEqual({ ok: false, error: 'invalid_constraint' });
        expect(recordStanceMatterAnswer(state, { matterId: 'nope', answer: 'confirm' })).toEqual({ ok: false, error: 'not_found' });
        state.meta.autonomy_level = 1;
        expect(recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'confirm' })).toEqual({ ok: false, error: 'autonomy_level_not_2' });
    });

    it('overrule window: after an overrule, that corps gets Confirm only for eight turns (survives a level round trip)', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        runTurn(state, { c_a: 'offensive' }); // t12: hold written
        state.meta.autonomy_level = 1;
        runTurn(state, { c_a: 'offensive' }); // t13: level 1, hold ends
        state.meta.autonomy_level = 2;
        runTurn(state, { c_a: 'offensive' }); // t14
        runTurn(state, { c_a: 'defensive' }); // t15: new matter
        const matter = state.meta.stance_matters?.find((m) => m.corps_id === 'c_a');
        expect(matter?.countermand_allowed).toBe(false);
        expect(matter?.constraint_options).toEqual([]);
        expect(recordStanceMatterAnswer(state, { matterId: matter!.id, answer: 'countermand' })).toEqual({ ok: false, error: 'overrule_window' });
        // A repeat overrule is never better than a confirm: none is possible.
        expect(state.military.named_officers!.co_a!.cowed_until_turn).toBeUndefined();
    });

    it('level change: open answers lapse as answered_lapsed (never stood) and holds end', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        state.meta.autonomy_level = 1;
        runTurn(state, { c_a: 'offensive' });
        expect(state.meta.stance_matter_history?.find((r) => r.id === 'STANCE_11_c_a')?.outcome).toBe('answered_lapsed');
        expect(state.military.stance_matter_state?.holds).toEqual([]);
    });

    it('the president\'s own operation order ends his hold', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        runTurn(state, { c_a: 'offensive' });
        clearCorpsHoldsForPresidentialOperation(state, 'c_a', state.meta.turn);
        expect(state.military.stance_matter_state?.holds).toEqual([]);
        expect(state.meta.stance_matter_history?.some((r) => r.outcome === 'hold_lapsed' && r.lapse_reason === 'presidential_operation')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Faction asymmetry
// ---------------------------------------------------------------------------

describe('stance matters: faction asymmetry (data only)', () => {
    it('RS: Main Staff resistance 1.0 x 5 delays an overrule by two turns; the commander\'s stance holds meanwhile', () => {
        const state = stateWithMatter({ faction: 'RS', stubbornness: 5 });
        expect(computeMainStaffDelayTurns(state, 'RS')).toBe(2);
        expect(state.meta.stance_matters![0]!.main_staff_delay_turns).toBe(2);
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        const stances: CorpsStance[] = [];
        for (let i = 0; i < 3; i += 1) { runTurn(state, { c_a: 'offensive' }); stances.push(state.military.corps_command!.c_a!.stance); }
        expect(stances).toEqual(['offensive', 'offensive', 'balanced']);
        expect(state.meta.stance_matter_history?.find((r) => r.id === 'STANCE_11_c_a')).toMatchObject({ effective_from_turn: 14, until_turn: 17 });
    });

    it('RBiH: 0.5 x 4 stays below threshold, so the order is followed at once', () => {
        expect(computeMainStaffDelayTurns(makeState({ faction: 'RBiH', stubbornness: 4 }), 'RBiH')).toBe(0);
    });

    it('missing army-commander stubbornness counts as followed (no implicit RS delay)', () => {
        const state = makeState({ faction: 'RS' });
        (state.military.named_officer_data![0] as { stubbornness?: number }).stubbornness = undefined;
        expect(computeMainStaffDelayTurns(state, 'RS')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// OGs
// ---------------------------------------------------------------------------

describe('stance matters: OG fingerprints and holds', () => {
    it('FNV-1a is fixed and fingerprints are sorted, de-duplicated hex', () => {
        expect(fnv1a32Hex('')).toBe('811c9dc5');
        expect(fnv1a32Hex('a')).toBe('e40c292c');
        expect(sectorFingerprint({ edge_ids: ['b', 'a', 'a'] })).toEqual([fnv1a32Hex('a'), fnv1a32Hex('b')].sort());
    });

    it('matching is one-to-one and independent of sector order', () => {
        const recorded = [{ corps_id: 'c_a', fingerprint: ['1', '2', '3'] }, { corps_id: 'c_a', fingerprint: ['7', '8', '9'] }];
        const cur1 = [
            { sector_id: 's0', corps_id: 'c_a', fingerprint: ['1', '2', '3', '4'] },
            { sector_id: 's1', corps_id: 'c_a', fingerprint: ['1', '2', '3'] },
            { sector_id: 's2', corps_id: 'c_a', fingerprint: ['7', '8'] },
        ];
        const m1 = matchSectorsToRecorded(cur1, recorded);
        const m2 = matchSectorsToRecorded([...cur1].reverse(), recorded);
        expect([...m1.entries()].sort()).toEqual([...m2.entries()].sort());
        expect(m1.get('s1')).toBe(0);
        expect(m1.has('s0')).toBe(false);
        expect(m1.get('s2')).toBe(1);
    });

    it('raises an OG matter across a renumbering rebuild and holds it; dissolution lapses the hold', () => {
        const state = makeState();
        state.military.corps_front_sectors = { 'sector:c_a:0': sector('sector:c_a:0', 'c_a', 'RBiH', 'defend', ['e1', 'e2', 'e3']) };
        runTurn(state, {});
        // Rebuild renumbers the same front to index 3 and the commander goes to active defense.
        state.military.corps_front_sectors = { 'sector:c_a:3': sector('sector:c_a:3', 'c_a', 'RBiH', 'active_defense', ['e1', 'e2', 'e3']) };
        runTurn(state, {});
        const matter = state.meta.stance_matters?.find((m) => m.scope === 'og');
        expect(matter).toMatchObject({ sector_id: 'sector:c_a:3', from_stance: 'defend', to_stance: 'active_defense', reason: 'enemy_massing' });
        expect(matter!.constraint_options).toEqual(['no_active_defense', 'hold_no_counterattacks']);
        recordStanceMatterAnswer(state, { matterId: matter!.id, answer: 'constrain', constraint: 'hold_no_counterattacks' });
        resolveStanceMatters(state);
        clampHeldOgStances(state, 'RBiH');
        expect(state.military.corps_front_sectors['sector:c_a:3']!.sector_stance).toBe('defend');
        // A live operation in the OG suspends the clamp for that turn.
        state.military.corps_front_sectors['sector:c_a:3']!.sector_stance = 'active_defense';
        state.military.corps_command!.c_a!.active_operations.push({ sector_id: 'sector:c_a:3', phase: 'execution' } as never);
        clampHeldOgStances(state, 'RBiH');
        expect(state.military.corps_front_sectors['sector:c_a:3']!.sector_stance).toBe('active_defense');
        expect(state.military.stance_matter_state!.holds[0]!.suspended_turn).toBe(state.meta.turn);
        // Dissolution.
        state.military.corps_front_sectors = { 'sector:c_a:0': sector('sector:c_a:0', 'c_a', 'RBiH', 'defend', ['x1', 'x2']) };
        clampHeldOgStances(state, 'RBiH');
        expect(state.military.stance_matter_state!.holds).toEqual([]);
        expect(state.meta.stance_matter_history?.some((r) => r.lapse_reason === 'og_dissolved')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Save, manifest, inertness, firewall
// ---------------------------------------------------------------------------

describe('stance matters: save, manifest, inertness, attribution firewall', () => {
    it('round-trips through canonical serialization', () => {
        const state = stateWithMatter();
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        runTurn(state, { c_a: 'offensive' });
        (state.political as unknown as Record<string, unknown>).political_controllers = {};
        const once = serializeGameState(state);
        expect(serializeGameState(JSON.parse(once))).toBe(once);
        expect(JSON.parse(once).military.stance_matter_state.holds).toHaveLength(1);
    });

    it('an open matter is advisory and never blocks Advance', () => {
        const state = stateWithMatter();
        const family = summarizePlayerDecisions(state as never, 'RBiH').families.find((f) => f.id === 'stance_matter');
        expect(family?.count).toBe(1);
        expect(family?.blockingCount).toBe(0);
        expect(countBlockingPlayerDecisions(state as never, 'RBiH')).toBe(0);
    });

    it('no answers over many turns: everything outside the three fields equals the no-president path', () => {
        const live = makeState();
        const bot = makeState({ player: null });
        const script: Array<Record<string, CorpsStance>> = [
            {}, { c_a: 'offensive' }, { c_b: 'defensive' }, { c_a: 'balanced', c_c: 'offensive' },
            { c_d: 'reorganize' }, { c_a: 'offensive', c_b: 'balanced' }, {}, { c_c: 'defensive', c_d: 'balanced' },
        ];
        for (const stances of script) {
            runTurn(live, stances);
            for (const [id, st] of Object.entries(stances)) bot.military.corps_command![id]!.stance = st;
            bot.meta.turn += 1;
        }
        expect((live.meta.stance_matter_history ?? []).length).toBeGreaterThan(0);
        const a = strip(live) as GameState;
        const b = strip(bot) as GameState;
        a.meta.player_faction = undefined;
        b.meta.player_faction = undefined;
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('refreshes baselines at any level for a live president, and never for headless', () => {
        const live = makeState({ autonomy: 0 });
        refreshStanceBaselines(live, 'RBiH');
        expect(live.military.stance_matter_state?.last_corps_stance).toEqual({ c_a: 'balanced', c_b: 'balanced', c_c: 'balanced', c_d: 'balanced' });
        const headless = makeState({ headless: true });
        refreshStanceBaselines(headless, 'RBiH');
        expect(headless.military.stance_matter_state).toBeUndefined();
    });

    it('no grade, condemnation, attribution or verdict module reads stance-matter state', () => {
        // Grade, verdict, condemnation and attribution owners (src/sim/negotiation/scoring.ts
        // computeFullVerdict; endgame cost ledger; event condemnation flags).
        const roots = ['src/sim/endgame', 'src/sim/negotiation', 'src/sim/events', 'src/sim/codex'];
        const offenders: string[] = [];
        const walk = (dir: string): void => {
            let entries: string[];
            try { entries = readdirSync(dir); } catch { return; }
            for (const entry of entries) {
                const path = join(dir, entry);
                if (statSync(path).isDirectory()) { walk(path); continue; }
                if (!/\.(ts|cjs|js)$/.test(entry)) continue;
                const text = readFileSync(path, 'utf8');
                if (/stance_matter|stance_matters\.js|stanceMatter/.test(text)) offenders.push(path);
            }
        };
        for (const root of roots) walk(root);
        expect(offenders).toEqual([]);
    });

    it('the verdict is identical with and without stance-matter records and holds', () => {
        const state = stateWithMatter({ faction: 'RS', stubbornness: 5 });
        recordStanceMatterAnswer(state, { matterId: 'STANCE_11_c_a', answer: 'countermand' });
        runTurn(state, { c_a: 'offensive' });
        expect(state.military.stance_matter_state?.holds.length).toBe(1);
        const verdictOf = (s: unknown): string => {
            try { return JSON.stringify(computeFullVerdict(s as GameState)); } catch (err) { return `throws:${(err as Error).message}`; }
        };
        expect(verdictOf(state)).toBe(verdictOf(strip(state)));
    });
});
