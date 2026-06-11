# Western Krajina Next Calibration Levers — Scoping Brief
**Date:** 2026-06-11 | **Floor:** 651/712 | **Author:** Operations Expert + Historian scoping pass
**Run analysed:** `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n15` (w188, n=15)

---

## Important Calibration Note: Painted-Target Mismatch

The `compare_painted_vs_sim.cjs` tool defaults to `jan1993` as its painted target. The 188w
calibration scenario runs to October 1995 (w188 ≈ 4 years from Apr 1992). The authoritative
painted target for 188w is **`painted_control_oct1995.json`** (315 RS / 290 RBiH / 107 HRHB).

The Sipovo cluster (5 OSIDs), Drvar/Titov Drvar cluster (3 OSIDs), and Donji Vakuf cluster
(4 OSIDs) appear as *mismatches* in the jan1993 compare output but are **already correct**
against oct1995 (sim=HRHB or RBiH matches the oct1995 painted target). These are NOT open
calibration lanes.

The Mrkonjić Grad cluster also appears correct against jan1993 (both RS) but is a **mismatch
against oct1995** (oct1995=HRHB, sim=RS). This is the primary open lane.

All analysis below uses oct1995 as the painted reference.

---

## Western-Krajina Mismatch Set at 651 (oct1995 vs w188 sim)

| OSID | oct1995 Painted | Sim w188 | Status |
|------|----------------|----------|--------|
| op:mrkonjic_grad:gerzovo_2 | HRHB | RS | MISS |
| op:mrkonjic_grad:majdan_2 | HRHB | RS | MISS |
| op:mrkonjic_grad:podrasnica_2 | HRHB | RS | MISS |
| op:mrkonjic_grad:mrkonjic_grad_2 | HRHB | RS | MISS |
| op:mrkonjic_grad:bjelajce_2 | HRHB | RS | MISS |
| op:mrkonjic_grad:baljvine_2 | HRHB | RS | MISS |
| op:jajce:jajce_3 | HRHB | RS | MISS |
| op:jajce:bravnice | HRHB | RS | MISS |
| op:jajce:barevo_2 | HRHB | RS | MISS |
| op:jajce:vinac_2 | HRHB | RS | MISS |
| op:jajce:lupnica | HRHB | RS | MISS |
| op:jajce:jezero_2 | HRHB | RS | MISS |
| op:jajce:prisoje | HRHB | RS | MISS |
| op:kljuc:krasulje_2 | RBiH | RS | MISS |
| op:kljuc:donji_vrbljani_2 | HRHB | RS | MISS |
| op:bosanski_novi:krslje_2 | RBiH | RS | MISS |
| op:bosanski_novi:matavazi_2 | RBiH | RS | MISS |

Already-correct western OSIDs (NOT open lanes): op:sipovo:* (5, HRHB=HRHB), op:titov_drvar:*
(3, HRHB=HRHB), op:donji_vakuf:* (4, RBiH=RBiH), op:jajce:grdovo (RBiH=RBiH).

Bosanski Novi confirmation: krslje_2 and matavazi_2 are **correctly RS** per jan1993 baseline;
they were *transferred to Federation control* during Op Sana October 1995. The oct1995 painted
target shows RBiH. The remaining 6 Bosanski Novi OSIDs (blagaj_japra, dobrljin_2, novi_grad_3,
poljavnice, suhaca_4, svodna_2) are correctly RS in both painted and sim — these are RS-retained
at Dayton (west-bank Una corridor). No historian flag on krslje_2/matavazi_2 — RBiH oct1995 is
well-grounded (BB1 p.420: 5th Corps completed Una-Sana sweep by ~10 Oct 1995).

---

## Candidate Lever Analysis

### LEVER A — Southern Move Brigade Fix (Mrkonjić Grad, +6 OSID)
**Op:** `southern_move_95` | **Lane type:** Brigade roster fix (wrong corps assignment)

**Root cause (proven from AAR):** Southern Move fired t182, outcome=failure, blocker=
`zero_eligible_axis`. All 3 brigades named in the axis definition — `hvo_1st_guard_abb`,
`hvo_2nd_guard_mechanized`, `hvo_3rd_guard_jastrebowi` — are assigned to `hvo_main_staff`
at w182/w188, NOT to `hvo_tomislavgrad` (the op host corps). The `reconcileOperationRoster`
function drops brigades whose corps claim ≠ host corps. Result: empty roster, zero attacks.
This is the **same bug class** as the Mistral 1 Wave 19A fix (also `hvo_main_staff` vs
`hvo_tomislavgrad`).

**Fix:** Substitute brigades that ARE in `hvo_tomislavgrad` at w182. From the w188 final save:

| Brigade | Corps at w188 | Status | Personnel |
|---------|--------------|--------|-----------|
| hv_4th_guards_split | hvo_tomislavgrad | active | 2568 |
| hrhb_kralj_petar_kreimir_iv_brigade | hvo_tomislavgrad | active | 1638 |
| hrhb_kralj_tomislav_brigade | hvo_tomislavgrad | active | 1800 |
| hvo_rama_brigade | hvo_tomislavgrad | active | 1313 |
| hv_1st_guards_tigers | hvo_tomislavgrad | active | 1865 |
| hv_5th_guards_karlovac | hvo_tomislavgrad | active | 2113 |

The 3 phantom brigades in the current axis definition (`hv_4th_guards_brigade_1995`,
`hv_7th_guards_brigade_1995`, `hv_134th_hgr_1995`) are NOT FOUND in the final save —
they are not in the OOB. Replace the 6 SOUTHERN_MOVE_AXES brigades with 3-4 from the
above `hvo_tomislavgrad`-resident pool. Avoid reusing brigades that Mistral 2's sipovo_axis
consumed (hvo_3rd_guard_jastrebovi + hvo_rama_brigade were the Sipovo axis — check their
status after Mistral 2 completes ~t182).

**Adjacency confirmed:** `op:sipovo:sipovo_2` (HRHB staging, Mistral 2 captured it) is
directly adjacent to `op:mrkonjic_grad:gerzovo_2` and `op:mrkonjic_grad:majdan_2`.
The staging anchor is held. The op fires within the window (t182-t188). No adjacency problem.

**Historical correctness:** Mrkonjić Grad fell 10 October 1995 to HV/HVO (4th and 7th Guards
Brigade joint assault from the Šipovo direction — BB1 ch.28, ICTY Gotovina §58-62). oct1995
painted = HRHB. **Historian gate: PASS.** §6 risk: none (western, no enclave).

**Tractability: HIGH.** Single roster edit, same fix class as Wave 19A. Predicted ΔOSID: +6
(all 6 Mrkonjić objectives; force ratio estimate = 29.8 in the AAR despite zero attacks,
indicating overwhelming superiority if brigades are eligible).

---

### LEVER B — Bosanski Novi Krupa-Axis Extension (+2 OSID)
**Op:** `sana_95` (sana_krupa axis extension) | **Lane type:** Axis-extend (append 2 OSIDs)

**Root cause:** `op:bosanski_novi:krslje_2` and `op:bosanski_novi:matavazi_2` have NO catalog
op owner. They are directly adjacent to `op:bosanska_krupa:donji_dubovik_2` and
`op:bosanska_krupa:ivanjska_2` — both of which are RBiH at w188 (captured by the sana_krupa
axis). The Krupa axis terminus is `jasenica_2` (all 7 krupa objectives captured) and the
adjacent `donji_dubovik_2` and `ivanjska_2` are RBiH — giving the axis a live front edge into
Bosanski Novi territory.

**Fix:** Append `op:bosanski_novi:krslje_2` and `op:bosanski_novi:matavazi_2` to the end of
`KRUPA_VALLEY_OBJECTIVES` in the sana_krupa axis. Adjacency walk: the Krupa axis already
holds `donji_dubovik_2` (adjacent to both targets). Order: krslje_2 first (adj donji_dubovik_2),
then matavazi_2 (adj donji_dubovik_2, ivanjska_2, krslje_2). The date window is t175-t200
(already wide enough).

**Historical correctness:** BB1 p.420 records the 5th Corps sweeping the Una-Sana valley to
the Bosanski Novi area by early October 1995; krslje_2 and matavazi_2 are in the strip between
Bosanska Krupa and Bosanski Novi town that passed to Federation control.
Bosanski Novi town itself and the right-bank Una (blagaj_japra, dobrljin_2, novi_grad_3,
poljavnice, suhaca_4, svodna_2) remained RS at Dayton — do NOT extend further. The two
proposed OSIDs are correct. **Historian gate: PASS.** §6 risk: none.

**Tractability: HIGH.** Trivially append 2 OSIDs to existing axis. The brigades (511th, 505th,
510th) are on a 13-deep axis — they have the momentum and the front edge is live.
Predicted ΔOSID: +2.

---

### LEVER C — Jajce Ring Axis Re-activation (+7 OSID, but HRHB complication)
**Op:** `jajce_95` (add ring axis back) | **Lane type:** Axis-re-enable + faction issue

**Root cause:** JAJCE_AXES currently contains only the NEAR axis (jajce_recovery_near —
1 objective: grdovo, which DID fire and succeed). The RING axis (jajce_ring_recovery — 7
objectives: jajce_3, bravnice, barevo_2, vinac_2, lupnica, jezero_2, prisoje) was dropped in
Wave 14C because the ring brigades (717th/727th/737th) had different sector assignments.
The NEAR axis captured grdovo at t178-t181; jajce_3 IS adjacent to grdovo (confirmed from
contact graph). The corridor is now open.

**Complication — faction mismatch:** The oct1995 painted target shows jajce_3/bravnice/
barevo_2/vinac_2/lupnica/jezero_2/prisoje as **HRHB**, not RBiH. The `jajce_95` op is an
RBiH operation (arbih_3rd_corps). If the ring axis captures these for RBiH, all 7 would be
RBiH mismatches against the oct1995 HRHB painted target — the same OSID count but with
wrong faction. **This would not improve score; it would break 7 different OSIDs.**

**Historical basis:** Jajce fell 13-14 Sep 1995 to a joint ARBiH 7th Corps (Alagić) + HVO
push. The HVO subsequently occupied the town and surrounding villages (Jajce is a Croat-
majority pre-war area). The HRHB occupation is historically correct for the oct1995 freeze.
The RBiH op can take grdovo (the initial ARBiH 7th Corps approach) but not the Jajce ring
(HVO-occupied after joint assault).

**Resolution options:**
- Option A: Add a second HRHB op for the Jajce ring (new `jajce_ring_hrhb_95` opportunity on
  hvo_tomislavgrad, staging from grdovo once RBiH-held). Complex — requires HVO sector reach
  into Jajce (vrs_1st_krajina holds those OSIDs; hvo_tomislavgrad has no Jajce front sector).
- Option B: Accept the 7-OSID Jajce ring gap as a structural ceiling (faction ownership
  complexity, no clean single-corps instrument). Flag for post-1.0.

**Tractability: CEILING (faction ownership).** Do not attempt for this bundle. Flag as
structural gap — a future combined-arms event (joint ARBiH+HVO assault with HVO occupation
handoff) would be the correct instrument, but that is multi-event complexity beyond the
catalog-lever lane. Predicted ΔOSID if attempted naively: 0 (wrong faction, same miss count
but different faction).

---

### LEVER D — krasulje_2 Budget Extension (+1 OSID)
**Op:** `sana_95` (sana_bihac_petrovac axis, Petrovac extension tail) | **Lane type:** Axis timing

**Root cause:** krasulje_2 is the final OSID in the BIHAC_PETROVAC_OBJECTIVES list (appended
by the Ključ re-root, panel-GO 2026-06-11). The axis chain is 13 deep (ripac → racic → orasac_2
→ vrtoce → prkosi → vodjenica → kolonic_2 → bosanski_petrovac_2 → dobro_selo_2 → jasenovac_2
→ hadzici → kljuc_2 → krasulje_2). The CALIBRATION MASTER notes that krasulje_2 was "still out
of budget" in the Ključ re-root run — the axis runs out of turns before reaching it.
kljuc_2 IS now RBiH (the re-root delivered hadzici + kljuc_2); krasulje_2 is adjacent to kljuc_2
(confirmed adjacency). Historical: krasulje_2 was captured with Ključ (17 Sep 1995) — it is the
deepest Ključ interior. oct1995 painted = RBiH. **Historian gate: PASS.**

**Tractability: LOW-MEDIUM.** The sana_bihac_petrovac axis is already 13-deep. The axis fires
t175 and the window closes t200 — 25 turns to walk 13 objectives. At ~1-2 turns per objective
(historical tempo), the tail reaches turn ~187-188, right at the budget edge. The 2026-06-11
re-root panel note explicitly says "krasulje_2 stays RS — deepest objective, still out of budget."
Options: (a) extend the date window slightly, (b) increase brigade count on the Petrovac axis
to accelerate tempo, (c) accept as structural depth ceiling. Given it is 1 OSID and the axis
is already at its natural limit, this is LOW priority relative to Levers A and B.

---

### LEVER E — donji_vrbljani_2 (+1 OSID, HRHB, no op owner)
**Op:** None currently | **Lane type:** New-axis or Southern Move tail extension

**Situation:** oct1995 painted = HRHB, sim = RS. donji_vrbljani_2 is adjacent to:
kljuc_2 (RBiH), kljuc:donje_ratkovo_2 (sim=RS), mrkonjic_grad:gerzovo_2 (RS),
mrkonjic_grad:mrkonjic_grad_2 (RS), titov_drvar:prekaja_2 (HRHB). It sits between
the Ključ interior (RBiH) and the Mrkonjić cluster (RS-pending Southern Move). With
Southern Move fixed (Lever A), gerzovo_2 and mrkonjic_grad_2 would become HRHB, making
donji_vrbljani_2 a contiguous HRHB-surrounded OSID. It could be added as a Southern Move
tail objective (adjacent to gerzovo_2 which is a Southern Move objective).

**Historical correctness:** donji_vrbljani_2 is in Ključ municipality but was HVO-held
at Dayton (the western Ključ fringe along the Sana river that became HRHB territory per
IEBL). oct1995 painted HRHB is correct. **Historian gate: PASS tentatively** (flag for
verification — this is at the RBiH/HRHB interface zone in Ključ; cross-check IEBL map).

**Tractability: MEDIUM.** Depends on Southern Move (Lever A) being fixed first — it would
be a 1-OSID Southern Move tail extension. Should be bundled with Lever A in the same
attribution matrix run rather than as a separate serial lane. Predicted ΔOSID: +1.

---

## Prioritized Candidate Table

| # | OSID(s) | Owning Op/Lane | Lever Type | Tractability | Predicted ΔOSID | §6 Risk | Historical Correct | Recommended |
|---|---------|---------------|------------|--------------|-----------------|---------|-------------------|-------------|
| **A** | mrkonjic_grad ×6 | southern_move_95 | Brigade roster fix (wrong corps) | **HIGH** | **+6** | None | Yes (oct1995=HRHB, fell 10 Oct 1995) | **YES — next run** |
| **B** | bosanski_novi ×2 | sana_95 sana_krupa axis | Axis-extend (append 2 OSIDs) | **HIGH** | **+2** | None | Yes (5th Corps Una sweep Oct 1995) | **YES — next run** |
| **E** | kljuc:donji_vrbljani_2 | southern_move_95 tail | Axis-extend (1-OSID tail) | MEDIUM | +1 | None | Tentative-yes (flag for IEBL verify) | Bundle with A |
| **D** | kljuc:krasulje_2 | sana_95 petrovac axis | Timing/depth (budget edge) | LOW-MEDIUM | +1 | None | Yes | After A+B land |
| **C** | jajce ring ×7 | jajce_95 (RBiH) | Faction ceiling — HRHB needed | **CEILING** | 0 (wrong faction) | None | N/A — faction mismatch blocks it | **NO — post-1.0** |

---

## Recommended Next Bundle

**Run 1 (serial, one-change rule):** Lever A alone — fix Southern Move brigade roster
(substitute hvo_tomislavgrad-resident brigades: suggest hv_4th_guards_split + hrhb_kralj_petar_kreimir_iv +
hrhb_kralj_tomislav replacing the 3 phantom/wrong-corps brigades). Expected +6 OSID → 657/712.
40w must remain byte-identical (Southern Move fires t≥182, outside 40w window).

**Run 2 (after A confirmed GO):** Lever B — append krslje_2 + matavazi_2 to sana_krupa
axis. Expected +2 → 659/712. Verify Krupa axis brigades still have tempo budget.

**Run 3 (after B confirmed GO):** Consider Lever A+E bundle (donji_vrbljani_2 as Southern
Move tail objective) only if IEBL historian verification passes. +1 → 660/712.

**Do not attempt Lever C (Jajce ring)** until a joint ARBiH+HVO dual-faction operation
instrument exists. The existing RBiH jajce_95 op would score 0 improvement — it would
replace 7 RS mismatches with 7 RBiH mismatches (same count, different faction).

---

## Honest Assessment of Remaining Western Ceiling

After Levers A + B + E (if confirmed), the western-Krajina residual mismatches would be:
- krasulje_2 (1 OSID) — depth/timing ceiling
- jajce ring (7 OSIDs) — faction-ownership ceiling (HRHB, no instrument)
- donji_vrbljani_2 (1 OSID) — absorbed by Lever E or remaining gap

**The remaining western mismatches are a mix of a tractable brigade-roster fix (A, HIGH
priority), a small axis extension (B), and structural ceilings (Jajce ring = faction
ownership, krasulje_2 = depth).** The bulk of the open ΔOSID is in the Mrkonjić cluster
(+6) — that is the clear next lever. The Jajce ring gap is honest deadweight at 651 that
cannot be recovered via the existing RBiH catalog without a new HRHB instrument.

---

## Calibration Discipline Notes

- Run Lever A and Lever B serially (one-change-per-run rule). Do not bundle A+B.
- Both fire t≥175 — 40w structural_fingerprint_40w `3649b3861a87e6ea` must remain
  byte-identical after each change.
- No §6 implications in any of these western lanes.
- The 188w floor hash `f1037b915734c192` is the authoritative control baseline.
- Bosanski Novi krslje_2/matavazi_2 are NOT the RS-retained Dayton strip — confirmed
  oct1995=RBiH. The RS-retained strip (blagaj_japra, dobrljin_2, novi_grad_3, poljavnice,
  suhaca_4, svodna_2) are correct in sim. Do not touch those.
