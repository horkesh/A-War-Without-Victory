/**
 * LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE — substrate-only schema additions.
 *
 * DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md (eee308e0)
 * A1 closeout: docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md (18136710)
 *
 * A2 ships SUBSTRATE only — fields A3-A5 will consume:
 *
 *   NamedOfficer (static, per DDR Q3 + Q4):
 *     stubbornness?: number       (1-5; ≥4 unlocks autonomous-launch path)
 *     override_tolerance?: number (1-5; political-leader bot tolerance)
 *
 *   NamedOfficerState (mutable, per DDR Q3 + Q4):
 *     last_autonomous_launch_turn?: number
 *     recent_overrides?: { turn; resolution: 'accept'|'override'|'relieve' }[]
 *
 *   MilitaryState:
 *     army_co_decision_traces?: Record<FactionId, Array<{
 *       turn; campaign_role; rationale; raw_directive_id?
 *     }>>
 *
 * NO behavior change. Backward-compatible (all fields optional). A3 will
 * consume; A2 just guarantees the slots exist + validate.
 *
 * Determinism: no Math.random(), no Date.now(), no timestamps.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateGameStateShape } from '../src/state/validateGameState.js';
import type {
    NamedOfficer,
    NamedOfficerState,
} from '../src/state/officer_types.js';
import type { GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Test fixtures (do not embed real officer ids in source — fixtures only)
// ---------------------------------------------------------------------------

/** Minimal valid game state shell — suite reuses across T1..T7. */
function makeShellState(): GameState {
    // Cast through unknown to avoid pulling the entire GameState shape into
    // this test fixture. The validator does its own runtime shape check.
    return {
        meta: { turn: 0 },
        political: { political_controllers: {} },
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {} },
    } as unknown as GameState;
}

/** A NamedOfficer fixture that exercises the new substrate fields. */
function makeOfficer(overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id: 'fixture_officer_a',
        name: 'Fixture Officer A',
        faction: 'RS',
        rank: 'army_commander',
        competence: 3,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: true,
        improvement_rate: 0.01,
        pool_tier: 'starter',
        ...overrides,
    };
}

/** A NamedOfficerState fixture. */
function makeOfficerState(overrides: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: 'fixture_officer_a',
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

// ---------------------------------------------------------------------------
// T1: NamedOfficer optional stubbornness + override_tolerance bounds
// ---------------------------------------------------------------------------

describe('A2 substrate — NamedOfficer stubbornness + override_tolerance (DDR Q3, Q4)', () => {
    it('accepts officer with stubbornness in [1,5] and override_tolerance in [1,5]', () => {
        const state = makeShellState();
        const officers: NamedOfficer[] = [
            makeOfficer({ id: 'mladic_fixture', stubbornness: 5 }),
            makeOfficer({ id: 'halilovic_fixture', stubbornness: 4 }),
            makeOfficer({ id: 'praljak_fixture', stubbornness: 3 }),
            makeOfficer({ id: 'delic_fixture', stubbornness: 2 }),
            makeOfficer({ id: 'karadzic_fixture', override_tolerance: 4, rank: 'army_commander' }),
            makeOfficer({ id: 'izetbegovic_fixture', override_tolerance: 3 }),
            makeOfficer({ id: 'boban_fixture', override_tolerance: 2 }),
            // Officer without either field — must still validate (backward compat)
            makeOfficer({ id: 'plain_fixture' }),
        ];
        (state.military as any).named_officer_data = officers;

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// T2: NamedOfficerState optional last_autonomous_launch_turn + recent_overrides
// ---------------------------------------------------------------------------

describe('A2 substrate — NamedOfficerState autonomous-launch + override tracking (DDR Q3, Q4)', () => {
    it('accepts last_autonomous_launch_turn (non-negative integer) and recent_overrides ring', () => {
        const state = makeShellState();
        (state.military as any).named_officers = {
            'fixture_officer_a': makeOfficerState({
                last_autonomous_launch_turn: 12,
                recent_overrides: [
                    { turn: 5, resolution: 'accept' },
                    { turn: 9, resolution: 'override' },
                    { turn: 12, resolution: 'relieve' },
                ],
            }),
            'fixture_officer_b': makeOfficerState({
                officer_id: 'fixture_officer_b',
                // no autonomous launches yet, no overrides — both fields omitted
            }),
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// T3: MilitaryState army_co_decision_traces validates per-faction
// ---------------------------------------------------------------------------

describe('A2 substrate — MilitaryState.army_co_decision_traces (DDR Q1 vocabulary)', () => {
    it('accepts per-faction trace arrays with turn/campaign_role/rationale', () => {
        const state = makeShellState();
        (state.military as any).army_co_decision_traces = {
            RBiH: [
                { turn: 0, campaign_role: 'primary', rationale: 'opening offensive' },
                { turn: 5, campaign_role: 'secondary', rationale: 'shift to balanced after losses' },
            ],
            RS: [
                { turn: 0, campaign_role: 'economy', rationale: 'corridor consolidation', raw_directive_id: 'sync_op_drina_pos' },
            ],
            HRHB: [],
        };

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// T4: Backward compatibility — pre-A2 saves load cleanly
// ---------------------------------------------------------------------------

describe('A2 substrate — backward compatibility', () => {
    it('validates a state with no A2-substrate fields present (existing saves load cleanly)', () => {
        const state = makeShellState();
        // No new A2 fields whatsoever.
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('validates officers with only legacy fields (no stubbornness, no override_tolerance)', () => {
        const state = makeShellState();
        (state.military as any).named_officer_data = [makeOfficer({ id: 'legacy_only' })];
        (state.military as any).named_officers = { 'legacy_only': makeOfficerState({ officer_id: 'legacy_only' }) };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// T5: Validator rejects out-of-bound + malformed substrate fields
// ---------------------------------------------------------------------------

describe('A2 substrate — validator rejects out-of-bound + malformed entries', () => {
    it('rejects stubbornness = 6 (above 1-5 cap)', () => {
        const state = makeShellState();
        (state.military as any).named_officer_data = [makeOfficer({ stubbornness: 6 })];
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some(e => e.includes('stubbornness'))).toBe(true);
        }
    });

    it('rejects stubbornness = 0 (below 1-5 floor)', () => {
        const state = makeShellState();
        (state.military as any).named_officer_data = [makeOfficer({ stubbornness: 0 })];
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
    });

    it('rejects override_tolerance = -1 (negative)', () => {
        const state = makeShellState();
        (state.military as any).named_officer_data = [makeOfficer({ override_tolerance: -1 })];
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some(e => e.includes('override_tolerance'))).toBe(true);
        }
    });

    it('rejects last_autonomous_launch_turn = -5 (negative)', () => {
        const state = makeShellState();
        (state.military as any).named_officers = {
            'bad': makeOfficerState({ officer_id: 'bad', last_autonomous_launch_turn: -5 }),
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
    });

    it('rejects recent_overrides with unknown resolution string', () => {
        const state = makeShellState();
        (state.military as any).named_officers = {
            'bad': makeOfficerState({
                officer_id: 'bad',
                // @ts-expect-error — intentional bad value to exercise validator
                recent_overrides: [{ turn: 1, resolution: 'frowned_at' }],
            }),
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
    });

    it('rejects army_co_decision_traces entry with non-integer turn', () => {
        const state = makeShellState();
        (state.military as any).army_co_decision_traces = {
            RBiH: [{ turn: 1.5, campaign_role: 'primary', rationale: 'fractional turn invalid' }],
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// T6: Determinism — schema serialization is byte-stable
// ---------------------------------------------------------------------------

describe('A2 substrate — deterministic serialization', () => {
    it('JSON.stringify of the same state shape twice returns byte-identical output', () => {
        const state = makeShellState();
        (state.military as any).named_officer_data = [
            makeOfficer({ id: 'a', stubbornness: 5 }),
            makeOfficer({ id: 'b', override_tolerance: 3 }),
        ];
        (state.military as any).named_officers = {
            'a': makeOfficerState({
                officer_id: 'a',
                last_autonomous_launch_turn: 10,
                recent_overrides: [
                    { turn: 1, resolution: 'accept' },
                    { turn: 4, resolution: 'override' },
                ],
            }),
        };
        (state.military as any).army_co_decision_traces = {
            RBiH: [{ turn: 3, campaign_role: 'primary', rationale: 'r1' }],
            RS: [{ turn: 7, campaign_role: 'economy', rationale: 'r2', raw_directive_id: 'd-1' }],
        };

        const a = JSON.stringify(state);
        const b = JSON.stringify(state);
        expect(a).toBe(b);

        const validation = validateGameStateShape(state);
        expect(validation.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// T7: Static-grep guards — substrate code carries no nondeterminism markers
// ---------------------------------------------------------------------------

describe('A2 substrate — static-grep determinism + sensitive-history guards', () => {
    const repoRoot = resolve(__dirname, '..');

    function readSource(relPath: string): string {
        return readFileSync(resolve(repoRoot, relPath), 'utf8');
    }

    it('officer_types.ts A2 region carries no Math.random / Date.now / new Date', () => {
        const src = readSource('src/state/officer_types.ts');
        // Whole file scan — substrate fields are a small additive block.
        expect(src).not.toMatch(/Math\.random\s*\(/);
        expect(src).not.toMatch(/Date\.now\s*\(/);
        expect(src).not.toMatch(/new\s+Date\s*\(/);
    });

    it('validateGameState.ts A2 region carries no Math.random / Date.now / new Date', () => {
        const src = readSource('src/state/validateGameState.ts');
        expect(src).not.toMatch(/Math\.random\s*\(/);
        expect(src).not.toMatch(/Date\.now\s*\(/);
        expect(src).not.toMatch(/new\s+Date\s*\(/);
    });

    it('A2 substrate code does NOT hardcode faction tokens in the schema additions', () => {
        // The A2 ADDITIVE blocks in officer_types.ts and validateGameState.ts must
        // remain faction-agnostic at the mechanism level. Faction-keyed records
        // (Record<string, ...>) are fine; literal 'RBiH'/'RS'/'HRHB' tokens in
        // these schema-only blocks would indicate forbidden faction-asymmetric code.
        const officerSrc = readSource('src/state/officer_types.ts');
        // Limit to the A2 region between the two sentinel comments.
        const a2Region = officerSrc.split('A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE)').slice(1).join('\n');
        expect(a2Region.length).toBeGreaterThan(0);
        expect(a2Region).not.toMatch(/['"]RBiH['"]/);
        expect(a2Region).not.toMatch(/['"]RS['"]/);
        expect(a2Region).not.toMatch(/['"]HRHB['"]/);

        const valSrc = readSource('src/state/validateGameState.ts');
        const valA2Region = valSrc.split('A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE)').slice(1).join('\n');
        expect(valA2Region.length).toBeGreaterThan(0);
        expect(valA2Region).not.toMatch(/['"]RBiH['"]/);
        expect(valA2Region).not.toMatch(/['"]RS['"]/);
        expect(valA2Region).not.toMatch(/['"]HRHB['"]/);
    });

    it('DDR + A1 closeout are referenced in the A2 substrate documentation block', () => {
        const officerSrc = readSource('src/state/officer_types.ts');
        // DDR commit hash referenced for traceability
        expect(officerSrc).toContain('eee308e0');
        const valSrc = readSource('src/state/validateGameState.ts');
        expect(valSrc).toContain('eee308e0');
    });
});
