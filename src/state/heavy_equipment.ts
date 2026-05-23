import { ensureEmbargoProfiles, getEffectiveHeavyEquipmentAccess } from './embargo.js';
import type { FactionId, FormationState, GameState, PostureLevel } from './game_state.js';
import { clamp01 } from '../utils/math.js';

export const BASE_DEGRADATION_RATE = 0.02;
export const OPERATIONAL_TEMPO_OFFENSIVE = 1.5;
export const OPERATIONAL_TEMPO_REFIT = 0.3;
export const DEGRADED_EFFECTIVENESS = 0.5;
export const REPAIR_COST_DEGRADED = 3.0;
export const REPAIR_COST_NON_OPERATIONAL = 10.0;

/** Minimum operational_heavy fraction maintained per formation after the degrade
 *  cascade, by drawing from degraded_heavy back into operational_heavy.
 *
 *  2026-05-22 forensics finding (`20260522_FORENSICS_VRS_EQUIPMENT_OVERSHOOT.md`):
 *  without this floor the integer-count cascade in `updateHeavyEquipmentState`
 *  drives `operational_heavy` to literal zero by ~turn 30-45 per brigade
 *  (130+ turn overshoot past historical Dayton residual). The repair path
 *  immediately below is structurally dead at realistic VRS maintenance scores
 *  (maintenanceScore=0.1476 → floor(1.476)=1 action → floor(1/3)=0 repairs/turn),
 *  so the only one-way ratchet has no escape. 30% matches the historical
 *  Dayton-era VRS heavy-equipment operational fraction per BB1/BB2 sources.
 *  The floor restores from `degraded_heavy` only — not from `non_operational_heavy` —
 *  which preserves the cascade ordering (operational → degraded → non_operational)
 *  while preventing the operational tier from extincting.  */
export const OPERATIONAL_HEAVY_FLOOR_FRACTION = 0.30;

function postureTempo(posture: PostureLevel | undefined): number {
    switch (posture) {
        case 'push':
            return OPERATIONAL_TEMPO_OFFENSIVE;
        case 'probe':
            return 1.2;
        case 'hold':
            return 1.0;
        default:
            return 1.0;
    }
}

export function initializeEquipmentStateForFormation(
    formation: FormationState,
    factionId: FactionId,
    state: GameState
): void {
    if (formation.equipment_state) return;
    ensureEmbargoProfiles(state);
    const faction = state.factions.find((f) => f.id === factionId);
    const access = getEffectiveHeavyEquipmentAccess(faction?.embargo_profile);
    const base = formation.kind === 'brigade' || formation.kind === 'operational_group' ? 100 : 0;
    const total = Math.round(base * access);
    formation.equipment_state = {
        operational_heavy: total,
        degraded_heavy: 0,
        non_operational_heavy: 0,
        total_heavy: total,
        maintenance_deficit: 0,
        last_maintenance: null
    };
}

function computeMaintenanceCapacityScore(state: GameState, factionId: FactionId): number {
    const faction = state.factions.find((f) => f.id === factionId);
    if (!faction?.maintenance_capacity) return 0.5;
    const mc = faction.maintenance_capacity;
    const score = mc.base_capacity * mc.skilled_technicians * mc.spare_parts_availability * mc.workshop_access * mc.external_support;
    return clamp01(score);
}

export function getEffectiveEquipmentRatio(formation: FormationState): number {
    const eq = formation.equipment_state;
    if (!eq || eq.total_heavy <= 0) return 1;
    const effective = eq.operational_heavy + eq.degraded_heavy * DEGRADED_EFFECTIVENESS;
    return clamp01(effective / eq.total_heavy);
}

export function updateHeavyEquipmentState(
    state: GameState,
    effectivePosture?: Record<string, { assignments?: Record<string, { posture: PostureLevel }> }>,
    doctrineTempoByFormation?: Record<string, number>
): void {
    const turn = state.meta.turn;
    const formationIds = Object.keys(state.military.formations ?? {}).sort((a, b) => a.localeCompare(b));

    for (const fid of formationIds) {
        const formation = state.military.formations[fid];
        if (!formation) continue;
        initializeEquipmentStateForFormation(formation, formation.faction, state);
        const eq = formation.equipment_state!;

        const assignment = formation.assignment;
        const posture =
            assignment && assignment.kind === 'edge' && assignment.edge_id
                ? effectivePosture?.[formation.faction]?.assignments?.[assignment.edge_id]?.posture
                : undefined;
        const tempoBase = postureTempo(posture);
        const doctrineTempo = doctrineTempoByFormation?.[formation.id] ?? 1.0;
        const operationalTempo = tempoBase * doctrineTempo;

        const maintenanceScore = computeMaintenanceCapacityScore(state, formation.faction);
        const maintenanceDeficit = clamp01(1 - maintenanceScore);
        const spareParts = state.factions.find((f) => f.id === formation.faction)?.embargo_profile?.maintenance_capacity ?? 0.5;

        const degradationPoints =
            operationalTempo * BASE_DEGRADATION_RATE * (1 + maintenanceDeficit * 0.1) * (2.0 - spareParts);
        const degradeAmount = Math.max(0, Math.floor(eq.total_heavy * degradationPoints));

        let remainingDegrade = degradeAmount;
        if (eq.operational_heavy > 0) {
            const shift = Math.min(eq.operational_heavy, remainingDegrade);
            eq.operational_heavy -= shift;
            eq.degraded_heavy += shift;
            remainingDegrade -= shift;
        }
        if (remainingDegrade > 0 && eq.degraded_heavy > 0) {
            const shift = Math.min(eq.degraded_heavy, remainingDegrade);
            eq.degraded_heavy -= shift;
            eq.non_operational_heavy += shift;
        }

        // 2026-05-22: floor-restore clamp from degraded_heavy. Forensics finding
        // `20260522_FORENSICS_VRS_EQUIPMENT_OVERSHOOT.md` §6 — without this the
        // integer-count cascade drives operational_heavy to literal zero
        // ~turn 30-45 per brigade, a 130+ turn overshoot past historical
        // Dayton residual. Floor pulls only from degraded_heavy (not from
        // non_operational_heavy) to preserve cascade-ordering semantics.
        const operationalFloor = Math.floor(eq.total_heavy * OPERATIONAL_HEAVY_FLOOR_FRACTION);
        if (eq.operational_heavy < operationalFloor && eq.degraded_heavy > 0) {
            const restore = Math.min(operationalFloor - eq.operational_heavy, eq.degraded_heavy);
            eq.operational_heavy += restore;
            eq.degraded_heavy -= restore;
        }

        const maintenanceActions = Math.floor(maintenanceScore * 10);
        let actionsLeft = maintenanceActions;
        if (actionsLeft > 0 && eq.non_operational_heavy > 0) {
            const repairable = Math.min(eq.non_operational_heavy, Math.floor(actionsLeft / REPAIR_COST_NON_OPERATIONAL));
            if (repairable > 0) {
                eq.non_operational_heavy -= repairable;
                eq.degraded_heavy += repairable;
                actionsLeft -= Math.floor(repairable * REPAIR_COST_NON_OPERATIONAL);
            }
        }
        if (actionsLeft > 0 && eq.degraded_heavy > 0) {
            const repairable = Math.min(eq.degraded_heavy, Math.floor(actionsLeft / REPAIR_COST_DEGRADED));
            if (repairable > 0) {
                eq.degraded_heavy -= repairable;
                eq.operational_heavy += repairable;
            }
        }

        eq.maintenance_deficit = maintenanceDeficit;
        eq.last_maintenance = turn;
    }
}

export function getFactionEquipmentPressureMultiplier(state: GameState): Record<FactionId, number> {
    const result: Record<FactionId, number> = {};
    for (const faction of state.factions) {
        const formations = Object.values(state.military.formations ?? {}).filter((f) => f.faction === faction.id);
        if (formations.length === 0) {
            result[faction.id] = 1;
            continue;
        }
        let sum = 0;
        let count = 0;
        for (const f of formations) {
            sum += getEffectiveEquipmentRatio(f);
            count += 1;
        }
        const avg = count > 0 ? sum / count : 1;
        result[faction.id] = 0.3 + 0.7 * clamp01(avg);
    }
    return result;
}
