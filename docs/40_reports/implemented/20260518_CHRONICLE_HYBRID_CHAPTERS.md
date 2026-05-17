# Chronicle Hybrid Chapters

**Date:** 2026-05-18
**Baseline:** Chronicle chapter boundary recommendation accepted in `docs/40_reports/audits/20260517_CHRONICLE_CHAPTER_BOUNDARY_DECISION.md`.
**Result:** Implemented deterministic player-faction campaign-phase chapters with month sublabels.

## Summary
- Added a pure Chronicle chapter read model over existing Chronicle entries and loaded timeline data.
- Added an Entries/Chapters mode switch to `ChronicleOverlay` while preserving the existing filter lens and selected-turn dossier behavior.
- Deferred bookmarks and save-schema changes as planned.

## Changes Made
### Chapter Read Model
- `src/ui/map/data/chronicleChapters.ts` builds chapters from filtered Chronicle entries.
- Boundary order is player-faction standing orders, then player-faction doctrine phases, then month buckets.
- Entries are sorted by turn then stable source id, and chapters preserve source entry ids, aftermath turns, cost-ledger refs, Codex refs, and inherited sensitive-history signals.

### Chronicle UI
- `ChronicleOverlay` now has an `Entries` / `Chapters` segmented control.
- Chapter view shows campaign chapter titles, month sublabels, sourced entry rows, and Turn Record handoffs.
- Existing filters feed both the flat entry timeline and chapter view.

### Tests
- `tests/ui/chronicle_chapters.test.ts` covers grouping, player-faction scoping, source-id ordering, month fallback, and month sublabels.
- `tests/ui/chronicle_chapter_guardrails.test.ts` covers source-only citation and sensitive-history inheritance.
- `tests/ui/chronicle_chapter_ui.test.ts` covers the mode switch preserving active filter context.

## Verification
- `npx.cmd vitest run tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\chronicle_chapter_guardrails.test.ts`
  - Exit 0. 3 files passed, 9 tests passed.
- `npm.cmd run typecheck`
  - Exit 1. Fails in disjoint in-progress lanes: `SettingsScreen.tsx` missing telemetry/i18n message keys, `tests/ui/inboxItems.notifications.test.ts` notification type shape, and `tests/ui_settings_telemetry_controls.test.ts` matcher typing. No Chronicle errors were reported.
- `npm.cmd run desktop:map:build`
  - Exit 0. Vite built 1063 modules in 18.18s. Existing warnings remained for browser-externalized Node modules, loaders.gl `spawn`, dynamic-import chunking, and large chunk size.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/chronicleChapters.ts` | New deterministic Chronicle chapter read model. |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Added Entries/Chapters switch and chapter view. |
| `src/ui/map/components/chronicle/generateChronicleEntries.ts` | Added optional source/reference metadata fields to Chronicle entries. |
| `tests/ui/chronicle_chapters.test.ts` | Added chapter builder coverage. |
| `tests/ui/chronicle_chapter_guardrails.test.ts` | Added narrative guardrail coverage. |
| `tests/ui/chronicle_chapter_ui.test.ts` | Added UI mode-switch coverage. |
| `docs/40_reports/implemented/20260518_CHRONICLE_HYBRID_CHAPTERS.md` | Implementation report. |

## Scope Notes
- No save schema fields were added.
- `src/ui/map/App.tsx`, roadmap, backlog, ledger, and napkin files were intentionally left untouched for parent integration.
