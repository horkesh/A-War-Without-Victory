# BCS Command Copy Residuals

## Summary
Closed the next BCS player-copy residuals from the Pyrrhic i18n scout. Normal command surfaces no longer expose remaining English section names, `OPS`, `Level 3`, `override`, shortened supply/intelligence/commander labels, or compact tank/artillery shorthand in the targeted BCS keys.

## Changes
- Army HQ command access and toolbar operation labels now use full BCS operation copy instead of `ops` / `OPS`.
- Presidential and tactical command-authority help now uses BCS command-overrule wording instead of English `Level 3` / `override`.
- War Summary and Chief of Staff references now name the BCS command-relationship section instead of `Command Relationship`.
- Brigade row supply, operation readiness, and operation-history commander/equipment rows now spell out supply, intelligence, commander, tanks, and artillery labels.
- GUI audit coverage now pins these BCS copy boundaries.
- Synced the stale ops BrigadeCard i18n test expectation from all-caps `MECHANIZED` to shipped title-case `Mechanized`, closing the Baseline/Full Suite CI failure from the prior command-copy merge.

## Verification
- Focused GUI audit passed: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` (14/14).
- I18n + GUI audit pack passed: `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` (27/27).
- Ops BrigadeCard stale-expectation pack passed: `npm.cmd exec -- vitest run tests/ui/ops_brigade_card_i18n.test.ts tests/ui/ops_modal_auto_propose.test.ts tests/ui/brigade_row_supply_labels.test.ts --pool=forks --reporter=dot` (13/13).
- Typecheck passed: `npm.cmd exec -- tsc --noEmit --pretty false`.
- Diff hygiene passed: `git diff --check`.

## Scope
BCS i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
