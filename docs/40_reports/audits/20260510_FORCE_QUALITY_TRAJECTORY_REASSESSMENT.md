# Force Quality Trajectory Reassessment

**Date:** 2026-05-10
**Status:** Audit closure on current artifacts; no tuning in this packet
**Plan:** `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`
**Diagnostics:** `tools/diagnostics/force_quality_trajectory.cjs`, `tools/diagnostics/force_quality_audit_metrics.cjs`, `tools/diagnostics/force_quality_checkpoint_windows.cjs`

## Summary

The force-quality audit packet is now complete on the current run line. The evidence no longer supports the older May 1 statement that `capability_profile` and `faction_officer_maturity` are purely decorative in the operation layer; `computeCorpsOperationReadiness(...)` now consumes them. It also no longer supports the older 100x officer-learning suppression as a live unresolved blocker; current 188w evidence shows RBiH professionalizing and RS officer quality degrading.

The remaining force-quality problem is not a single missing formula. It is a set of owner-specific gaps:

- RBiH officer quality rises strongly from t1 to t188, matching the intended rabble-to-professional arc.
- RS officer quality, cohesion, and morale decline, matching the degraded-but-dangerous arc.
- HRHB officer quality and morale remain mis-shaped against the overstretch arc.
- RS and HRHB average brigade personnel still rise over the war, contradicting brittle/overstretched degradation.
- Fatigue trends down or resets across all factions instead of becoming long-run brittleness.
- Operation delivery remains weak in late windows: captures are sparse or zero even when late-war force-quality signals exist.

Per the binding plan, this stops at owner classification. No global multiplier, scenario rail, painted-target feedback, or calendar collapse was introduced.

## Evidence Sources

| Run | Weeks | Hash | Purpose |
|---|---:|---|---|
| `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1768` | 40 | `ea9f3db7ac59a443` | early-war proof point after current CPU/profile work |
| `apr1992_definitive_188w__210e69404d054959__w188_n1741` | 188 | `a4bf8b8095050881` | current full-war proof point |

## Current Trajectory Verdict

From `node tools/diagnostics/force_quality_trajectory.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1741 --json`:

| Faction | Metric | Early mean | Late mean | Delta | Canon sign | Verdict |
|---|---|---:|---:|---:|---:|---|
| RBiH | officer_quality | 0.1269 | 0.7934 | +0.6665 | +1 | matches |
| RS | officer_quality | 0.5366 | 0.4619 | -0.0747 | -1 | matches |
| HRHB | officer_quality | 0.2435 | 0.2558 | +0.0123 | -1 | inverse |
| RBiH | cohesion | 48.5898 | 73.9711 | +25.3813 | +1 | matches |
| RS | cohesion | 55.4944 | 27.2726 | -28.2218 | -1 | matches |
| HRHB | cohesion | 52.5774 | 36.5403 | -16.0371 | -1 | matches |
| RS | personnel | 1094.1966 | 1809.4265 | +715.2299 | -1 | inverse |
| HRHB | personnel | 1316.5837 | 1819.7444 | +503.1607 | -1 | inverse |
| RS | fatigue | 0.5795 | 0.0000 | -0.5795 | +1 | inverse |
| RBiH | fatigue | 0.1563 | 0.0330 | -0.1233 | +1 | drifting_away |
| HRHB | fatigue | 0.0501 | 0.0000 | -0.0501 | +1 | drifting_away |

## Checkpoint Distributions

From `node tools/diagnostics/force_quality_checkpoint_windows.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1741 --json`:

| Turn | Faction | Active brigades | Morale mean | Cohesion mean | Officer quality mean | Fatigue mean | Personnel mean |
|---:|---|---:|---:|---:|---:|---:|---:|
| 40 | RBiH | 114 | 78.684 | 61.506 | 0.2815 | 0.4781 | 1403.1 |
| 40 | RS | 83 | 60.988 | 37.288 | 0.5627 | 0.4217 | 1276.2 |
| 40 | HRHB | 29 | 61.069 | 45.445 | 0.3110 | 0.1034 | 1619.3 |
| 104 | RBiH | 117 | 91.974 | 74.832 | 0.5620 | 0.3761 | 1706.1 |
| 104 | RS | 66 | 67.848 | 35.808 | 0.5517 | 0.0455 | 1459.3 |
| 104 | HRHB | 34 | 64.235 | 43.494 | 0.3430 | 0.0000 | 1796.2 |
| 156 | RBiH | 120 | 89.542 | 74.216 | 0.7463 | 0.1792 | 1712.8 |
| 156 | RS | 63 | 65.063 | 32.889 | 0.4722 | 0.0794 | 1541.0 |
| 156 | HRHB | 34 | 65.500 | 36.553 | 0.2828 | 0.0000 | 1776.9 |
| 188 | RBiH | 122 | 89.475 | 73.566 | 0.8072 | 0.0000 | 1705.0 |
| 188 | RS | 60 | 12.617 | 26.468 | 0.4556 | 0.0000 | 1839.6 |
| 188 | HRHB | 35 | 69.914 | 36.080 | 0.2465 | 0.0000 | 1834.1 |

This satisfies the plan's 40w / 104w / 156w / 183-188w checkpoint requirement from one completed 188w artifact. The diagnostic also reports `opportunity_comparison.status = artifact_missing`; no paired with/without opportunity-proposal run directories are present in the current workspace, so that comparison should be generated only if a future focused lane needs it.

Officer-quality rate of change:

| Faction | First | Last | Total delta | Mean delta/turn | Verdict |
|---|---:|---:|---:|---:|---|
| HRHB | 0.2267 t1 | 0.2465 t188 | +0.0198 | +0.000106 | inverse |
| RBiH | 0.0865 t1 | 0.8072 t188 | +0.7207 | +0.003854 | matches |
| RS | 0.5518 t1 | 0.4556 t188 | -0.0962 | -0.000515 | matches |

## Operation Delivery

From `node tools/diagnostics/force_quality_audit_metrics.cjs ...n1768 ...n1741`:

| Window | Faction | ops | attempts | captures | success | bde>=5 | axes>=2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 14 | 20 | 24 | 3 | 6 | 9 | 8 | 3 |
| 40-104w | RBiH | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 40-104w | RS | 4 | 0 | 0 | 0 | 0 | 1 | 3 | 2 |
| 104-156w | RBiH | 3 | 2 | 9 | 2 | 3 | 0 | 7 | 1 |
| 104-156w | RS | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 156-188w | RBiH | 1 | 6 | 0 | 0 | 1 | 1 | 5 | 2 |
| 156-188w | RS | 5 | 1 | 0 | 0 | 0 | 0 | 3 | 1 |
| 156-188w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 2 |

The 104-156w RBiH window shows the clearest positive force-quality/productive-operation signal: 3 operations, 2 attacks, 9 captures, 2 successes, and 3 operations with 5+ brigades. The 156-188w window still lacks capture delivery despite one RBiH 5-brigade, 2-axis operation. This points away from another officer-quality audit and toward operation-delivery mechanics: staging, axes, target viability, exhaustion, or late-war objectives.

## Owner Classification

| Gap | Evidence | Likely owner | Next lane |
|---|---|---|---|
| RS/HRHB personnel rises through 188w | RS +715 average personnel; HRHB +503 | reconstitution, mobilization, active-set reporting | Personnel/reconstitution audit before tuning |
| Fatigue resets instead of accumulating | RS 0.5795 -> 0.0000; all factions drift down | fatigue/exhaustion mechanics; possibly active-set bias | Fatigue/exhaustion trajectory lane |
| HRHB quality/morale shape still wrong | HRHB officer_quality +0.0198 vs expected decline; morale +5.324 | HRHB timeline data, Washington transition, formation lifecycle | HRHB trajectory mini-lane |
| Late-war captures fail | 156-188w RBiH 6 attempts, 0 captures; RS 1 attempt, 0 captures | operation delivery, target selection, staging, combat execution | Late-war operation-delivery lane |

## What This Closes

- The May 1 audit requirement is satisfied on current artifacts.
- The old "no evidence yet" force-quality roadmap wording should be retired.
- Future work should not re-run a broad force-quality audit before acting; it should pick one owner lane and produce a focused hypothesis with run evidence.

## What Remains

1. Reconstitution/personnel trajectory: explain why VRS and HRHB average brigade personnel rise by late war.
2. Fatigue/exhaustion trajectory: explain why fatigue does not become strategic brittleness.
3. HRHB trajectory: decide whether current late-war HRHB quality/morale is data, Washington-transition, or formation-lifecycle error.
4. Operation delivery: explain why improved RBiH force-quality signals do not reliably convert into late-war captures.

## Determinism

Read-only diagnostics only. No source data, scenario, OOB, operation definition, or simulation behavior changed. `tools/diagnostics/force_quality_checkpoint_windows.cjs` is a deterministic read-only extractor with fixture-backed test coverage. The two generated dirty artifacts already present in the worktree (`data/derived/latest_run_final_save.json`, `data/derived/_op_audit_n1621.json`) are not part of this audit and should remain unstaged.
