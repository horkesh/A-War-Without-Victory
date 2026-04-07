# v0.8.x-final Command Authority Cleanup — Completion Report

**Date:** 2026-04-07
**Lane:** v0.8.x-final — Command Authority Cleanup + Old Code Removal
**Status:** COMPLETE

---

## What This Lane Was and Why It Existed

The v0.8.x-final lane existed to make ownership singular. After several months of layered feature work, the codebase had accumulated competing paths for movement authority, operation creation, hotspot file ownership, and hardcoded faction checks that overrode commander judgment. The lane's mandate was to stop the repo from lying to itself about who is in charge — every hotspot file needed an ownership comment, every hardcoded rail needed a data-driven replacement, and the UI surfaces needed to be verified as clean against engine truth.

The lane had five phases:

- **Phase 1 (Operations Singularity)** — Already complete at lane start (2026-04-01).
- **Phase 2+4** — Movement authority tier annotations and hotspot ownership comments.
- **Phase 3** — Hardcoded rail cleanup (probe_exempt, comms_override).
- **Phase 5** — UI/adapter truth alignment and boundary test.

---

## Phase 1: Operations Singularity (Previously Complete — Brief Summary)

Closed 2026-04-01. `sector_offensive.ts` now owns all op-type lifecycle. `corps_operation_helpers.ts` owns creation factories (four: `buildCorpsOperation`, `buildCommanderOperation`, `buildEmergencyDefenseOperation`, `buildProbeOperation`). `bot_corps_operations.ts` demoted to permitted activation entry points only. `OperationView` and `GameStateAdapter` declared canonical UI path. `AuthorizePhase.tsx` commander identity fixed. `generateCorpsDirectives` deleted. `USE_COMMANDER_LOOP` made permanent.

---

## Phase 2+4: Movement Authority Annotations and Hotspot Ownership

### Summary

28 files annotated total:

**14 movement files annotated with T1–T6 boundary comments:**

| Tier | Files |
|------|-------|
| T1 — Commander Intent | `commander_loop.ts` |
| T2 — Bot Brigade Evaluation | `bot_brigade_ai_osid.ts`, `bot_brigade_eval_front.ts`, `bot_brigade_eval_movement.ts`, `bot_brigade_movement_ai.ts` |
| T3 — Order Emission | `osid_column_movement.ts`, `brigade_movement_orders.ts` |
| T4 — Execution / Combat | `attack_resolution_osid.ts`, `sector_offensive.ts` |
| T5 — Recovery / Reconstitution | `brigade_reconstitution.ts`, `army_reserve_system.ts` |
| T6 — Administrative Return | `commander_march_correction.ts`, `brigade_front_distribution.ts`, `brigade_home_return.ts` |

**14 hotspot files annotated with full ownership blocks:**

- `commander/briefing.ts` — Canonical
- `commander/assess.ts` — Canonical
- `commander/plan.ts` — Canonical
- `commander/allocate.ts` — Canonical
- `commander/emit.ts` — Canonical
- `commander/decide.ts` — Canonical
- `bot_corps_operations.ts` — Transitional
- `corps_operation_helpers.ts` — Canonical
- `bot_corps_directives.ts` — Transitional
- `bot_corps_stance.ts` — Canonical
- `bot_strategy.ts` — Canonical
- `operation_preparation.ts` — Canonical

### New Engineering Document

`docs/20_engineering/MOVEMENT_AUTHORITY.md` created. Contents: six-tier authority table, per-file classification, pipeline step mapping. This is the reference document for movement ownership disputes.

### New Test Suite

`tests/movement_authority_tiers.test.ts` — 5/5 pass. Validates that the T1–T6 tier classification described in MOVEMENT_AUTHORITY.md is consistent with the annotation comments in annotated files.

### Architectural Finding: T1 Prepositioning Exception

`commander_loop.ts` has a bounded T1 exception. It writes `brigade_movement_orders` directly for prepositioning — specifically for main-effort surplus brigades that are unreachable from their sector front via normal T2 brigade evaluation. This is not a violation of the tier contract. The commander loop's prepositioning path moves surplus brigades toward their intended sector front before combat begins; it does not override execution-time brigade evaluation. The annotation in `commander_loop.ts` documents this as an exception with rationale: the prepositioning write is a planning artifact, not a competing runtime movement authority.

`brigade_assignment.ts` was intentionally skipped. It has a conflict with the Codex feature branch (`feature/hrhb-rbih-war-transition`). It will be annotated after that branch merges. This is the sole deferred annotation item.

---

## Phase 3: Hardcoded Rail Cleanup

### Problem

Two categories of hardcoded faction checks existed in the bot combat path:

1. `faction === 'RS' && turn <= RS_BLITZ_PHASE_END_WEEK` — a numeric constant used in `shouldLaunchProbeInstead` (`bot_corps_directives.ts`) and `isPrePlannedBlitz` (`sector_offensive.ts`). This constant overrode commander judgment with a raw faction-and-turn check, making the blitz exemption invisible to the DoctrinePhase system.

2. A hardcoded Sarajevo corps comms override in `army_hq_gathering.ts` that assumed a fixed corps ID and mode for the early-war radio restriction.

### Changes Made

- `probe_exempt?: boolean` added to `DoctrinePhase` interface in `src/state/war_timeline.ts`.
- `probe_exempt: true` added to RS blitz doctrine phase (weeks 0–12) in `src/sim/combat/bot_strategy.ts`.
- `shouldLaunchProbeInstead` in `src/sim/combat/bot_corps_directives.ts` now reads `getActiveDoctrinePhase().probe_exempt` instead of the faction+turn check.
- `isPrePlannedBlitz` in `src/sim/combat/sector_offensive.ts` now reads `activePhase?.probe_exempt`.
- `comms_override_by_corps` field added to `ScenarioData` type in `src/scenario/scenario_types.ts`.
- `army_hq_gathering.ts` reads `state.military.comms_override_by_corps` instead of hardcoded corps ID.
- `data/scenarios/apr1992_definitive_40w.json` updated with `comms_override_by_corps: { arbih_1st_corps: { before_turn: 18, mode: 'radio' } }`.
- `RS_BLITZ_PHASE_END_WEEK` constant deleted from `src/sim/combat/bot_constants.ts` (replaced with comment referencing DoctrinePhase).

### Bug Fixes

- `CorpsFrontPanel.tsx`: `f.assigned_corps_id` corrected to `f.corps_id` (FormationView type fix — was a latent field name error exposed during Phase 3 verification).
- `tests/intel_gated_operations.test.ts`: RS probe tests updated to pass `turn=20` (post-blitz, non-blitz intel-threshold cases previously assumed blitz exemption was still active).
- `tests/army_hq_gathering.test.ts`: Updated to supply `comms_override_by_corps` in state and adjusted turn bounds to match `before_turn: 18`.

### New Test Suite

`tests/hardcoded_rail_audit.test.ts` — 4/4 pass. Validates that `RS_BLITZ_PHASE_END_WEEK` is not referenced in any sim file and that probe_exempt is read via DoctrinePhase in the expected files.

### Calibration

n1359: 92.7% area-weighted, **27/27 anchors**, 6/6 benchmarks. Baseline held. hash: `e6460f9a1f615e82`.

---

## Phase 5: UI/Adapter Truth Alignment

### Surfaces Verified Clean

Six UI surfaces audited:

1. **Ops modal phases** — match engine pipeline order. No surface invents phase ordering.
2. **CorpsFrontPanel unresolved brigades** — honest count, reads from canonical corps_front_sectors path.
3. **OrbatSection** — player-safe, no raw engine IDs leaked to display.
4. **GameStateAdapter ownership annotation** — present and intact from prior session (confirmed during Phase 5 audit).
5. **OpsPlanningModal / CommanderPhase / AuthorizePhase** — all use `commander_officer_id` consistently (Phase 1 fix still holds). Note: `OperationBriefingModal.tsx` does not exist at the listed path — the modal is split across these three components.
6. **UI/adapter boundary** — audited for sim/combat imports; 7 pre-existing constant/predicate imports accepted as debt and whitelisted.

### New Test Suite

`tests/ui_adapter_boundary.test.ts` — 6/6 pass. Uses `readdirSync` (not `globSync` which was unavailable in the test environment) to walk UI component files and assert that sim/combat imports are restricted to the audited whitelist. This test acts as a regression guard — any new UI component importing from sim/combat outside the whitelist will fail the test.

---

## Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | CLEAN |
| `vitest run` | 2962/2962, 209 suites |
| `desktop:map:build` | CLEAN |
| Calibration n1359 | 92.7%, 27/27 anchors, 6/6 benchmarks |

---

## Residual Work Deferred to v0.8-to-v0.9

1. **Phase 5 diagnostics/SITREP unification** — Some diagnostic and SITREP surfaces still read formation data through paths that are not fully unified with the canonical `corps_front_sectors` adapter path. This is accepted debt for the v0.8-to-v0.9 simplification band.

2. **`brigade_assignment.ts` annotation** — Intentionally deferred due to conflict with the Codex `feature/hrhb-rbih-war-transition` branch. Annotate after merge.

---

## Recommendation for Next Lane

**v0.8-to-v0.9 — Repo-Wide Simplification + Studio Health / Repo Truth.**

The movement authority tier system is now documented and annotated. The logical next work is to act on what it revealed: six competing movement systems still exist (column march, regular, interior, sector march, strategic reserve, pocket evacuation) and three pathfinding engines have no shared cache. The v0.8-to-v0.9 simplification band targets unification of these systems, TypeScript enum adoption for hardcoded string literals, and dead branch removal (ZoC/AoR era code). The MOVEMENT_AUTHORITY.md document and T1–T6 annotations created in this lane provide the prerequisite map for that unification work.

Additionally, the Warroom React shell still needs a UI density/cohesion pass, and Phase 5's diagnostics/SITREP path unification should be completed in that band.
