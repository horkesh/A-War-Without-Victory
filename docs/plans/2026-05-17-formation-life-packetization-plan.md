# Formation Life Packetization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the broad formation-life believability backlog into small, testable packets that can be implemented without mixing doctrine, bugs, and realism polish.

**Architecture:** Start from diagnostics and classify each formation-life anomaly by owner subtype. Only implement a packet when it has a clear root cause, test fixture, and expected scenario effect. Doctrine and historical-design questions stay report-only until approved.

**Tech Stack:** TypeScript sim diagnostics, scenario runner artifacts, Vitest.

---

## Packet Inventory

1. **FL-A: Active-never-fights sector-front behavior.**
2. **FL-B: Far-from-home live owner truth and redeployment limits.**
3. **FL-C: Same-corps rear drift versus legitimate reserve/rear coverage.**
4. **FL-D: HRHB/HVO offensive emergence and under-active fronts.**
5. **FL-E: Doctrine-only cases: 444th Konjic salient, same-faction unreachable remnants.**

## Task 1: Rebuild Classification From a Fresh Run

**Files:**
- Modify: `tools/diagnostics/formation_life_anomalies.cjs` if present, otherwise create `tools/diagnostics/formation_life_packet_inventory.cjs`
- Test: `tests/formation_life_packet_inventory.test.ts`

**Steps:**
1. Write a test fixture that classifies formations into `loan`, `operation_participant`, `sector_front`, `sector_reserve`, `sector_rear`, `sector_owned`, `doctrine`.
2. Implement deterministic sorting by formation id.
3. Run focused test.
4. Record baseline counts before any runtime packet starts.

**Acceptance:** Inventory emits counts and a stable JSON list for each subtype.

No runtime packet starts until subtype counts are stable and the inventory output path is recorded in the packet report.

## Task 2: FL-A Sector-Front Inertness Packet

**Files:**
- Inspect/modify: `src/sim/combat/bot_brigade_ai_osid.ts`
- Inspect/modify: `src/sim/combat/sector_offensive.ts`
- Test: `tests/formation_life_sector_front_inertness.test.ts`

**Steps:**
1. Add red tests for a sector-front brigade with adjacent enemy and legal corps authority but no action.
2. Implement the smallest fix in brigade/corps decision routing.
3. Run focused tests and a 40w smoke.

**Acceptance:** `sector_front` active-never-fights count drops without increasing invalid operations.

Acceptance table: `bucket | before count | after count | output hash/status | evidence path`.

## Task 3: FL-B Far-From-Home Ownership Truth Packet

**Files:**
- Modify: `src/scenario/scenario_reporting.ts`
- Modify: `src/sim/combat/brigade_assignment.ts` only if reporting proves runtime bug.
- Test: `tests/formation_life_far_from_home_truth.test.ts`

**Steps:**
1. Add tests that separate `redeployed`, `loan`, `operation`, and `unassigned` far-from-home cases.
2. Patch reporting or runtime ownership only where classification is false.
3. Rerun diagnostics.

**Acceptance:** No formation is labeled a bug when it has a live owner; ownerless cases remain visible.

FL-C and FL-E stay report-only until a separate doctrine/design ruling authorizes runtime behavior changes.

## Task 4: FL-D HRHB/HVO Offensive Emergence Packet

**Files:**
- Inspect: `src/sim/combat/bot_corps_operations.ts`
- Inspect: `src/sim/combat/operation_opportunities.ts`
- Test: `tests/hrhb_offensive_emergence.test.ts`

**Steps:**
1. Create red tests around a historically plausible HRHB/HVO front with legal opportunity and no proposal.
2. Confirm whether the blocker is opportunity catalog, patron directive, readiness, or corps stance.
3. Patch only the proven owner.

**Acceptance:** HRHB/HVO under-activity gets a typed blocker or a generated operation; no generic aggression bump.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\formation_life_packet_inventory.test.ts tests\formation_life_sector_front_inertness.test.ts tests\formation_life_far_from_home_truth.test.ts tests\hrhb_offensive_emergence.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node tools\diagnostics\formation_life_packet_inventory.cjs <run-dir>`

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_FORMATION_LIFE_PACKETIZATION.md`
- `docs/plans/2026-04-30-v09-formation-life-believability-plan.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Determinism statement required for every runtime packet. Report-only packetization must not claim scenario improvement.

## Commit And Closeout

- Commit packet inventory separately from any runtime packet.
- Stage only diagnostic, packet-specific runtime owner files, focused tests, implemented report, roadmap, and ledger files owned by the active packet.
