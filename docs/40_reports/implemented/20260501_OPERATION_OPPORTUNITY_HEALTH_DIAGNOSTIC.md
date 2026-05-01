# Operation Opportunity Health Diagnostic

**Date:** 2026-05-01
**Type:** Read-only diagnostic tooling. No simulation behavior, combat math, opportunity catalog content, OOB, scenario data, painted targets, or operation definitions changed.

## Summary

Added `tools/diagnostics/opportunity_health_audit.cjs`, a deterministic markdown diagnostic for reviewing the Operation Opportunity observability chain in any run directory.

It reads:

- `final_save.json`
- optional `run_summary.json`
- optional `operation_aars.json` fallback when `final_save.operation_history` is absent

It reports:

- total decisions
- approved / declined / expired counts
- completed opportunity rows
- success rows
- T3 defensive sentinels
- approved offensive rows without AAR links
- broken AAR links
- duplicate proposal-resolution rows
- per-resolution table with response turn, faction, proposal id, display name, response, exit class, AAR id, AAR outcome, attacks, objective counts, and grade

## Why

Claude is expanding opportunity content while Codex owns architecture review. We needed a reusable, fast diagnostic that can verify whether new family content is flowing through the intended proposal -> decision -> AAR chain without hand-scraping saves.

## Verification

- Red first: `npx.cmd vitest run tests/opportunity_health_diagnostic.test.ts` failed because the script did not exist.
- Green:
  - `npx.cmd vitest run tests/opportunity_health_diagnostic.test.ts` -> 1/1 pass.
  - `npx.cmd tsc --noEmit` clean.
  - `npx.cmd vitest run tests/opportunity_health_diagnostic.test.ts tests/cost_ledger_comparison.test.ts tests/ui/endgame_mount_proof.test.ts` -> 35/35 pass.
  - Manual smoke: `node tools/diagnostics/opportunity_health_audit.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1602` emits a deterministic report and flags the existing Sana row as approved without AAR link.

## Invariants

- Read-only. Writes nothing.
- Deterministic sort order by response turn, opportunity id, and proposal id.
- Does not import or evaluate the opportunity catalog.
- Does not infer success from operation names; it reports `exit_class` and linked AAR truth.

## Next

Use this diagnostic as the first review command after any opportunity-family content lane:

```powershell
node tools\diagnostics\opportunity_health_audit.cjs <run_dir>
```
