# Lane-3 B-FINAL — Herzegovina recovery lever on top of (b): BLOCKED (no re-floor)

**Status:** measurement complete. **The Herzegovina-recovery lever is a NO-GO — it breaks the
sacred Zvornik anchor and nets WORSE territory than (b).** No merge, no re-floor. The (b) candidate
(625/712, anchors 30/30, §6 intact) **remains the standing re-floor candidate** for owner sign-off;
this report documents that the SE-Herzegovina residual is **NOT independently recoverable** via a
Herzegovina-Corps defender lever.

**Branch:** `feat/lane3-b-final` (off `feat/lane3-b-lever-a-zvornik-pin` tip `2a0dc3b03`).
**Date:** 2026-06-09.
**Worktree base:** (b) tip `2a0dc3b03` = origin/main `ddee39e2` + Lever A + Zvornik must-hold pin.
**Author:** build+measure agent (deterministic; no Math.random/Date.now; no avoided_osids; no OSID overrides).

---

## What was attempted (the ONE lever)

The (b) residual was a coherent **SE-Herzegovina ARBiH over-advance** (Kalinovik/Nevesinje/Foča/
Gacko/Trnovo + Mostar/Konjic), diagnosed in the (b) report as the same garrison-collapse pattern as
Zvornik. This session reproduced the (b) baseline 188w **exactly (625/712)** and confirmed the
mechanism in the final_save:

- **`vrs_herzegovina` collapses entirely.** 7 of its 8 brigades are inactive at personnel 0 by
  turn 188 (Kalinovik, Nevesinje, Foča, Gacko, Bileća, Čajniče, 2nd-Herzegovina brigades all dead).
  Only `rs_trebinje_brigade` survives, deep south at Trebinje. ARBiH 4th Corps then absorbs the
  vacated SE-Herzegovina OSIDs.
- **OOB gap:** the Herzegovina Corps starts at **8,400** total (mostly 1,000/brigade) with
  `available_from: 0` and **no reserve depth and no reinforcement**. The VRS OOB master records the
  historical Herzegovina Corps at **~12,000 (1992) → ~15,000 (1993–95)** with eastern Herzegovina
  "firmly held 1992–1995" (Trebinje/Nevesinje/Gacko/Bileća/Foča/Čajniče/Kalinovik never fell).

**The must-hold garrison-pin (the preferred lever) was ruled out first:** the pin redeploys a
*surviving idle same-corps reserve* onto an undefended must-hold edge. Zvornik worked because
`vrs_drina` had 5 fat survivors. `vrs_herzegovina` has **zero idle survivors** (all dead) — the pin
would be starved of candidates and do nothing. You cannot pin a dead brigade. So the lever attempted
was the task's stated fallback: a **targeted `vrs_herzegovina` defender OOB bump** toward historical
strength (raise the seven collapsing garrison brigades' `initial_personnel`).

Two magnitudes were measured (one conceptual lever, tuned):
- **+800/brigade → corps total 13,600** (mid-war historical ~12–15k band).
- **+400/brigade → corps total 10,800** (early-war historical ~10–12k band).

---

## Cumulative results (Lever A + Zvornik pin + Herzegovina OOB bump) — 188w

| Metric | Floor | (b) baseline | **Herz +800 (13.6k)** | **Herz +400 (10.8k)** |
|---|---|---|---|---|
| Spatial match /712 | **649** | **625** (−24) | **616** (−33) | **615** (−34) |
| Anchors | 30/30 | **30/30** | **29/30** ❌ | **29/30** ❌ |
| `op:zvornik:zvornik` | RS | **RS** ✅ | **RBiH** ❌ | **RBiH** ❌ |
| `op:lukavac:brijesnica_donja_2` | RBiH | RBiH ✅ | RBiH ✅ | RBiH ✅ |
| Srebrenica (§6) | 13/13 RS | 13/13 RS ✅ | **13/13 RS** ✅ | **13/13 RS** ✅ |
| Žepa (§6) | 1/1 RS | 1/1 RS ✅ | **1/1 RS** ✅ | **1/1 RS** ✅ |
| Sim OSID RS/RBiH/HRHB | 315/290/107* | 303/303/106 | 323/301/88 | 322/288/102 |
| Area-weighted RS share | 48.5%* | 46.3% | **54.3%** | **51.6%** |
| final_state_hash | (floor 5f57d172) | a4bab2d7 (this WT) | a350e897 | dcf6ef01 |

\* painted reference. Both bump magnitudes push VRS **above** the painted area share (over-hold).

### Why it fails — cross-corps reserve cascade (the smoking gun)

The bump *does* keep the Herzegovina Corps alive (6 of 8 brigades survive at +400 vs 1 in (b)) and
*does* recover the SE-Herzegovina strongpoints (Kalinovik/Nevesinje/Gacko/Foča town centres hold RS).
**But it breaks Zvornik through a second-order effect:**

| | (b) baseline | **Herz +400 bump** |
|---|---|---|
| `vrs_herzegovina` brigades alive @t188 | 1 | 6 |
| `vrs_drina` brigades alive @t188 | **6** | **4** |
| `op:zvornik:zvornik` garrison @t188 | `rs_1st_milii` (RS, 1100) ✅ | **NONE** → ARBiH ❌ |

A stronger Herzegovina Corps competes for the shared cross-corps / army-HQ reserve pool and shifts
ARBiH pressure allocation on the eastern front. The net effect is that **`vrs_drina` loses the
reserve that (b)'s must-hold pin needs to re-garrison Zvornik** — the pin is starved again and ARBiH
walks into a null-defender `op:zvornik:zvornik`, breaking the anchor (b) painstakingly recovered.

Beyond Zvornik, the bump produces **new over-extension regressions** that make the net WORSE than (b):
- **NW Krajina** VRS over-holds (KRAJINA RS_sim 79→89; HRHB collapses) — Kovačevci/Pribelja/Drvar etc.
- **Western Herzegovina** VRS over-runs HVO (Glamoč ×4, Livno, Drvar ×3 painted=HRHB → sim=RS).
- **DRINA** picks up new RS→RBiH losses (Šekovići ×3, Vlasenica cerska/grabovica, Bratunac jezestica/
  pobudje, Rogatica brčigovo) as the eastern-front trajectory destabilises.

**Both magnitudes (+800 → 616, +400 → 615) break Zvornik and regress territory.** This is a
**structural cross-corps cascade, not a tunable magnitude** — a gentler bump did not help (615 < 616).

---

## 40w (calibration health-check)

The OOB lives in shared `oob_brigades.json`, so it affects both horizons. At 40w the bump is benign:

| Metric | Floor 40w | **Herz +800 40w** |
|---|---|---|
| Spatial match /712 (jan1993) | 655 | **655** (identical) |
| Anchors | 30/30 | **30/30** ✅ |
| final_state_hash | 235c61f4 | 178ba988 (territory-neutral) |

40w territory is unharmed (655 = 655). The damage is purely a **188w-horizon over-extension** — the
strengthened corps survives long enough (1993–95) to over-expand and trigger the cross-corps cascade
that only compounds over the full-war window. (Classic "40w GO is a false-green for combat-behavior
changes" — validated at 188w, where it breaks.)

---

## Four verdicts

1. **Territory vs 649?** **FAIL.** Both bumps regress (615/616) — WORSE than (b)'s 625 and −34 vs the
   floor. The SE-Herzegovina cluster IS reclaimed, but the cross-corps regressions (Krajina over-hold,
   western HVO over-run, Drina losses) more than cancel it.
2. **§6 (Srebrenica + Žepa fall)?** **HELD.** Both enclaves still fall RS at 188w in every variant.
   The Herzegovina bump does not disturb §6 (Srebrenica/Žepa are `vrs_drina`).
3. **Anchors 30/30 / Zvornik=RS?** **FAIL.** Zvornik breaks to RBiH (29/30) under every bump magnitude
   via the cross-corps reserve cascade described above. (b)'s 30/30 is lost.
4. **Shares ~54/37/9 or better?** **REGRESS.** VRS over-holds (area share 48.5% painted → 51.6–54.3%);
   HVO collapses in the west. The arc moves the wrong way.

---

## Recommendation

**NO-GO on the Herzegovina lever. Do not re-floor to 615/616.** The −24 SE-Herzegovina residual in
the (b) candidate is **not independently recoverable** with a Herzegovina-Corps defender lever:
strengthening that corps breaks the sacred Zvornik anchor through cross-corps reserve competition and
over-extends VRS in Krajina/western-Herzegovina, netting worse territory.

**The (b) candidate (625/712, anchors 30/30, §6 intact, K:W 1:3.73, shares 54.1/37.1/8.8) stands
unchanged as the re-floor candidate for owner sign-off.** The Herzegovina residual, if pursued later,
needs a different shape than a flat OOB bump — e.g. a *combined* lever that pairs the Herzegovina
strengthening with a paired `vrs_drina` reserve top-up to protect the Zvornik pin (the same coupling
pattern noted in the Zvornik-v6 memory entry), run and signed off serially as its own lane. That is
out of scope for this single-lever measurement and is explicitly NOT bundled here.

---

## Verification

- `tsc --noEmit`: PASS (data-only change).
- Baseline (b) 188w reproduced **exactly**: 625/712, anchors 30/30, zvornik=RS, §6 fall — confirms harness.
- Runs: `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n0` (b baseline), `…_n1` (+800),
  `…_n3` (+400); 40w `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2` (+800).
- Determinism: no Math.random/Date.now; sorted iteration preserved; no avoided_osids; no OSID overrides.
- Change is isolated to `data/source/oob_brigades.json` (7 `vrs_herzegovina` `initial_personnel` values).
  Lever A + the Zvornik pin from (b) are untouched.
