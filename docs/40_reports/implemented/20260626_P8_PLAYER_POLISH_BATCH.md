# P8 Player Polish Batch

**Date:** 2026-06-26  
**Branch:** `codex/p8-player-polish-batch`  
**Plan:** `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md`

## Summary

P8 continues the D2 owner-playthrough polish lane with player-truth, route-ownership, and accessibility fixes across the tactical map, settlement panels, Opportunity Ledger, Presidential Decision Room, and command-surface keyboard handling.

This packet is UI/read-model/map-projection/test/docs only. It does not change simulation logic, scenario data, event evaluation, startup artifacts, save schema, baseline/golden manifests, structural fingerprint outputs, calibration, Srebrenica/Zepa event ownership, or packaging.

## Implemented

- Tactical-map fog-visible hostile formations now render as generic enemy-contact markers. The map projection redacts raw enemy formation ids, names, corps/sector anchors, stats, operation membership, posture, movement, disruption, and health/morale suffixes.
- Map clicks, right-clicks, and stack-expansion selections on redacted enemy contacts route to settlement/contact context instead of opening full Formation Detail for hostile brigades.
- Settlement detail distinguishes friendly stationed units from observed enemy contacts, so a player can see local contact pressure without leaking hidden hostile order-of-battle data.
- Opportunity Ledger axis readiness now treats missing axis-evaluation fields as `Unreported`, not failed `0/N` readiness.
- Operation-opportunity completed counts now require a resolved AAR. Stale `executed_op_aar_id` pointers no longer inflate completed opportunity totals or expose dead links.
- Presidential Decision Room and attention metrics now derive from live weighted cards. Grouped modal blockers count their underlying decisions, while stale manifest summary metadata no longer invents pending review counts.
- Global keyboard shortcuts now respect focused interactive controls. Plain Tab remains native focus traversal; corps cycling uses `Ctrl+Tab`; focused buttons and menu-like controls keep their native keyboard behavior.
- Army HQ collapsible sections and Formation Detail tab panels now expose stable `aria-controls`, `id`, `role=tabpanel`, and `aria-labelledby` relationships.
- A visible `.kbd-focus:focus-visible` style guards keyboard-focus discoverability.
- Follow-up scout absorption removed the executable Presidential Decision Room from Army HQ. Army HQ now renders a source-handoff card that opens the Warroom-native Decision Room; presidential operation-opportunity execution no longer appears inside the Army HQ attention panel.
- App-level global shortcuts now share the same interactive-focus guard as map shortcuts, so focused buttons, links, tabs, menu items, inputs, and contenteditable controls are not hijacked by `h/s/e/c/x/d/u`.
- Settlement Detail tabs now control real tabpanels with matching `id`, `role=tabpanel`, and `aria-labelledby`.
- Warroom docket `advanceReviewCount` now uses live weighted card counts, matching grouped modal-blocker `pendingReviews` / `urgentCount` behavior.

## Verification

- Focused P8 proof passed: `npm.cmd exec -- vitest run tests/ui_player_visibility.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui/map_mode_shortcut_contract.test.ts tests/ui/accessibility_reduced_motion.test.ts --pool=forks --reporter=dot`
- TypeScript passed: `npm.cmd run typecheck -- --pretty false`
- First-hour browser gate passed: `npm.cmd run qa:first-hour:browser`
- Live-surface browser sweep passed: `npm.cmd run qa:live-surface:browser`
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (43 files / 644 tests after the follow-up)
- Tactical map build passed: `npm.cmd run desktop:map:build` with existing non-fatal Vite externalization/chunk-size warnings
- Diff hygiene passed: `git diff --check` with the existing CRLF-normalization warning for `src/ui/map/styles/globals.css`
- Follow-up route/accessibility proof passed: `npm.cmd exec -- vitest run tests/ui_presidential_decision_room_wiring.test.ts tests/ui/error_boundary_isolation.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui/app_global_shortcut_focus_contract.test.ts --pool=forks --reporter=dot`
- Combined P8 + follow-up focused proof passed: `npm.cmd exec -- vitest run tests/ui_player_visibility.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui/map_mode_shortcut_contract.test.ts tests/ui/accessibility_reduced_motion.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/error_boundary_isolation.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui/app_global_shortcut_focus_contract.test.ts --pool=forks --reporter=dot` (12 files / 212 tests)
- Follow-up typecheck passed: `npm.cmd run typecheck -- --pretty false`
- Post-follow-up browser/build proof passed: `npm.cmd run qa:first-hour:browser`, `npm.cmd run qa:live-surface:browser`, `npm.cmd run desktop:map:build`, and `git diff --check`
- GitHub Codex review follow-up passed: `npm.cmd exec -- vitest run tests/ui_map_tooltip_player_visibility.test.ts tests/ui_player_visibility.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts --pool=forks --reporter=dot` (3 files / 36 tests) plus `npm.cmd run typecheck -- --pretty false`
- GitHub Baseline Regression CI repair passed locally: `npm.cmd exec -- vitest run tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot` (3 files / 70 tests). The repaired assertion now follows the live weighted Decision Room count (`1 pending`) instead of stale aggregate metadata (`2 pending`).

The earlier live-surface gate required a rerun after a local timeout left a dev server bound to its port. The post-follow-up browser gates passed cleanly. Generated `.tmp_first_hour_browser_gate` / `.tmp_live_surface_browser_sweep` evidence folders were cleaned afterward. `.tmp_dev_server` may remain only for the active local browser/dev session.

## Pyrrhic Reports Absorbed

- Enemy-contact redaction and stack/selection routing findings.
- Opportunity Ledger sparse-axis truth and stale AAR pointer findings.
- Presidential Decision Room stale metric and grouped-card counting findings.
- Keyboard/focus accessibility findings for global shortcuts, section disclosure, and tab panels.
- Route-ownership follow-up findings: Army HQ executable Decision Room embedding, Army HQ opportunity-execution leakage, App-level shortcut focus hijack, Settlement Detail missing tabpanel linkage, and weighted advance-review docket counts.
- GitHub Codex review comment: synthetic `enemy_contact:*` marker ids now route hover tooltips to the redacted enemy-contact model instead of the missing-formation/unknown tooltip path.

## Next Scout Queue

The follow-up P9 scout wave found additional non-packaging polish candidates not folded into this PR:

- Corps Front low-intel objectives redact visible text but still expose real objective names in accessible labels and exact objective routing.
- Settlement Detail derives exact-looking population/displacement from municipality-level ratios when settlement-level data is absent.
- OOB sector drilldown can fall back to enemy OSIDs when no friendly segment anchor is available.
- Settlement timelines still attach some historical events by municipality-substring matching.
- Army HQ Supply Intelligence can show precise drain/net/runway values when base reserves are unreported.
- Adapter/UI casualty split fallbacks can read as exact KIA/WIA/MIA campaign losses when only aggregate casualty data exists.
- Stale operation inspection keys can silently open the first live operation.
- The legacy `autonomy_panel` inbox action branch remains after Decision Room convergence.

## Scope And Determinism

This is player-surface polish only. It is deterministic by construction because it only changes UI projections, read-model counting, focus/ARIA contracts, i18n keys, and tests. No persisted simulation output, scenario artifact, event catalog behavior, random ordering, timestamp generation, or locale-sensitive simulation ordering is changed.
