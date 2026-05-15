# Bot Orders Defensive Sector Lookup Cache Rejected

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1831`
**Baseline:** n1830 uncontested caller profile split, final hash `0cb626c032204372`
**Result:** Candidate rejected and reverted; n1831 kept final hash `0cb626c032204372`

## Summary
- Tested a lazy pass-local corps sector-id lookup to replace repeated defensive `findBrigadeSectorId(...)` scans.
- The candidate preserved deterministic final state but worsened the targeted label and added larger index cost.
- No production code or tests from the candidate are retained; this report records the failed shape.

## Candidate Tested And Reverted
### Lazy Corps Sector-ID Lookup
- Added a `buildCorpsSectorIdLookup(...)` helper that preserved first matching sector and largest-sector fallback semantics.
- Threaded a lazy `getCorpsSectorIdLookup()` through `BrigadeEvaluationContext`.
- Used the lookup for retreat grouping and defensive self/sector counterattack sector lookup.

### Why It Was Rejected
- New `bot_orders.executeFactionDirectives.corpsSectorIdLookup`: 15.278ms / 117 calls.
- `.defensive.sectorCounterAttackSectorLookup` worsened from 13.205ms in n1830 to 14.669ms in n1831.
- `defensive` parent rose from 59.253ms to 63.543ms.

The lookup construction cost outweighed any avoided sector scan. This is not a net CPU win and should not ship in this shape.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Key Timings
- n1830 `.defensive.sectorCounterAttackSectorLookup`: 13.205ms / 1,287 calls
- n1831 `.defensive.sectorCounterAttackSectorLookup`: 14.669ms / 1,287 calls
- n1831 `corpsSectorIdLookup`: 15.278ms / 117 calls
- n1831 `defensive`: 63.543ms / 2,357 calls

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/defensive_sector_lookup_cache.test.ts tests/bot_orders_perf_profile.test.ts` failed because `buildCorpsSectorIdLookup` and the static wiring did not exist.
- Candidate green: `npm.cmd run test:vitest:fast -- -- tests/defensive_sector_lookup_cache.test.ts tests/bot_orders_perf_profile.test.ts` passed 6/6, and `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1831 with final hash `0cb626c032204372`.
- Candidate reverted after profiling because the measured CPU result was negative.

## Lessons Learned
- A sector-id lookup that scans all sectors per faction pass is too expensive for this defensive use case.
- Defensive sector lookup is not a good cache target unless a future design can reuse an already-built index at no additional pass cost.
- If this area is revisited, start with a narrower split or a caller that already owns sector ID data.

## Files Changed
| File | Change |
|------|--------|
| `docs/40_reports/implemented/20260515_BOT_ORDERS_DEFENSIVE_SECTOR_LOOKUP_CACHE_REJECTED.md` | Records the rejected n1831 defensive sector lookup cache candidate. |

## Next Steps
- Do not retry the lazy corps sector-id lookup shape.
- Continue from a fresh top profile and prefer larger measured buckets such as sectorAttack predictor internals, sectorMarch residual attribution, or interior fallback only if they remain prominent.
