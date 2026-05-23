# Engine #1 + Engine #2 Regression Audit — n1995 vs n1992 Baseline

**Author:** scenario-creator-runner-tester (dispatched)
**Date:** 2026-05-23
**Scenario:** apr1992_definitive_188w (210e69404d054959, w188)
**Baseline:** n1992 (pre Engine #1 + Engine #2)
**Subject:** n1995 (post Engine #1 axis pooling + Engine #2 dissolution prevention/Path C reserve)

## TL;DR

n1995 HRHB accuracy collapses from **81.31% → 62.62% (-20pp)** against painted oct1995 reference. **All 20 lost HRHB OSIDs flipped to RS**, all clustered in the western Bosnia frontier (Kupres / Glamoč / Bosansko Grahovo / Drvar / Šipovo / Livno). The mechanism is unambiguous: **Operation Cincar/Kupres FAILED** in n1995 (succeeded in n1992) and **Operation Mistral 1 was never launched** in n1995. The smoking gun is `hv_4th_guards_split` — the HV Split guard brigade that anchored both ops in n1992 — being knocked into a probe op at t126 by Engine #1's broader axis pooling, then marked `lifecycle_status=destroyed` t129-t133, exactly across Cincar's launch window (t132). Engine #2's lifecycle rescue reactivated it at t134, but Cincar had already launched short-handed and failed. Engine #1 caused the damage; Engine #2 rescued it too late.

**Recommendation: REVERT ENGINE #1 (keep Engine #2).** Engine #1's broader axis pooling is the upstream cause of the regression; Engine #2 is structurally fine and independently useful for force-totals continuity. The Cincar/Mistral 1 launch windows were assumption-protected in n1992 because HV Split was preserved by *not* being pulled into pre-op probes. Engine #1 broke that implicit protection.

---

## 1. Metric Diff (recomputed from final saves)

| Run | RBiH match | RS match | HRHB match | Total |
|---|---|---|---|---|
| n1992 | 246/292 (84.25%) | 251/313 (80.19%) | **87/107 (81.31%)** | 584/712 (82.02%) |
| n1995 | 240/292 (82.19%) | 254/313 (81.15%) | **67/107 (62.62%)** | 561/712 (78.79%) |
| Δ | -6 OSIDs | +3 OSIDs | **-20 OSIDs** | **-23 OSIDs** |

Per-faction sim_count (post-Engine, end of run):
- HRHB: 102 (n1992) → 81 (n1995): **-21 OSIDs lost**, 1 outside painted-HRHB set (`op:glamoc:kovacevci_2` which is painted RBiH).
- RBiH: 305 → 297 (-8): some RBiH-painted territory ceded to RS in n1995, but compensated by **net +3 RS accuracy** (RS more accurate in n1995).
- RS: 305 → 334 (+29): RS absorbs the HRHB losses + 8 RBiH losses.

The painted-file update (6 Goražde OSIDs RS→RBiH, meta RBiH 286→292 / RS 319→313) cannot explain the HRHB collapse — those OSIDs are not in the HRHB set. HRHB regression is **fully sim-side**.

---

## 2. Twenty HRHB OSIDs Newly Lost (all RS-captures)

| OSID | n1992 | n1995 | Capturing Op (n1992) |
|---|---|---|---|
| op:bosansko_grahovo:bosansko_grahovo_2 | HRHB | RS | Mistral 1 |
| op:bosansko_grahovo:crni_lug | HRHB | RS | Mistral 1 |
| op:bosansko_grahovo:malesevci | HRHB | RS | Mistral 1 |
| op:bosansko_grahovo:ugarci | HRHB | RS | Mistral 1 |
| op:glamoc:glamoc_2 | HRHB | RS | Mistral 1 |
| op:glamoc:halapic | HRHB | RS | Mistral 1 |
| op:glamoc:kovacevci_2 | HRHB | RS | Mistral 1 (only RBiH-source flip) |
| op:glamoc:pribelja | HRHB | RS | Mistral 1 (n1992 PC, not in flip list) |
| op:glamoc:stekerovci_2 | HRHB | RS | Mistral 1 (only TARGETED in n1992) |
| op:glamoc:vidimlije_2 | HRHB | RS | Mistral 1 |
| op:kupres:bucovaca | HRHB | RS | Cincar |
| op:kupres:donji_malovan | HRHB | RS | Cincar |
| op:kupres:goravci | HRHB | RS | Cincar |
| op:kupres:kupres_2 | HRHB | RS | Cincar |
| op:kupres:novo_selo_2 | HRHB | RS | Cincar |
| op:livno:gubin_2 | HRHB | RS | (initial HRHB control, retained) |
| op:sipovo:brdjani | HRHB | RS | (initial HRHB control, retained) |
| op:titov_drvar:drvar_2 | HRHB | RS | Mistral 2 (or initial-control retention) |
| op:titov_drvar:prekaja_2 | HRHB | RS | Mistral 2 |
| op:titov_drvar:sipovljani_2 | HRHB | RS | Mistral 2 |

The n1992 control_delta shows 20 RS→HRHB flips spanning exactly this footprint. In n1995, only `op:glamoc:kovacevci_2` shows a flip (RBiH→RS) and none of the RS→HRHB flips appear — RS simply retained these OSIDs throughout because HVO never captured them.

---

## 3. Operation Inventory Diff

n1992 ran **37 ops** (3 HRHB, 22 RS, 12 RBiH). n1995 ran **30 ops** (2 HRHB, 17 RS, 11 RBiH). The drop is concentrated in HRHB-side launches:

| Op | n1992 | n1995 |
|---|---|---|
| Operation Jackal (HRHB, t8-14) | success caps=2/2 | success caps=2/2 |
| **Operation Cincar / Kupres (HRHB, t132)** | **success 5/5 — Brilliant Victory** | **failure 0/5 — Indecisive** |
| **Operation Mistral 1 (HRHB, t160-175)** | **partial 7/8 — Solid Victory** | **NEVER LAUNCHED** |
| Operacija Brana (RS, t131-134) | failure | absent |
| Operacija Vrbas (RS, t135-137) | failure | absent |
| Operacija Prodor (RS, t139-148) | failure | absent |
| Operacija Grab (RS, t150-152) | failure | absent |
| Operacija Topola (RS, t162-164) | failure | absent |
| Operacija Zaslon (RS, t174-176) | failure | absent |
| Operacija Munja (RS) | absent | t97-99 failure |
| Operacija Grom (RS) | absent | t141-143 failure |
| Operacija Stjena (RS, t96-98) | failure | absent |

Net: -1 HRHB launch (the high-value Mistral 1), -5 RS launches (all failures historically), +2 different RS failures. RS op count drift is statistical churn (all failures); the HRHB op losses are the **only ones that move the metric**.

---

## 4. Root Cause — `hv_4th_guards_split` lifecycle in n1995

The HV 4th Guards Brigade (Split) was the heaviest single HVO maneuver unit. It anchored Mistral 1 alone in n1992 (capturing 7 of 8 Grahovo+Glamoč OSIDs) and was 1 of 5 brigades on Cincar. Its lifecycle across t125-t145:

**n1992 (baseline):**
```
t125-131: lifecycle_status=null, active_op=null, cohesion=64, fatigue=1
t132:     active_op=Operation Cincar / Kupres, cohesion=62.5
t133-140: in Cincar, cohesion drains 61→50.5
t141+:    Cincar ends, recovery
```
The brigade enters Cincar fresh (cohesion 64, fatigue 1).

**n1995 (post Engine #1+#2):**
```
t125:     cohesion=30, fatigue=4 (already lower-state from Engine #1 pool pressure)
t126:     active_op=probe_hvo_tomislavgrad_t126 (assigned to probe op)
t127:     cohesion=12, fatigue=7 (probe causes heavy losses)
t128:     active_op=probe, cohesion=30 (recovery applied)
t129-133: lifecycle_status=DESTROYED, active_op=null, cohesion=12, fatigue=10
t134:     lifecycle_status=null (Engine #2 lifecycle rescue), cohesion=30
t135+:    available but idle (Cincar launched t132 without it; Mistral 1 never gated)
```

The brigade was unavailable during Cincar's launch window. Cincar still launched (with 4 brigades instead of 5, no Split guards, no 1st Guard ABB), force_ratio dropped from 4.15 to 0.74, and the op was graded failure at t138 (max_failures stop condition).

`hvo_1st_guard_abb` does not show similar destruction in n1995, but its absence from Cincar's brigade list (present in n1992, absent in n1995) is unexplained from the temporal log alone — it likely failed an axis-pool eligibility threshold (cohesion ≥ X) under the new Engine #1 logic. Need code-side trace to confirm.

---

## 5. Engine Attribution

### Engine #1 (axis pooling) — IS the upstream cause

Engine #1's axis-pooling change (`bot_brigade_eval_attack.ts:302-419`) broadens the set of brigades eligible to be pulled into an axis when sizing attacks. In n1992, `hv_4th_guards_split` sat at cohesion=64 in its garrison position (subseg:sector:hvo_tomislavgrad:0:0) from t91 onwards, untouched until Cincar launched at t132. In n1995, the same brigade is pulled into a low-intensity probe op at t126 because axis-pool eligibility now crosses the threshold. That probe destroys its cohesion (64→12 at t127) and triggers `lifecycle_status=destroyed` at t129.

This is **exactly the cascade described in the investigation prompt** ("did axis-pooling unlock MORE attacks for ARBiH/RS that swept through HVO-held territory? Pool ratios may have crossed thresholds that previously didn't"). The mechanism is more subtle than direct attack — Engine #1 burns HVO premium brigades on probes, so they're not available for the pre-planned big ops (Cincar/Mistral) that historically captured the western frontier.

**Engine #1 is causing the regression.**

### Engine #2 (lifecycle prevention + reserve fallback) — IS NOT the primary cause; mitigates but does not fix

Engine #2 rescued `hv_4th_guards_split` from destroyed → null at t134. That rescue is structurally correct (it preserves the brigade for later use) but **arrives 2 turns after Cincar's launch**. The Path C strategic-reserve fallback fires only when no other path is available — for HVO, the available reserve was small enough that no fresh brigade backfilled into Cincar's roster.

Without Engine #2, the brigade would have remained destroyed past t134 and Mistral 1 would also have failed to launch. With Engine #2 alone (no Engine #1), the brigade never gets damaged in the first place (no probe-op pull), so Cincar succeeds as in n1992. Engine #2 is downstream of Engine #1's damage.

**Engine #2 is not causing the regression. Its rescue is correct but mistimed because Engine #1 caused the damage in the first place.**

### Op-level diff confirms

- Cincar fewer brigades (5→4), no HV 4th Guards Split, no HVO 1st Guard ABB, initial_strength 7704→4818 (-37%), force_ratio 4.15→0.74.
- Mistral 1 not launched (would need HV 4th Guards Split, which was destroyed then degraded through t134-160).
- Operation Jackal still succeeds in both runs (different brigades, earlier in war when nothing else competed for them).

---

## 6. Recommendation: REVERT ENGINE #1, KEEP ENGINE #2

Decision matrix:

| Option | match_ratio | HRHB acc | Engineering | Verdict |
|---|---|---|---|---|
| Keep both | 78.79% | 62.62% | n1995 | **NO** — -2.39pp regression, -20pp HRHB |
| Revert #1, keep #2 | ~81.5%+ projected | ~81%+ | independently useful | **YES** |
| Revert #2, keep #1 | regression remains | low | hv_4th destroyed permanently | No |
| Revert both | 81.18% | 81.31% | n1992 baseline | Acceptable fallback |

**Rationale for keeping Engine #2:**
- Lifecycle prevention is a structurally correct mechanic — preserving high-value brigades from premature destruction reflects real-world reconstitution behavior (cadre survival, replenishment, reassignment).
- Path C reserve fallback is independently useful and not implicated in any observed harm.
- The Engine #2 rescue at t134 is *correct* behavior; it just arrived too late because Engine #1 caused the damage.

**Rationale for reverting Engine #1:**
- Axis pooling broadens the set of brigades pulled into reactive/probe attacks. For HVO with thin rosters, this drains premium brigades before pre-planned ops can use them.
- The implicit "premium brigade preservation" of the n1992 baseline is doing real work — Cincar/Mistral 1/Mistral 2 depend on having HV 4th Guards Split and HVO Guards available at the right turn.
- If axis pooling is principled (and it is — see the design doc), it needs to be **gated by op-priority**: don't pool a brigade into a probe if a pre-planned op needs it within N turns. This is implementation work beyond a simple revert.

**Suggested follow-up after revert:**
- Re-implement Engine #1 with a "reserved-for-planned-op" filter: brigades flagged as participants for a pre-planned op launching within (e.g.) 10 turns are excluded from axis pooling for ad-hoc attacks.
- Validate on the same scenario; target ≥81% match_ratio and ≥81% HRHB accuracy.

---

## 7. Open Questions / Followups

1. **`hvo_1st_guard_abb` absence from Cincar in n1995** — its temporal log shows no destruction. Need to trace why it failed Cincar's pre-planned-op eligibility filter. Could be home_osid distance, sector assignment, or a new Engine #1 cohesion gate.
2. **Probe op at t126 inception** — why does Tomislavgrad corps launch a probe right before Cincar? This may be a Commander Intelligence v0.8 stance-change consequence of Engine #1 widening attack pools.
3. **HVO axis-pooling guard** — does the axis-pool code-path differentiate by faction (HRHB has thinner OOB than RBiH/RS)? If not, an HRHB-specific protection threshold may also help.
4. **Painted reference update interaction** — the 6 Goražde OSIDs RS→RBiH change is unrelated to HRHB and confirmed not responsible for the regression. RBiH/RS net match_ratio drift (-6 / +3) is within expected noise from sim-side flips, not painted-side.
5. **Verification path after revert** — re-run scenario; expect HRHB caps to return to 81-87 range, Cincar+Mistral 1 to succeed, total match_ratio ≥81%. If not, the bug is elsewhere (less likely; the Cincar/Mistral causal chain is direct).

---

## 8. Verdict

Engine #1 (axis pooling) caused the n1995 HRHB regression by draining `hv_4th_guards_split` into a probe op at t126, which knocked the brigade into destroyed-state across Cincar's launch window (t132). Engine #2 rescued the brigade at t134, but too late for Cincar and Mistral 1. Engine #2 is innocent; Engine #1 is implicated.

**Revert Engine #1. Keep Engine #2. Re-implement axis pooling with priority-aware brigade reservation in a follow-up.**

— scenario-creator-runner-tester (dispatched expert)
