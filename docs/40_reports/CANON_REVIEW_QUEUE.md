# Canon Review Queue

## 2026-05-17 - Supply Cascade Dependency Wording

**Source:** `docs/plans/2026-05-17-supply-design-completion-plan.md` Task 5; legacy intent from `docs/30_planning/_legacy/SUPPLY_DESIGN.md` Section 5.

**Target for manual review:** `docs/10_canon/Engine_Invariants_v0_9_0.md` Section 4, Supply and Corridor Invariants.

**Recommendation:** Confirm the cascade wording explicitly states that dependent regions transition in deterministic order by `faction_id`, then OSID/node id, and that junction loss alone does not collapse a corridor unless the dependency threshold is crossed.

**Code evidence:** `tests/supply_cascade_deterministic_order.test.ts` guards byte-identical corridor and per-OSID supply output across shuffled adjacency insertion order. No threshold semantics were changed.
