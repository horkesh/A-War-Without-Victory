# v0.9 Presidential Campaign Loop Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Warroom, Army HQ, tactical map, review queues, turn result, consequence surfaces, and endgame judgment read as one coherent presidential campaign loop.

**Architecture:** This is a product-architecture integration lane, not a new mechanic. It consumes existing shell, review, consequence, and endgame plans and verifies that the player's loop answers: what happened, why, what can I influence, what did it cost, and how does history judge it.

**Tech Stack:** TypeScript, React, Electron IPC, GameStateAdapter read model, existing Warroom / Army HQ / tactical map shells, scenario runner evidence.

---

## Source Plans

- `docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md`
- `docs/plans/2026-04-03-v08to09-product-architecture-simplification-plan.md`
- `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`
- `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
- `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`
- `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`

## Integration Contract

The presidential loop owns the sequence. Individual systems keep their existing owners:

1. Warroom frames strategic situation and route to action.
2. Army HQ owns military review, summaries, records, personnel, reserve urgency.
3. Tactical map owns inspection and spatial decision context.
4. Review queues own action resolution.
5. Turn result owns "what happened this turn".
6. Consequence / Cost Ledger / endgame surfaces own "what it meant".

No surface may become a second owner of another surface's job. Warroom may route to Army HQ; it must not duplicate Army HQ's detailed roster/review work. Map may expose operation context; it must not become the final judgment surface.

## Task 1: Create A Loop Inventory

**Files:**
- Modify: `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- Modify: `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- Reference: `src/ui/map/App.tsx`
- Reference: `src/ui/map/components/PresidentialToolbar.tsx`
- Reference: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Reference: `src/ui/map/components/PresidentialAttentionPanel.tsx`
- Reference: `src/ui/map/components/VerdictScreen.tsx`

**Steps:**
1. Inventory the current player path from loaded campaign to end-turn to verdict.
2. Mark each screen as one of: `brief`, `inspect`, `decide`, `review`, `report`, `judge`.
3. Add an ownership table to `PRODUCT_SHELL_HIERARCHY.md`.
4. Update `UI_OWNERSHIP_MATRIX.md` only where the current matrix lacks a row.
5. Verification: docs mention every major shell exactly once in the loop.

## Task 2: Define The Review Queue Boundary

**Files:**
- Modify: `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- Reference: `src/ui/map/data/GameStateAdapter.ts`
- Reference: `src/ui/map/components/PresidentialAttentionPanel.tsx`
- Reference: `src/ui/map/components/army_hq/*`

**Steps:**
1. Classify live review types: military review, event decision, reserve request, autonomy proposal, peace / negotiation review.
2. For each type, name the canonical queue owner and the routing surface.
3. Identify duplicated or ambiguous review UI.
4. Write follow-up implementation packets only for actual duplication.
5. Verification: every review family has one queue owner and one preferred entrypoint.

## Task 3: Turn Result To Consequence Bridge

**Files:**
- Modify: `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- Reference: `src/ui/map/components/CommandBriefingPanel.tsx`
- Reference: `src/ui/map/components/chronicle/*`
- Reference: `src/ui/map/components/VerdictScreen.tsx`
- Reference: `src/sim/war_termination.ts`
- Reference: `src/sim/turn_pipeline_types.ts`

**Steps:**
1. Trace where turn reports, chronicle entries, consequence flags, and verdict packets are created and consumed.
2. Document which surface answers "what happened this turn" and which answers "what this means historically".
3. Flag any missing bridge from consequence flags to player-facing summaries.
4. Verification: a fresh 40w or 188w run can be inspected from run artifact -> UI read model -> judgment surface without hidden ownership jumps.

## Task 4: Walkthrough Proof

**Files:**
- Create: `docs/40_reports/implemented/YYYYMMDD_V09_PRESIDENTIAL_LOOP_WALKTHROUGH.md`

**Steps:**
1. Run or consume the current accepted scenario artifact.
2. Walk a player path through Warroom, Army HQ, tactical map, turn result, and verdict/endgame surfaces.
3. Record gaps as either implementation blockers, v0.9.1 content gaps, or v0.9.4 polish.
4. Verification: report includes screenshots if browser work is used, or direct file/state references if headless only.

## Done Means

- The loop is documented as one player journey.
- Every major surface has one job.
- Cross-system ownership contradictions are either fixed or converted into bounded implementation packets.
- The v0.9.0/v0.9.1 closure gate can be evaluated from player experience, not only from code completion.
