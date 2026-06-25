# Command Surface Sparse Follow-up

Date: 2026-06-25
Branch: `codex/command-surface-sparse-followup` (merged to `main`; local and remote branch refs deleted)
Closeout head: `6f1282f18`

## Summary

This packet closes the next Pyrrhic scout findings from the command-surface and sector/brigade review.

- Pre-advance fallback blocking now uses the required-event predicate, so advisory player event decisions remain Decision Room review items and do not block turn advance when `playerDecisionSummary` is absent.
- Sparse brigade-history combat summaries now preserve `reportedFields` instead of marking missing wins, losses, casualties, territory movement, brigade counts, and exchange ratios as confirmed zero-valued facts.
- Compatibility-synthesized Army HQ rows no longer invent `cohesion: 0` or `fatigue: 0`.
- Formation Detail renders missing morale and personnel as `Unreported` rows instead of silently omitting them.
- Turn-zero formation notable moments render as setup provenance, not campaign capture history.
- Tactical-map sector routing preserves clicked OSID context when sector/front feature properties provide it.
- President's Desk opening/quiet inbox buttons now use Desk copy, while Decision Room-owned action labels remain separate.
- Army HQ sector `Inspect` now preserves the first authored friendly segment anchor instead of jumping to the lexicographically first OSID in multi-segment sectors.
- Warroom priority docket accessible labels now match the visible `Open Decision Room` action, and unknown Warroom hotspots remain no-op routes rather than implicit map exits.
- Operation-opportunity desk packets now use operational deployment art instead of officer/personnel art.
- Opening read-model commanders are excluded from the generic Army HQ reserve-officer pool, and operation-assigned officers are not reused as projected opening corps commanders.
- The baked April 1992 startup date is pinned as `{ year: 1992, month: 3, day: 6 }`, with the month documented/tested as the engine's 0-indexed April convention; the legacy browser fallback now uses the same anchor.

## Verification

- Red/green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\pre_advance_command_review.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts --pool=forks --reporter=dot` (4 files / 106 tests).
- Adjacent command-surface proof: `node node_modules\vitest\vitest.mjs run tests\ui\pre_advance_command_review.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\inbox_items.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\gamestore_field_inspection.test.ts --pool=forks --reporter=dot` (9 files / 253 tests).
- Scout-hardening red/green proof: `node node_modules\vitest\vitest.mjs run tests\startup_snapshot_contract.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\warroom_shell_ownership.test.ts tests\ui\presidential_desk_assets.test.ts --pool=forks --reporter=dot` (6 files / 101 tests).
- TypeScript proof: `npm.cmd run typecheck -- --pretty false`.
- Broad player-journey proof: `npm.cmd run qa:player-journeys` (43 files / 613 tests).
- Browser proof: `npm.cmd run qa:first-hour:browser` and `npm.cmd run qa:live-surface:browser`.
- Hygiene proof: `git diff --check` passed; generated browser evidence folders were removed after inspection.
- GitHub proof: `main` at `6f1282f18` is green across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint. Full Suite passed full Vitest, first-hour browser gate, and live-surface browser gate after the PMTiles LFS-pointer fallback repair.

## Scope

UI/read-model/i18n/test/docs polish only, plus a browser-fallback date guard that aligns legacy mock metadata with the already-committed baked startup anchor. No simulation logic, event evaluator mechanics, scenario data, startup artifact regeneration, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
