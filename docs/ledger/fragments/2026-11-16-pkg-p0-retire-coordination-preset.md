## 2026-11-16 — Package "1994-95 attack and defence", P0: the multi-corps offensive pre-set is retired (inert)

Fable consult 2, Revision 2 (P0): retire RF-STRENGTH's dead write and its never-run replacement, proving the hash unchanged.

**Retired: `coordinateMultiCorpsOffensive`** (`bot_corps_stance.ts`; its step-0b call and re-export in `bot_corps_ai.ts`).
- Under army stance general_offensive it pre-set the two highest-scoring corps to offensive.
- Step 2, `generateCorpsStanceOrders`, then rewrites every corps stance. The pre-set survived only for a corps with `player_ordered_stance`, which step 2 skips: there it overrode the President's accepted stance for the turn. The stance-hold clamps do not cover `player_ordered_stance`.
- Headless it changed nothing. For a player it was a defect, so retiring it is also a fix.
- `countHealthyBrigades` stays: the corps_plan trace reads it.

**Kept: the general_offensive / strategic_defense lifecycle in `evaluateOperationProgress`, with its in-execution replacement.**
- No bot path creates those op types. The L7 lane measured 0 before and after F7b.
- But a player path can. The desktop `stage-corps-operation-order` handler (`author_op_staging.cjs` VALID_OP_TYPES) accepts both types, and `inject-authored-operations` consumes them. Its only renderer caller is the parked operations planner (`ops_modal/AuthorizePhase.tsx`, DLC, unmounted on purpose).
- Legacy saves (#683's `is_emergency` strategic-defence op) also walk this lifecycle.
- So the handling is not dead code. The replacement's 3,000-cap yardstick is fixed with RF-STRENGTH (package P4).

**Proof.**
- Headless 188w against main `f5a7990af`: all 8 artifacts byte-identical (final_save `799e43a7ee2f4764`).
- `tsc` 0; `test:baselines` all match.
- New `tests/sim/coordination_preset_retired.test.ts`.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-1994-95-step0/` (p0_*).
