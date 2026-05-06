/**
 * LANE-NIGHTSHIFT-C2-CORPS-DIRECTIVE-TELEMETRY-SURFACE
 *
 * DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
 * (57cec91c) — Q3 + Q5.
 * Predecessors: A3 c8ff93d8 • B1 44053a32 • B2 d019bef7 • C1 5084071d
 *
 * C2 ships the telemetry surface that closes the chain
 *   `B2 → B1 → A3 → C1 → bot_corps_orders`
 * for the post-run panel. Three event types per DDR Q3:
 *   1. army_directive_application — per (faction × corps × turn).
 *   2. corps_role_overlay_count — weekly aggregate per faction.
 *   3. political_directive_chain_active — turn-end assertion when both B1
 *      producer fired AND A3 persisted ≥1 corps_directive that turn.
 *
 * Channel: side-channel JSONL at
 *   data/derived/_debug/c_lane_corps_directive_telemetry.jsonl
 * (gitignored). Mirrors the corps_front_sectors.ts perf-instrumentation
 * precedent. Post-run panel reads this file directly.
 *
 * CRITICAL byte-stability invariants:
 *   • C2 NEVER mutates GameState — `final_state_hash` byte-identical with
 *     C2 enabled vs. disabled.
 *   • C2 NEVER writes to weekly_report.jsonl — that file is byte-identical
 *     with C2 enabled vs. disabled.
 *   • Env flag `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` short-
 *     circuits all three emissions.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    applyArmyDirectiveInterpretation,
    isC2TelemetryDisabled,
    __c2TelemetryTestHooks,
    type PoliticalDirective,
} from '../src/sim/combat/army_order_interpretation.js';

// ---------------------------------------------------------------------------
// Helpers — fixture builders shared across all tests in this file.
// ---------------------------------------------------------------------------

function stripComments(src: string): string {
    let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
    out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return out;
}

function makeOfficerData(overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id: 'fixture_army_a',
        name: 'Fixture Army Commander',
        faction: 'RS',
        rank: 'army_commander',
        competence: 5,
        aggressiveness: 2,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: true,
        improvement_rate: 0.01,
        pool_tier: 'starter',
        // High competence + low stubbornness → FULL compliance, no deviation.
        stubbornness: 1,
        ...overrides,
    } as NamedOfficer;
}

function makeOfficerState(overrides: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: 'fixture_army_a',
        status: 'active',
        assigned_corps_id: null,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
        ...overrides,
    } as NamedOfficerState;
}

function makeStateWithArmyCO(
    faction: FactionId,
    officerOverrides: Partial<NamedOfficer> = {},
    officerStateOverrides: Partial<NamedOfficerState> = {},
    turn = 10,
    corpsCount = 2,
): GameState {
    const officerData = makeOfficerData({ faction, ...officerOverrides });
    const officerState = makeOfficerState({ officer_id: officerData.id, ...officerStateOverrides });

    const formations: Record<string, { id: string; faction: FactionId; name: string; created_turn: number; status: 'active' }> = {};
    const corpsCommand: Record<string, {
        command_span: number; subordinate_count: number; og_slots: number;
        active_ogs: never[]; corps_exhaustion: number; stance: string; active_operations: never[];
    }> = {};
    for (let i = 0; i < corpsCount; i++) {
        const corpsId = `${faction}_corps_${String.fromCharCode(97 + i)}`;
        formations[corpsId] = { id: corpsId, faction, name: corpsId, created_turn: 0, status: 'active' };
        corpsCommand[corpsId] = {
            command_span: 1,
            subordinate_count: 0,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
            active_operations: [],
        };
    }

    return {
        meta: { turn, phase: 'war' },
        political: { political_controllers: {} },
        military: {
            formations,
            corps_command: corpsCommand,
            named_officer_data: [officerData],
            named_officers: { [officerData.id]: officerState },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

function injectDirective(state: GameState, faction: FactionId, directive: PoliticalDirective): void {
    type LooseMilitary = GameState['military'] & {
        political_directives_by_faction?: Record<string, PoliticalDirective>;
    };
    const mil = state.military as LooseMilitary;
    if (!mil.political_directives_by_faction) {
        mil.political_directives_by_faction = {};
    }
    mil.political_directives_by_faction[faction] = directive;
}

function readPersistedSlot(state: GameState): Record<string, Record<string, unknown>> | undefined {
    type LooseMilitary = GameState['military'] & {
        army_corps_directives_by_faction?: Record<string, Record<string, unknown>>;
    };
    return (state.military as LooseMilitary).army_corps_directives_by_faction;
}

/** Hash a state object (after deep-stringify with sorted keys). */
function deepStableStringify(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(deepStableStringify).join(',') + ']';
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + deepStableStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Redirect C2 output to a per-test temp directory by chdir'ing to a tmp cwd.
 * Returns the absolute output path (which the test can later read).
 */
let _origCwd: string | null = null;
let _testTmpDir: string | null = null;

function setupTmpCwd(): string {
    _origCwd = process.cwd();
    _testTmpDir = mkdtempSync(join(tmpdir(), 'c2-telem-'));
    process.chdir(_testTmpDir);
    return join(_testTmpDir, 'data', 'derived', '_debug', 'c_lane_corps_directive_telemetry.jsonl');
}

function teardownTmpCwd(): void {
    if (_origCwd) {
        process.chdir(_origCwd);
        _origCwd = null;
    }
    if (_testTmpDir) {
        try {
            rmSync(_testTmpDir, { recursive: true, force: true });
        } catch {
            // Best-effort cleanup; not fatal.
        }
        _testTmpDir = null;
    }
}

beforeEach(() => {
    delete process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED;
    delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
    __c2TelemetryTestHooks.closeTurn();
});

afterEach(() => {
    delete process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED;
    delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
    __c2TelemetryTestHooks.closeTurn();
    teardownTmpCwd();
});

// ===========================================================================
// T1 — `army_directive_application` event emitted per persisted corps_directive.
// ===========================================================================
describe('C2 — T1 army_directive_application per persisted corps_directive', () => {
    it('T1 — one application event per (faction × corps) when A3 persists', () => {
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
        injectDirective(state, 'RS', {
            verb: 'HOLD_AT_ALL_COSTS',
            target_corps_id: 'RS_corps_a',
            directive_id: 'pol-rs-t10',
        });

        applyArmyDirectiveInterpretation(state);

        // C1 must have persisted 2 corps directives.
        const slot = readPersistedSlot(state);
        expect(slot!['RS']!['RS_corps_a']).toBeDefined();
        expect(slot!['RS']!['RS_corps_b']).toBeDefined();

        // The side-channel JSONL must contain exactly 2 application events.
        expect(existsSync(outPath)).toBe(true);
        const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
        const apps = lines
            .map(l => JSON.parse(l) as Record<string, unknown>)
            .filter(e => e.event_type === 'army_directive_application');
        expect(apps).toHaveLength(2);
        // First app: target corps → role 'primary'.
        const aApp = apps.find(a => a.corps_id === 'RS_corps_a')!;
        expect(aApp.faction).toBe('RS');
        expect(aApp.directive_verb).toBe('HOLD_AT_ALL_COSTS');
        expect(aApp.role_overlay).toBe('primary');
        expect(aApp.source_political_directive_id).toBe('pol-rs-t10');
        expect(aApp.turn).toBe(10);
        // Second app: non-target corps → role 'economy'.
        const bApp = apps.find(a => a.corps_id === 'RS_corps_b')!;
        expect(bApp.role_overlay).toBe('economy');
    });
});

// ===========================================================================
// T2 — `corps_role_overlay_count` weekly aggregate matches sum of T1 events.
// ===========================================================================
describe('C2 — T2 weekly aggregate matches sum of applications', () => {
    it('T2 — by_role counts equal the application-event tally', () => {
        const outPath = setupTmpCwd();
        // Officer aggressiveness=4 → preferred verb 'PRESS_OFFENSIVE' → alignment=+1
        // → score = (5+4)/10 + 0.20 = 1.10 → clamped to 1.0 → FULL → no deviation.
        // So PRESS_OFFENSIVE produces target='primary', non-target='secondary' raw.
        const state = makeStateWithArmyCO('RBiH', { competence: 5, stubbornness: 1, aggressiveness: 4 }, {}, 22, 3);
        injectDirective(state, 'RBiH', {
            verb: 'PRESS_OFFENSIVE',
            target_corps_id: 'RBiH_corps_a',
            directive_id: 'pol-rbih-t22',
        });

        applyArmyDirectiveInterpretation(state);

        const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
        const events = lines.map(l => JSON.parse(l) as Record<string, unknown>);
        const apps = events.filter(e => e.event_type === 'army_directive_application');
        const aggs = events.filter(e => e.event_type === 'corps_role_overlay_count');

        expect(aggs).toHaveLength(1);
        const agg = aggs[0]! as { faction: string; count: number; by_role: Record<string, number> };
        expect(agg.faction).toBe('RBiH');
        expect(agg.count).toBe(apps.length);
        // FULL compliance + PRESS_OFFENSIVE → target=primary, non-target=secondary.
        // 3 corps total: 1 primary + 2 secondary.
        expect(agg.by_role.primary).toBe(1);
        expect(agg.by_role.secondary).toBe(2);
        expect(agg.by_role.contain).toBe(0);
        expect(agg.by_role.economy).toBe(0);

        // Sum-of-applications cross-check (the binding T2 assertion — agg
        // tally must equal the actual application-event tally regardless of
        // the specific role distribution).
        const tally = { primary: 0, secondary: 0, contain: 0, economy: 0 } as Record<string, number>;
        for (const app of apps) {
            const role = (app.role_overlay as string);
            tally[role] = (tally[role] ?? 0) + 1;
        }
        expect(tally).toEqual(agg.by_role);
    });
});

// ===========================================================================
// T3 — `political_directive_chain_active` only when both producer fired +
//      A3 persisted ≥1 directive in same turn.
// ===========================================================================
describe('C2 — T3 chain-active emitted only when chain is wired', () => {
    it('T3 — emitted when one faction has a directive AND ≥1 corps was persisted', () => {
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('HRHB', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 30, 2);
        injectDirective(state, 'HRHB', {
            verb: 'BALANCE_FRONTS',
            target_corps_id: 'HRHB_corps_a',
            directive_id: 'pol-hrhb-t30',
        });

        applyArmyDirectiveInterpretation(state);

        const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
        const chainEvents = lines
            .map(l => JSON.parse(l) as Record<string, unknown>)
            .filter(e => e.event_type === 'political_directive_chain_active');
        expect(chainEvents).toHaveLength(1);
        const ce = chainEvents[0]! as { factions_with_active_chain: string[]; turn: number };
        expect(ce.turn).toBe(30);
        expect(ce.factions_with_active_chain).toEqual(['HRHB']);
    });

    it('T3b — NOT emitted when no faction had a political directive (B1 producer silent)', () => {
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 5, 2);
        // No directive injected → B1 producer "silent" → A3 short-circuits.

        applyArmyDirectiveInterpretation(state);

        // File may or may not exist; either way, no chain_active event.
        if (!existsSync(outPath)) return;
        const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
        const chainEvents = lines
            .map(l => JSON.parse(l) as Record<string, unknown>)
            .filter(e => e.event_type === 'political_directive_chain_active');
        expect(chainEvents).toHaveLength(0);
    });

    it('T3c — multi-faction: chain-active lists exactly the factions with directives', () => {
        const outPath = setupTmpCwd();
        // Build a single state with army COs for ALL three factions and inject
        // directives for two of them.
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 40, 1);
        // Add HRHB officer + corps + directive.
        const hrhbOfficer: NamedOfficer = makeOfficerData({
            id: 'fixture_hrhb_co', name: 'HRHB Co',
            faction: 'HRHB', competence: 5, stubbornness: 1, aggressiveness: 2,
        });
        type LooseMil = GameState['military'] & {
            named_officer_data?: NamedOfficer[]; named_officers?: Record<string, NamedOfficerState>;
            formations?: Record<string, unknown>;
            corps_command?: Record<string, unknown>;
        };
        const mil = state.military as LooseMil;
        mil.named_officer_data!.push(hrhbOfficer);
        mil.named_officers![hrhbOfficer.id] = makeOfficerState({ officer_id: hrhbOfficer.id });
        (mil.formations as Record<string, unknown>)['HRHB_corps_a'] = { id: 'HRHB_corps_a', faction: 'HRHB', name: 'HRHB_corps_a', created_turn: 0, status: 'active' };
        mil.corps_command!['HRHB_corps_a'] = {
            command_span: 1, subordinate_count: 0, og_slots: 0,
            active_ogs: [], corps_exhaustion: 0, stance: 'balanced', active_operations: [],
        };
        injectDirective(state, 'RS', { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'RS_corps_a' });
        injectDirective(state, 'HRHB', { verb: 'BALANCE_FRONTS', target_corps_id: 'HRHB_corps_a' });
        // Note: NO directive for RBiH.

        applyArmyDirectiveInterpretation(state);

        const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
        const chainEvents = lines
            .map(l => JSON.parse(l) as Record<string, unknown>)
            .filter(e => e.event_type === 'political_directive_chain_active');
        expect(chainEvents).toHaveLength(1);
        const ce = chainEvents[0]! as { factions_with_active_chain: string[] };
        // Sorted alphabetically: ['HRHB','RS'] (RBiH absent).
        expect(ce.factions_with_active_chain).toEqual(['HRHB', 'RS']);
    });
});

// ===========================================================================
// T4 — env flag `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` short-
//      circuits ALL 3 emissions.
// ===========================================================================
describe('C2 — T4 env flag short-circuits all emissions', () => {
    it('T4 — flag set: side-channel JSONL is not written', () => {
        process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED = 'true';
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
        injectDirective(state, 'RS', { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'RS_corps_a' });

        applyArmyDirectiveInterpretation(state);

        // C1 still ran (consumer flag NOT set), so the persist slot exists.
        expect(readPersistedSlot(state)).toBeDefined();
        // But the C2 side-channel JSONL must NOT have been created.
        expect(existsSync(outPath)).toBe(false);
    });

    it('T4b — `isC2TelemetryDisabled()` reflects the env flag', () => {
        delete process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED;
        expect(isC2TelemetryDisabled()).toBe(false);
        process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED = 'true';
        expect(isC2TelemetryDisabled()).toBe(true);
        // Any other value does NOT enable disabling (must be exactly 'true').
        process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED = 'yes';
        expect(isC2TelemetryDisabled()).toBe(false);
    });
});

// ===========================================================================
// T5 — env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` (C1's flag)
//      implicitly suppresses C2 events (no persist → no application event).
// ===========================================================================
describe('C2 — T5 C1 disable transitively silences C2', () => {
    it('T5 — C1 flag suppresses persist; C2 never records applications', () => {
        process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED = 'true';
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
        injectDirective(state, 'RS', { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'RS_corps_a' });

        applyArmyDirectiveInterpretation(state);

        // C1 short-circuited → no persist slot.
        expect(readPersistedSlot(state)).toBeUndefined();
        // C2 had nothing to record → no JSONL.
        expect(existsSync(outPath)).toBe(false);
    });
});

// ===========================================================================
// T6 — Determinism: re-run produces byte-identical event sequence.
// ===========================================================================
describe('C2 — T6 determinism', () => {
    it('T6 — repeated runs produce byte-identical JSONL output', () => {
        const runOnce = (): string => {
            const outPath = setupTmpCwd();
            const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 3);
            injectDirective(state, 'RS', {
                verb: 'PRESS_OFFENSIVE',
                target_corps_id: 'RS_corps_a',
                directive_id: 'pol-determinism',
            });
            applyArmyDirectiveInterpretation(state);
            const out = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
            teardownTmpCwd();
            return out;
        };

        const a = runOnce();
        const b = runOnce();
        const c = runOnce();
        expect(a.length).toBeGreaterThan(0);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });
});

// ===========================================================================
// T7 — Faction-symmetric: same emission code path for RBiH/RS/HRHB.
// ===========================================================================
describe('C2 — T7 faction-symmetric emission', () => {
    it('T7 — same input shape across factions yields same event-type sequence', () => {
        const factions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
        const sequences: string[] = [];
        for (const faction of factions) {
            const outPath = setupTmpCwd();
            const state = makeStateWithArmyCO(faction, { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
            injectDirective(state, faction, {
                verb: 'HOLD_AT_ALL_COSTS',
                target_corps_id: `${faction}_corps_a`,
                directive_id: `pol-${faction}-t10`,
            });
            applyArmyDirectiveInterpretation(state);
            const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
            const events = lines.map(l => JSON.parse(l) as Record<string, unknown>);
            // Strip the faction-specific id fields to compare the structural shape.
            const normalized = events.map(e => {
                const { faction: _f, corps_id: _c, source_political_directive_id: _s, factions_with_active_chain: _fc, ...rest } = e;
                void _f; void _c; void _s; void _fc;
                return rest;
            });
            sequences.push(JSON.stringify(normalized));
            teardownTmpCwd();
        }
        expect(sequences[0]).toBe(sequences[1]);
        expect(sequences[1]).toBe(sequences[2]);
    });
});

// ===========================================================================
// T8 — Backward-compat: pre-C2 saves load + run without missing-field errors.
// ===========================================================================
describe('C2 — T8 backward compatibility', () => {
    it('T8 — pre-C2 state (no political_directives_by_faction slot) runs cleanly', () => {
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
        // Do NOT inject a directive — simulates a pre-C2 / pre-B1 state.
        expect(() => applyArmyDirectiveInterpretation(state)).not.toThrow();
        // No persist (no directive) → no telemetry → no file.
        expect(existsSync(outPath)).toBe(false);
    });

    it('T8b — missing army CO does not crash telemetry path', () => {
        const outPath = setupTmpCwd();
        const state = makeStateWithArmyCO('RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2);
        // Strip the army CO from named_officer_data → getArmyCommander returns null.
        type LooseMil = GameState['military'] & { named_officer_data?: NamedOfficer[] };
        (state.military as LooseMil).named_officer_data = [];
        injectDirective(state, 'RS', { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'RS_corps_a' });

        expect(() => applyArmyDirectiveInterpretation(state)).not.toThrow();
        // The interpretArmyDirective "no commander" path still produces corps_directives,
        // which C1 persists, which C2 records. So a JSONL line is expected.
        // We tolerate either outcome — the contract is "does not throw".
        if (existsSync(outPath)) {
            const lines = readFileSync(outPath, 'utf8').trim().split('\n').filter(Boolean);
            expect(lines.length).toBeGreaterThan(0);
        }
    });
});

// ===========================================================================
// T9 — Telemetry-only invariance: game state hash unchanged whether C2
//      enabled or disabled.
// ===========================================================================
describe('C2 — T9 telemetry-only invariance', () => {
    it('T9 — final state byte-identical with C2 enabled vs disabled', () => {
        const buildState = (): GameState => makeStateWithArmyCO(
            'RS', { competence: 5, stubbornness: 1, aggressiveness: 2 }, {}, 10, 2,
        );
        const buildAndRun = (telemetryDisabled: boolean): string => {
            if (telemetryDisabled) {
                process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED = 'true';
            } else {
                delete process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED;
            }
            setupTmpCwd();
            const state = buildState();
            injectDirective(state, 'RS', {
                verb: 'HOLD_AT_ALL_COSTS',
                target_corps_id: 'RS_corps_a',
                directive_id: 'pol-rs-t10',
            });
            applyArmyDirectiveInterpretation(state);
            // Compare the entire state object after A3+C1 ran.
            const stateRepr = deepStableStringify(state);
            teardownTmpCwd();
            return stateRepr;
        };

        const stateWithTelemetry = buildAndRun(false);
        const stateWithoutTelemetry = buildAndRun(true);
        expect(stateWithTelemetry).toBe(stateWithoutTelemetry);
    });
});

// ===========================================================================
// T10 — Static-grep: no new Math.random / Date.now / timestamps in source.
// ===========================================================================
describe('C2 — T10 determinism guard (static-grep)', () => {
    it('T10 — touched source contains no Math.random / Date.now / new Date / setTimeout', () => {
        const path = resolve('src/sim/combat/army_order_interpretation.ts');
        const stripped = stripComments(readFileSync(path, 'utf8'));
        expect(stripped, 'Math.random').not.toMatch(/Math\.random/);
        expect(stripped, 'Date.now').not.toMatch(/Date\.now/);
        expect(stripped, 'new Date').not.toMatch(/new\s+Date\b/);
        expect(stripped, 'setTimeout/setInterval').not.toMatch(/setTimeout|setInterval/);
    });

    it('T10b — no new pipeline step name introduced', () => {
        const path = resolve('src/sim/turn_phases/war_phases.ts');
        const stripped = stripComments(readFileSync(path, 'utf8'));
        expect(stripped).not.toMatch(/['"]apply-army-directive-telemetry['"]/);
        expect(stripped).not.toMatch(/['"]C2_PIPELINE_STEP_NAME['"]/);
    });

    it('T10c — no per-faction `if (faction === "X")` branches in source', () => {
        const path = resolve('src/sim/combat/army_order_interpretation.ts');
        const stripped = stripComments(readFileSync(path, 'utf8'));
        expect(stripped).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        expect(stripped).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
        expect(stripped).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);
    });

    it('T10d — env flag literal is present in source', () => {
        const path = resolve('src/sim/combat/army_order_interpretation.ts');
        const src = readFileSync(path, 'utf8');
        expect(src).toMatch(/C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED/);
    });
});
