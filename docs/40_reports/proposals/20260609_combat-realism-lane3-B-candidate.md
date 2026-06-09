# Lane-3 (b) — Lever A + Zvornik garrison-pin — RE-FLOOR CANDIDATE

**Status:** candidate for owner sign-off. NOT merged, NOT re-floored. Branch `feat/lane3-b-lever-a-zvornik-pin` pushed.
**Date:** 2026-06-09
**Worktree base:** origin/main `ddee39e2` (one commit ahead of floor commit `d311eeac`/hash `5f57d172`)
**Author:** build+measure agent (deterministic; no Math.random/Date.now; no avoided_osids; no OSID overrides)

## The composed change (TWO coupled edits)

1. **Lever A** — `src/sim/combat/combat_math.ts` `OUTCOME_ATTACKER_MOD`:
   `decisive_victory` 1.3→**1.0**, `victory` 1.4→**1.2**. Cheaper clean-victory attacker
   casualties pull the per-faction killed-share arc toward historical ~52/38/10.

2. **Zvornik-protect** — `src/sim/combat/brigade_front_distribution.ts`
   `pinGarrisonToMustHoldFrontEdge`: the entrenchment exclusion (Guard 5,
   `ENTRENCHMENT_REDISTRIBUTION_THRESHOLD`) is **dropped for the must-hold backfill only**.
   A scenario-authored must-hold OSID with ZERO active defenders is the corps's highest-priority
   position, so an entrenched same-corps rear reserve is now eligible to re-garrison it. All other
   guards (corps-scoped, idle, ≥400 personnel, friendly+undefended, BFS-reachable ≤20 hops,
   deterministic) are unchanged. Phase-A front dispersion still respects the entrenchment threshold.
   Test `tests/garrison_pin_must_hold_front_edge.test.ts` updated (former GUARD-5 case inverted).

### Why the existing pin failed under Lever A (diagnosis)

Under Lever A's cheaper ARBiH attacks, the Zvornik garrison brigade `rs_1st_vlasenica` was
attritted to **personnel 0 / inactive at ~week 88**, leaving `op:zvornik:zvornik` with zero
active defenders. The garrison-pin's undefended-detection fired correctly, but **every eligible
`vrs_drina` reserve (`rs_1st_birac`, `rs_1st_bratunac`, `rs_1st_podrinje`, `rs_1st_zvornik`,
`rs_5th_podrinje`; all p≥800, idle) had entrenched in the deep south** (Srebrenica/Rogatica/
Višegrad). Guard 5 excluded every one of them, so the pin was starved of candidates and ARBiH
`arbih_245th_mountain` (p1800) walked into a **null-defender** objective at week 91
(`battle_id 91:op:zvornik:zvornik:arbih_245th_mountain:null`, outcome `victory`, captured 5 arty
+ 3 tanks). In the baseline (attacker mod 1.3/1.4) Zvornik is **never even attacked** — the
garrison never collapses, so the pin's entrenchment guard never matters.

## Results — 188w (calibration horizon of record)

| Metric | Floor (baseline) | Lever A solo | **Composed (b)** |
|---|---|---|---|
| Spatial match /712 | **649** | 623 (−26) | **625 (−24)** |
| Anchors | 30/30 | 29/30 (zvornik FAIL) | **30/30** |
| `op:zvornik:zvornik` | RS | RBiH ❌ | **RS** ✅ |
| `op:lukavac:brijesnica_donja_2` | RBiH | RBiH | **RBiH** ✅ |
| Killed total | 102,621 | 102,115 | 99,004 |
| ARBiH killed / share | 57,732 / 56.3% | 53,433 / 52.3% | **53,609 / 54.1%** |
| VRS killed / share | 36,397 / 35.5% | 39,847 / 39.0% | **36,691 / 37.1%** |
| HVO killed / share | 8,492 / 8.3% | 8,835 / 8.7% | **8,704 / 8.8%** |
| K:W | 1:3.73 | 1:3.70 | **1:3.73** |
| Srebrenica | 13/13 RS | 13/13 RS | **13/13 RS** ✅ |
| Žepa | 1/1 RS | 1/1 RS | **1/1 RS** ✅ |
| OSID counts (RBiH/RS/HRHB) | 285/321/106 | 300/307/105 | **303/303/106** |
| final_state_hash | a4bab2d7 (this WT) | 93e61910 | **1a5ec6f2** |

(Baseline hash `a4bab2d7` on this worktree ≠ stated floor hash `5f57d172` because the worktree is
one commit ahead of the floor commit; the floor's *values* — 649, 30/30, killed 102,621
56.3/35.5/8.3, K:W 1:3.74, zvornik=RS, §6 fall — reproduced **exactly**, confirming the harness.)

## Results — 40w (calibration health-check)

| Metric | Baseline 40w | **Composed (b) 40w** |
|---|---|---|
| Spatial match /712 (vs jan1993) | 655 | **655** (identical) |
| Per-OSID drift | — | **0 newly-off, 0 recovered** |
| Anchors | 30/30 | **30/30** |
| `op:zvornik:zvornik` | RS | **RS** ✅ |
| Killed total | 18,821 | 18,956 |
| Shares (RBiH/RS/HVO) | 60.9/26.9/12.2 | 66.9/23.1/10.0 |
| K:W | 1:3.81 | 1:3.80 |
| final_state_hash | 7117262183e10077 | **a3e69cf53ec6242f** |

**40w is territory-byte-identical (655 = 655, zero OSID drift).** The composed change moves only
casualty composition + hash at 40w; the entire territorial effect is in the 188w window. (40w-share
direction differs from the 188w arc because the 40w window is dominated by the early VRS blitz;
the share target is a full-war arc, measured at 188w.)

## Four verdicts

1. **Shares on target?** PARTIAL-YES. Lever A solo lands the arc precisely (ARBiH 52.3 / VRS 39.0).
   Adding the Zvornik pin recovers VRS territory, which pulls the composed shares back to
   **ARBiH 54.1 / VRS 37.1 / HVO 8.8** — still a clear, on-direction move from the floor
   (56.3/35.5/8.3) toward the ~52/38/10 target, though not all the way (the recovered VRS-held
   Drina corridor means VRS takes fewer killed there). K:W flat at 1:3.73. Total killed 99k
   (within the accepted ~95–102k volume note).

2. **§6 held?** YES. Srebrenica 13/13 RS and Žepa 1/1 RS still FALL at 188w, in both Lever-A-solo
   and composed. The pin does not disturb §6.

3. **Zvornik recovered (30/30)?** YES. `op:zvornik:zvornik` is RS again and 188w anchors are back
   to **30/30** (brijesnica held RBiH). The garrison-pin tuning is the mechanism that recovers it.

4. **Residual territory delta vs 649?** **−24 (625/712).** The Zvornik lane is fixed, but Lever A's
   cheaper ARBiH attacks over-advance a NEW cluster, dominated by **SE Herzegovina highlands**:
   - **RBiH-where-RS-expected (22 OSIDs)** — Kalinovik ×7, Nevesinje ×5, Foča ×3, Gacko ×2,
     Konjic ×2, Mostar ×2, Trnovo ×1. (ARBiH over-advances the SE mountain front.)
   - **RS-where-RBiH-expected (7 OSIDs)** — Bosanski Petrovac ×3, Bihać (orašac) ×1, Ključ
     (sanica) ×1, Sanski Most ×2 (NW Krajina VRS over-hold).
   - **HRHB anomalies (3)** — Žepče, Bugojno (udurlije), B. Petrovac (jasenovac).
   - Recovered vs floor (+8): breza ×2, gorazde, ilijaš, kalinovik (golubići), konjic ×2, rogatica.

   **Follow-on lane (NOT in this candidate):** the SE Herzegovina RBiH-overadvance cluster
   (Kalinovik/Nevesinje/Foča/Gacko) is the dominant residual and the natural next OOB/op nudge —
   a Herzegovina-VRS (Hercegovina Corps) defender bump, mirroring the Zvornik pin logic for the
   south. This is a serial, one-change-per-run follow-up, NOT to be bundled here.

## Recommendation

The composed (b) change **delivers the design intent** (realistic killed-share arc moving toward
52/38/10, §6 intact, K:W flat, casualty realism) and **holds the sacred Zvornik anchor (30/30)**.
The cost is a **−24 OSID territory dip vs the 649 floor**, concentrated in a coherent, addressable
SE-Herzegovina cluster that a follow-on defender nudge can recover (same pattern as Zvornik).

Per "calibrate a HEALTHY engine, not the floor" (owner 2026-06-09), this is the expected shape:
Lever A makes the engine healthier (correct opposite-arc casualties), and territory is re-won
around it via targeted defender mechanisms. **This is a re-floor candidate to 625 IF the owner
accepts the share/realism gain at a −24 territory cost** — OR a stepping stone: ship Lever A + the
Zvornik pin together with the SE-Herzegovina follow-on as the next serial lane to claw territory
back toward (and past) 649. Owner decision required; do not re-floor without sign-off.

## Verification

- `tsc --noEmit`: PASS
- garrison-pin suite (`tests/garrison_pin_must_hold_front_edge.test.ts`, 14 tests): PASS
- must-hold contract / scenario-harness / sister-parity suites: PASS (65 tests)
- full vitest suite: **9673 passed / 32 skipped / 9 failed**. All 9 failures are the
  worktree-environment `'tsx' is not recognized` PATH issue (the worktree lacks `.bin`, flagged
  in the task) in subprocess/CLI/build tests ONLY —
  `audit_state_of_game_determinism`, `data_extract1990_h1_2_2`, `desktop_sim_bundle_smoke`,
  `political_control_audit_cli`, `startup_snapshot_contract`. None touch combat_math,
  brigade_front_distribution, or the garrison pin. Expected to pass in real CI (main checkout
  with `.bin` on PATH).
- Determinism: no Math.random/Date.now; sorted iteration preserved; no avoided_osids; no OSID overrides.
