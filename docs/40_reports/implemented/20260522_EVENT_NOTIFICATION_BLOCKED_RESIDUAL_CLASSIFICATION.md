# Event Notification Blocked Residual Classification

**Date:** 2026-05-22
**Scope:** Diagnostic classification for the final Phase D notification residual blocks.

## Summary

`tools/diagnostics/event_notification_residuals.cjs` now classifies the four remaining missing recipient blocks as `blocked-sensitive`:

- `visit_to_front_rs` / `visit_press_rs` to RBiH and HRHB.
- `visit_to_front_hrhb` / `visit_press_hrhb` to RBiH and RS.

This preserves the deliberate policy decision not to author press-option copy where the current event rows would require unsupported disclosure, propaganda, detention, or blockade implications. The residual floor remains 2 rows / 4 blocks, but unclassified residual blocks are now 0.

## Verification

Completed verification:

```powershell
node tools\diagnostics\event_notification_residuals.cjs --json
npx.cmd vitest run tests\sim\events\event_notification_residuals_diagnostic.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```

Results: residual diagnostic reported 2 rows / 4 missing blocks, 4 classified blocks, and 0 unclassified blocks; focused test passed 1/1; typecheck passed; diff check passed.
