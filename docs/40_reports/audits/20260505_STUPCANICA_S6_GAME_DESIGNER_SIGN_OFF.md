# Stupčanica-95 Defender Stack §6 Sign-Off — `/game-designer`

**Lane:** `LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-S6-SIGN-OFF-CHAIN`
**Phase:** §6 sign-off chain, slot 2 of 3 (`/game-designer`)
**Date:** 2026-05-05
**Type:** Sensitive-history sign-off audit (read-only; no engine code changes in this lane)
**Predecessor:** `docs/40_reports/audits/20260505_STUPCANICA_DEFENDER_STACK_PHASE_0_PANEL.md` (commit `920e0f6e`)
**Future implementation lane:** SHAPE B `MAX(urban, forest, enclave)` collapse in `src/sim/combat/combat_math.ts` (~5 LOC)
**Sensitive-history classification:** Eventual Phase 1 = Ring 2 per §6 row "Change to enclave mechanics (for Srebrenica/Žepa specifically)"; this sign-off lane = Ring 1 audit-only.

---

## 0. Verdict

**APPROVED.**

SHAPE B (mutually-exclusive `MAX(urban, forest, enclave)` collapse) satisfies §6 Sensitive-History Design Gate compliance, the durable KNOWLEDGE pattern "step-curve faction-asymmetric data via faction-symmetric mechanism", and the Combat Master design framework's room for a P15-class factor. The mechanism is faction-symmetric in code AND in data — the MAX-collapse applies identically to every defender at every OSID where two or more of {urban, forest, enclave} are >1.0, regardless of faction or scenario.

The Phase 0 panel §8 acceptance criteria + §9 stop triggers are sufficient. The /game-designer sign-off **adds one supplemental criterion (AC-14)** to make the 188w-prediction-in-advance contract more concrete, and **endorses Ring 2 classification** (mechanism faction-symmetric, but Stupčanica-95 / Srebrenica force_ratio impact at sensitive-history-binding OSIDs is observed and reportable).

---

## 1. Citations

### 1.1 ICTY Krstić IT-98-33-T (Trial Judgement, 2 August 2001)

The Krstić verdict is the foundational ICTY genocide conviction for the Eastern Bosnia enclave-reduction campaign of 1995. From a /game-designer lens, the relevant frame is:

- **§§120-150 (strategic objectives, Tactical Group operations)** — Establishes that the VRS Drina Corps committed corps-level resources to the Krivaja-95 (Srebrenica) and Stupčanica-95 (Žepa) operations. From a design-canon perspective, this is the *historical-record source-of-truth* for the AC-3 prediction of "force_ratio rises from 0.831 to ≥0.95 at Stupčanica-95 t172" — the historical record establishes that the operation was at corps-scale commitment with decisive intent, so the engine's modeled force_ratio must reach launch-threshold under SHAPE B for the simulation to remain historically defensible.

### 1.2 ICTY Popović et al. IT-05-88-T (Trial Judgement, 10 June 2010)

- **§§240-250 (OOB + opening assault + Tactical Group operations)** — Confirms the OOB asymmetry that SHAPE B's environmental fix is meant to honestly reflect: a Tactical Group with corps-level reinforcement against a 285th Žepa Light Brigade defender of ≈275 personnel. From a /game-designer lens, this is the historical anchor that justifies SHAPE B as a §8.3 (a) "Ring 1 honest correction" rather than a §8.3 (b) "Srebrenica-tuning" change. The mechanism corrects an over-stacking bug that affects ALL OSIDs with multi-class terrain composition; ICTY Popović §§240-250 simply documents the most legible test case.

---

## 2. Reference to Phase 0 Panel §3 (Žepa t172 Reconstruction)

The Phase 0 panel §3 reconstruction is the load-bearing evidentiary basis for SHAPE B. From a /game-designer lens, the key findings are:

- **§3.3** — The full defender-power post-base multiplier at zepa_2 is ≈1.88×, with envProduct ≈ 3.96 pre-cap and ≈ 2.36 post-cap (soft-cap binding). This is the magnitude-inversion mechanism: the env-stack pushes hard against the soft cap from above, with three of the binding contributors (urban-or-equiv, forest, enclave) all stacking multiplicatively at a single terrain-class axis.
- **§3.5** — The dominating contributors are enclaveMult (D11) ~1.42, forestMult (D9) 1.15, per-brigade-terrain bonus (D13) 1.10, and `getEnclaveGarrisonPower` raw add ~+147. Of these, SHAPE B touches D8 / D9 / D11 (the terrain-class triplet) but NOT D13 (formation-level decoration honor multiplier — kept separate as it is per-formation, not per-OSID terrain class) and NOT `getEnclaveGarrisonPower` (locked per lane spec, in `enclave_resilience.ts`).

The Phase 0 panel §4 (game-designer lens internal to the panel) already concluded that SHAPE B is a P15-class factor compatible with the existing P-numbered combat factor framework. The /game-designer sign-off **endorses** that conclusion and **adds** explicit criteria for Phase 1's commit-time evidence.

---

## 3. Answers to the Four /game-designer Questions (Lane Spec)

### 3.1 Q1 — Does SHAPE B preserve the §6 contract that combat-math changes around Krivaja/Stupčanica/Srebrenica are sensitive-history-binding?

**Yes.** SHAPE B preserves the §6 contract by:

1. **Routing through the §6 triple sign-off chain** before Phase 1 dispatch. This is itself the contract — sensitive-history-binding combat-math changes get `/historian` + `/game-designer` + `/war-or-game` review, and that is happening (this sign-off being slot 2 of 3 is the proof).
2. **Faction-symmetric mechanism** — no `if (faction === 'X')` branches; no scenario-conditional carve-outs; no "Srebrenica" or "Žepa" string literals in the code condition. The MAX-collapse applies at every OSID where two or more of {urban, forest, enclave} are >1.0, irrespective of faction or operation.
3. **NO touch to `enclave_resilience.ts` or `rupture_consequences.ts`** — these are the §1.5 #11 / §2 / §6 binding files and are explicitly out-of-scope per Phase 0 §10 and AC-2.
4. **Predicted force_ratio outcome stated in advance per §8.3 (a)** — the AC-13 188w prediction-in-advance contract is the explicit anti-tuning safeguard. SHAPE B is committed to a predicted force_ratio band (0.95-1.05 at Stupčanica-95 t172) BEFORE the 188w sensitive-history regression run; the actual outcome is then observed against the prediction. This pattern matches `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11 and the Q-CANON-RUPT-4 resolution (recommendation §5, 2026-05-04).

### 3.2 Q2 — Does MAX-collapse satisfy "step-curve faction-asymmetric data via faction-symmetric mechanism"?

**Yes — both code and data are faction-symmetric.**

The durable KNOWLEDGE pattern is: keep mechanism faction-symmetric (one code path, no `if faction`); allow data to be faction-asymmetric where it must be (OOB, decoration honor, scenario disposition). SHAPE B satisfies both halves:

- **Mechanism (faction-symmetric):** `Math.max(urbanMult, forestMult, enclaveMult)` is one expression, applied uniformly to all defenders. There is no faction-conditional branch.
- **Data (faction-symmetric AND faction-asymmetric in the right places):**
  - The `urban_osids.json` / `forest_osids.json` data files are faction-agnostic — they describe the OSID, not who defends it. RBiH defenders at Žepa, RS defenders at Pale, HRHB defenders at Vitez all see the same data-driven multipliers when defending those OSIDs.
  - The `enclave_resilience.ts` config defines per-enclave parameters for the canonical enclaves (Sarajevo, Bihać, Srebrenica, Žepa, Goražde, HRHB pockets). This is faction-asymmetric *data* (different enclaves have different parameters), but the *mechanism* is symmetric — the same `getEnclaveDefenseBonus` function runs for all of them.
  - SHAPE B layers `MAX` over these three data sources symmetrically. ALL ops with multiple terrain modifiers see the collapse, not just Stupčanica-95.

This is exactly the pattern. The panel §4 was correct that this is P15-class-factor-compatible.

### 3.3 Q3 — Are Phase 0 acceptance criteria + stop triggers sufficient, or should /game-designer add new ones? Specifically, should there be a REQUIRED 188w prediction in advance with explicit force_ratio bands?

**Phase 0's 13 + 6 are sufficient with one supplement.**

The /game-designer sign-off **endorses** all 13 ACs and all 6 STs as written, and **adds one supplemental criterion** to make AC-13's 188w-prediction-in-advance more concrete:

**AC-14 (NEW — added by /game-designer sign-off):** Phase 1's commit-time report (the implementation lane's report file in `docs/40_reports/audits/`) must include a **prediction table** with the following structure, completed BEFORE the 188w sensitive-history regression run is executed:

| OSID | Op | t | Pre-SHAPE-B force_ratio (from n1619 baseline or equivalent) | Predicted post-SHAPE-B force_ratio band | Predicted classification (`emergent_fall` / `held` / `held_with_ghost`) |
|---|---|---|---|---|---|
| `op:rogatica:zepa_2` | Stupčanica-95 | 172 | 0.831 | 0.95-1.05 | emergent_fall (border-class) |
| `op:srebrenica:srebrenica_2` | Krivaja-95 | ≥160 | (record pre-SHAPE-B) | (predicted, with reasoning) | (emergent_fall / held / held_with_ghost) |
| `op:centar_sarajevo:centar_sarajevo` | (any defensive engagement at this OSID) | (representative t in run) | (record) | ≤5% absolute change predicted | `held` (per ST-6 protected) |
| `op:bihac:bihac_2` | (any defensive engagement at this OSID) | (representative t in run) | (record) | ≤10% absolute change predicted | `held` (per ST-6 protected) |
| `op:gorazde:gorazde_2` | (any defensive engagement at this OSID) | (representative t in run) | (record) | (predicted) | (predicted classification) |

The prediction must be committed and dated before the 188w run. Outcomes are then compared against predictions in the post-run report. Disagreement between prediction and outcome that exceeds the predicted band is itself a §6 finding — it must be reported back to /historian + /game-designer + /war-or-game for re-review before Phase 1 is considered durable.

**Rationale for AC-14:** AC-13 already requires the Phase 1 ruling to be stated in advance, but does not specify what form the ruling takes. A prediction *table* with explicit force_ratio bands and classification labels makes the §8.3 (a) anti-tuning contract concrete and machine-verifiable. Without AC-14, a future contributor could satisfy AC-13 with a vague prediction ("Srebrenica may or may not fall") that does not actually constrain the outcome interpretation.

**No additional stop triggers** are added by /game-designer. Phase 0 §9's six are sufficient.

### 3.4 Q4 — Should Phase 1 ship as Ring 1 (faction-symmetric mechanism only, no scenario-specific tuning) or Ring 2 (mechanism is symmetric but specific OSIDs are flagged)?

**Ring 2.**

The mechanism is Ring 1 (faction-symmetric, no scenario-specific code). But the *change-class* is Ring 2 because:

1. SHAPE B sits inside `combat_math.ts` and changes defender power computation at OSIDs where the canonical enclaves (Srebrenica, Žepa, Sarajevo, Bihać, Goražde, HRHB pockets) are defined. By `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.1, enclave mechanics are explicitly Ring 1 / Ring 2 boundary territory.
2. The Phase 0 panel reconstruction (§3) and the AC-3 / AC-10 / AC-11 / AC-13 prediction structure are observation-and-reporting on the canonical enclaves — i.e., the implementation reports specific OSID outcomes (not just aggregate metric drift). This is Ring 2 representation of the change's effect on sensitive-history OSIDs.
3. Phase 1's commit-time report (per AC-14) names canonical enclaves in its prediction table. That naming is appropriate Ring 2 representation; it does not violate Ring 1 (the code does not contain those names as conditions).

**Practical consequence of Ring 2 classification:**
- Phase 1 commit message must reference this sign-off chain.
- Phase 1 report file goes in `docs/40_reports/audits/` (sensitive-history-touching reports), not in general `docs/40_reports/`.
- Phase 1 commit message includes the §6 sign-off chain trailer: e.g., "§6 sign-off: historian APPROVED-WITH-CAVEAT, game-designer APPROVED, war-or-game [verdict]".

---

## 4. Confirmation of Acceptance Criteria + Stop Triggers (Phase 0 §8 + §9)

### 4.1 Acceptance criteria — endorsed without modification

| AC | Disposition |
|---|---|
| AC-1 (≤25 LOC, single-file) | Endorsed |
| AC-2 (NO `enclave_resilience.ts` / `rupture_consequences.ts` touch) | Endorsed — the Ring 1 binding files |
| AC-3 (force_ratio rise to ≥0.95) | Endorsed — within historical-plausibility band per /historian |
| AC-4 (40w 26/27 anchors PASS, 6/6 benchmarks) | Endorsed |
| AC-5 (faction-symmetric mechanism) | Endorsed — KNOWLEDGE-pattern compliant |
| AC-6 (no new persisted state field) | Endorsed |
| AC-7 (determinism preserved) | Endorsed |
| AC-8 (production-reachability trace) | Endorsed |
| AC-9 (predictor / resolver / sector-rating / estimateForceRatio parity) | Endorsed — automatic via shared `computeDefenderPower` |
| AC-10 (Sarajevo ≤5% change) | Endorsed |
| AC-11 (Bihać ≤10% change) | Endorsed |
| AC-12 (§6 triple sign-off recorded) | Endorsed — this report is slot 2 of 3 |
| AC-13 (188w Phase 1 ruling in advance) | Endorsed, **strengthened by AC-14** |

### 4.2 Acceptance criteria — added by /game-designer sign-off

| AC | Description |
|---|---|
| **AC-14** | Phase 1 commit-time report MUST include a prediction table (zepa_2, srebrenica_2, centar_sarajevo, bihac_2, gorazde_2) with pre/predicted post force_ratio bands and `emergent_fall` / `held` / `held_with_ghost` classification per OSID. Prediction dated before 188w run. Outcome variance vs prediction beyond predicted band is itself a §6 finding requiring re-review. |

### 4.3 Stop triggers — endorsed without modification

| ST | Disposition |
|---|---|
| ST-1 (no friendly-op force_ratio drop below 1.0 unrelated to Stupčanica) | Endorsed |
| ST-2 (no Krivaja-95 force_ratio change at all) | Endorsed |
| ST-3 (no fresh anchor failure in 40w) | Endorsed |
| ST-4 (no `enclave_resilience.ts` touch — panel-defer) | Endorsed |
| ST-5 (no faction-conditional branch) | Endorsed |
| ST-6 (Sarajevo >5% or Bihać >10% absolute) | Endorsed |

---

## 5. Sign-Off

**Verdict:** APPROVED.

**Final acceptance criteria for Phase 1 dispatch (carry forward Phase 0's 13 + this sign-off's AC-14 = 14 total):**

1. AC-1 through AC-13 as written in Phase 0 panel §8.
2. AC-14 as defined in §3.3 of this report.

**Final stop triggers for Phase 1 dispatch (carry forward Phase 0's 6 unchanged):**

1. ST-1 through ST-6 as written in Phase 0 panel §9.

**Phase 1 dispatch eligibility from /game-designer lens:** **CLEAR**, subject to:
- The remaining one §6 sign-off (`/war-or-game`) being recorded.
- Phase 1's commit message and report explicitly citing this sign-off and AC-14.
- Phase 1's report file including the AC-14 prediction table dated before the 188w sensitive-history regression run.

**Sources cited:** ICTY Krstić IT-98-33-T (§§120-150); ICTY Popović IT-05-88-T (§§240-250). Both at-or-near tribunal-source-of-truth standard per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 evidence requirement.

---

## 6. Lane Bookkeeping

- **This audit file:** `docs/40_reports/audits/20260505_STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md` (NEW).
- **No other files touched in this slot.**
- **Sibling sign-off slots in same commit:**
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_HISTORIAN_SIGN_OFF.md` (slot 1 of 3 — APPROVED-WITH-CAVEAT).
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md` (slot 3 of 3).
- **Phase 1 implementation lane** dispatches separately AFTER all three sign-offs are recorded and only if all three verdicts are APPROVED or APPROVED-WITH-CAVEAT (DECLINED in any slot blocks Phase 1 dispatch).
