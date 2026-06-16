# Operation and Plan ID Copy Polish

**Date:** 2026-06-16  
**Type:** presidential command read-model copy hardening  
**Scope:** Back-the-Officer TG cards, operation proposal cards, proactive force-launch ready-plan cards

## Summary

This slice closes the next raw-ID leak found by the Pyrrhic player-polish sweep. Operation proposal and proactive force-launch cards previously fell back from missing operation copy to raw plan identifiers such as `ghost` or `plan_alpha`. The TG Back-the-Officer surface also fell back from a missing operation name to the raw operation id.

`backTheOfficer.ts` now keeps internal `plan_id` / `op_id` values available for actions and sorting, but resolves the displayed `op_name` through a player-safe operation-name helper. Authored names and objective descriptions pass through. Opaque internal identifiers collapse to `Unspecified operation`, while operation-style internal slugs such as `operation_breakthrough` are humanized only when that is the best available display copy.

## Files

- `src/ui/map/data/backTheOfficer.ts`
- `tests/ui/back_the_officer_read_model.test.ts`
- `tests/ui/proactive_force_launch.test.ts`

## Verification

- Red proof first: focused tests failed because unresolved proposal cards displayed `ghost` and ready-plan cards displayed `plan_alpha`.
- Green proof: `npx.cmd vitest run tests\ui\back_the_officer_read_model.test.ts tests\ui\proactive_force_launch.test.ts --pool=forks --reporter=dot` -> 2 files / 23 tests passed.
- Wider local gates: `npm.cmd run typecheck`, `npm.cmd run qa:player-journeys`, `npx.cmd vitest run tests\docs_desktop_v09_truth.test.ts --pool=forks --reporter=dot`, and `git diff --check` passed.
- Live browser smoke: `http://127.0.0.1:4185/` RS first-hour smoke reached WAR HAS STARTED, WAR BEGINS, and the command map with no console/page errors and no visible `APPROVE_OP`, `plan_`, `op_`, `csq_`, or `op:` hits in the checked first-hour text.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. This is UI/read-model presentation hardening only.
