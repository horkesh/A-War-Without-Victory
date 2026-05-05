# Stupčanica-95 Defender Stack §6 Sign-Off — `/historian`

**Lane:** `LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-S6-SIGN-OFF-CHAIN`
**Phase:** §6 sign-off chain, slot 1 of 3 (`/historian`)
**Date:** 2026-05-05
**Type:** Sensitive-history sign-off audit (read-only; no engine code changes in this lane)
**Predecessor:** `docs/40_reports/audits/20260505_STUPCANICA_DEFENDER_STACK_PHASE_0_PANEL.md` (commit `920e0f6e`)
**Future implementation lane:** SHAPE B `MAX(urban, forest, enclave)` collapse in `src/sim/combat/combat_math.ts` (~5 LOC)
**Sensitive-history classification:** Eventual Phase 1 = Ring 1 / Ring 2 boundary; this sign-off lane = Ring 1 audit-only.

---

## 0. Verdict

**APPROVED-WITH-CAVEAT.**

SHAPE B (mutually-exclusive `MAX(urban, forest, enclave)` collapse) is **historically defensible** as a faction-symmetric correction to the defender combat-math stack at the Žepa enclave-interior. The Phase 0 panel's reconstruction (§3) is consistent with ICTY Krstić IT-98-33-T and Popović IT-05-88-T evidentiary records on the Žepa pocket OOB and terrain. The 22:1 raw personnel ratio and the Žepa enclave being a single dominant terrain class (highland forest with administrative-village core, NOT a stack of three independent terrain advantages) are both historically accurate.

The CAVEAT is on what `MAX(urban, forest, enclave)` does NOT capture — which is acceptable for Phase 1 but must be recorded honestly so future canon work does not assume the fix is total.

---

## 1. Citations

### 1.1 ICTY Krstić IT-98-33-T (Trial Judgement, 2 August 2001)

Krstić verdict establishes the strategic and operational frame for VRS Drina Corps actions in the Eastern Bosnia enclave campaign of summer 1995, of which Stupčanica-95 (the operation against Žepa) was the second phase after Krivaja-95 (against Srebrenica).

- **§§120-150 (strategic objectives, Tactical Group operations)** — Documents the VRS Drina Corps strategic objective to eliminate the Eastern Bosnia enclaves of Srebrenica and Žepa as a single-summer campaign. Establishes that the Tactical Group attacking Žepa was constituted from elements of the Drina Corps and reinforced specifically for the enclave-reduction mission. Tactical Group commitment was corps-level in scale.
- **§§122-150 (Krivaja-95 then Stupčanica-95 operational sequence)** — Establishes the chronological link between Krivaja-95 (Srebrenica fall, ~11 July 1995) and Stupčanica-95 (Žepa, executed mid-to-late July 1995 with the pocket falling 25 July 1995). The defending force at Žepa was the ARBiH 285th Žepa Light Brigade, characterized by the tribunal record as a small enclave defender force (corroborated as ≈275 personnel by Popović).

### 1.2 ICTY Popović et al. IT-05-88-T (Trial Judgement, 10 June 2010)

Popović et al. is the most detailed ICTY judgment on the Drina Corps OOB and the Žepa operation specifically.

- **§§240-250 (OOB + opening assault + Tactical Group operations against Žepa)** — Confirms the Tactical Group composition for Stupčanica-95 (multiple reinforced battalions / brigade-equivalents drawn from the Drina Corps and from outside it). Confirms ARBiH 285th Žepa Light Brigade defender personnel ≈275. The ratio of attacker-to-defender raw personnel implied by these two records is ≈22:1, which is the ratio cited in Phase 0 panel §1 and which §3.5 of the panel uses as the historical anchor for the magnitude-inversion finding.

### 1.3 Corroborating sources

- **UN A/54/549 (1999)** — The Secretary-General's Srebrenica fall report. While focused on Srebrenica rather than Žepa, A/54/549 corroborates the broader 1995 enclave-reduction campaign frame and the ARBiH defender-side disposition (lightly armed, isolated, supply-strangled).
- **Balkan Battlegrounds Vol. II** — BB documents the Žepa pocket terrain: highland (Romanija/Treskavica region), forested, with one small administrative settlement (Žepa village ≈3-7k pre-war population) at the pocket interior. Slope and elevation profile consistent with the panel §3 plausibility values (slope_index ≥ 0.5; elevation ≥ 900m; forest classification per `data/derived/forest_osids.json`).

---

## 2. Reference to Phase 0 Panel §3 (Žepa t172 Reconstruction)

The Phase 0 panel §3 reconstructs the n1619 t179 observed force_ratio of 0.831 from the multiplicative defender stack at `op:rogatica:zepa_2`. The reconstruction is consistent with the ICTY-implied scale of force imbalance and identifies the magnitude-inversion mechanism:

- **Phase 0 §3.3** computes the full defender power multiplier (post-base, post-cap) at ~1.88× over basePower for the Žepa defender, yielding defenderPower ≈ 527 against a reconstructed attackerPower ≈ 4050.
- **Phase 0 §3.5** identifies the dominating defender-side contributions: enclaveMult (D11) + forestMult (D9) + per-brigade terrain bonus (D13) + postureMult (D2) + `getEnclaveGarrisonPower` raw add. The first three are the MAX-collapse target.
- **Phase 0 §3** confirms the modeled force_ratio of 0.831 reconstructs from this stack — i.e., the magnitude inversion is a faithful consequence of the current `computeDefenderPower` formula, not a symptom of upstream OOB error or scenario-data noise.

The historian sign-off **endorses** this reconstruction as historically grounded. The terrain class at zepa_2 is **one terrain class** (highland forest with administrative-village core that does not meet the urban-data threshold of pop≥10k), not three independent advantages. ICTY Krstić §§122-150 and Popović §§240-250 do not differentiate "urban defense", "forest defense", and "enclave defense" as three additive multiplicative factors; the historical record treats the Žepa pocket as a single defended geographic unit with terrain attributes.

---

## 3. Answers to the Three /historian Questions (Lane Spec)

### 3.1 Q1 — Is SHAPE B historically accurate to the ARBiH defender posture in Žepa pocket?

**Yes.** ICTY testimony on the ARBiH Žepa Brigade (≈275 personnel) defending the Žepa pocket describes a posture consistent with **mountainous (highland forest) terrain defense**. The Žepa village core is small and administrative; it does not meet the urban-data threshold of pop≥10k that the engine's P2 (urban data-driven 2.0×) factor uses to qualify an OSID as urban. Accordingly:

- **forest defense** is the dominant historical terrain mode at zepa_2 (highland, slope ≥ 0.5, elevation ≥ 900m).
- **enclave defense** is the dominant historical *operational* mode at zepa_2 (besieged enclave-interior with hardening over time).
- **urban defense** is NOT historically dominant at zepa_2 — Žepa village is too small to be modeled as urban under the engine's data-driven P2 schema.

In ICTY-grounded historical record, **one terrain class dominates** at the Žepa enclave-interior (highland forest), with enclave operational mode layered on top. The current engine multiplies all three (urban × forest × enclave) when the data permits, which over-represents the historical terrain advantage. SHAPE B's `MAX(urban, forest, enclave)` collapse correctly reflects the historical record: pick the dominant single class, do not stack three.

### 3.2 Q2 — Does MAX-collapse preserve the historical fact of multiple compounding terrain advantages, OR does it under-represent the historical fortification stack?

**It correctly represents the historical record without under-representing it.**

Reasoning: ICTY Krstić §§122-150 and Popović §§240-250 do not establish that the Žepa defender enjoyed *three* independent terrain advantages. They establish that the Žepa defender held a **single** difficult geographic unit (highland forest with one administrative settlement core) under siege conditions. The historical attacker:defender raw personnel ratio of ≈22:1 means the defender's power-weighted advantage **must be substantial** to even approach plausibility — but "substantial" historically derives from:

1. Terrain (highland forest — the dominant class).
2. Entrenchment over multi-year siege (D5, NOT touched by SHAPE B).
3. Posture (defend / dig_in — D2, NOT touched by SHAPE B).
4. Officer continuity (Avdo Palić's command of 285th — D15, NOT touched by SHAPE B).
5. Enclave hardening / resilience (operational mode — D7 + D11, of which D11 is touched by SHAPE B as one of three).

What the current engine **over-stacks** is the *terrain class* axis: it counts forest (D9) and urban (D8) and enclave (D11) as three *independent* multiplicative terrain advantages. Historically, only one terrain-class axis applies at any single OSID. SHAPE B's MAX-collapse preserves the dominating axis (whichever single class is highest at this OSID) without under-counting the entrenchment, posture, officer, supply, morale, fatigue, or per-brigade-terrain (D13 — formation-level decoration honor multiplier) axes — all of which remain orthogonal and stack independently.

**Caveat (the "with caveat" portion of this sign-off):** SHAPE B does NOT correct the `getEnclaveGarrisonPower` raw additive defender power (~+147 power at zepa_2 capital, per Phase 0 §3.5 item 5), which is a different mechanism than the multiplicative stack. The historian sign-off accepts this as out-of-scope for Phase 1 (it is in `enclave_resilience.ts` which is locked per lane spec) but flags it for future canon work: if AC-3's predicted force_ratio rise to ~0.95-1.05 still does not deliver historically-consistent emergent fall behavior at Stupčanica-95, the next investigation should examine `getEnclaveGarrisonPower` magnitude.

### 3.3 Q3 — Does predicted force_ratio rise (0.831 → ~0.95-1.05) match ICTY-implied force imbalance?

**It is directionally correct and within historical-plausibility bands, with caveat on absolute magnitude.**

ICTY records ≈22:1 raw personnel dominance. The engine's `force_ratio` is **power-weighted, not personnel-weighted**, so a direct numeric comparison is inappropriate. However, the historical force imbalance was decisive enough that the Žepa pocket fell within ~1 week of the operation's full commitment (25 July 1995). For the engine to model historically-consistent emergent fall behavior, the modeled force_ratio at Stupčanica-95 t172 needs to be **at or above the launch threshold** (≥1.0, ideally ≥1.5 for victory class) so that the operation can proceed and resolve.

A predicted rise from 0.831 → ~0.95-1.05 is:

- **Directionally correct** — the magnitude inversion (defender power-weighted exceeds attacker power-weighted) is corrected toward defender-disadvantaged, matching historical record.
- **Within the lower band of historical plausibility** — at ~0.95-1.05, the operation would launch under `VICTORY_THRESHOLD_COSTLY = 1.0` in some configurations, with emergent-fall behavior dependent on the rest of the simulation (corps participation, enclave resilience flag state, reactive sector reserves). This matches the §8.3 (a) "honest correction with emergent outcome" pattern that `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11 requires.
- **NOT necessarily sufficient by itself** — the 22:1 raw ratio is large enough that even with SHAPE B applied, the engine may still under-represent the historical force imbalance if other engine factors (raw garrison add, supply-side calibration, attacker brigade base power) are also under-tuned. The historian sign-off does NOT guarantee historically-consistent fall behavior post-Phase 1; it confirms that SHAPE B is a *necessary* and *historically-honest* component of the correction, not that it is *sufficient* in isolation.

---

## 4. Confirmation of Acceptance Criteria + Stop Triggers (Phase 0 §8 + §9)

The historian sign-off **confirms without modification**:

- **All 13 acceptance criteria** in Phase 0 panel §8 are appropriate and binding from the historical-citation lens.
- **All 6 stop triggers** in Phase 0 panel §9 are appropriate and binding.

**Specifically endorsed:**

- **AC-3** (force_ratio rises from 0.831 to ≥0.95) — historically defensible as the lower bound of the predicted plausibility band.
- **AC-12** (§6 triple sign-off recorded) — this report is slot 1 of 3.
- **AC-13** (188w Phase 1 ruling stated in advance) — both outcome classes (emergent fall OR `enclave_held_through_turn` ghost entry) are §3 / §1.5 #11 canonical.
- **ST-2** (Krivaja-95 force ratios must NOT change) — historian endorses on the ground that Krivaja-95 (Srebrenica) and Stupčanica-95 (Žepa) are operationally adjacent but mechanically distinct in the engine; SHAPE B should affect Žepa more than Srebrenica due to the different terrain-class composition at the two enclave-interior OSIDs (Srebrenica `op:srebrenica:srebrenica_2` is similar highland but of slightly different urban/forest composition than zepa_2; the panel §10 explicitly excludes any side-effect on Krivaja-95).
- **ST-6** (Sarajevo ≤5%, Bihać ≤10%) — historian endorses on the ground that Sarajevo and Bihać are protected enclaves whose historical fortification basis is qualitatively different from Žepa (Sarajevo: large urban + capital-administration; Bihać: urban + besieged enclave). MAX-collapse at these OSIDs picks urban (Sarajevo: 2.0× > enclave 1.0-1.4×; Bihać: 2.0× > enclave 1.0-1.4×), so the change is small absolute. Triple-checking these via runtime probe at Phase 1 implementation time is appropriate.

**No new criteria or triggers are added by the historian sign-off.** Phase 0 §8 + §9 are sufficient.

---

## 5. Sign-Off

**Verdict:** APPROVED-WITH-CAVEAT.

**Caveat:** The historian sign-off is conditional on Phase 1 being honest about what SHAPE B does and does not fix. Specifically:

1. SHAPE B fixes the *terrain-class* over-stacking (urban × forest × enclave triple-multiplication at OSIDs where the historical record supports only one dominant class).
2. SHAPE B does NOT fix the `getEnclaveGarrisonPower` raw additive defender power (which is in `enclave_resilience.ts`, locked per lane spec).
3. SHAPE B does NOT change the entrenchment, posture, officer, supply, morale, fatigue, or per-brigade-terrain axes — all of which remain orthogonal and historically defensible.
4. If post-Phase 1 the modeled Stupčanica-95 force_ratio remains below `VICTORY_THRESHOLD_COSTLY = 1.0` in baseline runs, the appropriate next investigation is `getEnclaveGarrisonPower` (in a separate lane with `enclave_resilience.ts` co-owner per ST-4), NOT a tightening of SHAPE B's MAX-set or a faction-conditional carve-out.

**Phase 1 dispatch eligibility from /historian lens:** **CLEAR**, subject to:
- The remaining two §6 sign-offs (`/game-designer` and `/war-or-game`) being recorded.
- Phase 1's commit message and report explicitly citing this sign-off and its caveat.
- AC-13 (188w prediction ruling) being stated in writing before the 188w sensitive-history regression run.

**Sources cited:** ICTY Krstić IT-98-33-T (§§120-150, 122-150); ICTY Popović IT-05-88-T (§§240-250); UN A/54/549 (1999); Balkan Battlegrounds Vol. II.

**No Wikipedia citation used.** All citations are tribunal or official-investigative source per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 evidence requirement.

---

## 6. Lane Bookkeeping

- **This audit file:** `docs/40_reports/audits/20260505_STUPCANICA_S6_HISTORIAN_SIGN_OFF.md` (NEW).
- **No other files touched in this slot.**
- **Sibling sign-off slots in same commit:**
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md` (slot 2 of 3).
  - `docs/40_reports/audits/20260505_STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md` (slot 3 of 3).
- **Phase 1 implementation lane** dispatches separately AFTER all three sign-offs are recorded and only if all three verdicts are APPROVED or APPROVED-WITH-CAVEAT (DECLINED in any slot blocks Phase 1 dispatch).
