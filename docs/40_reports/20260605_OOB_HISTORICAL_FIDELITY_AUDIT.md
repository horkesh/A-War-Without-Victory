# OOB Historical-Fidelity Audit — Corps HQs + Notable Formations

**Date:** 2026-06-05
**Scope:** `data/source/oob_corps.json` (all corps HQs) + spot-check of notable/elite/named brigades in `data/source/oob_brigades.json`.
**Method:** Cross-check live OOB against **Wikipedia + general web FIRST**, then Balkan Battlegrounds (BB) and the ORDER_OF_BATTLE masters. Per owner directive (2026-06-04), Wikipedia/web **outranks** BB the moment BB is contradicted or in doubt — the motivating case is PR #180 (4th Corps HQ was BB-sourced to Jablanica but historically East Mostar; Wikipedia caught it).
**Constraint:** READ-ONLY research. No data file was edited. One packet file only.

---

## 1. Corps-HQ Table (all 19 corps/staff entities)

OOB value = `hq_mun` (and `hq_osid` slug). "Historical HQ" column is Wikipedia-first, BB/ICTY where Wikipedia is silent. Agreement Y/N and confidence noted.

| Corps (id) | Faction | OOB hq_mun / osid | Historical HQ (Wikipedia/web first) | Agree | Conf | Source |
|---|---|---|---|---|---|---|
| arbih_general_staff | RBiH | kakanj / kakanj_2 | Sarajevo (Presidency); **part relocated to KM Kakanj early 1994** | ~ | med | WP Supreme Command of ARBiH |
| arbih_1st_corps | RBiH | centar_sarajevo | Sarajevo | Y | high | WP 1st Corps |
| arbih_2nd_corps | RBiH | tuzla | Tuzla | Y | high | WP 2nd Corps |
| arbih_3rd_corps | RBiH | zenica | Zenica | Y | high | WP 3rd Corps |
| arbih_4th_corps | RBiH | **mostar** / mostar_istok_2 | **East Mostar** | Y | high | **Fixed in #180**; WP 4th Corps |
| arbih_5th_corps | RBiH | bihac | Bihać | Y | high | WP 5th Corps |
| vrs_main_staff | RS | han_pijesak | Han Pijesak | Y | high | WP ARS; ICTY Borovčanin annex |
| jna_herzegovina_command | RS | nevesinje | (JNA pre-VRS Hzg grouping; transitional entity) | ~ | low | masters; not a standing VRS corps |
| vrs_1st_krajina | RS | banja_luka | Banja Luka | Y | high | WP 1st Krajina Corps |
| vrs_2nd_krajina | RS | titov_drvar (Drvar) | Drvar | Y | high | WP 2nd Krajina Corps |
| vrs_drina | RS | vlasenica | Vlasenica | Y | high | WP Drina Corps; ICTY |
| vrs_east_bosnian | RS | bijeljina | Bijeljina | Y | high | WP East Bosnian Corps |
| vrs_herzegovina | RS | bileca | **Bileća** | Y | high | WP Herzegovina Corps |
| vrs_sarajevo_romanija | RS | novo_sarajevo | **Lukavica** (in Novo Sarajevo muni; Serb-held SW Sarajevo) | Y | high | WP S-R Corps; ICTY Galić |
| hvo_main_staff | HRHB | mostar | Mostar | Y | high | WP HVO |
| hvo_southeast_herzegovina | HRHB | citluk | SE Herzegovina OZ — commonly **Mostar**; Čitluk plausible early seat | ~ | low | WP HVO (HQ not pinned to town) |
| hvo_central_bosnia | HRHB | vitez | Vitez | Y | high | WP HVO (Corps District Vitez) |
| hvo_northwest_bosnia | HRHB | orasje | **NAMING MISMATCH** — Orašje = **Posavina** OZ, not NW. NW Herzegovina OZ = Tomislavgrad | N (label) | high | WP HVO |
| hvo_tomislavgrad | HRHB | duvno (Tomislavgrad) | **NW Herzegovina** OZ = Tomislavgrad | Y (place) | high | WP HVO |

**Tally:** 14 corps HQs clean/high-confidence agreement. 1 confirmed label mismatch (`hvo_northwest_bosnia` vs Posavina). 4 nuance/low-confidence (general_staff Sarajevo↔Kakanj; jna_herzegovina_command transitional; hvo_southeast_herzegovina Čitluk↔Mostar; hvo_tomislavgrad name vs its sibling). **No #180-class flat-wrong corps HQ city found** — the 4th Corps fix already reads `mostar`.

---

## 2. Flagged Discrepancies (candidate fixes)

### 2A. HVO operational-zone NAMING is internally swapped (corps entity labels)
- **Entities:** `hvo_northwest_bosnia` (HQ Orašje) and `hvo_tomislavgrad` (HQ Tomislavgrad/duvno).
- **OOB values:** `name: "Northwest Bosnia OZ"` is seated at **Orašje**; the OZ actually seated at Orašje is **Bosnian Posavina**. The OZ named/seated at Tomislavgrad is **North-Western Herzegovina**.
- **Historically correct (Wikipedia, Croatian Defence Council):** Four HVO OZs = Corps Districts **Mostar (SE Herzegovina), Tomislavgrad (NW Herzegovina), Vitez (Central Bosnia), Orašje (Bosnian Posavina)**.
- **Source:** WP *Croatian Defence Council* — "four corps-status operational zones… designated as Corps Districts Mostar, Tomislavgrad, Vitez and Orašje."
- **Confidence:** high (naming); the HQ *cities* are individually correct — only the display **names** are off.
- **Recommended action:** Rename the *labels* (no HQ-city/osid change): `hvo_northwest_bosnia` → "Bosnian Posavina OZ" (or "Posavina"), and `hvo_tomislavgrad` → "Northwest Herzegovina OZ". This is a display-string fix, **not** a geographic OSID change, so it carries no calibration risk. NOTE: the `id` strings (`hvo_northwest_bosnia`) are baked into scenarios/tests — changing ids is NOT a 1-field change; recommend changing only the `name` field and leaving ids/osids alone, or flag id-rename as a larger task.

### 2B. VRS 1st Guards Motorized Brigade home_osid = Rogatica
- **Entity:** `rs_1st_guards_motorized` — OOB `home_mun: rogatica`, `home_osid: op:rogatica:stara_gora`, corps `vrs_main_staff` (corps assignment correct).
- **Historically correct:** Brigade HQ was **Han Pijesak** (the VRS Main Staff seat), later relocated to **Kalinovik**. It was a General-Staff-subordinated elite formation, operational from 19 Jan 1993.
- **Source:** WP *1st Guards Brigade (Army of Republika Srpska)* — "headquarters initially located in Han Pijesak and later relocated to Kalinovik."
- **Confidence:** medium-high. Rogatica is in the same general SE-RS zone and the brigade operated there, but the documented seat is Han Pijesak.
- **Recommended action:** Candidate 1-field change `home_osid` → a Han Pijesak OSID (e.g. `op:hanpijesak:han_pijesak_2`, matching the Main Staff / 65th Protection Regiment). Single-field, #180-class. Verify the target OSID exists in the OSID table before applying.

### 2C. HVO 1st Guards Brigade "Ante Bruno Bušić" home_osid = Livno
- **Entity:** `hvo_1st_guard_abb` — OOB `home_mun: livno`, `home_osid: op:livno:misi_2`, corps `hvo_main_staff`.
- **Historically:** Founded **Posuški Gradac (Posušje)** March 1992 (regiment 13 Jun 1992); from early 1993 based at the **Heliodrom near Mostar**; post-Dayton HQ Drvar/Kupres. It was the HVO Main Staff's mobile elite mechanized brigade — Mostar-centric during the war years the sim covers.
- **Source:** HR Wikipedia *1. gardijska brigada HVO "Ante Bruno Bušić"*; web (otpor.media, kamenjar).
- **Confidence:** medium. The brigade was deliberately mobile (Posušje → Mostar Heliodrom → Kupres/Drvar), so no single "home" is unambiguous; **Livno is not supported by any source found** — Posušje (origin) or Mostar (operational base + Main Staff seat) both have direct sourcing, Livno does not.
- **Recommended action:** Reassign `home_osid` toward Mostar (matches its `hvo_main_staff` corps and Heliodrom basing) or Posušje (founding). Flag as **needs-historian** to pick between Mostar vs Posušje rather than auto-applying.

---

## 3. High-Confidence Ready-to-Fix Shortlist (owner sign-off; each ~1-field like #180)

1. **HVO OZ display names (2A).** Change `name` only:
   - `hvo_northwest_bosnia.name`: "Northwest Bosnia OZ" → "Bosnian Posavina OZ"
   - `hvo_tomislavgrad.name`: "Tomislavgrad OZ" → "Northwest Herzegovina OZ"
   - Zero geographic/OSID change; zero calibration risk. (Do NOT touch the `id` fields — those are referenced elsewhere.)
2. **VRS 1st Guards Motorized home_osid (2B).** `op:rogatica:stara_gora` → `op:hanpijesak:han_pijesak_2` (Main-Staff seat; brigade documented HQ). One field. Verify OSID exists first.

## 4. Needs-Historian Shortlist (do NOT auto-apply)

1. **ARBiH General Staff hq_mun = kakanj.** Primary GS seat was the **Sarajevo Presidency**; the bulk relocated to **KM Kakanj in early 1994**. With `available_from: 24` (~Oct 1992) the unit appears before the Kakanj move. Decide whether to model GS at Sarajevo (early) or Kakanj (1994+). Not flat-wrong, but Wikipedia favors Sarajevo for the early/mid war.
2. **HVO SE Herzegovina OZ hq = citluk.** Wikipedia pins the OZ to Mostar (Corps District Mostar) but does not explicitly exclude an early Čitluk seat; HVO Main Staff is already at Mostar in the OOB, so distinguishing the OZ as Čitluk is defensible. Historian to confirm whether SE-Hzg OZ HQ should be Mostar or Čitluk.
3. **HVO 1st Guards ABB home (2C).** Mostar vs Posušje — historian to choose; Livno is unsupported.
4. **jna_herzegovina_command (Nevesinje).** Transitional JNA-era entity, not a standing VRS field corps; verify it should carry a fixed HQ town at all vs being a temporary command grouping.

## 5. Spot-Checks That PASSED (no change)

- ARBiH 1st/2nd/3rd/4th/5th Corps HQ cities — all correct; 4th confirmed reads `mostar` (#180 holds).
- VRS Main Staff (Han Pijesak), 1st Krajina (Banja Luka), 2nd Krajina (Drvar), Drina (Vlasenica), East Bosnian (Bijeljina), Herzegovina (**Bileća — Wikipedia confirms, not Trebinje**), Sarajevo-Romanija (Lukavica/Novo Sarajevo) — all correct.
- **712th Mountain Brigade** — `home_mun: travnik, home_osid: op:travnik:turbe_2` correct (formed from Travnik/Turbe detachments; the earlier Turbe fix holds). It later became a **7th Corps** unit, but since the OOB models the April-1992 start before the 7th Corps split, its `arbih_3rd_corps` assignment is a defensible design choice, not an error.
- **65th Protection Motorized Regiment** — Han Pijesak ✓ (Main-Staff protection unit, correctly seated).
- **1st Bijeljina "Panthers"** — Bijeljina ✓ (Mauzer's unit; East Bosnian Corps ✓).
- **HVO 2nd Guards Mechanized** — Mostar ✓.
- HVO 3rd Guards "Jastrebovi" (Čapljina), 4th Guards "Sinovi Posavine" (Orašje) — consistent with Posavina/SE-Hzg geography; no contradiction found.
- HVO-named units tagged faction RBiH (107th "Gradačac", 108th "Brčko", 115th "Zrinski", "Kralj Tvrtko") — these were Croat units that fought **alongside ARBiH** in 2nd-Corps/Sarajevo zones; the cross-faction tagging is a known design decision, not a geographic error, and is out of scope for a HQ-fidelity audit.

## 6. Methodology + Honesty Caveat

- **Wikipedia-first applied throughout.** Where Wikipedia/web and BB could diverge I trusted Wikipedia (per directive). The Herzegovina Corps HQ (**Bileća**, not Trebinje) and the HVO OZ naming were both resolved on Wikipedia authority.
- **What Wikipedia caught that BB-era data muddled:** the **HVO OZ label swap** (2A) — Orašje is the *Posavina* OZ and Tomislavgrad is the *NW Herzegovina* OZ, but the OOB labels Orašje "Northwest Bosnia". This is the closest analog to the #180 class found in this pass, though it is a **naming** error rather than a wrong city.
- **No fabricated corrections.** Where I could not source a clean answer (ABB home, GS Sarajevo-vs-Kakanj timing, SE-Hzg Čitluk-vs-Mostar, JNA Hzg command), I routed to "needs-historian" rather than inventing a value.
- **Coverage honesty:** All 19 corps/staff HQs checked. Brigades were SPOT-checked (guards/elite/named ≈ 13 elite + ~90 named reviewed by eye for geographic plausibility); the ~249-brigade set was **not** exhaustively audited. The faction-tag question (HVO units under ARBiH corps) was noted but treated as a design decision, not a fidelity defect.
- **No data file edited.** This is the single deliverable packet.

### Sources
- https://en.wikipedia.org/wiki/Herzegovina_Corps
- https://en.wikipedia.org/wiki/2nd_Krajina_Corps
- https://en.wikipedia.org/wiki/Sarajevo-Romanija_Corps
- https://en.wikipedia.org/wiki/Croatian_Defence_Council
- https://en.wikipedia.org/wiki/Supreme_Command_of_the_Army_of_the_Republic_of_Bosnia_and_Herzegovina
- https://en.wikipedia.org/wiki/1st_Guards_Brigade_(Army_of_Republika_Srpska)
- https://hr.wikipedia.org/wiki/1._gardijska_brigada_HVO_%22Ante_Bruno_Bu%C5%A1i%C4%87%22
- ICTY Borovčanin annex (Military Structure of the VRS); ICTY Galić indictment (Sarajevo-Romanija Corps / Lukavica)
- BB Vol. I Appendices G & H (per oob_corps.json awwv_meta source)
