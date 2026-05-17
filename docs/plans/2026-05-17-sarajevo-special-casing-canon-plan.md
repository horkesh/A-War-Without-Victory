# Sarajevo Special-Casing — Branch B Canon Plan (Lift Numerics to Scenario)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lift Sarajevo siege numeric constants out of code and into optional scenario-level overrides, preserving current code defaults byte-for-byte while enabling deterministic what-if variation. ID-set canon (siege ring OSID lists, enclave integrity OSIDs) stays code-side.

**Architecture:** Decision already made (user-resolved). Per Historian audit (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md` Lane H1) citing BB1 p.220-222 + ICTY Galić/Karadžić/Mladić: the siege *mechanism* is canon, but the *numeric values* are sim-tuning. Per Engineering recommendation: *ID-set membership is engine geometry*, not scenario-author tunable. Resolution: Branch B — four scalar siege parameters become optional `scenario.sarajevo_overrides`; ID-set constants stay code-side and gain canon annotation comments.

**Tech Stack:** TypeScript simulation code (`src/sim/`, `src/state/`, `src/scenario/`), JSON scenario schema, Vitest, 40w scenario runner.

**Sensitive History:** Sarajevo is canonically Ring 1 (`SENSITIVE_HISTORY_DESIGN_GATE.md` §1). Any override that flips a known historical fact (siege fall, casualty inversion) requires explicit user sign-off per §6.

---

## Scope

In scope:

- The four Sarajevo numeric siege constants: `SARAJEVO_DEFENSE_BONUS=0.40`, `SARAJEVO_ATTACKER_CASUALTY_MULT=2.0`, RBiH `+3.0` exhaustion/turn, RS `+2.0` exhaustion/turn, and Sarajevo integrity floor.
- Optional scenario schema field `scenario.sarajevo_overrides` with full pass-through defaults.
- Typed helper `getSarajevoSiegeParams(state)` as the single read site.
- Code-side annotation of siege ring OSID lists and enclave integrity OSIDs as engine-geometry canon.
- Save-migration coordination (new optional field on scenario state).
- Determinism guard: 40w hash byte-identical with no overrides set, compared against the active pre-change baseline captured from `MASTER_ROADMAP.md` / `CALIBRATION_MASTER.md` at execution time.
- At least one regression scenario exercising the override path.
- Sensitive-history stop gate per §6.

Out of scope:

- `FACTION_MORALE_RESIST_FLOOR` (separate plan).
- Cosmetic UI Sarajevo references (e.g., `buildMajorCityLabelGeoJSON.ts`).
- H1 audit's "Scorpions and Yellow Wasps no-source-found" historian follow-up.
- Modifying ID-set membership (siege ring OSID lists). Comment annotation only.
- Other enclaves (Bihać, Srebrenica, Žepa, Goražde). Sarajevo only.
- Any change that alters the RBiH `+3.0` / RS `+2.0` asymmetry as a default. Two knobs stay two knobs.

---

## Task 1: Deterministic Inventory Script

**Files:**
- Create: `tools/diagnostics/sarajevo_constant_inventory.cjs`
- Create: `tests/sarajevo_constant_inventory.test.ts`
- Create: `docs/40_reports/working/SARAJEVO_CONSTANT_INVENTORY.md` (output artifact)

**Steps:**
1. Write a failing test that asserts the inventory script enumerates every Sarajevo-named numeric constant under `src/sim/` and `src/state/`.
2. Implement the script: AST-walk or deterministic regex over `.ts` files; emit a sorted table with columns `file:line | constant | current value | source-tier (BB cited / no source)`.
3. Source-tier classification:
   - `BB cited` — value documented in BB1 p.220-222 or ICTY citation.
   - `no source` — value present in code without inline citation.
4. Output sorted by `file` ascending, then `line` ascending. Output path is deterministic and committed.
5. Rerun focused test.

**Acceptance:** Inventory script enumerates all four target constants plus any additional Sarajevo-named numerics. Output is byte-identical across runs. Test passes.

The inventory is the source-of-truth for Task 4 migration scope. No migration starts until inventory is recorded.

## Task 2: Scenario Schema Field

**Files:**
- Modify: `src/scenario/scenario_types.ts` (or canonical scenario type file — confirm via grep before editing).
- Modify: `data/scenarios/schema/` if a JSON schema file exists.
- Test: `tests/scenario_sarajevo_overrides_schema.test.ts`

**Steps:**
1. Add an optional field to the scenario type:
   ```ts
   sarajevo_overrides?: {
     defense_bonus?: number;
     attacker_casualty_mult?: number;
     rbih_exhaustion_per_turn?: number;
     rs_exhaustion_per_turn?: number;
     integrity_floor?: number;
   };
   ```
2. All five sub-fields are optional. Absence preserves current code default.
3. Add a red test that loads a scenario with `sarajevo_overrides` set and a scenario without it, and asserts schema parses both.
4. Run focused test.

**Acceptance:** Schema accepts both shapes. Type is exported from the canonical scenario types module.

## Task 3: Typed Helper `getSarajevoSiegeParams(state)`

**Files:**
- Create: `src/sim/combat/sarajevo_siege_params.ts`
- Test: `tests/sarajevo_siege_params_resolution.test.ts`

**Steps:**
1. Implement `getSarajevoSiegeParams(state: GameState): SarajevoSiegeParams` returning a frozen object with the five values. Resolution order: `scenario.sarajevo_overrides.<field>` if defined, else code default constant.
2. Export the code-default constants from the same module so they remain code-side canon with header comment citing this plan and `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.
3. Add red tests:
   - No overrides set → returns code defaults exactly.
   - Each individual override set → returns override for that field, defaults for others.
   - All five overrides set → returns all overrides.
4. Run focused tests.

**Acceptance:** Helper is the single resolution surface. Defaults preserve current numerics. Helper is deterministic and pure.

## Task 4: Migrate Consumers to Helper

**Files (from Task 1 inventory; expected set):**
- Modify: `src/sim/combat/enclave_resilience.ts` (siege defense bonus, attacker casualty mult).
- Modify: `src/sim/combat/exhaustion.ts` or canonical exhaustion accrual site (RBiH `+3.0`, RS `+2.0`).
- Modify: any additional consumer surfaced by Task 1 inventory.
- Test: `tests/sarajevo_siege_params_integration.test.ts`

**Steps:**
1. For each consumer, replace direct constant reads with `getSarajevoSiegeParams(state).<field>`.
2. Code-default constants live only in `sarajevo_siege_params.ts`. No duplicate constants elsewhere.
3. Add red integration tests asserting:
   - With no override, combat math matches pre-migration values exactly.
   - With override (e.g., `defense_bonus: 0.50`), the consumer reads the override.
4. Run focused tests.

**Acceptance:** All four numeric constants flow through the helper. No direct reads of the old constants remain. Inventory diff (Task 1 rerun) shows zero residual call sites in non-helper files.

## Task 5: Annotate ID-Set Constants as Code-Side Canon

**Files:**
- Modify: `src/sim/combat/enclave_resilience.ts` (or wherever Sarajevo siege ring OSID lists and enclave integrity OSIDs live).
- Test: `tests/sarajevo_id_set_canon_annotation.test.ts` (comment-presence check or grep-based static check).

**Steps:**
1. Add header comment to each ID-set constant block citing:
   - This plan: `docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md`
   - `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring 1 enclaves)
   - Statement: *"ID-set membership is engine geometry. Not scenario-author tunable. Numeric siege parameters are tunable via `scenario.sarajevo_overrides`; ID-sets are not."*
2. Add a static test asserting each ID-set constant block carries the canon annotation marker (deterministic substring check).
3. Run focused test.

**Acceptance:** ID-set constants are unchanged in value, gain annotation, and the annotation is enforced by a static test.

## Task 6: Save Migration Coordination

**Files:**
- Coordinate with sibling save-migration-hardening plan (do not edit here).
- Modify: `src/scenario/scenario_loader.ts` (or canonical loader) only if a defaulting/normalization hook is needed.
- Test: `tests/scenario_sarajevo_overrides_save_migration.test.ts`

**Steps:**
1. Confirm that the new optional `sarajevo_overrides` field round-trips through scenario load/save without normalization side effects.
2. Add a red test loading a pre-Task-2 scenario file (no `sarajevo_overrides`), confirming it loads with no error and the helper returns code defaults.
3. Add a red test loading a post-Task-2 scenario file with `sarajevo_overrides` set, asserting the override is preserved through save/load round-trip.
4. Surface coordination notes in the implemented report so the sibling save-migration-hardening plan owner can pick up cross-cutting concerns.

**Acceptance:** Scenarios without the field load unchanged; scenarios with the field round-trip losslessly.

## Task 7: Regression Scenario Exercising the Override Path

**Files:**
- Create: `data/scenarios/regression/sarajevo_override_defense_bonus_050.json` (clone of an existing short regression scenario with `sarajevo_overrides.defense_bonus: 0.50`).
- Test: `tests/sarajevo_override_regression.test.ts`

**Steps:**
1. Pick the shortest existing regression scenario as the clone base.
2. Set `sarajevo_overrides.defense_bonus: 0.50` and leave all other fields default.
3. Add a red test that runs the scenario headless and asserts:
   - It runs to completion deterministically.
   - The helper reports `defense_bonus: 0.50` on at least one turn during siege.
   - The output hash differs from the base scenario hash (deterministic shift, not byte-identical).
4. Do not assert any specific historical outcome change — assert only that the override path is exercised.

**Acceptance:** Regression scenario runs deterministically. Override path is provably executed.

## Task 8: Determinism Guard

**Commands:**
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\sarajevo_constant_inventory.test.ts tests\scenario_sarajevo_overrides_schema.test.ts tests\sarajevo_siege_params_resolution.test.ts tests\sarajevo_siege_params_integration.test.ts tests\sarajevo_id_set_canon_annotation.test.ts tests\scenario_sarajevo_overrides_save_migration.test.ts tests\sarajevo_override_regression.test.ts`
- `npm.cmd run sim:scenario:run:40w`

**Acceptance:**
- 40w hash byte-identical to the captured active baseline when no scenario sets `sarajevo_overrides`.
- 40w hash differs deterministically when an override is set (regression scenario in Task 7).
- All anchors and benchmarks preserved at baseline (26/27 anchors, 6/6 benchmarks).
- Typecheck clean. All focused tests green.

If hash drifts on the no-override path: STOP. The migration introduced a non-equivalent default read path. Bisect the consumer migrations in Task 4 before continuing.

---

## Stop Gates

- **Stop after Task 1** if the inventory surfaces more than the four expected numeric constants. New entries require classification before any migration begins. The two-knob RBiH/RS exhaustion split must remain two knobs.
- **Stop after Task 4** if any consumer's pre-migration behavior cannot be reproduced byte-for-byte through the helper at defaults. Do not paper over a behavioral drift with a tolerance.
- **Stop before Task 7 commit** if any override value plausibly flips a known historical fact (siege fall, casualty inversion, enclave integrity collapse below the floor). Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6: any change that could produce a "reward for atrocity" or alter a known historical outcome requires explicit user sign-off, not delegable.
- **Stop before commit** if the 40w no-override hash differs from the captured active baseline.

---

## Sensitive History Sign-Off

This plan touches Sarajevo, which is Ring 1 per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.

- The Branch B decision and the four numeric-only scope is already user-resolved (see Historian audit Lane H1, 2026-05-17).
- Code-side annotation in Task 5 must reference the gate document.
- Any what-if regression scenario added later that pushes overrides far enough to invert historical fact must come back to the user for §6 sign-off. The Task 7 regression (`defense_bonus: 0.50`) is bounded and does not flip outcome class; it is mechanistic exercise.

Required sign-offs per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6:

- `/gameplay-programmer` + `/historian` — change to enclave mechanics (Sarajevo specifically).
- `/game-designer` — confirm Branch B does not create a Ring 3 refused surface (e.g., the override field must not become a brutality slider; it is a sim-tuning hook, not a player-facing lever).

---

## Docs and Ledger

Update on landing (not in this plan execution — recorded for the executor):

- `docs/40_reports/implemented/YYYYMMDD_SARAJEVO_SPECIAL_CASING_BRANCH_B.md` — implementation report with inventory diff, hash log, override regression evidence.
- `docs/PROJECT_LEDGER.md` — append behavioral/output-surface change entry.
- `docs/plans/MASTER_ROADMAP.md` — mark Sarajevo special-casing item resolved.
- `docs/40_reports/working/SARAJEVO_CONSTANT_INVENTORY.md` — committed inventory artifact.

Do not auto-edit `docs/10_canon/FORAWWV.md`. Flag for manual review if the canonical statement needs an explicit "ID-set vs numeric tuning" boundary clause.

Determinism statement required in the implemented report: 40w no-override hash byte-identical to the captured active baseline; deterministic shift only when override present.

---

## Closeout

- Commit Task 1 (inventory) separately from Tasks 2-7 (migration + regression).
- Stage only: helper file, scenario schema, migrated consumers, ID-set annotations, focused tests, inventory artifact, regression scenario, implemented report, ledger, roadmap entry.
- Do not stage: `FORAWWV.md`, unrelated plan files, or any cosmetic UI Sarajevo references.
- Coordinate save-migration concerns with the sibling save-migration-hardening plan owner via the implemented report.
