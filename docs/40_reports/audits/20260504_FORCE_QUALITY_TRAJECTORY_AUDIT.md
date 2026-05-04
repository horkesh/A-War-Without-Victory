# Force Quality Trajectory Audit — 188w n1623

**Date:** 2026-05-04
**Lane:** LANE-NIGHTSHIFT-FORCE-QUALITY-DIAGNOSTIC
**Plan:** `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
**Architecture contract:** `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md`
**Status:** Audit-only. No fix proposals. No code changes outside the diagnostic tool.

## Run

- **run_dir:** `apr1992_definitive_188w__210e69404d054959__w188_n1623`
- **final_state_hash:** `8ff9d8a08b0b1072`
- **weeks:** 188
- **baseline_status:** `BASELINE_PRESENT_DOCTRINAL_ONLY` — `data/reference/historical_baseline.json` exists but only carries killed/territory/displacement totals, not per-faction force-quality time-series. The diagnostic therefore classifies trajectories against the doctrinal sign arc named in `docs/40_reports/CALIBRATION_MASTER.md` (VRS Professional → Degraded; ARBiH Rabble → Professional; HVO Capable Militia → Overstretched), not against per-turn historical numerics.

## Method

`tools/diagnostics/force_quality_trajectory.cjs` reads `<run_dir>/brigade_temporal_log.jsonl` (per-turn brigade snapshot — A1 observability emit, commit `fb847504`). Per faction per turn it averages `morale`, `cohesion`, `fatigue`, and `personnel` across active brigades. The first 10% and last 10% of the run window are sampled as `early_mean` / `late_mean`. Each (faction, metric) pair is classified by direction:

- `matches` — observed delta direction agrees with the doctrinal sign and magnitude is meaningful (`|delta| >= 4× noise floor`).
- `trending_correctly` — direction agrees but magnitude is weak.
- `drifting_away` — canonical sign is non-zero but the observed delta is flat.
- `inverse` — observed delta is opposite the doctrinal arc.

Determinism: faction iteration `['HRHB','RBiH','RS']` (sorted), turn iteration numeric ascending, no `Math.random` / `Date.now` / locale sort. Read-only with respect to the run directory.

## Top 10 Divergences (n1623)

| Rank | Faction | Metric | Early mean | Late mean | Delta | Canonical sign | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | RS | personnel | 1091.97 | 1844.72 | +752.75 | -1 | inverse |
| 2 | HRHB | personnel | 1269.99 | 1841.71 | +571.72 | -1 | inverse |
| 3 | HRHB | morale | 66.34 | 73.85 | +7.50 | -1 | inverse |
| 4 | RS | fatigue | 0.63 | 0.01 | -0.61 | +1 | inverse |
| 5 | RBiH | fatigue | 0.19 | 0.08 | -0.12 | +1 | drifting_away |
| 6 | HRHB | fatigue | 0.05 | 0.00 | -0.05 | +1 | drifting_away |
| 7 | RBiH | personnel | 701.84 | 1703.65 | +1001.81 | +1 | matches |
| 8 | RS | morale | 64.81 | 20.31 | -44.50 | -1 | matches |
| 9 | RS | cohesion | 55.74 | 25.93 | -29.81 | -1 | matches |
| 10 | RBiH | cohesion | 48.34 | 70.33 | +21.99 | +1 | matches |

## Reading the Top 10

The four `inverse` rows are this run's loudest signal that the doctrinal arc is **not** decisive at full-war scale:

- **RS personnel +752 from 1092 to 1845.** VRS brigades end the war larger than they started. Doctrinal expectation is the opposite — exhaustion, manpower drain, and officer loss should push average personnel down by Oct 1995. This pairs with R2-1 `must_hold` work and reconstitution policy review (still on backlog) as adjacent levers, but the divergence here is independent of either.
- **HRHB personnel +572.** Same pattern, slightly less aggressive. HRHB's "Capable Militia → Overstretched" arc would predict a personnel drop, especially after the Washington Agreement reroutes manpower to the Federation. The observed average is rising.
- **HRHB morale +7.50.** Late-war HRHB is happier than early-war HRHB by the diagnostic's reading. Overstretch should bend morale the other way.
- **RS fatigue collapsing from 0.63 to 0.01.** This is the most counter-doctrinal signal: VRS fatigue is being **reset** to near-zero in the late war rather than accumulating into the canonical brittle exhaustion state.

The three `drifting_away` rows say RBiH and HRHB fatigue go down rather than up across the war — same fatigue-reset signature as RS, just from a lower base.

The five `matches` rows confirm the parts of the arc that the engine **is** delivering: ARBiH cohesion + morale + personnel rise; VRS cohesion + morale fall. The arc is partially working — but with the fatigue and personnel signals inverted, the late-war end-state does not reach the canonical "VRS brittle, ARBiH professional" target.

## Hypotheses Surfaced (NOT FIXES)

The five `inverse` + `drifting_away` rows cluster on two systems already named in the binding plan's "Working Hypotheses":

1. **Personnel rebound (rows 1, 2)** ⇒ reconstitution / mobilization / fresh-pool seeding is overrunning attrition for VRS and HRHB. This is the same lever flagged in the `B-5 reconstitution policy review` Mission B handoff (`RECONSTITUTION_MAX_PER_CORPS=1` cap + same-corps territory gate). The diagnostic now provides quantitative evidence the policy needs review, but does not propose the fix.
2. **Fatigue reset (rows 4, 5, 6)** ⇒ either fatigue is decaying faster than it accumulates, or the active-set filter is excluding the most fatigued brigades from the average (selection bias on the temporal log). Both possibilities map to plan working-hypothesis #2 ("War exhaustion may suppress tempo without creating asymmetric late-war capability").
3. **HRHB morale rise (row 3)** ⇒ may be Federation-formation reorganization producing fresh, unfatigued brigades after Washington Agreement, or it may be a real mechanic gap in HRHB stress accumulation. Diagnostic cannot distinguish.

Per binding plan §"Recommended Next Packet": **stop at plan if multiple owners are implicated.** Three owners surface here (reconstitution / fatigue / Federation formation). Do not apply a global multiplier without dispatching `/operations-expert + /formation-expert + /game-designer` to the personnel and fatigue signals separately.

## Acceptance Gate (from binding plan)

The binding plan's "Acceptance Shape" requires:

- 1992: VRS most professional; ARBiH mostly survives. **Engine cohesion early-window agrees** (RS=55.7 > HRHB=54.1 > RBiH=48.3).
- 1995: ARBiH credible multi-brigade pressure; VRS brittle. **Engine partly agrees** — RBiH cohesion 70.3 late-window > RS 25.9, but VRS personnel 1845 (rising) does not match "brittle, exhausted."

Net: doctrinal arc is **partially delivered**. Cohesion + morale arc-direction matches doctrine. Personnel arc and fatigue arc invert the doctrine.

## Per-Faction Snapshot at t40 / t100 / t180

Computed by re-driving `aggregateByTurn` over the same temporal log and applying `classifyDirection` against `t1` as the early reference. Each cell shows `divergence_class` for that (faction, metric, turn) versus the doctrinal sign.

| Faction | Turn | cohesion | morale | fatigue | personnel |
|---|---|---|---|---|---|
| HRHB | 40 | matches | inverse | drifting_away | inverse |
| HRHB | 100 | matches | inverse | drifting_away | inverse |
| HRHB | 180 | matches | inverse | drifting_away | inverse |
| RBiH | 40 | matches | matches | drifting_away | matches |
| RBiH | 100 | matches | matches | drifting_away | matches |
| RBiH | 180 | matches | drifting_away | drifting_away | matches |
| RS | 40 | matches | matches | drifting_away | inverse |
| RS | 100 | matches | inverse | drifting_away | inverse |
| RS | 180 | matches | matches | drifting_away | inverse |

The cohesion column is `matches` for all three factions across all three checkpoints — that part of the doctrinal arc is delivered consistently throughout the war, not just end-of-run. The personnel column inverts for both VRS and HRHB at every checkpoint (manpower averages rise instead of fall) and matches for RBiH. The fatigue column is `drifting_away` for every faction at every checkpoint — fatigue trends below early-war values rather than accumulating, which is the same signal flagged in the Top 10. HRHB morale is `inverse` at every checkpoint; RS morale flips back to `matches` only at t40 and t180 (the late-war collapse to 11.16 finally pulls the delta below the early-war baseline).

## Mechanism Gaps Identified

Naming gaps only — no fix attribution. References point to the architecture-contract column that would own the future repair.

1. **No officer brain-drain → average-quality coupling visible in artifacts.** `formation.officer_quality` exists per brigade in `final_save.json` but is not emitted to `brigade_temporal_log.jsonl`, so the diagnostic cannot prove an officer-quality arc per turn at all. Architecture contract row `formation.officer_quality` lists the consumer as "operation planning, staging, recovery"; the missing link is observability, not the field itself.
2. **Personnel reconstitution outruns attrition for VRS / HRHB.** Average brigade personnel rises by +753 (RS) and +572 (HRHB) over the war. The architecture contract's `equipment + maintenance + supply` row points at `support thresholds` as the intended consumer; the diagnostic surfaces that manpower is the upstream signal currently masking degradation.
3. **Fatigue does not stratify by veterancy or accumulate across the war.** All three factions end with fatigue at-or-below early-war values. Architecture contract row `cohesion floor/ceiling` names "organizational staying power" as the role; fatigue currently behaves as a per-turn transient, not a long-run brittleness driver.
4. **Morale does not stratify by faction trajectory.** ARBiH morale rises (good per doctrine) but HRHB morale also rises (bad per doctrine). Architecture contract row `morale drift` names "will to continue under success/failure" — the per-faction shape is not asymmetric in the way the doctrinal arc requires.

Each gap is a separate owner candidate; per binding plan §"Required Evidence Before Any Fix", the next packet must dispatch the owner specialists rather than apply a global multiplier.

## Counterfactual Safety Note

The binding plan §"Counterfactual safety" requires that fixes not force outcomes by date. This audit observes existing engine behavior on a stock 188w; no calendar-forced operations were added; the diagnostic is run-only and does not loop into the engine.

## Outputs

- `tools/diagnostics/force_quality_trajectory.cjs` — read-only diagnostic.
- `tests/force_quality_trajectory_diagnostic.test.ts` — 3 tests (schema, determinism, read-only) all GREEN.
- This audit report.

## Successor Lane Suggestions (for day shift triage, not autonomous)

1. Dispatch `/formation-expert` with a focused question: why does VRS / HRHB average brigade personnel rise across 188 turns? Is reconstitution outrunning attrition, or is the active-set average biased by destruction of small brigades? (Ring 1 if corps-agnostic — `/historian` to verify reconstitution policy is faction-symmetric.)
2. Dispatch `/operations-expert` with: what mechanism resets fatigue from 0.63 to 0.01 across all factions? Is there a per-turn decay term overpowering accumulation?
3. After both verdicts return, decide whether the issue is data (OOB seeding or reconstitution config), mechanic (fatigue accumulation/decay rate), or report (active-set filter biasing the diagnostic).

No fixes proposed. No fix attribution to a single owner. Audit complete.
