# 2026-04-10 - Startup Snapshot Guardrail Contract Hardening

## Lane summary

- **Lane title:** Startup snapshot proof-path isolation and checkout-normalized contract hardening
- **Why this lane:** The packaged startup path itself had already been hardened, but the proof substrate around it was still brittle. `desktop_startup_snapshot_guardrails.test.ts` was mutating the committed April 1992 startup snapshot in place, and `startup_snapshot_contract.test.ts` could fail on Windows checkout line-ending drift even when the canonical builder truth was unchanged.
- **Canonical owner after cleanup:** `src/scenario/startup_snapshot.ts` now owns both the startup snapshot override boundary for tests and the checkout-normalized payload contract for baked snapshot reads.
- **Demoted path after cleanup:** proof-only direct filesystem mutation of the committed startup artifact and raw byte-for-byte snapshot comparisons that treated CRLF checkout normalization as semantic drift

## Candidate seams considered

1. Startup snapshot guardrail tests mutating repo-owned baked artifacts during failure-path proof.
2. Windows checkout line endings causing false startup drift failures.
3. New packaged/runtime seams after `fix(desktop): harden packaged startup contract`.

## Exact seam chosen

The remaining seam was in the proof boundary, not the runtime launch path:

- the destructive guardrail tests were renaming and rewriting the committed startup snapshot instead of using an isolated throwaway copy
- the snapshot contract test compared raw file bytes to builder output, so a CRLF checkout could trip a false failure even though the canonical startup state was identical

That made the packaged startup contract look weaker than it really was and created avoidable repo-state risk during proof runs.

## Why this was the highest-value bounded step

This lane stayed fully on the hardening side of the board:

- the product startup owner already existed
- the missing behavior was proof-path isolation and checkout normalization, not new doctrine
- the seam affected packaged/runtime confidence directly
- it could be proven with targeted startup/package checks plus the full verification bar

## Files changed

- `.gitattributes`
- `src/scenario/startup_snapshot.ts`
- `tests/desktop_startup_snapshot_guardrails.test.ts`
- `tests/startup_snapshot_contract.test.ts`
- `docs/40_reports/implemented/20260410_STARTUP_SNAPSHOT_GUARDRAIL_CONTRACT_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

### Code

`src/scenario/startup_snapshot.ts` now:

- supports an explicit per-snapshot override env var for proof-only redirection
- normalizes snapshot payload line endings when building and reading the baked artifact contract

`tests/desktop_startup_snapshot_guardrails.test.ts` now:

- creates a temporary copy of the committed startup snapshot
- points failure-path checks at that throwaway copy through the override env var
- stops mutating the repo-owned snapshot during negative-path proof

`tests/startup_snapshot_contract.test.ts` now:

- reads the baked artifact through `loadStartupSnapshotPayload(...)`
- compares normalized payload truth instead of raw checkout bytes

`.gitattributes` now pins `data/derived/startup/*.json` to LF so the repo contract is explicit in addition to the runtime normalization guard.

## Before / after proof

### Baseline

- destructive startup guardrail tests rewrote the committed `data/derived/startup/apr_1992_initial_save.json`
- the startup contract test could fail on Windows because the baked snapshot checked out with CRLF while the canonical builder emitted LF

### Post-fix

- the guardrail suite mutates only a temporary snapshot copy through the canonical override boundary
- startup payload reads are line-ending normalized, so checkout CRLF no longer masquerades as semantic drift
- packaged startup proof now passes while the committed snapshot remains untouched

## Verification

- `node .\node_modules\tsx\dist\cli.mjs --test tests\startup_snapshot_contract.test.ts tests\desktop_campaign_start_contract.test.ts tests\desktop_startup_snapshot_guardrails.test.ts`
  - passed: `11` tests
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:sim:build`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
  - passed: `241` files / `3123` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks

- This lane hardens packaged startup proof and baked-artifact contract handling only; it does not claim new scenario/runtime behavior changes beyond that boundary.
- The active global board still contains non-startup work in other domains, including player-knowledge integrity and remaining anomaly/historical-audit seams.
