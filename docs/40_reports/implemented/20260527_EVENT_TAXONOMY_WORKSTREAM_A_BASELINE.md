# Event Taxonomy Workstream A Baseline

**Date:** 2026-05-27
**Lane:** Event-system product/engine
**Scope:** Workstream A diagnostic/test hardening only

## Summary

Workstream A is closed as a behavior-neutral catalog taxonomy baseline. The existing `tools/diagnostics/event_taxonomy_report.ts` module was hardened in place because `tools/diagnostics/event_acceptance_report.ts` already imports its public API. The compatible exports `buildEventTaxonomyReport`, `loadCatalogRows`, and `EventTaxonomyRow` are preserved.

## Changes

- Added pressure modifier condition collection to the taxonomy report.
- Expanded known condition/effect vocabularies to match the live event runtime vocabulary used by the current catalog.
- Added row fields for historically specific source status, catalog action, and presidential-decision validity.
- Added findings for missing historical sources on historically specific rows.
- Added a guard preventing finished/presidential-ready rows from retaining `legacy_calendar_pending_conversion`.
- Added focused tests for pressure condition coverage, unknown vocabulary findings, sensitive-history presidential-decision blocking, historical-source reporting, and legacy-calendar debt.

## Determinism And Scope

The diagnostic reads the fixed catalog files in canonical order: `war_1992`, `war_1993`, `war_1994`, `war_1995`, then `consequences`. Rows remain sorted by file order, `trigger.turn_min ?? MAX_SAFE_INTEGER`, then event id using bytewise comparison. No event JSON, loader, evaluator, firing behavior, save schema, scenario data, generated artifacts, or sensitive-history content changed.

## Verification

- Red first: `npx.cmd vitest run tests\sim\events\event_taxonomy_report.test.ts --reporter=dot` failed 5 expected assertions before implementation.
- `npx.cmd vitest run tests\sim\events\event_taxonomy_report.test.ts --reporter=dot` passed, 23/23 tests.
- `npx.cmd vitest run tests\sim\events\event_acceptance_report.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot` passed, 40/40 tests.
- `npx.cmd vitest run tests\event_timeline_integrity.test.ts --reporter=dot` passed, 19/19 tests.
- `npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json` passed: 247 rows, 44 choice events, 36 required-response rows, 17 modal-ready rows, 180 warnings, 0 errors.
- `npm.cmd run typecheck` passed.

## Next Action

Proceed to Workstream B: loader, ordering, cap, mutex/overflow visibility, and save-shape safety. Baseline regression is not required for this slice because it changes only pure diagnostics and tests.
