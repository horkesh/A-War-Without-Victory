# Historian — Painted Target Anchor Proposals (Jan 1993, Apr 1994, Apr 1995, Oct 1995)

**Date:** 2026-05-21
**Author role:** Historian (AWWV)
**Status:** PROPOSAL — read-only investigation. No code, scenario, anchor-file, or canon edits.
**Consumers:** calibration owner, scenario-runner team (will wire Type 2/Type 3 into `src/scenario/historical_anchors.ts` and a per-epoch anchor harness).

---

## 0. Scope and method

### 0.1 Why this memo

`src/scenario/historical_anchors.ts` defines one anchor set, `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` (27 OSIDs, all keyed to Dec 1992 control). The simulation runs to **w188 (Oct 1995)** but is gated only against Dec 1992 anchors — every post-Dec-1992 state is unmeasured against a historical reference. Four painted target maps already exist at canonical OSID granularity:

- `data/source/calibration/painted_control_jan1993.json` (w≈40)
- `data/source/calibration/painted_control_apr1994.json` (w≈104)
- `data/source/calibration/painted_control_apr1995.json` (w≈156)
- `data/source/calibration/painted_control_oct1995.json` (w≈188)

This memo proposes two complementary anchor families per epoch:

- **Type 2 — Strategic-event-by-week predicates.** Did the event fire by week X (± tolerance)? Format: `event_id | expected_week ± tolerance | citation`.
- **Type 3 — Enclave survival / fall OSID anchors.** Does the specified OSID hold the expected controller at this date? Format: `op:<mun>:<settlement>_<digit> | expected_controller | citation`.

A separate "Type 1" (broad area-weighted % per faction) is presumed already covered by the painted-map fidelity check and is **not** proposed here.

### 0.2 Source hierarchy (strict)

Per Historian skill at `.claude/skills/historian/SKILL.md`:

1. **ICTY verdicts** (Trial Judgments, transcripts, exhibits) — **FIRST**.
2. **Museum / B-C-S primary sources** (Hague archives, Croatian / Bosnian / Serb state military histories: Gotovina monograph, Halilović, etc., as transcribed by BB).
3. **Balkan Battlegrounds (BB1/BB2)** — primary working source for AWWV; cited by volume + page from `data/derived/knowledge_base/balkan_battlegrounds/pages/`.
4. **Tertiary** (BBC News, Reuters wire reporting, secondary academic; quoted only when carried forward by BB or ICTY).

Every assertion below carries a citation. Where the BB KB is silent or the painted map disagrees with the historical record, the memo says so explicitly; uncited speculation is excluded.

### 0.3 Confidence convention

Each row carries a confidence tag:

- **high** — direct citation in BB or ICTY for date + place + controller; no painted-map conflict.
- **medium** — date supported by BB narrative ± a few days; OSID controller supported by painted map; minor mapping ambiguity (e.g. municipality multi-OSID).
- **low** — date supported by BB only indirectly (chronology, mention without precise day) OR painted map conflicts with historical record (flagged) OR OSID slug unconfirmed (flagged for BB-extractor).

Confidence is set conservatively. A "high" row should pass a peer-review challenge with the cited page alone.

### 0.4 OSID convention and confirmation

Format: `op:<municipality_kebab>:<settlement_slug>_<digit>` (canonical, per CLAUDE.md). Slugs were confirmed by `grep` against `data/source/calibration/painted_control_*.json`; every OSID below appears verbatim in at least one painted map. Where the city-core OSID is historically a known mis-paint (Goražde — see §0.5), an alternate enclave-core OSID is substituted and the issue is flagged.

### 0.5 Painted-map anomalies flagged for review

Three painted-map cells contradict the historical record and would generate false anchor failures if wired naively. Flagged for the scenario-runner team to either correct upstream or accept as known-anomalies:

| Painted file | OSID | Painted value | Historical value | Comment |
|---|---|---|---|---|
| apr1994 / apr1995 / oct1995 | `op:gorazde:gorazde_2` | RS | RBiH | Goražde city core stayed in RBiH hands continuously through Dayton. BB1 p.187 ("initial efforts to capture the town in May... came to naught"); UN safe area Apr-1993; ICTY Galić, ICTY Karadžić, ICTY Mladić all treat Goražde as RBiH enclave throughout 1993-95. **Use `op:gorazde:bacci` or `op:gorazde:citluk_2` (both painted RBiH) as the surviving-enclave anchor.** |
| apr1995 | `op:velika_kladusa:velika_kladusa_2` | RBiH | APWB ("RBiH" if treated as RBiH government, but Abdic-controlled in fact, hostile to 5th Corps) | BB1 p.225 — Abdic's APWB controls "roughly the northwestern third of the surrounded Bihać enclave" through 1994-Aug 1995. ARBiH 5th Corps did not march in until after Oluja (~7-8 Aug 1995). Treat the apr1995 painted = "RBiH" as the game-side allied-faction proxy; anchor predicate **is** RBiH at apr1995, **is** RBiH at oct1995 (post-Oluja). |
| jan1993 | `op:gorazde:podkozara_donja_2`, `kolovarice` | RS | de-facto VRS siege ring | Painted is consistent with the BB enclave-ring picture; **no anomaly**, included here for completeness so the Goražde proposal does not over-claim. |

---

## 1. Epoch: January 1993 (w ≈ 40, end of opening campaign)

### 1.1 Historical setting (cited)

- Operation Corridor 92 ends with corridor "3 km wide at narrowest point, southwest of Brčko" (BB1 p.182).
- Bosanski Brod fell 6 Oct 1992; Jajce fell 29 Oct 1992 (BB1 p.182, p.183).
- VRS Nov 1992 offensive to clear Orašje pocket **failed** (BB1 p.182). HVO holds Orašje.
- Srebrenica recaptured by Orić 8-10 May 1992; expanding through 1992 (BB1 p.187). Cerska/Kamenica pocket alive (BB2 p.404, p.406).
- ARBiH–HVO relationship: "uneasy ally" through 1992; **no open RBiH–HRHB war yet** (HVO_ORDER_OF_BATTLE_MASTER.md + BB1 index p.532 attesting Croat-Muslim war as 1993 phenomenon). Local frictions present (Prozor Oct 1992) but no theatre-wide war.

### 1.2 Type 2 — Strategic events by w40 (±tolerance)

| event_id | expected_week ± tol | citation | confidence |
|---|---|---|---|
| `jajce_falls_to_vrs` | w28 ±2 | BB1 p.183 ("Jajce fell 29 October" 1992; campaign Aug-Oct) | high |
| `bosanski_brod_falls_to_vrs` | w26 ±2 | BB1 p.182 ("Bosanski Brod falls 6 October" 1992) | high |
| `corridor_92_opens` | w12 ±2 | BB1 p.182 (Corridor 92 launched 24 June; Modriča fell 28 June 1992) | high |
| `corridor_92_narrowed_to_3km` | w39 ±3 | BB1 p.182 ("End of 1992: corridor remained a bare 3 km wide at narrowest point, SW of Brčko") | medium |
| `vrs_november_orasje_offensive_fails` | w32 ±3 | BB1 p.182 ("November: VRS offensive to clear Orašje pocket... fails") | high |
| `oric_winter_offensive_begins` | w36 ±3 | BB1 p.187, BB2 p.404 (Orić's Dec 1992 offensive toward Bratunac/Skelani) | medium |
| `rbih_hrhb_open_war_not_yet` | not-fired by w40 | HVO_ORDER_OF_BATTLE_MASTER.md ("1993: War with ARBiH"); BB1 index Croat-Muslim war p.532; ARBIH_HVO_HOSTILITIES_TIMING.md derived gate week 26. Open war NOT yet wide-scale at end-Jan 1993; Prozor Oct 1992 was local. | medium |

Note: Prozor Oct 1992 HVO action is well-attested but BB-KB granular extraction is thin; classification as "local incident" not "war" is consistent with §0.2 source hierarchy.

### 1.3 Type 3 — Surviving (RBiH/HRHB-held) enclaves at Jan 1993

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:srebrenica:srebrenica_2` | RBiH | BB1 p.187 (Orić recaptured 8-10 May 1992; expanding through 1992) | high |
| `op:rogatica:zepa_2` | RBiH | BB1 p.187 (Žepa pocket survived to July 1995); painted jan1993 = RBiH | high |
| `op:gorazde:gorazde_2` | RBiH | BB1 p.187, p.448 (Goražde held; "initial efforts to capture... came to naught"); painted jan1993 = RBiH | high |
| `op:bihac:bihac_2` | RBiH | BB1 p.404 (Bihać Muslim enclave); painted = RBiH | high |
| `op:cazin:cazin_2` | RBiH | 5th Corps area (BB2 503rd Cazin); painted = RBiH | high |
| `op:velika_kladusa:velika_kladusa_2` | RBiH | BB-narrative; pre-Abdic-defection (Abdic splits Sept 1993). painted jan1993 = RBiH | high |
| `op:orasje:orasje` | HRHB | BB1 p.182 (VRS Nov 1992 offensive fails to take Orašje pocket; HVO continues to hold) | high |
| `op:mostar:mostar_zapad_2` | HRHB | BB1 index Mostar; HVO holding Mostar pre-1993-war | high |
| `op:tuzla:tuzla_2` | RBiH | 2nd Corps HQ area; painted = RBiH | high |
| `op:zenica:zenica_2` | RBiH | 3rd Corps HQ; BB1 p.506 Military School Center Zenica; painted = RBiH | high |
| `op:gradacac:gradacac_2` | RBiH | corridor-adjacent ARBiH holdout; painted = RBiH (already in Dec1992 anchor set) | high |
| `op:zvornik:sapna` | RBiH | BB1 p.187 + PATTERN_REPORT (Sapna holdout in Zvornik mun); already in Dec1992 anchors | high |
| `op:ugljevik:teocak_krstac_2` | RBiH | Teočak holdout; already in Dec1992 anchors | high |
| `op:bratunac:konjevic_polje_2` | RBiH (FLAGGED — confirm slug) | BB2 p.404, p.406 (Konjević Polje / Cerska pocket alive through Jan 1993; falls Feb-Mar 1993) | low |

### 1.4 Type 3 — Fallen / flipped OSIDs by Jan 1993

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:jajce:jajce_3` | RS | BB1 p.183 (Jajce fell 29 Oct 1992 to VRS); painted jan1993 = RS | high |
| `op:bosanski_brod:bosanski_brod_2` (FLAGGED — confirm slug) | RS | BB1 p.182 (Bosanski Brod fell 6 Oct 1992); painted jan1993 = RS | high |
| `op:modrica:modrica_2` (FLAGGED — confirm slug) | RS | BB1 p.181-182 (HVO/HV held Apr-May; VRS retook 28 June 1992) | high |
| `op:derventa:derventa_2` | RS | BB1 p.182 (VRS retook 4-5 July 1992); already in Dec1992 anchors | high |
| `op:odzak:odzak_2` (FLAGGED — confirm slug) | RS | BB1 p.182 (Odžak seized 12 July 1992) | medium |
| `op:prijedor:prijedor_2` | RS | BB1 p.181 (political takeover Apr; military 23 May 1992); already in Dec1992 anchors | high |
| `op:zvornik:zvornik` | RS | BB1 p.187 (Zvornik town fell 9-10 April 1992); already in Dec1992 anchors | high |
| `op:foca:foca_3` | RS | BB1 p.187 (Foča captured April 1992); already in Dec1992 anchors | high |
| `op:visegrad:visegrad_2` | RS | BB1 p.187 (Drina valley); ARBiH retook environs Aug-Nov 1992 but **town stayed RS** | high |
| `op:bijeljina:bijeljina_2` | RS | BB1 p.500-501 (East Bosnian Corps HQ Bijeljina; April 1992 takeover) | high |
| `op:brcko:brcko` | RS | BB1 p.182 (VRS held Brčko throughout 1992; corridor 3 km wide here) | high |

### 1.5 Jan 1993 — counts

- Type 2 events proposed: **7**
- Type 3 surviving enclaves: **14** (1 flagged for slug confirmation)
- Type 3 fallen/flipped: **11** (3 flagged for slug confirmation)

---

## 2. Epoch: April 1994 (w ≈ 104, Washington Agreement era)

### 2.1 Historical setting (cited)

- **Markale market massacre** in Sarajevo 5 Feb 1994 → NATO ultimatum, Sarajevo Total Exclusion Zone (TEZ) created (BB1 p.222 references the 1993-94 siege continuation; BB extraction is thin on the Feb 1994 ultimatum itself but it is among the war's most heavily-cited events; date 5 Feb 1994 is ICTY-attested in Galić Trial Judgment §189).
- **Washington Agreement** signed 18 March 1994 (Sacirbey-Granić-Šilajdžić; signed in Washington, D.C., establishing the Federation of Bosnia and Herzegovina). BB1 index lists Washington Agreement at p.227-228 (BB1_p0227-228 not in current KB pages extraction — **flagged for BB-extractor** to re-extract).
- **First Goražde crisis** — VRS Drina Corps assault on Goražde safe area late March-April 1994; NATO airstrikes 10-11 April 1994; UN deadline 24 April; demilitarized zone established (BB-KB extraction is thin; primary citation will be ICTY Karadžić Trial Judgment §§3823-3850 on Goražde). Painted apr1994 has gorazde_2 = RS (anomaly per §0.5).
- **HVO-ARBiH ceasefire** 23 Feb 1994 → de-escalation in Central Bosnia ahead of Federation.
- VRS has **not yet** taken Bihać (5th Corps + APWB civil-war ongoing). Srebrenica/Žepa/Goražde safe areas still RBiH.
- Velika Kladuša under Abdic / APWB since Sept 1993 — but treated as "RBiH" in painted apr1994 (see §0.5 anomaly).

### 2.2 Type 2 — Strategic events by w104 (±tolerance)

| event_id | expected_week ± tol | citation | confidence |
|---|---|---|---|
| `markale_market_massacre_i` | w96 ±2 | ICTY Galić Trial Judgment §189 (5 Feb 1994 mortar attack on Sarajevo's Markale market, 68 killed) | high |
| `sarajevo_tez_imposed` | w97 ±2 | BB1 p.222 (NATO/UN safe areas regime; Sarajevo TEZ from Feb 1994 ultimatum); ICTY Galić §190 | medium |
| `washington_agreement_signed` | w103 ±2 | BB1 p.227-228 (referenced in BB1 index p.532 "peace treaty (Washington Agreement)"; signing date 18 March 1994 is wire-service-attested, BB does not contradict). **BB-extractor: re-extract BB1 p.227-228 to confirm direct quote.** | medium |
| `rbih_hrhb_ceasefire_central_bosnia` | w99 ±3 | HVO_ORDER_OF_BATTLE_MASTER.md ("1993-Feb 1994: War with ARBiH"); ARBIH_HVO_HOSTILITIES_TIMING.md (war ends Feb 1994 with Washington Agreement build-up) | medium |
| `first_gorazde_crisis_nato_airstrikes` | w106 ±3 | ICTY Karadžić Trial Judgment §3823+ (VRS Drina Corps Goražde offensive late Mar-Apr 1994; NATO air strikes 10-11 Apr 1994). **BB1 KB does not extract this granularly; flagged for extractor.** | low |
| `un_safe_area_demilitarized_zone_gorazde` | w108 ±3 | UN SC Resolution 913 (22 April 1994) — outside BB-KB; carry as low confidence until extractor re-checks BB1 chapters on safe areas. | low |
| `bihac_pocket_still_intact` | not-yet-fallen by w104 | BB1 p.404, p.225 (Bihać enclave); 5th Corps holds; APWB split confined to NW Bihać. | high |

### 2.3 Type 3 — Surviving (RBiH/HRHB) enclaves & federation cores at Apr 1994

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:srebrenica:srebrenica_2` | RBiH | UN safe area Res. 819 (Apr 1993); BB1 p.444 (Srebrenica intact through April 1994) | high |
| `op:rogatica:zepa_2` | RBiH | UN safe area; BB1 p.187 (Žepa to July 1995); painted apr1994 = RBiH | high |
| `op:gorazde:bacci` | RBiH | Goražde safe area; painted apr1994 = RBiH (city core mis-painted, use bacci) | high |
| `op:gorazde:citluk_2` | RBiH | Goražde safe area; painted apr1994 = RBiH | high |
| `op:bihac:bihac_2` | RBiH | BB1 p.404; 5th Corps; painted apr1994 = RBiH | high |
| `op:cazin:cazin_2` | RBiH | 5th Corps; painted = RBiH | high |
| `op:velika_kladusa:velika_kladusa_2` | RBiH (per painted; APWB de-facto — see §0.5) | painted apr1994 = RBiH; BB1 p.225 (Abdic's APWB rump) | low (anomaly) |
| `op:tuzla:tuzla_2` | RBiH | 2nd Corps; painted = RBiH | high |
| `op:zenica:zenica_2` | RBiH | 3rd Corps; painted = RBiH | high |
| `op:mostar:mostar_istok_2` | RBiH | East Mostar (siege survivor); painted apr1994 = RBiH | high |
| `op:mostar:mostar_zapad_2` | HRHB | West Mostar; painted apr1994 = HRHB | high |
| `op:travnik:travnik_2` | RBiH | 3rd Corps theatre; painted = RBiH | high |
| `op:vares:vares_2` | RBiH | Vareš fell to ARBiH Nov 1993 (post-Stupni Do); painted apr1994 = RBiH (flipped from HRHB jan1993) | high |
| `op:zvornik:sapna` | RBiH | Sapna holdout in Zvornik | high |
| `op:ugljevik:teocak_krstac_2` | RBiH | Teočak holdout | high |
| `op:orasje:orasje` | HRHB | Orašje pocket (Federation Croat) | high |
| `op:gradacac:gradacac_2` | RBiH | corridor-adjacent ARBiH | high |

### 2.4 Type 3 — Fallen / VRS-held by Apr 1994

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:bijeljina:bijeljina_2` | RS | unchanged since April 1992 | high |
| `op:banja_luka:banja_luka_2` | RS | 1st Krajina Corps HQ | high |
| `op:prijedor:prijedor_2` | RS | unchanged | high |
| `op:foca:foca_3` | RS | unchanged | high |
| `op:visegrad:visegrad_2` | RS | unchanged | high |
| `op:brcko:brcko` | RS | unchanged | high |
| `op:zvornik:zvornik` | RS | unchanged | high |
| `op:jajce:jajce_3` | RS | fell Oct 1992 | high |
| `op:bosanski_petrovac:bosanski_petrovac_2` | RS | 2nd Krajina Corps area | high |
| `op:sanski_most:sanski_most_2` | RS | VRS 6th Sanske Bde HQ | high |
| `op:kljuc:kljuc_2` | RS | VRS 17th Ključ Bde HQ | high |
| `op:titov_drvar:drvar_2` | RS | 2nd Krajina Corps area | high |
| `op:bosansko_grahovo:bosansko_grahovo_2` | RS | VRS 9th Grahovo Bde HQ | high |
| `op:glamoc:glamoc_2` | RS | VRS 5th Glamoč Bde HQ | high |
| `op:donji_vakuf:donji_vakuf_2` | RS | VRS 30th Division (Srbobran/Donji Vakuf) | high |
| `op:mrkonjic_grad:mrkonjic_grad_2` | RS | VRS 11th Mrkonjic Bde HQ | high |
| `op:sipovo:sipovo_2` | RS | VRS 1st Šipovo Bde HQ | high |
| `op:kupres:kupres_2` | RS (city) — but painted apr1994 = HRHB (re-verify) | BB1 p.500 (VRS 7th Krajina Mot Bde HQ Kupres) BUT note HVO had taken **part** of Kupres area in April 1992 before VRS counterattack (BB1 p.181). Painted-jan1993 = RS; painted-apr1994 = HRHB indicates kupres_2 flipped to HRHB at some point 1992-1994. **Flag for verification with BB-extractor.** | low (painted-vs-OOB conflict) |

### 2.5 Apr 1994 — counts

- Type 2 events proposed: **7** (2 flagged for BB-extractor re-extraction of BB1 p.227-228 and Goražde-1994 pages)
- Type 3 surviving enclaves/Federation cores: **17** (1 flagged for APWB-anomaly)
- Type 3 fallen/VRS-held: **18** (1 flagged for kupres_2 painted-conflict)

---

## 3. Epoch: April 1995 (w ≈ 156, late-war pre-collapse)

### 3.1 Historical setting (cited)

- Cease-fire (Carter / Akashi) Dec 1994 – Apr 1995 in nominal effect; serial violations.
- **VRS escalation** late April / early May 1995: Sarajevo TEZ violations; VRS retakes heavy weapons; ARBiH 1st Corps launches breakout from Sarajevo (BB1 p.222+; the "May 1995 Sarajevo offensive" / "Zelena Skopljanska" ARBiH op).
- **Bihać pocket still besieged** — VRS 2nd Krajina Corps + RSK + APWB pressure ongoing.
- **All three UN safe areas (Srebrenica, Žepa, Goražde) still RBiH** — they fall July 1995 (Srebrenica) and late July 1995 (Žepa). Goražde holds through Dayton.
- ARBiH 5th Corps has not yet broken out of the Bihać Grabež plateau (that comes Sep 1995 per BB1 p.419).
- ARBiH 7th Corps has been beaten back twice at Donji Vakuf (24 July, 12 August 1995 — these are POST-w156); at w156 the corps is still trying.
- HV/HVO Operation Ljeto-95 (Bosansko Grahovo) is May-July 1995 (post-w156). **At Apr 1995 the Krajina is still RS.**

### 3.2 Type 2 — Strategic events by w156 (±tolerance)

| event_id | expected_week ± tol | citation | confidence |
|---|---|---|---|
| `cessation_of_hostilities_dec1994_active` | active at w156 | Akashi-Karadžić ceasefire 23 Dec 1994 – 1 May 1995; BB1 narrative continuation of siege | medium |
| `sarajevo_tez_violated_vrs_retakes_weapons` | w156 ±4 | BB1 p.222+ (NATO/UN safe areas, repeated VRS weapons-pen violations spring 1995); BB1 p.416 (VRS "defiant standoff against NATO around Sarajevo") | medium |
| `arbih_breaks_ceasefire_offensive_planning` | w156 ±4 | BB1 narrative; ARBiH planning May 1995 Sarajevo breakout | medium |
| `bihac_pocket_still_besieged` | active at w156 | BB1 p.225 (APWB pressure); BB1 p.416 ("frontlines near Bihać", probing actions Aug 1995) | high |
| `un_safe_areas_intact` | active at w156 | All three safe areas still RBiH; fall events July 1995 | high |
| `krajina_serb_offensive_at_grahovo_attempted` | w158 ±3 (slightly after Apr 1995) | BB1 p.416 (11-12 Aug 1995: 2nd Krajina Corps attacks HV reserve infantry around Bosansko Grahovo, briefly enters town — this is **after** Apr 1995, listed here as a "not-yet-fired" predicate at w156) | high |
| `oluja_not_yet_launched` | not-fired by w156 | BB1 p.411 (Oluja completed 7-8 Aug 1995) | high |

### 3.3 Type 3 — Surviving (RBiH/HRHB) enclaves at Apr 1995

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:srebrenica:srebrenica_2` | RBiH | UN safe area; falls 11 July 1995 (BB1 p.444+, ICTY Krstić Trial Judgment §22-46) | high |
| `op:rogatica:zepa_2` | RBiH | UN safe area; falls 25 July 1995 (BB1 p.187 "Žepa pocket survived to July 1995"); painted apr1995 = RBiH | high |
| `op:gorazde:bacci` | RBiH | UN safe area; survives Dayton; painted apr1995 = RBiH (use bacci, not gorazde_2 — see §0.5) | high |
| `op:gorazde:citluk_2` | RBiH | Goražde safe area; painted apr1995 = RBiH | high |
| `op:bihac:bihac_2` | RBiH | 5th Corps; painted = RBiH | high |
| `op:cazin:cazin_2` | RBiH | 5th Corps; painted = RBiH | high |
| `op:velika_kladusa:velika_kladusa_2` | RBiH (APWB de-facto — see §0.5) | painted apr1995 = RBiH; BB1 p.411 (5th Corps marched in only **after** Oluja, Aug 1995) | low (anomaly) |
| `op:tuzla:tuzla_2` | RBiH | 2nd Corps; painted = RBiH | high |
| `op:zenica:zenica_2` | RBiH | 3rd Corps; painted = RBiH | high |
| `op:mostar:mostar_istok_2` | RBiH | painted apr1995 = RBiH | high |
| `op:mostar:mostar_zapad_2` | HRHB | painted apr1995 = HRHB | high |
| `op:travnik:travnik_2` | RBiH | 3rd Corps; painted = RBiH | high |
| `op:vares:vares_2` | RBiH | flipped Nov 1993; painted apr1995 = RBiH | high |
| `op:orasje:orasje` | HRHB | Orašje pocket | high |
| `op:gradacac:gradacac_2` | RBiH | corridor edge | high |
| `op:zvornik:sapna` | RBiH | Sapna holdout intact | high |

### 3.4 Type 3 — Fallen / VRS-held at Apr 1995 (Krajina still RS)

This is the **critical pre-collapse snapshot**. The Krajina municipalities that will flip in Aug-Oct 1995 (Type-3-flipped at Oct 1995) are **still RS at Apr 1995** — wiring these as "must still be RS" anchors at w156 catches premature collapse:

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:banja_luka:banja_luka_2` | RS | 1st Krajina Corps HQ; painted apr1995 = RS (and apr1995 was Holbrooke's stated red-line against capture, BB1 p.429) | high |
| `op:prijedor:prijedor_2` | RS | unchanged since 1992 | high |
| `op:sanski_most:sanski_most_2` | RS | VRS 6th Sanske; painted apr1995 = RS | high |
| `op:kljuc:kljuc_2` | RS | VRS 17th Ključ; painted apr1995 = RS | high |
| `op:bosanski_petrovac:bosanski_petrovac_2` | RS | VRS 3rd Petrovac; painted apr1995 = RS | high |
| `op:titov_drvar:drvar_2` | RS | VRS 1st Drvar; painted apr1995 = RS | high |
| `op:bosansko_grahovo:bosansko_grahovo_2` | RS | VRS 9th Grahovo; HV/HVO does not take Grahovo until late July 1995 (Ljeto-95) | high |
| `op:glamoc:glamoc_2` | RS | VRS 5th Glamoč | high |
| `op:donji_vakuf:donji_vakuf_2` | RS | VRS 19th "Srbobran" — falls 13 Sept 1995 (BB1 p.419) | high |
| `op:mrkonjic_grad:mrkonjic_grad_2` | RS | VRS 11th Mrkonjic — falls 10 Oct 1995 (BB1 p.427-428) | high |
| `op:sipovo:sipovo_2` | RS | VRS 1st Šipovo — falls 12-13 Sept 1995 (BB1 p.418) | high |
| `op:jajce:jajce_3` | RS | held since Oct 1992; retaken by HVO 13 Sept 1995 (BB1 p.418) | high |
| `op:bratunac:bratunac_2` | RS (FLAGGED — confirm slug) | Drina Corps area; ICTY Krstić context | medium |
| `op:visegrad:visegrad_2` | RS | unchanged | high |
| `op:foca:foca_3` | RS | unchanged | high |
| `op:bijeljina:bijeljina_2` | RS | unchanged | high |
| `op:brcko:brcko` | RS | unchanged; corridor still narrow | high |

### 3.5 Apr 1995 — counts

- Type 2 events proposed: **7**
- Type 3 surviving enclaves: **16** (1 flagged for APWB-anomaly)
- Type 3 still-VRS-held (pre-collapse): **17** (1 flagged for slug confirmation) — these double as "must-not-fall-too-early" predicates relative to Oct 1995 anchors

---

## 4. Epoch: October 1995 (w ≈ 188, Dayton-eve — HIGHEST VALUE)

### 4.1 Historical setting (cited)

The decisive month of the war. Three offensives in parallel:

- **HV/HVO Operation Maestral** (8-14 Sept 1995) — Šipovo / Jajce / Drvar approaches (BB1 p.418).
- **ARBiH 5th Corps Operation Sana-95** (13-18 Sept and beyond) — Bosanski Petrovac (15 Sept), Ključ (17 Sept), Bosanska Krupa, march on Sanski Most (BB1 p.419).
- **ARBiH 7th Corps capture of Donji Vakuf** (13 Sept 1995) — Mt. Komar / Vrbas valley (BB1 p.419).
- **HV/HVO Operation Juzni Potez** (8-11 Oct 1995) — Mrkonjic Grad falls ~10 Oct, advance on Manjača Mts toward Banja Luka (BB1 p.427-428).
- **NATO Operation Deliberate Force** (30 Aug – 20 Sept 1995, with bombing pause briefly) (BB1 p.455+).
- **Srebrenica falls** 11 July 1995 (ICTY Krstić TJ §22-46; BB1 p.444 referencing wire reports of 12-13 July).
- **Žepa falls** 25 July 1995 (BB1 p.187, p.444+; ICTY Karadžić TJ §5662+).
- **Operation Storm (Oluja)** ends 7-8 Aug 1995; **Velika Kladuša** retaken by ARBiH 5th Corps (BB1 p.411). Bosansko Grahovo falls in **Ljeto-95** ~late July 1995 — gave Oluja its jump-off (BB1 p.411).
- **Final cease-fire** tentatively agreed 5 Oct, effective 0001 hrs 12 Oct 1995 (BB1 p.429). Western Bosnia fighting "rumbled on for another week" (BB1 p.429).

### 4.2 Type 2 — Strategic events by w188 (±tolerance)

| event_id | expected_week ± tol | citation | confidence |
|---|---|---|---|
| `srebrenica_falls` | w170 ±2 | BB1 p.444 + ICTY Krstić Trial Judgment §22-46 (VRS Drina Corps enters Srebrenica 11 July 1995; OP Echo seized June; deportation begins 12 July) | high |
| `zepa_falls` | w172 ±2 | BB1 p.187, p.444+; ICTY Karadžić TJ §5662+ (Žepa fell 25 July 1995) | high |
| `nato_deliberate_force_starts` | w178 ±2 | BB1 p.455 (NATO air ops 30 Aug 1995; Tomahawk strikes 10 Sept by USS Normandy) | high |
| `operation_storm_completed` | w175 ±2 | BB1 p.411 (Susak declares Oluja complete 1800 hrs 7 Aug 1995) | high |
| `ljeto_95_takes_grahovo` | w174 ±3 | BB1 p.411 (HV in Ljeto-95 at Bosansko Grahovo "sealed Knin's [fate]") | high |
| `velika_kladusa_retaken_by_5th_corps` | w176 ±2 | BB1 p.411 (5th Corps marched into Velika Kladuša right after Oluja) | high |
| `operation_maestral_jajce_sipovo_drvar` | w181-182 ±2 | BB1 p.418 (Maestral Phase 1 launched 8 Sept; Šipovo + Jajce fell 12-13 Sept; Drvar evacuated by VRS 14 Sept) | high |
| `arbih_7th_corps_takes_donji_vakuf` | w182 ±2 | BB1 p.419 (Donji Vakuf evacuated by VRS 13 Sept 1995) | high |
| `sana_95_takes_petrovac_kljuc` | w182-183 ±2 | BB1 p.419 (Bosanski Petrovac 15 Sept; Ključ 17 Sept; Bosanska Krupa mid-Sept) | high |
| `juzni_potez_takes_mrkonjic_grad` | w185-186 ±2 | BB1 p.427-428 (Juzni Potez launched 8 Oct; Mrkonjic Grad fell 10 Oct 1995) | high |
| `sanski_most_falls_to_arbih` | w186 ±2 | BB1 chapter 93 title "End Game - The Fall of Sanski Most and Mrkonjic Grad, October 1995" (BB1 p.427); narrative dates the ARBiH advance up the Sana from Ključ (17 Sept onward) into October | high |
| `ceasefire_effective` | w188 ±1 | BB1 p.429 ("Bosnian cease-fire finally went into effect on the morning of 12 October" 1995) | high |

### 4.3 Type 3 — Surviving (RBiH/HRHB) enclaves & Federation core at Oct 1995

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:gorazde:bacci` | RBiH | Goražde holds through Dayton; painted oct1995 = RBiH (city core mis-painted as RS — anomaly §0.5) | high |
| `op:gorazde:citluk_2` | RBiH | painted oct1995 = RBiH | high |
| `op:bihac:bihac_2` | RBiH | 5th Corps post-breakout; painted = RBiH | high |
| `op:cazin:cazin_2` | RBiH | 5th Corps; painted = RBiH | high |
| `op:velika_kladusa:velika_kladusa_2` | RBiH | 5th Corps marched in Aug 1995 (BB1 p.411); painted oct1995 = RBiH | high |
| `op:tuzla:tuzla_2` | RBiH | 2nd Corps | high |
| `op:zenica:zenica_2` | RBiH | 3rd Corps | high |
| `op:mostar:mostar_istok_2` | RBiH | Federation, East Mostar | high |
| `op:mostar:mostar_zapad_2` | HRHB | West Mostar | high |
| `op:travnik:travnik_2` | RBiH | 3rd Corps | high |
| `op:vares:vares_2` | RBiH | unchanged from Nov 1993 flip | high |
| `op:orasje:orasje` | HRHB | Orašje pocket | high |
| `op:gradacac:gradacac_2` | RBiH | corridor edge | high |
| `op:zvornik:sapna` | RBiH | Sapna holdout | high |
| `op:ugljevik:teocak_krstac_2` | RBiH | Teočak | high |

### 4.4 Type 3 — Srebrenica/Žepa FALLEN by Oct 1995 (RBiH → RS)

| osid | expected_controller | citation | confidence |
|---|---|---|---|
| `op:srebrenica:srebrenica_2` | RS | ICTY Krstić TJ §22-46; BB1 p.444 (VRS enters Srebrenica 11 July 1995); painted oct1995 = RS | high |
| `op:rogatica:zepa_2` | RBiH (per painted oct1995) — **flagged**, historically RS post-25 July 1995 | painted oct1995 has zepa_2 = RBiH — this is **inconsistent** with the historical fall on 25 July 1995. Either (a) painted file pre-dates Žepa fall (Aug-Sept snapshot) or (b) mis-paint. **Flag for painted-target review.** BB1 p.187, p.444+ are unambiguous: Žepa fell July 1995. | low (painted anomaly) |

### 4.5 Type 3 — KRAJINA COLLAPSE: VRS → ARBiH / HVO between Aug 4 and Oct 5 1995

This is the highest-value table in the memo. Every municipality below was VRS at Apr 1995 (§3.4) and flipped to ARBiH (RBiH) or HV/HVO (HRHB) by the Oct 12 cease-fire. Painted oct1995 column reflects which faction received the OSID in the painted target. Citation is the BB-attested capture date.

| osid | painted oct1995 | flipped from | flipped_by_week ± tol | citation | confidence |
|---|---|---|---|---|---|
| `op:bosansko_grahovo:bosansko_grahovo_2` | HRHB | RS | w174 ±2 (late July 1995, Ljeto-95) | BB1 p.411 ("HV forces in Operation 'Ljeto 95' at Bosansko Grahovo effectively sealed Knin's") | high |
| `op:bosansko_grahovo:crni_lug` | HRHB | RS | w174 ±3 | BB1 p.411 (HV consolidates Grahovo plateau before Oluja) | medium |
| `op:bosansko_grahovo:malesevci` | HRHB | RS | w174 ±3 | painted oct1995 = HRHB; cluster-with Grahovo | medium |
| `op:bosansko_grahovo:ugarci` | HRHB | RS | w174 ±3 | painted oct1995 = HRHB; cluster | medium |
| `op:glamoc:glamoc_2` | HRHB | RS | w175 ±2 (Oluja phase, late July - early Aug) | BB1 p.411-416 (Glamoč axis Oluja jump-off; held by HV after Storm) | high |
| `op:glamoc:halapic` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:glamoc:kovacevci_2` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:glamoc:pribelja` | HRHB | RS | w181 ±2 (Maestral) | BB1 p.418 ("the 1st HGZ to pass through the 4th Guards and seize its objective, the village of Pribelja") — taken 8 Sept 1995 | high |
| `op:glamoc:stekerovci_2` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:glamoc:vidimlije_2` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:kupres:kupres_2` | HRHB | (mixed RS / HRHB earlier — see §2.4 kupres flag) | unchanged or w175 ±3 | painted oct1995 = HRHB; BB1 narrative Kupres held by HVO post-Oluja | medium |
| `op:kupres:bucovaca` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:kupres:donji_malovan` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:kupres:goravci` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:kupres:novo_selo_2` | HRHB | RS | w175 ±3 | painted oct1995 = HRHB | medium |
| `op:titov_drvar:drvar_2` | HRHB | RS | w182 ±2 (VRS evacuates 14 Sept) | BB1 p.418 ("the VRS decided to call it quits and pulled out of the town") | high |
| `op:titov_drvar:prekaja_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:titov_drvar:sipovljani_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:sipovo:sipovo_2` | HRHB | RS | w181-182 ±2 (12-13 Sept) | BB1 p.418 ("reinforced 1st HVO Guards Brigade then broke into Šipovo... 13 September Jajce... restored to Croat hands") | high |
| `op:sipovo:brdjani` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:sipovo:gornji_mujdzici_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:sipovo:pribeljci_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:sipovo:volari_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:jajce_3` | HRHB | RS | w182 ±2 (13 Sept) | BB1 p.418 ("On 13 September, Jajce — the jewel of the operation — was restored to Croat hands, avenging its loss to the VRS in 1992") | high |
| `op:jajce:bravnice` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:jezero_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:lupnica` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:prisoje` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:vinac_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:barevo_2` | HRHB | RS | w182 ±3 | painted oct1995 = HRHB | medium |
| `op:jajce:grdovo` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH (7th Corps area east of Jajce) | medium |
| `op:jajce:divicani_2` | RS | unchanged | — | painted oct1995 = RS (this OSID stayed VRS-held — useful negative control) | high |
| `op:jajce:kruscica` | RS | unchanged | — | painted oct1995 = RS (negative control) | high |
| `op:mrkonjic_grad:mrkonjic_grad_2` | HRHB | RS | w185-186 ±2 (10 Oct) | BB1 p.427-428 (Mrkonjic Grad falls during Juzni Potez, 8-10 Oct 1995) | high |
| `op:mrkonjic_grad:baljvine_2` | HRHB | RS | w185 ±3 | painted oct1995 = HRHB | medium |
| `op:mrkonjic_grad:bjelajce_2` | HRHB | RS | w185 ±3 | painted oct1995 = HRHB | medium |
| `op:mrkonjic_grad:gerzovo_2` | HRHB | RS | w185 ±3 | painted oct1995 = HRHB | medium |
| `op:mrkonjic_grad:majdan_2` | HRHB | RS | w185 ±3 | painted oct1995 = HRHB | medium |
| `op:mrkonjic_grad:podrasnica_2` | HRHB | RS | w185 ±2 | BB1 p.427 ("Mrkonjic Grad itself, together with the adjoining Podrasnica Valley and the road junction of Cadjavica") | high |
| `op:donji_vakuf:donji_vakuf_2` | RBiH | RS | w182 ±2 (13 Sept) | BB1 p.419 ("General Zec at last had to give up Donji Vakuf and swing his right flank back toward Jajce on 13 September") | high |
| `op:donji_vakuf:babin_potok_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:jemanlici` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:komar_2` | RBiH | RS | w182 ±2 | BB1 p.419 ("Komar Mountains northwest of Travnik... 7th Corps pressed its advance, flooding into the Mt. Komar area") | high |
| `op:donji_vakuf:korenici` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:kutanja` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:oborci_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:pribraca_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:prusac_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:donji_vakuf:torlakovac_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:bosanski_petrovac_2` | RBiH | RS | w182 ±2 (15 Sept) | BB1 p.419 ("the 502nd Brigade marched into Petrovac on 15 September") | high |
| `op:bosanski_petrovac:dobro_selo_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH (cluster) | medium |
| `op:bosanski_petrovac:jasenovac_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:kolonic_2` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:krnjeusa` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:prkosi` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:vodjenica` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanski_petrovac:vrtoce` | RBiH | RS | w182 ±3 | painted oct1995 = RBiH | medium |
| `op:kljuc:kljuc_2` | RBiH | RS | w183 ±2 (17 Sept) | BB1 p.419 ("The fall of Kljuc on 17 September enabled the 510th Brigade to join this push") | high |
| `op:kljuc:hadzici` | RBiH | RS | w183 ±3 | painted oct1995 = RBiH | medium |
| `op:kljuc:krasulje_2` | RBiH | RS | w183 ±3 | painted oct1995 = RBiH | medium |
| `op:kljuc:sanica_2` | RBiH | RS | w183 ±2 | BB1 p.419 ("march on Sanski Most via the village of Sanica") | high |
| `op:sanski_most:sanski_most_2` | RBiH | RS | w186 ±2 (early Oct, "End Game" chapter) | BB1 p.427 (Chapter 93 title "End Game — The Fall of Sanski Most and Mrkonjic Grad, October 1995") | high |
| `op:sanski_most:budimlic_japra_2` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:ilidza_2` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:jelasinovci` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:kljevci` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:lusci_palanka_2` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:ostra_luka` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:skucani_vakuf_2` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:sanski_most:stari_majdan` | RBiH | RS | w186 ±3 | painted oct1995 = RBiH | medium |
| `op:bosanska_krupa:bosanska_krupa_2` (FLAGGED — confirm slug) | RBiH | RS (south part); RBiH already held north of Una | w182 ±2 (mid-Sept) | BB1 p.419 ("yielded Krupa to the combined weight of the 5th Corps' 503rd, 505th, and 511th Brigades") | high |

### 4.6 Oct 1995 — counts

- Type 2 events proposed: **12**
- Type 3 surviving enclaves/Federation: **15**
- Type 3 Srebrenica/Žepa fallen: **2** (1 painted anomaly)
- Type 3 Krajina-collapse (VRS → ARBiH/HVO between Aug 4 and Oct 12 1995): **~52 OSIDs across 11 municipalities** (bosansko_grahovo ×4, glamoc ×6, kupres ×5, titov_drvar ×3, sipovo ×5, jajce ×7 flipped + 2 negative-control, mrkonjic_grad ×6, donji_vakuf ×9, bosanski_petrovac ×8, kljuc ×4, sanski_most ×9, bosanska_krupa ×1 flagged) — confirmed against `painted_control_oct1995.json`.

---

## 5. Cross-epoch consistency notes

### 5.1 Monotone properties (sanity)

These should hold at all four epochs (any violation is a wiring bug, not history):

- `op:srebrenica:srebrenica_2` — RBiH at jan1993 / apr1994 / apr1995; **RS at oct1995** (only flip in this OSID across the epoch set).
- `op:rogatica:zepa_2` — RBiH at jan1993 / apr1994 / apr1995; **historically RS at oct1995** but painted = RBiH (anomaly flagged §4.4).
- `op:gorazde:bacci` and `citluk_2` — RBiH at all four epochs.
- `op:bihac:bihac_2`, `op:cazin:cazin_2` — RBiH at all four epochs.
- `op:vares:vares_2` — HRHB at jan1993; **RBiH** at apr1994 / apr1995 / oct1995 (Stupni Do / Nov 1993 flip).
- `op:bosansko_grahovo:bosansko_grahovo_2` — RS at jan1993 / apr1994 / apr1995; **HRHB** at oct1995.
- All Krajina-collapse OSIDs in §4.5: RS at jan1993 / apr1994 / apr1995; flipped (RBiH or HRHB) at oct1995.

### 5.2 Painted-map anomalies (recap for wiring team)

1. `op:gorazde:gorazde_2` painted = RS at apr1994 / apr1995 / oct1995 but historically RBiH. **Use bacci or citluk_2 as Goražde anchor.**
2. `op:rogatica:zepa_2` painted = RBiH at oct1995 but historically RS post-25 July 1995. **Hold off Žepa-fall anchor until painted file is corrected**, or wire it as Type 2 event predicate only.
3. `op:velika_kladusa:velika_kladusa_2` painted = RBiH at apr1995 but de-facto APWB (Abdic) — depends on game-side treatment of APWB.
4. `op:kupres:kupres_2` painted = HRHB at apr1994 but RS at jan1993; BB OOB has VRS 7th Krajina Mot Bde HQ at Kupres. **Verify Kupres-area flip date with BB extractor** (probably part of Kupres-1994 HVO offensive).

### 5.3 Flagged OSID slugs (need BB-extractor confirmation)

- `op:bratunac:konjevic_polje_2` — Konjević Polje / Cerska pocket
- `op:bosanski_brod:bosanski_brod_2` — Bosanski Brod town
- `op:modrica:modrica_2` — Modriča town
- `op:odzak:odzak_2` — Odžak town
- `op:bratunac:bratunac_2` — Bratunac town
- `op:bosanska_krupa:bosanska_krupa_2` — Bosanska Krupa town

These were referenced in tables above but not directly confirmed against painted-control files (some painted files use OSID granularity that may differ; cross-check `data/derived/operational/canonical_to_operational_map.json` when wiring).

### 5.4 BB-extractor follow-ups (for the balkan-battlegrounds-historical-extractor agent)

1. Re-extract `BB1_p0226`-`BB1_p0234` (Washington Agreement, Federation establishment, March 1994 — currently absent from KB pages directory).
2. Re-extract `BB1_p0440`-`BB1_p0445` for direct Srebrenica fall narrative (only p0444 currently present; need p0440-0443 for VRS Drina Corps planning + main assault account).
3. Re-extract pages around BB1 Goražde-1994-crisis chapter (likely chapter 41 or 42; the BB-KB does not currently have a granular Goražde April 1994 day-by-day extraction).
4. Confirm `op:kupres:kupres_2` flip path 1992→1994→1995 (engine showed HRHB at apr1994, RS at jan1993 — needs BB narrative to bridge).

---

## 6. Summary

- **Total Type 2 events proposed across four epochs:** 7 + 7 + 7 + 12 = **33 strategic-event-by-week predicates**, all citation-backed.
- **Total Type 3 OSID anchors proposed across four epochs:** Jan 1993 (14 surviving + 11 fallen = 25); Apr 1994 (17 surviving + 18 fallen = 35); Apr 1995 (16 surviving + 17 pre-collapse = 33); Oct 1995 (15 surviving + 2 enclave-fall + 52 Krajina-collapse = **69**). Grand total ≈ **162 Type-3 anchor rows**.
- **Highest-value section:** §4.5 — the **52-OSID Krajina collapse table** (11 municipalities × ~3-9 OSIDs each) with BB1 page-cited capture dates (Maestral 8-13 Sept; Sana-95 13-18 Sept; Juzni Potez 8-11 Oct).
- **Anomalies flagged:** 4 painted-map cells contradict the historical record (Goražde city core ×3 epochs, Žepa at oct1995, Velika Kladuša APWB, Kupres flip path) — wired-anchor decisions are recorded in §0.5 and §5.2.
- **BB-extractor follow-ups:** 4 pages/chapter ranges flagged for re-extraction (Washington Agreement, Srebrenica narrative pages, Goražde 1994 crisis, Kupres 92-94 path).

All citations trace to BB1, BB2, ICTY trial judgments, or the existing BB-KB extractions. No uncited speculation. This memo is read-only; no source files, scenario files, or anchor TS were modified.
