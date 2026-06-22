# Record Provenance And Live Sweep Hardening

**Date:** 2026-06-22  
**Type:** UI/read-model/browser-QA/test/docs polish.  
**Branch:** `codex/records-provenance-polish`

## Summary

Closed the remaining provenance leak where turn-zero setup summaries could still look like filed campaign history outside the already-guarded Records aftermath builders. Decision Room record cards, loop steps, Chronicle generated entries, generals' digest beats, and President's Desk consequence metrics now use the same filed-record rule: turn-zero setup provenance is not post-start history.

The live browser sweep was also hardened to prove the owner journey for both RBiH and RS, including the Ops Planning modal leg, and to prove a setup-only state does not create a filed-record command-surface count.

## Changes

- Decision Room Chronicle/memory cards and report/cost/judge loop steps now count only filed, narratable turn records.
- Decision Room report loop keeps the Decision Room card as the primary route and preserves Army HQ aftermath as source handoff evidence.
- Chronicle generated entries and the generals' digest skip turn-zero setup summaries.
- President's Desk consequence strip no longer labels setup/current state as `Last filed record`; battle/displacement/event metrics remain zero until a filed turn exists, while filed decision consequences still count.
- OOB and Corps Detail sector rows expose stable coverage/current-assignment data hooks for browser proof.
- Corps Front and Ops Planning modal expose stable hooks for opening and verifying the modal, phase rail, and phase panels.
- `qa:live-surface:browser` now proves RBiH and RS owner drilldowns, Ops modal reachability, sector coverage hooks, and turn-zero setup provenance.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts tests\ui\turn_aftermath.test.ts tests\chronicle_entries.test.ts tests\ui\president_desk_shell.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts tests\ui\first_hour_browser_gate_contract.test.ts tests\ui\presidential_categories.test.ts --pool=forks --reporter=dot` passed 112/112.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed. Evidence summary before cleanup: `ownerJourneyDrilldownByFaction` = RBiH/RS true, `ownerJourneyOpsPlanningModalByFaction` = RBiH/RS true, `turnZeroSetupProvenanceLiveProof.recordCardCount` = 0, `serverPortCleanupVerified` = true, 41 screenshots/steps captured.
- `.tmp_live_surface_browser_sweep` was removed after the live proof.

## Scope

UI/read-model/browser-QA/test/docs only. No simulation logic, scenario source data, event mechanics, startup snapshot, save schema, generated calibration artifacts, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
