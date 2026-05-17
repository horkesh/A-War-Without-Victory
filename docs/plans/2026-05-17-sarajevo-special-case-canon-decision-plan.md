# Sarajevo Special-Case Canon Decision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decide and document whether Sarajevo remains an explicit canon siege exception or is replaced by a general enclave/supply rule.

**Architecture:** Treat this as a canon decision first, then centralize code only if the decision retains a Sarajevo-specific rule.

**Tech Stack:** TypeScript siege/control tests, hardcoded-rail audit, canon/report docs.

---

## Files

- `src/state/sarajevo_exception.ts`
- `tests/sarajevo_exception.test.ts`
- `tests/sarajevo_core_defense.test.ts`
- `tests/sarajevo_real_save_contracts.test.ts`
- `tests/hardcoded_rail_audit.test.ts`
- `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`
- `docs/research/icty_rs_strategic_goals.md`

## Implementation Tasks

1. Write a decision memo choosing one option: retain explicit Sarajevo siege exception, generalize to enclave model, or hybrid siege-core model.
2. Add a failing audit/contract test that any Sarajevo exception cites `sarajevo_siege_active`, `enclave_resilience.sarajevo`, or explicit city-core OSIDs instead of arbitrary labels.
3. If retained, rename or centralize the rule as canon-owned siege-core logic rather than hidden railroad behavior.
4. If generalized, prove Srebrenica, Gorazde, and Bihac behavior remains unchanged before touching Sarajevo.
5. Update hardcoded-rail audit language so forbidden rails and approved canon exceptions are distinct.
6. Propagate the decision to roadmap/backlog and ledger.

## Verification

- `npx.cmd vitest run tests/sarajevo_exception.test.ts tests/sarajevo_core_defense.test.ts tests/sarajevo_real_save_contracts.test.ts tests/hardcoded_rail_audit.test.ts`
- `npm.cmd run typecheck`

## Documentation And Ledger

- Add decision/audit under `docs/40_reports/audits/`.
- Update `docs/40_reports/REAL_WAR_MASTER.md` or the relevant canon doc.
- Add `docs/PROJECT_LEDGER.md` entry.

## Stop Gates

- Stop if Sarajevo painted-control behavior changes before the canon decision is explicit.
- Stop if a generalized rule protects broad prefix-only pockets that tests expect to clear.
