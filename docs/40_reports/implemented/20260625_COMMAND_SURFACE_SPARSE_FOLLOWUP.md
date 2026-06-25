# Command Surface Sparse Follow-up

Date: 2026-06-25
Branch: `codex/command-surface-sparse-followup`

## Summary

This packet closes the next Pyrrhic scout findings from the command-surface and sector/brigade review.

- Pre-advance fallback blocking now uses the required-event predicate, so advisory player event decisions remain Decision Room review items and do not block turn advance when `playerDecisionSummary` is absent.
- Sparse brigade-history combat summaries now preserve `reportedFields` instead of marking missing wins, losses, casualties, territory movement, brigade counts, and exchange ratios as confirmed zero-valued facts.
- Compatibility-synthesized Army HQ rows no longer invent `cohesion: 0` or `fatigue: 0`.
- Formation Detail renders missing morale and personnel as `Unreported` rows instead of silently omitting them.
- Turn-zero formation notable moments render as setup provenance, not campaign capture history.
- Tactical-map sector routing preserves clicked OSID context when sector/front feature properties provide it.
- President's Desk opening/quiet inbox buttons now use Desk copy, while Decision Room-owned action labels remain separate.

## Verification

- Red/green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\pre_advance_command_review.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts --pool=forks --reporter=dot` (4 files / 106 tests).
- Adjacent command-surface proof: `node node_modules\vitest\vitest.mjs run tests\ui\pre_advance_command_review.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\inbox_items.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\gamestore_field_inspection.test.ts --pool=forks --reporter=dot` (9 files / 253 tests).

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
