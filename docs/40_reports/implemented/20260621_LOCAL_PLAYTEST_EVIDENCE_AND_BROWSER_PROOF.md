# Local Playtest Evidence and Browser Proof

**Date:** 2026-06-21  
**Type:** UI/read-model diagnostics, i18n polish, and browser-QA hardening.

## Summary

This batch adds a local-only playtest evidence export to Settings > Diagnostics and folds in three low-risk player-polish findings from the Pyrrhic scout pass:

- Settings Diagnostics now exports a single redacted `local_playtest_evidence` JSON packet containing app/platform context, local preferences, bounded UI breadcrumbs, and existing redacted crash reports.
- `qa:live-surface:browser` now proves operation-opportunity routing reaches the actual Decision Room opportunity card and proves Records > Opportunities exposes the matching pending ledger row.
- Tactical battle tooltips and AAR rows now reuse localized AAR outcome/copy keys for concentrated attacks instead of hardcoded English or raw multipliers.
- Warroom priority severity badges now render through EN/BCS i18n keys instead of hardcoded `Blocking/Critical/Warning/Info` strings.

## Scope

The evidence packet is local-first and offline-only. It does not upload, phone home, include save data, include scenario dumps, include player notes, or include raw local usernames/paths. Diagnostics consent remains explicit; disabling crash diagnostics clears both crash reports and local playtest breadcrumbs.

The browser-proof additions are selector/test hardening only. They do not change operation-opportunity mechanics, Decision Room routing semantics, Records ownership, or save shape.

## Verification

- `npx.cmd vitest run tests\playtest_evidence_packet.test.ts tests\ui_settings_telemetry_controls.test.ts tests\ui\aar_tooltip_friction_labels.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --reporter=dot` -> 26/26 passed.
- `npm.cmd run typecheck` -> passed.
- `git diff --check` -> passed.
- `npm.cmd run qa:player-journeys` -> 245/245 passed.
- `npm.cmd run qa:first-hour:browser` -> passed; evidence verified foundational start flow and server port cleanup.
- `npm.cmd run qa:live-surface:browser` -> passed; evidence verified `presidentialInboxRoutingLiveProof`, `operationOpportunityLedgerLiveProof`, `recordsAarFormationLinkLiveProof`, `battleMarkerLiveProof`, `warStartFoundationalFlow`, and `serverPortCleanupVerified`.
- `npm.cmd run desktop:map:build` -> passed; Vite emitted the existing browser-external/chunk-size warnings but exited 0 and produced `dist/tactical-map`.

## Determinism

UI/read-model/test/docs only. No simulation logic, scenario data, save schema, generated artifact, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, random source, wall-clock timestamp, locale sort, or persisted output ordering changed. The new evidence packet deliberately omits timestamps.
