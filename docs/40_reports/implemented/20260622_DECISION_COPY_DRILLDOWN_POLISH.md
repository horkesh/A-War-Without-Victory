# Decision Copy and Drilldown Polish

Date: 2026-06-22

## Summary

Closed the first slice of the live-player polish findings from the Pyrrhic UI scouts. Army HQ now gives brigade-level rows their own field-inspection controls, Decision Room operation and sector cards use the correct action labels instead of generic corps copy, the Warroom priority docket has stable inspectable hooks, and Records now labels the top AAR tab as the latest after-action report rather than implying a complete archive view. The same branch also closes the generated receipt/read-model localization batch for decision consequences, Army CO pushback, decision-surface registry/blocker fallback copy, event acknowledgement effect labels, native Warroom overlay chrome, and fired-event wrapper copy.

This is UI/read-model/i18n/QA polish only. Srebrenica/Zepa fall handling remains event-owned and no packaged installer work resumed.

## Changes

- Added field-inspection buttons to Army HQ sector assigned/reserve brigade rows.
- Added field-inspection buttons to Army HQ operation ORBAT brigade rows.
- Corrected Decision Room operation and sector action labels to `Inspect Operation` and `Inspect Sector`.
- Added stable `id`, `data-testid`, `role`, `aria-label`, and `aria-controls` coverage for the Warroom priority docket panel.
- Renamed Records AAR tab copy to make the latest-turn scope explicit, and renamed the archive summary for completed operation AARs.
- Extended the live browser sweep contract so Army HQ sector-brigade inspection must open the formation detail panel from the field.
- Added token-backed generated copy for decision consequence title/outcome/detail rows, with shared resolution in Records, President's Desk, and Chronicle.
- Localized generated Army CO pushback headline/rationale/evidence copy while preserving authored commander reasons.
- Routed decision-surface registry labels, source labels, sanitizer fallbacks, and presidential blocker fallbacks through EN/BCS keys.
- Routed event acknowledgement effect labels, native Warroom overlay chrome, and fired-decision wrapper copy through EN/BCS keys.

## Verification

- Red TDD proof failed before implementation on the missing sector brigade inspect control, old Records AAR wording, stale Decision Room action labels, missing operation ORBAT inspect control, and missing Warroom priority-docket hooks.
- Focused green proof: `npx.cmd vitest run tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\warroom_shell_accessibility.test.ts --reporter=dot` passed 81/81.
- Extended focused proof: `npx.cmd vitest run tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --reporter=dot` passed 87/87.
- Generated read-model focused proof: `npx.cmd vitest run tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\president_desk_shell.test.ts tests\ui_decision_room_pushback_explanations.test.ts tests\ui\decision_surface_registry.test.ts tests\ui\presidential_blockers.test.ts tests\ui\event_modal_effect_labels.test.ts tests\ui\first_hour_fired_event_labels.test.ts tests\browser_campaign_start_fallback.test.ts --reporter=dot` passed 65/65.
- Syntax proof: `node --check tools\ui\live_surface_browser_sweep.cjs` passed.

## Scope

UI/read-model/i18n/live-QA/test/docs polish only. No simulation logic, scenario data, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Ups

- Run the full local verification bundle before merge: typecheck, player journeys, live browser sweep, desktop map build, and diff check.
- Remaining adjacent generated-copy lane is full command briefing fallback-string localization from `collect_briefing.ts` if confirmed still visible.
