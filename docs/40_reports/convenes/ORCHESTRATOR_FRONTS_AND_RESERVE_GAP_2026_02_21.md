# Orchestrator: Fronts and Reserve — Gap and Required Direction

**Date:** 2026-02-21  
**Trigger:** User feedback: fronts are not visualized nor assigned; no HoI-style GUI; bots do not assign brigades to fronts; designed systems are not tied in and functioning.  
**Purpose:** State the gap honestly, define the desired behavior, and lock a single direction so engine, bot, and GUI can align.

---

## 1. What you asked for

1. **Rule:** Each brigade **must** be attached to a front to be able to do actions. If not attached, it is in **reserve**.
2. **Assignment flow:** Player/bot clicks a brigade → offered a **choice of fronts** to assign it to.
3. **HoI-style GUI:** Fronts **visualized**; assignment **visible and operable** (assign brigade to front).
4. **Bots:** Even without GUI, **bots must assign brigades to fronts** so the mechanic is real in headless/automated play.

---

## 2. Current state (gap)

| Intended (proposal / your expectation) | Current implementation |
|---------------------------------------|-------------------------|
| Fronts as first-class, assignable objects (e.g. corps front = a sector; brigade assigned to one) | **Missing.** We have `front_edges` (derived line) and `corps_front_edges` (per corps edges) but no “front” as an assignable entity and no “brigade → front” assignment state. |
| Brigade on a front → can act; not on a front → reserve, cannot act | **Missing.** No engine rule that gates attack/posture/move on “is this brigade assigned to a front?” Actions are gated only by AoR and front-active detection (implicit “on front” if AoR touches enemy). |
| Click brigade → choose front to assign to | **Missing.** No UI that lists fronts and lets player assign a brigade to one. |
| Fronts visualized (HoI-style) | **Partial.** We draw front *lines* (from `front_edges` / control boundaries) but do not show **fronts as discrete sectors** (e.g. corps fronts) or “this brigade is on this front.” |
| Bots assign brigades to fronts | **Missing.** Bots use existing `brigade_aor` and “front-active” detection; they do **not** perform an explicit “assign brigade to front” step. Corps fronts are only derived from AoR in desktop when player stages; headless has no corps_front_edges. |

So: the **design** (FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL) describes a three-tier hierarchy and corps fronts, but the **engine and GUI** never implemented “fronts as assignable” or “reserve vs on front” or “assign brigade to front.” The systems we built (brigade AoR, front_edges, corps_front_assign) are **not** tied into a single, clear loop: **fronts exist → player/bot assigns brigades to them → only assigned brigades can act.**

---

## 3. Required direction (single priority)

**Priority:** Implement **fronts as assignable** and the **reserve rule**, then wire **assignment** (bot + GUI) and **visualization**.

1. **Canon / design**
   - **Reserve rule:** A brigade can issue attack, posture, move, reposition only if it is **assigned to a front**. If not assigned, it is in reserve (no actions).
   - **Front:** For our hierarchy, “front” = assignable unit. At minimum: **corps front** (a set of edge_ids, one per corps). So “assign brigade to front” = assign brigade to a corps front (its corps’ front or a chosen one, per design).
   - **Assignment state:** Engine must store “brigade B is assigned to front F” (e.g. brigade → corps_front_id or front_id). Unassigned = reserve.

2. **Engine**
   - Add state: e.g. `brigade_front_assignment: Record<FormationId, FormationId | null>` (brigade → corps_id of the front it’s assigned to) or equivalent. Null = reserve.
   - Gate all brigade actions (attack, posture, move, reposition) on: brigade is assigned to a front (non-null). Reserve brigades do not issue orders.
   - Ensure **corps fronts exist in headless** (e.g. call `ensureDerivedCorpsFrontEdges` in the turn pipeline so every run has corps_front_edges and thus assignable fronts).

3. **Bot**
   - **Assign brigades to fronts** before generating orders: for each brigade, if unassigned, assign it to its corps’ front (or a valid front by rules). Then only assigned brigades proceed to attack/posture/move logic.
   - Optionally: reassign between fronts (e.g. move from quiet sector to hot one) under bot strategy.

4. **GUI**
   - **Visualize fronts:** Show corps fronts (and, if we add them, other front types) as discrete sectors/lines so the player sees “these are the fronts.”
   - **Assign brigade to front:** On brigade click (or context menu), show **list of fronts** (e.g. “1st Corps front”, “2nd Corps front”, …) and “Assign to this front.” Reserve = “Unassigned” or “Reserve.”
   - OOB / panel: show “Front: 1st Corps” or “Reserve” per brigade.

---

## 4. What to do next

- **Game Designer:** Confirm canon for reserve rule and “front” = assignable (e.g. corps front). Confirm: one front per corps, brigade must be assigned to a front (its corps’ or other by rules?) to act.
- **Technical Architect / Gameplay Programmer:** Design minimal state and pipeline: `brigade_front_assignment`, where it’s set (init, bot, player), and gating of brigade actions. Ensure headless derives corps fronts so bots can assign.
- **Formation-expert / Gameplay Programmer:** Implement engine state + gating + bot “assign to front” step.
- **UI/UX + Graphics:** Implement front visualization (corps fronts as distinct) and “Assign brigade → choose front” flow.

Use **awwv-plan-change** (or a dedicated design/plan doc) to break this into ordered steps, required doc updates, and ledger entries so the work is traceable and one phase at a time.

---

## 5. Continuity

- This convene: `docs/40_reports/convenes/ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md`
- Design: `docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md`
- Napkin: correction/pattern added so future sessions treat “fronts assignable + reserve rule” as the target, not only “brigade AoR + derived front line.”
