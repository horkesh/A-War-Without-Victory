# Rastosnica / Drina Coupling Resolution — Adjacent-Defender Projection Fix

**Date:** 2026-04-05
**Run:** n1329 (94.0% area-weighted, 27/27 anchors, 6/6 benchmarks)
**Status:** RESOLVED — engine fix + data correction

## Summary

Resolved the rastosnica_2 anchor failure and discovered the Drina coupling seam: a single initial-control change in the Zvornik corridor cascaded through the paramilitary sweep system to collapse Gorazde enclave 200km away. Root cause: offensive paramilitary sweep detection checked only on-OSID defenders, ignoring adjacent brigades. Fix: `hasAdjacentDefender()` projection in `detectOffensiveParamilitaryTargets()`. Secondary hardening: 5 Gorazde enclave brigades available at t0 instead of t6-9.

## Problem Statement

Op Teocak was an ahistorical ARBiH corps-level offensive targeting `op:zvornik:rastosnica_2`. It failed catastrophically (10:1 casualty ratio) because ARBiH light infantry cannot crack VRS artillery + entrenchment. The historian confirmed no such operation existed historically. rastosnica_2 should be ARBiH-controlled from the start.

## Investigation Chain

### Step 1 — Op Teocak Audit (n1323)
Op Teocak fired but failed. Root cause: the operation itself was ahistorical. Combat outcome was mechanically correct (ARBiH rifles vs VRS artillery = massive losses). Decision: remove the operation, fix initial control instead.

### Step 2 — Event-Based Handoff (n1324)
Attempted a Sapna Corridor Link-Up event to flip rastosnica_2 at t3. VRS immediately recaptured it via paramilitary sweep. Event approach abandoned — the sweep system was too aggressive for a narrative handoff to survive.

### Step 3 — Initial Control Correction (n1325)
Changed rastosnica_2 initial control from RS to RBiH. This triggered a cascade: Gorazde enclave collapsed entirely (0/17 RBiH OSIDs, down from 14/3 baseline). The Drina coupling was discovered — both areas share the VRS Drina Corps, and the control change shifted Drina Corps force allocation away from Gorazde.

### Step 4 — Gorazde t0 Defenders (n1326)
Changed 5 Gorazde enclave brigades (801st, 802nd, 808th, 843rd, 851st) from available_from 6-9 to 0. Gorazde recovered (14/3 RBiH/RS). But rastosnica_2 still fell at t1 to paramilitary sweep, and sapna fell when the 246th was repositioned.

### Step 5 — Adjacent-Defender Projection (n1328/n1329)
Root cause identified: `detectOffensiveParamilitaryTargets()` only checked for defenders physically on the target OSID, ignoring brigades at adjacent OSIDs that would realistically contest any takeover. Fix: `hasAdjacentDefender()` checks all graph-adjacent OSIDs for same-controller brigades. Both rastosnica_2 and sapna held permanently. Calibration restored.

## Root Cause

**Primary:** Offensive paramilitary sweep detection in `paramilitary_sweep.ts` lacked adjacent-defender awareness. It treated any OSID without an on-tile garrison as vulnerable, even when brigades at neighboring OSIDs would project force into that space. This created a topology sensitivity where changing a single OSID's initial control could cascade through the paramilitary system to flip distant OSIDs.

**Secondary:** 5 Gorazde enclave brigades (801st Brcanska, 802nd Istocnobosanska, 808th Oslobodilacka, 843rd Gorazde, 851st Drina) had available_from values of 6-9 turns, leaving the enclave underdefended during the critical early-war period when paramilitary sweeps are most active. These brigades historically mobilized at war's start.

## Fix Description

### Engine Change
- **`src/sim/combat/paramilitary_sweep.ts`**: Added `buildDefenderFactionMap()` (maps OSIDs to defending faction from brigade locations) and `hasAdjacentDefender()` (checks graph-adjacent OSIDs for same-controller brigades). `detectOffensiveParamilitaryTargets()` now skips any OSID where an adjacent brigade of the controlling faction exists.

### Data Changes
- **`data/scenarios/apr1992_definitive_40w.json`**: rastosnica_2 initial control changed from RS to RBiH (historically correct — area was ARBiH-held at war start).
- **`data/source/oob_brigades.json`**: 5 Gorazde brigades available_from changed to 0 (historically correct — mobilized at war's start, not months later).

### Removed
- **Op Teocak**: Removed entirely from `src/sim/combat/pre_planned_operations.ts` (ARBIH_PRE_PLANNED = []). Ahistorical operation.
- **Sapna Corridor Link-Up event**: Removed. Superseded by initial control correction + engine fix.
- **displaced_to event enhancement**: Reverted. Unused, part of abandoned event path.

### Tests Added
- **`tests/paramilitary_sweep.test.ts`**: +3 tests for adjacent-defender projection (skip when adjacent defender exists, sweep when no adjacent defender, multi-faction adjacency).
- **`tests/gorazde_enclave_contract.test.ts`**: +6 tests for Gorazde t0 defender availability (all 5 brigades available at t0, brigade count, corps assignment).

## Verification Results (n1329)

| Metric | Value |
|---|---|
| Area-weighted accuracy | 94.0% |
| Anchors | 27/27 |
| Benchmarks | 6/6 |
| rastosnica_2 | RBiH (never flipped) |
| sapna | RBiH (never flipped) |
| teocak | RBiH |
| Gorazde enclave | 16/1 RBiH/RS |
| Tests | 2353/2353, 168 files |
| tsc | Clean |

## Open Items

None blocking. The Gorazde enclave outcome (16/1 RBiH/RS) is slightly better than baseline (14/3), which is a positive emergent outcome from earlier brigade availability — not a regression requiring correction.

## Abandoned Approaches

1. **Event-based flip (n1324)**: Sapna Corridor Link-Up event at t3 — VRS paramilitary sweep immediately recaptured the OSID. Events cannot survive aggressive sweep mechanics.
2. **Brigade repositioning**: Moving 246th Vitezka to cover rastosnica_2 uncovered sapna. Zero-sum brigade shuffling within the Tuzla corridor.
3. **Op Teocak retention with fixes**: The operation was ahistorical. No amount of tuning would make it historically valid.
