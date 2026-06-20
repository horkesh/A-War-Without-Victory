# Code Audit EOL and Scenario Guardrails Plan

**Date:** 2026-05-17
**Source audit:** `docs/40_reports/audits/20260516_CODE_AUDIT.md`
**Scope:** Round 1 findings 1, 2, 4, 5, and 6. This plan addresses local Windows mixed-EOL drift and makes banned/deprecated scenario escape hatches self-enforcing without touching historical OSID override canon.

## Goal

Make the local Windows checkout stop producing phantom TypeScript/HMR failures from mixed line endings, and convert prose-only scenario guardrails into tests or explicit deprecation contracts.

## Non-Goals

- Do not remove existing `osid_control_overrides`; the audit retracted that as intentional canon data.
- Do not retune bot targeting, OOB stats, painted targets, or calibration baselines in this lane.
- Do not run destructive checkout/reset commands while unrelated work is dirty.

## Findings Triage

| Audit finding | Status | Plan action |
|---|---|---|
| 1 / 4: mixed CRLF/LF in ~311 files | Open | Add EOL policy, local guard, and safe renormalization protocol. |
| 2: `avoided_osids_by_faction` wired but banned by rule | Open design cleanup | Soft-enforce absent-or-empty now; decide later whether to hard-remove. |
| 5: `osid_control_overrides` | Retracted | Preserve existing entries; optionally add allowlist guard to prevent accidental growth. |
| 6: `engine_ceiling_workarounds` declared but always zero | Open cleanup | Audit and remove if confirmed dead; otherwise document allowed use. |

## Tasks

### Task 1: EOL Policy

**Files:** `.gitattributes`, `.editorconfig`, `tests/eol_policy.test.ts` or `tools/repo/check_eol_policy.cjs`.

**Steps:**
1. Add explicit `eol=lf` rules for `.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`, `.md`, `.css`, `.html`, `.yml`, `.yaml`, and `.sh`.
2. Add `.editorconfig` with LF, UTF-8, final newline, and markdown trailing-whitespace allowance.
3. Add a guard that fails when `git ls-files --eol` reports `w/mixed` for tracked source/docs/test files.

**Verification:** `git ls-files --eol | rg "w/mixed"` returns no relevant tracked files after the local heal; `npx.cmd tsc --noEmit --pretty false`; `npm.cmd run desktop:map:build`.

### Task 2: Safe Local Heal Procedure

**Files:** `docs/20_engineering/AGENT_WORKFLOW.md` or `docs/20_engineering/REPO_MAP.md`; optional `tools/repo/check_eol_policy.cjs`.

**Steps:**
1. Document the Windows-safe procedure: clean/stash unrelated work, apply attributes, run renormalization, re-run guard.
2. Avoid `git reset --hard` unless the operator explicitly asks and the tree is clean.
3. Record the local-only nature of the original drift: CI fresh clone may be green while a Windows working tree is broken.

### Task 3: `avoided_osids_by_faction` Soft Enforcement

**Files:** `src/scenario/scenario_types.ts`, `src/state/game_state.ts`, `src/scenario/scenario_loader.ts` or `src/scenario/scenario_runner.ts`, `tests/canon_no_avoided_osids.test.ts`.

**Steps:**
1. Add `@deprecated` JSDoc on scenario/state declarations, pointing to the rule: fix bot targeting, OOB stats, or painted targets instead.
2. Add a scenario fixture test asserting the field is absent or empty in all active scenario JSON.
3. If the loader encounters a non-empty value, emit a deterministic warning or validation finding; do not silently consume it.

**Stop Gate:** If any active scenario has non-empty values, pause this lane and route to canon/gameplay review instead of auto-removing.

### Task 4: `engine_ceiling_workarounds` Audit

**Files:** `src/scenario/scenario_runner.ts`, related scenario schema/type files, `tests/scenario_override_inventory.test.ts` or equivalent.

**Steps:**
1. Confirm whether any active scenario uses `engine_ceiling_workarounds`.
2. If unused and not canon-backed, remove the schema path and inventory literal.
3. If intentionally reserved, document the only allowed use and add a test proving active scenarios do not use it accidentally.

## Determinism Safeguards

- EOL changes must be content-equivalent except line endings; review with `git diff --word-diff` or file hash checks where useful.
- Scenario guard tests must sort file paths and keys with deterministic ordering.
- No scenario behavior may change unless a non-empty banned field is discovered and explicitly handled.

## Required Docs

- Ledger entry in `docs/PROJECT_LEDGER.md`.
- Knowledge entry in `docs/PROJECT_LEDGER_KNOWLEDGE.md` if the mixed-EOL root cause or scenario-escape-hatch policy changes.
- If canon wording changes are needed, queue or explicitly edit relevant canon under a separate canon-review step; `FORAWWV.md` edits require Pyrrhic-panel sign-off.
