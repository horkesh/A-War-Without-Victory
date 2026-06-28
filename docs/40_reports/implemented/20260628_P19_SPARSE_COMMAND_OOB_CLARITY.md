# P19 Sparse Command / OOB Clarity

**Date:** 2026-06-28  
**Branch:** `codex/p19-d2-polish-continuation`  
**Scope:** UI/read-model/i18n/test/docs polish only.

## Summary

This packet closes the next Kepler residual sparse-command/OOB clarity findings from the P19 owner-playthrough sweep.

- Army HQ corps-card faces now state `Command strain unreported` when `commandStrain` is absent, rather than hiding the missing source as healthy zero.
- Corps Detail reported exhaustion copy uses the localized `corpsDetail.exhaustion` label.
- Formation Detail AA systems no longer imply fully operational condition from an AA count alone; missing condition source renders `Condition unreported`.
- Army HQ Situation briefing disabled cards now explain no-route/no-navigation states through visible helper text, `title`, and accessible name.
- OOB faction headers now surface missing army-commander source and split fielded/reserve counts.

## Verification

- `npm.cmd exec -- vitest run tests/ui/command_drilldown_routing.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/situation_briefing_progressive_disclosure.test.ts tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot`
  - Passed: 5 files / 116 tests.
- `npm.cmd run typecheck`
  - Passed.

## Scope Guard

No simulation logic, event evaluator mechanics, event JSON, scenario data, startup snapshot construction, save schema, calibration thresholds, golden manifests, structural fingerprint artifacts, Srebrenica/Zepa event-owned receipt behavior, packaging, randomness, persisted timestamps, locale sorting, or output ordering changed.
