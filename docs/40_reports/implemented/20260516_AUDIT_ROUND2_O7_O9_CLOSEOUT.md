# Audit Round 2 O7-O9 Closeout

**Date:** 2026-05-16
**Plan:** `docs/plans/2026-05-16-audit-round2-action-plan.md`
**Source audit:** `CODE_AUDIT_2026-05-16.md` Round 2 Findings 7-9

## Summary

Closed the three actionable engineering lanes from Audit Round 2:

- O7: officer roster and source OOB corps references no longer contain dead corps IDs.
- O8: renderer desktop IPC contracts no longer expose bare `Promise<unknown>` for the queried methods, and browser-mode advisor fallback now uses the standard failed IPC envelope.
- O9: onboarding copy now matches the current turn loop, and every non-null tutorial spotlight target has a static emitter regression.

O10 remains deferred as optional content-QA/canon work. O11 remains an operator/Windows-host verification lane.

## Changes

- `data/scenarios/officers/apr1992_officers.json` replaces stale VRS corps IDs `vrs_ibk` and `vrs_hk` with the live `vrs_east_bosnian` and `vrs_herzegovina` IDs.
- `data/source/oob_corps.json` adds `arbih_7th_corps` with Travnik HQ metadata and the runtime synthetic `jna_herzegovina_command`.
- `tests/canon_officer_corps_refs.test.ts` guards officer `home_corps_id` and `compatible_corps_ids` references against missing source OOB corps rows.
- `src/ui/map/desktop/useIPC.ts` adds concrete result interfaces for advisor recommendations, movement range/path queries, supply paths, corps sectors, and battle events.
- `tests/ipc_contract_shape.test.ts` rejects bare `Promise<unknown>` in `WindowAwwv` and checks the advisor unavailable fallback shape.
- `src/ui/map/components/onboarding/onboardingSteps.ts` fixes steps 03, 05, and 06 copy. Step 08 remains targeted at `cost-ledger` because `WarCostSummary` already renders that anchor.
- `tests/onboarding_spotlight_targets.test.ts` adds copy regressions and renderer spotlight-token coverage.

## Verification

- `npx.cmd vitest run tests\canon_officer_corps_refs.test.ts tests\ipc_contract_shape.test.ts tests\onboarding_spotlight_targets.test.ts tests\tutorial_content_v1.test.ts tests\v092_tutorial_anchor_coverage.test.ts tests\oob_loader.test.ts tests\oob_early_war_entry.test.ts tests\officer_system.test.ts tests\officer_quality.test.ts` passed 96/96.
- Direct Node orphan check reported `missing_home_refs: 0`, `missing_compatible_refs: 0`, and `runtime_corps_missing: 0`.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the existing Vite browser-external/dynamic-import/chunk-size warnings.
- `npm.cmd run sim:scenario:run:40w` completed at `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1845` with `final_state_hash` `d6d1e1c9decf6b00`; anchor checks reported 26/26 passed and benchmark checks reported 6/6 passed. This does not match older napkin anchor `86ebf26ae0271465`, but the shared workspace already contained broad engine/data changes before O7-O9, so the run is recorded as current dirty-workspace evidence rather than an O7-only hash verdict.
- `git diff --check` on the O7-O9 touched files and closeout docs exited 0 with CRLF normalization warnings only.

## Residual

- A clean-baseline O7-only 40w hash comparison remains needed if the team wants attribution against the old `n1740` anchor. The parent workspace run is useful current evidence, not an isolated determinism proof.
- Practice-based onboarding transitions remain explicitly out of scope for O9.
- Codex essay source-depth standardization remains optional and canon/content-QA gated.
