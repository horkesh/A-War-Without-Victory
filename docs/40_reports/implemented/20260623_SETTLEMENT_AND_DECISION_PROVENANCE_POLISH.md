# Settlement And Decision Provenance Polish

Date: 2026-06-23

## Summary

Closed the next player-truth polish packet while GitHub full-suite checks were still running on the prior head.

- Filed event-decision history now projects only player-authored decisions for the loaded player faction. Bot defaults and foreign-faction choices no longer appear as the player's fired decision history, Codex response set, Dilemma Spine faced state, or filed consequence receipts.
- Settlement Detail now merges `recentControlEvents` into the timeline when full control history is absent, with deterministic de-duplication when both sources are present.
- Settlement Detail ethnicity and terrain rows now render localized player-facing labels instead of raw data labels such as `Bosniak`, `Rural Dense`, and `+30% Def`.
- Settlement Timeline displacement, civilian-loss, operation-context, and ethnic-shift rows now route generated copy through EN/BCS i18n keys while preserving authored operation display names.

## Verification

Focused proof passed:

```powershell
node node_modules\vitest\vitest.mjs run tests\ui\first_hour_fired_event_labels.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\settlement_supply_status.test.ts tests\ui\settlement_timeline_i18n.test.ts --pool=forks --reporter=dot
```

Result: 4 files, 41 tests passed.

Additional verification:

```powershell
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
git diff --check
```

Results: typecheck passed. `qa:player-journeys` passed 288/288. `qa:first-hour:browser` passed with `first-hour browser gate ok` and dev-server cleanup verified. `qa:live-surface:browser` passed with `live surface browser sweep ok` and dev-server cleanup verified. The generated `.tmp_first_hour_browser_gate` and `.tmp_live_surface_browser_sweep` evidence folders were removed after inspection. Diff check passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
