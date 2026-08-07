# Brčko corridor regression — de-saturation flipped op:brcko:brcko; OOB data bug + RS force-density knot; interim patchwork

**Date:** 2026-08-07
**Status:** Regression traced to root; a genuine OOB data-bug fix found + kept; the clean data fix does NOT fully hold (RS corridor is structurally over-subscribed — the deferred RS thin-force problem); an **explicit interim PATCHWORK** (`reactive_full_weight_anchors` flag) greenlit by the owner to restore `op:brcko:brcko` RS / 31 anchors on main, with the root fix owned by Phase 4 + the RS force-density lane. Consolidates the trace, OOB audit, and disposition.

## The regression (and how it hid)

The exhaustion de-saturation (`41b5c31cd`, adopted + merged) reported `matched_osids` **630 → 634** and was documented as "§6 anchors byte-identical." That was **wrong**: the validation checked only the *enclave* §6 anchors, not the full 31-anchor `anchor_checks` set, and the **+4 NET matched masked a corridor-anchor loss**. Verified against run summaries:
- **n152** (pre-de-saturation): 31/31 anchors, `op:brcko:brcko` = **RS**.
- **n153** (de-saturation): **30/31**, `op:brcko:brcko` = **RBiH**.

RS lost the **Brčko town** OSID. This is not marginal: Brčko is the **throat of the Posavina corridor** — RBiH holding the town severs RS's east–west link regardless of the surrounding OSIDs (RS held Brčko through Dayton; it was so contested it went to post-war arbitration). Lesson recorded (`memory/feedback_net_matched_masks_anchor_flips`): **never accept a net matched delta as "anchors held" — diff the full `anchor_checks` set per-anchor.** The Phase 0.2 candidate-report tool now names the failing anchor ("30/31 (fail: op:brcko:brcko)") to close this visibility gap.

## The trace — a turn-58 single-battle knife-edge

Comparing n152 (pre) vs n153 (de-sat), exactly ONE extra control event: **turn 58, `op:brcko:brcko` RS→RBiH** (battle `58:op:brcko:brcko:arbih_215th_vitezka_mountain:rs_1st_bijeljina_panthers`). All 12 other Brčko-municipality OSIDs byte-identical. Two de-saturation ripples compound:
1. **PRIMARY (attacker / op-selection):** under the de-saturated curve, RBiH's mid-war exhaustion is lower (the asymptotic climb keeps it below the cap through wk58 where the hard clamp would have pinned it), giving the **ARBiH 2nd Corps the operational tempo to OPEN a Brčko offensive it never launched pre-de-saturation** (adds `op:brcko:brcko` as a Main-Axis objective wk56→58, 7+ brigades). This is the deeper reason the "sub-cap byte-identical" claim was imperfect: factions climb into the near-ceiling zone *mid-war*, so the soft-stop *does* nudge mid-war combat.
2. **DEFENDER (seals it):** the RS anchor defender (Bijeljina Panthers, adjacent at `skakava_donja`) runs ~5 morale lower mid-war and loses the wk58 battle.

## The OOB data bug (found + fix KEPT)

The guard failed at first because **no RS brigade RESIDES on `op:brcko:brcko`** (unlike Zvornik, whose resident brigade the guard simply keeps home). Root: a genuine, self-inconsistent OOB data bug — `rs_1st_posavina_infantry` has `home_mun="brcko"` + `home_settlement="Brčko"` but `home_osid="op:bosanski_samac:crkvina_2"`, wrongly co-located with `rs_2nd_posavina_light_infantry` (whose HQ genuinely *is* Bosanski Šamac). Historical: **1st Posavina Infantry Brigade, HQ Brčko** (BB1 p.463; `VRS_ORDER_OF_BATTLE_MASTER.md:600`), East Bosnian Corps, whose mission was literally *"blocking ARBiH 2nd Corps from cutting the corridor"* (OOB master:234). **Fix (kept): correct `home_osid` → `op:brcko:brcko`.** Note: `op:brcko:brcko` starts RS via an explicit `osid_control_override` (census would be RBiH — Brčko had a ~44% Muslim plurality in 1991; the override models the May-1992 VRS capture); the OOB fix touches residence/defense, **not** initial control.

## Why the clean fix doesn't fully hold — RS force-density knot (honesty-gate audit)

Correcting 1st Posavina to Brčko holds Brčko (corridor 5/6 → 6/6) **but flips Doboj + Gračanica** (`op:doboj:boljanic_2`, `op:gracanica:petrovo_2`), matched 634 → 613. The honesty-gate OOB audit the owner required confirms there is **no additional data fix**:
- East Bosnian Corps sim roster matches the OOB master **exactly** (all 10 brigades present).
- Doboj/Gračanica/Ozren have their **correct resident garrisons** (`rs_2nd_armored` + `rs_3rd_ozren` on Doboj; `rs_1st_ozren` on Gračanica), consistent placements — no mis-placement, no missing unit.
- The 1st Posavina mis-placement was the ONLY corridor data bug; it was doing **double duty** — its reactive contribution from Bosanski Šamac was the margin holding Doboj/Gračanica.

So RS is **structurally too thin** to hold Brčko + Doboj + Gračanica simultaneously on correct data. This is the same **RS force-density / cohesion-railroad asymmetry** root-caused and deferred to post-1.0 (`docs/40_reports/20260807_RS_COHESION_RAILROAD_ROOT_CAUSE.md`), surfacing here as a corridor knot. Per the owner's honesty gate, this is exactly the case where a data move must NOT be forced — the interim patchwork is the accepted stopgap.

## Disposition — interim PATCHWORK (owner-directed), root fix deferred

- **KEEP** the `1st-Posavina → Brčko` OOB correction (a genuine data-bug fix, historically right).
- **PATCHWORK (greenlit 2026-08-07, owner-directed to be flagged as such):** a minimal, data-driven `reactive_full_weight_anchors: [op:brcko:brcko]` scenario flag — the listed anchors' existing nearby sector defenders contribute at **full weight** (distance-decay removed) WITHOUT firing the corridor-robbing garrison-pin and WITHOUT moving a brigade, so Brčko survives the wk58 battle. Determinism-safe, minimally scoped.
- **This is explicitly not the real fix.** It masks the RS corridor over-subscription. The root fix is **Phase 4** (exhaustion input-factor re-pacing so the mid-war curve stops nudging this combat) **+ the post-1.0 RS force-density re-manning**. When those land, the patch must be revisited — ideally removed once the corridor is correctly manned and paced so Brčko holds organically. Recorded in `MASTER_ROADMAP.md` R6 + the exhaustion/scoring redesign plan Phase 4.
- **Revert was rejected:** unwinding the de-saturation to get Brčko back would violate the newly-landed Engine Invariants **§8.6** asymptotic-bounding canon and lose the keystone `dead_weeks` 57.4%→0.5% win.

## Probe ledger (branch `codex/rs-cohesion-floor-probe` / `codex/brcko-anchor-guard`, RETIRE commits kept for reproducibility)
- Probe 1 (data `must_hold` pin): RETIRE — robs the corridor (matched 619, new anchor break), still loses Brčko (no resident to pin).
- Probe 3/3b (OOB `home_osid` → Brčko): correct data fix, holds Brčko + corridor 6/6, BUT trades Doboj+Gračanica (matched 613). Kept as the data-bug correction; can't stand alone.
- Probe 4 (`reactive_full_weight_anchors` flag): the adopted-candidate patchwork (building at time of writing).
