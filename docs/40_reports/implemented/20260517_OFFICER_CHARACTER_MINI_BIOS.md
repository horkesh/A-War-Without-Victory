# Officer Character Mini-Bios

**Date:** 2026-05-17
**Result:** Implemented data/read-model/UI-only officer mini-bios for first-pass opening commanders.

## Summary
- Added compact authored mini-bio fields to the 15 opening army/corps commanders already displayed by Army HQ/OOB surfaces.
- Projected the fields through `GameStateAdapter` into `NamedOfficerView` without adding save mutation or commander behavior.
- Rendered concise Army HQ and OOB commander notes with safe fallback copy for officers without authored records.

## Changes Made
### Data
- Added `bio_short`, `command_style`, `known_for`, and `political_alignment_note` to first-pass opening commanders in `data/scenarios/officers/apr1992_officers.json`.
- Did not add `sensitive_history_note` in this pass.
- Left existing `war_crimes_record` data unchanged.

### Read Model
- Extended `NamedOfficerView` with optional mini-bio fields.
- `parseGameState(...)` now reads authored fields from `state.military.named_officer_data`.
- `namedOfficerStateById` remains mutable-state-only and does not receive authored mini-bio fields.

### UI
- Army HQ briefing commander panel shows the mini-bio block below the existing officer profile.
- OOB army commander row shows compact service sketch and command style when available.
- Missing authored data falls back to `Service record pending staff review.`

## Files Changed
| File | Change |
|---|---|
| `data/scenarios/officers/apr1992_officers.json` | First-pass authored mini-bio fields |
| `src/ui/map/data/types.ts` | Optional UI projection fields |
| `src/ui/map/data/GameStateAdapter.ts` | Read-only adapter projection |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Army HQ mini-bio display |
| `src/ui/map/components/OOBSidebar.tsx` | OOB commander mini-bio display |
| `tests/officer_mini_bio_schema.test.ts` | Data schema and first-pass boundary tests |
| `tests/ui_map_game_state_adapter.test.ts` | Focused adapter projection test |
| `tests/ui/officer_mini_bio.test.ts` | Army HQ render and OOB wiring tests |
| `docs/40_reports/audits/20260517_OFFICER_MINI_BIO_SOURCE_REVIEW.md` | Source review and historian gate notes |

## Verification
- `npx.cmd vitest run tests\officer_mini_bio_schema.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\officer_mini_bio.test.ts` passed: 3 files, 28 tests.

## Follow-Up Notes
- `docs/PROJECT_LEDGER.md`, `docs/plans/MASTER_ROADMAP.md`, and 40_reports consolidation indexes were not edited because the user explicitly constrained write scope.
- Future expansion beyond opening assignment/origin/stat-derived style should add citation-backed historian review before authoring prose.
