/**
 * R5 Phase 2e Task 3 — shared narrow, MUTABLE formation type for the
 * sector-topology solve's `formations: Record<FormationId, ...>` parameter.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 6/7 and `sector_topology_narrow_reads.ts`'s docstring for the same
 * rationale applied to `state: GameState`. This is the `formations`-parameter
 * counterpart: `FormationState` structurally satisfies this type, so
 * retyping a function's `formations` parameter to this type is non-breaking
 * and call-site-transparent.
 *
 * Unlike `SectorTopologyNarrowReadState`/`SectorTopologyFormation` (Task 2's
 * read-only snapshot type), this type is DELIBERATELY MUTABLE (no `readonly`
 * modifiers) because the sector-building call graph both reads AND writes
 * formation fields directly (`formation.location_osid = target`,
 * `formation.assigned_sub_segment_id = undefined`, etc. — see
 * `sector_topology_mutation_journal.ts`'s writer port, which performs these
 * exact writes when no recorder is supplied). It also adds `entrenchment_turns`,
 * which `SectorTopologyFormation` omits because it is write-only in this call
 * graph (always set to `0`, never read) — Task 2's read-only snapshot
 * correctly excluded it, but a mutable working type used as the actual
 * write target needs it.
 *
 * Field set verified this session by reading every downstream consumer of a
 * `formations` value in the sector-topology call graph (not inferred):
 * `computeLocalFrontDefensivePower`/`brigadePower` (local_front_defense.ts),
 * `effectivePersonnel` (tactical_group_personnel.ts, already itself narrow-
 * typed via `Pick<FormationState, 'personnel'|'personnel_lent_by_tg'>` —
 * confirming this pattern predates this session),
 * `isSectorRosterEligibleFormation` (sector_roster_eligibility.ts),
 * `isEnclaveBrigade`/`getFormationEnclaveForMovement`/
 * `isEnclaveMovementDestinationAllowed` (enclave_resilience.ts),
 * `getFormationCorpsId` (corps_sector_partition.ts), and
 * `DenseFormationOccupancyIndex`/`countedLocation` (sector_build_derived_context.ts),
 * plus every direct `formation.<field>`/`f.<field>` access across
 * `corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`,
 * and `sector_building.ts`.
 *
 * `name` was found only after the first `tsc` cascade: `sectorCorpsRegionalEdgeAffinity`
 * (corps_front_sectors.ts) reads `corps?.name` for a Posavina/northwest
 * text-match special case — a genuinely narrow-scope read this session's
 * upfront census missed because it never showed up in the earlier 4-file
 * grep census (that census only matched `formation.`/`f.` variable-name
 * prefixes; this call site uses `corps.name`).
 */

import type { FormationState } from '../../state/game_state.js';

export type SectorTopologyWorkingFormation = Pick<FormationState,
    | 'id' | 'faction' | 'status' | 'kind' | 'readiness' | 'lifecycle_status' | 'tags'
    | 'corps_id' | 'location_osid' | 'home_osid' | 'hq_osid' | 'hq_sid' | 'name'
    | 'personnel' | 'personnel_lent_by_tg' | 'cohesion' | 'experience' | 'honor'
    | 'assignment' | 'assigned_sub_segment_id' | 'posture' | 'disrupted' | 'disrupted_turns'
    | 'stranded_status' | 'elite_loan_state' | 'entrenchment_turns'
>;
