# Central Bosnia / Žepče HRHB Calibration-Ceiling — OOB / Constraint Scoping

**Date:** 2026-06-09
**Author:** calibration + OOB specialist (scenario-creator-runner-tester)
**Status:** SCOPING ONLY — **CALIBRATION-LAST. DO NOT IMPLEMENT.** Read-only investigation; no code/data/scenario/baseline changed. This is build-ready scoping for the eventual single finalization pass.
**Floor of record:** 188w 649/712, hash `d311eeac18492683` (#325, 2026-06-08); 40w `235c61f408dc3d95`. (`CALIBRATION_MASTER.md` header.)

---

## TL;DR

- **Still mismatched at the 649 floor: 10 OSIDs**, ALL one direction — `sim=HRHB ∧ painted=RBiH` (HVO over-holds RBiH-painted tiles). [Run-confirmed — see §1.]
- The memo's **3 Žepče enclave-core OSIDs are RESOLVED** (`sim=HRHB=painted`) — the enclave-resilience hardening + `enclave` tag already closed the ARBiH-over-capture direction. So the old "13 OSID" list is now **10 open + 3 closed.**
- **Root cause is NOT an ARBiH manpower deficit and NOT an OOB strength imbalance.** It is **HVO Central-Bosnia over-expansion during the bilateral ARBiH–HVO war stance window**, frozen permanently by the Washington alliance. The HVO `hvo_central_bosnia` corps goes **offensive** while `war_alliance_rbih_hrhb < 0` (`bot_corps_stance.ts` lines 252–256 + the "Lasva Offensive" standing order), pushes OUT of its enclaves onto these 10 tiles, and after `washington_signed` the alliance bars ARBiH from ever retaking them.
- **Top candidate lever (HVO-side constraint):** bound the `hvo_central_bosnia` bilateral-war offensive stance to enclave-territory recapture only — i.e. deny the offensive-out-of-enclave stance (or cap it to `balanced`) for the central-Bosnia corps, so the 1993 war nets the *historical* outcome (ARBiH pushed HVO INTO the enclaves, not HVO expanding out). This is an **engine/stance** change, not an OOB-row edit.
- **Western-cascade risk: LOW.** `hvo_central_bosnia` brigades are referenced in ZERO western/Storm/Mistral/Cincar catalogs (those use `hvo_tomislavgrad` + HV loans). The Srebrenica-ring ↔ VRS-2nd-Krajina cascade is unrelated. The only in-region interaction to validate is Žepče enclave-hold (the now-resolved 3 cores) at 188w.
- **Honest verdict: REAL but BOUNDED end-state headroom (~+5 to +10 OSID upper bound), gated behind an engine-behavior change (HVO bilateral-war stance), NOT a one-row OOB tweak.** It is a genuine lever, but it is a **deep / multi-touch redesign** (stance-window scoping + 188w cascade validation), not a surgical OOB number. Treat as a calibration-LAST engine lane, not a quick OOB win.

---

## 1. What is still mismatched at the 649 floor

**Measurement basis:** sim controller (`final_save.json → political.political_controllers`) vs painted target (`data/source/calibration/painted_control_oct1995.json → by_settlement_id`).

The memo's 13-OSID list, evaluated at the current floor:

| OSID | painted oct1995 | sim @ floor | status |
|---|---|---|---|
| op:bugojno:medini | RBiH | HRHB | **MISMATCH** |
| op:fojnica:bakovici_2 | RBiH | HRHB | **MISMATCH** |
| op:gornji_vakuf:zdrimci | RBiH | HRHB | **MISMATCH** |
| op:jablanica:doljani_2 | RBiH | HRHB | **MISMATCH** |
| op:kiseljak:brnjaci_2 | RBiH | HRHB | **MISMATCH** |
| op:kresevo:kresevo_2 | RBiH | HRHB | **MISMATCH** |
| op:novi_travnik:rat_2 | RBiH | HRHB | **MISMATCH** |
| op:novi_travnik:ruda_2 | RBiH | HRHB | **MISMATCH** |
| op:prozor:ustirama_3 | RBiH | HRHB | **MISMATCH** |
| op:prozor:uzdol_2 | RBiH | HRHB | **MISMATCH** |
| op:zepce:ozimica_2 | HRHB | HRHB | OK (resolved) |
| op:zepce:viniste_2 | HRHB | HRHB | OK (resolved) |
| op:zepce:zepce_2 | HRHB | HRHB | OK (resolved) |

**Count still open: 10 OSIDs, all `sim=HRHB ∧ painted=RBiH`.** The 3 Žepče cores are closed (consistent with the 2026-06-07 memo update: zero ARBiH over-captures of HVO-painted tiles map-wide).

> **Run-confirmed at the floor.** A fresh HEAD 188w was run read-only (`--out runs`, n2024) and produced `final_state_hash = d311eeac18492683` — byte-for-byte the 649 floor hash, confirming HEAD is calibration-flat (the 11 post-floor commits are docs/UI/negotiation/free-war-emergent/codex — all calibration-inert). At that authoritative 649 run the central-Bosnia mismatch set is **exactly the 10 rows above, all `sim=HRHB ∧ painted=RBiH`, 3 Žepče cores OK.** Also cross-checked against the prior on-disk 630 run (n2022) — identical set, since the 630→649 work (PR-3 Farz-95 / PR-1 v2 casualty-model / #325 PDP+E-A5) is all western/late-war/political and never touched central Bosnia.

---

## 2. Per-OSID root cause

### 2a. Historical trajectory (painted, by date) — establishes the target is stable RBiH

| OSID | jan1993 | apr1994 | apr1995 | oct1995 |
|---|---|---|---|---|
| bugojno:medini | HRHB | RBiH | RBiH | RBiH |
| fojnica:bakovici_2 | HRHB | RBiH | RBiH | RBiH |
| gornji_vakuf:zdrimci | HRHB | RBiH | RBiH | RBiH |
| kresevo:kresevo_2 | HRHB | RBiH | RBiH | RBiH |
| novi_travnik:ruda_2 | HRHB | RBiH | RBiH | RBiH |
| jablanica:doljani_2 | RBiH | RBiH | RBiH | RBiH |
| kiseljak:brnjaci_2 | RBiH | RBiH | RBiH | RBiH |
| novi_travnik:rat_2 | RBiH | RBiH | RBiH | RBiH |
| prozor:ustirama_3 | RBiH | RBiH | RBiH | RBiH |
| prozor:uzdol_2 | RBiH | RBiH | RBiH | RBiH |

Two historical sub-groups:
- **5 tiles** (medini, bakovici_2, zdrimci, kresevo_2, ruda_2): HRHB in jan1993, **flipped to RBiH by apr1994** — these were taken by the ARBiH 1993 central-Bosnia counteroffensives (3rd Corps Travnik/Novi Travnik June 1993; Bugojno late-July 1993; Fojnica; Gornji Vakuf sector) and held thereafter. The sim **under-models the ARBiH 1993 gains** and leaves them HVO.
- **5 tiles** (doljani_2, brnjaci_2, rat_2, ustirama_3, uzdol_2): **RBiH from jan1993 through oct1995** — never HVO in the painted history. The sim **wrongly flips them to HVO** (pure over-expansion that never happened).

Net: the real 1993 ARBiH–HVO war in central Bosnia was a **net ARBiH gain** (HVO pushed back into the Lašva/Kiseljak/Žepče enclaves). The sim produces a **net HVO gain on these tiles** — the wrong sign.

### 2b. Adjacency: these are HVO salients in mostly-RBiH territory, NOT deep pockets

Neighbor-controller breakdown (sim control @ 630-floor, contact graph `data/derived/operational/operational_contact_graph.json`):

| OSID | deg | RBiH nbrs | HRHB nbrs | RS nbrs |
|---|---|---|---|---|
| bugojno:medini | 5 | 4 | 1 | 0 |
| fojnica:bakovici_2 | 6 | 5 | 1 | 0 |
| gornji_vakuf:zdrimci | 7 | 5 | 2 | 0 |
| jablanica:doljani_2 | 7 | 2 | 5 | 0 |
| kiseljak:brnjaci_2 | 6 | 3 | 3 | 0 |
| kresevo:kresevo_2 | 6 | 4 | 2 | 0 |
| novi_travnik:rat_2 | 5 | 4 | 1 | 0 |
| novi_travnik:ruda_2 | 7 | 5 | 2 | 0 |
| prozor:ustirama_3 | 6 | 1 | 5 | 0 |
| prozor:uzdol_2 | 9 | 7 | 2 | 0 |

**8 of 10 are RBiH-majority-surrounded** (only doljani_2 and ustirama_3 sit inside the HVO pocket). These 8 are organically reachable by ARBiH — exactly the memo's "ARBiH has overwhelming local superiority but doesn't take them" picture. ARBiH *can* reach them; it never wins or never tries.

### 2c. The mechanism — HVO offensive-out-of-enclave + Washington freeze

`src/sim/combat/bot_corps_stance.ts`:
- Lines 248–256: while `rbih_hrhb_state.washington_signed` is false and `war_alliance_rbih_hrhb < 0.0` (open bilateral war), any non-Herzegovina HRHB corps (which includes `hvo_central_bosnia`) goes **`offensive`** when `avgPers ≥ 0.5 ∧ avgCoh ≥ 40`.
- Lines 242–247 + `setArmyStandingOrder` (lines 367–373): the **"Lasva Offensive"** standing order pushes the same corps to general-offensive during the war window.
- Line 269–274: `hvo_central_bosnia` is held `defensive` ONLY *before* the bilateral war starts; once it starts, the offensive branch governs.

So during the bilateral-war window the 9,700-pers / 12-brigade `hvo_central_bosnia` corps (incl. a 1,400 + a 1,300 brigade and the elite motorized `hrhb_vitezovi_brigade_vitez`) attacks OUT of the enclaves and captures these 10 tiles. After `washington_signed`, the alliance bars ARBiH from attacking HVO — the captured tiles are **frozen HVO-held to oct1995.** There is no ARBiH operation in any catalog that targets HVO-held central-Bosnia tiles (the `operation_opportunity_catalog_central_bosnia.ts` ops — Vlasic, Donji Vakuf, Kupres/Cincar — all gate `enemyWeakness` on `ctrl === 'RS'`, i.e. they are anti-VRS Federation ops, NOT anti-HVO).

### 2d. The 4 enclave-list tiles get a second lock

`brnjaci_2` + `kresevo_2` (kiseljak enclave) and `rat_2` + `ruda_2` (lasva_valley enclave) are members of `ENCLAVE_DEFINITIONS` osid_lists in `enclave_resilience.ts`. They receive the enclave-resilience **defense bonus** (lasva 1.0+25×0.02=1.50×; kiseljak up to 1.40×). So even if ARBiH did assault them, the same hardening that correctly protects the HVO *cores* also protects these 4 RBiH-painted peripheral tiles. **The enclave osid_lists are drawn slightly too generously** — they include 4 tiles the painted target assigns to RBiH.

### 2e. Why "contain" was inert (confirms the lever is elsewhere)

`contain_diagnostic.ts` / `isEnclaveContainable` operate on the enclave member osid_lists and answer "can the besieger *contain* (suppress assault-generation against) this enclave?". That addresses the ARBiH-suppress-HVO-enclave direction — which is already moot (ARBiH assaults already fail / the cores already hold). It does **nothing** about HVO LEAVING its enclave to take RBiH tiles. The remaining gap is the offensive-expansion direction, on the HVO stance side — not containment.

---

## 3. Candidate OOB / constraint change(s)

> Ranked. All are **HVO-side constraint** or **enclave-geometry** changes, per the corrected mandate. None is a simple OOB strength edit (the OOB strengths are roughly correct: HVO central-Bosnia 9.7k matches BB's ~50k-total / 4-OZ split; ARBiH 3rd Corps 13.0k / 27 bdes already outweighs it — the problem is *stance*, not *manpower*).

### Candidate A (TOP) — Constrain `hvo_central_bosnia` bilateral-war stance to enclave-recapture only

**What:** In `bot_corps_stance.ts`, deny the offensive-out-of-enclave branch for `corps.id === 'hvo_central_bosnia'` — cap that corps to `balanced` (defend + local recapture inside enclave territory) during the bilateral war, instead of `offensive`. Equivalently, scope the "Lasva Offensive" standing order so `hvo_central_bosnia` does not project beyond its enclave osid set.
**Expected OSID effect:** the 6 non-enclave-list tiles (medini, bakovici_2, zdrimci, doljani_2, ustirama_3, uzdol_2) are never captured by HVO → they remain RBiH from the start → up to **+6 OSID** toward painted. The 4 enclave-list tiles (brnjaci_2, kresevo_2, rat_2, ruda_2) may still be held via the resilience bonus (needs Candidate B to fully close).
**Historical cite:** ICTY *Blaškić* (IT-95-14) and *Kordić & Čerkez* (IT-95-14/2) establish the Lašva-Valley HVO as a besieged enclave force from mid-1993, not an expanding one; the ARBiH 3rd Corps held the operational initiative in central Bosnia from summer 1993 (corroborated by the painted jan1993→apr1994 flips in §2a, which are the data encoding of those ARBiH gains). BB is consistent but is NOT the load-bearing source here — the painted dated-control + ICTY enclave geography are.
**Cascade risk:** LOW. No western/Storm/Mistral/Cincar op references `hvo_central_bosnia` brigades. Validate only that the 3 Žepče cores + the kiseljak/lasva cores still HOLD HRHB at 188w (the stance cap must not let ARBiH over-run the cores — but ARBiH assaults already fail against the hardened cores, so this is expected safe).

### Candidate B (PAIR with A) — Tighten 4 over-generous enclave osid_list entries

**What:** Remove the 4 RBiH-painted peripheral tiles from the `ENCLAVE_DEFINITIONS` osid_lists in `enclave_resilience.ts`: drop `op:kiseljak:brnjaci_2` + `op:kresevo:kresevo_2` from `kiseljak`, and `op:novi_travnik:rat_2` + `op:novi_travnik:ruda_2` from `lasva_valley`. (Keep the true cores: kiseljak_2, vitez_2, busovaca_2, etc.)
**Expected OSID effect:** removes the resilience defense-bonus lock on those 4 tiles so that, with Candidate A denying HVO the offensive that took them, they resolve RBiH → up to **+4 OSID** (combined A+B upper bound ≈ +10).
**Historical cite:** painted oct1995 assigns all 4 to RBiH; the enclave cores per ICTY Lašva-Valley geography are the towns (Vitez, Busovača, Kiseljak, Kreševo, Novi Travnik centre), not these peripheral OSIDs. The osid_lists were authored slightly wide.
**Cascade risk:** LOW within region; must re-confirm the *core* enclaves still hold (removing periphery should not weaken core defense — the core OSIDs keep their bonus).

### Candidate C (ALTERNATIVE / weaker) — Boost ARBiH 3rd Corps blocking density, not strength

**What:** Rather than constrain HVO, give ARBiH 3rd Corps positional superiority to BLOCK the HVO expansion (e.g. a `must_hold` pin on the 8 RBiH-surrounded tiles via the existing `pinGarrisonToMustHoldFrontEdge` mechanism, or a small available-earlier / cohesion bump on the 3rd-Corps brigades facing the enclaves).
**Expected OSID effect:** uncertain — blocking is reactive and the HVO offensive may still win individual tiles; likely **+2 to +5**, less reliable than A.
**Historical cite:** ARBiH 3rd Corps numerical superiority is real (13.0k vs 9.7k) and historically decisive in 1993; but encoding it as a garrison-pin is a sim artifact, not a historical mechanic.
**Cascade risk:** LOW, but the `must_hold` pin mechanism has known per-brigade interactions (cf. Zvornik garrison-pin work) — needs care.

**Recommended package:** **A + B together** (one-change-per-run discipline means they must each be measured solo first, then as a pair). A alone closes the 6 non-enclave tiles; B alone is inert without A (HVO still takes them offensively); A+B is the full ~+10 ceiling. **Per one-change-per-run, sequence: A solo (expect ~+6) → A+B (expect ~+10), each 188w-validated.**

---

## 4. Honest headroom verdict

**REAL but BOUNDED headroom, gated behind an ENGINE-BEHAVIOR change — not a one-row OOB tweak, and not "already closed."**

- It is a **genuine lever**: the sim produces the wrong *sign* on the 1993 ARBiH–HVO central-Bosnia war (net HVO gain vs the historical net ARBiH gain), and the mechanism is identified and isolated (HVO `hvo_central_bosnia` offensive-out-of-enclave stance, frozen by Washington). Closing it is worth up to **+10 OSID** (649 → ~659).
- It is **NOT an OOB manpower problem** — the corrected mandate is right to drop the ARBiH-manpower direction. OOB strengths are roughly historical; the defect is stance/behavior + slightly-wide enclave osid_lists.
- It is **NOT already closed** — the 3 Žepče cores closed, but 10 RBiH-painted tiles remain open and are NOT resolved by the Washington freeze (the freeze LOCKS the error rather than resolving it; the mid-game transient becomes the end state because the tiles are captured *before* the freeze, not after).
- It IS a **deep / multi-touch lane**, not a quick win: it requires an engine stance-scoping change (Candidate A) + an enclave-geometry edit (Candidate B), each measured solo at 188w under one-change-per-run, with explicit re-validation that the now-resolved Žepče/Kiseljak/Lašva *cores* still hold HRHB. Treat it as a **calibration-LAST engine lane**, scheduled into the single finalization pass — not picked up as an autonomous OOB micro-edit.

**Do NOT implement now.** This document is the build-ready scope for that finalization pass.

---

## Appendix — sources inspected (read-only)

- `docs/40_reports/CALIBRATION_MASTER.md` (floor header)
- `data/source/calibration/painted_control_{jan1993,apr1994,apr1995,oct1995}.json`
- `data/source/oob_brigades.json` (`hvo_central_bosnia`, `arbih_3rd_corps`, `arbih_2nd_corps` rows)
- `data/derived/operational/operational_contact_graph.json` (adjacency)
- `src/sim/combat/bot_corps_stance.ts` (HVO offensive stance + Lasva Offensive)
- `src/sim/combat/enclave_resilience.ts` (ENCLAVE_DEFINITIONS osid_lists + config)
- `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` (all anti-VRS, none anti-HVO)
- `src/sim/combat/contain_diagnostic.ts` (why contain was inert)
- `runs/apr1992_definitive_188w__…_n2022/final_save.json` (sim controllers, 630 cross-ref) + fresh HEAD 188w (649 confirm)
- Memory: `calibration_central_bosnia_hrhb_ceiling.md` (incl. 2026-06-07 contain-NO-GO update), `enclave_mechanics_research.md`
