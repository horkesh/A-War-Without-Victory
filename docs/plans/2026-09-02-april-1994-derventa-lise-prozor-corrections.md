# April 1994 Derventa, Lise, and Prozor Corrections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the April 1994 calibration through historically bounded operations and local defensive force behavior: VRS clears Živinice during Operation Corridor, the Liše home brigade covers its threatened home front before corps redistribution, and HVO takes only Lug and Paroš near Prozor.

**Architecture:** Extend the authored operation catalogue for the two territorial changes so both continue to pass through normal combat resolution. Add a deterministic, tag-scoped home-front preference to sub-segment assignment so a fixed-home brigade is used on a friendly home OSID that is actually in contact, without pinning it outside combat or overriding operation participation. Preserve stable ordering and all control-change causality invariants.

**Tech Stack:** TypeScript, Vitest, deterministic scenario harness, self-contained interactive HTML map.

---

### Task 1: Operation Corridor clears Živinice

**Files:**
- Modify: `src/sim/combat/pre_planned_operations.ts`
- Test: `tests/pre_planned_operations.test.ts`

1. Add a failing catalogue-order test requiring `op:derventa:zivinice` on Corridor's east axis after the Derventa objectives and before Bosanski Brod.
2. Add the objective to the authored axis.
3. Run the focused test and preserve deterministic objective order.

### Task 2: Threatened fixed-home brigades defend local contact

**Files:**
- Modify: `src/sim/combat/subsegment_assignment.ts`
- Test: `tests/brigade_front_distribution.test.ts`

1. Add a failing assignment test with two sub-segments proving a `placement:fixed_home_osid` brigade is assigned to the sub-segment containing its friendly, contacted home OSID.
2. Add a deterministic home-contact affinity/priority restricted to active fixed-home brigades whose home OSID is friendly and lies on a sector sub-segment.
3. Confirm the rule does not immobilize brigades, create control changes, or override operation participation.

### Task 3: Bounded HVO Prozor operation

**Files:**
- Modify: `src/sim/combat/pre_planned_operations.ts`
- Test: `tests/pre_planned_operations.test.ts`

1. Add failing catalogue and queue tests for a historical HVO Prozor operation whose only objectives are `op:prozor:lug_2` and `op:prozor:paros`.
2. Define its timing, staging, and local HVO participants so it occurs after the January 1993 checkpoint and before April 1994.
3. Queue it through the existing pre-planned injection path and reserve its historical name against emergent reuse.

### Task 4: Verification and calibration

**Files:**
- Modify as required: canon/ledger documentation describing the behavioral change
- Generate: April 1994 run diagnostics and interactive HTML map

1. Run focused tests and TypeScript typecheck.
2. Run the definitive scenario through week 104 twice and compare hashes.
3. Verify Živinice is RS, Liše remains HRHB, Lug and Paroš are HRHB, and inspect all HRHB↔RBiH deviations for regressions.
4. Update canon/ledger notes, commit only intended files, and publish/open the new remote interactive map.
