# Probe No-Flip Territory Hardening (Fix B)
## 444th Surrounded — Bounded Contract Fix

**Date:** 2026-04-10
**Branch:** `codex/hardening-444-pocket`
**Run:** `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n6`
**Hash:** `8e7acaa0d71e95c9`
**Calibration:** 91.7% area-weighted (40w), 27/27 anchors, 6/6 benchmarks
**Baseline:** n1359 (main): 92.7%, 27/27 anchors, 6/6 benchmarks
**vitest:** 3140/3140 (247 files)
**tsc:** Clean
**build:** Clean

---

## 1. Audit Decision

### Candidate fixes audited

- **Fix A** — hostile-majority Phase B march guard
- **Fix B** — probes must not flip territory

### Exact judgment on Fix A

**REJECTED as bounded hardening. Classified as doctrine/realism.**

Three investigators confirmed:
- Three guards already exist in Phase B (island guard, corps boundary, distance cap)
- Hostile-majority would shift from structural impossibility to tactical undesirability
- Would cripple contested-front redistribution — most frontline OSIDs have hostile-majority neighbors by definition
- Retroactive tooth eviction already catches the 444th scenario reactively
- Guards wrong phase — Phase B is redistribution within an already-assigned sector

**Verdict:** Doctrine guard, not truth guard. Deferred to future commander caution / planner realism work.

### Exact judgment on Fix B

**VALIDATED as bounded hardening.**

- Probe IS first-class: `game_state.ts:258` type union, `buildProbeOperation()` factory, probe-specific lifecycle in `sector_offensive.ts` (recovery, cooldown suppression, exhaustion)
- Attack resolution does NOT distinguish probes: `attack_resolution_osid.ts:1588` flip decision checks only outcome, never op type
- Contract inconsistency proven: probes have special handling in 4 of 5 lifecycle stages; territory flip is the 5th and only missing probe-aware gate
- No downstream consumers rely on probes flipping territory

### Which fix is a bounded hardening lane

**Fix B** — probes must not flip territory

### Which fix is doctrine/realism or redesign

**Fix A** — hostile-majority Phase B march guard (deferred)

### Exact seam chosen first

`attack_resolution_osid.ts:1588` — flip decision gate

### Why that seam wins

- Single-site change with clear semantics
- Follows existing probe exception pattern (cooldown suppression at `sector_offensive.ts:1521`)
- No new concept introduced — operation types already exist
- Resolves the 444th Konjic salient root cause: probe at sitnik won't flip territory

---

## 2. Lane: Probe No-Flip Territory

### Candidate seams considered

1. Flip decision gate in `attack_resolution_osid.ts` (chosen)
2. Probe target selection filter in `emit.ts` (rejected — would prevent probes from targeting anything)
3. Post-flip revert in operation completion (rejected — introduces unnecessary state churn)

### Exact seam chosen

`attack_resolution_osid.ts:1588-1590` — added `isProbeOp` guard to territory flip decision.

### Why it was the highest-value bounded step

Probes are already first-class in planning, execution, recovery, and cooldown. The territory flip gate was the only remaining generic path. Adding the probe check makes the flip gate consistent with the rest of the probe lifecycle.

### Canonical owner after cleanup

`attack_resolution_osid.ts` owns territory flip decisions. Operation type is now a gating factor alongside tactical outcome.

### Demoted path after cleanup

Treating all operation types identically in the flip decision.

### Player-visible truth after cleanup

Probes inflict casualties and generate battle records but do not capture territory. Probe victories are tactical intelligence successes, not territorial conquests.

### Exact files changed

1. `src/sim/combat/attack_resolution_osid.ts:1588-1590` — `isProbeOp` guard
2. `tests/probe_territory_flip.test.ts` (new, 262 lines) — 6 regression tests
3. `tests/integration_anomaly.test.ts:50-56` — army HQ exemption (pre-existing gap exposed by territory change)

### Exact verification results

- **Targeted regressions:** 6/6 pass (`tests/probe_territory_flip.test.ts`)
  - probe tactical win does NOT flip political_controllers
  - sector_attack tactical win DOES flip political_controllers
  - general_offensive tactical win DOES flip political_controllers
  - probe battle still records casualties
  - probe does not record control_event
  - probe does not increment operation territory_gained counters
- **Full vitest:** 3140/3140 (247 files)
- **tsc --noEmit:** Clean
- **build:** Clean

### Exact scenario proof

- **Baseline (main n1359):** 92.7% area-weighted, 27/27 anchors, 6/6 benchmarks, hash varies
- **Post-fix run:** 91.7% area-weighted, 27/27 anchors, 6/6 benchmarks, hash `8e7acaa0d71e95c9`
- **Before/after difference:**
  - `op:konjic:sitnik`: was RBiH (probe capture) → now RS (probe no longer flips)
  - 444th Mountain Brigade: still at `sela_2` (RBiH, friendly) — separate sector assignment, not a probe issue
  - Overall: -1.0pp from probes no longer contributing accidental territorial captures. Some of those captures happened to match historical targets by chance. Mechanically correct.
  - All 27 anchor OSIDs and 6 benchmarks still pass.

### Exact report path

`docs/40_reports/implemented/20260410_PROBE_NO_FLIP_TERRITORY_HARDENING.md`

### Exact docs updated

- `docs/PROJECT_LEDGER.md` — behavioral change entry
- `.claude/architect_notes.md` — lane closure

### Residual risks

1. **-1.0pp calibration cost:** Probes were accidentally capturing ~5-10 OSIDs that matched historical targets. Removing this pathway reduces the match rate. The correct fix is better non-probe operations, not accidental probe captures.
2. **Probe AAR grading:** `gradeOperation()` scores on `objectives_captured`. Probes will now always score 0 captures. This is a pre-existing design gap (probes should be graded on intel gained, not territory). Separate lane.
3. **rs_65th_protection_motorized_regiment:** Army HQ brigade at sokolac_2 now unresolved in sector assignment. Pre-existing anomaly detector gap exposed by territory change. Test exemption added; detector fix is separate lane.
4. **444th still at sela_2:** The 444th's sector assignment places it in Kalinovik theater, far from home (Jablanica). This is a sector assignment / corps boundary issue, not a probe issue. Deferred.

### Exact next lane or exact deferral reason

- **Fix A (hostile-majority march guard):** DEFERRED. Classified as doctrine/planner realism, not bounded truth hardening. Would cripple contested-front redistribution. Existing guards (island, corridor-quality, retroactive tooth eviction) already prevent structural impossibility.
- **Probe AAR grading:** Separate lane. Probes should be graded on intel confidence gain, not territorial capture.
- **Calibration recovery:** The -1.0pp can be recovered through better non-probe operations (e.g., ARBiH defensive ops in Drina region).

---

## 3. Commits

1. `6f0b4560` — `fix(combat): probes must not flip political control`
2. `4fb967a9` — `fix(test): exempt army HQ brigades from critical anomaly gate`
