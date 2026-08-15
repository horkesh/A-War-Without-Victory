# Collapse D-Selection Measurement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Phase 3C's OSID frontage-presence selector with deterministic resolved-battle incidence while retaining the existing strain multiplier and thresholds for a measurement-first 188-week run.

**Architecture:** Add a pure adapter that counts one exposure unit for each resolved `attack_resolution_osid.battles[]` row at its defender-side `target_osid`. Pass the already-produced attack-resolution report from the War turn context into Phase 3C; when the report is absent or has no battles, exposure is empty and no frontage fallback is used in OSID-native play. Keep the existing collapse feature gate, persisted state shape, `STRAIN_FRACTION`, Tier-1 thresholds, and Phase 3D guard unchanged.

**Tech Stack:** TypeScript, Vitest, canonical War pipeline, existing collapse flag lifecycle and scenario runner.

**Roadmap relationship:** This is the bounded D-selection execution packet under RC in `docs/plans/MASTER_ROADMAP.md`; it is not a competing workstream or a D-topology authorization.

---

### Task 1: Pure combat-incidence selector

**Files:**
- Modify: `src/sim/pressure/pressure_exposure.ts`
- Create: `tests/collapse_d_selection_combat_incidence.test.ts`

**Step 1: Write the failing tests**

Add tests against the wished-for `computeCombatIncidenceExposureByEntity(...)` API proving:

```ts
expect(computeCombatIncidenceExposureByEntity(undefined)).toEqual(new Map());
expect(computeCombatIncidenceExposureByEntity({ battles: [] })).toEqual(new Map());
expect([...computeCombatIncidenceExposureByEntity({ battles: [
    battle('b2', 'op:sipovo:sipovo_2'),
    battle('b1', 'op:sipovo:sipovo_2'),
    battle('b3', 'op:titov_drvar:drvar_2'),
] })]).toEqual([
    ['op:sipovo:sipovo_2', 2],
    ['op:titov_drvar:drvar_2', 1],
]);
```

Also prove permuting battle input produces the same ordered map, invalid/blank targets are ignored, and attacker origins/neighbours receive no exposure.

**Step 2: Run the test to verify RED**

Run:

```powershell
npx.cmd vitest run tests/collapse_d_selection_combat_incidence.test.ts --pool=forks --reporter=dot
```

Expected: FAIL because `computeCombatIncidenceExposureByEntity` is not exported.

**Step 3: Implement the minimal pure adapter**

In `pressure_exposure.ts`, accept only the battle-report shape required by the adapter, sort valid `{ battle_id, target_osid }` rows by `target_osid` then `battle_id` with `strictCompare`, and add exactly `1` to the target OSID per resolved battle. Do not read casualties, outcome, attacker count, front edges, clocks, randomness, or state.

**Step 4: Run the test to verify GREEN**

Run the focused command from Step 2. Expected: all tests pass.

### Task 2: Phase 3C and War-pipeline wiring

**Files:**
- Modify: `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`
- Modify: `tests/collapse_d_selection_combat_incidence.test.ts`

**Step 1: Write failing integration tests**

Add real Phase 3C tests proving that, with Phase 3B/3C enabled and OSID-native state:

- two resolved battles at Šipovo add `0.30` strain there;
- one resolved battle at Drvar adds `0.15` there;
- the attacker origin and an unrelated frontage neighbour receive no `local_strain` entry;
- an absent report and an empty battle list add no strain even when OSID front edges exist;
- equivalent permuted reports produce byte-equivalent `local_strain` and Tier-1 output.

Add a source-order contract test or existing pipeline test assertion proving `war-resolve-attack-orders` precedes `phase3c-exhaustion-collapse-gating` and the Phase 3C call receives `context.report.attack_resolution_osid`.

**Step 2: Run the focused tests to verify RED**

Expected failure: Phase 3C still uses `computePressureExposureByEntityOsid(state)` and its signature has no battle-report input.

**Step 3: Implement minimal wiring**

- Add an optional attack-resolution report parameter to `applyPhase3CExhaustionCollapseGating`.
- In OSID-native state, call `computeCombatIncidenceExposureByEntity(report)` with no frontage fallback.
- Preserve the settlement/harness adapter only for genuinely non-OSID state.
- Pass `context.report.attack_resolution_osid` from the canonical War step.
- Do not change `STRAIN_FRACTION`, thresholds, state schema, feature flags, guard predicates, or Phase 3D.

**Step 4: Run focused collapse tests to verify GREEN**

```powershell
npx.cmd vitest run tests/collapse_d_selection_combat_incidence.test.ts tests/pressure_exposure_osid.test.ts tests/collapse_phase1_disabled.test.ts tests/collapse_phase1_bfs_disabled_inert.test.ts tests/collapse_phase3d_severity_strain_only.test.ts tests/war_phase_step_order.test.ts --pool=forks --reporter=dot
```

### Task 3: Section 6, determinism, and measurement proof

**Files:**
- Modify: `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Modify as evidence requires: `docs/plans/MASTER_ROADMAP.md`, `docs/plans/COMMAND_BOARD.md`, `handoffs/AWWV_AUTONOMOUS_ROADMAP_HEARTBEAT.md`

**Step 1: Run focused Section 6 and lifecycle tests**

```powershell
npx.cmd vitest run tests/collapse_phase1_g2_section6_invariant.test.ts tests/collapse_s6_criteria_4_7_enclave_outcome.test.ts tests/collapse_flag_lifecycle.test.ts tests/collapse_run_marker_hygiene.test.ts --pool=forks --reporter=dot
```

The static guard must remain unchanged. Artifact-dependent criteria must be reported as executed, skipped, or vacuous honestly; a green test over a no-damage pair is not clearance.

**Step 2: Run typecheck and deterministic static gates**

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

**Step 3: Run the collapse-ON 188-week measurement**

Use the repository's existing `ENABLE_COLLAPSE=true` scenario-runner entrypoint and marker lifecycle. Record the exact command, run directory, structural fingerprint, incidence distribution, maximum raw incidence/strain, threshold crossings, collapse-damage count, faction/geography/timing split, Drvar/Šipovo result, and Section 6 liveness.

Do not tune the multiplier or thresholds during this run.

**Step 4: Run an identical second measurement**

Require byte-identical deterministic outputs from identical inputs. If platform byte identity is unavailable, use the repo's structural-fingerprint authority and explain the boundary.

**Step 5: Run strict Section 6 evidence against the new artifacts**

Criteria 4 and 7 count as evidence only if collapse damage reaches the protected write boundary; otherwise record them as valid instruments but vacuous evidence.

**Step 6: Update docs and ledger**

Record the agreed selector contract, red/green proof, unchanged constants, measurement outcome, determinism audit, Section 6 status, and the exact remaining scaling decision. Do not edit `docs/10_canon/FORAWWV.md`.

**Step 7: Run applicable closeout gates and commit**

Run the focused suite, typecheck, `canon:check`, baseline regression, and diff hygiene. Stage only D-selection files; leave `.claude/scheduled_tasks.lock` untouched. Commit the bounded packet with an intentional message.

---

## Measurement outcome (2026-08-15)

- Two collapse-ON `apr1992_definitive_188w` runs completed at final-state hash `525866bf25a49d33` and structural fingerprint `22cf3c5d8884bfb8`.
- 15 of 16 output files were byte-identical. Only `run_meta.json` differed, solely because it embeds the deliberately different output directory.
- The run resolved 555 battles across 188 distinct target OSIDs. Maximum raw incidence was 33 at `op:visoko:gornja_vratnica_2`, producing maximum strain 4.95 with the unchanged 0.15 multiplier.
- No entity crossed strain 40 or 55; Tier-1 eligibility and `collapse_damage` remained empty. The Section 6 instruments passed but did not exercise the protected write boundary, so this is not Section 6 clearance.
- Sipovo municipality accumulated five target incidences and Drvar municipality three, but `op:sipovo:sipovo_2` and `op:titov_drvar:drvar_2` each accumulated one incidence / 0.15 strain. The strict pre-registered city discriminator therefore remains unsatisfied.
- Disposition: retain the deterministic default-OFF measurement substrate. Do not tune constants within this packet and do not advance to D-shape. The next step is an explicit owner/design decision on D-selection refinement or scaling, followed by fresh live Section 6 evidence.
- Closeout: the focused 87-test gate, typecheck, deterministic static scan, and all baseline scenarios passed. The global Vitest attempt separately exposed the unrelated stale `sana_95` catalog expectation (13 current objectives versus 10 expected) and a later worker did not report within 30 CPU-minutes; the full suite is therefore not represented as green.
