# Orchestrator: Report on One-Brigade-Per-Target Changes

**Date:** 2026-02-14  
**Role:** Orchestrator  
**Scope:** Summarize changes from the one-brigade-per-target attack orders implementation; confirm canon documentation is updated.

---

## 1. Summary of changes

Following the convene [ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14.md](../convenes/ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14.md), the root cause for “130 orders, 10 flips” was identified: **multiple brigades per turn were assigned the same target settlement**; the first order flips it and later orders against that settlement are skipped (target already friendly). The plan **one-brigade-per-target** was implemented to enforce at most one brigade per faction per turn per target, with a defined exception.

### 1.1 Behavior

- **Rule:** At most one brigade per faction per turn may be assigned to attack a given settlement. When assigning attack orders, already-chosen targets are treated as unavailable.
- **Exception:** A brigade may be assigned to an already-chosen target **only if** (1) it is part of an active OG conducting an operation toward that settlement, **and** (2) the target has **heavy resistance** (defender brigade in AoR at target or garrison ≥ 250). Until operation targeting exists, the OG+operation check is a stub (returns false), so no duplicates in practice.
- **Diagnostic:** Run summaries and end report now include **`unique_attack_targets`** (distinct SIDs targeted per turn) alongside `orders_processed` and `flips_applied` so future runs can confirm de-duplication is spreading attacks.

### 1.2 Code and artifacts

| Area | Change |
|------|--------|
| **bot_brigade_ai.ts** | `HEAVY_RESISTANCE_GARRISON_THRESHOLD` (250); `hasHeavyResistance()`, `isPartOfOGOperationToward()` stub; in `generateBotBrigadeOrders`, `chosenTargets` set and logic: assign preferred if not chosen, else if exception then preferred, else first available not chosen; if none, no order. |
| **resolve_attack_orders.ts** | Report field `unique_attack_targets` = count of distinct target SIDs in `brigade_attack_orders` for the turn. |
| **scenario_runner.ts** | Phase II summary and weekly rollup accumulate and emit `unique_attack_targets`. |
| **scenario_end_report.ts** | Phase II summary types and formatted output include `unique_attack_targets`. |
| **tests** | `tests/bot_brigade_attack_dedup.test.ts`: no duplicate targets; determinism (same state/edges ⇒ same attack_orders). |
| **Refactor pass** | Inlined `unique_attack_targets` in resolve_attack_orders; simplified determinism test; test fixture satisfies FormationState. |

### 1.3 Ledger

- **PROJECT_LEDGER.md:** Entry **2026-02-14 — One-brigade-per-target attack orders with OG+heavy-resistance exception** (summary, change, determinism, artifacts).

---

## 2. Canon documentation status

Canon has been updated so that behavior and implementation are aligned and discoverable.

| Document | Update |
|----------|--------|
| **AI_STRATEGY_SPECIFICATION.md** | New subsection **Attack target de-duplication**: one per target; OG+heavy-resistance exception; stub until operation targeting; `unique_attack_targets` in run summaries. |
| **Systems_Manual_v0_5_0.md §6.5** | **One brigade per target** added to Phase II bot (brigade AI) implementation-note; exception (OG+operation and heavy resistance) and “operation targeting not yet implemented” stated; Implementation list includes `src/sim/phase_ii/bot_brigade_ai.ts`. |
| **Phase_II_Specification_v0_5_0.md §12** | Phase II bot brigade AI bullet: one brigade per target per faction per turn (exception: OG operation + heavy resistance—not yet implemented); §6.5 reference extended to “one-brigade-per-target”. |
| **context.md** | Implementation references: new sentence for **Attack target de-duplication (2026-02-14)** — one brigade per target, exception stub, `unique_attack_targets`, and pointers to AI_STRATEGY_SPECIFICATION, Systems Manual §6.5, Phase II Spec §12. |

No further canon changes are required for this feature.

---

## 3. Next steps (optional)

- **Re-run scenarios:** Use existing Phase II scenarios and compare `orders_processed`, `unique_attack_targets`, and `flips_applied` in run summaries to confirm attacks are spread across more settlements.
- **Future work:** When operation targeting exists (e.g. corps/OG orders with `target_sid`), implement `isPartOfOGOperationToward()` so that brigades in an OG assigned to an operation toward a heavily defended settlement can legally double up on that target.

---

## 4. References

- Plan: one-brigade-per-target attack orders (OG+heavy-resistance exception).
- Convene: [ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14.md](../convenes/ORCHESTRATOR_WHY_NO_PHASEI_CONSOLIDATION_AND_FEW_FLIPS_2026_02_14.md).
- Ledger: PROJECT_LEDGER.md entry 2026-02-14 (One-brigade-per-target attack orders).
