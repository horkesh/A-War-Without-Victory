# Design B (late-war exhaustion op-launch drag) — 188w First-Fire Measurement

**Date:** 2026-06-10
**Branch:** `feat/exhaustion-drag-designB` (head `8cce5b8d5`)
**Flag:** `AWWV_EXHAUSTION_DRAG_V2` (default OFF)
**Lever:** `computeFactionExhaustionDrag` in `src/sim/combat/commander/plan.ts`
**Analyst:** scenario-creator-runner-tester
**Status:** TERRITORY-INERT at floor `0.55`. **HELD — no re-floor. Next-lever recommendation below.**

> Runs were completed by the orchestrator; this report is measurement + verdict only. No re-run, no merge.

---

## 0. TL;DR

- **Did op-launch behavior change? NO** (no launch decision flipped). The ON hash moved
  (`90cfbfc4c0513f89` vs OFF `345e044b7642aeab`) via **exactly one persisted field**: the
  final-turn (w188) `decision_trace` of corps `hvo_central_bosnia`, where a **losing**
  `launch_opportunity` candidate's score rose `0.1986 → 0.2361`. It still lost to `hold_line`
  (0.32) in both runs. Nothing else moved.
- **Why territory inert?** A **compound of cases (a)+(d), with a sign bug.** The drag
  variable enters the launch score **additively and positively** (`+0.15·capacity·drag`),
  so a *higher* value = *more* willing. Late-war the raw accumulator **saturates to its
  10000 cap (level 100)** for all three factions by ~week 70 and stays pinned to w188.
  At saturation the ON ramp returns its floor **0.55**, but the legacy path returns **0.3**.
  **0.55 > 0.3 ⇒ ON is a WEAKER drag than legacy ⇒ it *raises* late-war launch willingness,
  the opposite of intent.** And even so it never crossed any launch threshold → 0 OSID change.
- **§6 OK.** Srebrenica + Žepa enclaves fall (RBiH→RS) identically in OFF and ON
  (`control_delta` byte-identical). Triggered ops, structurally exempt. No rupture-timing shift.
- **Territory delta: 0.** `control_delta` byte-identical OFF==ON. 649 floor unchanged.
- **Recommended next one-change:** redesign the lever attach-point (current one is sign-inverted
  AND saturates). See §6.

---

## 1. Raw artifacts

| artifact | OFF md5 | ON md5 | identical? |
|---|---|---|---|
| `control_delta.json` | `a4e819fa…` | `a4e819fa…` | **YES** |
| `operation_aars.json` | `8e6927e6…` | `8e6927e6…` | **YES** |
| `formation_delta.json` | `ee6d80c0…` | `ee6d80c0…` | **YES** |
| `destroyed_brigades.json` | `3ad12996…` | `3ad12996…` | **YES** |
| `weekly_report.jsonl` | `8d1f5d10…` | `8d1f5d10…` | **YES** |
| `watched_operations.json` | — | — | **YES** (byte-equal) |
| `run_summary.json` | `16e7dd32…` | `6a5616bf…` | NO — **only** `final_state_hash` differs |
| `final_save.json` | `ffbbeb03…` | `a461584…` | NO — **only 3 numbers** differ (below) |

**final_save diff (the ENTIRE delta — 10 lines, 3 values):**
```
decision_trace path: political_controllers/.../hvo_central_bosnia/commander_state/decision_trace
  candidate launch_opportunity:188:corps
    score:                 0.1986   →  0.23609999999999998
    exhaustion_penalty:    0.045    →  0.0825
    faction_exhaustion_drag: 0.3    →  0.55
```

`final_state_hash`: OFF `345e044b7642aeab` (== current post-#402 188w floor → flag-off inert,
expected) · ON `90cfbfc4c0513f89`.

---

## 2. Did the drag change op-launch behavior? — **NO**

- **No operation launched/failed differently.** `watched_operations.json`, `operation_aars.json`,
  `formation_delta.json`, `destroyed_brigades.json`, `weekly_report.jsonl`, `control_delta.json`
  are all byte-identical OFF==ON.
- **The same ops fired; no launch decision flipped.** The drag changed exactly one *willingness
  score* — and on a **losing** candidate. In the only changed `decision_trace` (corps
  `hvo_central_bosnia`, w188), the winning intents are `hold_line` (0.32) and
  `thin_quiet_sector` (0.32); `launch_opportunity` is 0.1986 (OFF) / 0.2361 (ON) — **below the
  winner in both runs.** The nudge was not large enough to flip the argmax, so no operation was
  authorized differently.

**What moved the ON hash:** only the persisted final-turn `decision_trace` of one corps. The
score-breakdown (including `faction_exhaustion_drag` and the derived `exhaustion_penalty`) is
serialized into the save. Because the drag value changed for that record, the hash moved while
every behavioral artifact stayed identical. **The hash motion is a serialized-intent-score
artifact, not a behavior change.**

---

## 3. WHY territory did not move — case (a)+(d) + a sign inversion

Three independent facts, all from the run data:

**(d) The accumulator saturates early and stays pinned — the ramp band is barely occupied.**
`weekly_report.factions[].exhaustion` (raw 0..10000; level = raw/100):

| week | HRHB lvl | RBiH lvl | RS lvl |
|---|---|---|---|
| 24 | 27.8 | 34.4 | 47.5 |
| 36 | 44.3 | 49.2 | 71.5 |
| 48 | 66.6 | 62.5 | 95.5 |
| 60 | 87.6 | 75.7 | 100.0 |
| 72 | 100.0 | 88.9 | 100.0 |
| 84–188 | 100.0 | 100.0 | 100.0 |

First crossings: RS ≥65 @w33, ≥85 @w43 · HRHB ≥65 @w48, ≥85 @w59 · RBiH ≥65 @w51, ≥85 @w69.
**From ~week 70 to 188 (≈118 of 188 weeks — the whole late-war over-advance window) every
faction is pinned at level 100**, i.e. above `collapsing` (85), so the ramp returns its **floor
0.55** flat. The graded 65→85 band each faction passes through is only ~10–18 weeks and is
*early-mid* war, not the late-war over-advance window the design targets.

**(a) At saturation the floor is the wrong direction.** The drag enters the launch score as a
**positive additive term**:
```
score += 0.15 * corpsExhaustionCapacity * factionExhaustionDrag    (plan.ts:549)
```
So **higher `factionExhaustionDrag` ⇒ higher launch score ⇒ MORE willing.** Late-war:
- legacy (`max(0.3, 1 - raw/600)`) saturates to **0.3** (raw ≥ 4200, ~week 5+)
- Design-B ON ramp at level ≥85 returns floor **0.55**

`0.55 > 0.3` ⇒ **ON makes a spent faction MORE willing to launch than legacy did**, the inverse
of the stated intent ("a spent faction launches fewer/weaker offensives"). This is why the one
persisted intent score *rose* (0.1986 → 0.2361). The lever as wired is a willingness *gain*, not
a *drag*; lowering the floor toward 0.3 would only recover the legacy effect, and going below 0.3
would be a *new* late-war drag — but it would apply nearly flat across all ~118 saturated weeks,
not as the intended graded ramp.

**(b)/(c) not the binding cause here.** The over-advance ops we care about did not even reach the
willingness comparison as the deciding factor in the changed trace (hold_line won), and the
triggered §6 ops are exempt by construction — but the *binding* reason territory is flat is (d)
saturation + (a) sign/floor, established directly above.

**Verdict: case (d) (signal saturates → ramp degenerates to a flat floor for the whole late-war
window) compounded by case (a) (floor 0.55 is on the wrong side of the legacy 0.3, so even where
it applies it raises rather than lowers willingness).** Not (b): the lever *does* reach the
intended intent types. Not primarily (c).

---

## 4. §6 / G2 check — **PASS**

`control_delta` is byte-identical OFF==ON, so §6 outcomes are by construction unchanged. Direct
read of the ON `control_delta.flips`:
- **Srebrenica enclave FALLS:** `op:srebrenica:srebrenica_2` + all sub-OSIDs (bostahovine_2,
  brezovice_2, donji_potocari_2, luka_2, ljeskovik_2, milacevici, osmace_2, radovcici, suceska,
  sulice_2 …) flip **RBiH → RS**.
- **Žepa FALLS:** `op:rogatica:zepa_2` flips **RBiH → RS**.
- Rupture timing: unchanged (control_delta identical; triggered ops never route through the
  intent-scoring lever).
- G1: lever writes no per-OSID controller; faction-scalar only. Untouched.

---

## 5. Territory delta — **0 OSID**

`net_control_counts_after` (OFF == ON, total 712):

| controller | before | after | delta |
|---|---|---|---|
| HRHB | 104 | 106 | +2 |
| RBiH | 319 | 285 | −34 |
| RS | 289 | 321 | +32 |

`control_delta` byte-identical ⇒ **0 OSID change ON-vs-OFF**, anchors unchanged, 649 historical-
match floor unchanged. OFF run hash `345e044b7642aeab` == current post-#402 188w floor (flag-off
inert, expected). Focused unit suite `tests/commander/exhaustion_drag.test.ts` 28/28 green;
flag-OFF byte-identity vs legacy `1−raw/600` asserted.

---

## 6. Which case + next one-change lever

**Case: (d) + (a).** The lever is attached to a signal that saturates to its cap for ~118 of 188
weeks, so the ramp degenerates to a flat floor late-war; and that floor (0.55) sits on the wrong
side of the legacy saturation value (0.3) of an *additive, sign-positive* score term, so where it
does apply it *raises* late-war willingness.

**Do NOT** simply "lower the floor / steepen the ramp" as the headline fix — that only treats (a)
and leaves (d): below ~week 70 nothing is in the band, and from ~week 70 on it is a flat constant,
never a ramp. The ramp shape cannot express itself against a saturated signal.

**Recommended next one-change (pick ONE, re-run 188w OFF/ON):**

1. **PREFERRED — re-attach to an un-saturated late-war signal.** Drive the drag off a signal that
   keeps *moving* late-war instead of the capped `war_exhaustion` accumulator — e.g. the recovered
   *rate* of exhaustion gain, cumulative casualties-vs-mobilized, or corps fatigue/manpower
   deficit trend. The current `war_exhaustion` field is structurally unusable for a *ramp* because
   it pins at 10000 by mid-war. This is the real fix for (d).

2. **If staying on this attach-point: invert the sign and push the floor below 0.3.** Make the
   late-war multiplier *reduce* the launch term (floor e.g. 0.15–0.20, applied as a true penalty),
   so a spent faction is genuinely less willing than legacy. This treats (a) but accepts a flat
   late-war tax (no graded ramp) because of (d). Cheaper, but a blunt instrument — and risks
   regressing the western/late-war anchors that *depend* on those late offensives landing (Sana /
   Storm / Mistral follow-ons). Bound it and watch those anchors.

3. **Different lever entirely (L1 tempo/power, or op-tempo throttle).** If the goal is "thinner
   over-advances," a per-op tempo/power drag at execution (not the launch-intent argmax) would bite
   on the *depth* of advances even when the op still launches — addressing the observed reality
   that the launch decision rarely flips but advances over-reach.

**Re-floor question for the panel (framed, NOT decided):** Design B as built is territory-inert at
floor 0.55, so **there is nothing to re-floor** — the OFF and ON 188w outputs are control-identical
and OFF already equals the current floor `345e044b7642aeab`. The open decision is **which next
lever** (1/2/3) to authorize for the next one-change measurement run, given that the current
attach-point (capped `war_exhaustion` + sign-positive additive launch term) cannot express a
graded late-war drag. Recommend **option 1** (un-saturated signal) as the one-change to try next.

---

## 7. Provenance

- OFF: `runs_dragB_off/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/`
- ON:  `runs_dragB_on/apr1992_definitive_188w__acb538b04d79af3c__w188_n0/`
- Design B commit: `8cce5b8d5` (plan.ts lever + scenario_runner env-gate + exhaustion_drag test).
  The manifest / CALIBRATION_MASTER / war-weariness UI files on this branch belong to the
  already-merged **#402** Design-A feel-surface, not to Design B.
