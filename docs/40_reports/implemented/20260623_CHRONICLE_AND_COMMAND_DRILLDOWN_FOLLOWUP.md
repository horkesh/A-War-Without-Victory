# Chronicle and Command Drilldown Follow-up

Date: 2026-06-23

## Summary

This polish batch closes the next command-surface tranche without reopening packaging, calibration, scenario source data, or Srebrenica/Zepa delivery mechanics.

## Implemented

- Chronicle generated turn-summary entries now suppress foreign/bot/unanswered decision events when the player did not file the decision, while preserving player-filed decisions and non-decision catalog events.
- Army HQ, Corps Detail, Corps Front, OOB corps cards, and ORBAT labels now use player-facing "Order of battle" copy instead of `ORBAT`/compact labels, with EN/BCS key coverage.
- Army HQ sector expanded density now matches collapsed sector density by counting command-directed brigades as current line responsibility.
- Army HQ sector/ORBAT/Operations/Personnel inspect links now forward the known brigade OSID through the shared field-inspection route, preserving field context where the source surface knows it.
- SelectionPanel local-support routing now resolves municipality ids from settlement metadata before falling back to OSID parsing, and secondary rail placement is pinned.
- Formation home municipality projection now prefers authoritative `origin_mun` / `home_osid` before legacy `mun:` tags.

## Live Review

Manual in-app browser proof on `http://127.0.0.1:3003/` verified:

- RBiH new game loads successfully with no visible error alerts.
- The war-start splash appears.
- The foundational "War Begins: 6 Apr 1992" identity/situation screen appears before normal play.
- The first-turn Presidential Inbox still blocks advance with the foundational decision.
- Command sidebar and Army HQ now show `Order of battle` / `ORDER OF BATTLE`, with no visible `ORBAT`.
- Army HQ sector Inspect closes the HQ shell and returns to the field/map sector context without runtime errors.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_sector_truth.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\gamestore_field_inspection.test.ts tests\ui_map_game_state_adapter.test.ts tests\chronicle_entries.test.ts tests\ui\chronicle_decision_ledger.test.ts --pool=forks --reporter=dot` passed 123/123.
- `node node_modules\vitest\vitest.mjs run tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\gamestore_field_inspection.test.ts tests\ui\map_click_routing_contract.test.ts --pool=forks --reporter=dot` passed 36/36 after the live-found shared corps-card label fix.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 289/289 after updating stale test selectors to the new order-of-battle label.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.

Temporary browser evidence directories were removed and the manual dev server on port 3003 was stopped after verification.

## Deferred

- Elite commander sidecar display remains a safe later UI/read-model task; do not mutate FormationState/save schema for it in this lane.
- Hrvoje Vukcic / pocket-brigade dissolution is simulation and calibration-sensitive; keep it in a separate gated lane if reopened.
- Srebrenica/Zepa fall receipt ownership remains event-owned. Do not re-route this work into Krivaja/Stupcanica scripted-operation calibration.
