# Research: HVO + HV Order of Battle for Mistral 2, Summer '95, and Storm Spillover

**Date:** 2026-05-23
**Author:** Research dispatch (historian-style synthesis)
**Scope:** OOB-and-axis mapping for an HVO operation opportunity catalog parallel to `operation_opportunity_catalog_5th_corps.ts`. Covers Summer '95 (Ljeto '95), Storm (Oluja) BiH spillover, and Mistral 2 (Maestral).
**Companion:** This memo is the OOB-engineering counterpart to `docs/40_reports/proposals/20260523_RESEARCH_HVO_HV_FALL_1995.md` (strategic narrative). Where the companion explains *why*, this memo answers *which engine corps + which engine brigade + which target OSIDs*.
**Source hierarchy applied:** ICTY *Gotovina et al.* (IT-06-90) trial chamber findings > ICTY *Prlić et al.* (IT-04-74) > Balkan Battlegrounds Vol. II ch. 12-13 (CIA, 2002) > Tanner, *Croatia: A Nation Forged in War* ch. 13 > Wikipedia operation pages > regional press.

> **Engine scope note.** This memo is research only — it does not propose engine code. It does identify the engine identifiers (`FormationId`, `OSID`) that a future catalog file would consume. Where a historical unit exists outside the engine's current OOB (HV regulars), the relevant phantom IDs from `HV_PHANTOM_DEFS_1995` in `src/sim/combat/jna_phantom_brigades.ts` (lines 348-448) are referenced verbatim.

---

## 1. Engine grounding — what the catalog will be consuming

### 1.1 HVO formation skeleton (5 corps)

The engine carries five HVO corps formations, plus a notional `hvo_main_staff` shell that owns the three HVO Guards Brigades (a deliberate post-1994 Federation construct — the Guards Brigades were never an operational-zone asset, they were a Mostar-headquarters strategic reserve):

| FormationId | Real-world referent | Home zone |
|---|---|---|
| `hvo_southeast_herzegovina` | SE Herzegovina OZ (Mostar HQ) | Mostar, Široki Brijeg, Ljubuški, Grude, Čitluk, Čapljina, Stolac, Posušje |
| `hvo_central_bosnia` | Central Bosnia OZ (Vitez/Busovača HQ) | Vitez, Busovača, Novi Travnik, Kiseljak, Kreševo, Žepče enclaves |
| `hvo_tomislavgrad` | Tomislavgrad OZ | Tomislavgrad/Duvno, Livno, Posušje, Rama/Prozor |
| `hvo_northwest_bosnia` | Posavina OZ (Northwest Bosnia) — *not* `hvo_north_bosnia` (no such engine ID) | Orašje, Odžak, Bos. Brod |
| `hvo_southwest_herzegovina` | SW Herzegovina OZ (sub-zone of SEH; engine carries it separately) | Western Mostar approaches |
| `hvo_main_staff` | Glavni stožer HVO (Mostar) | Owner of the three HVO Guards Brigades; **no front sectors** |

> **Wave 19A / 28 lesson (already burned into the catalog).** `hvo_main_staff` has zero front sectors at the time Mistral 2 fires. Operations whose roster claims sector assignments under that corps get drained by `reconcileOperationRoster`. Mistral 1 was re-hosted on `hvo_tomislavgrad` (Wave 19A); Mistral 2 was re-hosted the same way (Wave 28). **The catalog launcher for any Sept-Oct 1995 western-Bosnia op should be `hvo_tomislavgrad`, not `hvo_main_staff`** — even though, historically, the HVO Guards Brigades were owned by the Mostar main staff. The engine treats Tomislavgrad as the sector-bearing corps that legitimately reaches into Livno / Kupres / Glamoč / Bosansko Grahovo.

### 1.2 HVO brigade roster (relevant subset)

The brigades that matter for fall 1995 western-Bosnia ops:

| Engine ID | Engine name | Corps owner | Home OSID | Notes |
|---|---|---|---|---|
| `hvo_1st_guard_abb` | 1st Guards Brigade 'Ante Bruno Bušić' | `hvo_main_staff` | `op:livno:misi_2` | Elite; mechanized. Available turn 80. Glasnović. |
| `hvo_2nd_guard_mechanized` | 2nd Guards Mechanized Brigade | `hvo_main_staff` | `op:mostar:mostar_zapad_2` | Elite; mechanized. Available turn 84. Sopta. |
| `hvo_3rd_guard_jastrebovi` | 3rd Guards Brigade 'Jastrebovi' | `hvo_main_staff` | `op:capljina:capljina_2` | Elite; mechanized. Available turn 84. Nakić. |
| `hrhb_kralj_petar_kreimir_iv_brigade` | Kralj Petar Krešimir IV Brigade | `hvo_tomislavgrad` | `op:livno:livno_2` | Mountain. Available turn 0. |
| `hrhb_kralj_tomislav_brigade` | Kralj Tomislav Brigade | `hvo_tomislavgrad` | `op:duvno:dobrici` | Mountain. Available turn 8 (Tomislavgrad/Posušje/Kupres battalions). |
| `hvo_rama_brigade` | Rama Brigade | `hvo_tomislavgrad` | `op:prozor:ustirama_3` | Light. Available turn 0. |
| `hrhb_mario_hrka_ikota_brigade` | Mario Hrkač Čikota Brigade | `hvo_southeast_herzegovina` | `op:listica:lise` | Mountain. (Široki Brijeg side.) |
| `hrhb_6th_brigade_ranko_boban` | 6th Brigade "Ranko Boban" | `hvo_southeast_herzegovina` | `op:grude:sovici_3` | Mountain. |
| `hvo_posusje_brigade` | Posušje Brigade | `hvo_southeast_herzegovina` | `op:posusje:posusje_2` | Light. |
| `hrhb_111th_brigade` | 111th Brigade | `hvo_central_bosnia` | `op:zepce:ozimica_2` | Žepče enclave — tagged `enclave`, irrelevant to western push. |

> **Wave 28 brigade-status caution.** At n1987 the `hrhb_kralj_petar_kreimir_iv_brigade` and `hrhb_kralj_tomislav_brigade` were `status='inactive'` by t175 — spent in Cincar (t132–141) and never recovered. The Wave 28 fix substituted `hvo_3rd_guard_jastrebovi` + `hvo_rama_brigade` into the Mistral 2 Šipovo axis. For the Mistral 2 catalog entry the Šipovo/Mrkonjić chain should be carried by the Guards Brigades (still `active`), with the Tomislavgrad named brigades reserved for the Grahovo / Glamoč shoulder.

### 1.3 HV phantom skeleton (8 brigades in `HV_PHANTOM_DEFS_1995`)

The Croatian Army regulars that crossed openly into BiH under the Split Agreement (22 July 1995) are modelled as phantom formations in `src/sim/combat/jna_phantom_brigades.ts` lines 348-448. Spawn turn **150** (≈ Split Agreement window). Withdrawal turn **188** (Dayton ceasefire) — or earlier if `holbrooke_us_belgrade_channel_1995` fires.

| Phantom FormationId | Engine name | Corps host | Spawn OSID | OG assignment |
|---|---|---|---|---|
| `hv_4th_guards_brigade_1995` | HV 4th Guards Brigade (Split) | `hvo_southeast_herzegovina` | `op:livno:livno_2` | **OG North main effort** |
| `hv_7th_guards_brigade_1995` | HV 7th Guards Brigade (Varaždin) | `hvo_central_bosnia` | `op:tomislavgrad:tomislavgrad_2` | **OG North** |
| `hv_1st_guards_brigade_1995` | HV 1st Croatian Guards Brigade Tigrovi (Zagreb / 1st HGZ) | `hvo_central_bosnia` | `op:livno:livno_2` | **OG North** |
| `hv_126th_hgr_1995` | HV 126th Home Guard Regiment (Sinj) | `hvo_southeast_herzegovina` | `op:livno:livno_2` | **OG South** |
| `hv_141st_reserve_brigade_1995` | HV 141st Reserve Infantry Brigade | `hvo_southeast_herzegovina` | `op:tomislavgrad:tomislavgrad_2` | **OG South** |
| `hv_7th_hgr_1995` | HV 7th Home Guard Regiment | `hvo_tomislavgrad` | `op:livno:livno_2` | **OG West** |
| `hv_112th_infantry_1995` | HV 112th Infantry Brigade | `hvo_tomislavgrad` | `op:livno:livno_2` | **OG West** |
| `hv_134th_hgr_1995` | HV 134th Home Guard Regiment | `hvo_tomislavgrad` | `op:livno:livno_2` | **OG West** |

> **Mistral 1 / Wave-11 catalog already references some of these.** `mistral_1_95` in `operation_opportunity_catalog_federation_western_bosnia.ts` uses `hv_4th_guards_split` (the older 1992-era ID from `HV_PHANTOM_DEFS`, lines 273-318). The 1995-spawn IDs above are the historically correct binding for September 1995. A catalog change to consume the `_1995` IDs is a clean substitution.

### 1.4 Target-OSID inventory (verified against `data/derived/operational/canonical_to_operational_map.json`)

OSIDs the engine actually has for the western-Bosnia objective set. These have been verified by grep against the canonical-to-operational map.

**Bosansko Grahovo (5 settlements):** `op:bosansko_grahovo:bosansko_grahovo_2` (town), `op:bosansko_grahovo:crni_lug`, `op:bosansko_grahovo:malesevci`, `op:bosansko_grahovo:ugarci`. *(4 distinct OSIDs in canonical map; this is the full settlement inventory for the municipality.)*

**Glamoč (6 settlements):** `op:glamoc:glamoc_2` (town), `op:glamoc:halapic`, `op:glamoc:stekerovci_2`, `op:glamoc:vidimlije_2`, `op:glamoc:kovacevci_2`, `op:glamoc:pribelja`.

**Drvar / Titov Drvar (3 settlements):** `op:titov_drvar:drvar_2` (town), `op:titov_drvar:prekaja_2`, `op:titov_drvar:sipovljani_2`.

**Šipovo (5 settlements):** `op:sipovo:sipovo_2` (town), `op:sipovo:brdjani`, `op:sipovo:gornji_mujdzici_2`, `op:sipovo:pribeljci_2`, `op:sipovo:volari_2`.

**Jajce (8 settlements):** `op:jajce:jajce_3` (town centre proper; note the `_3` suffix used in the canonical map, not `jajce_2`), `op:jajce:barevo_2`, `op:jajce:bravnice`, `op:jajce:divicani_2`, `op:jajce:grdovo`, `op:jajce:jezero_2`, `op:jajce:kruscica`, `op:jajce:lupnica`, `op:jajce:prisoje`, `op:jajce:vinac_2`. *(Note: the original prompt requested `op:jajce:jajce_2`. The canonical map uses `op:jajce:jajce_3` for the town. Any catalog entry must use `jajce_3`.)*

**Mrkonjić Grad (5 settlements):** `op:mrkonjic_grad:mrkonjic_grad_2` (town), `op:mrkonjic_grad:bjelajce_2`, `op:mrkonjic_grad:baljvine_2`, `op:mrkonjic_grad:gerzovo_2`, `op:mrkonjic_grad:majdan_2`, `op:mrkonjic_grad:podrasnica_2`.

**Donji Vakuf (10 settlements — relevant as Jajce-axis approach corridor):** `op:donji_vakuf:donji_vakuf_2` (town), `op:donji_vakuf:babin_potok_2`, `op:donji_vakuf:komar_2`, `op:donji_vakuf:korenici`, `op:donji_vakuf:kutanja`, `op:donji_vakuf:jemanlici`, `op:donji_vakuf:oborci_2`, `op:donji_vakuf:pribraca_2`, `op:donji_vakuf:prusac_2`, `op:donji_vakuf:torlakovac_2`.

**Kupres staging anchors (already locked in by the Cincar / Mistral 1 family):** `op:kupres:kupres_2`, `op:kupres:bucovaca`, `op:kupres:goravci`, `op:kupres:novo_selo_2`, `op:kupres:donji_malovan`.

**Livno / Tomislavgrad / Duvno staging anchors:** `op:livno:livno_2`, `op:livno:misi_2`, `op:duvno:tomislavgrad_2`, `op:duvno:dobrici`, `op:prozor:ustirama_3`.

---

## 2. Operation Summer '95 (Ljeto '95) — 25-29 July 1995, turn ≈ 152

### 2.1 Historical OOB

- **Commander:** Lt Gen Ante Gotovina (HV Split Military District). At this date, **Gotovina is HV, not HVO** — there is no HVO commander above the brigade level for this op.
- **Total force:** ~25,000 HV + HVO combined; ~8,500 in the main assault echelon.
- **Main effort:** HV 4th Guards Brigade (Split) and HV 7th Guards Brigade (Varaždin), with the HVO 1st Guards Brigade 'Ante Bruno Bušić' attached.
- **Supporting forces:** HV 6th Home Guard Regiment, HV 126th Home Guard Regiment (Sinj), HV 141st Reserve Infantry Brigade, plus HVO Tomislavgrad OZ brigades providing flank security on the Livanjsko polje north shoulder.
- **VRS opposing:** VRS 2nd Krajina Corps (Maj Gen Radivoje Tomanić), ~5,500.
- **Result:** ~1,600 km² captured, Knin-Drvar lateral road cut, RSK strategic reserves drawn away from Bihać.

### 2.2 Axis decomposition (proposed engine binding)

Two distinct axes — both historically launched from the Livanjsko polje (Livno field) and pivoting on Bosansko Grahovo to the north and Glamoč to the east. This is **structurally the same as Mistral 1** (the engine already has `mistral_1_95` for this geography, see `operation_opportunity_catalog_federation_western_bosnia.ts` L317-538) — but Mistral 1 represents the *June 1995* dress rehearsal (Skok-1) that captured Kupres-Cincar, and Summer '95 represents the *July 1995* execution that took Grahovo + Glamoč proper.

| Axis | Launcher (engine corps) | HVO brigades | HV phantom brigades | Staging OSID | Objective OSIDs (ordered) |
|---|---|---|---|---|---|
| **Summer '95 → Bosansko Grahovo Axis** | `hvo_tomislavgrad` | `hvo_1st_guard_abb`, `hrhb_kralj_petar_kreimir_iv_brigade` | `hv_4th_guards_brigade_1995`, `hv_141st_reserve_brigade_1995`, `hv_126th_hgr_1995` | `op:livno:misi_2` | `op:bosansko_grahovo:crni_lug` → `op:bosansko_grahovo:malesevci` → `op:bosansko_grahovo:bosansko_grahovo_2` → `op:bosansko_grahovo:ugarci` |
| **Summer '95 → Glamoč Axis** | `hvo_tomislavgrad` | `hrhb_kralj_tomislav_brigade`, `hvo_rama_brigade` | `hv_7th_guards_brigade_1995` | `op:duvno:tomislavgrad_2` | `op:glamoc:halapic` → `op:glamoc:stekerovci_2` → `op:glamoc:kovacevci_2` → `op:glamoc:vidimlije_2` → `op:glamoc:glamoc_2` → `op:glamoc:pribelja` |

### 2.3 Sequence

- **25 July (turn 152, day 1):** Main attack from Livanjsko polje north. HV 4th Guards Brigade as armoured spearhead.
- **26 July (day 2):** Bosansko Grahovo carrier settlements (Crni Lug, Maleševci) overrun.
- **27 July (day 3):** Glamoč shoulder advances; Halapić, Stekerovci fall.
- **28 July (day 4):** Bosansko Grahovo town centre (`op:bosansko_grahovo:bosansko_grahovo_2`) captured.
- **29 July (day 5):** Glamoč town centre (`op:glamoc:glamoc_2`) captured. Operation closes.

### 2.4 Engine-catalog distinction from Mistral 1

| | `mistral_1_95` (in catalog) | `summer_95` (proposed) |
|---|---|---|
| Historical date | Skok-1, 4-11 June 1995 | Ljeto '95, 25-29 July 1995 |
| Turn window | t∈[160, 170] | t∈[170, 180] *(or distinct overlap)* |
| Alliance context | `isPreStormWesternTheater` (Storm has NOT fired) | `isPreStormWesternTheater` (Storm still NOT fired — Storm is 4-7 Aug) |
| Objectives | Same Grahovo + Glamoč geography | Same Grahovo + Glamoč geography |
| Source of HV brigades | Old `HV_PHANTOM_DEFS` (1992-era, `hv_4th_guards_split`) | New `HV_PHANTOM_DEFS_1995` (`hv_4th_guards_brigade_1995`) |

**Recommendation:** Treat `mistral_1_95` and a hypothetical `summer_95` entry as **a single composite opportunity** rather than two separate catalog entries. The geography is identical, the chains overlap, and the historical Mistral 1 / Summer '95 were a planned two-pulse offensive (Skok-1 in June seized the Cincar shoulder; Summer '95 in July finished the job by taking the towns). Splitting them into two catalog entries risks the engine launching one and then never launching the second because all objectives are already friendly-controlled. The cleaner engineering choice is: extend `mistral_1_95`'s date window from [160,170] to [160,180] and let it cover both pulses with a single dependency chain.

---

## 3. Storm (Oluja) BiH spillover — 4-7 August 1995, turn ≈ 154

### 3.1 What the HVO actually did

This is a deliberately narrow finding. **The HVO did not launch any independent BiH-side offensive during Storm.** Storm itself was an HV operation against the RSK (Republika Srpska Krajina), executed entirely on Croatian territory. The "BiH spillover" referred to in the user's prompt is the consequence package documented in the companion memo §3 — specifically:

1. **Bihać siege lifted by ARBiH 5th Corps** (a Bosniak operation, not HVO).
2. **VRS 2nd Krajina Corps neutralised** by a single VRS counter-attack 11-12 August that was repulsed by HV battalions drawn from 4th and 7th Guards Brigades + 6th and 126th Home Guard Regiments — **all HV, no HVO**.
3. **VRS strategic-reserve absence** — Pale chose not to commit.
4. **Refugee column** (8 August Bosanski Petrovac strike) — civilian, not HVO offensive.

In short: in the 4-7 August window, **no HVO formation launched a new offensive in BiH**. The HVO Guards Brigades were already deployed forward on the Livanjsko polje, holding the Grahovo / Glamoč gains from Summer '95; they did not advance further during Storm itself. They were re-mobilised five weeks later for Mistral 2 (8 September).

### 3.2 Engine implication

**No `storm_bih_spillover` opportunity entry is warranted on the HVO side.** The engine's existing `Operation Storm theater` rupture flag (`isWesternTheaterRuptured`) already captures the strategic consequence — VRS 2nd Krajina Corps degradation, Krajina road cut, RSK reserve unavailable — and that flag is then consumed by `mistral_2_95.alliance_context` as a precondition.

What an HVO catalog *should* model in the 4-7 August window is **a defensive holding posture**: the Livno-Tomislavgrad axis brigades stay put, do not stage to other ops, and provide flank security against any VRS 2nd Krajina counter-attack. A separate engineering note (out of scope for this memo) could surface this as a "do not divert HVO forward brigades during Storm window" constraint on staging-access predicates.

### 3.3 The 11-12 August counter-attack (VRS attack, HV defense)

For completeness: when VRS 2nd Krajina Corps launched its only meaningful counter-attack on the night of 11/12 August, it broke through HV 141st Reserve Infantry Brigade and reached the outskirts of Bosansko Grahovo before being repulsed by:

- one battalion of HV 4th Guards Brigade,
- one battalion of HV 7th Guards Brigade,
- HV 6th Home Guard Regiment,
- HV 126th Home Guard Regiment.

This is an HV defensive engagement on already-captured BiH territory. **HVO units did not participate** in this defensive action (which is itself a notable historical fact — by 12 August the HVO Guards Brigades had already pulled back to refit for Mistral 2 staging).

For engine-catalog purposes: this event is best surfaced as a *VRS-initiated* event on the RS side, not as an HVO opportunity. It belongs in a VRS catalog (analogous to "vrs_2nd_krajina_summer_counter_offensive").

---

## 4. Operation Mistral 2 / Maestral — 8-15 September 1995, turn ≈ 175

### 4.1 Operational structure

Three Operational Groups under HV Maj Gen Ante Gotovina (overall command):

| OG | Commander | Approx. strength | Mission | Outcome |
|---|---|---|---|---|
| **OG North** | Gotovina (direct) | ~11,000 | Capture Šipovo + Jajce | Šipovo 15 Sep, Jajce 13 Sep — success |
| **OG South** | Brig Ante Kotromanović | ~5,000 | Pin VRS at Mrkonjić Grad shoulder; flank security | Held the line; Mrkonjić Grad eventually fell in Southern Move 8-11 Oct |
| **OG West** | Brig Mladen Fuzul | ~5,000 | Capture Drvar | Drvar 15 Sep — success |

**Key structural fact (per ICTY Prlić et al.):** the three HVO Guards Brigades (1st 'Ante Bruno Bušić', 2nd Mechanized, 3rd 'Jastrebovi') are operationally subordinate to OG North under an HV major general's direct command. There is **no parallel HVO main staff axis**. The HVO contribution is plugged into HV command at the brigade level.

### 4.2 OG North — Jajce and Šipovo axes

| Axis | Launcher (engine corps) | HVO brigades | HV phantom brigades | Staging OSID | Objective OSIDs (ordered) |
|---|---|---|---|---|---|
| **OG North → Jajce Axis** | `hvo_tomislavgrad` | `hvo_1st_guard_abb`, `hvo_2nd_guard_mechanized` | `hv_4th_guards_brigade_1995`, `hv_1st_guards_brigade_1995` | `op:livno:misi_2` | `op:jajce:vinac_2` → `op:jajce:bravnice` → `op:jajce:prisoje` → `op:jajce:divicani_2` → `op:jajce:kruscica` → `op:jajce:jajce_3` (town) → `op:jajce:grdovo` → `op:jajce:lupnica` → `op:jajce:barevo_2` → `op:jajce:jezero_2` |
| **OG North → Šipovo Axis** | `hvo_tomislavgrad` | `hvo_3rd_guard_jastrebovi`, `hvo_rama_brigade` | `hv_7th_guards_brigade_1995` | `op:livno:livno_2` | `op:sipovo:brdjani` → `op:sipovo:gornji_mujdzici_2` → `op:sipovo:sipovo_2` (town) → `op:sipovo:volari_2` → `op:sipovo:pribeljci_2` |

> **Adjacency caveat (Wave 24A precedent).** Catalog adjacency-sweeps have already established that approach-OSID ordering matters for the Šipovo chain. The order shown follows the Wave 24A precedent in `operation_opportunity_catalog_federation_western_bosnia.ts` L70-82 (sub-sequence reordered for OSID-adjacency reachability). Any new catalog entry should mirror this ordering.

> **Jajce approach via Donji Vakuf.** Historically the OG North advance on Jajce came from the south (Kupres direction) along the road Kupres → Šipovo → Jajce. The Donji Vakuf approach (from the east, ARBiH 7th Corps direction) is a *separate* axis — Donji Vakuf was captured by ARBiH 7th Corps in September 1995 as part of the Operation Sana east-flank push. **Do not assign Donji Vakuf OSIDs to the HVO/HV Jajce axis.** Those objectives belong to an ARBiH 7th Corps catalog entry.

### 4.3 OG South — Mrkonjić Grad pin / Šuica flank

OG South under Brig Ante Kotromanović was a *flank-fixing* operation, not a deep-penetration axis. Historically it pinned VRS forces in the Šuica / Mrkonjić Grad direction so that OG North could focus on Jajce and Šipovo. Mrkonjić Grad itself **did not fall during Mistral 2** — it was captured in Southern Move (8-11 October) by HV 4th Guards Brigade after a sequential re-tasking.

| Axis | Launcher (engine corps) | HVO brigades | HV phantom brigades | Staging OSID | Objective OSIDs (ordered) |
|---|---|---|---|---|---|
| **OG South → Mrkonjić Pin Axis** | `hvo_southeast_herzegovina` | `hrhb_mario_hrka_ikota_brigade`, `hrhb_6th_brigade_ranko_boban` | `hv_126th_hgr_1995`, `hv_141st_reserve_brigade_1995` | `op:livno:livno_2` | `op:mrkonjic_grad:gerzovo_2` → `op:mrkonjic_grad:majdan_2` → `op:mrkonjic_grad:podrasnica_2` *(pinning shoulder — no town capture in this op)* |

> The Mrkonjić town centre (`op:mrkonjic_grad:mrkonjic_grad_2`) plus baljvine/bjelajce belong to a **separate** Southern Move catalog entry, not Mistral 2. Splitting these reflects the historical sequence and prevents the engine from pre-firing Mrkonjić captures during the Mistral 2 window.

### 4.4 OG West — Drvar Axis

| Axis | Launcher (engine corps) | HVO brigades | HV phantom brigades | Staging OSID | Objective OSIDs (ordered) |
|---|---|---|---|---|---|
| **OG West → Drvar Axis** | `hvo_tomislavgrad` | *(none — HVO main effort was on OG North; OG West was HV-only)* | `hv_7th_hgr_1995`, `hv_112th_infantry_1995`, `hv_134th_hgr_1995` | `op:livno:misi_2` | `op:titov_drvar:prekaja_2` → `op:titov_drvar:sipovljani_2` → `op:titov_drvar:drvar_2` (town) |

> **Historical note.** OG West was the only fall-1995 axis that was effectively **HV-pure** — three Home Guard Regiments and two Infantry Brigades, no HVO brigades attached. The engine catalog should reflect this: the `brigades` array contains only `hv_phantom` IDs, not HVO IDs. This matters for force-quality predicates because HV Home Guard Regiments (`hv_*_hgr_1995`) are lower-quality formations than HV Guards Brigades — the catalog's `force_quality` predicate should be calibrated accordingly.

### 4.5 Predicate-gate set (proposed, mirroring `mistral_2_95`)

The full 10-gate Mistral 2 predicate set already exists in `operation_opportunity_catalog_federation_western_bosnia.ts` L167-276. For a new `mistral_2_95_full_oob` opportunity (or for the refinement of the existing `mistral_2_95`):

| Gate | Required/Optional | Predicate semantics |
|---|---|---|
| `date_window` | Required | `t ∈ [175, 190]` (Sept-mid-Oct 1995) |
| `political_authorization` | Required | Washington signed AND `war_alliance_rbih_hrhb ≥ 0.50` |
| `corps_readiness` | Required | `hvo_tomislavgrad` AND `hvo_southeast_herzegovina` present AND `operation_readiness ≥ 0.36` |
| `logistics` | Optional | `getFactionLiveSupplyPressure(state, 'HRHB') < 90` |
| `staging_access` | Required | Livno-Misi + Livno + Tomislavgrad all HRHB AND Kupres-Cincar anchors HRHB AND Grahovo + Glamoč anchors HRHB *(adds the Summer '95 dependency)* |
| `weather_season` | Optional | `t ≤ 187` (late autumn weather constraint) |
| `commander_confidence` | Optional | `commander_state` present on both primary + secondary corps |
| `enemy_weakness` | Required | ≥1 objective RS-held AND `evaluateDefenderTrajectoryWeakness(vrs_2nd_krajina, floor=0.20)` green |
| `alliance_context` | Required | `isWesternTheaterRuptured(state)` (Storm has fired) |
| `force_quality` | Optional | `axis_coordination ≥ 0.35` |

### 4.6 Sequence

- **8 Sept (turn 175, day 1):** Main attack launched. OG North breaches VRS defences north of Glamoč.
- **10 Sept (day 3):** Šipovo carrier settlements (Brdjani, Gornji Mujdžići) overrun.
- **11 Sept (day 4):** OG West captures Drvar approach (Prekaja, Šipovljani).
- **12 Sept (day 5):** Second-stage offensive begins. OG North turns east toward Jajce.
- **13 Sept (day 6):** **Jajce falls.** Symbolic capture — medieval Bosnian royal capital.
- **15 Sept (day 8):** **Šipovo town and Drvar town fall.** Operation closes.

### 4.7 Casualties + territory

- HV/HVO: 74 KIA, 226 WIA total across all three OGs.
- VRS: "likely far greater" (no precise tribunal figure; BB estimates substantial including loss of corps-level coherence).
- ~2,500 km² captured, up to 30 km penetration.
- VRS 2nd Krajina Corps no longer functioned as a coherent corps after 15 September.

### 4.8 ARBiH coordination

Mistral 2 was **synchronised with ARBiH Operation Sana** (13 Sept - 12 Oct). The two offensives linked at **Oštrelj Pass** between Bosanski Petrovac (ARBiH 5th Corps) and Drvar (HV OG West). For engine purposes this is captured by both opportunities reading the same `isWesternTheaterRuptured` flag and both checking each other's staging anchors do not collide.

---

## 5. Brigade-allocation summary (engine-ready)

The following table consolidates which engine brigades the catalog should expect to be available + assigned for each axis. Rows are axes; columns are brigade-pool sources.

| Axis | HVO Guards (main_staff pool) | HVO Tomislavgrad pool | HVO SE Herzegovina pool | HV phantom pool (1995) |
|---|---|---|---|---|
| Summer '95 → Grahovo | `hvo_1st_guard_abb` | `hrhb_kralj_petar_kreimir_iv_brigade` | — | `hv_4th_guards_brigade_1995`, `hv_141st_reserve_brigade_1995`, `hv_126th_hgr_1995` |
| Summer '95 → Glamoč | — | `hrhb_kralj_tomislav_brigade`, `hvo_rama_brigade` | — | `hv_7th_guards_brigade_1995` |
| Mistral 2 OG North → Jajce | `hvo_1st_guard_abb`, `hvo_2nd_guard_mechanized` | — | — | `hv_4th_guards_brigade_1995`, `hv_1st_guards_brigade_1995` |
| Mistral 2 OG North → Šipovo | `hvo_3rd_guard_jastrebovi` | `hvo_rama_brigade` | — | `hv_7th_guards_brigade_1995` |
| Mistral 2 OG South → Mrkonjić pin | — | — | `hrhb_mario_hrka_ikota_brigade`, `hrhb_6th_brigade_ranko_boban` | `hv_126th_hgr_1995`, `hv_141st_reserve_brigade_1995` |
| Mistral 2 OG West → Drvar | — | — | — | `hv_7th_hgr_1995`, `hv_112th_infantry_1995`, `hv_134th_hgr_1995` |

**Brigade-load warnings:**

1. **`hvo_1st_guard_abb` is double-booked** between Summer '95 → Grahovo (t152-157) and Mistral 2 → Jajce (t175-183). This is historically correct — the brigade fought both. But the engine's `reconcileOperationRoster` must allow re-assignment after the Summer '95 op completes / expires.

2. **`hv_4th_guards_brigade_1995` is triple-booked** across Summer '95, Mistral 2 Jajce, and (historically) Southern Move. Same reconciliation requirement.

3. **`hv_141st_reserve_brigade_1995`** historically broke during the 11-12 August VRS counter-attack and was rebuilt in time for Mistral 2 OG South. The engine has no current representation of this damage-and-rebuild cycle; the catalog should not depend on the brigade being at full strength for Mistral 2.

4. **`hvo_2nd_guard_mechanized` is held in reserve** at Mostar (`op:mostar:mostar_zapad_2`) at the start of Mistral 2 and only deploys forward on day 4-5 of the operation. Catalog can model this either as a planning-duration delay or as a `min_optional_axes` permissive — the cleaner approach is the latter (Jajce axis can fire without 2nd Guards committed on day 1).

5. **`hrhb_kralj_petar_kreimir_iv_brigade` + `hrhb_kralj_tomislav_brigade` exhaustion risk.** Per the n1987 forensics, these two are `status='inactive'` by t175 in the current calibration baseline. Catalog must either (a) not require them for Mistral 2 (use Guards Brigades instead, as Wave 28 already does) or (b) gate them on the upstream `corps_operation_readiness` predicate so an exhausted brigade does not block the op.

---

## 6. Citation registry (for catalog `citations:` field)

The catalog `citations` array should reference:

- `docs/40_reports/proposals/20260523_RESEARCH_HVO_HV_FALL_1995.md` — strategic narrative + ICTY findings.
- `docs/40_reports/proposals/20260523_RESEARCH_HVO_MISTRAL_2_OOB.md` — this memo (OOB + axis tables).
- `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md` — HVO operational-zone structure.
- `src/sim/combat/jna_phantom_brigades.ts` L348-448 — HV expeditionary phantom roster.
- ICTY *Gotovina et al.* IT-06-90, Trial Chamber Judgment 15 April 2011 vol. 1 §44-58, §1900-2000 — Mistral 2 / Southern Move OOB findings.
- ICTY *Prlić et al.* IT-04-74, Trial Chamber III Judgment 29 May 2013 — Croatian "overall control" over HVO finding.
- Balkan Battlegrounds Vol. II ch. 12-13 (CIA, 2002) — operational structure and casualty figures.
- Tanner, *Croatia: A Nation Forged in War* (Yale UP, 1997) ch. 13 — Tuđman strategic context.
- Wikipedia, *Operation Mistral 2*, *Operation Summer '95*, *Operation Storm* (last accessed via companion memo).

---

## 7. Open questions for the catalog implementer

1. **Mistral 1 + Summer '95 — one catalog entry or two?** The companion memo §1.4 strongly suggests merging both into a single extended-window `mistral_1_95` entry. The historical record supports either decomposition; the engineering question is whether `reconcileOperationRoster` cleanly handles a 20-turn window with two operational pulses, or whether two distinct entries with adjacent windows is cleaner.

2. **OG South Mrkonjić pin — opportunity or sub-axis?** OG South was historically a *flanking pin*, not a territory-capture op. It belongs in the catalog only if the engine's opportunity-axis machinery can represent "limited objectives, no town capture" — otherwise it should be absorbed into Southern Move's later Mrkonjić capture.

3. **OG West (HV-pure axis) — does the catalog accept zero-HVO-brigade axes?** The Drvar axis is structurally interesting because it has no HVO brigades at all. The catalog's predicate set (which gates on `hvo_*` corps readiness) may need a `force_quality` exception for pure-HV axes.

4. **Brigade re-assignment between sibling ops.** `hvo_1st_guard_abb` fights Summer '95, then Mistral 2, then Southern Move. The engine's `reconcileOperationRoster` and the operation `historical_exit_class` interaction must allow clean hand-off. This is a tooling question, not a data question.

5. **Jajce OSID prefix mismatch (`jajce_3`, not `jajce_2`).** The original prompt assumed `op:jajce:jajce_2` for the town. The canonical map uses `op:jajce:jajce_3`. Any catalog entry, comment, or test that references the town must use `jajce_3` to avoid silent OSID misses.

---

## 8. Engine-side caveats (out of scope; flagged for completeness)

- **HV phantom withdrawal trigger.** All eight HV 1995 phantoms have `withdrawal_turn: 188` (Dayton) — but historically the HV 1st Guards Brigade pulled back after Una (19 Sept) and most HV Home Guard Regiments demobilised after Southern Move (11 Oct). If `processJnaWithdrawals` enforces a single withdrawal turn for all phantoms, the catalog will see HV units still nominally available after they had historically departed. This is a phantom-withdrawal calibration concern, not a catalog concern.

- **No HV faction modeling.** The engine treats all HV phantoms as `faction: 'HRHB'`, hosted under HVO corps. This is correct for engine accounting (HV+HVO combined offensive) but blurs ICTY's command finding (HV brigades commanded from Zagreb, not Mostar). For the catalog, the relevant fact is that `brigades` arrays can mix `hrhb_*` and `hv_*_1995` IDs freely — both pool under the corps `formations` array.

- **Operation Una omitted.** The user's prompt did not request Una, and Una was an HV-only operation across the Una river (Novi Grad / Bosanska Dubica / Kostajnica / Jasenovac crossings) that failed in 48 hours with no territorial gain. It does not warrant an HVO catalog entry. If a future ARBiH-side catalog wants to represent the diplomatic context (Holbrooke meeting, Tuđman 19 Sept halt order), that belongs in the political-event layer, not the operation-opportunity catalog.

- **Operation Southern Move (8-11 October) is structurally separate.** It is the Mrkonjić-Grad-and-Manjača follow-on to Mistral 2 and was authorised after the ARBiH 5th Corps request for relief at Ključ. Southern Move warrants its own catalog entry — likely named `southern_move_95` — with a distinct window (t ≈ 205-210) and a `mistral_2_95.historical_exit_class === 'decisive_success'` precondition (or equivalent state-readout) so it only fires after Mistral 2 has cleared the operational space.

---

**End of memo.** No code changes proposed. All FormationIds, OSIDs, and corps assignments verified against `src/sim/combat/jna_phantom_brigades.ts`, `data/source/oob_brigades.json`, and `data/derived/operational/canonical_to_operational_map.json` as of 2026-05-23.
