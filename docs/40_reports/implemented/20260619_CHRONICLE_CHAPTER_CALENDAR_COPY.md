# Chronicle Chapter Calendar Copy

Date: 2026-06-19
Branch: `codex/chronicle-chapter-calendar-copy`

## Summary

Closed the raw-copy path in Chronicle chapter mode. Chapter headers and chapter entry cards no longer expose raw turn ranges, `Turn {n}` labels, or underscore-derived boundary names in normal player-facing copy.

Changes:

- Chapter summary timing now renders calendar dates through `turnToDateString(...)`.
- Single-day chapters collapse to one date; multi-day chapters render a date range.
- Chapter boundary labels now use player-facing copy such as `Campaign order`, `Doctrine posture`, and `Calendar month`.
- Doctrine fallback chapter titles now map raw stance ids to labels such as `Offensive posture` instead of `general offensive`.
- Chapter entry metadata rows now show the entry date and the Chronicle type label instead of `Turn {n}` and raw entry type ids.

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts --reporter=dot` passed 11/11.
- `node .\node_modules\vitest\vitest.mjs run tests\ui\chronicle_causality_slides.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_guardrails.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` passed 35/35.
- `npm.cmd run typecheck -- --pretty false` passed.
- Raw-copy grep over the touched Chronicle component/data/test files found no live `chronicle.turnRange`, `chronicle.turnLabel`, boundary-kind replacement, or raw entry-type rendering. Remaining matches are test fixtures/assertions and the internal stance label map.

## Scope

UI/read-model copy and tests only. No simulation logic, scenario triggers/effects, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
