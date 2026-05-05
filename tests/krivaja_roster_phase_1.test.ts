/**
 * LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-IMPLEMENTATION (2026-05-05) — Phase 1
 * red-first contract for Krivaja-95 roster lifecycle calibration drift.
 *
 * Phase 0 panel verdict: CONDITIONS. Issue classified as calibration-drift
 * (not engine bug). Firing path: `dissolveCombatIneffectiveBrigades` 2-of-3
 * criteria at `src/sim/combat/brigade_dissolution.ts`. Three of five named
 * ICTY-cited Krivaja-95 brigades dissolved before t179 trigger:
 *   - rs_1st_zvornik (t120 / lowPersonnel + lowCohesion at c=20)
 *   - rs_1st_bratunac (t103 / 3-of-3)
 *   - rs_skelani_battalion (t171 / lowPersonnel + lowMorale at m=10)
 *
 * Phase 1 fix: faction-symmetric MECHANISM (dissolution criteria evaluation),
 * faction-asymmetric DATA via existing step-curve substrate. Adds optional
 * `dissolution_cohesion_threshold` / `dissolution_morale_threshold` /
 * `dissolution_personnel_threshold` step-curve overrides to the WarTimeline.
 * Apr1992.json supplies VRS late-war reductions. Other factions and other
 * windows fall back to the existing constants (no behaviour change).
 *
 * SHAPE α was chosen (smallest delta, durable KNOWLEDGE pattern):
 *   - VRS cohesion threshold: 20 → 15 from turn 52 onward.
 *   - VRS morale threshold:   15 → 9 from turn 104 onward.
 *
 * Determinism: pure synchronous; no I/O; no random; no Date.now.
 *
 * Predecessor audit: docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md
 */

import { describe, it, expect } from 'vitest';
import {
    dissolveCombatIneffectiveBrigades,
    resolveDissolutionThreshold,
    DISSOLUTION_PERSONNEL_THRESHOLD,
    DISSOLUTION_COHESION_THRESHOLD,
    DISSOLUTION_MORALE_THRESHOLD,
} from '../src/sim/combat/brigade_dissolution.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import type { WarTimeline } from '../src/state/war_timeline.js';

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

/**
 * Construct a Krivaja-Phase-1 calibrated WarTimeline. Mirrors the data block
 * appended to data/scenarios/timelines/apr1992.json: VRS cohesion threshold
 * drops to 15 at turn 52; VRS morale threshold drops to 9 at turn 104.
 */
function makeKrivajaTimeline(): WarTimeline {
    return {
        id: 'krivaja_phase1_test',
        doctrine_phases: {},
        standing_orders: {},
        cohesion_drift: {},
        cohesion_floor: {},
        cohesion_ceiling: {},
        reinforcement_mult: {},
        equipment_decay: [],
        external_support: [],
        maintenance_decay: [],
        dissolution_cohesion_threshold: {
            RS: [
                { start_turn: 0, end_turn: 52, value: 20 },
                { start_turn: 52, end_turn: 9999, value: 15 },
            ],
        },
        dissolution_morale_threshold: {
            RS: [
                { start_turn: 0, end_turn: 104, value: 15 },
                { start_turn: 104, end_turn: 9999, value: 9 },
            ],
        },
    };
}

function makeState(brigade: FormationState, turn: number, withTimeline: boolean): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'krivaja-phase1-test' } as any,
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
            ...(withTimeline ? { war_timeline: makeKrivajaTimeline() } : {}),
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1 — resolveDissolutionThreshold helper', () => {
    it('K1 — falls back to default when timeline is undefined', () => {
        const v = resolveDissolutionThreshold(undefined, 'dissolution_cohesion_threshold', 'RS', 100, DISSOLUTION_COHESION_THRESHOLD);
        expect(v).toBe(DISSOLUTION_COHESION_THRESHOLD);
    });

    it('K2 — falls back to default when faction is undefined', () => {
        const tl = makeKrivajaTimeline();
        const v = resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', undefined, 100, DISSOLUTION_COHESION_THRESHOLD);
        expect(v).toBe(DISSOLUTION_COHESION_THRESHOLD);
    });

    it('K3 — falls back to default for a faction with no entry (RBiH)', () => {
        const tl = makeKrivajaTimeline();
        const c = resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RBiH', 100, DISSOLUTION_COHESION_THRESHOLD);
        const m = resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RBiH', 200, DISSOLUTION_MORALE_THRESHOLD);
        const p = resolveDissolutionThreshold(tl, 'dissolution_personnel_threshold', 'RBiH', 50, DISSOLUTION_PERSONNEL_THRESHOLD);
        expect(c).toBe(DISSOLUTION_COHESION_THRESHOLD);
        expect(m).toBe(DISSOLUTION_MORALE_THRESHOLD);
        expect(p).toBe(DISSOLUTION_PERSONNEL_THRESHOLD);
    });

    it('K4 — RS cohesion threshold: 20 in early window, 15 in late window', () => {
        const tl = makeKrivajaTimeline();
        expect(resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RS', 0, 20)).toBe(20);
        expect(resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RS', 51, 20)).toBe(20);
        expect(resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RS', 52, 20)).toBe(15);
        expect(resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RS', 188, 20)).toBe(15);
    });

    it('K5 — RS morale threshold: 15 in early/mid window, 9 in late-war window', () => {
        const tl = makeKrivajaTimeline();
        expect(resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 0, 15)).toBe(15);
        expect(resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 103, 15)).toBe(15);
        expect(resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 104, 15)).toBe(9);
        expect(resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 179, 15)).toBe(9);
    });
});

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1 — Krivaja roster survives Phase 1 calibration', () => {
    /** rs_1st_zvornik scenario reconstruction at t120: combat hit reduces personnel
     *  to ~250, cohesion stuck at 20, morale=95. Without the fix: 2-of-3 (lowPersonnel
     *  + lowCohesion) → dissolved. With the fix: cohesion threshold = 15 at t120,
     *  c=20 > 15 → !lowCohesion → 1-of-3 → SURVIVES. */
    it('K6 — RS Zvornik t120 trajectory: c=20 + p=250 + m=95 SURVIVES with timeline (cohesion threshold = 15)', () => {
        const f = makeBrigade({
            id: 'rs_1st_zvornik',
            personnel: 250, // post-combat hit, < 400 default
            cohesion: 20,   // stuck at calibration floor
            morale: 95,
        });
        const state = makeState(f, 120, /*withTimeline=*/ true);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(0);
        expect(f.status).toBe('active');
    });

    it('K7 — RS Zvornik t120 trajectory dissolves WITHOUT timeline (regression-class control)', () => {
        // Same brigade state; timeline absent → falls back to default constants
        // → 2-of-3 fires (lowPersonnel 250<400 + lowCohesion 20<=20).
        const f = makeBrigade({
            id: 'rs_1st_zvornik',
            personnel: 250,
            cohesion: 20,
            morale: 95,
        });
        const state = makeState(f, 120, /*withTimeline=*/ false);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
        expect(f.status).toBe('inactive');
    });

    /** rs_skelani_battalion scenario reconstruction at t171: p=236, m=10, c=65.
     *  Without the fix: 2-of-3 (lowPersonnel 236<400 + lowMorale 10<=15) → dissolved.
     *  With the fix: morale threshold = 9 at t171, m=10 > 9 → !lowMorale → 1-of-3
     *  → SURVIVES. */
    it('K8 — RS Skelani t171 trajectory: p=236 + m=10 + c=65 SURVIVES with timeline (morale threshold = 9)', () => {
        const f = makeBrigade({
            id: 'rs_skelani_battalion',
            personnel: 236,
            cohesion: 65,
            morale: 10,
        });
        const state = makeState(f, 171, /*withTimeline=*/ true);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(0);
        expect(f.status).toBe('active');
    });

    it('K9 — RS Skelani t171 trajectory dissolves WITHOUT timeline (regression-class control)', () => {
        const f = makeBrigade({
            id: 'rs_skelani_battalion',
            personnel: 236,
            cohesion: 65,
            morale: 10,
        });
        const state = makeState(f, 171, /*withTimeline=*/ false);
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
        expect(f.status).toBe('inactive');
    });
});

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1 — faction-symmetric mechanism guard', () => {
    /** The MECHANISM is faction-symmetric: the same dissolution criteria, same
     *  step-curve lookup, same gate evaluation runs for every faction. The DATA
     *  in apr1992.json adds entries only for VRS (RS); other factions fall back
     *  to the canonical constants. This guard test demonstrates that an ARBiH
     *  (RBiH) brigade with the SAME trajectory as Skelani still dissolves —
     *  not because of any RS-vs-RBiH branch in code, but because the timeline
     *  has no RBiH override entry. */
    it('K10 — RBiH brigade with identical trajectory STILL dissolves (timeline has no RBiH override)', () => {
        const f = makeBrigade({
            id: 'rbih_test_brigade',
            faction: 'RBiH',
            corps_id: 'rbih_corps',
            personnel: 236,
            cohesion: 65,
            morale: 10,
        });
        const state = makeState(f, 171, /*withTimeline=*/ true);
        // Add corps for RBiH side
        (state.military as any).corps_command.rbih_corps = {
            command_span: 1, subordinate_count: 1, og_slots: 0,
            active_ogs: [], corps_exhaustion: 0, stance: 'defensive',
            active_operations: [],
        };
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(1);
        expect(f.status).toBe('inactive');
    });

    /** A second guard demonstrating that adding RBiH override DATA (with no
     *  CODE change) would protect an RBiH brigade in exactly the same way.
     *  Confirms the mechanism truly is faction-symmetric — only data drives
     *  asymmetry. */
    it('K11 — RBiH brigade with hand-rolled timeline override SURVIVES (mechanism is data-driven)', () => {
        const f = makeBrigade({
            id: 'rbih_test_brigade',
            faction: 'RBiH',
            corps_id: 'rbih_corps',
            personnel: 236,
            cohesion: 65,
            morale: 10,
        });
        const state = makeState(f, 171, /*withTimeline=*/ true);
        // Inject RBiH-specific override data into the SAME mechanism
        (state.military as any).war_timeline.dissolution_morale_threshold.RBiH = [
            { start_turn: 0, end_turn: 9999, value: 9 },
        ];
        (state.military as any).corps_command.rbih_corps = {
            command_span: 1, subordinate_count: 1, og_slots: 0,
            active_ogs: [], corps_exhaustion: 0, stance: 'defensive',
            active_operations: [],
        };
        const report = dissolveCombatIneffectiveBrigades(state);
        expect(report.dissolved_brigades.length).toBe(0);
        expect(f.status).toBe('active');
    });
});

describe('LANE-NIGHTSHIFT-KRIVAJA-PHASE-1 — determinism + threshold pin', () => {
    /** The early-war / 40w smoke window (turn ≤ 51) MUST see byte-identical
     *  threshold values whether or not the new timeline overrides are present.
     *  This pins the 40w hash drift class to "no shift expected for early war".
     *  Both the no-timeline default AND the timeline first-step value must be
     *  the canonical default. */
    it('K12 — turn ≤ 51 with timeline returns byte-identical thresholds vs no-timeline path', () => {
        const tl = makeKrivajaTimeline();
        for (const turn of [0, 1, 25, 39, 40, 51]) {
            const cWith = resolveDissolutionThreshold(tl, 'dissolution_cohesion_threshold', 'RS', turn, DISSOLUTION_COHESION_THRESHOLD);
            const cNo = resolveDissolutionThreshold(undefined, 'dissolution_cohesion_threshold', 'RS', turn, DISSOLUTION_COHESION_THRESHOLD);
            expect(cWith, `turn=${turn} cohesion`).toBe(cNo);
            const mWith = resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', turn, DISSOLUTION_MORALE_THRESHOLD);
            const mNo = resolveDissolutionThreshold(undefined, 'dissolution_morale_threshold', 'RS', turn, DISSOLUTION_MORALE_THRESHOLD);
            expect(mWith, `turn=${turn} morale`).toBe(mNo);
            // Personnel curve not defined for any faction: always default.
            const pWith = resolveDissolutionThreshold(tl, 'dissolution_personnel_threshold', 'RS', turn, DISSOLUTION_PERSONNEL_THRESHOLD);
            expect(pWith, `turn=${turn} personnel`).toBe(DISSOLUTION_PERSONNEL_THRESHOLD);
        }
    });

    /** Threshold pin: the canonical engine constants do not regress across the
     *  Phase 1 patch — the lane changes calibration data, not constants. */
    it('K13 — threshold constants are unchanged: 400/20/15', () => {
        expect(DISSOLUTION_PERSONNEL_THRESHOLD).toBe(400);
        expect(DISSOLUTION_COHESION_THRESHOLD).toBe(20);
        expect(DISSOLUTION_MORALE_THRESHOLD).toBe(15);
    });

    /** Determinism: two consecutive calls with the same inputs return the same
     *  result; no internal mutation or hidden state. */
    it('K14 — repeated lookup is deterministic', () => {
        const tl = makeKrivajaTimeline();
        const a = resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 179, 15);
        const b = resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 179, 15);
        const c = resolveDissolutionThreshold(tl, 'dissolution_morale_threshold', 'RS', 179, 15);
        expect(a).toBe(b);
        expect(b).toBe(c);
        expect(a).toBe(9);
    });
});
