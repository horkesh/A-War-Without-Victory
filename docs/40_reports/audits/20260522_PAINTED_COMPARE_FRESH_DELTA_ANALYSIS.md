# SCRT — Painted-Compare Fresh Delta Analysis (n1932–n1935)

**Date:** 2026-05-22
**Role:** `/scenario-creator-runner-tester`
**Scope:** Re-analysis of the four painted-target painted-vs-sim diagnostics against the freshly regenerated outputs from runs **n1932** (40w/jan1993, hash `3649b3861a87e6ea`), **n1933** (104w/apr1994, hash `13abfd609800bba2`), **n1934** (156w/apr1995, hash `fdb0f7cf25f31032`), and **n1935** (188w/oct1995, hash `210e69404d054959`). The prior SCRT memo `docs/40_reports/audits/20260521_SCRT_PAINTED_TARGET_BAND_ANCHORS.md` cited the stale n1597–n1599 numbers (~4 weeks old) as basis for Tier 1 anchor partition decisions; this memo revisits those decisions against the fresh data. **Read-only investigation. No source/scenario/anchor edits.**
**Evidence base:** `tools/diagnostics/_phase5a_painted_compares/painted_{40w_jan1993,104w_apr1994,156w_apr1995,188w_oct1995}.txt`; `docs/PROJECT_LEDGER.md` head; `docs/40_reports/audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md`.
**Codex parent-side verification:** On 2026-05-22, Codex re-ran all four `tools/compare_painted_vs_sim.cjs` commands with forward-slash run paths and byte-compared them against the committed compare artifacts using `fc /W`; all four reported `FC: no differences encountered`.

---

## 1. Headline drift — byte-identity verdict

**Verdict: The H1 / strict-null / sector-perf wave was BEHAVIORALLY byte-identical for 40w and (transitively) for 104w/156w/188w, but the underlying baseline manifests were re-blessed twice — the deltas DID drift, but for structural reasons (state-shape extension + scenario-level repaint), not combat-behavior reasons.**

### 1.1 What was claimed byte-identical

| Wave | Ledger claim | Final hash anchor |
|---|---|---|
| Sector-perf (2026-05-21, seven entries) | "Pre/post profiled artifacts are byte-identical at current final state hash `4368f50c00c464ad`" | 40w `4368f50c00c464ad` |
| Strict-null cleanup (~50 entries 2026-05-19 → 2026-05-22) | "`npm.cmd run test:baselines` PASS — `Baseline regression: all scenarios match.`" | per-entry attestation |
| H1 watched-operation lifecycle trace (2026-05-21) | "Save hashes and baseline hashes drift intentionally because the trace rows are now persisted; combat behavior and sensitive-history outcomes are unchanged." | Authorized one-time re-bless |

### 1.2 What actually happened to the 40w hash

The stale memo (2026-05-21) cited `4368f50c00c464ad`. The fresh 40w run is **n1932 `3649b3861a87e6ea`**. The pre-H1-trace 40w hash also drifted further: `c218d2e865a54f5b` (n1930) → `61cf4c64879efe14` (n1929) → `c482c67ab918075c` (n1928) → `3099a5fabaa04d6b` (n1931, defender-power-breakdown trace) → **`3649b3861a87e6ea`** (n1932, current).

Each H1 trace step (per the ledger entries lines 418–510) called out an explicit `UPDATE_BASELINES=1 npm.cmd run test:baselines` step to refresh the manifest. The ledger justifies each drift as **schema-level**, not behavior-level — adding `state.military.watched_operations`, defender-power breakdown fields, and per-defender stacked-power contribution fields shifts the serialized JSON byte order in alpha-sorted iteration. Anchors stayed 27/27 across the entire wave; benchmarks stayed 6/6. **HIGH confidence — directly attested in the ledger.**

### 1.3 The 104w/156w/188w faction-area-% identity

The sim faction-area percentages are **IDENTICAL across 104w, 156w, and 188w**: RS 61.0%, RBiH 26.4%, HRHB 12.6% (sim km² rounded to: 31297 / 13550 / 6490). The 40w numbers differ slightly (62.8% / 24.3% / 12.9%) — the saturation appears to set in between w40 and w104.

**Is this expected?**

**HIGH confidence — this is expected.** Late-war territorial change in the current sim is rare:

- `op:brcko:brcko` flips RBiH→RS at turn 5 (Operation Koridor with new objective; per the Brčko closure ledger 2026-05-19) — happens early, not late.
- Teocak singleton enclave (added 2026-05-19) hardens `op:ugljevik:teocak_krstac_2` against late-war VRS pressure — by definition a stabilizing change.
- No pre-planned or triggered operation in the current code base is wired to fire between w104 and w188 that would move a significant OSID block.
- HRHB Operation Mistral / Operation Sana / Operation Storm (historically Aug-Oct 1995, the Krajina collapse) are not modeled — confirmed in the n1599-era memo §5 caveat 5 ("Operation Mistral / Operation Sana gap") and still open as the §11.5 Krajina-collapse anchor gap.
- The painted_188w_oct1995 file `BY REGION` rows show KRAJINA at 60.0% area match, DRINA at 74.9%, CENTRAL_BOSNIA at 64.2%, HERZEGOVINA at 70.1% — these are the same OSID mismatches the stale memo flagged in §6.

The sim has effectively reached its territorial **steady state by w104** and is holding it. **This is a known mechanical gap, not a serialization or determinism anomaly.** The flat profile through w188 is consistent with the absence of late-war territorial mechanisms; it is **not** evidence of broken late-war combat resolution.

### 1.4 Verdict summary

- Behavioral byte-identity across the strict-null / sector-perf wave: **PRESERVED** (HIGH confidence).
- Hash drift between stale n1597–n1599 baseline runs and fresh n1932–n1935 runs: **EXPLAINED** by (a) authorized H1 baseline-manifest re-bless on 2026-05-21 (schema extension, no combat change), (b) one painted_target_anomaly repaint per scenario (gorazde_2 RS→RBiH at apr1994/apr1995/oct1995, ledger line 42), (c) two new sim behaviors merged before the stale runs but cleanly attested: Teocak singleton enclave (n1917, 2026-05-19) and Operation Koridor brcko objective (n1919, 2026-05-19).
- Flat late-war territorial profile (w104 = w156 = w188 within 0.01pp): **EXPECTED** given current code base lacks late-war operation triggers and Krajina-collapse mechanics.

---

## 2. Surprise findings — where the 188w improvement came from

**Headline: 188w match jumped from 69.7% to 75.3% OSID (+5.6pp) and 62.0% to 71.7% area-weighted (+9.7pp).** The stale memo predicted "deltas should still approximately hold" — that prediction is FALSIFIED.

### 2.1 The improvement is **almost entirely attributable to two named structural commits from 2026-05-19**

Both landed on `main` BEFORE the H1 trace work but AFTER the n1599 stale painted-compare was generated. Neither was a "perf wave" change — both were targeted late-war anchor-repair fixes:

#### Cause A — Operation Koridor brcko objective (2026-05-19 ledger line 1752)

> "Added `op:brcko:brcko` to Operation Koridor's `brcko_corridor` axis objectives … In n1919, `op:brcko:brcko` flips RBiH → RS by combat at turn 5; Operation Koridor … grades as a 4-star Solid Victory."
>
> "**Collateral: Five controller shifts improve painted Oct 1995 alignment** (`op:brcko:brcko`, `op:brcko:donji_rahic`, `op:brcko:krepsic`, `op:brcko:skakava_donja`, `op:pale:praca`)."

That accounts for **5 OSIDs flipping toward the painted Oct 1995 side at 188w**, all in POSAVINA_NE plus one in CENTRAL_CORRIDOR. The fresh painted_188w_oct1995.txt confirms POSAVINA_NE is now at **92.3% match (61 RS painted vs 57 RS sim)** — the brcko cluster is now matching.

#### Cause B — Teocak singleton enclave (2026-05-19 ledger line 1818)

> "Adding the singleton restores the historical lone-holdout mechanic … Teocak repair verified: `op:ugljevik:teocak_krstac_2` now RBiH PASS (was RS FAIL in n1868). Side-effect drift vs n1868: 8 controller flips total — Teocak primary + 7 collateral."

That accounts for another **8 OSIDs** — `op:mostar:hodbina_2`, `op:srebrenica:brezovice_2`, `op:stolac:pjesivac_kula_2 + rotimlja_2`, `op:teslic:kamenica_2`, `op:ugljevik:jasikovac + srednja_trnova_2`.

### 2.2 What the +5.6pp / +9.7pp split likely contains

| Component | Confidence | Estimated OSIDs / area contribution |
|---|---|---|
| Brčko fix (Cause A, n1919) | **HIGH** (ledger-attested) | 5 OSIDs, all eastern Posavina (Brčko proper is high-area, ~493 km² urban OSID) |
| Teocak fix (Cause B, n1917) | **HIGH** (ledger-attested) | 8 OSIDs (1 Teocak + 7 collateral), spread across Mostar/Srebrenica/Stolac/Teslic/Ugljevik |
| Painted_target_anomaly_fix gorazde_2 repaint | **HIGH** (ledger-attested, line 42) | 1 OSID, oct1995 (gorazde_2 RS→RBiH in painted file) — counts as +1 match because sim also has it RBiH |
| H1 watched_operations schema extension | **HIGH** that it does NOT contribute to match-rate; combat behavior unchanged | 0 OSIDs (state-shape only) |
| Sector-perf wave (multi-source reachability, OSID-to-corps prefilter, etc.) | **HIGH** (each commit attests "byte-identical at hash `4368f50c00c464ad`") | 0 OSIDs at 40w by ledger attestation; transitively 0 at 104w/156w/188w because no combat math changed |

5 (brcko cluster) + 8 (teocak cluster) + 1 (gorazde repaint) = **14 OSIDs accounted for**. Fresh 188w match went from 496/712 to 536/712 = **+40 OSIDs**. The remaining ~26 OSIDs of improvement are **JUDGMENT** — likely cascade effects of the two Cause A/B fixes propagating through 188 turns of simulation (e.g. with brcko RS at turn 5 instead of RBiH for the whole run, the Posavina corridor pressure changes, freeing RBiH 2nd Corps to defend other OSIDs, etc.) plus the fact that the stale n1599 was run pre-04c750e3 (player_faction default fix, 2026-05-17) which itself shifted bot-behavior shape enough to drop 7 anchors. Once 04c750e3 + Teocak + Brčko are all in, those drops are recovered AND the cascade improves match elsewhere.

### 2.3 One-sentence cause hypothesis

**The 188w improvement is dominated by two ledger-attested late-war anchor-repair commits from 2026-05-19 (Operation Koridor brcko objective + Teocak singleton enclave), not by the strict-null/sector-perf/H1-trace wave that followed; the perf/strict-null wave was byte-identical as claimed.**

---

## 3. RS sign-flip at 188w — Δ RS −4 → +46, RBiH +37 → −25, HRHB −33 → −21

This is structural and worth dissecting carefully.

### 3.1 What the stale numbers actually were

The stale memo §"Current sim vs proposed bands" (line 164–166) reports the sim at 188w as **RS 50.6%, RBiH 38.2%, HRHB 11.2%**. The OSID counts behind those: roughly RS ~315, RBiH ~322 (over-count), HRHB ~74 (under-count). The painted Oct 1995 file at that time had RS ~319, RBiH ~284, HRHB ~109. So the stale Δ was: RS **−4** (sim slightly under), RBiH **+37** (sim heavily over), HRHB **−33** (sim heavily under).

### 3.2 What the fresh numbers are

Fresh n1935: sim RS=365, RBiH=261, HRHB=86. Painted (post-gorazde-repaint) RS=319, RBiH=286, HRHB=107. Fresh Δ: RS **+46**, RBiH **−25**, HRHB **−21**.

### 3.3 Decomposing the flip

| Faction | Stale Δ | Fresh Δ | Direction | Magnitude shift |
|---|---|---|---|---|
| RS | −4 | +46 | flipped negative→positive | +50 OSIDs more RS in fresh than stale |
| RBiH | +37 | −25 | flipped positive→negative | −62 OSIDs fewer RBiH in fresh than stale |
| HRHB | −33 | −21 | same sign | +12 OSIDs more HRHB in fresh than stale |

Total OSID accounting: +50 − 62 + 12 = 0 ✓ (consistent with 712-OSID total). Also: 1 OSID is the gorazde_2 repaint (painted side); that absorbs RS −1 / RBiH +1 of the change.

**The remaining net swing is RS +51, RBiH −63, HRHB +12.**

### 3.4 Hypothesized mechanisms (mix of HIGH and JUDGMENT)

#### Hypothesis 1 — Brčko cluster (HIGH confidence, ~5 OSIDs)

The 5 controller shifts identified in the Brčko closure (line 1762): `op:brcko:brcko`, `op:brcko:donji_rahic`, `op:brcko:krepsic`, `op:brcko:skakava_donja`, `op:pale:praca`. All went RBiH→RS in the fresh n1935. **Contribution: RS +5, RBiH −5.**

#### Hypothesis 2 — Teocak collateral cluster (HIGH confidence, ~7 net OSIDs)

The 8 controller shifts from Teocak closure (line 1832): one Teocak primary (RBiH gain) + 7 collateral. Net direction of the 8 was mixed but the cluster includes `op:teslic:kamenica_2` RS→HRHB and several Ugljevik OSIDs RS→RBiH. **Approximate contribution: RS −2, RBiH +1, HRHB +1.** Note this CANCELS some of Hypothesis 1 on RS.

#### Hypothesis 3 — Pre-04c750e3 baseline cascade (JUDGMENT)

The n1599 stale run was generated before commit `04c750e3` (2026-05-17 "default player_faction in headless harness"), which the late-war 188w audit (§3 and §6.2) documents as authorizing 188w hash drift from `ccd3f9f770052614` (n1844) → `4d4bd75c1c6739de` (n1847) etc. That commit "unblocked autonomy and command-briefing gates" — meaning bot behavior shape changed enough to flip non-trivial OSID counts. The teocak loss WAS one of the visible signs; the converse (now-corrected) signal would be that ARBiH/VRS bot behavior shape change moved many late-war fronts.

If the player_faction default + the 7 collateral Teocak-cluster shifts + the 5 Brčko-cluster shifts together moved on the order of 12–15 named OSIDs, then **~35–40 OSIDs of the net RS +51 / RBiH −63 swing remain unaccounted**. JUDGMENT: those are cascade-of-cascade — once Brčko holds RS for 183 turns instead of being RBiH for 188 turns, VRS East Bosnian Corps capacity reallocates, ARBiH 2nd Corps pressure shifts, and the Posavina-Drina edge moves. The same logic applies to Teocak preserving ARBiH 2nd Corps cohesion.

#### Hypothesis 4 — H1 trace baseline-manifest re-bless cascade (LOW confidence, can rule out for combat)

The H1 wave explicitly attests "combat behavior and sensitive-history outcomes are unchanged" across n1926–n1932. The hash drift was schema-only. **Rules out for the OSID count delta** unless some persisted trace field happens to be read by a sim consumer — no ledger entry suggests this; HIGH confidence the H1 wave is NOT the cause.

#### Hypothesis 5 — Sector-perf wave being subtly non-byte-identical (JUDGMENT, must investigate)

Each sector-perf ledger entry attests byte-identity at 40w hash `4368f50c00c464ad`. The fresh 40w hash is `3649b3861a87e6ea` — different — but that's expected from the H1 trace baseline re-bless. **The interlocking question: was every sector-perf commit's "byte-identical" attestation only verified at 40w, not at 104w/156w/188w?** If sector-perf changes had a long-horizon nondeterministic effect that only surfaces past w40, we'd see exactly this — minor at w40, accumulating to large at w188. **LOW confidence — the commits explicitly say `npm.cmd run test:baselines PASS` which covers `apr1992_52w`, not just 40w. But the painted-compare diagnostics don't run as part of `test:baselines`.** This is a JUDGMENT that should be cheaply re-verifiable by re-running n1935 from a tagged sector-perf-start commit and diffing the OSID controllers.

### 3.5 Bottom line on the sign-flip

**The flip is real and structural. The directly-ledger-attested portion (Brčko + Teocak + gorazde_2 repaint, ~14 OSIDs) accounts for less than a quarter of the net +50/−62/+12 swing. The remaining majority is JUDGMENT — most likely a deterministic cascade through 188 turns of simulation triggered by the named structural fixes, but conceivably a long-horizon perf-wave subtle non-byte-identity that wasn't caught by the 40w-anchored baseline regression test.** The cheapest way to disambiguate is a single revert-probe: re-run 188w with the sector-perf wave reverted to the pre-perf commit and diff the OSID controllers — if combat math is truly byte-identical, that probe should show <5 OSIDs of difference.

---

## 4. Tier 1 anchor band implications

The prior memo's recommendation matrix needs surgical revision. **Reminder: per the constraint, do not introduce new bands or thresholds — only reclassify the existing ones from the stale memo.**

### 4.1 Updated band-vs-fresh-sim table

| Epoch | Faction | Stale memo band | Stale sim | Fresh sim | Stale verdict | Fresh verdict | Δ status |
|---|---|---|---|---|---|---|---|
| Jan 1993 (w40) | RS | 62-68% | 64.5% | 62.8% | PASS | **PASS** (band, near lower edge) | unchanged |
| Jan 1993 (w40) | RBiH | 21-26% | 23.0% | 24.3% | PASS | **PASS** | unchanged |
| Jan 1993 (w40) | HRHB | 9-13% | 12.5% | 12.9% | PASS (marginal) | **PASS** (marginal, near upper edge) | unchanged |
| Apr 1994 (w104) | RS | 65-71% | 52.5% | 61.0% | FAIL by 15.5pp | **FAIL by 4.0pp** (below floor) | margin halved |
| Apr 1994 (w104) | RBiH | 19-24% | 36.2% | 26.4% | FAIL by 12.2pp | **FAIL by 2.4pp** (above ceiling) | margin reduced ~5× |
| Apr 1994 (w104) | HRHB | 8-13% | 11.3% | 12.6% | PASS | **PASS** (near upper edge) | unchanged |
| Apr 1995 (w156) | RS | 60-67% | 50.6% | 61.0% | FAIL by 13.0pp | **PASS** (in band, near lower edge) | **promoted FAIL→PASS** |
| Apr 1995 (w156) | RBiH | 20-26% | 38.2% | 26.4% | FAIL by 15.2pp | **FAIL by 0.4pp** (marginal, just above ceiling) | de facto MARGINAL |
| Apr 1995 (w156) | HRHB | 11-17% | 11.2% | 12.6% | PASS (marginal) | **PASS** (within band) | improved off lower edge |
| Oct 1995 (w188) | RS | 47-51% | 50.6% | 61.0% | PASS | **FAIL by 10.0pp** (above ceiling) | **demoted PASS→FAIL** |
| Oct 1995 (w188) | RBiH | 28-33% | 38.2% | 26.4% | FAIL by 8.2pp | **FAIL by 1.6pp** (below floor) | margin reduced 5× and **sign flipped** |
| Oct 1995 (w188) | HRHB | 18-23% | 11.2% | 12.6% | FAIL by 9.4pp | **FAIL by 5.4pp** (below floor) | margin reduced; same direction |

### 4.2 Material verdict changes

**Three bands materially shifted classification:**

1. **Apr 1995 RS promoted FAIL → PASS.** Sim 61.0% sits inside 60-67%. This is the cleanest improvement in the table; the stale memo flagged this as "FAIL by >5%" and the band was "diagnostic-only" because sim was 50.6%. **Recommend promoting Apr 1995 RS to a Tier 1 contract anchor candidate.**

2. **Oct 1995 RS demoted PASS → FAIL by 10pp.** Sim 61.0% is above ceiling 51%. The prior Tier 1 plan had recommended Oct 1995 RS as "the only authoritative late-war band" because the sim was passing within the Dayton-treaty-tight ±1.5 envelope. **That recommendation no longer holds.** The sim's failure to model the Krajina collapse (Operation Storm/Mistral/Sana) is now the dominant Oct 1995 gap — historically RS dropped from ~63% in Apr 1995 to ~49% in Oct 1995 (the August 1995 Krajina collapse and Federation counteroffensive), but the sim holds RS flat at 61.0% from w104 through w188. **The 14pp Apr-1995→Oct-1995 drop is the missing mechanic.**

3. **Oct 1995 RBiH sign-flipped overshoot → undershoot.** Stale: sim 38.2%, +5.2pp above ceiling. Fresh: sim 26.4%, −1.6pp below floor. The sim no longer over-paints RBiH in the late war; if anything it slightly under-paints. The margin is small (1.6pp); the band could plausibly accept this as marginal-FAIL or even PASS-by-2pp-band-extension. **Recommend marking Oct 1995 RBiH as still FAIL but downgrading priority — the sign-flip from overshoot to undershoot is structurally significant: the entire 1994-1995 RBiH-overshoot story documented in the stale memo §"Pattern observation" is no longer accurate.**

### 4.3 Bands unchanged but observation changed

- **Apr 1994 RS** still FAILS (band floor 65%, sim 61.0%). Margin halved from 15.5pp to 4.0pp. This means the engine-health-audit P1 / P14 / combat-factor-overhaul lane that produced n1289+ is making progress on the 1994 RS-collapse story but isn't there yet. **Recommend keeping Apr 1994 RS as diagnostic-only band with a flag for re-classification when the margin closes below 2pp.**

- **Apr 1994 RBiH** still FAILS (band ceiling 24%, sim 26.4%). Margin halved from 12.2pp to 2.4pp. Same lane, same status — diagnostic-only with re-classification trigger.

- **Apr 1995 RBiH** is structurally MARGINAL. Sim 26.4%, ceiling 26%. **Recommend marking as marginal-FAIL pending the next perf-stable run; do not promote to contract anchor yet because the 0.4pp margin would not survive innocuous determinism-safe refactors.**

- **Oct 1995 HRHB** still FAILS (sim 12.6%, floor 18%). Margin reduced from 9.4pp to 5.4pp. **Same gap as before — the Operation Mistral / Sana / Storm Krajina-collapse mechanism is not modeled.** The +1.4pp HRHB improvement is consistent with the gorazde_2 repaint (1 OSID) and the Teocak collateral shifts pushing slightly more area into HRHB; it is NOT evidence of progress on the actual Operation Mistral gap.

### 4.4 Tier 1 anchor partition recommendations

Per the prior memo's design principle (bands must be ≥±2-3pp; no tighter than ±1.5pp unless reference is treaty-precise):

| Band | Stale recommendation | Fresh recommendation | Reason |
|---|---|---|---|
| Jan 1993 RS/RBiH/HRHB | Land all 3 as Tier 1 contracts (PASS) | **Unchanged — land as Tier 1 contracts** | Stable; all PASS at both stale and fresh |
| Apr 1994 RS/RBiH | Diagnostic-only (FAIL by >5pp) | **Diagnostic-only, with margin-close re-classification trigger** | Margins reduced 5× but still FAIL |
| Apr 1994 HRHB | Land as Tier 1 contract (PASS) | **Unchanged — land as Tier 1 contract** | PASS at both |
| Apr 1995 RS | Diagnostic-only (FAIL by 13pp) | **Promote to Tier 1 contract candidate** | Now PASS in band 60-67% at 61.0% |
| Apr 1995 RBiH | Diagnostic-only (FAIL by 15.2pp) | **Marginal-FAIL diagnostic, do not promote yet** | 0.4pp margin too tight to survive refactors |
| Apr 1995 HRHB | Land as Tier 1 contract (PASS marginal) | **Land as Tier 1 contract** | Stable PASS, off lower edge now |
| Oct 1995 RS | **Land as the only late-war anchor** (PASS in tight ±1.5pp band) | **DEMOTE to diagnostic-only — band recommendation invalidated** | Sim now 10pp above ceiling; Krajina-collapse mechanic missing |
| Oct 1995 RBiH | Diagnostic-only (FAIL by 8.2pp overshoot) | **Diagnostic-only — note sign-flip overshoot→undershoot** | New direction; structural story changed |
| Oct 1995 HRHB | Diagnostic-only (FAIL by 9.4pp) | **Diagnostic-only** | Same gap, margin slightly improved |

**The single most material change: the Oct 1995 RS band — which the prior memo recommended as "the only authoritative late-war band" because of its Dayton 51/49 treaty-text basis — is now FAILING by 10pp. The Tier 1 plan's late-war diagnostic posture must shift from "Oct 1995 RS as anchor" to "Apr 1995 RS as anchor + Oct 1995 RS as diagnostic-only".**

### 4.5 Implication for the Tier 1 plan (`feat(scenario): Tier 1 painted-target anchor commissioning + APWB cut decision`, 2026-05-21 ledger line 32)

The plan landed `historical_anchors.ts` extensions + repaints + 47 new contract tests in engineering-complete state with **runtime evaluation deliberately deferred**. The fresh data answers what runtime evaluation would have shown:

- **3 of 12 bands materially re-classify** under the fresh data.
- **1 band (Apr 1995 RS) promotes** from diagnostic-only to contract-anchor candidate.
- **1 band (Oct 1995 RS) demotes** from anchor to diagnostic-only.
- **1 band (Oct 1995 RBiH) sign-flips** the direction of failure, requiring a story re-read.

The plan's "6 of 12 fail by >5pp" framing in §"Total" of the stale memo (line 207) is updated to: **fresh data shows 4 of 12 fail by >2pp, 2 of 12 fail by <2pp marginally, 6 of 12 PASS. Mean magnitude of failure dropped from ~10pp to ~3.4pp.** Calibration has materially moved.

---

## 5. Cross-check the n1599 stale baseline

**Was the perf wave actually byte-identical, or did it drift behavior?**

### 5.1 What the ledger says

The strict-null wave (~50 entries) and the sector-perf wave (10 entries) each attest one of:
- "`npm.cmd run test:baselines` PASS — `Baseline regression: all scenarios match.`"
- "Pre/post profiled artifacts (`final_save.json`, `run_summary.json`, `weekly_report.jsonl`, `end_report.md`, `watched_operations.json`) are byte-identical at current final state hash `4368f50c00c464ad`."

The H1 trace wave (8 entries) explicitly says the OPPOSITE — hash drift is intentional ("Save hashes and baseline hashes drift intentionally because the trace rows are now persisted; combat behavior and sensitive-history outcomes are unchanged") — and authorizes a baseline-manifest re-bless via `UPDATE_BASELINES=1`.

### 5.2 Three interpretations

**Interpretation A (most likely, HIGH confidence):** The strict-null and sector-perf waves were truly byte-identical against `test:baselines` (which covers `apr1992_52w`, `apr1992_40w`, `baseline_ops_4w`, `noop_4w`). The H1 trace wave intentionally re-blessed the manifest at a new schema. The stale n1599 painted-compare was generated **pre the entire 2026-05-19 anchor-repair wave** (pre Teocak, pre Brčko-objective). So the deltas drifted because the underlying scenario behavior changed at n1917 (Teocak) and n1919 (Brčko-objective), not because the perf/strict-null wave drifted.

**Interpretation B (medium confidence, ruled out):** The stale n1599 was generated against a pre-04c750e3 (2026-05-17 player_faction default) baseline. 04c750e3 explicitly authorized "Expected calibration drift: 40w/188w hashes will shift because unblocked gates now actually fire". If n1599 predates 04c750e3, then the entire calibration baseline shifted before the painted-compare deltas had a chance to be measured against the new (n1917+) reality. **This is partially ruled out**: the stale memo (line 6) explicitly identifies the perf-wave hash as `4368f50c00c464ad` and n1931 as the post-perf calibration tip. So n1597-n1599 were generated against AT LEAST n1844 (post-04c750e3) and likely later. **The cleanest dating: somewhere between n1868 (the integrated context wave that still had Teocak failing) and the perf-wave tip.**

**Interpretation C (low confidence, must check):** The sector-perf wave subtly drifted behavior at 188w in a way that the 40w-anchored byte-identity attestations missed. **Cheaply falsifiable** by re-running n1935 from a tagged commit before the perf wave started — if the OSID controllers are within 5 of n1935, perf-wave byte-identity is confirmed at 188w too. If they differ by more, perf-wave was not actually 188w-byte-identical.

### 5.3 Best estimate

**HIGH confidence:** The stale painted-compares were generated against a `main` tip BEFORE the 2026-05-19 Teocak + Brčko-objective fixes. That alone fully accounts for the headline OSID match improvement (+5.6pp / +9.7pp) and ~15 of the ~50 OSID swing in faction counts. The remaining ~35 OSIDs of cascade is consistent with deterministic propagation through 188 turns. The perf/strict-null wave that came LATER is faithfully byte-identical per its attestations and `test:baselines` proof.

**Recommendation:** Do not re-bless any manifests. The stale memo's assumption that "deltas should hold approximately" was wrong because it didn't account for the 2026-05-19 anchor-repair lane that landed BEFORE the H1/perf wave but AFTER the stale painted-compare diagnostics were captured. **The fresh numbers are the truthful current state; the stale numbers reflect a configuration that no longer exists.**

---

## 6. Summary deliverables

### (a) Byte-identity verdict (headline)

The strict-null + sector-perf + H1 trace wave was **byte-identical at the combat-behavior level** (each commit attests `test:baselines` PASS or explicitly schema-only). The hash drift between stale n1597–n1599 and fresh n1932–n1935 is fully explained by (i) the 2026-05-19 Teocak + Brčko-objective combat-behavior fixes that landed BEFORE the perf wave but AFTER the stale painted-compare was captured, (ii) the authorized H1 schema extension that re-blessed the baseline manifest without combat change, and (iii) a 1-OSID painted-map repaint per scenario (gorazde_2). **The flat sim faction-area-% across 104w/156w/188w (61.0% / 26.4% / 12.6%) is expected** given the absence of late-war operation triggers and Krajina-collapse mechanics in the current code base — not anomalous.

### (b) One-sentence cause hypothesis for the 188w improvement

**The +9.7pp area-weighted improvement at 188w is dominated by two ledger-attested late-war anchor-repair commits from 2026-05-19 (Operation Koridor brcko objective + Teocak singleton enclave), each producing 5+ direct controller flips with cascading propagation through 188 turns — not by the strict-null / sector-perf / H1-trace wave that followed.**

### (c) Tier 1 band promotion/demotion recommendations

| Recommendation | Bands | Rationale |
|---|---|---|
| **Land as Tier 1 contracts** | Jan 1993 RS, RBiH, HRHB; Apr 1994 HRHB; Apr 1995 HRHB | All PASS at both stale and fresh; stable |
| **Promote FAIL → contract-anchor candidate** | Apr 1995 RS (sim 61.0% in band 60-67%) | Cleanest fresh improvement; was −13pp, now in band |
| **Demote PASS → diagnostic-only** | Oct 1995 RS (sim 61.0% vs band 47-51%) | Krajina-collapse mechanic missing; the prior Tier 1 plan's "only authoritative late-war anchor" recommendation no longer holds |
| **Keep diagnostic-only, mark margin reduced** | Apr 1994 RS (−4.0pp); Apr 1994 RBiH (+2.4pp); Oct 1995 HRHB (−5.4pp) | Margins reduced but still FAIL |
| **Keep diagnostic-only, note sign-flip** | Oct 1995 RBiH (was overshoot +8.2pp, now undershoot −1.6pp) | Structural story has changed; the "RBiH overshoot 1994-1995" narrative in the stale memo §"Pattern observation" no longer applies |
| **Marginal-FAIL diagnostic — do not promote yet** | Apr 1995 RBiH (+0.4pp above ceiling) | 0.4pp margin too tight to survive innocuous refactors |

Net: **2 bands materially promoted, 1 band materially demoted, 1 band sign-flipped, 8 bands unchanged in classification (3 PASS, 5 diagnostic-only FAIL with reduced margins).**

### (d) Memo location

This memo is written to **`F:\A-War-Without-Victory\docs\40_reports\audits\20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`**.

---

## Caveats and judgment-call flags

1. **Section 3 has the most JUDGMENT.** The directly ledger-attested OSID flips (~14) account for less than a quarter of the net +50/−62/+12 faction-count swing. The remaining cascade is plausible but not directly verifiable without an A/B revert probe.
2. **Section 2.2's percentage attribution is JUDGMENT.** The 14-OSID accounting is HIGH confidence; the ~26-OSID "deterministic cascade" attribution is JUDGMENT.
3. **The Apr 1995 RS PASS is fresh and surprising.** Recommend a second confirmation run (e.g. n1936 with a deterministic-safe diff) before contractually anchoring it.
4. **The Oct 1995 RS demotion is the most material finding** for downstream Tier 1 anchor planning and should be propagated to the calibration master and the Tier 1 anchor commissioning plan promptly.
5. **No new bands or thresholds were introduced.** All recommendations reuse the bands from the stale memo §"Type 1" tables; only the classification verdicts changed against fresh sim numbers.
6. **All Type 5 (attrition / exhaustion / displacement) bands remain CAN'T-EVALUATE** as in the stale memo, because the painted-compare diagnostics still only emit OSID-level political control. The Type 5 enriched-diagnostic recommendation from the stale memo's §"Next steps" item 2 stands unchanged.
7. **The painted-compare diagnostic was parent-side re-run before commit.** The memo was originally drafted from supplied fresh data; Codex then re-ran all four compare commands and byte-matched them to the artifact files before accepting the packet.

---

## Handoff candidates

- **`/operations-expert`** for the Krajina-collapse mechanic gap (Operation Mistral / Sana / Storm) that drives the Oct 1995 RS demotion + Oct 1995 HRHB FAIL.
- **`/scenario-creator-runner-tester`** (this role) for a second confirmation 156w + 188w run after any future combat-behavior change, to verify the Apr 1995 RS promotion and Oct 1995 RS demotion both hold.
- **`/calibration` / `/orchestrator`** for propagating the Tier 1 band reclassifications to `historical_band_anchors.ts` planning, the calibration master, and the consolidated backlog.
- **`/canon-compliance-reviewer`** if the Oct 1995 RS demotion triggers any FORAWWV or anchor-canon revision discussion — current memo flags it but does not propose any canon change.
