# Collapse D-shape Implementation Plan

**Goal:** Make local Control Strain reversible and evaluate existing Tier-1 state every turn, then measure whether the accepted selector plus 4.0/0.5 shape produces deterministic live HRHB collapse damage.

**Architecture:** Refactor Phase 3C from event-only strain updates into one canonical union pass over existing strain keys and current exposure keys. Apply linear recovery before combat accrual, then run the existing Tier-1 gates for every tracked entity. No new persisted fields, topology, faction gates, or Phase 3D behavior.

---

### Task 1: Pin D-shape RED

Modify `tests/collapse_d_selection_combat_incidence.test.ts` to prove:

1. an exposed entity receives `exposure * 4.0` after recovery;
2. a previously tracked quiet entity loses 0.5 strain per turn without going below zero;
3. a quiet above-threshold entity advances Tier-1 persistence when Tier-0 allows;
4. a recovering entity resets persistence after falling to or below threshold;
5. input/key ordering produces byte-equivalent state;
6. default-OFF state remains untouched.

Run the focused test and require failure against the retained monotonic/event-only implementation.

### Task 2: Implement the minimal canonical union pass

In `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`:

1. set `STRAIN_FRACTION=4.0` and add `STRAIN_RECOVERY_PER_TURN=0.5`;
2. replace event-only strain mutation with recovery-plus-accrual over sorted union(existing strain IDs, exposure IDs);
3. evaluate Tier-1 over that same sorted union every turn;
4. retain existing faction attribution, gates, persistence, queue lifecycle, reports, and Phase 3D handoff.

Run focused GREEN, then the adjacent collapse/save/pipeline pack and typecheck.

### Task 3: Prove boundaries

Run default-OFF `canon:check`, deterministic static checks, Section 6 unit/lifecycle tests, diff hygiene, and no-canon-diff. Audit ordering, RNG, clocks, state/schema, selector topology, Phase 3D, control writers, and RBiH/RS Tier-0 as unchanged.

### Task 4: Paired measurement and disposition

Run two fresh `ENABLE_COLLAPSE=true` 188-week scenarios. Compare all artifacts, final hash, fingerprint, peak-versus-terminal strain, Sipovo/Drvar peaks, true Tier-1 domains, live damage/capacity writes, faction/geography/timing, anchors, benchmarks, engine health, rupture, and Section 6 full scan.

Retain or revert strictly by the design criteria.

### Task 5: Synchronize and continue

Update the build spec, roadmap, command board, heartbeat, ledger, and knowledge base. Verify and commit only the bounded packet while preserving `.claude/scheduled_tasks.lock`. If retained and live Section 6 evidence is sufficient, close RC or advance to the remaining explicitly authorized RC item; do not stop for a routine decision.
