/**
 * R5 Phase 2e — shared narrow read-state type for the sector-topology solve's
 * external readers.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 6 implementation note: "change getCorpsArmyPriorities(...),
 * buildCorpsCommanderProfiles(...), and the sector-specific political-
 * controller fallback to accept narrow read interfaces. Do not manufacture a
 * partial object and cast it to GameState."
 *
 * `GameState` structurally satisfies this type (every field here maps to a
 * real, always-present field on the real `GameState`, `MilitaryState`,
 * `PoliticalState`, `CorpsCommandState`, `CorpsDirective`, `CorpsOperation`,
 * `NamedOfficerState`, and `NamedOfficer` interfaces), so retyping a
 * function's `state: GameState` parameter to this type is a non-breaking,
 * call-site-transparent change — every existing caller that already passes a
 * real `GameState` keeps compiling unchanged.
 *
 * DELIBERATELY HAND-WRITTEN, NOT `Pick<GameState, ...>`: an earlier revision
 * of this type used `Pick<GameState, 'meta'|'political'|'military'|'factions'>`,
 * which only restricts which TOP-LEVEL keys are required — the VALUE behind
 * each key (`state.military`, `state.political`) stayed the full, wide
 * `MilitaryState`/`PoliticalState` interface. That is not narrow enough to
 * let the Task 3 pure solver construct a real (non-cast) detached read state
 * from `SectorTopologySolveInput`: `MilitaryState` has several REQUIRED
 * fields with no relationship to sector building at all (`front_segments`,
 * `front_posture`, `front_posture_regions`, `front_pressure`,
 * `militia_pools`), so satisfying the wide type would require inventing
 * placeholder values for them — functionally the same as the forbidden
 * partial-object cast.
 *
 * This revision hand-writes narrow shapes for `.military` and `.political`
 * (and their own nested `corps_command`/`named_officers`/`campaign_plans`
 * entries) with ONLY the fields the sector-topology call graph actually
 * reads. Real `GameState` objects still satisfy every one of these narrower
 * shapes — they simply HAVE more fields than these interfaces require, and
 * extra fields never break structural assignability — so this is still a
 * pure narrowing, not a behavior change. Verified field-by-field against the
 * real `MilitaryState`/`PoliticalState`/`CorpsCommandState`/`CorpsDirective`/
 * `CorpsOperation`/`NamedOfficerState`/`NamedOfficer` interfaces in
 * `src/state/game_state.ts` and `src/state/officer_types.ts` while writing
 * this revision.
 *
 * `military.unresolved_sector_brigades` is the one MUTABLE field in this
 * otherwise read-only type: `buildCorpsFrontSectors` writes it directly
 * (`state.military.unresolved_sector_brigades = ...`) when no mutation
 * recorder is supplied — matching the real `MilitaryState` field, which is
 * itself a plain mutable optional property, not `readonly`.
 */

import type { BrigadePosture, FactionId, FormationId } from '../../state/game_state.js';
import type { SectorTopologyWorkingFormation } from './sector_topology_narrow_formation.js';

export interface SectorTopologyNarrowFrontEdgeRow {
    readonly edge_id: string;
    readonly a: string;
    readonly b: string;
    readonly side_a: string | null;
    readonly side_b: string | null;
}

export interface SectorTopologyNarrowOperation {
    readonly type: string;
    readonly phase: string;
    readonly preparation_sub_phase?: string;
    readonly sector_id?: string;
    readonly participating_brigades: readonly FormationId[];
    readonly axes?: { objectives?: string[] }[];
    readonly objectives?: string[];
}

export interface SectorTopologyNarrowCorpsCommand {
    readonly directive?: { readonly priority_sector_id?: string } | null;
    readonly active_operations?: readonly SectorTopologyNarrowOperation[];
}

export interface SectorTopologyNarrowNamedOfficerState {
    readonly status: string;
    readonly assigned_corps_id: string | null;
    readonly effective_competence_penalty: number;
}

export interface SectorTopologyNarrowNamedOfficer {
    readonly id: string;
    readonly competence: number;
    readonly aggressiveness: number;
}

export interface SectorTopologyNarrowFrontPriority {
    readonly corps_id: string;
    readonly role: 'primary' | 'secondary' | 'economy' | 'contain';
}

export interface SectorTopologyNarrowCampaignPlan {
    readonly valid_until_turn: number;
    readonly front_priorities: readonly SectorTopologyNarrowFrontPriority[];
}

export interface SectorTopologyNarrowBrigadeMovementState {
    readonly status: string;
    readonly stance?: 'combat' | 'column';
    readonly destination_sids?: readonly string[];
}

export interface SectorTopologyNarrowBrigadeMovementOrder {
    readonly destination_sids?: readonly string[];
    readonly stance?: 'combat' | 'column';
}

export interface SectorTopologyNarrowBrigadePostureOrder {
    readonly brigade_id: FormationId;
    readonly posture: BrigadePosture;
}

export interface SectorTopologyNarrowMilitaryState {
    formations: Record<FormationId, SectorTopologyWorkingFormation>;
    readonly war_front_edges_osid?: SectorTopologyNarrowFrontEdgeRow[];
    readonly corps_command?: Record<string, SectorTopologyNarrowCorpsCommand>;
    readonly named_officers?: Record<string, SectorTopologyNarrowNamedOfficerState>;
    readonly named_officer_data?: readonly SectorTopologyNarrowNamedOfficer[];
    readonly campaign_plans?: Record<string, SectorTopologyNarrowCampaignPlan | null>;
    readonly brigade_movement_state?: Record<FormationId, SectorTopologyNarrowBrigadeMovementState>;
    readonly brigade_movement_orders?: Record<FormationId, SectorTopologyNarrowBrigadeMovementOrder>;
    readonly brigade_posture_orders?: readonly SectorTopologyNarrowBrigadePostureOrder[];
    readonly brigade_sector_override?: Record<string, string>;
    /** Mutable — see file docstring. */
    unresolved_sector_brigades?: FormationId[];
}

export interface SectorTopologyNarrowControlEvent {
    readonly turn: number;
    readonly settlement_id: string;
    readonly from: string | null;
    readonly to: string | null;
    readonly mun_id?: string;
}

export interface SectorTopologyNarrowPoliticalState {
    readonly political_controllers?: Record<string, string | null | undefined>;
    readonly control_events?: readonly SectorTopologyNarrowControlEvent[];
    readonly last_supply_state_by_osid?: Record<string, string>;
    readonly graz_east_herzegovina_active_turn?: number;
}

export interface SectorTopologyNarrowMeta {
    readonly turn: number;
    readonly decision_mode?: 'historical' | 'emergent';
}

export interface SectorTopologyNarrowFactionRow {
    readonly id: FactionId;
}

export interface SectorTopologyNarrowReadState {
    readonly meta: SectorTopologyNarrowMeta;
    readonly political: SectorTopologyNarrowPoliticalState;
    readonly military: SectorTopologyNarrowMilitaryState;
    readonly factions: readonly SectorTopologyNarrowFactionRow[];
}
