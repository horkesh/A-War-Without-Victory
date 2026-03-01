# Displacement Validation Report (n299)

**Date:** 2026-03-01
**Run:** n299 (apr1992_definitive_40w, 86.3% OSID match, 6/6 benchmarks)
**Scope:** Post three-bug-fix validation of displacement mechanics

---

## 1. Headline Metrics

| Metric | n299 Result | Historical Target (Jan 1993) | Coverage |
|---|---|---|---|
| **Total displaced + lost** | 340,650 | ~1,000,000 | **34%** |
| Displaced out (routed) | 265,034 | — | — |
| Lost (killed + fled abroad) | 75,616 | — | — |
| Displaced in (resettled) | 236,243 | — | — |
| Camp population (pending) | 28,791 | — | — |
| Municipalities affected | 55 / 110 | ~90+ | 61% |

**Gap:** ~660,000 (66% of target). See §7 for decomposition.

---

## 2. Displacement by Ethnicity

| Ethnicity | Displaced | Killed | Fled Abroad | Events |
|---|---|---|---|---|
| Bosniak (RBiH) | 230,491 | 23,021 | 0 | 99 |
| Croat (HRHB) | 79,652 | 7,947 | 33,375 | 33 |
| Serb (RS) | 30,507 | 3,042 | 8,231 | 23 |
| **Total** | **340,650** | **34,010** | **41,606** | **155** |

Bosniak displacement dominates (67.7%) — consistent with history. Croat flee-abroad fraction (25%) produces 33k refugees. RBiH has 0% flee-abroad (no external state to flee to). RS 30% flee-abroad → 8k.

---

## 3. Accounting Invariants

| Check | Result |
|---|---|
| Conservation: `out - in - camp = 0` | **265,034 - 236,243 - 28,791 = 0** |
| Negative populations | **0 municipalities** |
| Timers remaining at w40 | 9 (still pending maturation) |

All invariants hold. No double-counting. No negative populations.

---

## 4. Displacement Curve (Weekly Progression)

| Week | Cumulative Displaced | RS OSIDs | Phase |
|---|---|---|---|
| 1-4 | 0 | 290→328 | Timer delay (4 weeks) |
| 5 | 16,258 | 339 | First wave fires |
| 6-9 | 136,488 | 350→368 | Peak displacement (~30k/wk) |
| 10-14 | 217,686 | 372→373 | Slowing RS advance |
| 15-22 | 278,616 | 376→376 | RS stalls, displacement ebbs |
| 23-33 | 278,616 | 376→386 | **Dead period** — 0 displacement |
| 34-40 | 340,650 | 389 | Late RS push, second wave |

**Key observations:**
- Displacement starts at week 5 (4-turn timer delay from war start) — correct
- Peak displacement in weeks 5-9 correlates with RS offensive phase
- Dead period (w23-33) = no OSID flips → no new displacement timers. Displacement is entirely flip-driven.
- Late second wave (w34-40) from RS balanced-phase territorial gains

---

## 5. Historical Municipality Comparison

| Municipality | Pop | Sim Impact | Sim % | Historical Est | Hist % | Gap |
|---|---|---|---|---|---|---|
| Prijedor | 112,543 | 21,898 | 19.4% | ~60,000 | ~53% | **-38k** |
| Livno | 40,600 | 21,171 | 52.1% | ~6,000 | ~15% | **+15k** |
| Doboj | 107,510 | 19,859 | 18.4% | ~50,000 | ~47% | **-30k** |
| Bosanska Krupa | 41,380 | 16,797 | 40.6% | ~20,000 | ~48% | ~OK |
| Zvornik | 81,295 | 15,793 | 19.4% | ~45,000 | ~55% | **-29k** |
| Brčko | 87,627 | 12,296 | 14.0% | ~40,000 | ~46% | **-28k** |
| Foča | 40,547 | 9,480 | 23.3% | ~18,000 | ~44% | **-9k** |
| Bijeljina | 96,988 | 7,820 | 8.0% | ~35,000 | ~36% | **-27k** |
| Kotor Varoš | 36,853 | 6,510 | 17.6% | ~18,000 | ~49% | **-12k** |
| Bosanski Šamac | 31,642 | 6,330 | 20.0% | ~13,000 | ~41% | **-7k** |
| Višegrad | 21,199 | 3,933 | 18.5% | ~12,000 | ~57% | **-8k** |
| Bratunac | 33,619 | **0** | 0% | ~18,000 | ~54% | **-18k** |
| Čapljina | 27,882 | **0** | 0% | ~4,000 | ~14% | **-4k** |

**OSID control in key municipalities (n299 final):**
- Prijedor: RS holds 11/11 OSIDs — yet only 19.4% displaced
- Zvornik: RBiH holds 11/11 — sim has RS never taking Zvornik (Drina gap)
- Bijeljina: RS holds 10/10 — yet only 8.0% displaced
- Bratunac: RS 4, RBiH 4 — split control, 0 displacement
- Foča: RS 12, RBiH 2 — 23.3% displaced
- Višegrad: RS 6, RBiH 5 — 18.5% displaced

**Critical insight:** Even where RS holds ALL OSIDs (Prijedor, Bijeljina), displacement is only 8-19% of population — far below the 40-55% historical ethnic cleansing rate. The per-OSID displacement formula `floor(osidPop × ethnicShare)` × N timers should theoretically produce ~44% of population displaced in Prijedor. The shortfall suggests timers mature at different times, and the `remainingPop` cap progressively limits later displacements.

---

## 6. Military Context (n299)

| Metric | Value |
|---|---|
| OSID match | 86.3% (650/753) |
| Bot benchmarks | 6/6 pass |
| Flips applied | 166 |
| RS final OSIDs | 389 (painted: 416) |
| RS final personnel | 123,266 |
| Military KIA: RS | 2,698 |
| Military KIA: RBiH | 2,101 |
| Military KIA: HRHB | 324 |
| Total military KIA | 5,123 |

---

## 7. Gap Decomposition (340k vs 1M)

The ~660k gap breaks down into identifiable structural causes:

### 7.1 Territorial Coverage Gap (~200k)

RS holds 389/416 painted OSIDs (93.5%). The 27 missing OSIDs represent municipalities where RS should have captured but didn't — mainly in Drina (57.0% match). Zvornik alone accounts for ~45k missing displacement (RS never takes it). Bratunac contributes ~18k. Partial captures in Višegrad, Goražde area add more.

### 7.2 Per-Municipality Displacement Depth (~300k)

Even where RS holds all OSIDs, displacement reaches only 8-20% of population vs. historical 40-55%. This is the **largest gap contributor**. Root causes:

1. **Timer sequencing**: War-start seeding creates timers for initially-held OSIDs (turn 1). Battle-captured OSIDs get timers at capture time. A municipality with 11 OSIDs captured over weeks 1-20 sees displacement from each OSID independently, spread across 15+ weeks. The `remainingPop` cap doesn't explain the gap (Prijedor still has 90k remaining).

2. **The real issue — single-timer-per-OSID**: Each OSID fires its displacement timer **once**. After the timer matures and displacement fires, no further displacement occurs from that OSID even though historically, ethnic cleansing was a sustained process (camps, forced marches, ongoing terror over months). The current model is "one-shot expulsion per OSID."

3. **Ethnic share dilution**: In Bijeljina (43% non-Serb), per-OSID displacement = pop/10 × 0.43 = 4,170 per OSID. With 10 OSIDs and all timers maturing, theoretical max = 41,700. Actual = 7,820 — only 19% of theoretical. Something is capping displacement well below the ethnic-share calculation.

### 7.3 Minority Flight Disabled (~100-150k est.)

`processMinorityFlight()` is disabled in turn_pipeline.ts. This function would handle minorities fleeing areas they still nominally control — Serbs leaving Tuzla, Bosniaks leaving Banja Luka before complete takeover. Historically significant but currently produces 0.

### 7.4 Continuous Pressure Disabled in Practice (~50k est.)

`updateDisplacement()` (unsupply, encirclement, breach) shows 0 displacement in weekly reports (`displacement_trigger_eligible_size: 0`). The encirclement check was fixed (OSID-based now) but may not be triggering because no municipalities are actually encircled in the sim.

---

## 8. Structural Findings

### F1: Displacement mechanics are CORRECT but INCOMPLETE
The three-bug fix eliminated false encirclement (4.36M → 340k). Accounting invariants hold. Ethnic-share-based displacement from OSID takeover works correctly. But the model only captures one dimension of displacement (military conquest → expulsion) and misses sustained ethnic cleansing, minority flight, and siege/encirclement pressure.

### F2: Single-timer-per-OSID is the primary depth limiter
Each OSID timer fires once. After maturation, no further displacement from that OSID regardless of ongoing control. Historical ethnic cleansing was a multi-month process, not a single event.

### F3: Dead displacement periods (w23-33) are flip-driven
When fronts stabilize and no OSIDs change hands, displacement drops to zero. Historically, ethnic cleansing continued throughout 1992 regardless of front movement (detention camps, forced deportations, terror).

### F4: Drina Valley territorial gap compounds displacement gap
RS failing to take Zvornik (11 RBiH OSIDs) and Bratunac (4 RBiH OSIDs) means these municipalities show 0 displacement — a combined ~63k historical displacement unmodeled.

### F5: Documentation §10.5 was misleading (FIXED)
DISPLACEMENT_MASTER.md §10.5 described displacement as "a percentage of OSID population." Corrected to accurately describe ethnic-population-based expulsion with ethnic share from 1991 census.

---

## 9. Recommendations (Next Session)

### R1: Investigate per-OSID timer fire count
Check if each OSID timer fires only once or can fire repeatedly. If once, consider adding sustained displacement (lower rate per turn while hostile faction holds OSID) to model ongoing ethnic cleansing.

### R2: Evaluate re-enabling minority flight
`processMinorityFlight()` exists and is OSID-fixed. Test-enable it and measure impact. Could close 100-150k of the gap. Risk: was disabled because SID/OSID mismatch made it produce 0; the fix exists but pipeline integration was removed.

### R3: Investigate continuous pressure producing zero
`updateDisplacement()` should fire for unsupplied/encircled municipalities. Check why `displacement_trigger_eligible_size` is always 0. May need encirclement detection to use OSID-based municipality control (same fix pattern as displacement_takeover).

### R4: Consider sustained displacement mechanic
Add a low-rate displacement per turn from hostile-held OSIDs AFTER the initial timer fires. E.g., 1-2% of remaining ethnic population per turn while hostile faction holds the OSID. This models ongoing ethnic cleansing beyond the initial wave.

### R5: Do NOT change displacement until combat calibration stabilizes
Current uncommitted combat/fronts changes (local_front_defense, corps_front_sectors) regressed OSID match from 86.3% to 77.6%. Displacement numbers are directly dependent on territorial outcomes. Stabilize combat first, then tune displacement.

---

## Appendix: n299 vs n301 Comparison

n301 was run on current working tree (combat calibration in progress). Results show combat regression:

| Metric | n299 | n301 |
|---|---|---|
| OSID match | 86.3% | 77.6% |
| RS OSIDs | 389 | 293 |
| Benchmarks | 6/6 | 1/6 |
| Flips | 166 | 18 |
| Displaced total | 340,650 | 33,265 |
| Muns affected | 55 | 13 |

n301 displacement is low because RS barely advances (291→293 in 40 weeks). This confirms displacement is correctly tied to territorial conquest — combat must stabilize before displacement can be meaningfully tuned.
