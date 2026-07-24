# Opening-Turn Calibration Equivalence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make an opening historical operation accepted before the first advance execute on turn 1, and replace the stale cross-scenario calibration comparison with scenario-bound, decision-auditable evidence.

**Architecture:** Keep historical-operation authorization as the player-facing gate. Inject accepted operations before the operation-lifecycle phase and derive their deterministic planning clock from the review's `resolved_turn`, preserving the elapsed week between authorization and advance without adding save-state schema. Add a reusable comparison harness that loads one startup snapshot for both branches, records scenario provenance and every scripted player decision, and labels player-choice comparisons as non-equivalence evidence.

**Tech Stack:** TypeScript simulation pipeline, desktop simulation API, Vitest, deterministic JSON diagnostics, Markdown engineering/release documentation.

---

## Scope And Canon

- Phase scope: War only.
- Canon mapping:
  - `Engine_Invariants_v0_9_0.md` Sections 6.3, 9.6, and 9.9: attacks remain operation-owned; control changes remain auditable and deterministic.
  - `War_Specification_v0_9_0.md` Sections 5 and 8: operation lifecycle precedes brigade execution; identical state and inputs produce identical output.
  - `Systems_Manual_v0_9_0.md` operation lifecycle: accepted pre-planned operations use the existing planning-to-execution path; no new combat mechanic is introduced.
- Out of scope: changing operation strength, objectives, commanders, combat math, paramilitary policy, historical event choices, scenario data, or the committed structural calibration floor.
- Local-only execution: no staging, commit, push, PR, packaging, or release artifact.

## Determinism Checklist

- [x] One startup snapshot path and SHA-256 fingerprint are recorded for both comparison branches.
- [x] Operation start clocks use integer `resolved_turn`; no wall clock, timestamp, random ID, or locale ordering.
- [x] Review, faction, formation, operation, and transcript iteration use stable ordering.
- [x] Comparison output contains scenario identity, branch mode, decision policy, and ordered decision transcript.
- [x] Headless structural fingerprint remains unchanged because the player-only injection step stays inert under `headless_scenario_auto_control`.
- [x] Repeated opening-turn runs produce identical serialized state and report hashes.

### Task 1: Pin The Opening-Turn Failure

**Files:**
- Modify: `tests/desktop_start_campaign_authorization.test.ts`

**Steps:**
1. Build a preserved-operation reference from the current `apr_1992` startup snapshot with RS selected and Level 1 enabled.
2. Build the live desktop branch through `startNewCampaign`, accept the same opening `HISTORICAL_OP:*` reviews at turn 0, and enable Level 1.
3. Advance each branch once.
4. Assert equality of RS eligible attackers, attack orders, battle targets, operation phases, and political control counts.
5. Run the focused test before implementation and record the expected failure: the live branch has zero eligible attackers and zero attack orders.

### Task 2: Restore The Authorization Clock Before Lifecycle Advance

**Files:**
- Modify: `src/sim/combat/historical_operation_authorization.ts`
- Modify: `src/sim/combat/pre_planned_operations.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`

**Steps:**
1. Add a deterministic helper that returns an accepted historical-operation review's `resolved_turn`, falling back to the review turn only for migrated accepted rows without `resolved_turn`.
2. Use that accepted turn only as the new operation's `started_turn` and `phase_started_turn`; keep current-turn side effects on the current turn.
3. Move `inject-player-pre-planned-operations` immediately before `advance-sector-offensives`, after spatial/sector reconciliation and before operation lifecycle advancement.
4. Keep the step inert for headless auto-control and faction-filtered for the selected player.
5. Re-run the focused test and confirm the accepted operation executes on the first advance.

### Task 3: Make Comparison Provenance Executable

**Files:**
- Create: `tools/ai_play/desktop_calibration_compare.ts`
- Create: `tests/desktop_calibration_compare.test.ts`
- Modify: `package.json`

**Steps:**
1. Add failing tests for stable scenario provenance, ordered decision transcripts, and explicit `player_choice_vs_headless` classification.
2. Implement a CLI that loads the current `apr_1992` startup snapshot for the headless branch and uses `startNewCampaign` for the player branch.
3. Support deterministic options for turns, faction, output path, event policy, historical-operation policy, and paramilitary-request policy.
4. Record startup snapshot path/hash, scenario source path/id, autonomy level, policies, every applied/deferred decision, per-turn control counts, attack/flips, and final deltas.
5. Derive all comparator totals by running the branches; do not embed expected faction counts.
6. Add a Windows-safe package script for the harness.

### Task 4: Generate Corrected Evidence

**Files:**
- Generate locally: `tmp-paradox-qa-20260710/desktop-rs-20turn-calibration-comparison-v2.json`

**Steps:**
1. Run the new harness for 20 turns using Level 1, accepting historical operations as they appear while explicitly recording event and paramilitary policy.
2. Re-run the opening-turn equivalence test twice and compare serialized state/report hashes.
3. Confirm the artifact identifies the current `apr1992_definitive_52w` source and does not cite the old `40w` run.
4. Treat remaining player/headless deltas as decision/path divergence, not nondeterminism.

### Task 5: Synchronize Truth

**Files:**
- Modify: `docs/40_reports/playtests/20260710_rs20_calibration_comparison.md`
- Modify: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- Modify: `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- Modify: `.claude/napkin.md`

**Steps:**
1. Add a prominent correction to the old report: the `RS -3` claim compared different scenarios and is superseded.
2. Record the corrected current-snapshot run and explain opening operation timing versus independent paramilitary/event choices.
3. Document the pre-lifecycle authorization contract and comparison provenance requirements.
4. Mark this plan complete on the command board and roadmap without displacing WP-9/D2 owner play.
5. Append a behavior/output-changing ledger entry with explicit determinism impact and reusable knowledge.

### Task 6: Verification

**Commands:**
- `npx.cmd vitest run tests/desktop_start_campaign_authorization.test.ts tests/desktop_calibration_compare.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests/pre_planned_operations.test.ts tests/bot_operation_objective_focus.test.ts tests/turn_pipeline_order.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run ci:structural-fingerprint:check`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run desktop:release:check`
- `git diff --check`

## Stop Gates

- Stop if the focused test shows that preserving the authorization clock still cannot reach execution before brigade-order generation; return to phase-order diagnosis instead of force-launching.
- Stop if headless structural fingerprint changes; the implementation must remain player-only.
- Stop if canon would require accepted operations to wait an additional full turn; document the conflict rather than inventing a launch exception.
- Do not update scenario data or calibration baselines to hide a player/headless mismatch.

## Execution Closeout - 2026-07-11

Status: completed locally. No staging, commit, push, PR, packaging, or release artifact was performed.

Red proof:
- The new desktop authorization regression initially failed with no eligible player attackers, while the preserved-operation reference produced `jna_herzegovina_command: 2`, `vrs_drina: 1`, and `vrs_sarajevo_romanija: 6`.
- The comparison contract test initially failed because no scenario-bound comparison CLI existed.

Implemented:
- Accepted historical-operation reviews now supply their deterministic `resolved_turn` as the injected operation clock, with review-turn fallback only for migrated accepted rows lacking `resolved_turn`.
- Player pre-planned operations inject immediately before `advance-sector-offensives`, so accepted opening operations enter lifecycle advancement and brigade-order generation on the first advance.
- `qa:desktop-calibration` runs player and headless branches from one fingerprinted startup snapshot and records scenario provenance, policies, ordered decisions, per-turn metrics, and state hashes.

Initial corrected evidence, superseded as the closest-policy result by the defended-target v4 follow-up below:
- Artifact: `tmp-paradox-qa-20260710/desktop-rs-20turn-calibration-comparison-v2.json`.
- Scenario: `apr1992_definitive_52w` from `data/scenarios/apr1992_definitive_52w.json`.
- Startup SHA-256: `e8bc41926f783b7040d64d2ca1e75dd0a0331216a885063cce72f78fbd57f59f`.
- Turn 1 produced nine RS attack orders and six combat flips in both branches. The remaining RS delta was `-4`, exactly matching four headless paramilitary captures deferred by the player policy.
- Turn 20 ended at headless RS `387` and player RS `354`. This `-33` is labeled deterministic player-choice divergence under explicit deferred event/paramilitary policy, not nondeterminism or calibration equivalence.

Verification completed:
- Focused authorization/comparator suite: 2 files / 8 tests passed.
- Pre-planned operation and turn-order suite: 3 files / 42 tests passed.
- Independent one-turn artifacts were byte-identical at SHA-256 `be254d456648b81689fa1f580f90f7675259335ba1c8949a88fae200b5755d51`; their recorded branch state hashes also matched.
- Typecheck, startup-snapshot check, structural-fingerprint check, player-journey gate, and desktop release check passed.
- Structural fingerprint remained `6806ddd157044afa`.

### Deeper Follow-Up - 2026-07-11

The owner requested a no-choice-divergence counterfactual. The comparator now records non-player event mode, player event timing, standing versus between-turn paramilitary resolution, player target scope, paramilitary capture targets, Army HQ campaign-plan presence, pending proposal categories, and pending event ids.

The current closest ordinary player-policy run (`desktop-rs-20turn-defended-target-guard-v4.json`) uses historical non-player decisions, first-response fallback for events without historical metadata, accepted historical operations, and standing same-turn paramilitary authorization. It also enforces the canon rule that paramilitaries are never dispatched against exact or adjacent organized defense and cannot capture through a light-defense threshold. Turn 1 now has equal HRHB/RBiH/RS totals `103/312/297`, but not equal state: headless RS captures two municipality-scoped Bosanski Novi targets while the unrestricted player branch captures Bijeljina and Bileca. The exact-OSID topology difference and remaining ownership boundaries grow to turn-20 headless `87/237/388` versus player `83/249/380`, an RS gap of `-8`. The earlier v3 acceptance of all 21 routine operation proposals remains pre-guard diagnostic history and is not presented as a separate v4 replay. Headless-only Army HQ campaign plans at turns 8 and 16 and between-turn player decision timing remain explicit structural ownership differences.

The follow-up fixed two concrete paramilitary defects: allowed offensive requests retain offensive mode, 600 personnel, and one-turn ETA instead of being downgraded to rear-pocket formations; detection now rejects exact and adjacent organized defense, and defense present at arrival forces dissolution without capture or defender losses.

Follow-up verification passed 3 affected files / 51 tests, typecheck, the 44-file / 718-test player-journey gate, desktop release build, and structural fingerprint `6806ddd157044afa` with final state hash `82dae12f3f42b3b6`. Strict baseline regression exposed accumulated local output drift; the explicit local re-floor changed 12 manifest hashes and the subsequent strict rerun passed all scenarios. `git diff --check` also passed with only pre-existing CRLF normalization warnings in unrelated touched files.
