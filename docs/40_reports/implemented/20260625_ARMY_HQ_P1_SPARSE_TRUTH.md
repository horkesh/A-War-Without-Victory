# Army HQ P1 Sparse Truth

Date: 2026-06-25

## Summary

This packet closes Chandrasekhar's Army HQ P1 sparse-truth queue.

Implemented:

- Force Readiness corps with zero fielded brigades now render `UNREPORTED` with fatigue/cohesion unreported rather than `INEFFECTIVE` with zero metrics.
- Explicit reported zero readiness for a fielded brigade remains explicit and can still grade ineffective.
- Command Relationship no longer treats missing command strain or corps exhaustion as healthy silence; missing metrics render as unreported rows.
- Army HQ CorpsCard and CorpsCard personnel totals use neutral styling for unreported personnel, amber for partial reporting, and threshold colors only when reports are complete.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\command_relationship_campaign_drag_proof.test.ts tests\ui\commander_read_model_surfaces.test.ts tests\ui\jna_synthetic_command_presentation.test.ts --pool=forks --reporter=dot`
  - 5 files / 59 tests passed.
- `npm.cmd run typecheck -- --pretty false`
  - Passed.
- `git diff --check`
  - Passed.

## Scope

UI/read-model/i18n/test/docs polish only.

No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
