# Code Audit Round 3 AAA Polish Follow-Ups

**Date:** 2026-05-17
**Source plan:** `docs/plans/2026-05-17-code-audit-round3-aaa-polish-followups-plan.md`
**Lane:** C
**Result:** Focused UI/read-model and canon hygiene fixes implemented; shared ledger/backlog files intentionally left untouched for parent integration.

## Summary
- Updated `docs/10_canon/CANON.md` game-version wording from stale v0.3.1 language to the active `v0.9.6-alpha.1` software milestone statement.
- Made first-turn presidential brief primary actions consistent across RBiH, RS, and HRHB by routing `Open Decision Room` through the existing Army HQ briefing handoff while keeping `Read later` dismissal-only.
- Expanded bottom status diplomacy context, filtered irrelevant player-front rows, humanized front labels, reduced `GameStateAdapter` casts, and added localized panel boundaries.

## Changes Made
### Opening Brief And Status Strip
- `PresidentialInbox` now gives every faction opening brief the same primary action: `Open Decision Room`, routed as `army_hq_briefing`.
- `BottomStatusStrip` keeps RBiH/HRHB alliance state visible while adding HRHB Zagreb patron status and RBiH international pressure status.

### Priority Fronts And Labels
- `extractWarData(...)` now drops front edges where the player-side OSID is not controlled by the player faction when controller truth is available.
- `toOperationalSitrepView(...)` formats front labels with human-readable OSID text and an ASCII separator, avoiding raw `op:` labels and underscore-heavy display.

### Adapter And Resilience
- `GameStateAdapter` replaced known-shape casts around airdrop allocation, displacement event log, faction-array gating, and operational SITREP handoff.
- `App` wraps Army HQ and Ops Planning in localized boundaries; `ArmyHQModal` wraps Decision Room and Presidential Decisions subpanels.
- `RootErrorBoundary` keeps broad shell failures as fixed recovery notices while rendering Decision Room and Presidential Decisions failures inline inside the affected panel.

## Verification
- `node node_modules\vitest\vitest.mjs run tests/ui/bottom_status_strip_labels.test.ts tests/ui/onboarding_track_d_consolidation.test.ts tests/operational_sitrep_views.test.ts tests/ui/error_boundary_isolation.test.ts tests/ui_map_game_state_adapter.test.ts`
  - 5 files passed, 43 tests passed.
- `npm.cmd run typecheck` passed.
- Browser smoke at `http://127.0.0.1:3002/tactical_map.html` confirmed the opening brief `Open Decision Room` handoff opens Army HQ and shows Decision Room content.
- `rg -n "v0\.3\.1|Playable Alpha \+ Endgame" docs\10_canon\CANON.md docs\00_start_here` returned no live-doc matches.

## Files Changed
| File | Change |
|------|--------|
| `docs/10_canon/CANON.md` | Current software milestone wording |
| `docs/40_reports/GUI_MASTER.md` | GUI master status and recent-change entry |
| `src/ui/map/components/PresidentialInbox.tsx` | Opening brief primary action routing |
| `src/ui/map/components/BottomStatusStrip.tsx` | HRHB patron and RBiH international status coverage |
| `src/ui/warroom/data/war_data_extractor.ts` | Player-controlled-side front relevance filter |
| `src/ui/shared/operational_sitrep_views.ts` | Human-readable front label separator |
| `src/ui/map/data/GameStateAdapter.ts` | Cast reduction and typed SITREP handoff |
| `src/ui/map/App.tsx` | Army HQ and Ops Planning boundaries |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Decision Room and presidential-decision boundaries |
| `src/ui/map/components/RootErrorBoundary.tsx` | Inline fallback styling for panel-level boundaries |
| `tests/operational_sitrep_views.test.ts` | Priority-front relevance and label regression |
| `tests/ui/bottom_status_strip_labels.test.ts` | Bottom status coverage regressions |
| `tests/ui/onboarding_track_d_consolidation.test.ts` | Opening brief action regressions |
| `tests/ui/error_boundary_isolation.test.ts` | Panel boundary regressions |
| `tests/ui_map_game_state_adapter.test.ts` | Adapter cast-count regression |

## Next Steps
- Parent lane should integrate shared backlog/ledger entries after disjoint lanes return.
- Browser first-screen screenshots for all three factions remain useful final QA if a dev server session is available.
