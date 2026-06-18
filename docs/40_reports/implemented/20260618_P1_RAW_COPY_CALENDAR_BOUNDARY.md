# 2026-06-18 - P1 Raw-Copy Calendar Boundary

## Summary

Closed a first-hour player-copy leak where presidential event decisions and inbox rows exposed raw turn labels and event/dossier internals in normal player UI. Event decision headers and dossier metadata now render calendar dates, inbox event rows use the same date language, and the tactical toolbar load-error bar routes through the shared player-facing error sanitizer.

## Changes

- `EventDecisionModal` now renders `turn_fired` through `turnToDateString(...)` in the header and dossier row.
- Staff assessment, trigger evidence, source note, and source-dossier excerpts are sanitized outside diagnostic mode so event ids, response ids, consequence ids, catalog filenames, and backtick/debug fragments stay out of player copy.
- Presidential Inbox event-decision subtitles now say a decision requires response as of the calendar date instead of `turn N`.
- `PresidentialToolbar` now renders `loadError` through `playerFacingErrorCopy(...)`.
- Added regression coverage for event-modal date/sanitizer behavior, inbox date copy, and toolbar error-copy routing.

## Verification

- RED: `npx.cmd vitest run tests\ui\event_decision_modal_phase3.test.ts tests\ui\presidential_toolbar_error_copy.test.ts tests\ui\inbox_items.test.ts --pool=forks --reporter=dot` failed on the intended raw-copy/calendar defects.
- GREEN: the same focused pack passed 42/42.
- Adjacent pack: `npx.cmd vitest run tests\ui\event_decision_modal_phase3.test.ts tests\ui\presidential_toolbar_error_copy.test.ts tests\ui\inbox_items.test.ts tests\ui\error_copy_contract.test.ts tests\ui\president_desk_shell.test.ts --pool=forks --reporter=dot` passed 52/52.
- `npm.cmd run typecheck -- --pretty false` passed.
- Live browser: `http://127.0.0.1:3002/tactical_map.html?dev=1` RBiH start -> war splash -> inbox -> `What Is Bosnia?` decision verified `Faction / Date`, `6 Apr 1992`, and no visible `rbih_state_identity`, `retain_minorities`, `mandatory_purge`, `csq_rbih_minority_retained`, `.json`, or backtick leakage in the modal.

## Scope And Determinism

UI/read-model presentation and tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, golden baselines, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up Queue Captured

Pyrrhic QA follow-up found remaining raw-copy candidates in Records cost severity, Army HQ sectors, formation narrative arcs/recent-engagement roles, settlement timeline provenance, and decision consequence exit/effect fallbacks. Pyrrhic UI follow-up found the next Army HQ slice should focus on a corps index strip, explicit sector/brigade `Inspect on field` handoffs, command-status chips, and Records archive summary placement.
