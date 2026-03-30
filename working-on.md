# Working On — 2026-03-30 (Session: n1217 Regression)

## Current State
- n1217: 92.2% area-weighted, 22/22 anchors, 6/6 benchmarks — MAP HOLDS
- P0 REGRESSION: 38 battles, 18-week drought (w23-40) vs 69 battles in n1216
- War-or-Game: NOT APPROVED

## Root Cause (confirmed by Gap Finder)
**Slot cap counts recovery-phase ops.** With cap=1 per 12 brigades:
- Op completes → enters `phase: 'recovery'` (2-3 turns)
- Recovery op still occupies the slot
- `briefing.active_operations.length >= 1` → emit.ts blocks new op
- Commander plans continuously but can never emit while recovery-phase op exists
- Result: 2-3 turn blackout per cycle, compounding → 18-week drought

## P0 Fix Required
**File:** `src/sim/combat/commander/emit.ts`, function `buildOperations`

**Change:** Filter recovery-phase ops out of slot cap count:
```typescript
// OLD (line 524):
if (briefing.active_operations.length >= getMaxOperationSlots(briefing.brigades.length)) {

// NEW:
const activeSlotUsers = briefing.active_operations.filter(op => op.phase !== 'recovery');
if (activeSlotUsers.length >= getMaxOperationSlots(briefing.brigades.length)) {
```
Same fix needed for the PROBE emission check at line 635:
```typescript
// OLD:
briefing.active_operations.length < getMaxOperationSlots(briefing.brigades.length)

// NEW:
activeNonRecovery.length < getMaxOperationSlots(briefing.brigades.length)
```

## P1 Fix (Fix 2 completion)
`plan.ts selectOpportunityTargets()` must query `operation_history` for recently-failed OSIDs.
Currently: history is written but never read. The cooldown mechanism is inert.

## Commits This Session
- 84974d80: fix(commander): Fix 1+4 — slot cap guard + initial_strength on commander ops
- a7d7f71a: fix(commander): Fix 2 — write operation_history on plan abandon + execution handoff
- 0e0b0d73: fix(commander): tighten isBesiegedCorps — main-body corridor_width gate

## Next Steps
1. **Implement P0 fix** — filter recovery-phase ops from slot cap count (emit.ts, 2 sites)
2. Typecheck + vitest
3. Run n1218
4. Dispatch two-tier panel on n1218
5. If combat restored: implement Fix 2 completion (plan.ts op_history query)
6. War-or-Game sign-off

## Fix 6 Status: CLOSED
HRHB passivity = structural. No valid war enemies in 40w period (RS cold front, RBiH allied).
Probe ops cycle harmlessly. Not a bug.
