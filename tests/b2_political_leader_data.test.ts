/**
 * LANE-NIGHTSHIFT-B2-POLITICAL-LEADER-DATA-INTEGRATION
 *
 * DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 * (941bd68e + 168d65c2)
 * Predecessors: A1 18136710 • A2 ba6955bf • A3 c8ff93d8 • A4 93c75b1d • B1 44053a32
 *
 * B2 ships canonical political-leader Ring 2 DATA + scenario-init wire-up
 * that populates B1's substrate slots. Once both are populated, B1's
 * `producePoliticalDirective` transitions from always-null to actively
 * emitting verbs consumed by A3 and observable at 188w via A3+A4 telemetry.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { PoliticalDirective } from '../src/sim/combat/army_order_interpretation.js';
import type {
    PoliticalLeaderProfile,
    PoliticalLeaderState,
} from '../src/state/political_leader_types.js';
import {
    loadPoliticalLeaderData,
    applyPoliticalLeaderData,
    applyPoliticalLeaderDataInit,
    isValidLeaderProfile,
    _resetPoliticalLeaderDataCache,
} from '../src/sim/political/political_leader_data_loader.js';
import {
    producePoliticalDirective,
    applyPoliticalDirectiveProducer,
} from '../src/sim/political/political_directive_producer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const CANONICAL_JSON_PATH = resolve('data/scenarios/political_leader_data.json');

beforeEach(() => {
    _resetPoliticalLeaderDataCache();
    delete process.env.B2_POLITICAL_LEADER_DATA_DISABLED;
    delete process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED;
});

afterEach(() => {
    _resetPoliticalLeaderDataCache();
    delete process.env.B2_POLITICAL_LEADER_DATA_DISABLED;
    delete process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED;
});

// ===========================================================================
// T1 — JSON loads with valid schema
// ===========================================================================
describe('B2 — canonical JSON schema', () => {
    it('T1 — JSON loads with three valid faction profiles, numeric fields in [1,5]', () => {
        const data = loadPoliticalLeaderData(CANONICAL_JSON_PATH);
        expect(data).not.toBeNull();
        expect(data!.leaders.length).toBe(3);
        const factions = new Set(data!.leaders.map(l => l.faction));
        expect(factions).toEqual(new Set<FactionId>(['HRHB', 'RBiH', 'RS']));
        for (const leader of data!.leaders) {
            expect(isValidLeaderProfile(leader)).toBe(true);
            expect(leader.hawkishness).toBeGreaterThanOrEqual(1);
            expect(leader.hawkishness).toBeLessThanOrEqual(5);
            expect(leader.flexibility).toBeGreaterThanOrEqual(1);
            expect(leader.flexibility).toBeLessThanOrEqual(5);
            expect(leader.international_sensitivity).toBeGreaterThanOrEqual(1);
            expect(leader.international_sensitivity).toBeLessThanOrEqual(5);
            expect(leader.patron_deference).toBeGreaterThanOrEqual(1);
            expect(leader.patron_deference).toBeLessThanOrEqual(5);
        }
    });

    it('T1b — canonical leader_id values match historical conventions', () => {
        const data = loadPoliticalLeaderData(CANONICAL_JSON_PATH);
        const ids = new Set(data!.leaders.map(l => l.leader_id));
        expect(ids).toEqual(new Set(['rbih_izetbegovic', 'rs_karadzic', 'hrhb_boban']));
    });
});

// ===========================================================================
// T2 — loader populates state.military.political_leader_data
// ===========================================================================
describe('B2 — populates political_leader_data', () => {
    it('T2 — applyPoliticalLeaderDataInit populates state.military.political_leader_data', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const mil = state.military as GameState['military'] & {
            political_leader_data?: PoliticalLeaderProfile[];
        };
        expect(Array.isArray(mil.political_leader_data)).toBe(true);
        expect(mil.political_leader_data!.length).toBe(3);
        const factions = new Set(mil.political_leader_data!.map(p => p.faction));
        expect(factions).toEqual(new Set<FactionId>(['HRHB', 'RBiH', 'RS']));
    });
});

// ===========================================================================
// T3 — loader populates state.military.political_leaders
// ===========================================================================
describe('B2 — populates political_leaders', () => {
    it('T3 — applyPoliticalLeaderDataInit populates per-faction PoliticalLeaderState', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const mil = state.military as GameState['military'] & {
            political_leaders?: Record<string, PoliticalLeaderState>;
        };
        expect(mil.political_leaders).toBeDefined();
        expect(mil.political_leaders!.RBiH).toBeDefined();
        expect(mil.political_leaders!.RBiH.leader_id).toBe('rbih_izetbegovic');
        expect(mil.political_leaders!.RS).toBeDefined();
        expect(mil.political_leaders!.RS.leader_id).toBe('rs_karadzic');
        expect(mil.political_leaders!.HRHB).toBeDefined();
        expect(mil.political_leaders!.HRHB.leader_id).toBe('hrhb_boban');
        // Posture must be derived per profile (Karadžić hawkishness 4.2 → hawkish).
        expect(mil.political_leaders!.RS.current_posture).toBe('hawkish');
    });
});

// ===========================================================================
// T4 — B1 producer fires (returns non-null) when B2 data is loaded
// ===========================================================================
describe('B2 — B1 producer becomes active', () => {
    it('T4 — producePoliticalDirective returns non-null after B2 init for all factions', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const factions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
        for (const faction of factions) {
            const directive = producePoliticalDirective(state, faction);
            expect(directive).not.toBeNull();
            expect(directive!.verb).toBeDefined();
            expect(directive!.directive_id).toContain(faction);
        }
    });

    it('T4b — Karadžić (RS, hawkishness 4.2) emits PRESS_OFFENSIVE by default', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        // Default state: no exhaustion, no IVP, alliance positive — hawkish
        // path dominates.
        (state.political as unknown as { war_alliance_rbih_hrhb: number })
            .war_alliance_rbih_hrhb = 1;
        const d = producePoliticalDirective(state, 'RS');
        expect(d).not.toBeNull();
        expect(d!.verb).toBe('PRESS_OFFENSIVE');
    });
});

// ===========================================================================
// T5 — B1 producer returns null when B-LANE disabled, even with B2 data
// ===========================================================================
describe('B2 — B-lane disable flag dominates', () => {
    it('T5 — B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED=true forces null even with B2 substrate', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED = 'true';
        const d = producePoliticalDirective(state, 'RS');
        expect(d).toBeNull();
    });
});

// ===========================================================================
// T6 — Determinism: re-run produces byte-identical state
// ===========================================================================
describe('B2 — determinism', () => {
    it('T6 — applyPoliticalLeaderDataInit is byte-identical across runs', () => {
        const state1 = makeBaseState();
        applyPoliticalLeaderDataInit(state1, CANONICAL_JSON_PATH);
        const state2 = makeBaseState();
        applyPoliticalLeaderDataInit(state2, CANONICAL_JSON_PATH);
        expect(JSON.stringify(state1.military)).toBe(JSON.stringify(state2.military));
    });

    it('T6b — applyPoliticalLeaderDataInit is idempotent within a single state', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const snap = JSON.stringify(state.military);
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        expect(JSON.stringify(state.military)).toBe(snap);
    });
});

// ===========================================================================
// T7 — Faction-symmetric: same loader code path RBiH/RS/HRHB
// ===========================================================================
describe('B2 — faction-symmetric mechanism', () => {
    it('T7 — loader source has no per-faction string-equality branches', () => {
        const path = resolve('src/sim/political/political_leader_data_loader.ts');
        const src = readFileSync(path, 'utf8');
        // Strip comments before grepping (matches B1 pattern from b1 tests).
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        expect(stripped).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        expect(stripped).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
        expect(stripped).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);
    });

    it('T7b — all three factions populate via the same code path (no missing faction)', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const mil = state.military as GameState['military'] & {
            political_leader_data?: PoliticalLeaderProfile[];
            political_leaders?: Record<string, PoliticalLeaderState>;
        };
        // Every canonical faction must have BOTH a profile and a state.
        const factions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
        for (const faction of factions) {
            expect(mil.political_leader_data!.some(p => p.faction === faction)).toBe(true);
            expect(mil.political_leaders![faction]).toBeDefined();
            expect(mil.political_leaders![faction].faction).toBe(faction);
        }
    });
});

// ===========================================================================
// T8 — Backward-compat: missing JSON file leaves substrate empty (B1 stays null)
// ===========================================================================
describe('B2 — backward-compat (missing data)', () => {
    it('T8 — applyPoliticalLeaderDataInit with bogus path is a no-op', () => {
        const state = makeBaseState();
        const before = JSON.stringify(state.military);
        applyPoliticalLeaderDataInit(state, resolve('data/scenarios/_does_not_exist_.json'));
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
        // B1 producer must still return null with empty substrate.
        expect(producePoliticalDirective(state, 'RS')).toBeNull();
    });

    it('T8b — pre-B2 save (no political_leader_data) survives applyPoliticalDirectiveProducer', () => {
        const state = makeBaseState();
        // Simulate pre-B2 save: NO political_leader_data, NO political_leaders.
        expect(() => applyPoliticalDirectiveProducer(state)).not.toThrow();
        const mil = state.military as GameState['military'] & {
            political_directives_by_faction?: Record<string, PoliticalDirective>;
        };
        expect(mil.political_directives_by_faction).toBeUndefined();
    });
});

// ===========================================================================
// T9 — A3 receives non-null directive when B2 + B1 + (faction !== player) all GO
// ===========================================================================
describe('B2 — A3 sees the directive', () => {
    it('T9 — applyPoliticalDirectiveProducer writes directives_by_faction for non-player factions', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        applyPoliticalDirectiveProducer(state);
        const mil = state.military as GameState['military'] & {
            political_directives_by_faction?: Record<string, PoliticalDirective>;
        };
        expect(mil.political_directives_by_faction).toBeDefined();
        // All three canonical factions emit (no player_faction set in test).
        expect(Object.keys(mil.political_directives_by_faction!).sort()).toEqual(
            ['HRHB', 'RBiH', 'RS'],
        );
        // Each directive carries the canonical verb shape.
        for (const faction of ['HRHB', 'RBiH', 'RS'] as const) {
            expect(mil.political_directives_by_faction![faction].verb).toBeDefined();
        }
    });

    it('T9b — player_faction directive is NOT written (player issues via UI)', () => {
        const state = makeBaseState();
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        (state.meta as unknown as { player_faction: FactionId }).player_faction = 'RBiH';
        applyPoliticalDirectiveProducer(state);
        const mil = state.military as GameState['military'] & {
            political_directives_by_faction?: Record<string, PoliticalDirective>;
        };
        expect(mil.political_directives_by_faction).toBeDefined();
        expect(Object.keys(mil.political_directives_by_faction!).sort()).toEqual(
            ['HRHB', 'RS'],
        );
        expect(mil.political_directives_by_faction!.RBiH).toBeUndefined();
    });
});

// ===========================================================================
// T10 — env flag B2_POLITICAL_LEADER_DATA_DISABLED short-circuits the init
// ===========================================================================
describe('B2 — env-flag short-circuit', () => {
    it('T10 — B2_POLITICAL_LEADER_DATA_DISABLED=true leaves substrate empty', () => {
        process.env.B2_POLITICAL_LEADER_DATA_DISABLED = 'true';
        const state = makeBaseState();
        const before = JSON.stringify(state.military);
        applyPoliticalLeaderDataInit(state, CANONICAL_JSON_PATH);
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
        // B1 producer therefore returns null — preserves byte-stability vs.
        // pre-B2 baseline hash 575aca8c8adfdae2.
        expect(producePoliticalDirective(state, 'RS')).toBeNull();
    });
});

// ===========================================================================
// T11 — Determinism guard (static-grep)
// ===========================================================================
describe('B2 — determinism guard', () => {
    it('T11 — loader source contains no Math.random / Date.now / new Date / setTimeout', () => {
        const path = resolve('src/sim/political/political_leader_data_loader.ts');
        const src = readFileSync(path, 'utf8');
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        expect(stripped).not.toMatch(/Math\.random/);
        expect(stripped).not.toMatch(/Date\.now/);
        expect(stripped).not.toMatch(/new\s+Date\b/);
        expect(stripped).not.toMatch(/setTimeout|setInterval/);
    });
});

// ===========================================================================
// T12 — DDR provenance breadcrumb
// ===========================================================================
describe('B2 — DDR provenance', () => {
    it('T12 — DDR + B1 commits cited in source + JSON', () => {
        const srcPath = resolve('src/sim/political/political_leader_data_loader.ts');
        const src = readFileSync(srcPath, 'utf8');
        // B-lane DDR
        expect(src).toContain('941bd68e');
        expect(src).toContain('168d65c2');
        // B1 predecessor commit
        expect(src).toContain('44053a32');
        // 40w post-Krivaja byte-stability invariant
        expect(src).toContain('575aca8c8adfdae2');
        // JSON also cites DDR commit + B1.
        const jsonPath = resolve('data/scenarios/political_leader_data.json');
        const jsonRaw = readFileSync(jsonPath, 'utf8');
        expect(jsonRaw).toContain('941bd68e');
        expect(jsonRaw).toContain('44053a32');
    });
});

// ===========================================================================
// T13 — applyPoliticalLeaderData with synthetic data works without filesystem
// ===========================================================================
describe('B2 — applyPoliticalLeaderData (synthetic)', () => {
    it('T13 — applyPoliticalLeaderData populates state from in-memory data', () => {
        const state = makeBaseState();
        applyPoliticalLeaderData(state, {
            schema_version: 'test',
            ddr_commit: 'test',
            leaders: [
                {
                    leader_id: 'test_rs',
                    faction: 'RS',
                    name: 'Test',
                    hawkishness: 5,
                    flexibility: 1,
                    international_sensitivity: 2,
                    patron_deference: 3,
                    impunity_tolerance: 4,
                },
            ],
        });
        const mil = state.military as GameState['military'] & {
            political_leader_data?: PoliticalLeaderProfile[];
            political_leaders?: Record<string, PoliticalLeaderState>;
        };
        expect(mil.political_leader_data!.length).toBe(1);
        expect(mil.political_leaders!.RS).toBeDefined();
        expect(mil.political_leaders!.RS.current_posture).toBe('hawkish');
    });

    it('T13b — invalid profiles are filtered out (hawkishness > 5)', () => {
        const state = makeBaseState();
        applyPoliticalLeaderData(state, {
            schema_version: 'test',
            ddr_commit: 'test',
            leaders: [
                {
                    leader_id: 'bad',
                    faction: 'RS',
                    name: 'Bad',
                    hawkishness: 99,
                    flexibility: 1,
                    international_sensitivity: 2,
                    patron_deference: 3,
                    impunity_tolerance: 4,
                },
            ],
        });
        const mil = state.military as GameState['military'] & {
            political_leader_data?: PoliticalLeaderProfile[];
        };
        // No valid profile means political_leader_data stays absent.
        expect(mil.political_leader_data).toBeUndefined();
    });
});
