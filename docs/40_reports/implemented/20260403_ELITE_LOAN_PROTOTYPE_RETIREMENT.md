# 2026-04-03 - Elite loan prototype retirement

## Summary
- Retired the obsolete `elite_loan.ts` prototype and its dedicated test rail.
- Updated canon/context memory to make `army_reserve_system.ts` the sole live owner of elite reserve loans.

## Files changed
- deleted `src/sim/combat/elite_loan.ts`
- deleted `tests/elite_loan.test.ts`
- `docs/10_canon/context.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Why
- Runtime elite loans already live entirely in `army_reserve_system.ts`, but the old prototype module and its standalone tests still looked authoritative enough to attract future fixes onto the wrong rail.
- In a repo like this, polished dead authority is more dangerous than obviously broken code.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\army_reserve_system.test.ts tests\\elite_loan_recall.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
