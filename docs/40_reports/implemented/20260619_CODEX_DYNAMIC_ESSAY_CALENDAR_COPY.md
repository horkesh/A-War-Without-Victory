# Codex Dynamic Essay Calendar Copy

Date: 2026-06-19
Branch: `codex/codex-essay-calendar-copy`

## Summary

Closed a remaining Codex raw-copy path that was separate from the earlier Codex panel calendar cleanup. Dynamic essay interpolation no longer emits raw milestone weeks (`W188`, `historical W182`, `player W188`), raw milestone statuses (`late`, `absent`, `early`), or Cost Ledger annotation week suffixes (`W70`) in normal essay prose.

Changes:

- `formatMilestoneRow(...)` now renders historical/player milestone timing with `turnToDateString(...)`.
- Milestone status tokens now render player-facing labels such as `Late`, `Absent`, and `Early`.
- Milestone delta tokens now render phrases such as `6 weeks later` instead of signed numeric/week shorthand.
- Milestone summaries are sanitized at the Codex essay boundary so upstream comparison summaries such as `player week 188` become calendar-date prose.
- Cost Ledger annotation tokens now render annotation turn details as calendar dates.
- Three English essay templates that wrapped the milestone-delta token in hardcoded `weeks` copy now use `Timing against historical baseline: {milestone_dayton_accords_delta_weeks}.`

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests/ui/codex_essay_resolver.test.ts tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` passed 90/90.
- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed.
- Raw-copy grep over the touched Codex resolver/tests/essay JSON found no live raw week/status output. The only matches were negative test assertions and unrelated prose containing `historical Washington`.

## Scope

UI/read-model and essay presentation only. No simulation logic, scenario triggers/effects, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
