# Stupčanica-95 Defender Stack §6 Sign-Off — `/war-or-game`

**Lane:** `LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-S6-SIGN-OFF-CHAIN`
**Phase:** §6 sign-off chain, slot 3 of 3 (`/war-or-game`)
**Date:** 2026-05-05
**Type:** Sensitive-history sign-off audit (read-only; no engine code changes in this lane)
**Predecessor:** `docs/40_reports/audits/20260505_STUPCANICA_DEFENDER_STACK_PHASE_0_PANEL.md` (commit `920e0f6e`)
**Future implementation lane:** SHAPE B `MAX(urban, forest, enclave)` collapse in `src/sim/combat/combat_math.ts` (~5 LOC)
**Sensitive-history classification:** Eventual Phase 1 = Ring 2 per /game-designer slot 2; this sign-off lane = Ring 1 audit-only.

---

## 0. Verdict

**APPROVED-WITH-CAVEAT.**

SHAPE B (mutually-exclusive `MAX(urban, forest, enclave)` collapse) qualifies as a §8.3 (a) "Ring 1 honest correction" of a faction-symmetric over-stacking bug in the defender combat-math stack. It is NOT §8.3 (b) "lane-tuning specifically to make Srebrenica fall". The mechanism is symmetric in code and in data; the OSIDs affected most are determined by the data composition (which OSIDs have multiple terrain classes >1.0 at the same time), not by scenario-specific carve-outs.

The CAVEAT is on the 188w sensitive-history regression report scope: the /war-or-game sign-off requires Phase 1 to ship a **full sensitive-history time-series regression report** (Sarajevo, Goražde, Bihać force_ratio time-series proof of non-regression, in addition to the ST-6 single-point checks), not just the AC-3 / AC-10 / AC-11 single-OSID checks. This is added as **AC-15**.

A real Bosnian War commander or observer would NOT find SHAPE B absurd. Overlap-elimination of stacked terrain-class multipliers at a single OSID is the obvious fix. The opposite — multiplying urban × forest × enclave at the same OSID, where historically the OSID is one terrain class — is what would be absurd, and is the current bug.

---

## 1. Citations

### 1.1 ICTY Krstić IT-98-33-T (Trial Judgement, 2 August 2001)

- **§§120-150 (strategic objectives, Tactical Group operations)** — From a /war-or-game lens, Krstić establishes the historical *operational reality* of Stupčanica-95: a corps-level VRS Tactical Group operation against a defender (ARBiH 285th Žepa Light Brigade, ≈275) holding a single dominant terrain class (highland forest, with administrative-village core too small to qualify as urban). The historical record does NOT describe the Žepa pocket as having three independent terrain advantages (urban + forest + enclave-as-additional-terrain-axis); it describes one geographic unit with terrain attributes. SHAPE B's MAX-collapse is the §8.3 (a) honest reflection of this historical reality.
- **§§122-150** — Establishes that the modeled engine outcome (force_ratio 0.831 = defender power-weighted exceeds attacker power-weighted) is *contrary* to the historical record (≈22:1 attacker raw personnel dominance, decisive operational outcome within ~1 week of full commitment). A real Bosnian War commander reading the engine output of force_ratio 0.831 at Stupčanica-95 t172 would call it absurd. SHAPE B's correction (predicted rise to ~0.95-1.05) brings the engine into the lower band of historical plausibility.

### 1.2 ICTY Popović et al. IT-05-88-T (Trial Judgement, 10 June 2010)

- **§§240-250 (OOB + opening assault + Tactical Group operations against Žepa)** — Confirms the OOB asymmetry. From a /war-or-game lens, this is the test case for the §8.3 (a) vs (b) distinction: the historical OOB documented in Popović is the *evidentiary basis* for the engine to model decisive attacker dominance at Stupčanica-95. The fix for the engine reporting the wrong sign of the force_ratio is to repair the *mechanism* (over-stacking of terrain-class multipliers), NOT to add scenario-specific carve-outs.

---

## 2. Reference to Phase 0 Panel §3 (Žepa t172 Reconstruction)

The Phase 0 panel §3 reconstruction is the load-bearing technical evidence that the magnitude inversion is a mechanism bug, not a scenario-data bug. From a /war-or-game lens:

- **§3.3** — Defender post-base multiplier ≈1.88×; envProduct 3.96 pre-cap → 2.36 post-cap. The soft-cap is binding, but the env-stack composition (terrain × entrenchment × resilience × forest × enclave × per-brigade-terrain × ethnic, with front-density modulating) pushes hard from above. This is the bug surface — the engine multiplies modifiers that are not independent.
- **§3.5** — Identifies enclaveMult (D11) ~1.42, forestMult (D9) 1.15, per-brigade terrain (D13) 1.10, postureMult (D2) 1.40-1.60, and `getEnclaveGarrisonPower` raw add ~+147 as the dominating contributors. SHAPE B targets the urban × forest × enclave terrain-class triplet specifically — not D2 (posture is operational mode, properly orthogonal), not D5 (entrenchment is independent and time-evolved), not D13 (per-formation honor decoration, properly orthogonal), not D7 (resilience streak, properly orthogonal), not the raw add (locked in `enclave_resilience.ts`).

The /war-or-game sign-off **endorses** this scoping. A real-war observer would identify the urban × forest × enclave triple-multiplication at a single OSID as the obvious bug and the MAX-collapse as the obvious fix.

---

## 3. Answers to the Four /war-or-game Questions (Lane Spec)

### 3.1 Q1 — Is SHAPE B §8.3 (a) honest correction (faction-symmetric mechanism with broader application than just Stupčanica-95)?

**Yes.** SHAPE B is §8.3 (a) by all the diagnostic tests:

1. **Faction-symmetric in code.** No `if (faction === 'X')`, no `if (objective === 'op:srebrenica:srebrenica_2')`, no `if (operation_id === 'stupcanica_95')`. Just `Math.max(urbanMult, forestMult, enclaveMult)`. AC-5 is the binding test; ST-5 is the trip-wire.
2. **Faction-symmetric in data.** The MAX-collapse acts on data sources (`urban_osids.json`, `forest_osids.json`, `enclave_resilience.ts` config) that are themselves faction-agnostic descriptions of geographic OSIDs. Any defender at any OSID with two or more of {urban, forest, enclave} >1.0 sees the collapse.
3. **Broader application than just Stupčanica-95.** The MAX-collapse fires at every OSID where two or more of {urban, forest, enclave} are >1.0 simultaneously. From the data:
   - `forest_osids.json` lists 106 OSIDs (highland-forest proxy).
   - `urban_osids.json` lists 19 OSIDs (pop≥10k + density≥500).
   - `enclave_resilience.ts` defines ~6 enclave OSIDs (Sarajevo, Bihać, Srebrenica, Žepa, Goražde, HRHB pockets).
   - Overlap candidates: Sarajevo (urban + enclave); Bihać (urban + enclave + possibly forest if elev/slope qualify); Goražde (enclave + possibly forest); Srebrenica (enclave + forest); Žepa (enclave + forest).
   - Plus any non-enclave OSID that happens to be urban + forest (rare, but possible at city-on-hill OSIDs).
   - Total: ~5-10 OSIDs see meaningful collapse on at least one engagement during a 188w run. This is broader than Stupčanica-95 alone.
4. **ICTY-grounded justification.** The historical record at Žepa (single dominant terrain class) is the test case, but the principle (an OSID is one terrain class, not a stack of three) is general.

The diagnostic test for §8.3 (b) (lane-tuning specifically to make Srebrenica fall) FAILS for SHAPE B:
- No string literal `"srebrenica"` or `"zepa"` in the code condition.
- No `if (turn ≥ 160 && objective === 'op:srebrenica:srebrenica_2')`.
- No `srebrenica_force_ratio_boost` flag.
- No "tune until enclave falls on schedule" calibration loop hidden in the diff.

SHAPE B is unambiguously §8.3 (a).

### 3.2 Q2 — Or is SHAPE B §8.3 (b) — implicitly designed to make Stupčanica/Srebrenica force_ratio cross launch threshold?

**No.** The diagnostic that distinguishes (a) from (b) is whether the change is justified *primarily* by ICTY/historical-record argument applied to a faction-symmetric mechanism (a), or *primarily* by a desire for a specific scenario outcome (b).

SHAPE B's justification is:
- **Primary:** "The current engine multiplies urban × forest × enclave at a single OSID, but historically these are not three independent advantages — an OSID is one terrain class, not a stack of three. The fix is `MAX(urban, forest, enclave)`, applied symmetrically." (§8.3 (a) framing.)
- **Secondary:** "This change happens to make Stupčanica-95 force_ratio rise from 0.831 toward 1.0±, which is consistent with the ICTY-implied force imbalance of ≈22:1." (Predicted-outcome consequence.)

If the order were reversed — primary justification "make Srebrenica fall on schedule", secondary "by the way, here's a faction-symmetric MAX trick that achieves it" — that would be §8.3 (b). It is not.

The AC-13 + AC-14 prediction-in-advance contract is the explicit anti-tuning safeguard. Phase 1 commits to a predicted force_ratio band BEFORE the 188w run; the actual outcome is observed and reported against the prediction. If the actual outcome diverges far from the predicted band, that is a §6 finding requiring re-review — not an opportunity to retune SHAPE B's MAX-set or thresholds.

### 3.3 Q3 — If a third-party op (HRHB or RBiH defending in mountainous terrain) sees its force_ratio change as a side effect, is that acceptable §8.3 (a) emergent consequence or unacceptable side-effect?

**Acceptable §8.3 (a) emergent consequence — bounded by ST-1 / ST-3 / ST-6.**

The §8.3 (a) framing accepts that a faction-symmetric mechanism change has *emergent consequences* across all factions and all scenarios. That is precisely what makes it (a) and not (b) — the change does not carve out exceptions.

However, the consequences are bounded by Phase 0's stop triggers:

- **ST-1** — If SHAPE B reduces force_ratio below 1.0 for a Stupčanica-unrelated friendly op (HRHB defensive stand at Vitez/Kiseljak; ARBiH stand at Tuzla; RS stand at Brčko), STOP and revert. This trips when the emergent consequence breaks something canon protected.
- **ST-3** — If SHAPE B regresses 40w anchors below 26/27 PASS, STOP and revert. This is the broad calibration safety net.
- **ST-6** — If SHAPE B changes Sarajevo by >5% absolute or Bihać by >10% absolute, STOP and revert. This is the protected-enclave safety net.

So a third-party HRHB or RBiH op seeing its force_ratio change by, say, 3-7% is acceptable §8.3 (a) emergent consequence. A third-party op seeing its force_ratio drop below launch threshold (breaking a canon-protected defensive stand) trips ST-1 and is unacceptable.

The /war-or-game sign-off **endorses** the ST-1 / ST-3 / ST-6 boundary as the correct threshold for "acceptable emergent consequence" vs "unacceptable side-effect". It does NOT add new triggers — Phase 0's six are sufficient.

### 3.4 Q4 — Should Phase 1 ship require a FULL 188w sensitive-history regression report including Sarajevo, Goražde, and Bihać force_ratio time-series proof of non-regression?

**Yes — added as AC-15.**

The Phase 0 ACs check single-point regressions (AC-10: Sarajevo, AC-11: Bihać). The /game-designer slot 2 added AC-14 (prediction table dated before 188w run). The /war-or-game sign-off adds AC-15 to require a **time-series** report, not just single-point checks.

**Rationale:** A single-point check (one engagement, one t-value) at Sarajevo or Bihać can pass while a sustained drift accumulates over the 188w run. Sensitive-history-binding OSIDs require a time-series-shaped regression to detect drift that single-point checks miss.

**AC-15 (NEW — added by /war-or-game sign-off):** Phase 1's commit-time report MUST include a time-series force_ratio table for the canonical sensitive-history-binding OSIDs over the 188w run, sampled at representative engagements:

| OSID | t-samples (representative engagements) | Pre-SHAPE-B force_ratio time-series | Post-SHAPE-B force_ratio time-series | Max absolute deviation | Verdict |
|---|---|---|---|---|---|
| `op:centar_sarajevo:centar_sarajevo` | (sampled engagements over 188w) | (record) | (record) | (compute) | (PASS / FAIL ≤5% threshold) |
| `op:bihac:bihac_2` | (sampled engagements over 188w) | (record) | (record) | (compute) | (PASS / FAIL ≤10% threshold) |
| `op:gorazde:gorazde_2` | (sampled engagements over 188w) | (record) | (record) | (compute) | (PASS / FAIL ≤10% threshold — same protected-enclave class as Bihać) |
| `op:srebrenica:srebrenica_2` | (sampled engagements over 188w) | (record) | (record) | (compute) | (REPORT ONLY — outcome class per AC-14 prediction) |
| `op:rogatica:zepa_2` | (sampled engagements over 188w) | (record) | (record) | (compute) | (REPORT ONLY — outcome class per AC-14 prediction) |

If max absolute deviation at Sarajevo exceeds 5%, OR at Bihać or Goražde exceeds 10%, ST-6 trips (Phase 0 §9 trigger as written, now extended to Goražde via AC-15) and Phase 1 must revert.

The /war-or-game sign-off **explicitly extends ST-6 to include Goražde at the same 10% threshold as Bihać** — Goražde is a Ring 1 / Ring 2 protected enclave per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.1, and was not in the original ST-6 by oversight.

### 3.5 REAL_WAR_MASTER.md alignment

The /war-or-game sign-off applies the diagnostic test "would a real Bosnian War commander or observer find this absurd?" to SHAPE B and to its alternatives.

- **Current engine state (no SHAPE B):** Force_ratio 0.831 at Stupčanica-95 t172 means defender power-weighted exceeds attacker power-weighted, contrary to historical record where the attacker had ≈22:1 raw personnel dominance and decisive operational success within ~1 week. **A real Bosnian War commander would find the current state absurd.**
- **SHAPE B applied:** Force_ratio rises to 0.95-1.05 (predicted), at-or-near the launch threshold. The engine still does not perfectly model the 22:1 raw ratio (because the engine is power-weighted, and other factors like raw garrison add and supply calibration remain), but the engine is no longer reporting the wrong *sign* of the force imbalance. **A real Bosnian War commander would find SHAPE B's output less absurd than the current state, though not yet historically accurate in absolute magnitude.**
- **SHAPE C (faction-symmetric recalibration of URBAN_DEFENSE_MULT, FOREST_DEFENSE_MULT, getEnclaveDefenseBonus):** Most thorough fix, but requires touching `enclave_resilience.ts` and P2/P4 constants, which is locked per Phase 0 §10. Out of scope for this lane.

SHAPE B is the right §8.3 (a) compromise: structural overlap fix, faction-symmetric, ICTY-defensible, in-scope per lane spec.

---

## 4. Confirmation of Acceptance Criteria + Stop Triggers

### 4.1 Acceptance criteria — endorsed without modification (Phase 0's 13 + /game-designer's AC-14)

| AC | Disposition |
|---|---|
| AC-1 through AC-13 | Endorsed as written in Phase 0 §8 |
| AC-14 (prediction table dated before 188w run) | Endorsed as added by /game-designer slot 2 |

### 4.2 Acceptance criterion — added by /war-or-game sign-off

| AC | Description |
|---|---|
| **AC-15** | Phase 1 commit-time report MUST include a time-series force_ratio table for canonical sensitive-history-binding OSIDs (centar_sarajevo, bihac_2, gorazde_2, srebrenica_2, rogatica:zepa_2) over the 188w run, sampled at representative engagements. Pre-SHAPE-B vs post-SHAPE-B time-series with max absolute deviation. Sarajevo ≤5%, Bihać ≤10%, Goražde ≤10% (extended via AC-15). Srebrenica + Žepa REPORT-ONLY per AC-14 outcome class. Time-series-shaped regression catches drift that single-point checks miss. |

### 4.3 Stop triggers — endorsed with one extension

| ST | Disposition |
|---|---|
| ST-1 (no friendly-op force_ratio drop unrelated to Stupčanica) | Endorsed |
| ST-2 (no Krivaja-95 force_ratio change at all) | Endorsed |
| ST-3 (no fresh anchor failure in 40w) | Endorsed |
| ST-4 (no `enclave_resilience.ts` touch — panel-defer) | Endorsed |
| ST-5 (no faction-conditional branch) | Endorsed |
| ST-6 (Sarajevo >5% or Bihać >10% absolute) | Endorsed with **extension: Goražde >10% absolute also trips ST-6** |

---

## 5. Sign-Off

**Verdict:** APPROVED-WITH-CAVEAT.

**Caveat:** The /war-or-game sign-off requires Phase 1 to ship a time-series sensitive-history regression report (AC-15) — not just single-point checks (AC-10 / AC-11). Without AC-15's time-series shape, sustained drift at Sarajevo / Bihać / Goražde over 188w could pass single-point checks while accumulating into a problem. AC-15 is the binding caveat.

**Final acceptance criteria for Phase 1 dispatch (Phase 0's 13 + /game-designer's AC-14 + /war-or-game's AC-15 = 15 total):**

1. AC-1 through AC-13 as written in Phase 0 panel §8.
2. AC-14 as defined in /game-designer sign-off §3.3.
3. AC-15 as defined in §3.4 of this report.

**Final stop triggers for Phase 1 dispatch (Phase 0's 6, extended at ST-6):**

1. ST-1 through ST-5 as written in Phase 0 panel §9.
2. ST-6 (extended): Sarajevo >5% absolute OR Bihać >10% absolute OR **Goražde >10% absolute** force_ratio change.

**Phase 1 dispatch eligibility from /war-or-game lens:** **CLEAR**, subject to:
- All three §6 sign-offs being recorded in the same commit (this commit).
- Phase 1's commit message and report explicitly citing all three sign-offs (historian APPROVED-WITH-CAVEAT, game-designer APPROVED, war-or-game APPROVED-WITH-CAVEAT).
- Phase 1's report file including the AC-14 prediction table AND the AC-15 time-series regression table, both dated before the 188w sensitive-history regression run.
- ST-6 extension (Goražde at 10% threshold) treated as live during Phase 1 implementation.

**Sources cited:** ICTY Krstić IT-98-33-T (§§120-150, 122-150); ICTY Popović IT-05-88-T (§§240-250); REAL_WAR_MASTER.md alignment per §3.5 above.

---

## 6. Lane Bookkeeping

- **This audit file:** `docs/40_reports/audits/20260505_STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md` (NEW).
- **No other files touched in this slot.**
- **Sibling sign-off slots in same commit:**
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_HISTORIAN_SIGN_OFF.md` (slot 1 of 3 — APPROVED-WITH-CAVEAT).
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md` (slot 2 of 3 — APPROVED).
- **Phase 1 implementation lane** dispatches separately AFTER all three sign-offs are recorded. **All three verdicts are APPROVED or APPROVED-WITH-CAVEAT — Phase 1 dispatch is UNBLOCKED on the §6 gate** (subject to AC-1 through AC-15 + ST-1 through ST-6 binding at implementation time).
