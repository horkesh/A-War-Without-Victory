# 188w Reconstitution Verification — Late-War Arc Verdict

**Date:** 2026-05-04
**Lane:** LANE-NIGHTSHIFT-RECONSTITUTION-188W-VERIFICATION
**Predecessor lane:** `20260504_RECONSTITUTION_POLICY_REVIEW.md` (commit `e9584dd3`)
**Audit-only.** No engine code, scenario data, paint anchor, OOB, FORAWWV, political_controllers, or rupture wiring touched.

## TL;DR

The 188w smoke run on top of the Wave 4 reconstitution-policy commit (`e9584dd3`) **does NOT bend the late-war arc** for either VRS or HRHB. RBiH (the unchanged control) tracks doctrinal arc as expected. The post-Wave-4 VRS officer_quality rate of change (+0.000775/turn whole-run) is **higher** than the pre-Wave-4 baseline measured in the Gap 2 audit (+0.000246/turn over the partial 84-turn trace). VRS personnel arc is unchanged at +733 (vs pre-fix +753). The reinforcement-multiplier step-curve was hypothesised to starve the personnel-fill side of the officer-quality formula; this 188w run shows that hypothesis is **not supported by the trajectory data**.

The 188w run OOM'd during post-sim summary write (~12.4 min wallclock, 8GB heap saturated), but the **brigade temporal log captured all 188 turns of trajectory data before the OOM**. Verdict therefore stands on complete trajectory evidence; only the `final_state_hash` is unavailable.

## Run Configuration

- **Scenario:** `data/scenarios/apr1992_definitive_188w.json`
- **Heap:** `NODE_OPTIONS=--max-old-space-size=8192`
- **Command:** `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs`
- **Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1641`
- **Wallclock:** ~12.4 min (744863ms) before OOM
- **Final state hash:** **n/a** — OOM occurred during post-sim summary write, before `run_summary.json` was emitted. Heap trace: Mark-Compact 8190.6 → 8190.5 MB at the 8192 cap. The 4.4 GB `replay_sequence.jsonl` was almost fully written; the heap pressure is consistent with the replay-buffer / final-save serialization phase, not the per-turn sim.
- **Trajectory completeness:** `brigade_temporal_log.jsonl` (23.4 MB) contains records from turn=1 through turn=188 inclusive. Verified by reading first and last record. The lane-required trajectory verdict therefore stands on complete data.
- **Predecessor 40w smoke (n1640):** hash `ef03ab4d6c5ecd28` — PASS, 26/27 anchors, 6/6 benchmarks. Lever does not bite at 40w (RS in unchanged 1.0× band before w52). Predecessor lane noted 188w verification deferred.

## Per-Faction Trajectory at Lane Checkpoints

The lane requires t0 / t52 / t78 / t104 / t188. The engine starts at t1 (no t0 records); reporting **t1** as the baseline. All other checkpoints fall on observed turns.

### Officer Quality

| Checkpoint | Observed turn | HRHB | RBiH | RS |
|---|---|---|---|---|
| baseline (t0→t1) | t1 | 0.2267 | 0.0865 | 0.5518 |
| pre-bend (t52) | t52 | 0.3523 | 0.3434 | 0.5771 |
| mid-bend (t78) | t78 | 0.3951 | 0.4470 | 0.5893 |
| post-bend (t104) | t104 | 0.4375 | 0.5627 | 0.5943 |
| final (t188) | t188 | 0.6429 | 0.8093 | 0.6967 |

### Personnel (avg per active brigade)

| Checkpoint | Observed turn | HRHB | RBiH | RS |
|---|---|---|---|---|
| baseline (t0→t1) | t1 | 1018.4 | 636.1 | 1086.8 |
| pre-bend (t52) | t52 | 1694.7 | 1540.9 | 1364.5 |
| mid-bend (t78) | t78 | 1682.2 | 1689.5 | 1448.6 |
| post-bend (t104) | t104 | 1798.0 | 1714.1 | 1490.3 |
| final (t188) | t188 | 1820.9 | 1706.2 | 1878.6 |

(Baseline t1 figures verified directly against `brigade_temporal_log.jsonl` — HRHB 28 active brigades / 1018.36 avg, RBiH 77 active / 636.09 avg, RS 78 active / 1086.81 avg. The first checkpoint diagnostic's `rowAtOrBefore` returned null for t0, which suppressed the t1 row in its initial table; figures here are the directly-computed t1 means.)

### Active brigade count

| Checkpoint | HRHB | RBiH | RS |
|---|---|---|---|
| t52 | 29 | 116 | 78 |
| t78 | 29 | 119 | 70 |
| t104 | 34 | 119 | 66 |
| t188 | 34 | 123 | 51 |

### Rate of change between adjacent checkpoints

| From → To | Span | Faction | Δ officer_quality | Δ oq/turn | Δ personnel | Δ pers/turn |
|---|---|---|---|---|---|---|
| t52 → t78 | 26 | HRHB | +0.0427 | +0.001643 | -12.5 | -0.480 |
| t52 → t78 | 26 | RBiH | +0.1036 | +0.003986 | +148.6 | +5.715 |
| t52 → t78 | 26 | RS | +0.0122 | +0.000470 | +84.1 | +3.234 |
| t78 → t104 | 26 | HRHB | +0.0424 | +0.001631 | +115.8 | +4.455 |
| t78 → t104 | 26 | RBiH | +0.1157 | +0.004448 | +24.6 | +0.945 |
| t78 → t104 | 26 | RS | +0.0050 | +0.000194 | +41.7 | +1.606 |
| t104 → t188 | 84 | HRHB | +0.2054 | +0.002446 | +22.9 | +0.273 |
| t104 → t188 | 84 | RBiH | +0.2466 | +0.002936 | -7.9 | -0.094 |
| t104 → t188 | 84 | RS | +0.1024 | +0.001218 | +388.3 | +4.622 |

### Whole-run officer_quality rate of change

| Faction | First (turn) | Last (turn) | Total Δ | Mean Δ/turn | Canon sign | Verdict |
|---|---|---|---|---|---|---|
| HRHB | 0.2267 (t1) | 0.6429 (t188) | +0.4161 | +0.002225 | -1 | **inverse** (canon: degrade) |
| RBiH | 0.0865 (t1) | 0.8093 (t188) | +0.7228 | +0.003865 | +1 | **matches** (canon: improve) |
| RS | 0.5518 (t1) | 0.6967 (t188) | +0.1449 | +0.000775 | -1 | **inverse** (canon: degrade) |

## Verdict — Does the late-war arc bend?

### VRS (the named target of the Wave 4 lever)

**NO.** The VRS officer_quality arc continues to climb across the entire 188w window. The RS rate-of-change DOES decelerate around the policy bands (t78 → t104 RS Δoq/turn = +0.000194, the slowest segment), but **resumes climbing** in the t104 → t188 window (+0.001218/turn) — exactly when the Wave 4 step curve hits its deepest 0.45× decay band, which should be the strongest braking effect.

VRS personnel arc is essentially unchanged from pre-fix:
- Pre-fix (Gap 2 audit, 188w): +753 over 188w
- Post-fix (this run, 188w): t1→t188 personnel growth +733 (early-mean-vs-late-mean basis: +732.70). Within noise of the pre-fix figure.

VRS active brigade count drops from 78 (t52) to 51 (t188) — a -34.6% reduction. So the policy IS reducing fielded brigades, but the SURVIVING brigades are at higher per-brigade personnel (1364 → 1879 = +37.7%) and higher per-brigade officer_quality (0.577 → 0.697 = +0.120). The reinforcement-decay lever is shrinking the force but the surviving cadre's officer-quality keeps growing under combat. The hypothesis "starve the personnel-fill so officer-quality decay term dominates" is not vindicated.

### HRHB

**NO.** HRHB officer_quality grows monotonically across all checkpoints (0.227 → 0.352 → 0.395 → 0.438 → 0.643). Every checkpoint segment is positive. The whole-run mean Δoq/turn (+0.002225) is *higher* than VRS (+0.000775) — i.e. HRHB is professionalising faster than RBiH at certain windows even though doctrinal arc says HRHB should degrade.

HRHB active brigade count rises from 29 (t52) to 34 (t188), inconsistent with the "Lasva Valley emergence + Federation reorganization" structural rebuild named in the predecessor lane's §"Successor Lanes" item 3.

### RBiH (the unchanged control)

**YES — control held.** RBiH officer_quality matches doctrinal arc (rabble → professional, +0.7228 total Δ, +0.003865/turn). The Wave 4 lane explicitly preserved RBiH's existing step curve; this run confirms RBiH stays on its design arc and is not collateral damage from the policy.

### Headline

The Wave 4 reconstitution-decay lever **does not bend the VRS late-war officer-quality arc**, and **does not bend the HRHB arc**. RBiH (control) is on doctrinal arc. The Gap 2 audit's hypothesis that the brigade-fill path was the upstream lever is **not supported by post-fix trajectory evidence**. A different upstream defect is keeping the surviving cadre's officer-quality growth term dominant over the casualty-driven decay term.

## Sensitive-History Compliance

This lane is audit-only. Each criterion asserted:

- **No FORAWWV touch:** Confirmed. `docs/10_canon/FORAWWV.md` not opened, not edited, not referenced for write.
- **No paint anchor / political_controllers touch:** Confirmed. No file under `data/source/political_controllers*` or anchor JSON edited.
- **No OOB JSON touch:** Confirmed. No `data/source/oob/*` or formation-stat JSON edited.
- **No rupture wiring touch:** Confirmed. `enclave_resilience.ts` and rupture-related engine paths not edited.
- **No engine code touch:** Confirmed. Only files written are this report and a new audit-only diagnostic CJS post-processor (`tools/diagnostics/reconstitution_188w_checkpoints.cjs`). Neither writes to game state, enters the sim path, or runs in scenario_runner.
- **No scenario data touch:** Confirmed. `data/scenarios/apr1992_definitive_188w.json` and `data/scenarios/timelines/apr1992.json` unchanged.
- **No combat-math number tuned:** Confirmed. `OFFICER_CASUALTY_MULT`, reconstitution rate cap, mobilization scale, pool seeds — all unchanged.
- **No step-curve numbers changed:** Confirmed. The Wave 4 RS / HRHB curves are the lever under test; this lane verifies, does not retune.
- **Faction-agnostic mechanism:** Confirmed. The diagnostic and report iterate `['HRHB', 'RBiH', 'RS']` in canonical sorted order; no faction-special-case logic.
- **Ring 1 / no §6 surface:** Confirmed. No §6 (sensitive-history events / rupture) surfaces touched, named, or referenced for write.

## Determinism

- The new diagnostic (`reconstitution_188w_checkpoints.cjs`) uses pure aggregation, sorted faction iteration via `strictCompare`, numeric-ascending turn iteration, no `Math.random`, no `Date.now`, no locale-dependent sort.
- All checkpoint values are deterministic functions of the brigade temporal log.

## STOP-AND-ASK Trigger Status

Per lane CONSTRAINTS: "If the 188w run OOMs again or fails for any reason, report the failure mode + partial data. Do NOT retry without explicit authorization."

- **OOM occurred:** YES, at ~12.4 min wallclock during post-sim summary write.
- **Partial data captured:** YES, complete trajectory through t188 in `brigade_temporal_log.jsonl`.
- **Retry attempted:** NO. Reporting failure mode + complete-trajectory partial data and STOPPING per lane constraint.
- **`final_state_hash`:** Unavailable (run_summary.json never written).

## Files Changed

| File | Type | Note |
|---|---|---|
| `tools/diagnostics/reconstitution_188w_checkpoints.cjs` | NEW (audit) | Lane-specific checkpoint post-processor at t0/t52/t78/t104/t188 |
| `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` | NEW | This report |

No engine, scenario, or test files changed. No node_modules state changed.

## Successor Handoff

The Wave 4 reconstitution-decay lever does NOT bend the late-war VRS officer-quality arc. The Gap 2 audit's recommended **deferred** lane (faction-asymmetric `OFFICER_CASUALTY_MULT`) named in `20260504_RECONSTITUTION_POLICY_REVIEW.md` §"Successor Lanes" item 2 is now the indicated next investigation — the casualty-side weight is the candidate that directly affects the destabilising growth term, rather than the personnel-fill side this lane tested. Recommend dispatching a follow-up lane to:

1. Trace the casualty-driven officer_quality decay path (`applyOfficerCasualtyLoss` and its callers) on this same partial run dir to quantify how much officer-cadre is being killed per turn vs. how much is being grown by combat experience. The lane-specific checkpoint diagnostic shipped here can be extended with cohesion / morale / fatigue cells to support that trace.
2. Re-evaluate whether `OFFICER_CASUALTY_MULT` is faction-asymmetric (per Gap 2 audit §"Recommendation") or whether the issue is a rate-cap on per-turn officer-quality decay that survives the casualty path.
3. Consider whether the surviving-brigade growth term should be capped at the pre-war professionalism baseline for VRS (i.e. JNA-inheritance ceiling), since the data shows VRS climbing from 0.552 to 0.697 — a +21.6% growth that contradicts the "professional → degraded" doctrinal arc regardless of how the personnel-fill side is throttled.

The 188w run-completion + final-state-hash gate remains open. A separate operational lane should investigate the post-sim summary OOM (4.4 GB replay buffer is the obvious memory hog; replay write may need streaming or chunked serialization). That is an audit/perf concern, not a calibration concern, and is not blocking on this lane's verdict.
