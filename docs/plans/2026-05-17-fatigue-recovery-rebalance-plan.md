# Fatigue Accumulation / Recovery Rebalance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the P1 fatigue gap surfaced by the n292 audit ("~98% of active formations at fatigue 0 in late-war windows") without applying a global fatigue multiplier and without hiding a real combat bug.

**Architecture:** Diagnostic first. Owner-classified. Design-gated. The current mechanism in `src/state/formation_fatigue.ts` produces a near-zero equilibrium by construction: `FRONTLINE_FATIGUE_PER_TURN = 0.5`, `FATIGUE_RECOVERY_INTERVAL = 2`, combat fatigue (`FATIGUE_ATTACKER = 2`, `FATIGUE_DEFENDER = 1`) is the only durable driver. Rebalance must touch one of: combat accumulation rate, reserve-vs-front recovery asymmetry, winter/exhaustion modulation, or faction-asymmetric data on the front-duty rate — never the global `FRONTLINE_FATIGUE_PER_TURN` constant in isolation.

**Tech Stack:** TypeScript sim code in `src/state/formation_fatigue.ts` + `src/sim/combat/attack_resource_aftermath.ts`, Vitest, scenario runner (40w + 188w), diagnostics in `tools/diagnostics/`.

---

## Scope

This is the implementation lane that follows the deferment recommendation in `docs/40_reports/audits/20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md` and the P1 in `docs/40_reports/CONSOLIDATED_BACKLOG.md` §13.

In scope:
- Per-faction / per-corps / per-week fatigue distribution diagnostic at n1740 (40w) and n1741 (188w).
- Owner classification of the residue gap by source: combat accumulation, reserve recovery, frontline duty rate, or cross-system coupling (war exhaustion, winter).
- One bounded, owner-specific lever change after design gate sign-off.
- Focused vitest fixtures per lever with hash-stable behavior tests.
- 40w no-regression gate, 188w late-war improvement probe.

Out of scope:
- Any global `FRONTLINE_FATIGUE_PER_TURN`, `FATIGUE_RECOVERY_INTERVAL`, or `FATIGUE_MAX` retune in isolation (banned by deferment audit).
- Combat-power coupling retunes in `getFatigueMult()` — those are a combat-math change, separate lane.
- Any rebalance that masks an existing combat math bug (e.g. defenders winning too easily, ops never launching) by burying it under a fatigue knob.
- War-exhaustion → personnel/political coupling changes (separate `war_supply_condition` / `war_exhaustion` lane).
- 156–188w painted-target experiments.
- OOB, sensitive-history, FORAWWV, or canon edits without explicit user sign-off.

## Task 1: Deterministic Fatigue Distribution Diagnostic

**Files:**
- Create: `tools/diagnostics/fatigue_distribution_audit.cjs`
- Create: `tests/fatigue_distribution_audit_diagnostic.test.ts`
- Create: `tests/fixtures/fatigue_distribution/<compact_run>.json` if no compact fixture exists.

**Steps:**
1. Write a failing test that consumes a compact scenario run artifact and emits a stable JSON inventory: per-faction, per-corps, per-week `mean_fatigue`, `pct_zero`, `pct_above_threshold`, `pct_above_FATIGUE_MAX_half`, broken down by formation role (`sector_front`, `sector_reserve`, `unassigned`, `operation_participant`, `engaged_this_turn`).
2. Sort deterministically by `faction_id`, then `corps_id`, then `formation_id`. No timestamps, no locale-sensitive output.
3. Run `npx.cmd vitest run tests\fatigue_distribution_audit_diagnostic.test.ts`.
4. Run the diagnostic against the latest n1740 (40w) and n1741 (188w) run artifacts.
5. Record baseline counts in the implemented report before any runtime task starts.

**Acceptance:** Diagnostic emits a stable per-bucket table that distinguishes baseline residue, late-war collapse-to-zero rate, and per-faction asymmetry. The output must classify each non-zero formation by the source of its non-zero state (combat-driven, front-duty-driven, unsupplied-accumulation, or unknown).

Acceptance table to include in the implemented report: `bucket | n1740 mean | n1740 pct_zero | n1741 mean | n1741 pct_zero | classified source`.

No runtime task starts until the inventory output path and baseline rows are recorded in the implemented report.

## Task 2: Owner Classification And Design Gate

**Files:**
- Inspect: `src/state/formation_fatigue.ts`
- Inspect: `src/sim/combat/attack_resource_aftermath.ts`
- Inspect: `src/state/formation_constants.ts` (`FATIGUE_MAX`)
- Inspect: `src/sim/combat/combat_math.ts` (`getFatigueMult` consumer)
- Inspect: `src/sim/combat/exhaustion.ts` (cross-system coupling candidate)
- Create: `docs/40_reports/audits/<YYYYMMDD>_FATIGUE_OWNER_CLASSIFICATION.md`

**Steps:**
1. From Task 1 evidence, classify the gap into exactly one of these candidate owners, ranked by smallest-surface-first:
   - **A. Combat accumulation rate** (`FATIGUE_ATTACKER`, `FATIGUE_DEFENDER` in `attack_resource_aftermath.ts`).
   - **B. Reserve-vs-front recovery asymmetry** — currently the same recovery rate applies regardless of assignment kind; reserve formations should arguably recover faster.
   - **C. Engagement gate on recovery** — currently `wasEngaged` blocks recovery, but a recently-engaged formation may still be net-recovering when not actively in combat.
   - **D. Winter / war-exhaustion modulation** — couple recovery rate to `war_exhaustion` so a tired nation recovers less.
   - **E. Faction-asymmetric front-duty rate (data, not code constant)** — e.g. supply-pressured factions accumulate more frontline duty fatigue.
2. Produce a one-page audit document with: classified owner, mechanism description, expected effect on 40w (no regression), expected effect on 188w (residue rises into a credible band), explicit non-goals.
3. **STOP for user design-gate sign-off before any code change.** Record the chosen owner letter and the agreed-upon expected effect band in the audit document.

**Acceptance:** Exactly one owner is selected, with a written mechanism description that does not modify `FRONTLINE_FATIGUE_PER_TURN`, `FATIGUE_RECOVERY_INTERVAL`, or `FATIGUE_MAX` as standalone global multipliers. User sign-off recorded.

## Task 3: Implement The Bounded Lever (Red First)

**Files (gated by the owner letter selected in Task 2; only one of these branches runs):**

Owner A — Combat accumulation:
- Modify: `src/sim/combat/attack_resource_aftermath.ts` (constants only, no call-site refactor).
- Test: `tests/fatigue_combat_accumulation.test.ts`.

Owner B — Reserve recovery asymmetry:
- Modify: `src/state/formation_fatigue.ts` `applyFatigueRecovery(...)`.
- Test: `tests/fatigue_reserve_recovery.test.ts`.

Owner C — Engagement-gate refinement:
- Modify: `src/state/formation_fatigue.ts` `applyFatigueRecovery(...)`.
- Test: `tests/fatigue_engagement_gate.test.ts`.

Owner D — Exhaustion-modulated recovery:
- Modify: `src/state/formation_fatigue.ts` `applyFatigueRecovery(...)`, read `state.political.*war_exhaustion*`.
- Test: `tests/fatigue_exhaustion_coupling.test.ts`.

Owner E — Faction-asymmetric data:
- Modify: `data/source/` faction tuning JSON (no code constant change).
- Test: `tests/fatigue_faction_asymmetry.test.ts`.

**Steps (any owner):**
1. Write a red vitest fixture for a single front-assigned non-engaged brigade, a single engaged brigade, a single reserve brigade, and a late-war exhausted brigade. Assert the long-run residue band agreed in Task 2.
2. Run `npx.cmd vitest run tests\<chosen_file>.test.ts`. Confirm RED.
3. Implement the smallest mechanism change that turns the test GREEN.
4. Rerun the focused test. Confirm GREEN.
5. Run `npm.cmd run typecheck`.
6. Run the broader fatigue surface: `npx.cmd vitest run tests\formation_fatigue*.test.ts tests\combat_math*.test.ts tests\attack_resource_aftermath*.test.ts`.

**Acceptance:** Focused test green, typecheck green, no regression in the broader fatigue/combat surface.

Determinism statement required: the lever change must not introduce randomness, timestamps, or locale-sensitive ordering. Sorted iteration via `strictCompare` where applicable.

## Task 4: Scenario Probes — 40w No-Regression, 188w Residue Improvement

**Commands:**
- `npm.cmd run sim:scenario:run:40w` and capture hash.
- `node tools\diagnostics\fatigue_distribution_audit.cjs <new-40w-run-dir>`.
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs` and capture hash.
- `node tools\diagnostics\fatigue_distribution_audit.cjs <new-188w-run-dir>`.

**Acceptance bands (recorded in the implemented report before any commit):**
- 40w: area-weighted match must not drop below the current n1740 baseline. Any anchor flip is a STOP condition (see Task 5).
- 188w: late-war `pct_zero` for `sector_front` formations must drop versus n1741 baseline. The residue band must match the design-gated expectation from Task 2.
- Hash drift on both 40w and 188w is expected; the drift must be explained entirely by the fatigue lever, with no upstream ordering change.

To locate the new run directory, use the scenario command output first. If needed, list the newest matching run directory with PowerShell and paste the exact path into the implemented report.

## Task 5: Anchor And Sensitive-History Stop Gates

**Stop gates (any one of these halts the lane before commit):**
- A major anchor flips in 40w: Sarajevo, Brčko, Stupčanica, Žepa, Goražde, Bihać, or any of the 25 anchors in `tests/scenario_anchor_*.test.ts`.
- 188w `pct_zero` for `sector_front` drops below 30% — that is over-correction; halt and revisit Task 2.
- Any sensitive-history capture outcome appears or disappears as a side effect of the fatigue change (cross-check against `tools/diagnostics/sensitive_history_status.cjs`). Halt for user sign-off; do not absorb the change.
- Hash on 40w changes but anchors all still pass — proceed, but document the drift owner.

**On stop:** capture the failing anchor / pct / sensitive-history row, revert the lever change, and reopen Task 2 with the new evidence row.

## Task 6: Re-Anchor Lane (Conditional)

Only if Task 4 passes and Task 5 has no stop trip:
- If 40w hash drifted but no anchors flipped, open a dedicated re-anchor lane:
  - Update calibration baseline rows in `docs/40_reports/CALIBRATION_MASTER.md` with the new n-tag and hash.
  - Record the fatigue lever as the single attributed cause.
  - Do not bundle this with any other calibration change.

## Verification

Final pre-commit gate:
- `npm.cmd run typecheck`.
- `npx.cmd vitest run tests\fatigue_distribution_audit_diagnostic.test.ts tests\<chosen_owner_test>.test.ts tests\formation_fatigue*.test.ts tests\combat_math*.test.ts`.
- `npm.cmd run sim:scenario:run:40w` — anchors GREEN, hash recorded.
- `node tools\diagnostics\fatigue_distribution_audit.cjs <40w-run-dir>` — residue band matches Task 2 expectation.
- 188w run completed and pct_zero recorded; not a blocker for commit if the design-gated owner is a 40w-stable lever, but required as evidence for the implemented report.

## Docs And Ledger

Update:
- `docs/40_reports/implemented/<YYYYMMDD>_FATIGUE_RECOVERY_REBALANCE.md` — owner classification, lever, before/after diagnostic table, scenario hashes, anchor list.
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` — close §13 P1, link the implemented report.
- `docs/40_reports/CALIBRATION_MASTER.md` — new n-tag entry only if Task 6 ran.
- `docs/plans/MASTER_ROADMAP.md` — close the fatigue residue lane.
- `docs/PROJECT_LEDGER.md` — behavior-change entry with hash drift attribution.
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — append fatigue mechanism note if Owner D (cross-system coupling) was chosen.

FORAWWV / canon edits require Pyrrhic-panel sign-off; route any canon impact through the appropriate panel.

## Determinism Statement

The lever change must preserve deterministic ordering (sorted formation iteration in `applyFatigueRecovery` and `updateFormationFatigue` is already in place; do not remove). No `Math.random()`, no `Date.now()`, no timestamp output in the diagnostic.

## Commit And Closeout

- Commit Task 1 (diagnostic) separately from Task 3 (lever).
- Commit Task 2 (audit) before Task 3.
- Stage only diagnostic files, the chosen owner's runtime file, focused tests, implemented report, calibration master entry (if Task 6 ran), backlog row, roadmap, and ledger files owned by this plan.
- Do not commit if any Task 5 stop gate trips.
