# Combat Realism — Lane-3 Run 1 (battle base-loss-rate −25%)

**Date:** 2026-06-09
**Type:** MEASUREMENT ONLY — not adopted, not merged, not re-floored. Worktree `lane3-run1-battle-lethality` off `origin/main` (`0725d0de1`).
**The one change** (`src/sim/combat/combat_math.ts`, the "battle lethality" lever, proportional −25%):
- `BASE_ATTACKER_LOSS_RATE` 0.08 → **0.06**
- `BASE_DEFENDER_LOSS_RATE` 0.06 → **0.045**
Nothing else touched (frontline, bombardment, siege all unchanged). `tsc --noEmit` clean.

## Baselines of comparison
- 188w floor (documented): 649/712 · anchors 30/30 · 0 critical · military killed 102,621 / WIA 383,288 / MIA 53,881 · shares RBiH 56.3 / RS 35.5 / HRHB 8.3 · K:W 1:3.73 · Srebrenica + Žepa fall (both town clusters RS).
  - The clean baseline run I diffed against (`acb538b04d79af3c` / hash `d311eeac18492683`) reproduces these EXACTLY. (`d311eeac` is the territory-identical PDP re-floor of the brief's `5f57d172`; both are 649/712 with identical casualty ledger.)
- 40w floor: hash `235c61f408dc3d95` (reproduced clean this session).

---

## 40w RESULT — completed clean

| Metric | Baseline (`235c61f408dc3d95`) | Lane-3 (`dcd8b17b7ac7bd05`) | Δ |
|---|---|---|---|
| Military killed (total) | 18,821 | 14,947 | **−20.6%** |
| — RBiH killed | 11,462 | 9,555 | −16.6% |
| — RS killed | 5,065 | 3,753 | −25.9% |
| — HRHB killed | 2,294 | 1,639 | −28.6% |
| Killed shares % (RBiH/RS/HRHB) | 60.9 / 26.9 / 12.2 | **63.9 / 25.1 / 11.0** | RBiH +3.0pts |
| WIA total | 71,685 | 58,875 | −17.9% |
| MIA total | 11,933 | 11,125 | −6.8% |
| K:W overall | 1:3.81 | 1:3.94 | leaner |
| OSID matched / 712 | 655 | **656** | +1 |
| Anchors | 30/30 | **30/30** | hold |
| `op:zvornik:zvornik` | RS (PASS) | RS (PASS) | hold |
| `brijesnica_donja` | RS (PASS) | RS (PASS) | hold |

**40w OSID flips vs baseline: 3** (net +1 painted-match)
- `op:cajnice:miljeno_2` RBiH→RS
- `op:foca:mazlina` RS→RBiH
- `op:stolac:hatelji_2` RS→HRHB

§6 N/A at 40w horizon (Jan-1993 endpoint; Srebrenica/Žepa fall is a 1995 event — both correctly still RBiH-held at 40w in baseline and lane-3 alike).

**40w read:** killed dropped −20.6% (a touch steeper than the expected −12–15%, because at the 40w horizon battle-resolution is a larger fraction of the early-war kill mix than over 188w). RBiH killed-share ticked UP +3.0pts exactly as predicted (battle is net RS-heavy, so cutting it relatively spares RS). Territory near-flat (+1, 3 flips). Anchors + sacred anchors all hold.

---

## 188w RESULT — could not complete: pre-existing serialization bug exposed by the perturbed trajectory

The 188w lane-3 run **simulated all 188 turns successfully** (188 lines in `weekly_report.jsonl`) but **aborted at the final `serializeGameState` step**, so no `final_save.json` / `run_summary.json` was written. Exact error:

```
serializeGameState: shape validation failed:
military.home_distance_cache.hv_7th_guards_varazdin must be a finite non-negative number
```

### Root cause (NOT the loss-rate change)
- `buildHomeDistanceCache` (`src/sim/combat/home_distance.ts:113`) stores the raw return of `computeOsidGraphDistance`, which **returns `Infinity` when home and location OSIDs are in disconnected graph components** (documented at line 64).
- `hv_7th_guards_varazdin` is an HV (Croatian Army) cross-border TG brigade. Its `home_osid` is `op:tomislavgrad:tomislavgrad_2` (HVO southwest); at turn 188 in the lane-3 trajectory it was `status: active` at a far-north Posavina location, across a VRS corridor — graph-unreachable → BFS `Infinity` → cached `Infinity` → serializer shape-validator rejects it.
- In the **baseline**, the same brigade ends turn 188 as `status: inactive` (home `op:tomislavgrad:tomislavgrad_2`, location `op:bosanski_samac:domaljevac_2`). `buildHomeDistanceCache` skips non-active formations (line 121), so no Infinity is ever cached — baseline serializes fine (0 non-finite cache entries).
- The loss-rate change has **no causal path** to `home_distance_cache` (the cache is pure graph geometry; combat_math only *reads* it for an effectiveness multiplier). My change merely altered the war trajectory enough that this HV brigade was left `active` + displaced across a disconnected pocket at the serialization turn, which trips a latent, pre-existing bug.
- Behaviorally the Infinity is already treated as the distance floor in-sim: `getHomeDistanceMult(Infinity)` returns `HOME_DISTANCE_FLOOR` (0.70) via `Math.max`. Only the *serializer* chokes on the raw `Infinity`. (Fix belongs in a separate change: clamp/omit non-finite hops in `buildHomeDistanceCache`, or treat unreachable as the 10+-hop floor sentinel.)

### Partial 188w signal available (turn-188 in-memory weekly snapshot, pre-serialize)
From the last `weekly_report.jsonl` line (raw OSID *control* counts, total 712 — NOT the painted-match 649 metric, and NO cumulative casualty ledger is carried in the weekly report):

| | Baseline (final_save) | Lane-3 (turn-188 weekly snapshot) |
|---|---|---|
| Raw control RS / RBiH / HRHB | 321 / 285 / 106 (sim placement) | **289 / 299 / 124** (raw control_counts) |

These two columns are NOT directly comparable (different metric definitions: painted-placement vs raw control-count), so no territory delta can be asserted for 188w. Total-killed / WIA / MIA / matched-OSID / anchor-checks / §6-fall confirmation for the 188w lane-3 run are **unavailable** because they are computed only at serialize time, which failed.

A clean baseline 188w was re-run from the same worktree base commit (change stashed) to confirm the bug is pre-existing. **RESULT: the clean baseline 188w completed successfully and reproduced the exact documented floor** — hash `5f57d17287b87dfb`, 649/712, anchors 30/30, killed 102,621 (RBiH 57,732 / RS 36,397 / HRHB 8,492), WIA 383,288, MIA 53,881, K:W 1:3.73, `op:zvornik:zvornik`=RS, brijesnica=RBiH, Srebrenica 13/13 RS + Žepa 1/1 RS (both fell). **0 non-finite home_distance_cache entries.** This proves the serialization failure is NOT on clean origin/main and was exposed solely by the lane-3 trajectory leaving the HV brigade active+displaced at turn 188 — a pre-existing latent bug, not a regression introduced by the loss-rate edit.

---

## Bottom line
- **40w: measured cleanly.** Killed −20.6%, RBiH share +3.0pts (as expected, corrected in a later bombardment-trim run), territory +1 (3 flips), anchors 30/30, sacred anchors (zvornik=RS, brijesnica=RS) hold.
- **188w: BLOCKED at final serialization** by a pre-existing latent bug (`Infinity` home-distance for an active cross-border HV brigade left displaced across a disconnected pocket). The full 188-turn sim ran; only the save failed. **§6 (Srebrenica/Žepa fall) and the 188w casualty/territory deltas could NOT be measured** for the lane-3 trajectory. A serialize-time clamp fix (separate one-change run) is needed before 188w Lane-3 can be measured.
- **No adoption. No merge. Change left in worktree (stashed during baseline re-run, see git state).**

---

## 188w RESULT — NOW MEASURED (2026-06-09, on top of the home_distance serialize fix)

The latent `home_distance_cache` Infinity serialize-crash that blocked the original 188w Lane-3 run was fixed in PR **#358** (`fix/home-distance-cache-nonfinite`, proven byte-identical to the floor at both 40w `be76e56dd9d288c2` and 188w `5f57d17287b87dfb`). With that fix applied, the Lane-3 change (`BASE_ATTACKER_LOSS_RATE` 0.08→0.06, `BASE_DEFENDER_LOSS_RATE` 0.06→0.045) was applied **on top** (measurement only, NOT bundled into the bugfix PR) and the 188w run **completed and serialized** successfully.

- Run dir: `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n2`
- **Lane-3 188w hash: `ed3f6b89d317ca61`** (floor: `5f57d17287b87dfb`).

### Casualties (188w)

| Metric | Floor (`5f57d172`) | Lane-3 (`ed3f6b89`) | Δ |
|---|---|---|---|
| Military killed (total) | 102,621 | **98,567** | −3.9% |
| — RBiH killed | 57,732 (56.3%) | **49,851 (50.6%)** | −13.6% / share −5.7pts |
| — RS killed | 36,397 (35.5%) | **35,125 (35.6%)** | −3.5% / share +0.1pts |
| — HRHB killed | 8,492 (8.3%) | **13,591 (13.8%)** | **+60.0% / share +5.5pts** |
| WIA total | 383,288 | **370,787** | −3.3% |
| MIA total | 53,881 | **55,013** | +2.1% |
| — RBiH WIA / MIA | 218,176 / 31,309 | 189,844 / 28,398 | −13.0% / −9.3% |
| — RS WIA / MIA | 135,172 / 19,532 | 131,903 / 20,978 | −2.4% / +7.4% |
| — HRHB WIA / MIA | 29,940 / 3,040 | 49,040 / 5,637 | +63.8% / +85.4% |
| K:W overall | 1:3.73 | **1:3.76** | ~flat |

Note the **opposite-sign** casualty effect from the 40w run: at 40w the cut spared RS (RBiH share +3.0pts); at 188w it spares RBiH (RBiH killed-share −5.7pts) and **inflates HRHB killed +60%**. The lower per-battle lethality lets the HVO survive and keep attacking through 1993–95, so it fights far more battles in Herzegovina/Krajina → more cumulative HVO casualties even though each battle is less lethal.

### Territory (188w)

| Metric | Floor | Lane-3 | Δ |
|---|---|---|---|
| Painted-match / 712 (oct1995) | **649 (91.2%)** | **586 (82.3%)** | **−63 OSID** |
| Area-weighted match | 91.3% | 75.7% | −15.6pts |
| Raw control RS / RBiH / HRHB | 321 / 285 / 106 | **289 / 299 / 124** | RS −32, RBiH +14, HRHB +18 |
| Anchors | **30/30** | **29/30** | −1 |
| Failed anchor | — | **`op:foca:foca_3`** (expected RS → Lane-3 RBiH) | regression |

**Region painted-match (floor → Lane-3):** KRAJINA 116→100 · POSAVINA_NE 97→97 · DRINA 101→84 · CENTRAL_CORRIDOR 88→91 · CENTRAL_BOSNIA 133→129 · SARAJEVO 24→23 · **HERZEGOVINA 90→62**. The collapse is concentrated in HERZEGOVINA and DRINA, where **RS loses ground** because the lethality cut weakens its defense.

**Controller flips floor→Lane-3 (82 OSIDs changed):** RS→RBiH 29 · **RS→HRHB 27** · RBiH→RS 13 · HRHB→RS 11 · RBiH→HRHB 2 · HRHB→RBiH 0. The dominant moves are RS bleeding territory to **both** RBiH and HRHB. The 27 RS→HRHB flips are eastern-Herzegovina RS settlements (Bileća, Gacko, Kalinovik, Ljubinje, Foča) that the surviving HVO over-runs — this is why HRHB over-expands to 124 vs painted 107 (+17 over reference).

### PR#357 question (do the 1995 western HVO-liberation OSIDs revert? — the 649→630 concern)

**Answered: NO, they do not revert — the opposite happens.** Lower battle lethality is *favorable* to the HVO: HRHB raw control rises 106→124 and HERZEGOVINA painted-match *falls* because HVO **over-holds and over-expands** past its historical (painted oct1995 = 107) footprint, not because western liberations revert. The 649→630 regression hypothesis from PR#357 does not reproduce as a reversion; instead the net −63 painted-match is driven by RS under-defending and ceding ~56 settlements split across RBiH (+14 net) and HRHB (+18 net), pushing both above their reference counts.

### §6 — CRITICAL (both enclaves STILL FALL)

- **Srebrenica: 13/13 OSIDs RS** (`bostahovine_2, brezovice_2, donji_potocari_2, ljeskovik_2, luka_2, mala_daljegosta_2, milacevici, obadi, osmace_2, radovcici, srebrenica_2, suceska, sulice_2`) — falls, identical to floor.
- **Žepa: 1/1 RS** (`op:rogatica:zepa_2`) — falls, identical to floor.
- Sacred anchors: **`op:zvornik:zvornik` = RS (PASS)**, **`op:lukavac:brijesnica_donja_2` = RBiH (PASS)** — both hold.

§6 is intact: the genocide enclaves fall in Lane-3 exactly as in the floor. The only anchor regression is `op:foca:foca_3` (a non-§6 anchor).

### 188w read (measurement only)

The −25% lethality cut moves the painted-match floor **down 63 OSIDs** (649→586) and breaks one anchor (`op:foca:foca_3`), concentrated in HERZEGOVINA/DRINA where weakened RS defense cedes territory and the surviving HVO over-expands. Casualty realism is mixed: total killed −3.9% (modest), RBiH killed-share drops a realistic 5.7pts, but **HRHB killed inflates +60%** as the HVO survives to fight more battles — a side-effect that would need separate scrutiny against the "opposite VRS/ARBiH casualty arcs" intent. §6 fully intact (both enclaves fall, sacred anchors hold). **NO adoption / NO re-floor — owner + orchestrator call.**
