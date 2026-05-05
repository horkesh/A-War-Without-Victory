/**
 * LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5-IMPLEMENTATION (2026-05-06) — Phase 1.5
 * SHAPE δε combined: per-turn morale_drift cap + earlier dissolution-threshold
 * step-curve start_turn shift.
 *
 * Predecessor: docs/40_reports/audits/20260506_KRIVAJA_PHASE_1_5_MINI_PANEL.md
 * (commit 31952d44, verdict CONDITIONS).
 *
 * Phase 1 SHAPE α widened the cohesion floor at turn 52 and morale floor at
 * turn 104 for RS only. That recovered rs_1st_zvornik but failed to save
 * rs_1st_bratunac (t113 / cumulative drift) and rs_skelani_battalion (t171 /
 * single-turn morale step from m=20 → m=10 ate the entire safety margin
 * between hysteresis-reset >20 and the widened dissolution threshold).
 *
 * This phase ships TWO levers in one lane:
 *   SHAPE δ — `MORALE_DRIFT_MAX_PER_TURN` clamp (default 8/turn,
 *             faction-symmetric, faction-keyed timeline override path).
 *             Bounds the absolute magnitude of NEGATIVE drift before the
 *             0..100 floor/ceiling clamp inside `runMoraleDrift`. Targets
 *             the metastable-edge case (Skelani).
 *   SHAPE ε — apr1992.json dissolution step-curve start_turn shift from
 *             52→39 (cohesion) and from 104→39 with an intermediate step
 *             value 12 (morale). Targets the cumulative-drift case
 *             (Bratunac).
 *
 * MECHANISM is faction-symmetric (no `if (faction === 'RS')` branches; no
 * Krivaja brigade ID strings; no hardcoded OSIDs in source). Asymmetric
 * data lives in the timeline JSON.
 *
 * Determinism: pure synchronous; no I/O; no random; no Date.now.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import {
    MORALE_DRIFT_MAX_PER_TURN,
    FACTION_MORALE_DRIFT_MAX_FALLBACK,
    resolveMoraleDriftMaxPerTurn,
} from '../src/state/formation_constants.js';
import { lookupStepCurve, type WarTimeline } from '../src/state/war_timeline.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

/** Build a one-mun population fixture for the canonical "op:test:home_2" OSID. */
function makePop(serb: number, bosniak: number, croat = 0, other = 0): MunicipalityPopulation1991Map {
    return {
        test: { total: serb + bosniak + croat + other, bosniak, serb, croat, other },
    } as MunicipalityPopulation1991Map;
}

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'rs_test_brigade',
        faction: 'RS',
        name: 'Test Brigade',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'rs_corps',
        location_osid: 'op:test:home_2',
        home_osid: 'op:test:home_2',
        personnel: 2000,
        morale: 60,
        cohesion: 50,
        ...overrides,
    } as FormationState;
}

function makeState(brigade: FormationState, turn: number, timeline?: WarTimeline): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'krivaja-phase1.5-test' } as any,
        military: {
            formations: { [brigade.id]: brigade } as any,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: {
                rs_corps: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [],
                } as any,
            },
            ...(timeline ? { war_timeline: timeline } : {}),
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

// ─────────────────────────────────────────────────────────────────────────
// SHAPE δ: per-turn morale_drift cap
// ─────────────────────────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5 — SHAPE δ per-turn cap', () => {
    it('K15 — clamp at panel-default 8 points/turn (catastrophic battle stack)', () => {
        // Mirror Skelani's pathological path. A brigade that arrives at the
        // dissolution-criteria edge (m=20, c=68, p=236) and absorbs a
        // catastrophic battle outcome with RS defeat sensitivity:
        //   BATTLE_MORALE_DRIFT['catastrophic'] (-4) × 1.3 ≈ -5
        // plus AFFINITY_DRIFT_DOWN (-2), ENCIRCLEMENT_ENEMY_POP_DRIFT (-3),
        // CRITICAL_EXHAUSTION_PENALTY (-1.5) — the worst-case stack is
        // ~-12 and would drop morale 20 → 8. With the 8/turn cap morale
        // drops to no lower than 12 in a single turn (graduated descent).
        const b = makeBrigade({
            morale: 20,
            ops: { fatigue: 100 } as any,                  // CRITICAL_EXHAUSTION_PENALTY
            recent_battle_outcome: 'catastrophic',         // -5.2 on RS
            location_osid: 'op:test:home_2',
        } as any);
        const state = makeState(b, 50);
        // Mark encircled in enemy population (negative encirclement drift).
        state.military.brigade_encircled = { [b.id]: true } as any;
        // Population map: enemy-pop OSID for the test mun (Bosniak-majority,
        // RS faction sees affinity ≈ 0 < 0.30 LOW_AFFINITY_THRESHOLD).
        const pop = makePop(/* serb */ 0, /* bosniak */ 1000);
        runMoraleDrift(state, [], pop);
        const final = state.military.formations![b.id]!.morale!;
        // 20 - 8 = 12 is the cap-bound floor for a single turn.
        expect(final).toBeGreaterThanOrEqual(12);
        // The full uncapped negative stack would have driven morale below 12.
        expect(final).toBeLessThan(20);
    });

    it('K16 — faction-symmetric: same clamp applies to RBiH and HRHB', () => {
        // No faction branch in the mechanism. Confirm cap value ties to the
        // FACTION_MORALE_DRIFT_MAX_FALLBACK map and the resolver returns
        // the same numeric value for all three factions in the default
        // (no-timeline) profile.
        for (const f of ['RS', 'RBiH', 'HRHB']) {
            expect(resolveMoraleDriftMaxPerTurn(f, 0)).toBe(MORALE_DRIFT_MAX_PER_TURN);
            expect(resolveMoraleDriftMaxPerTurn(f, 100)).toBe(MORALE_DRIFT_MAX_PER_TURN);
            expect(FACTION_MORALE_DRIFT_MAX_FALLBACK[f]).toBe(MORALE_DRIFT_MAX_PER_TURN);
        }
    });

    it('K17 — falls back to scalar default when faction is undefined', () => {
        expect(resolveMoraleDriftMaxPerTurn(undefined, 0)).toBe(MORALE_DRIFT_MAX_PER_TURN);
        expect(resolveMoraleDriftMaxPerTurn(undefined, 200)).toBe(MORALE_DRIFT_MAX_PER_TURN);
    });

    it('K18 — timeline override path wins over faction fallback', () => {
        const timeline: WarTimeline = {
            id: 'phase1.5-override-test',
            doctrine_phases: {},
            standing_orders: {},
            cohesion_drift: {},
            cohesion_floor: {},
            cohesion_ceiling: {},
            reinforcement_mult: {},
            equipment_decay: [],
            external_support: [],
            maintenance_decay: [],
            morale_drift_max_per_turn: {
                RS: [
                    { start_turn: 0, end_turn: 50, value: 20 },
                    { start_turn: 50, end_turn: 9999, value: 5 },
                ],
            },
        };
        // Pre-50: timeline says 20 (above default 8).
        expect(resolveMoraleDriftMaxPerTurn('RS', 10, timeline)).toBe(20);
        // Post-50: timeline says 5 (below default 8).
        expect(resolveMoraleDriftMaxPerTurn('RS', 60, timeline)).toBe(5);
        // Other factions still get the fallback.
        expect(resolveMoraleDriftMaxPerTurn('RBiH', 60, timeline)).toBe(MORALE_DRIFT_MAX_PER_TURN);
    });

    it('K19 — positive drift NOT clamped (cap only bounds negative)', () => {
        // Brigade in own-affinity, encircled, defending — positive drift only.
        const b = makeBrigade({
            morale: 30,
            location_osid: 'op:test:home_2',
        });
        const state = makeState(b, 10);
        state.military.brigade_encircled = { [b.id]: true } as any;
        // Serb-majority population: RS affinity ≈ 1.0 > 0.70 HIGH_AFFINITY_THRESHOLD.
        const pop = makePop(/* serb */ 1000, /* bosniak */ 0);
        runMoraleDrift(state, [], pop);
        const final = state.military.formations![b.id]!.morale!;
        // Affinity +2 + encirclement own-pop +3 = +5 positive drift.
        // The cap does not clamp positive drift, so morale rises by the full +5.
        expect(final).toBe(35);
    });

    it('K20 — single small negative drift below cap is unchanged', () => {
        // Brigade in enemy-pop OSID gets only AFFINITY_DRIFT_DOWN (-2).
        // -2 magnitude is below the 8-point cap; the clamp must NOT
        // alter this drift (preserves legitimate small drift events).
        const b = makeBrigade({
            morale: 50,
            location_osid: 'op:test:home_2',
        });
        const state = makeState(b, 10);
        const pop = makePop(/* serb */ 0, /* bosniak */ 1000);
        runMoraleDrift(state, [], pop);
        const final = state.military.formations![b.id]!.morale!;
        expect(final).toBe(48); // 50 - 2 = 48 (uncapped small drift).
    });

    it('K21 — determinism: identical setup produces identical output across two runs', () => {
        const setup = () => {
            const b = makeBrigade({
                morale: 20,
                ops: { fatigue: 100 } as any,
                recent_battle_outcome: 'catastrophic',
            } as any);
            const state = makeState(b, 100);
            state.military.brigade_encircled = { [b.id]: true } as any;
            const pop = makePop(/* serb */ 0, /* bosniak */ 1000);
            runMoraleDrift(state, [], pop);
            return state.military.formations![b.id]!.morale!;
        };
        expect(setup()).toBe(setup());
    });
});

// ─────────────────────────────────────────────────────────────────────────
// SHAPE ε: apr1992.json step-curve start_turn shift
// ─────────────────────────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5 — SHAPE ε start_turn shift', () => {
    // Locate the canonical apr1992.json so the test pins the exact production
    // data values rather than re-encoding them in the test fixture.
    const apr1992Path = path.resolve(__dirname, '..', 'data', 'scenarios', 'timelines', 'apr1992.json');
    const raw = JSON.parse(fs.readFileSync(apr1992Path, 'utf-8'));

    it('K22 — cohesion threshold widening starts at turn 39 (early-mid-war boundary), not 52', () => {
        const cohEntries = raw.dissolution_cohesion_threshold?.RS;
        expect(Array.isArray(cohEntries)).toBe(true);
        const widened = cohEntries.find((e: any) => e.value === 15);
        expect(widened?.start_turn).toBe(39);
        const original = cohEntries.find((e: any) => e.value === 20);
        // The 20-floor entry must end exactly where the 15-floor entry begins.
        expect(original?.end_turn).toBe(39);
    });

    it('K23 — morale threshold has intermediate step at turn 39 with value 12', () => {
        const morEntries = raw.dissolution_morale_threshold?.RS;
        expect(Array.isArray(morEntries)).toBe(true);
        // Phase 1.5 mini-panel proposed adding a third step at turn 39.
        // The intermediate value (12) sits between the original 15 and the
        // late-war 9 floor. Sequence must be: 15 → 12 (turn 39) → 9 (turn 104).
        const intermediate = morEntries.find((e: any) => e.start_turn === 39);
        expect(intermediate).toBeDefined();
        expect(intermediate!.end_turn).toBe(104);
        expect(intermediate!.value).toBe(12);
    });

    it('K24 — step-curve effective at turn 39+: lookupStepCurve returns widened cohesion floor', () => {
        const cohEntries = raw.dissolution_cohesion_threshold?.RS;
        // Pre-39 should still see the original threshold 20.
        expect(lookupStepCurve(cohEntries, 38, 99)).toBe(20);
        // At and beyond turn 39 the widened floor 15 applies.
        expect(lookupStepCurve(cohEntries, 39, 99)).toBe(15);
        expect(lookupStepCurve(cohEntries, 100, 99)).toBe(15);
        expect(lookupStepCurve(cohEntries, 200, 99)).toBe(15);
    });

    it('K25 — morale curve effective: 15 → 12 (turn 39) → 9 (turn 104)', () => {
        const morEntries = raw.dissolution_morale_threshold?.RS;
        expect(lookupStepCurve(morEntries, 0, 99)).toBe(15);
        expect(lookupStepCurve(morEntries, 38, 99)).toBe(15);
        expect(lookupStepCurve(morEntries, 39, 99)).toBe(12);
        expect(lookupStepCurve(morEntries, 103, 99)).toBe(12);
        expect(lookupStepCurve(morEntries, 104, 99)).toBe(9);
        expect(lookupStepCurve(morEntries, 200, 99)).toBe(9);
    });

    it('K26 — non-RS factions still fall back to defaults (no SHAPE ε leakage)', () => {
        const cohEntries = raw.dissolution_cohesion_threshold;
        const morEntries = raw.dissolution_morale_threshold;
        expect(cohEntries.RBiH).toBeUndefined();
        expect(cohEntries.HRHB).toBeUndefined();
        expect(morEntries.RBiH).toBeUndefined();
        expect(morEntries.HRHB).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────
// Static-grep guards: faction-symmetric mechanism, no hardcoded brigade IDs
// ─────────────────────────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5 — static-grep guards', () => {
    const SOURCES_TO_SCAN: string[] = [
        path.resolve(__dirname, '..', 'src', 'sim', 'combat', 'morale_drift.ts'),
        path.resolve(__dirname, '..', 'src', 'state', 'formation_constants.ts'),
        path.resolve(__dirname, '..', 'src', 'state', 'war_timeline.ts'),
        path.resolve(__dirname, '..', 'src', 'sim', 'combat', 'brigade_dissolution.ts'),
    ];
    const sources: Record<string, string> = {};
    for (const p of SOURCES_TO_SCAN) {
        sources[p] = fs.readFileSync(p, 'utf-8');
    }

    it('K27 — no hardcoded Krivaja brigade IDs introduced by SHAPE δε surface', () => {
        // Per AC3: the lane's MECHANISM must be faction-symmetric — brigade
        // IDs are forbidden in the changed code. Pre-existing references to
        // `KRIVAJA` in lane-marker comments (this lane's own marker) and to
        // `Krivaja-95` in panel-citation comments are not brigade-ID hardcoding
        // and are explicitly tolerated by AC3 ("hardcoded brigade IDs in
        // source"). The banned set below is the literal brigade-ID strings
        // that were the predecessor's investigation cohort — none must
        // appear in the four owner files that this lane touches.
        const bannedBrigadeIds = [
            'rs_1st_zvornik',
            'rs_1st_bratunac',
            'rs_skelani_battalion',
            'rs_1st_milii',
            'rs_5th_podrinje',
        ];
        const ownerFiles = [
            path.resolve(__dirname, '..', 'src', 'sim', 'combat', 'morale_drift.ts'),
            path.resolve(__dirname, '..', 'src', 'state', 'formation_constants.ts'),
            path.resolve(__dirname, '..', 'src', 'state', 'war_timeline.ts'),
        ];
        for (const file of ownerFiles) {
            const text = sources[file]!;
            for (const id of bannedBrigadeIds) {
                expect(
                    text.includes(id),
                    `${file} unexpectedly contains hardcoded brigade-ID token "${id}"`,
                ).toBe(false);
            }
        }
    });

    it('K28 — no `if (faction === \'RS\')` branches in SHAPE δ clamp surface', () => {
        // Mechanism must be faction-symmetric in NEW code. Per-faction
        // differences come exclusively from data (timeline JSON +
        // faction-keyed fallback map values which are EQUAL in the default
        // profile).
        //
        // Scope this guard tightly to the SHAPE δ clamp surface introduced
        // in this lane: the new `resolveMoraleDriftMaxPerTurn` resolver in
        // formation_constants.ts and the new clamp block in morale_drift.ts.
        // Pre-existing `if (faction === 'RS')` branches in
        // `getFactionReinforcementMult` / `deriveMaxPersonnel` (out of
        // SHAPE δε scope) are tolerated.
        const fcText = sources[path.resolve(__dirname, '..', 'src', 'state', 'formation_constants.ts')]!;
        // Resolver function body: fence between its declaration line and the
        // closing `}` of the function.
        const resolverStart = fcText.indexOf('export function resolveMoraleDriftMaxPerTurn');
        expect(resolverStart).toBeGreaterThan(0);
        const resolverEnd = fcText.indexOf('\n}', resolverStart);
        expect(resolverEnd).toBeGreaterThan(resolverStart);
        const resolverBody = fcText.slice(resolverStart, resolverEnd + 2);
        expect(resolverBody).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        expect(resolverBody).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
        expect(resolverBody).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);

        // morale_drift.ts SHAPE δ clamp block: bracketed by the lane marker
        // comment and the immediately-following `f.morale = Math.max(...)` line
        // that already existed pre-lane.
        const mdText = sources[path.resolve(__dirname, '..', 'src', 'sim', 'combat', 'morale_drift.ts')]!;
        const clampStart = mdText.indexOf('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5-IMPLEMENTATION');
        expect(clampStart).toBeGreaterThan(0);
        const clampEnd = mdText.indexOf('const prev = f.morale;', clampStart);
        expect(clampEnd).toBeGreaterThan(clampStart);
        const clampBody = mdText.slice(clampStart, clampEnd);
        expect(clampBody).not.toMatch(/faction\s*===\s*['"]RS['"]/);
        expect(clampBody).not.toMatch(/faction\s*===\s*['"]RBiH['"]/);
        expect(clampBody).not.toMatch(/faction\s*===\s*['"]HRHB['"]/);
    });

    it('K29 — formation_constants.ts default fallback values are EQUAL across factions', () => {
        // Faction-symmetric DEFAULT profile invariant. The SOURCE-SIDE
        // fallback map must never seed faction-asymmetric defaults; if the
        // calibration team wants asymmetry, it goes in the TIMELINE JSON,
        // never here.
        const values = Object.values(FACTION_MORALE_DRIFT_MAX_FALLBACK);
        for (const v of values) {
            expect(v).toBe(MORALE_DRIFT_MAX_PER_TURN);
        }
    });
});
