/**
 * Brigade dissolution — automatically dissolve combat-ineffective brigades.
 *
 * Criteria (TWO of three must be true):
 * - personnel < DISSOLUTION_PERSONNEL_THRESHOLD (300)
 * - cohesion <= DISSOLUTION_COHESION_THRESHOLD (15)
 * - morale <= DISSOLUTION_MORALE_THRESHOLD (10)
 *
 * Historical: BB1 p.455 confirms brigades were destroyed (9th Grahovo LIB).
 * BB1 p.443: After Srebrenica, survivors reconstituted into 28th Division —
 * old units ceased to exist. Pattern: attrition → ineffectiveness → dissolution.
 *
 * On dissolution:
 * - status = 'inactive', lifecycle_status = 'destroyed'
 * - Remaining personnel × DISSOLUTION_PERSONNEL_TO_RESERVE_RATE added to faction strategic reserve
 * - Equipment transferred to nearest same-corps active brigade (70% salvaged)
 * - Logged in report
 *
 * Deterministic: sorted iteration by formation ID via strictCompare.
 */

import type { FormationId, FormationState, GameState } from '../../state/game_state.js';
import { isEnclaveBrigade } from './enclave_resilience.js';
import { strictCompare } from '../../state/validateGameState.js';
import { lookupStepCurve, type WarTimeline } from '../../state/war_timeline.js';

/**
 * Remove a brigade from its corps' active operation (participating_brigades + axes).
 * Must be called BEFORE setting status='inactive' so corps_id is still readable.
 * Follows the pattern established in jna_phantom_brigades.ts.
 */
export function removeFromActiveOperation(state: GameState, brigadeId: FormationId, corpsId: string | undefined | null): void {
    if (!corpsId) return;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return;
    for (const op of cmd.active_operations ?? []) {
        if (!op.participating_brigades.includes(brigadeId)) continue;
        op.participating_brigades = op.participating_brigades.filter(id => id !== brigadeId);
        if (Array.isArray(op.axes)) {
            for (const axis of op.axes) {
                axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== brigadeId);
            }
        }
        break; // A brigade can only be in one operation
    }
}

export const DISSOLUTION_PERSONNEL_THRESHOLD = 400;
export const DISSOLUTION_COHESION_THRESHOLD = 20;
export const DISSOLUTION_MORALE_THRESHOLD = 15;
/** Absolute floor: units below this dissolve regardless of other stats.
 *  A unit of ~150 men is a company remnant — not a brigade. */
export const DISSOLUTION_ABSOLUTE_FLOOR = 150;
/** Enclave brigades use a lower absolute floor — they are last-line defenders
 *  with nowhere to dissolve to. Historically survived at remnant strength (Goražde, Srebrenica). */
export const ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR = 50;
/** Personnel cap: brigades above this can't dissolve from morale+cohesion alone.
 *  A 1400-man brigade with low morale is demoralized, not destroyed —
 *  combat multipliers already penalize it at 30% effectiveness. */
export const DISSOLUTION_PERSONNEL_CAP = 800;
export const DISSOLUTION_PERSONNEL_TO_RESERVE_RATE = 0.5;
export const DISSOLUTION_EQUIPMENT_TRANSFER_RATE = 0.7;

/**
 * LANE-NIGHTSHIFT-N4-CANON-AMENDMENT (Engine Invariants v0.7.0 §6.2.4 +
 * Systems Manual v0.7.0 §6.4, 2026-05-03): turns of sustained morale
 * collapse (morale ≤ 15 with hysteresis reset > 20, tracked in
 * morale_drift.ts) before the morale-collapse override path bypasses
 * the personnel cap and 2-of-3 criteria. Gated behind env flag
 * MORALE_OVERRIDE_ENABLED (default false) — counter still increments
 * for diagnostic visibility when the gate is off.
 */
export const MORALE_OVERRIDE_TURNS = 8;

export interface DissolutionReport {
    dissolved_count: number;
    dissolved_brigades: Array<{
        id: string;
        name: string;
        faction: string;
        personnel_remaining: number;
        cohesion: number;
        morale: number;
        personnel_to_reserve: number;
    }>;
}

/**
 * LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-IMPLEMENTATION (2026-05-05):
 * Resolve a per-faction, per-turn dissolution threshold from the war_timeline
 * step-curve. Falls back to the hardcoded default constant when the timeline
 * is absent, the faction has no entry, or no step matches the current turn.
 *
 * MECHANISM is faction-symmetric — the same lookup runs for every faction.
 * DATA in `data/scenarios/timelines/apr1992.json` drives the asymmetry.
 *
 * Phase 0 audit: `docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md`.
 */
export function resolveDissolutionThreshold(
    timeline: WarTimeline | undefined,
    field: 'dissolution_personnel_threshold' | 'dissolution_cohesion_threshold' | 'dissolution_morale_threshold',
    faction: string | undefined,
    turn: number,
    defaultValue: number,
): number {
    if (!timeline || !faction) return defaultValue;
    const entries = timeline[field]?.[faction];
    return lookupStepCurve(entries, turn, defaultValue);
}

export function dissolveCombatIneffectiveBrigades(state: GameState): DissolutionReport {
    const report: DissolutionReport = { dissolved_count: 0, dissolved_brigades: [] };
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => strictCompare(a, b));

    // LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-IMPLEMENTATION: timeline + turn captured
    // once per call. Per-faction step-curve overrides (faction-symmetric MECHANISM,
    // faction-asymmetric DATA) drive Krivaja-95 calibration drift correction.
    const timeline = state.military.war_timeline;
    const currentTurn = state.meta?.turn ?? 0;

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;

        const personnel = f.personnel ?? 0;
        const cohesion = f.cohesion ?? 0;
        const morale = f.morale ?? 50;

        // Enclave brigades have a lower absolute floor — they are last-line defenders
        // with nowhere to dissolve to, and require ALL THREE criteria (not two).
        const isEnclave = isEnclaveBrigade(f);
        const absFloor = isEnclave ? ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR : DISSOLUTION_ABSOLUTE_FLOOR;
        const requiredCriteria = isEnclave ? 3 : 2;

        // LANE-NIGHTSHIFT-N4-CANON-AMENDMENT (Engine Invariants v0.7.0 §6.2.4 +
        // Systems Manual v0.7.0 §6.4, 2026-05-03): morale-collapse override.
        // A brigade with morale_low_streak ≥ MORALE_OVERRIDE_TURNS (8) dissolves
        // regardless of personnel cap. The streak counter is incremented in
        // morale_drift.ts whenever morale ≤ 15; reset when morale > 20.
        // Override is gated behind env flag MORALE_OVERRIDE_ENABLED (default
        // false) — when off, the personnel cap exit fires as before. The
        // streak counter still increments for diagnostic visibility.
        const moraleOverrideEnabled = process.env.MORALE_OVERRIDE_ENABLED === 'true';
        const streak = typeof f.morale_low_streak === 'number' ? f.morale_low_streak : 0;
        const moraleCollapseTrigger =
            moraleOverrideEnabled && streak >= MORALE_OVERRIDE_TURNS;

        // Personnel cap: brigades above DISSOLUTION_PERSONNEL_CAP can't dissolve from
        // morale+cohesion alone. A 1400-man brigade with low morale is demoralized, not
        // destroyed — combat multipliers already penalize it at 30% effectiveness.
        // Morale-collapse override (above) bypasses this cap.
        if (!moraleCollapseTrigger && personnel >= DISSOLUTION_PERSONNEL_CAP) continue;

        // Dissolution criteria: always require at least requiredCriteria to be met.
        // The absolute floor counts as the "low personnel" criterion automatically.
        // A brigade at 140 pers but 60 morale and 56 cohesion is a company-strength
        // unit still willing to fight — it shouldn't auto-dissolve just from being small.
        //
        // LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-IMPLEMENTATION (2026-05-05): each
        // threshold is now resolved through the war_timeline step-curve. Mechanism
        // is faction-symmetric (same lookup, same comparison, same gate); DATA in
        // apr1992.json drives faction-asymmetric calibration. The absolute floor
        // remains a hard kind-floor (a 50-100 person brigade is a company remnant
        // regardless of faction-specific calibration) and is NOT timeline-driven.
        const personnelThreshold = resolveDissolutionThreshold(
            timeline, 'dissolution_personnel_threshold', f.faction, currentTurn, DISSOLUTION_PERSONNEL_THRESHOLD,
        );
        const cohesionThreshold = resolveDissolutionThreshold(
            timeline, 'dissolution_cohesion_threshold', f.faction, currentTurn, DISSOLUTION_COHESION_THRESHOLD,
        );
        const moraleThreshold = resolveDissolutionThreshold(
            timeline, 'dissolution_morale_threshold', f.faction, currentTurn, DISSOLUTION_MORALE_THRESHOLD,
        );
        const lowPersonnel = personnel < personnelThreshold || personnel < absFloor;
        const lowCohesion = cohesion <= cohesionThreshold;
        const lowMorale = morale <= moraleThreshold;
        const criteriaCount = (lowPersonnel ? 1 : 0) + (lowCohesion ? 1 : 0) + (lowMorale ? 1 : 0);
        // LANE-NIGHTSHIFT-N4: morale-collapse override is the fourth, independent
        // dissolution path and bypasses the 2-of-3 (or 3-of-3 enclave) criteria.
        if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;

        // Wave 30 (2026-05-23): cohesion-only dissolution prevention. When the
        // dissolution criteria fire but personnel is ADEQUATE (≥ both
        // personnelThreshold and absFloor), the brigade is combat-fatigued, not
        // structurally destroyed. Demote `readiness='degraded'` and continue —
        // the existing per-turn cohesion drift + pool reinforcement will recover
        // it. Without this, post-Cincar HVO Guards brigades hit cohesion≤20 +
        // morale≤15 at t165 and are permanently orphaned at
        // lifecycle_status='destroyed', blocking Mistral 2's t175 brigade pool.
        // Morale-collapse override still triggers full dissolution (catastrophic
        // psychological collapse is a real destruction path).
        // Per docs/40_reports/audits/20260523_BRIGADE_LIFECYCLE_INVESTIGATION.md
        if (!moraleCollapseTrigger && !lowPersonnel) {
            f.readiness = 'degraded';
            continue;
        }

        // Dissolve
        const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);

        // Add personnel to strategic reserve
        if (state.military.strategic_reserves && f.faction) {
            const factionReserve = state.military.strategic_reserves[f.faction];
            if (typeof factionReserve === 'number') {
                (state.military.strategic_reserves as Record<string, number>)[f.faction] = factionReserve + personnelToReserve;
            }
        }

        // Transfer equipment to nearest same-corps active brigade
        if (f.composition && f.corps_id) {
            const salvageRate = DISSOLUTION_EQUIPMENT_TRANSFER_RATE;
            const tanksToTransfer = Math.floor((f.composition.tanks ?? 0) * salvageRate);
            const artilleryToTransfer = Math.floor((f.composition.artillery ?? 0) * salvageRate);

            // Find first alphabetically in same corps (deterministic)
            let targetBrigade: FormationState | null = null;
            for (const tid of formationIds) {
                const t = formations[tid];
                if (!t || t.status !== 'active' || tid === fid) continue;
                if (t.faction !== f.faction || t.corps_id !== f.corps_id) continue;
                if (t.kind !== 'brigade' && t.kind !== 'og') continue;
                targetBrigade = t;
                break;
            }

            if (targetBrigade && targetBrigade.composition) {
                targetBrigade.composition.tanks = (targetBrigade.composition.tanks ?? 0) + tanksToTransfer;
                targetBrigade.composition.artillery = (targetBrigade.composition.artillery ?? 0) + artilleryToTransfer;
            }

            // Zero out dissolved brigade's equipment to prevent duplication on reconstitution.
            // Without this, reconstituted brigades retain their original composition AND
            // the 70% transfer goes to the receiving brigade — duplicating equipment.
            f.composition.tanks = 0;
            f.composition.artillery = 0;
            f.composition.aa_systems = 0;
        }

        // Record dissolution
        report.dissolved_brigades.push({
            id: fid,
            name: f.name ?? fid,
            faction: f.faction ?? 'unknown',
            personnel_remaining: personnel,
            cohesion,
            morale: f.morale ?? 0,
            personnel_to_reserve: personnelToReserve,
        });

        // Remove from active operation before marking inactive
        removeFromActiveOperation(state, fid, f.corps_id);

        // Mark as destroyed
        f.status = 'inactive';
        f.lifecycle_status = 'destroyed';
        f.personnel = 0;
        // Record destruction turn for reconstitution delay
        f.destruction_turn = state.meta?.turn ?? 0;

        report.dissolved_count++;
    }

    return report;
}
