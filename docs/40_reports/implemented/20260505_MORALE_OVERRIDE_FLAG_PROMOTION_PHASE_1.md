# MORALE_OVERRIDE_ENABLED Flag Promotion Phase 1 — VERDICT-REPORT-ONLY

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-MORALE-OVERRIDE-FLAG-PROMOTION-PHASE-1-IMPLEMENTATION
**Outcome:** **VERDICT-REPORT-ONLY** per Phase 0 panel binding stop-trigger #2 (188w per-faction dissolution count > 23/188w proportional) + criterion 3 ("no faction absorbs >60% of incremental dissolutions"). Implementation reverted; verdict report retained as audit evidence.
**Predecessor:** `docs/40_reports/audits/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_0_PANEL.md` (Phase 0 panel CONDITIONS verdict, commit `9b9650e4`).
**User authorization:** Received as canon authority for §6-adjacent production behavior change. **Panel stop-triggers remain binding regardless of user authorization** per durable lesson "Phase 0 panel + binding stop-trigger pattern saves calibration mistakes from shipping."

---

## Status: VERDICT-REPORT-ONLY (stop triggers fired)

The Phase 0 panel approved Option F.2 (default-ON via env flag with override-disable; one-line predicate sense flip) with 11 binding criteria + 5 stop triggers. User co-signed §6 sign-off chain as canon authority. Implementation shipped structurally correct (one-line flip, 7/7 lane tests, tsc clean, 40w n1676 anchors 26/27 PASS). The 188w A/B dual smoke verified the mechanism IS firing (different hashes between default-ON and override-disable runs), AND identified the trigger conditions for stop-and-revert per panel discipline.

## Implementation surface (verified, then reverted)

- **`src/sim/combat/brigade_dissolution.ts`**: one-line predicate sense flip from `process.env.MORALE_OVERRIDE_ENABLED === 'true'` to `process.env.MORALE_OVERRIDE_ENABLED !== 'false'`. Default-ON behavior with `MORALE_OVERRIDE_ENABLED=false` as override-disable escape hatch.
- **`tests/morale_override_flag_promotion_phase_1.test.ts`** (NEW): 7 lane tests covering default-ON behavior, override-disable, determinism, A/B repeatability, save round-trip preservation of `morale_low_streak`.
- **`tests/morale_collapse_override.test.ts`** (extended): test updates for default-ON behavior assertion.

**Verification at peak (before revert):**
- `npx tsc --noEmit` clean
- 7/7 + 10/10 lane tests GREEN
- Focused regression on morale + dissolution + formation surfaces: GREEN
- 40w smoke n1676 anchors 26/27 PASS (only `op:brcko:brka_2` fails — pre-existing P0)

## 188w A/B dual smoke verdicts

**Default-ON run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1677` — final_state_hash `bcd6270ad88e0b0e`
**Override-disable run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1678` — final_state_hash `bd043ba67dd5257a` (matches HRHB retune `f9c40043` baseline; confirms gated-off behavior reproduces pre-MORALE_OVERRIDE state)

**Streaming finalizer:** Wave 7 Lane B's `streamFinalizeReplaySaveSequenceFromJsonl` worked at scale on BOTH runs (full artifact emission). Lane B finalizer is now FIVE-times-validated at 188w scale (n1665, n1667, n1671, n1673, n1677, n1678).

## Per-faction dissolution counts (binding criterion 2 + 3)

| Run | HRHB | RBiH | RS | Total |
|---|---|---|---|---|
| **n1677 default-ON** | 10 | 1 | **67** | 78 |
| **n1678 override-disable** | 6 | 1 | **31** | 38 |
| **Δ (incremental from MORALE_OVERRIDE)** | +4 | 0 | **+36** | +40 |

Panel criterion 3 binding subconditions:
- "per-faction count ≤23/188w proportional": RS = 67 default-ON, 31 override-off — **FAIL** (both exceed)
- "no faction absorbs >60% of incremental dissolutions": RS = 36/40 = **90% absorption** — **FAIL strict**

Stop trigger #2 ("188w per-faction dissolution count > 5/40w (≈ > 23/188w proportional)") TRIGGERED on RS in both runs.

## Per-faction trajectory comparison (officer_quality Δ/turn)

### t52 → t78 segment

| Faction | n1677 default-ON | n1678 override-off | Δ |
|---|---|---|---|
| HRHB | +0.000338 | +0.000264 | +0.000074 |
| RBiH | +0.004405 | +0.003988 | +0.000417 |
| RS | -0.000296 | -0.000537 | +0.000241 |

### t78 → t104 segment

| Faction | n1677 default-ON | n1678 override-off | Δ |
|---|---|---|---|
| HRHB | -0.000940 | -0.000737 | -0.000203 |
| RBiH | +0.004242 | +0.004396 | -0.000154 |
| RS | -0.002282 | -0.001877 | -0.000405 |

### t104 → t188 segment

| Faction | n1677 default-ON | n1678 override-off | Δ |
|---|---|---|---|
| HRHB | -0.000958 | -0.001099 | +0.000141 |
| RBiH | +0.002842 | +0.003050 | -0.000208 |
| RS | **-0.002015** | **-0.001049** | **-0.000966** |

**A/B mechanism verification:** at t104→t188, RS officer_quality Δ/turn nearly DOUBLES in magnitude when MORALE_OVERRIDE is active (-0.001049 → -0.002015). This is the lever's intended effect on per-formation officer quality decay AT THE COST OF the dissolution-count criterion failure. The mechanism IS bending the late-war arc steeper for RS; the dissolution-count balance is what triggers the stop.

## Per-criterion verdict (11 binding criteria)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code shape — env-flag gate change only; ≤15 LOC diff | **PASS** |
| 2 | 40w smoke gate — anchors 26/27, benchmarks 6/6, dissolution ≤3-5/40w | **PARTIAL** — anchors PASS, dissolution count needs proportional check on full 188w (FAIL there) |
| 3 | 188w sensitive-history regression gate | **PARTIAL FAIL** — RS dissolution count > 23/188w threshold; RS absorbs 90% of incremental dissolutions (>60% threshold) |
| 4 | ≥5 lane tests + focused regression GREEN | **PASS** |
| 5 | `tsc --noEmit` clean | **PASS** |
| 6 | Sensitive-history compliance (Ring 1, §6 sign-off) | **PASS** (Ring 1; §6 sign-off received from user) |
| 7 | All 5 stop triggers respected | **TRIGGERED #2** — STOP, verdict-only, do NOT retune in-lane |
| 8 | Out-of-scope guards | **PASS** |
| 9 | Phase 1 lane report with A/B evidence packet | **DELIVERED** (this file with full A/B numerics) |
| 10 | Save schema doc update | **NOT COMPLETED** (deferred per stop-trigger; would only be required for SHIP) |
| 11 | Production reachability runtime trace | **PASS** — A/B hash delta (`bcd6270ad88e0b0e` vs `bd043ba67dd5257a`) confirms predicate flip activates dissolution path at runtime; n1677 dissolved 78 brigades vs n1678's 38 (40 incremental) — mechanism reachable and active |

**Final verdict: VERDICT-REPORT-ONLY**. Implementation reverted; mechanism IS validated (criterion 11 PASS) but criterion 3 dissolution-count balance failed.

## Sensitive-history compliance

- **Ring 1.** No Ring 2 or Ring 3 surface touched. Mechanism is faction-symmetric (`(morale, morale_low_streak)` predicate).
- **§6 sign-off chain:** received from user as canon authority. Despite user authorization, panel-defined stop triggers remain binding (durable lesson: panel discipline saves calibration mistakes from shipping regardless of user pre-authorization).
- **Faction-agnostic mechanism with asymmetric outcome.** Same code path for all factions; the asymmetric outcome (RS absorbing 90% of incremental dissolutions) is data-driven from current scenario state, not coded in.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.**
- **No combat-math number tuned outside the panel-recommended one-line flip.**
- **Determinism preserved.** Mechanism deterministic; A/B hashes are stable.

## Successor handoffs

1. **MORALE_OVERRIDE Phase 1 retune (HIGH PRIORITY):** the 90% RS absorption rate suggests current MORALE_OVERRIDE_TURNS=8 (≈32 days) is too aggressive for VRS, OR per-faction asymmetric thresholds are needed. Mini-panel + retune lane: evaluate whether MORALE_OVERRIDE_TURNS should be faction-asymmetric (e.g., RS=12, HRHB=8, RBiH=8) per BB1/BB2 record of unit-collapse cadence by faction. Same 5 stop triggers + criterion 3 carried.
2. **Reconcile stop-trigger threshold:** criterion 3's "≤23/188w proportional" was set assuming baseline would be lower; override-off baseline RS=31 already exceeds. Either (a) trigger threshold needs refinement for current calibration state, OR (b) baseline RS dissolution rate is itself a calibration concern. Out-of-scope for this lane; flagged.
3. **Lane B streaming finalizer five-times-validated** at 188w scale (n1665, n1667, n1671, n1673, n1677, n1678) — durable infrastructure now thoroughly proven.

## Files changed (this lane, post-revert)

- `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md` (NEW; this file; verdict-only ship)

The implementation source (`brigade_dissolution.ts`) and lane test (`tests/morale_override_flag_promotion_phase_1.test.ts`) were reverted per panel criterion 7 stop-trigger discipline. Existing test file (`tests/morale_collapse_override.test.ts`) reverted to baseline.
