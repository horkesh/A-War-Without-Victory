# Raw-Copy Wave 5 Scout Fixes

**Date:** 2026-06-20  
**Type:** UI/read-model player-copy polish  
**Scope:** Legacy Warroom copy, peace-plan chrome, officer dossier labels, AAR/tooltip friction labels, i18n, focused tests.

## Summary

Closed the Popper scout findings that were code-ready:

- Legacy Warroom quiet newspaper fallback now renders calendar-date copy instead of `Week {turn}`.
- Legacy Warroom officer-succession newspaper lines now render prose such as `On {date}, ...` instead of `[Turn N]` prefixes.
- Legacy Warroom report subjects and report-body headers now render calendar dates instead of `Week {reportTurn}`.
- Legacy Warroom IVP wrapper buttons now say `Review international pressure` and `Diplomatic press briefing`.
- Peace Plan modal chrome and response/fallback labels now use i18n keys, with unknown institutional models and unknown responses hidden behind neutral copy.
- Officer dossiers now render localized status labels and player-safe corps names instead of raw status/corps ids.
- AAR rows and battle tooltips now map friction enums and confidence bands through localized labels instead of leaking `ambush_risk`, `defender_opsec`, or `low confidence`.

## Verification

Passed locally:

- `npm.cmd exec -- vitest run tests/warroom_player_visibility.test.ts --pool=forks --reporter=dot` - 21/21.
- `npm.cmd exec -- vitest run tests/warroom_player_visibility.test.ts tests/ui/peace_plan_modal.test.ts tests/ui/officer_dossier.test.ts tests/ui/aar_tooltip_friction_labels.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` - 52/52.
- `npm.cmd exec -- vitest run tests/ui_chronicle_operation_aar_link.test.ts tests/ui/warroom_shell_ownership.test.ts --pool=forks --reporter=dot` - 21/21, covering stale latest-main fast-suite expectations.
- `npm.cmd exec -- vitest run tests/ui_i18n.test.ts --pool=forks --reporter=dot` - 12/12.
- `npm.cmd run qa:player-journeys` - 206/206.
- `npm.cmd run qa:live-surface:browser` - passed on clean rerun after an initial port-3239 collision.
- `npm.cmd run typecheck`.
- `git diff --check` - no whitespace errors; Git reported the existing CRLF normalization warning for `src/ui/warroom/content/war_headline_templates.ts`.

## Determinism

UI/read-model copy, i18n strings, tests, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
