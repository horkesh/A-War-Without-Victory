# Working On — 2026-03-30 (Session: n1216 Post-Run Panel)

## Current Task
Post-run two-tier panel complete for n1216. Synthesizing results. Next: implement fixes.

## State
- n1216 committed: 91.8% area-weighted, 21/22 anchors, 6/6 benchmarks
- 69 battles, longest stretch 2 weeks — P0 macro FIXED by Tasks 1-5
- War-or-Game: NOT APPROVED (valid_for_combat_calibration=false, 493 zero-eligible-attacker ops)
- 4 railroads identified by Railroad Hunter
- 6 fixes proposed and canon-reviewed

## Railroads Found (all in commander/)
1. P0: Slot cap bypass — `emit.ts buildOperations` never calls `hasAvailableSlot` → zombie ops (vrs_2nd_krajina 40 ops in 40 weeks)
2. P0: operation_history never written — no memory of zero-attack failures → same objectives re-planned forever
3. P0: Brigade rotation gap — no cooldown after op participation → same 7-8 brigades re-assigned every generation (5th Corps)
4. P1: initial_strength not set on commander ops → power-attrition abort gate dead

## Proposed Fixes (priority order per Canon Reviewer)
1. Fix 1: `emit.ts` — call `hasAvailableSlot` before emitting new op (COMPLIANT, low risk)
2. Fix 4: `emit.ts buildOperations` — set `initial_strength` at emit time (COMPLIANT, low risk)
3. Fix 2: `emit.ts buildUpdatedState` — write OperationHistoryEntry on plan complete/abandon (COMPLIANT)
4. Fix 5: `plan.ts isBesiegedCorps` — require ALL zones besieged OR physical isolation (COMPLIANT)
5. Fix 6: HRHB stance unlock — investigate corps vs sector blockage layer first (CONDITIONAL)
6. Fix 3: Brigade cooldown N turns after op participation (AMBIGUOUS — calibration validation required)

## Other Issues
- Jajce event fires w40, should be ~w27-29 (timing offset)
- arbih_120th spawn mismatch: spawned w27, referenced in Op Teočak (w1)
- 9 active brigades morale <10 not dissolving (HRHB 3x morale=0 with high personnel)
- activity_summary all zeros (pipeline issue)
- equipment reporting bug (end_report reads wrong field, composition.tanks has data)

## Next Steps
1. Implement Fixes 1+4 (pure correctness, no unknowns)
2. Implement Fix 2 (operation_history write)
3. Implement Fix 5 (besieged corps gate)
4. Investigate HRHB corps-vs-sector blockage
5. Implement Fix 6 (HRHB stance unlock)
6. Run 40w, dispatch panel
7. Schedule crons A+B (missing)
