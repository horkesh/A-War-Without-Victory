/**
 * LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON
 *
 * DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
 * (Q2 — Army CO authority shape: ADVISORY with compliance-score thresholds).
 * Predecessors: A3 c8ff93d8 • C1 5084071d • API-DIRECTIVE-BRIDGE c084dd86.
 *
 * Surfaced by API smoke `bft5bixcj` on `a2d564e6` as DG-CLUSTER-3:
 * "Compliance: deviated" universal default with no reason field — commanders
 * see `compliance: deviated` without explanation, can't act on it.
 *
 * Q2 extends the A3 compliance evaluator to emit a `deviation_reason` string
 * when `deviated=true`, propagated through the C1 persisted slot, the briefing
 * overlay, and the API commander prompt section.
 *
 * Tests cover:
 *   T1 — `deviation_reason` is a string when `deviated=true`.
 *   T2 — `deviation_reason` is undefined when `deviated=false`.
 *   T3 — Reason matches one of the canonical codes (set membership check).
 *   T4 — Persisted slot includes `deviation_reason` after C1 persist.
 *   T5 — Briefing's overlay surface includes reason for downstream visibility
 *        (commander prompt sees it via the chain-context section).
 *   T6 — Determinism — same state produces same reason.
 *   T7 — Faction-symmetric — same reason logic for all 3 factions.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type { GameState, FactionId } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    interpretArmyDirective,
    applyArmyDirectiveInterpretation,
    type PoliticalDirective,
    type ArmyCorpsDirective,
    type ArmyCorpsDirectiveDeviationReason,
} from '../src/sim/combat/army_order_interpretation.js';
import { buildChainContextSection } from '../tools/claude_plays_vrs/api_commander.js';

// ─── Canonical reason codes (closed enum) ──────────────────────────────────
const CANONICAL_REASON_CODES: ReadonlySet<ArmyCorpsDirectiveDeviationReason> = new Set([
    'aggressive_preference',
    'cautious_preference',
    'compliance_score_low',
]);

// ─── Helpers (mirror C1 test fixture style) ────────────────────────────────

function makeOfficerData(overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id: 'fixture_army_a',
        name: 'Fixture Army Commander',
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

function readPersistedSlot(state: GameState): Record<string, Record<string, ArmyCorpsDirective>> | undefined {
    type LooseMilitary = GameState['military'] & {
        army_corps_directives_by_faction?: Record<string, Record<string, ArmyCorpsDirective>>;
    };
    return (state.military as LooseMilitary).army_corps_directives_by_faction;
}

beforeEach(() => {
    delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
});

afterEach(() => {
    delete process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED;
});

// ===========================================================================
// T1 — `deviation_reason` is a string when `deviated=true`.
// ===========================================================================
describe('Q2 — deviation_reason emission contract', () => {
    it('T1 — when deviated=true, deviation_reason is a non-empty string', () => {
        // Aggressive officer (aggressiveness=5, stubbornness=4) gets a
        // PRESS_OFFENSIVE directive on a non-target corps. Raw role is
        // 'secondary', preferred role is 'primary' → modified compliance,
        // direction = +1 → 'aggressive_preference'.
        const state = makeStateWithArmyCO('RS', {
            competence: 3, stubbornness: 4, aggressiveness: 5,
        });
        const directive: PoliticalDirective = { verb: 'PRESS_OFFENSIVE', target_corps_id: 'RS_corps_a' };
        const interp = interpretArmyDirective(state, 'RS', directive);

        // At least one corps must have deviated; that one must carry a reason.
        const deviatedDirectives = interp.corps_directives.filter(cd => cd.deviated);
        expect(deviatedDirectives.length).toBeGreaterThan(0);
        for (const cd of deviatedDirectives) {
            expect(typeof cd.deviation_reason).toBe('string');
            expect(cd.deviation_reason!.length).toBeGreaterThan(0);
        }
    });
});

// ===========================================================================
// T2 — `deviation_reason` is undefined when `deviated=false`.
// ===========================================================================
describe('Q2 — deviation_reason absent on non-deviating directives', () => {
    it('T2 — full-compliance directives carry no deviation_reason field', () => {
        // Highly competent, low-stubbornness officer with aggressiveness=3.
        // Score is high → full compliance → no deviation → no reason.
        const state = makeStateWithArmyCO('RS', {
            competence: 5, stubbornness: 1, aggressiveness: 3,
        });
        const directive: PoliticalDirective = { verb: 'BALANCE_FRONTS', target_corps_id: 'RS_corps_a' };
        const interp = interpretArmyDirective(state, 'RS', directive);

        // All directives must be non-deviating in this configuration.
        for (const cd of interp.corps_directives) {
            expect(cd.deviated).toBe(false);
            expect(cd.deviation_reason).toBeUndefined();
        }
    });
});

// ===========================================================================
// T3 — Reason matches one of the canonical codes (set membership check).
// ===========================================================================
describe('Q2 — reason codes are drawn from the canonical closed enum', () => {
    it('T3 — every emitted reason belongs to the canonical set', () => {
        // Sweep across configurations that exercise modified + partial paths.
        const configs: Array<{
            officer: Partial<NamedOfficer>;
            verb: PoliticalDirective['verb'];
        }> = [
            // Aggressive officer, defensive directive → cautious mismatch / pushback.
            { officer: { competence: 2, stubbornness: 4, aggressiveness: 5 }, verb: 'HONOR_TRUCE' },
            // Cautious officer, offensive directive → low compliance score.
            { officer: { competence: 2, stubbornness: 4, aggressiveness: 1 }, verb: 'PRESS_OFFENSIVE' },
            // Mid officer with mid stubbornness — modified compliance.
            { officer: { competence: 3, stubbornness: 3, aggressiveness: 4 }, verb: 'PREPARE_RESERVE' },
            // High aggressiveness on PRESS_OFFENSIVE — aligned, full path.
            { officer: { competence: 4, stubbornness: 2, aggressiveness: 5 }, verb: 'PRESS_OFFENSIVE' },
        ];

        for (const cfg of configs) {
            const state = makeStateWithArmyCO('RS', cfg.officer);
            const directive: PoliticalDirective = { verb: cfg.verb, target_corps_id: 'RS_corps_a' };
            const interp = interpretArmyDirective(state, 'RS', directive);
            for (const cd of interp.corps_directives) {
                if (cd.deviated) {
                    expect(cd.deviation_reason).toBeDefined();
                    expect(CANONICAL_REASON_CODES.has(cd.deviation_reason!)).toBe(true);
                } else {
                    expect(cd.deviation_reason).toBeUndefined();
                }
            }
        }
    });
});

// ===========================================================================
// T4 — Persisted slot includes `deviation_reason` after C1 persist.
// ===========================================================================
describe('Q2 — C1 persist forwards deviation_reason to the GameState slot', () => {
    it('T4 — persisted slot mirrors the in-memory directive reason', () => {
        const state = makeStateWithArmyCO('RS', {
            competence: 3, stubbornness: 4, aggressiveness: 5,
        });
        injectDirective(state, 'RS', { verb: 'PRESS_OFFENSIVE', target_corps_id: 'RS_corps_a' });

        applyArmyDirectiveInterpretation(state);

        const slot = readPersistedSlot(state);
        expect(slot).toBeDefined();
        expect(slot!['RS']).toBeDefined();

        // Walk every persisted corps; deviated ones MUST carry reason; non-
        // deviated ones MUST NOT.
        let deviatedCount = 0;
        for (const cd of Object.values(slot!['RS']!)) {
            if (cd.deviated === true) {
                deviatedCount++;
                expect(cd.deviation_reason).toBeDefined();
                expect(CANONICAL_REASON_CODES.has(cd.deviation_reason!)).toBe(true);
            } else {
                expect(cd.deviation_reason).toBeUndefined();
            }
        }
        expect(deviatedCount).toBeGreaterThan(0);
    });
});

// ===========================================================================
// T5 — Briefing overlay surfaces reason for downstream visibility
//       (API prompt mirrors C-lane bridge format and includes the reason).
// ===========================================================================
describe('Q2 — downstream visibility via API prompt + briefing overlay', () => {
    it('T5 — buildChainContextSection emits reason in the prompt when deviated', () => {
        const state = makeStateWithArmyCO('RS', {
            competence: 3, stubbornness: 4, aggressiveness: 5,
        });
        injectDirective(state, 'RS', { verb: 'PRESS_OFFENSIVE', target_corps_id: 'RS_corps_a' });
        applyArmyDirectiveInterpretation(state);

        const section = buildChainContextSection(state, 'RS');

        // Find at least one deviated line; it MUST include `reason: <code>`.
        const lines = section.split('\n');
        const deviatedLines = lines.filter(l => /compliance: deviated/.test(l));
        expect(deviatedLines.length).toBeGreaterThan(0);
        for (const line of deviatedLines) {
            // Format: "  - <corps_id>: role=<role> (compliance: deviated, reason: <code>)"
            expect(line).toMatch(/reason:\s*(aggressive_preference|cautious_preference|compliance_score_low)/);
        }

        // Full-compliance lines (if any) must NOT mention `reason:`.
        const fullLines = lines.filter(l => /compliance: full/.test(l));
        for (const line of fullLines) {
            expect(line).not.toMatch(/reason:/);
        }
    });

    it('T5b — briefing overlay reader carries reason field structurally', async () => {
        // Verify that the briefing.ts source path actually threads the
        // deviation_reason through (static-grep guard mirrors the C1 T2/T4b
        // pattern). Avoids spinning up the full SpatialContext for buildBriefing.
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const src = readFileSync(resolve('src/sim/combat/commander/briefing.ts'), 'utf8');
        expect(src).toMatch(/deviation_reason/);
        expect(src).toMatch(/campaign_role_deviation_reason/);
    });
});

// ===========================================================================
// T6 — Determinism: same state produces same reason.
// ===========================================================================
describe('Q2 — determinism', () => {
    it('T6 — repeated runs over identical inputs yield identical reasons', () => {
        const buildAndRun = (): string => {
            const state = makeStateWithArmyCO('RS', {
                competence: 3, stubbornness: 4, aggressiveness: 5,
            });
            injectDirective(state, 'RS', { verb: 'HOLD_AT_ALL_COSTS', target_corps_id: 'RS_corps_a' });
            applyArmyDirectiveInterpretation(state);
            // Stable serialization: sort by corps_id so JSON ordering is fixed.
            const slot = readPersistedSlot(state)!;
            const factionMap = slot['RS']!;
            const ordered = Object.keys(factionMap).sort().map(k => {
                const cd = factionMap[k];
                return `${k}|${cd.role}|${cd.deviated}|${cd.deviation_reason ?? '_none_'}`;
            }).join(';');
            return ordered;
        };
        const a = buildAndRun();
        const b = buildAndRun();
        const c = buildAndRun();
        expect(a).toBe(b);
        expect(b).toBe(c);
    });
});

// ===========================================================================
// T7 — Faction-symmetric: same reason logic for all 3 factions.
// ===========================================================================
describe('Q2 — faction-symmetric reason logic', () => {
    it('T7 — identical officer + verb → identical reason shape across RBiH/RS/HRHB', () => {
        const factions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
        const shapes: string[] = [];
        for (const faction of factions) {
            const state = makeStateWithArmyCO(faction, {
                competence: 3, stubbornness: 4, aggressiveness: 5,
            });
            injectDirective(state, faction, {
                verb: 'PRESS_OFFENSIVE',
                target_corps_id: `${faction}_corps_a`,
            });
            applyArmyDirectiveInterpretation(state);
            const slot = readPersistedSlot(state)!;
            const factionMap = slot[faction]!;
            // Strip faction id from corps key so we can compare role+reason shape.
            const normalized = Object.keys(factionMap).sort().map(k => {
                const cd = factionMap[k];
                const reason = cd.deviation_reason ?? '_none_';
                return `${k.replace(faction, 'F')}|${cd.role}|${cd.deviated}|${reason}`;
            }).join(';');
            shapes.push(normalized);
        }
        expect(shapes[0]).toBe(shapes[1]);
        expect(shapes[1]).toBe(shapes[2]);
    });

    it('T7b — no per-faction string-equality branches in Q2 mechanism source', async () => {
        const { readFileSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        // Q2 mechanism owners: A3 (writer) + briefing (reader). The
        // api_commander.ts file has a pre-existing alliance routing branch
        // for `faction === 'HRHB' || faction === 'RBiH'` that is data
        // routing, not a Q2 mechanism asymmetry; out of scope for this guard.
        const files = [
            'src/sim/combat/army_order_interpretation.ts',
            'src/sim/combat/commander/briefing.ts',
        ];
        for (const f of files) {
            const src = readFileSync(resolve(f), 'utf8');
            // Strip block + line comments so canonical comments mentioning
            // "RBiH"/"RS"/"HRHB" don't trigger the guard.
            let stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
            stripped = stripped.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
            expect(stripped, `${f}: faction === 'RS'`).not.toMatch(/faction\s*===\s*['"]RS['"]/);
            expect(stripped, `${f}: faction === 'RBiH'`).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
            expect(stripped, `${f}: faction === 'HRHB'`).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);
        }
    });
});
