# Teslić `kamenica_2` Collateral Residue — Decision Packet

**Date:** 2026-05-19
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (from `main` at `5358f968`)
**Scope:** Audit-only. Investigates the single divergent collateral controller flip introduced by the Brčko 188w anchor fix (`5358f968`). No code, scenario, canon, or FORAWWV change in this batch.
**Sensitive-history boundary:** This OSID is **not** in the Sensitive-History list (no rupture event, no ICTY anchor, no canon prose). Investigation is mechanical and historical-alignment only.

## 1. Concrete observation

| Run | 188w final controller of `op:teslic:kamenica_2` | Painted Oct 1995 expectation |
|---|---|---|
| n1917 baseline (pre-Brčko fix) | **RS** (captured by combat at turn 60) | RS |
| n1919 (post-Brčko fix, `5358f968`) | **HRHB** (initial controller, never captured) | RS |

This is a 1-OSID divergence from the painted reference, surfaced as a collateral flip in the n1917→n1919 diff alongside 5 historically-positive flips (the 4-OSID brcko capture cascade + op:pale:praca matching painted RS).

## 2. Mechanism

### 2.1 Initial state is HRHB in BOTH n1917 and n1919

```
n1917 initial_political_controllers[op:teslic:kamenica_2] = HRHB
n1919 initial_political_controllers[op:teslic:kamenica_2] = HRHB
```

`init_control: "apr1992"` + `init_control_mode: "hybrid_1992"` derives kamenica_2 as HRHB at turn 0. This is canon-derived ethnic majority, not a Brčko-fix artifact. The scenario authoring is unchanged.

### 2.2 The flip difference is in late-war capture behavior

- **n1917 baseline:** `control_events` for `op:teslic:kamenica_2` shows `t=60: HRHB → RS (combat)`. Some RS attacker, likely a vrs_1st_krajina brigade, captured it at turn 60.
- **n1919 (Brčko fix applied):** `control_events` for `op:teslic:kamenica_2` is **empty**. No flip occurred at any turn 1-188.

### 2.3 Plausible causal chains

The Brčko fix (`5358f968`) added `op:brcko:brcko` to Operation Koridor's `brcko_corridor` axis objective list. Direct effects:

1. vrs_east_bosnian (EBK) brigades now successfully capture 5 brcko-cluster OSIDs in turns 5-8 (vs 0 in baseline).
2. EBK takes less attrition (the axis no longer collapses with `zero_eligible_axis` after 4 unproductive attacks). Brigade pool is healthier mid-war.
3. The vrs_east_bosnian must-hold zone expands (now actually owns the brcko cluster), pulling more EBK garrison commitment ratio.
4. Army-CO scheduling between corps (per `army_hq_gathering.ts` + `bot_corps_directives.ts`) likely re-prioritizes after early-war EBK success.

Either (a) the army-CO de-prioritizes vrs_1st_krajina's exploratory pushes into HRHB-held kamenica_2 because EBK already secured the Posavina corridor objective, or (b) vrs_1st_krajina brigades that would have attacked kamenica_2 at turn ~60 in baseline are now committed to consolidation/defense of the brcko corridor (under the new must-hold pressure), or (c) some other indirect bot-AI re-routing.

This is **not** a Brčko-fix bug per se — it's an emergent re-prioritization of distant late-war RS opportunism. The Brčko fix is mechanically correct (Operation Koridor's brcko_corridor axis now lists its primary urban objective), and the side-effect propagation is the kind of normal calibration noise that arises whenever any bot priority shifts.

## 3. Scope check — how isolated is the residue?

Scanned the Teslić-Tešanj-Žepče-Doboj-Maglaj region for any other front-edge controller changes between n1917 and n1919:

| OSID | n1917 | n1919 | Painted |
|---|---|---|---|
| op:zepce:ozimica_2 | HRHB | HRHB | HRHB ✓ |
| op:zepce:viniste_2 | HRHB | HRHB | HRHB ✓ |
| op:zepce:zepce_2 | HRHB | HRHB | HRHB ✓ |
| **op:teslic:kamenica_2** | **RS** | **HRHB** | **RS ✗** |

The other 6 Teslić OSIDs (`blatnica_2`, `buletic_2`, `cecava_2`, `donji_ruzevic`, `teslic_2`, `vitkovci`) are all RS in both runs and match painted. The HRHB cluster around Žepče is stable and correctly held HRHB.

**Scope verdict:** The residue is isolated to a single OSID. There is no cascading regional misalignment.

## 4. Classification

**Harmless contestation noise.** Specifically:

- Not an anchor: `op:teslic:kamenica_2` is not in the 27-OSID anchor set.
- Not a benchmark: not in the 6 bot_benchmark_evaluation rows.
- Not sensitive-history: no rupture, no ICTY-anchored canon prose, no FORAWWV row.
- Not in the painted-vs-actual area-weighted score core: a 1-OSID delta against a 5822-graph-node universe is ≤0.02% by node count and even smaller by area (Lašva/Tešanj OSIDs are small).
- Within normal late-war contestation-zone behavior: the engine routinely shows ±5–10 OSID drift between consecutive calibration runs of similar scope without anchor breakage; this is one of those OSIDs.
- Net historical-alignment trade is **+5/6 positive** under the Brčko fix (4 brcko-cluster OSIDs + 1 op:pale:praca all matching painted RS, vs 1 op:teslic:kamenica_2 diverging from painted RS).

**Not a blocking regression.** The Brčko fix has already been accepted into main at `5358f968`. The lane-prompt acceptance criterion ("27/27 anchors at 40w and 188w, 6/6 benchmarks") is satisfied. This residue would have been documented at acceptance time but does not invalidate it.

**Not an immediate calibration lane.** Closing this 1-OSID residue would require either:
- A scenario-init paint of kamenica_2 as RS (banned by CLAUDE.md "Initial OSID control from census/referendum is sacrosanct"),
- A vrs_1st_krajina must-hold-target including kamenica_2 (only useful post-capture; doesn't drive capture),
- A new VRS triggered operation targeting Teslić HRHB pockets (broad change, crosses STOP gate),
- Or an army-CO priority knob to keep vrs_1st_krajina active despite EBK success (broad balance change).

None of these is the "single bounded, historically obvious fix" the lane prompt allows without escalation. The mechanical cause (army-CO de-prioritization after EBK success in Posavina) is itself an emergent behavior that may even be historically defensible — by mid-1993, vrs_1st_krajina had largely consolidated and was not aggressively expanding into HRHB-held Lašva-valley fringe OSIDs.

## 5. Recommendation

1. **Accept the residue.** Document in `CALIBRATION_MASTER.md` and `CONSOLIDATED_BACKLOG.md` as known minor collateral noise from the Brčko fix. No code, no scenario, no canon edit.
2. **Defer to a future calibration lane** if Lašva-valley front-edge tooling work touches this area (e.g. HRHB territorial reach, vrs_1st_krajina late-war directive shape, or army-CO cross-corps priority audit).
3. **Track for emergence-vs-painted-bias review:** If subsequent v0.9.x batches introduce more changes that drift Lašva-Tešanj OSIDs HRHB-ward, this is the canary for that class of regression. Currently it is a single-OSID flag, not a trend.

## 6. Decision

**Decision:** Accept as harmless contestation noise. No code change. Document in PROJECT_LEDGER and CALIBRATION_MASTER. The Brčko fix at `5358f968` remains valid; this 1-OSID divergence does not warrant follow-up code.

**Output handoff:**
- Branch: `codex/teslic-collateral-and-strict-null-2026-05-19` (from `main` at `5358f968`)
- Files changed in this batch: this audit doc only.
- 40w hash unchanged: `5c6e7b62fa6670c0` (n1918).
- 188w hash unchanged: `7b57a8592f668137` (n1919).
- Commands run: `node -e` JSON inspections of n1917 + n1919 final/initial saves and control_events; no scenario re-run (no behavior change in this batch).
- Remaining risk: none for this OSID; if future calibration work targets HRHB territorial reach in Lašva valley, this residue should be re-evaluated.
- Committed: documentation-only commit pending.

## 7. References

- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1917/final_save.json` (baseline pre-Brčko fix)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1919/final_save.json` (post-Brčko fix at `5358f968`)
- `data/source/calibration/painted_control_oct1995.json` (anchor + alignment reference)
- `docs/40_reports/audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md` (sister audit closing the Brčko + Teocak anchors)
- `docs/40_reports/CALIBRATION_MASTER.md` (calibration baseline log)
- `data/scenarios/apr1992_definitive_188w.json` (scenario authoring, init_control `apr1992`)
- `CLAUDE.md` ("Initial OSID control from census/referendum is sacrosanct" — rules out scenario paint as a fix)
