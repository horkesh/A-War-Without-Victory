# Code Audit EOL and Scenario Guardrails

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-code-audit-eol-and-scenario-guardrails-plan.md`
**Result:** Lane A implemented with local EOL heal deferred because the current shared checkout has broad mixed-EOL drift outside this lane.

## Summary
- Added explicit LF policy in `.gitattributes`, repository `.editorconfig`, and a runnable EOL guard at `tools/repo/check_eol_policy.cjs`.
- Converted `avoided_osids_by_faction` from prose-only guidance into a loader guard: non-empty values now fail normalization with a deterministic error.
- Removed the unused `engine_ceiling_workarounds` entry from scenario override inventory while preserving `osid_control_overrides`.

## Changes Made
### EOL Policy
- `.gitattributes` now pins LF for TypeScript, JavaScript, JSON, Markdown, CSS, HTML, YAML, and shell files.
- `.editorconfig` sets UTF-8, LF, final newline, and Markdown trailing-whitespace allowance.
- `tools/repo/check_eol_policy.cjs` checks `git ls-files --eol` for tracked text files with `w/mixed`; `package.json` exposes it as `npm run repo:eol:check`.
- `docs/20_engineering/AGENT_WORKFLOW.md` documents the safe Windows heal procedure: commit/stash unrelated work, scoped `git add --renormalize`, rerun the guard and focused tests, and do not use destructive reset as a default heal.

### Scenario Guardrails
- `src/scenario/scenario_loader.ts` rejects non-empty `avoided_osids_by_faction` and sorts keys/OSIDs with deterministic ordering before reporting the validation failure.
- `src/scenario/scenario_types.ts` and `src/state/game_state.ts` mark the field deprecated and point authors to bot targeting, OOB stats, or painted targets instead.
- `src/scenario/scenario_runner.ts` no longer reports a zero-count `engine_ceiling_workarounds` inventory item.

## Verification
- `npx.cmd vitest run tests/eol_policy.test.ts tests/scenario_guardrails.test.ts tests/scenario_control_change_attribution_contract.test.ts --reporter=dot` passed: 3 files / 5 tests.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `rg -n '"avoided_osids_by_faction"' data\scenarios` found only empty active JSON declarations in `apr1992_definitive_52w.json` and `apr1992_definitive_56w.json`.

## Blockers
- `node tools/repo/check_eol_policy.cjs` failed on the current shared checkout with 386 mixed-EOL tracked text files. This lane did not renormalize them because that would touch broad files outside ownership. Heal requires a coordinated clean/stashed tree and scoped `git add --renormalize`.
- Lane A initially saw unrelated UI/test typecheck errors outside its ownership. Parent integration with Lane C reran `npm.cmd run typecheck` successfully.

## Files Changed
| File | Change |
|------|--------|
| `.gitattributes` | Explicit LF attributes for source/docs/data text files. |
| `.editorconfig` | Editor LF/UTF-8/final-newline policy. |
| `tools/repo/check_eol_policy.cjs` | Mixed-EOL guard. |
| `package.json` | Added `repo:eol:check`. |
| `docs/20_engineering/AGENT_WORKFLOW.md` | Safe Windows EOL heal procedure. |
| `src/scenario/scenario_loader.ts` | Rejects non-empty deprecated avoided OSID field. |
| `src/scenario/scenario_runner.ts` | Removes dead engine-ceiling inventory item. |
| `src/scenario/scenario_types.ts` | Deprecates avoided OSID scenario field. |
| `src/state/game_state.ts` | Deprecates avoided OSID state meta field. |
| `tests/eol_policy.test.ts` | Tests EOL guard CLI contract. |
| `tests/scenario_guardrails.test.ts` | Tests avoided OSID and engine-ceiling guardrails. |
| `tests/scenario_control_change_attribution_contract.test.ts` | Updates override inventory contract to two entries. |
