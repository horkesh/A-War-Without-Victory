/**
 * LANE-NIGHTSHIFT-B1-POLITICAL-DIRECTIVE-PRODUCER-INFRA
 *
 * DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 * (941bd68e + 168d65c2)
 * Predecessors: A1 18136710 • A2 ba6955bf • A3 c8ff93d8 • A4 93c75b1d
 *
 * B1 ships byte-stable producer infrastructure. Until B2 populates
 * `state.military.political_leader_data`, `producePoliticalDirective`
 * MUST return null on every call, preserving the 40w n1703 hash
 * 7a1fddce105993e7 baseline.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { PoliticalDirective } from '../src/sim/combat/army_order_interpretation.js';
import {
    producePoliticalDirective,
    applyPoliticalDirectiveProducer,
    B1_PIPELINE_STEP_NAME,
    B1_HIGH_EXHAUSTION_THRESHOLD,
    B1_HAWKISH_THRESHOLD,
    B1_HIGH_IVP_THRESHOLD,
    B1_HIGH_SENSITIVITY_THRESHOLD,
} from '../src/sim/political/political_directive_producer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripComments(src: string): string {
    let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
    out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return out;
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

function withSubstrate(state: GameState, faction: FactionId, overrides: {
    hawkishness?: number;
    flexibility?: number;
    international_sensitivity?: number;
    patron_deference?: number;
} = {}): GameState {
    const mil = state.military as GameState['military'] & {
        political_leader_data?: Array<Record<string, unknown>>;
        political_leaders?: Record<string, unknown>;
    };
    const profile = {
        leader_id: `leader_${faction}`,
        faction,
        name: `Leader ${faction}`,
        hawkishness: overrides.hawkishness ?? 3,
        flexibility: overrides.flexibility ?? 3,
        international_sensitivity: overrides.international_sensitivity ?? 3,
        patron_deference: overrides.patron_deference ?? 3,
        impunity_tolerance: 3,
    };
    if (!Array.isArray(mil.political_leader_data)) mil.political_leader_data = [];
    mil.political_leader_data.push(profile);
    if (!mil.political_leaders) mil.political_leaders = {};
    (mil.political_leaders as Record<string, unknown>)[faction] = {
        leader_id: profile.leader_id,
        faction,
        current_posture: 'moderate',
        war_crimes_policy: 'tolerate',
        alliance_posture: 'pragmatic',
        political_capital: 5,
        political_capital_max: 10,
        current_priorities: [],
        player_trust: 50,
        recent_decisions: [],
    };
    return state;
}

beforeEach(() => {
    delete process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED;
});

afterEach(() => {
    delete process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED;
});

// ===========================================================================
// T1 — null when state.military.political_leader_data undefined / empty
// ===========================================================================
describe('B1 — substrate empty → null', () => {
    it('T1 — returns null when political_leader_data is undefined', () => {
        const state = makeBaseState();
        const directive = producePoliticalDirective(state, 'RS');
        expect(directive).toBeNull();
    });
});

// ===========================================================================
// T2 — null when political_leader_data is an empty array (B2's territory)
// ===========================================================================
describe('B1 — empty profile array → null', () => {
    it('T2 — returns null when political_leader_data is empty array', () => {
        const state = makeBaseState();
        (state.military as unknown as { political_leader_data: unknown[] })
            .political_leader_data = [];
        const directive = producePoliticalDirective(state, 'RS');
        expect(directive).toBeNull();
    });

    it('T2b — returns null when political_leaders missing even if profile exists', () => {
        const state = makeBaseState();
        (state.military as unknown as { political_leader_data: unknown[] })
            .political_leader_data = [{
                leader_id: 'l_rs',
                faction: 'RS',
                hawkishness: 4,
                flexibility: 2,
                international_sensitivity: 2,
                patron_deference: 3,
            }];
        // political_leaders intentionally absent
        const directive = producePoliticalDirective(state, 'RS');
        expect(directive).toBeNull();
    });
});

// ===========================================================================
// T3 — env-flag short-circuit
// ===========================================================================
describe('B1 — env-flag short-circuit', () => {
    it('T3 — B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED=true forces null', () => {
        process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED = 'true';
        const state = withSubstrate(makeBaseState(), 'RS', { hawkishness: 5 });
        const directive = producePoliticalDirective(state, 'RS');
        expect(directive).toBeNull();
    });

    it('T3b — pipeline step is a no-op when env flag set', () => {
        process.env.B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED = 'true';
        const state = withSubstrate(makeBaseState(), 'RS', { hawkishness: 5 });
        const before = JSON.stringify(state.military);
        applyPoliticalDirectiveProducer(state);
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
    });
});

// ===========================================================================
// T4 — determinism: same inputs → identical output
// ===========================================================================
describe('B1 — determinism', () => {
    it('T4 — identical state produces identical directive across calls', () => {
        const state = withSubstrate(makeBaseState(), 'RS', { hawkishness: 5 });
        const a = producePoliticalDirective(state, 'RS');
        const b = producePoliticalDirective(state, 'RS');
        const c = producePoliticalDirective(state, 'RS');
        expect(a).not.toBeNull();
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        expect(JSON.stringify(b)).toBe(JSON.stringify(c));
    });
});

// ===========================================================================
// T5 — byte-stability guarantee: pre-B2 saves yield null on every call
// ===========================================================================
describe('B1 — byte-stability guarantee (pre-B2 saves)', () => {
    it('T5 — applyPoliticalDirectiveProducer leaves military slot byte-identical when substrate empty', () => {
        const state = makeBaseState();
        const before = JSON.stringify(state.military);
        applyPoliticalDirectiveProducer(state);
        const after = JSON.stringify(state.military);
        expect(after).toBe(before);
        // and there is still no political_directives_by_faction key.
        expect(
            (state.military as unknown as { political_directives_by_faction?: unknown })
                .political_directives_by_faction,
        ).toBeUndefined();
    });

    it('T5b — repeated invocations remain byte-identical', () => {
        const state = makeBaseState();
        applyPoliticalDirectiveProducer(state);
        const snap = JSON.stringify(state.military);
        applyPoliticalDirectiveProducer(state);
        applyPoliticalDirectiveProducer(state);
        applyPoliticalDirectiveProducer(state);
        expect(JSON.stringify(state.military)).toBe(snap);
    });
});

// ===========================================================================
// T6 — faction-symmetric: same code path for RBiH / RS / HRHB
// ===========================================================================
describe('B1 — faction-symmetric', () => {
    it('T6 — identical leader profile across factions yields same verb (no faction-id branches)', () => {
        const factions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
        const verbs: string[] = [];
        for (const faction of factions) {
            const state = withSubstrate(makeBaseState(), faction, {
                hawkishness: 5,
                international_sensitivity: 2,
            });
            // Suppress alliance-corridor branch for HRHB/RBiH so we measure
            // the hawkishness path on the same predicate for all three.
            (state.political as unknown as { war_alliance_rbih_hrhb: number })
                .war_alliance_rbih_hrhb = 1;
            const directive = producePoliticalDirective(state, faction);
            expect(directive).not.toBeNull();
            verbs.push(directive!.verb);
        }
        expect(verbs[0]).toBe(verbs[1]);
        expect(verbs[1]).toBe(verbs[2]);
        expect(verbs[0]).toBe('PRESS_OFFENSIVE');
    });

    it('T6b — module source has no per-faction string-equality branches', () => {
        const path = resolve('src/sim/political/political_directive_producer.ts');
        const stripped = stripComments(readFileSync(path, 'utf8'));
        // The corridor branch tests faction membership in {RBiH, HRHB} — that
        // is symmetric (same predicate for both) but we forbid any branch
        // singling out a *single* faction id (which would be a railroad).
        expect(stripped).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        // The HRHB/RBiH membership predicate is allowed only when both are
        // tested together (corridor symmetry). Confirm there is no isolated
        // single-faction branch for either.
        const lines = stripped.split('\n');
        for (const line of lines) {
            const hasRbih = /faction\s*===\s*['"]RBiH['"]/.test(line);
            const hasHrhb = /faction\s*===\s*['"]HRHB['"]/.test(line);
            // If a line tests one of these, it must test both (symmetry).
            if (hasRbih) expect(line).toMatch(/HRHB/);
            if (hasHrhb) expect(line).toMatch(/RBiH/);
        }
    });
});

// ===========================================================================
// T7 — no Math.random / Date.now / new Date in source (determinism guard)
// ===========================================================================
describe('B1 — determinism guard (static-grep)', () => {
    it('T7 — module source contains no Math.random / Date.now / new Date / setTimeout', () => {
        const path = resolve('src/sim/political/political_directive_producer.ts');
        const src = readFileSync(path, 'utf8');
        const stripped = stripComments(src);
        expect(stripped).not.toMatch(/Math\.random/);
        expect(stripped).not.toMatch(/Date\.now/);
        expect(stripped).not.toMatch(/new\s+Date\b/);
        expect(stripped).not.toMatch(/setTimeout|setInterval/);
    });
});

// ===========================================================================
// T8 — emits a valid PoliticalDirectiveVerb when fully wired (mock substrate)
// ===========================================================================
describe('B1 — verb derivation', () => {
    const VALID_VERBS = new Set([
        'HOLD_AT_ALL_COSTS',
        'PRESS_OFFENSIVE',
        'MAINTAIN_CORRIDOR',
        'PREPARE_RESERVE',
        'HONOR_TRUCE',
        'BALANCE_FRONTS',
    ]);

    it('T8 — high hawkishness emits PRESS_OFFENSIVE', () => {
        const state = withSubstrate(makeBaseState(), 'RS', {
            hawkishness: B1_HAWKISH_THRESHOLD,
            international_sensitivity: 2,
        });
        const d = producePoliticalDirective(state, 'RS');
        expect(d).not.toBeNull();
        expect(VALID_VERBS.has(d!.verb)).toBe(true);
        expect(d!.verb).toBe('PRESS_OFFENSIVE');
    });

    it('T8b — high exhaustion + high sensitivity emits HONOR_TRUCE', () => {
        const state = withSubstrate(makeBaseState(), 'RS', {
            hawkishness: 5,
            international_sensitivity: B1_HIGH_SENSITIVITY_THRESHOLD,
        });
        (state.political as unknown as { war_exhaustion: Record<string, number> })
            .war_exhaustion = { RS: B1_HIGH_EXHAUSTION_THRESHOLD };
        const d = producePoliticalDirective(state, 'RS');
        expect(d).not.toBeNull();
        expect(d!.verb).toBe('HONOR_TRUCE');
    });

    it('T8c — high IVP + high sensitivity emits HONOR_TRUCE', () => {
        const state = withSubstrate(makeBaseState(), 'RS', {
            hawkishness: 3,
            international_sensitivity: B1_HIGH_SENSITIVITY_THRESHOLD,
        });
        (state.political as unknown as {
            international_visibility_pressure: { level: number };
        }).international_visibility_pressure = { level: B1_HIGH_IVP_THRESHOLD };
        const d = producePoliticalDirective(state, 'RS');
        expect(d).not.toBeNull();
        expect(d!.verb).toBe('HONOR_TRUCE');
    });

    it('T8d — directive carries deterministic directive_id', () => {
        const state = withSubstrate(makeBaseState(15), 'RS', { hawkishness: 5 });
        const d = producePoliticalDirective(state, 'RS');
        expect(d!.directive_id).toBe('b1:RS:PRESS_OFFENSIVE:15');
    });
});

// ===========================================================================
// T9 — pipeline ordering vs A1 (army-hq-gathering), A4, A3
// ===========================================================================
describe('B1 — pipeline integration', () => {
    it('T9 — produce-political-directive AFTER evaluate-army-hq-gathering AND BEFORE A4 + A3 step values', () => {
        expect(B1_PIPELINE_STEP_NAME).toBe('produce-political-directive');
        const path = resolve('src/sim/turn_phases/war_phases.ts');
        expect(existsSync(path)).toBe(true);
        const src = readFileSync(path, 'utf8');

        // Locate the `name:` field for each step (this captures ordering at
        // the runtime-step boundary, not just constant references).
        const idxArmyHQ = src.indexOf("name: 'evaluate-army-hq-gathering'");
        const idxB1Step = src.indexOf('name: B1_PIPELINE_STEP_NAME');
        const idxA4Step = src.indexOf('name: A4_PIPELINE_STEP_NAME');
        const idxA3Step = src.indexOf('name: A3_PIPELINE_STEP_NAME');

        expect(idxArmyHQ).toBeGreaterThan(0);
        expect(idxB1Step).toBeGreaterThan(0);
        expect(idxA4Step).toBeGreaterThan(0);
        expect(idxA3Step).toBeGreaterThan(0);

        // B1 AFTER evaluate-army-hq-gathering.
        expect(idxB1Step).toBeGreaterThan(idxArmyHQ);
        // B1 BEFORE A4 (evaluate-army-co-transitions).
        expect(idxB1Step).toBeLessThan(idxA4Step);
        // B1 BEFORE A3 (apply-army-directive-interpretation, the consumer).
        expect(idxB1Step).toBeLessThan(idxA3Step);
    });
});

// ===========================================================================
// T10 — backward-compat: pre-B1 saves load + run with no error
// ===========================================================================
describe('B1 — backward-compat', () => {
    it('T10 — pre-B1 save shape (no political_leader_data, no political_leaders) runs cleanly', () => {
        const state = makeBaseState();
        // Simulate a freshly loaded pre-B1 save: NO political_leader_data,
        // NO political_leaders, NO political_directives_by_faction.
        expect(() => applyPoliticalDirectiveProducer(state)).not.toThrow();
        expect(producePoliticalDirective(state, 'HRHB')).toBeNull();
        expect(producePoliticalDirective(state, 'RBiH')).toBeNull();
        expect(producePoliticalDirective(state, 'RS')).toBeNull();
    });

    it('T10b — player_faction never receives a directive (player issues via UI)', () => {
        const state = withSubstrate(makeBaseState(), 'RS', { hawkishness: 5 });
        (state.meta as unknown as { player_faction: FactionId }).player_faction = 'RS';
        const d = producePoliticalDirective(state, 'RS');
        expect(d).toBeNull();
    });
});

// ===========================================================================
// T11 — DDR provenance breadcrumb (compliance breadcrumb mirrors A4 T12)
// ===========================================================================
describe('B1 — DDR provenance', () => {
    it('T11 — DDR commits + predecessors cited in source', () => {
        const path = resolve('src/sim/political/political_directive_producer.ts');
        const src = readFileSync(path, 'utf8');
        // B-lane DDR commits
        expect(src).toContain('941bd68e');
        expect(src).toContain('168d65c2');
        // A-lane predecessors
        expect(src).toContain('c8ff93d8'); // A3
        expect(src).toContain('93c75b1d'); // A4
        // 40w hash invariant cited
        expect(src).toContain('7a1fddce105993e7');
    });
});

// ===========================================================================
// T12 — applyPoliticalDirectiveProducer writes only when directive emitted
// ===========================================================================
describe('B1 — pipeline write semantics', () => {
    it('T12 — applyPoliticalDirectiveProducer writes directive when substrate present', () => {
        const state = withSubstrate(makeBaseState(), 'RS', { hawkishness: 5 });
        applyPoliticalDirectiveProducer(state);
        const map = (state.military as unknown as {
            political_directives_by_faction?: Record<string, PoliticalDirective>;
        }).political_directives_by_faction;
        expect(map).toBeDefined();
        expect(map!.RS).toBeDefined();
        expect(map!.RS.verb).toBe('PRESS_OFFENSIVE');
    });

    it('T12b — applyPoliticalDirectiveProducer does NOT write null entries (preserves byte-stability)', () => {
        const state = makeBaseState();
        // Only RS has substrate; HRHB and RBiH yield null.
        withSubstrate(state, 'RS', { hawkishness: 5 });
        applyPoliticalDirectiveProducer(state);
        const map = (state.military as unknown as {
            political_directives_by_faction?: Record<string, PoliticalDirective>;
        }).political_directives_by_faction;
        expect(map).toBeDefined();
        expect(Object.keys(map!).sort()).toEqual(['RS']);
    });
});
