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
- V1 disposition at measurement close: retain the deterministic default-OFF measurement substrate and do not advance to D-shape. The subsequent v2 decision and failed/reverted outcome below supersede the then-open refinement-or-scaling question; the live next step is an explicit temporal aggregation contract.
- Closeout: the focused 87-test gate, typecheck, deterministic static scan, and all baseline scenarios passed. The global Vitest attempt separately exposed the unrelated stale `sana_95` catalog expectation (13 current objectives versus 10 expected) and a later worker did not report within 30 CPU-minutes; the full suite is therefore not represented as green.

---

## D-selection v2 owner decision (2026-08-15)

The owner accepted a second measurement-only selector before any multiplier tuning:

```text
exposure(target_osid)
  = direct_battles_at_target
  + 0.5 * other_battles_in_the_same_municipality
```

The municipality contribution is **target-gated**: only OSIDs with at least one resolved defender-side battle receive an exposure entry. An unattacked settlement receives zero even when another settlement in its municipality was attacked. The municipality is the second token in canonical `op:<municipality>:<settlement>` OSIDs. Missing/quiet reports still contribute zero; casualties, outcomes, attacker count, frontage, adjacency, clocks, randomness, thresholds, and `STRAIN_FRACTION` remain outside the selector.

This formula would map the first measurement's main-town controls from Sipovo/Drvar 1/1 to 3/2 because their municipality totals were 5/3. That arithmetic is a design hypothesis, not acceptance evidence; fresh runs must establish the actual distribution and Section 6 liveness.

### Task 4: Municipality-supported target-gated selector

**Files:**
- Modify: `tests/collapse_d_selection_combat_incidence.test.ts`
- Modify: `src/sim/pressure/pressure_exposure.ts`

**Step 1: Write failing pure-selector tests**

Prove that one direct battle at Sipovo plus four battles at other Sipovo OSIDs yields exposure 3 at the attacked main-town OSID; one direct battle at Drvar plus two other Drvar battles yields 2; an unattacked OSID in either municipality is absent; multiple direct battles subtract from `other_battles` rather than being double-counted; malformed/blank rows cannot create municipality support; and permuted rows produce the same ordered map.

**Step 2: Run RED**

```powershell
npx.cmd vitest run tests/collapse_d_selection_combat_incidence.test.ts --pool=forks --reporter=dot
```

Expected: the existing direct-only selector returns 1/1 for the main-town comparison.

**Step 3: Implement the minimal deterministic aggregation**

Count direct incidence by target and total incidence by parsed municipality from the same stably sorted valid battle rows. Iterate attacked targets in `strictCompare` order and emit `direct + 0.5 * (municipality_total - direct)`. Do not emit municipality peers that have no direct battle.

**Step 4: Run GREEN and focused regression gates**

Run the focused D-selection test, then the combined collapse/Section 6/lifecycle pack and typecheck.

### Task 5: Fresh v2 measurement and disposition

Run two fresh collapse-ON 188-week measurements with unchanged multiplier and thresholds. Record byte/structural determinism, incidence/exposure distribution, Sipovo/Drvar exact main-town and municipality results, threshold crossings, damage/capacity writes, engine health, anchors, and Section 6 liveness. Synchronize the build spec, roadmap, command board, heartbeat, project ledger, and knowledge base. Do not authorize D-shape or tune scaling unless the measured selector is historically accepted and the owner makes the next decision.

---

## D-selection v2 measurement outcome (2026-08-15)

- **Disposition: FAIL_REVERTED.** The same-turn municipality-supported selector was implemented test-first, measured twice, and removed after it failed the pre-registered exact main-town discriminator. Production and focused tests were restored to the retained v1 direct-incidence substrate at `ced78d3eb`.
- The two v2 runs under `runs/rc_d_selection_v2_measurement_a` and `runs/rc_d_selection_v2_measurement_b` produced final-state hash `b3d60834a7aa5cf1` and structural fingerprint `22cf3c5d8884bfb8`. Fifteen of sixteen files were byte-identical; only `run_meta.json` differed because it records the deliberately different output directory.
- The synthetic contract behaved as designed, but the campaign did not supply the assumed temporal co-occurrence. Sipovo's and Drvar's other municipality battles occurred on different turns from the main-town battles, so `op:sipovo:sipovo_2` and `op:titov_drvar:drvar_2` remained tied at exposure 1 / strain 0.15 rather than the hypothesized 3 / 2.
- Maximum exposure remained 33 at `op:visoko:gornja_vratnica_2`, producing strain 4.95. No entity crossed 40 or 55; Tier-1 eligibility, collapse damage, and capacity modifiers remained empty.
- Both runs retained 31/31 anchors and passed all seven engine-health checks. The Section 6 verifier and turn-162 rupture comparison passed as instruments, but zero live damage reached the protected boundary, so they provide no new Section 6 clearance.
- Scaling is not the next experiment: multiplying a tied 1/1 signal cannot make it discriminate Sipovo from Drvar. Any successor must first define and obtain owner acceptance for an explicit temporal aggregation contract, then repeat deterministic measurement and live Section 6 review before D-shape begins.

---

## D-selection v3 two-turn window outcome (2026-08-15)

- **Disposition: PASS_RETAIN.** The symmetric inclusive two-turn municipality window is the accepted D-selector. Direct current battle rows add 1 at their target; different-target municipality peers within two turns add 0.5 symmetrically, including retroactive credit to the earlier attacked target. Peer support is target-level, so direct-row multiplicity does not multiply support, and unattacked OSIDs remain absent.
- Two fresh collapse-ON runs under `runs/collapse_d_selection_v3_a` and `runs/collapse_d_selection_v3_b` produced final-state hash `2cfb52c1e7811915` and structural fingerprint `22cf3c5d8884bfb8`. Fifteen of sixteen artifacts were byte-identical; only `run_meta.json` differed because it records the deliberately different output root.
- Across the unchanged 555 resolved battles and 188 attacked targets, `op:sipovo:sipovo_2` reached exposure 3 / strain 0.45 and `op:titov_drvar:drvar_2` reached exposure 2 / strain 0.30. This satisfies the pre-registered exact historical discriminator that v1 and v2 failed.
- Maximum exposure remained 33 at `op:visoko:gornja_vratnica_2`, producing maximum strain 4.95 at the unchanged 0.15 multiplier. Zero entities crossed 40 or 55; all Tier-1 domains remained false; collapse damage and capacity modifiers remained empty.
- Both runs retained 31/31 anchors and all six bot benchmarks, passed all seven engine-health checks, and recorded the expected turn-162 Srebrenica rupture. The Section 6 verifier passed every case and full scan, but no live damage reached the protected boundary, so this remains instrument proof rather than live Section 6 clearance.
- The optional queue persisted 20 canonical rows from turns 186-188 in the terminal save, and focused serialization coverage proved byte-stable round-trip plus absent-field compatibility for old/default-OFF saves.
- **Next autonomous packet:** scale the accepted selector without changing its topology. Start with a `STRAIN_FRACTION=3.0` measurement candidate: HRHB's measured maximum exposure is 20, so strain becomes 60, just above the 55 live severity floor while the HRHB spatial Tier-0 gate is open. Do not begin D-shape, open RBiH/RS Tier-0, or claim Section 6 clearance in that packet.
