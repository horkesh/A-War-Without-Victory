# Live Surface Raw-Token Guard Expansion

## Summary

The live browser sweep now fails on a broader set of compact staff shorthand and raw implementation ids that have repeatedly appeared during the player-polish pass.

## Changes

- Added live-surface raw-token guards for OSID wording, `T+` timing, `DELAYS`, `OBJ`, `ATK`, `DEF`, `att / def`, `W/L/D`, `active / total`, `cap / lost`, and known raw enum ids such as `eligible_pending_review`, `not_applicable`, `surprise_counter_offer`, `union_3_republics_extra`, `tactical_commander`, `in_transit`, `tier_1`, `homeDistance`, `ambush_risk`, and `defender_opsec`.
- Pinned the stronger raw-token families in the live-sweep contract test.
- Dispatched and closed a Pyrrhic explorer scout. The next queued player-copy targets are Verdict peace-plan ids, EconomyPanel facility types, RecruitmentModal compact counters/equipment classes, EventModal effect fallbacks, OrderQueue staged-order labels, and ReserveRequestModal purpose/reason labels.

## Verification

- Red focused proof first failed because the live-sweep contract did not include `OSID`, `ATK`, or `raw planning ids`.
- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` (16/16).
- Live browser proof passed: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`); `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

Test/tool/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
