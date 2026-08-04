/**
 * R5 Phase 2e Task 3 — builds a genuine, non-cast `SectorTopologyNarrowReadState`
 * directly from a captured `SectorTopologySolveInput`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 9 Task 3 and `sector_topology_narrow_reads.ts`'s file docstring
 * for why this is possible without violating the plan's no-partial-object-
 * cast STOP rule: `SectorTopologyNarrowReadState` is a hand-written narrow
 * interface (not `Pick<GameState, ...>`), so a genuinely complete object of
 * that shape — not a partial GameState-cast — satisfies it.
 *
 * This module is pure reshaping, not new data: every field it writes comes
 * from a field `SectorTopologySolveInput` already captured. Two shape
 * differences from the capture-side "row" types explain why this cannot be
 * a straight pass-through:
 *   1. `SectorTopologySolveInput` uses `Map`s (for deterministic-iteration
 *      guarantees during capture); the real `GameState`/`MilitaryState`
 *      shape `SectorTopologyNarrowReadState` mirrors uses plain `Record`s
 *      (matching the live objects every existing narrowed function already
 *      reads via `state.military.corps_command[id]` etc.).
 *   2. `SectorTopologyCorpsCommandRow` is FLATTENED for the snapshot
 *      (`directive_priority_sector_id`); the real, narrow-but-nested shape
 *      (`corps_command[id].directive?.priority_sector_id`) is what every
 *      already-narrowed function (`buildCorpsCommanderProfiles`, etc.)
 *      actually reads, so it is reconstructed here.
 *
 * The returned object's `formations` map is a freshly allocated, MUTABLE
 * `Record<FormationId, SectorTopologyWorkingFormation>` — the detached
 * working-formation projection the plan's Task 3 spec calls for. Every
 * other field stays a faithful, immutable reshape of the snapshot; only
 * `military.formations` and `military.unresolved_sector_brigades` are
 * mutable, matching exactly what the pass functions write to today (see
 * `sector_topology_mutation_journal.ts`'s writer port).
 */

import type { FormationId } from '../../state/game_state.js';
import type { SectorTopologySolveInput } from './sector_topology_solver_types.js';
import type { SectorTopologyWorkingFormation } from './sector_topology_narrow_formation.js';
import type {
    SectorTopologyNarrowBrigadeMovementOrder,
    SectorTopologyNarrowBrigadeMovementState,
    SectorTopologyNarrowBrigadePostureOrder,
    SectorTopologyNarrowCampaignPlan,
    SectorTopologyNarrowCorpsCommand,
    SectorTopologyNarrowFrontEdgeRow,
    SectorTopologyNarrowNamedOfficer,
    SectorTopologyNarrowNamedOfficerState,
    SectorTopologyNarrowReadState,
} from './sector_topology_narrow_reads.js';

/**
 * Build the detached mutable working-formation projection: a fresh
 * `Record<FormationId, SectorTopologyWorkingFormation>` deep-copied from the
 * snapshot's read-only `formations` map. `entrenchment_turns` is seeded
 * from the CAPTURED value (`input.formations[id].entrenchment_turns`), not
 * hardcoded to `0` — an earlier version of this function assumed a
 * hardcoded `0` was "behavior-inert" because this field is write-only
 * within the sector-topology call graph (never read for a computation
 * here), which is true for the SECTORS output but not for the mutation
 * journal: `recordFormationEntrenchment`'s `before` value must be the
 * field's true prior value, or `commitSectorTopologySolve`'s validation
 * (which checks that `before` against live state) spuriously rejects any
 * formation whose real entrenchment_turns isn't already `0` — caught on a
 * real 188-week run when this field accumulates elsewhere in the engine,
 * outside this call graph.
 */
export function buildDetachedWorkingFormations(
    input: SectorTopologySolveInput,
): Record<FormationId, SectorTopologyWorkingFormation> {
    const working: Record<FormationId, SectorTopologyWorkingFormation> = {};
    for (const fid of input.formationIdsSorted) {
        const f = input.formations.get(fid);
        if (!f) continue;
        working[fid] = {
            id: f.id,
            faction: f.faction,
            name: f.name,
            status: f.status,
            kind: f.kind,
            readiness: f.readiness,
            lifecycle_status: f.lifecycle_status,
            tags: f.tags ? [...f.tags] : undefined,
            corps_id: f.corps_id,
            location_osid: f.location_osid,
            home_osid: f.home_osid,
            hq_osid: f.hq_osid,
            hq_sid: f.hq_sid,
            personnel: f.personnel,
            personnel_lent_by_tg: f.personnel_lent_by_tg ? { ...f.personnel_lent_by_tg } : undefined,
            cohesion: f.cohesion,
            experience: f.experience,
            honor: f.honor,
            assignment: f.assignment ? { ...f.assignment } : null,
            assigned_sub_segment_id: f.assigned_sub_segment_id,
            posture: f.posture,
            disrupted: f.disrupted,
            disrupted_turns: f.disrupted_turns,
            stranded_status: f.stranded_status,
            elite_loan_state: f.elite_loan_state ? { ...f.elite_loan_state } : undefined,
            entrenchment_turns: f.entrenchment_turns,
        };
    }
    return working;
}

function reshapeCorpsCommand(input: SectorTopologySolveInput): Record<string, SectorTopologyNarrowCorpsCommand> {
    const result: Record<string, SectorTopologyNarrowCorpsCommand> = {};
    for (const [corpsId, row] of input.corpsCommandByCorpsId) {
        result[corpsId] = {
            directive: row.directive_priority_sector_id !== undefined
                ? { priority_sector_id: row.directive_priority_sector_id }
                : undefined,
            active_operations: row.active_operations.map((op) => ({
                type: op.type,
                phase: op.phase,
                preparation_sub_phase: op.preparation_sub_phase,
                sector_id: op.sector_id,
                participating_brigades: op.participating_brigades,
                axes: op.axes
                    ? op.axes.map((axis) => ({ objectives: axis.objectives ? [...axis.objectives] : undefined }))
                    : undefined,
                objectives: op.objectives ? [...op.objectives] : undefined,
            })),
        };
    }
    return result;
}

function reshapeNamedOfficers(input: SectorTopologySolveInput): Record<string, SectorTopologyNarrowNamedOfficerState> {
    const result: Record<string, SectorTopologyNarrowNamedOfficerState> = {};
    for (const [id, row] of input.namedOfficers) {
        result[id] = {
            status: row.status,
            assigned_corps_id: row.assigned_corps_id,
            effective_competence_penalty: row.effective_competence_penalty,
        };
    }
    return result;
}

function reshapeNamedOfficerData(input: SectorTopologySolveInput): SectorTopologyNarrowNamedOfficer[] {
    return input.namedOfficerData.map((o) => ({ id: o.id, competence: o.competence, aggressiveness: o.aggressiveness }));
}

function reshapeCampaignPlans(input: SectorTopologySolveInput): Record<string, SectorTopologyNarrowCampaignPlan | null> {
    const result: Record<string, SectorTopologyNarrowCampaignPlan | null> = {};
    for (const [faction, plan] of input.campaignPlansByFaction) {
        result[faction] = plan
            ? {
                valid_until_turn: plan.valid_until_turn,
                front_priorities: plan.front_priorities.map((fp) => ({ corps_id: fp.corps_id, role: fp.role })),
            }
            : null;
    }
    return result;
}

function reshapeBrigadeMovementState(input: SectorTopologySolveInput): Record<FormationId, SectorTopologyNarrowBrigadeMovementState> {
    const result: Record<FormationId, SectorTopologyNarrowBrigadeMovementState> = {};
    for (const [fid, ms] of input.brigadeMovementState) {
        result[fid] = {
            status: ms.status,
            stance: ms.stance,
            destination_sids: ms.destination_sids ? [...ms.destination_sids] : undefined,
        };
    }
    return result;
}

function reshapeBrigadeMovementOrders(input: SectorTopologySolveInput): Record<FormationId, SectorTopologyNarrowBrigadeMovementOrder> {
    const result: Record<FormationId, SectorTopologyNarrowBrigadeMovementOrder> = {};
    for (const [fid, mo] of input.brigadeMovementOrders) {
        result[fid] = {
            destination_sids: [...mo.destination_sids],
            stance: mo.stance,
        };
    }
    return result;
}

function reshapeFrontEdges(input: SectorTopologySolveInput): SectorTopologyNarrowFrontEdgeRow[] {
    return input.frontEdges.map((fe) => ({ edge_id: fe.edge_id, a: fe.a, b: fe.b, side_a: fe.side_a, side_b: fe.side_b }));
}

function reshapeBrigadePostureOrders(input: SectorTopologySolveInput): SectorTopologyNarrowBrigadePostureOrder[] {
    return input.brigadePostureOrders.map((po) => ({ brigade_id: po.brigade_id, posture: po.posture }));
}

/**
 * Build a genuine, complete `SectorTopologyNarrowReadState` from a captured
 * `SectorTopologySolveInput`. `workingFormations`, if supplied, is threaded
 * into `military.formations` as-is (so the pure solver's detached formation
 * projection stays the SAME object reference the mutation recorder writes
 * to, rather than a second, disconnected clone); otherwise one is built
 * fresh via `buildDetachedWorkingFormations`.
 */
export function buildDetachedNarrowReadState(
    input: SectorTopologySolveInput,
    workingFormations?: Record<FormationId, SectorTopologyWorkingFormation>,
): SectorTopologyNarrowReadState {
    return {
        meta: {
            turn: input.turn,
            decision_mode: input.decisionMode,
        },
        political: {
            political_controllers: { ...input.politicalControllers },
            control_events: input.controlEvents.map((ev) => ({
                turn: ev.turn,
                settlement_id: ev.settlement_id,
                from: ev.from,
                to: ev.to,
                mun_id: ev.mun_id,
            })),
            last_supply_state_by_osid: input.lastSupplyStateByOsid ? { ...input.lastSupplyStateByOsid } : undefined,
            graz_east_herzegovina_active_turn: input.grazEastHerzegovinaActiveTurn ?? undefined,
        },
        military: {
            formations: workingFormations ?? buildDetachedWorkingFormations(input),
            war_front_edges_osid: reshapeFrontEdges(input),
            corps_command: reshapeCorpsCommand(input),
            named_officers: reshapeNamedOfficers(input),
            named_officer_data: reshapeNamedOfficerData(input),
            campaign_plans: reshapeCampaignPlans(input),
            brigade_movement_state: reshapeBrigadeMovementState(input),
            brigade_movement_orders: reshapeBrigadeMovementOrders(input),
            brigade_posture_orders: reshapeBrigadePostureOrders(input),
            brigade_sector_override: input.brigadeSectorOverride ? { ...input.brigadeSectorOverride } : undefined,
            unresolved_sector_brigades: input.unresolvedSectorBrigades ? [...input.unresolvedSectorBrigades] : undefined,
        },
        factions: input.factionIds.map((id) => ({ id })),
    };
}
