# Issue #170 Residual Reconciliation

Date: 2026-06-20
Type: Docs-only backlog reconciliation

## Summary

Reconciled the active command-board wording for issue #170 after the read-only GitHub/Codex sweep. The board no longer lists Graz HRHB->RS branch coverage or Trnovo waypoint handling as active residuals, because both already have direct proof on current `main`.

## Evidence

- Graz HRHB->RS branch coverage is pinned by `tests/graz_faction_block.test.ts`, which asserts the non-east, non-exempt HRHB faction-level block against RS territory.
- Trnovo waypoint handling is pinned by `tests/pre_planned_operations.test.ts`, which proves `op:trnovo:kijevo_2` is stripped as an already-controlled capture objective while remaining the approach waypoint to `op:trnovo:delijas`.
- The original closure report is `docs/40_reports/implemented/20260605_REVIEW_BACKLOG_ENGINE_BATCH.md`.

## Current #170 Residuals

- Enclave denominator remains a domain/design decision. The current `/100` fallback pressure can affect Washington/HRHB timing if changed.
- Same-axis concentration remains calibration-held. The blanket arithmetic fix failed the 188-week engine-health floor at `matched_osids` 637/712 against the 658 floor, so production behavior stays reverted and helper-contract coverage remains the only merged proof.

## Verification

- Docs-only diff review.
- `git diff --check`.

Determinism/scope: documentation only; no simulation logic, scenario data, save schema, UI behavior, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
