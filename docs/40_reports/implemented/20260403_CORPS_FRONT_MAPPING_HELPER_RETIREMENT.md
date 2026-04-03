# 2026-04-03 - Corps front mapping helper retirement

## Summary

Removed the dead `deriveCorpsFrontMapping(...)` helper from `bot_corps_directives.ts`.

The helper still read `state.military.assignable_front_segments` and derived a corps-front map from compatibility-era front-segment endpoints, but there were no live non-archived callers left. Leaving it inside a core AI directives module made the old front model look more canonical than it really is.

This pass:

- removed the dead `deriveCorpsFrontMapping(...)` helper
- removed its now-unused `FormationId` type import
- added an honesty regression so the AI directives module cannot quietly grow a new direct dependency on `assignable_front_segments`

## Why this matters

In AWWV, the dangerous legacy code is often not the code that still runs. It is the code that sits in an authoritative-looking file and suggests a second truth-owner to the next implementer.

`bot_corps_directives.ts` is exactly that kind of file. Keeping a compatibility-front helper there would teach future work that front-segment mapping still belongs in live corps AI, even though sectors now own frontline command truth.

## Files changed

- `src/sim/combat/bot_corps_directives.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`
- `docs/40_reports/implemented/20260403_CORPS_FRONT_MAPPING_HELPER_RETIREMENT.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts`

## Result

The corps directives module no longer contains a dead side-reader of `assignable_front_segments`.

That makes the repo more honest about where frontline truth lives:

- sectors = live frontline command authority
- `assignable_front_segments` = compatibility residue only
- corps AI = should reason from sectors and canonical operational data, not old front snapshots
