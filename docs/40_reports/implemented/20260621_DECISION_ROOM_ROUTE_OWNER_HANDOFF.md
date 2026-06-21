# Decision Room Route Owner Handoff

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed a remaining Presidential Decision Room ownership leak where command, operational, and turn-review cards could use Army HQ or Records as their primary action route. `finalizeCards` now treats Decision Room-owned cards as local Decision Room focus targets and preserves the previous Army HQ/Records target as `sourceHandoffTarget` evidence.

## Player Impact

Reviewing command priorities from the Presidential Decision Room keeps the player inside the command/operational/turn lens instead of ejecting them to Army HQ. Army HQ and Records remain available as drilldown/evidence handoffs, so source material is still reachable without stealing the primary presidential workflow.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts --pool=forks --reporter=dot` failed on stale Army HQ/Records primary route expectations after adding the route-owner tests.
- Green proof: `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts --pool=forks --reporter=dot` passed 46/46 after the fix.
- Adjacent UI proof: `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/warroom_priority_docket.test.ts --pool=forks --reporter=dot` passed 50/50.
- TypeScript: `npm.cmd run typecheck` passed.
- Live browser: `npm.cmd run qa:live-surface:browser` passed; the gate self-started Vite on `127.0.0.1:3239`, verified first-hour reachability and Decision Room/Army HQ/War Map/Records/Chronicle/Codex surfaces, and confirmed port cleanup. The temporary `.tmp_live_surface_browser_sweep` evidence folder was removed after inspection.

## Scope / Determinism

UI/read-model route/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
