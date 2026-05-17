# HRHB Patron Directive Scope Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the open design-gated question of whether HRHB patron directive pressure applies faction-wide or per-corps, then implement the chosen scope with calibration proof.

**Architecture:** This is a design-first lane. The implementation must not change HRHB behavior until the user chooses a scope. After sign-off, the code change must be faction-specific in data interpretation but mechanism-symmetric where possible.

**Tech Stack:** TypeScript command/political directive code, scenario runner, calibration reports.

---

## Task 1: Decision Memo

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_HRHB_PATRON_DIRECTIVE_SCOPE_DECISION.md`
- Reference: `docs/40_reports/CALIBRATION_MASTER.md`
- Reference: `docs/10_canon/Systems_Manual_v0_9_0.md`

**Options:**
1. **Faction-wide ceiling:** Zagreb constrains all HRHB/HVO corps equally.
2. **Per-corps ceiling:** Posavina, Central Bosnia, Herzegovina, and Tomislavgrad can have distinct patron pressure.
3. **Hybrid:** faction-wide default with named corps exemptions.

**Acceptance:** User selects one option before code changes.

The decision memo must include a single line exactly in this form: `Selected scope: faction-wide | per-corps | hybrid`.

## Task 2: Red Tests for Selected Scope

**Files:**
- Test: `tests/hrhb_patron_directive_scope.test.ts`
- Inspect: `src/sim/combat/order_interpretation.ts`
- Inspect: `src/state/game_state.ts`
- Inspect: timeline/patron directive data that feeds HRHB/HVO pressure
- Inspect: `src/sim/combat/bot_corps_directives.ts`

**Steps:**
1. Write tests for two HRHB corps under different patron pressure contexts.
2. Assert the selected scope changes only the intended corps/faction decisions.
3. Run the test and verify red.

## Task 3: Implement Scope

**Files:**
- Modify: likely `src/sim/combat/bot_corps_directives.ts`
- Modify: any data/config file identified in Task 2.

**Steps:**
1. Add typed scope helper such as `getPatronDirectiveScope(faction, corpsId, state)`.
2. Keep deterministic ordering and no timestamps/randomness.
3. Rerun focused tests.

**Acceptance:** Tests pass and non-HRHB factions keep prior behavior.

## Task 4: Calibration Proof

**Commands:**
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\hrhb_patron_directive_scope.test.ts`
- `npm.cmd run sim:scenario:run:40w`

**Acceptance:** 40w anchors and benchmarks remain within accepted bounds, or the lane stops with a report-only verdict.

## Docs and Ledger

Update:
- `docs/40_reports/CALIBRATION_MASTER.md`
- `docs/40_reports/implemented/YYYYMMDD_HRHB_PATRON_DIRECTIVE_SCOPE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Stop gate: no code before user design selection.

## Stop Gates And Closeout

- Tests must encode only the selected option; rejected options belong in the decision memo, not in active assertions.
- Stop if any anchor/benchmark regression appears that cannot be tied to the selected patron-directive scope.
- Stage only the decision memo, selected-scope code/data, focused tests, calibration evidence, roadmap, and ledger files owned by this plan.
