# Research: HVO Operations 1994 — The Pre- and Post-Washington Operational Year

**Date:** 2026-05-23
**Author:** Historian (Pyrrhic role) — research-only dispatch
**Purpose:** Companion to `20260523_RESEARCH_ARBIH_1994_OPS.md` and `20260523_RESEARCH_HVO_HV_FALL_1995.md`. Establishes the HVO operational record for calendar year 1994 (and its 1993 antecedents where they bear directly on 1994 operations) so the engine's HRHB operation catalog can be authored against a verifiable historical baseline.
**Source hierarchy applied:** ICTY judgments (Prlić et al. IT-04-74-T, 29 May 2013; Blaškić IT-95-14-T, 3 March 2000; Kordić & Čerkez IT-95-14/2-T, 26 February 2001; Kupreškić IT-95-16-T, 14 January 2000) → Balkan Battlegrounds Vol. II (CIA Office of Russian and European Analysis, 2002), ch. 9-11, 16, 22-28 → Charles R. Shrader, *The Muslim-Croat Civil War in Central Bosnia: A Military History, 1992-1994* (Texas A&M, 2003) → secondary scholarship (Hoare, Burg & Shoup, Marijan) → Wikipedia (date corroboration only).
**Companion docs:**
- `docs/40_reports/proposals/20260523_RESEARCH_ARBIH_1994_OPS.md` (mirror — the ARBiH 1994 record)
- `docs/40_reports/proposals/20260523_RESEARCH_HVO_HV_FALL_1995.md` (downstream — the 1995 federation offensives)
- `docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md` (proposes the 6-op catalog this research grounds)
- `docs/40_reports/proposals/20260522_KUPRES_CINCAR_FIX.md` (Cincar 94 catalog entry — already shipped)
- `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md` (OOB master, brigade rosters)
- `data/scenarios/essays/operation_cincar_1994.json` (in-canon essay reference)
- `data/scenarios/essays/washington_agreement_1994.json` (in-canon essay reference)
**Scope:** historical research only. No engine code, no catalog edits, no railroad proposals. The Washington Agreement falls at turn 102 in the 188-week scenario starting 6 April 1992.

---

## 0. Executive summary

The HVO's 1994 operational year divides cleanly at 18 March 1994 — the Washington Agreement. Before it, the HVO was fighting a two-front war that it was structurally losing: ARBiH's 3rd and 7th Corps had taken Travnik (June 1993), Fojnica (July 1993), Bugojno (July 1993), and Vareš (November 1993), reducing the Central Bosnia OZ to three isolated enclaves (Vitez-Busovača-Novi Travnik, Kiseljak, Žepče) sustained only by Croatian helicopter supply from Split. Mostar was a humanitarian catastrophe: the HVO siege of East Mostar (May 1993 – February 1994) had trapped roughly 55,000 Bosniak civilians; the Stari Most fell to HVO tank fire on 9 November 1993. After Washington, the HVO became a Federation military component nominally, but in practice spent April – October 1994 in a defensive holding pattern: consolidating perimeter integrity in central Bosnia, demobilising forces from the East Mostar siege, garrisoning Herzegovina against VRS Herzegovina Corps probing. The single significant offensive output of HVO 1994 was **Operation Cincar (1-3 November 1994)** — the Tomislavgrad OZ's contribution to the joint ARBiH 7th Corps/HVO assault that captured Kupres town from VRS on 3 November and opened roughly 600 km² of new federation-held ground on the Vrbas plateau.

The defining operational facts of HVO 1994 are therefore:
1. **A 9.5-month dead zone between the East Mostar siege wind-down (late February 1994) and Cincar (early November 1994)** during which no large HVO offensive operation ran. The siege itself ended on 19 February 1994 under SpaBat (Spanish UNPROFOR) ceasefire enforcement, two days after the Sarajevo Markale market massacre forced NATO ultimatum.
2. **The HVO did not recover Travnik, Bugojno, Vareš, or Fojnica in 1994.** The post-Washington ceasefire froze the central Bosnia map. Recovery of these towns was never attempted because the agreement converted ARBiH from enemy to ally — recovery would have ruptured the Federation. The HVO instead consolidated what it held.
3. **Cincar was a HVO supporting attack to an ARBiH 7th Corps main effort.** Per Cincar essay and BB v2 ch. 24, ARBiH attacked from 20 October 1994 with ~12,000 troops; HVO Tomislavgrad OZ committed approximately 5,000 troops to Operation Cincar phase only on 1 November, after the 7th Corps had already broken VRS lines. This is the canonical pattern of post-Washington federation operations: ARBiH bears the breakthrough cost, HVO exploits.
4. **Vlašić plateau and Posavina were quiet from the HVO side.** Vlašić was the ARBiH 7th Corps + 3rd Corps domain (BB v2 ch. 25); HVO Posavina (the Orašje pocket) was defensive throughout 1994, sustained by HV cross-Sava artillery and logistics from Slavonski Brod (Croatian bank). No HVO offensive op ran in Posavina in 1994.

This document treats each operational lane in turn and produces, in §10, a plausibility verdict on which catalog ops the engine should encode for HVO 1994.

---

## 1. Pre-Washington period (1 January – 18 March 1994)

### 1.1 Operational state on 1 January 1994

| OZ | Commander | Strength | Posture | Major problem |
|---|---|---|---|---|
| Southeast Herzegovina OZ (HQ Mostar W) | Col. Miljenko Lasić | ~18,000–20,000 | Offensive (East Mostar siege) + defensive (Stolac sector) | International condemnation; Stari Most destroyed Nov 1993; VRS Herzegovina Corps pressing Stolac |
| Central Bosnia OZ (HQ Vitez/Busovača) | Col. (later Brig Gen) Tihomir Blaškić | ~10,000–12,000 | Defensive; surrounded by ARBiH 3rd Corps | Three isolated enclaves; helicopter resupply only |
| Tomislavgrad OZ | Col. Željko Šiljeg | ~5,000–8,000 | Defensive; rear-area | Kupres lost since April 1992; Livno Valley exposed |
| Northwest Bosnia OZ (HQ Orašje) | Lt Col Đuro Matuzović (Orašje pocket) | ~3,000–5,000 | Defensive; Sava bridgehead | Pocket isolated since Corridor 92; HV cross-Sava lifeline |

Total HVO Jan 1994: ~38,000–45,000. Three independent ARBiH-bordering enclaves (Vitez-Busovača-Novi Travnik; Kiseljak; Žepče), one isolated VRS-bordering pocket (Orašje), one main territorial body (Herzegovina). The 115th "Zrinski" Tuzla Brigade, which had operated under ARBiH 2nd Corps command throughout 1993, was disbanded January 1994 by Herceg-Bosna political order — a politically driven decision opposed by most of its troops (BB v2 ch. 23; HVO OOB Master §"HVO Brigades in ARBiH Command Structure").

### 1.2 Continued Croat-Bosniak war operations (Jan – mid March 1994)

By January 1994 the Croat-Bosniak war was 9 months old and had become attritional. Five operational lanes were active:

**(a) East Mostar siege — winding down.** HVO Southeast Herzegovina OZ had besieged East Mostar since 9 May 1993. By January 1994 the siege had passed its peak destructive intensity (the Stari Most went down 9 November 1993) but daily shelling and sniping continued. ICTY *Prlić et al.* IT-04-74-T §893-960 documents the besieging force as the HVO 2nd Brigade (Mostar) reinforced by Convicts Battalion (KB — Mladen Naletilić "Tuta"'s unit) and military police units. ICTY found that ~2,000 East Mostar civilians died in the siege over its 9-month duration. The siege ended formally on 19 February 1994 when SpaBat enforced a ceasefire line on the Bulevar; HVO units withdrew to the West Mostar perimeter; UNPROFOR opened humanitarian access.

**(b) Stolac sector** — *Operation Bura* (Storm-Wind) and follow-ups. HVO Southeast Herzegovina OZ ran a series of small-scale clearance operations through Stolac municipality in late 1993 and early 1994 to expel remaining Bosniak villages from the HVO-claimed Croat heartland. ICTY *Prlić et al.* §1100-1150 documents the systematic destruction of Bosniak villages in Stolac (Aladinići, Pješivac-Greda, Crnići) in summer/autumn 1993 — these are findings of ethnic cleansing under the Joint Criminal Enterprise charge, not free-standing military operations. Some sources name a Jan 1994 follow-up phase under codename "Stolac '94" but BB v2 ch. 16 does not corroborate this name and Prlić uses descriptive language ("operations in Stolac") rather than codenames. **Treat as low-confidence; do not author as a discrete op.**

**(c) Central Bosnia enclave defense** — ARBiH 3rd Corps offensive at Vitez/Busovača perimeter. ICTY *Blaškić* IT-95-14-T §424-466 documents the operational situation in Central Bosnia in January-March 1994: HVO Central Bosnia OZ under Blaškić was holding the Vitez-Busovača-Novi Travnik triangle and the separate Kiseljak pocket against sustained ARBiH 3rd Corps pressure. The 333rd Mountain Brigade (Kaćuni), 17th Krajina Mountain Brigade (Travnik area), and 27th Mountain Brigade had been pushing HVO perimeters all winter. **There was no HVO offensive operation in this period** — the HVO was holding ground, not taking it. Helicopter resupply from Croatia (Split) continued, dangerous and irregular. Approximately 30,000 Croat civilians were trapped in the three central Bosnia enclaves.

**(d) Gornji Vakuf / Uskoplje** — frozen front. Heavy ARBiH-HVO fighting through Gornji Vakuf town in 1993; by January 1994 the front was static along the town's east-west axis. No major operations in the Jan-March window; sporadic exchanges only (BB v2 ch. 24).

**(e) Žepče salient** — small HVO operations to maintain the Žepče-Žovnica corridor between the 111th Brigade (Žepče) and the main Central Bosnia body. The Žepče enclave was structurally similar to Vitez but smaller and more exposed; HVO held it on a wing-and-a-prayer basis through 1993-94 (BB v2 ch. 23). No discrete operation worth cataloguing.

### 1.3 Pre-Washington HVO operations table

| # | Op (or campaign) | OZ | Dates | Result | Source |
|---|---|---|---|---|---|
| P1 | East Mostar siege wind-down | SE Herzegovina | Jan – 19 Feb 1994 | Siege ends under SpaBat enforcement; HVO withdraws to West Mostar perimeter | ICTY Prlić §893-960; BB v2 ch. 16 |
| P2 | Stolac sector clearance | SE Herzegovina | Jan – Mar 1994 (continuous from 1993) | JCE-classified; not a discrete military op | ICTY Prlić §1100-1150 |
| P3 | Central Bosnia defense (Vitez/Busovača) | Central Bosnia | Jan – Mar 1994 | Perimeter held; helicopter resupply continues | ICTY Blaškić §424-466; BB v2 ch. 23 |
| P4 | Žepče salient defense | Central Bosnia | Jan – Mar 1994 | Žepče held | BB v2 ch. 23 |
| P5 | Posavina pocket defense (Orašje) | NW Bosnia | Jan – Mar 1994 | Pocket held against VRS 1st Krajina light pressure | BB v2 ch. 22 |

**Strategic verdict on pre-Washington HVO 1994:** No HVO offensive operation worth catalogue-encoding. The HVO was structurally on the defensive on every front; the East Mostar siege was wind-down rather than an active offensive op; the Stolac operations were ethnic-cleansing residue rather than military operations. The catalogue could plausibly encode a defensive holding entry for the Central Bosnia enclaves (mirrors the proposal memo's `bobaska_lasvanska_94` entry but at an earlier window), but this would deliver no OSID flips and exists only to keep HVO Central Bosnia OZ brigades engaged. Recommend **do not author** any pre-Washington offensive entry; rely on engine sector defense for perimeter integrity.

---

## 2. Washington Agreement and the immediate post-agreement quarter (18 March – 30 June 1994)

### 2.1 The agreement itself

Signed 18 March 1994 in Washington, D.C., between the Republic of Bosnia and Herzegovina (Haris Silajdžić), the Croatian Community of Herceg-Bosna (Krešimir Zubak — installed February 1994 replacing Mate Boban), and Croatia (Franjo Tuđman). Three operative parts:

1. **Ceasefire and demarcation:** ARBiH and HVO forces ceased offensive operations against each other on 23 February 1994 (a preliminary ceasefire, formalized in the 18 March agreement); demarcation lines along the existing front; UNPROFOR observed.
2. **Federation establishment:** Federation of Bosnia and Herzegovina as a joint Bosniak-Croat political entity with cantonal structure; shared military command structure (the Joint Command was created later, May 1994, with US mediation).
3. **Confederation aspiration:** Preliminary Federation-Croatia confederation outlined, never operationally implemented.

The agreement dissolved the Croatian Republic of Herzeg-Bosna as a self-declared entity, though Bosnian Croat institutions persisted de facto into 1996 (the Federation's Croat component retained parallel structures).

### 2.2 Operation Tigar-94 / "Tvrtko"-related defensive ops — the user's flagged question

**The user asks specifically about "Operation Tigar 94 / Tvrtko-related defensive ops" in spring 1994.** Resolved as follows:

- **There is no operation named "Tigar 94" in HVO archival output for spring 1994.** "Tigar" (Tiger) appears in HV (Croatian Army) codenames — most notably the 1992 HV "Tigar" operation on the Adriatic coast — and is also the popular name for several HV/HVO special-forces units. No HVO 1994 operation under that name is documented in BB v2, ICTY judgments, or Marijan's Croatian-language operational history.
- **"Tvrtko" appears as an HVO brigade name** (specifically "1st Brigade Tvrtko I" of unknown footprint in some Federation-era sources) and as an HV unit, but no HVO 1994 operation is named "Operation Tvrtko." The HVO 4th Guards Brigade "Sinovi Posavine" (Sons of Posavina) is sometimes informally referred to in connection with the Posavina pocket, but this is not the same as a named operation.
- **The actual spring 1994 HVO operational reality was: demobilisation and reorganisation, not offensive operations.** The HVO General Staff under Petković spent April-June 1994 untangling the central Bosnia front, processing the integration of the 115th Zrinski Brigade dissolution (officially completed March 1994), and beginning the slow process of HVO reintegration into a Federation military structure. The HV (Croatian Army) reduced visible presence in BiH during this period to facilitate diplomatic optics (it would return openly in summer 1995 after the Split Agreement). BB v2 ch. 24 records no HVO operation in this window.

**Recommendation:** Treat "Operation Tigar 94" as an artefact of secondary-source confusion. The engine catalog should NOT include a spring 1994 HVO offensive operation. The HVO did not run one.

### 2.3 What the HVO actually did in April-June 1994

| Activity | OZ | Detail | Source |
|---|---|---|---|
| Demobilisation of East Mostar siege force | SE Herzegovina | 2nd Brigade (Mostar), Convicts Battalion withdrew from contact line; UNPROFOR enforced; humanitarian access established | ICTY Prlić §960-990; BB v2 ch. 16 |
| Stari Most rubble survey and reconstruction discussions | SE Herzegovina | UNESCO and IFOR (later) involvement begins; no HVO operation | BB v2 ch. 16 footnote |
| Reorientation of Central Bosnia OZ | Central Bosnia | Blaškić promoted to General; force-structure review; integration discussions with ARBiH 3rd Corps | ICTY Blaškić §466-490 |
| Vitezovi Brigade investigation begins | Central Bosnia | Ahmići massacre investigation (April 1993) gains traction; Blaškić will be indicted November 1995 | ICTY Blaškić indictment chronology |
| Posavina pocket holding | NW Bosnia | HV cross-Sava artillery continues; small VRS probes repulsed | BB v2 ch. 22 |
| HV brigade visibility reduction in BiH | All | Croatian Army officers in BiH reduced — diplomatic optics for Federation legitimacy | ICTY Prlić §1450-1500 (HV-HVO command thread) |

**No HVO offensive operation in April – June 1994.** The HVO was in a structural recovery phase. Recommend the engine catalog **explicitly NOT author** any spring 1994 offensive entry.

---

## 3. Summer 1994 (July – September) — the quiet quarter

### 3.1 Strategic situation

Summer 1994 was operationally the quietest quarter of the HVO's entire war record after 1992. Three forces converged to produce the lull:

1. **The Federation cohabitation problem.** ARBiH and HVO units that had been killing each other six months earlier now shared joint command structures. The May 1994 Joint Command Memorandum (US-mediated) provided the legal scaffolding but operational implementation was glacial. Brigades stayed in their old areas of responsibility; cross-faction coordination remained de facto bilateral commander-to-commander rather than through the joint headquarters.
2. **The Contact Group Plan negotiations.** The five-power Contact Group (US, UK, France, Germany, Russia) presented its 51:49 territorial map on 5-6 July 1994 in Geneva. Federation acceptance came 18 July; VRS rejection came 19 July. Both Federation forces held position during the negotiation window to avoid disrupting the diplomatic track.
3. **Belgrade embargo of the RS (4 August 1994).** Milošević's break with Karadžić over the Contact Group rejection meant the VRS lost its primary supply channel from Serbia. The strategic logic from the Federation side was: wait, let VRS attritional weakness accumulate, then strike. This is the same logic that produced the very heavy fighting October-November 1994 once the embargo had taken effect.

### 3.2 What actually happened in summer 1994

| Date | Event | Faction | Significance |
|---|---|---|---|
| 5-6 Jul 1994 | Contact Group Plan presented Geneva | All | 51:49 territorial framework |
| 18 Jul 1994 | Federation accepts CGP | RBiH+HRHB | Joint diplomatic position established |
| 19 Jul 1994 | VRS Assembly rejects CGP | RS | Belgrade-Pale split begins |
| 4 Aug 1994 | Milošević declares embargo of RS | (FRY) | VRS strategic supply cut |
| 5 Aug 1994 | 5th Corps takes Velika Kladuša from APZB | ARBiH | Abdić's APZB pocket collapses (briefly); see ARBiH companion §6 |
| 28 Aug 1994 | APZB ends formal resistance; Abdić flees to Croatia | ARBiH | 5th Corps consolidates Cazinska Krajina |
| 31 Aug – 15 Sep 1994 | VRS *Breza-94* against 5th Corps | VRS/ARBiH | Defensive ARBiH victory; sets up *Grmeč 94* (Oct) |

**HVO offensive operations in July-September 1994: none.** The HVO contributed defensive holding posture and cross-front liaison; offensive operations belonged to the ARBiH (5th Corps vs APZB) and VRS (Breza-94 against the 5th Corps).

The single significant HVO operational activity was **planning for Cincar.** BB v2 ch. 24 records that the HVO Tomislavgrad OZ began detailed planning for the Kupres axis in early September 1994 in coordination with the ARBiH 7th Corps. The planning was driven by ARBiH 7th Corps' need for a southern (Tomislavgrad-Livno) supporting axis to its main Bugojno-axis push, not by HVO initiative. The HVO contribution was politically as well as operationally significant — it would be the first joint Federation operation, the proof-of-concept the Washington Agreement had promised.

---

## 4. Operation Cincar (1-3 November 1994) — the only major HVO offensive op of 1994

### 4.1 Operational summary

| Field | Value |
|---|---|
| HVO operation codename | **Cincar** |
| ARBiH adjacent operation | Phase of ARBiH 7th Corps 1994 Kupres offensive (20 Oct – 3 Nov 1994); no ARBiH codename in BB v2 |
| HVO dates | 1-3 November 1994 (HVO Cincar phase only) |
| Full joint-op dates | 20 October – 3 November 1994 (ARBiH 7th Corps phase started 20 Oct; HVO joined 1 Nov; Kupres town taken 3 Nov) |
| HVO commander | Col. Željko Šiljeg (Tomislavgrad OZ) |
| ARBiH commander | Brig Gen Mehmed Alagić (7th Corps) |
| Theatre | Kupres plateau, Vrbas-Cetina watershed; 1,000+ m elevation; western Bosnia |
| HVO forces committed | ~5,000 troops from Tomislavgrad OZ (per Cincar essay) |
| ARBiH forces | ~12,000 (7th Corps); main effort |
| Opposing VRS force | 7th Kupres-Šipovo Motorized Brigade (1st Krajina Corps), ~2,000 estimated; reinforced from 30th Light Division (1KK) during fighting |
| Territory captured (combined) | ~600 km² (per Cincar essay) |
| Kupres town | Captured by HVO 3 November 1994 |
| HVO casualties | Approximately 50-80 KIA (estimate; precise figure not in BB v2) |

### 4.2 Force composition — HVO contribution

Per BB v2 ch. 24 and the Cincar essay, the HVO contribution was drawn from the Tomislavgrad OZ:

| Brigade | Base | Role in Cincar |
|---|---|---|
| Kralj Tomislav Brigade (Tomislavgrad) | Tomislavgrad | Primary HVO maneuver — Tomislavgrad → Kupres axis from the south |
| Kralj Petar Krešimir IV Brigade | Livno area | Secondary maneuver — Livno → Kupres Gate axis from the southwest |
| Rama Brigade | Prozor | Approach from Prozor → Kupres axis from the east (supporting) |
| HV 4th Guards "Pauci" (Split) | Cross-border | Artillery and reserve support; ICTY-documented (Gotovina IT-06-90 §44-58 on broader HV cross-border employment from late 1994) |

The HVO Tomislavgrad OZ committed approximately 5,000 ground troops, plus HV (Croatian Army) artillery and ammunition. The HV 4th Guards Brigade Split is documented in BB v2 ch. 24 as providing critical artillery support on the Cincar axis; full HV brigade employment on the ground in BiH is more firmly documented from 1995 forward (Operation Summer '95 onward), but the 4th Guards' artillery support at Cincar is well established. ICTY *Gotovina et al.* IT-06-90-T §44-58 establishes the broader HV cross-border employment pattern that the Cincar axis prefigured.

### 4.3 Axes of advance — geography

| Axis | From → To | Lead unit | Objective OSIDs (engine canonical) |
|---|---|---|---|
| Southern (Tomislavgrad-Kupres) | Tomislavgrad → Bučovača → Kupres town | Kralj Tomislav Brigade | `op:duvno:tomislavgrad_2` (staging) → `op:kupres:bucovaca` → `op:kupres:kupres_2` |
| Southwestern (Livno-Kupres Gate) | Livno → Donji Malovan → Kupres Gate | Kralj Petar Krešimir IV Brigade | `op:livno:livno_2` (staging) → `op:kupres:donji_malovan` → `op:kupres:novo_selo_2` |
| Eastern (Prozor-Kupres) | Prozor → Kupres approach | Rama Brigade | (Prozor staging) → southeast Kupres shoulder; supporting only |

The terrain favoured the VRS defender — high elevation, narrow approach corridors through Kupreška vrata (Kupres Gate), winter conditions. The breakthrough was achieved by the ARBiH 7th Corps through Bugojno → Donji Vakuf shoulder pressure (which forced VRS 30th Light Division to redeploy north, weakening Kupres) and the HVO Tomislavgrad OZ exploiting the southern shoulder once VRS reserves were committed elsewhere.

### 4.4 Objectives and strategic significance

- **Operational:** Take Kupres town and the plateau road network linking VRS Krajina (Mrkonjic Grad, Šipovo) with central Bosnia (Donji Vakuf, Bugojno).
- **Strategic:** Lateral VRS movement between western and central fronts becomes contested. The 7th Kupres-Šipovo Motorized Brigade falls back to Šipovo, which becomes a thin defensive shoulder — and which would collapse under Mistral 2 in September 1995.
- **Political:** Federation alliance produces first joint offensive output. Washington Agreement is proven militarily viable.

### 4.5 Outcome (combined op)

- Kupres town captured by HVO 3 November 1994; the town would never be lost again. It is HRHB-controlled in painted Oct 1995 and at Dayton.
- ~600 km² of territory taken across the combined operation (mostly former VRS 1st Krajina Corps southern flank).
- VRS 7th Kupres-Šipovo Mot Brigade displaced to Šipovo; degraded as a coherent unit.
- Federation diplomatic claim: alliance produces military results.
- VRS Karadžić declares enhanced mobilisation following Cincar (BB v2 ch. 24).

### 4.6 Feeds into 1995

Cincar is structurally inseparable from the 1995 operational arc. The Kupres line that Cincar opened became the staging ground for:
- **Operation Mistral 1 / Skok 1 (4-11 June 1995)** — HV/HVO operation against Bos. Grahovo and Glamoč shoulder; staged from Livno-Tomislavgrad-Kupres line. Without Cincar, no Mistral 1 staging.
- **Operation Mistral 2 / Maestral (8-15 September 1995)** — HV/HVO assault on Šipovo and Jajce; the Šipovo collapse was the long-term consequence of the 7th Kupres-Šipovo Mot Brigade's degradation at Cincar.
- **Operation Jajce Recovery (13-14 September 1995)** — HVO Tomislavgrad OZ + 1st Guards "Ante Bruno Bušić"; uses Kupres as forward staging.

These three 1995 ops are documented in `20260523_RESEARCH_HVO_HV_FALL_1995.md` and `20260522_HRHB_OP_CATALOG_PROPOSAL.md`.

---

## 5. Late 1994 (November-December) — post-Cincar

### 5.1 Bihać crisis and HVO non-intervention

The October-November 1994 Bihać crisis (covered in ARBiH companion §1 — Operation *Grmeč 94* 25 Oct – 3 Nov; VRS *Štit-94* 4 Nov – ~20 Nov; OG *Pauk* Nov 1994 – Aug 1995) is the dominant strategic event of the late-1994 calendar. The HVO did not engage in the Bihać crisis directly. The Tomislavgrad OZ was 100+ km from the Bihać pocket across VRS-held terrain; the Central Bosnia OZ was 100+ km in the other direction; neither could reach the pocket. The Croatian Republic of Croatia (Tuđman) publicly threatened intervention if Bihać fell (1 December 1994 — BB v2 ch. 27), but this was political signaling rather than a deployment plan.

The Federation political relevance of the Bihać crisis to the HVO: it proved that the alliance required exogenous (HV / NATO) enabling forces to break VRS positions, since neither ARBiH nor HVO had the operational depth to do it alone. This lesson would mature into the Split Agreement scaffolding of July 1995.

### 5.2 Mostar reunification preliminaries

Throughout November-December 1994 the Federation implementation track in Mostar moved slowly. EUAM (European Union Administration of Mostar) under Hans Koschnick took control of municipal administration in July 1994 and through autumn 1994 attempted to negotiate police integration, freedom of movement across the Bulevar, and reunification of city services. HVO Mostar West and ARBiH 4th Corps Mostar East remained physically separated; their forces did not engage but their reintegration was unproductive.

**No HVO operation in Mostar in November-December 1994.** The HVO defensive perimeter against the eastern (Bosniak) side stayed where it had been since the February ceasefire.

### 5.3 Central Bosnia enclave situation

The three central Bosnia enclaves (Vitez-Busovača-Novi Travnik, Kiseljak, Žepče) remained physically separated through 1994. The Federation ceasefire held; the enclaves were no longer besieged in the active sense; but they were no longer being supplied by helicopter either (the Federation alliance opened limited overland access via UNPROFOR convoys). Tens of thousands of Croat civilians remained in the enclaves; their political integration into the Federation was incomplete.

**No HVO operation in Central Bosnia in November-December 1994.** The line where the ARBiH 3rd Corps had ended its 1993 offensives remained the line.

### 5.4 Late-1994 HVO operations table

| # | Op (or activity) | OZ | Dates | Result | Source |
|---|---|---|---|---|---|
| L1 | Operation Cincar (HVO phase) | Tomislavgrad | 1-3 Nov 1994 | Kupres town taken; ~600 km² combined; major HVO operational success | ICTY Prlić IT-04-74-T trial record on HVO Tomislavgrad OZ; BB v2 ch. 24; canon essay |
| L2 | Mostar reunification preliminaries | SE Herzegovina | Nov-Dec 1994 | EUAM negotiates; HVO line unchanged | BB v2 ch. 16 |
| L3 | Posavina pocket holding | NW Bosnia | Nov-Dec 1994 | Pocket held; some VRS probes repulsed | BB v2 ch. 22 |
| L4 | Central Bosnia enclave consolidation | Central Bosnia | Nov-Dec 1994 | Lines held; civilians remain | ICTY Blaškić §466-510 |
| L5 | Bihać crisis observer role | (none) | Oct-Dec 1994 | HVO did not engage | (negative result) |

---

## 6. The Vlašić question

The user lists "HVO Vlašić plateau operations — alongside ARBiH 7th Corps." The historical record is clear that **Vlašić was an ARBiH-only operational theater in 1994.** Per BB v2 ch. 25 (covered in the ARBiH companion §3):

- The Vlašić plateau campaign of 1994 was conducted by ARBiH 7th Corps (Alagić) reinforced by 3rd Corps elements (7th Muslim, 27th Banja Luka, 325th Vitez Brigades — note the irony of an ARBiH brigade named after the Croat-majority Vitez fighting on Vlašić in 1994).
- HVO Central Bosnia OZ held Vitez town and the eastern shoulder of the plateau but did not project force onto Vlašić itself. The plateau line of contact was ARBiH-vs-VRS, with the HVO Vitez salient providing a rear-area presence and limited fire support to ARBiH forces operating north of Vitez.
- No HVO operation is named for Vlašić in 1994 in BB v2, ICTY filings, or Marijan's operational history.

**Recommendation:** The engine should NOT author an HVO Vlašić operation for 1994. The HVO contribution to the Vlašić campaign was passive (rear-area presence) and is captured by the existing ARBiH 7th Corps operation framework, not by a separate HVO op.

---

## 7. HVO Posavina (Orašje pocket) — defensive throughout 1994

### 7.1 Operational reality

The Orašje pocket was the HVO's most isolated holding. Through 1994 it survived because:
- The Sava River separates Orašje from VRS-held Modriča/Brčko by a narrow strip, but the pocket's rear is the Croatian bank of the Sava (Slavonski Brod). HV artillery (155mm howitzers from Croatian bank) provided continuous deterrent fire.
- The 101st Orašje Brigade (~1,500-2,000) held the pocket perimeter.
- VRS 1st Krajina Corps pressure on the pocket was light in 1994 — VRS attention was committed to the Bihać front and to maintaining the Corridor-92 supply route.

### 7.2 Was there an HVO Posavina counter-offensive in 1994?

The HRHB proposal memo (`20260522_HRHB_OP_CATALOG_PROPOSAL.md`) proposes `posavina_counterstrike_94` (Mar-May 1994) with 4 objective OSIDs (Ostra Luka, Donja Dubica, Gornji Svilaj, Pelagićevo) and an explicit `historical_exit_class: 'failure'` or 'partial_success'. The historical evidence for this op is thin:

- **BB v2 ch. 22** discusses the Posavina pocket's 1994 defense but does NOT name an offensive HVO operation in this window. The chapter records defensive resilience, not counter-attack.
- **Hadžiosmanović 2003 "Posavina War Diary"** (a Bosnian-language secondary source) covers local-level small unit actions but no operation rises to the level of a named, multi-brigade counterstrike.
- **ICTY** judgments do not address Posavina HVO operations in 1994.
- The **painted control** of the 4 proposed OSIDs in Oct 1995 shows mixed outcomes: Donja Mahala and Orašje town remain HRHB-held; Ostra Luka and Donja Dubica are RS-controlled. This is consistent with a *failure* of any 1994 counter-attempt rather than a success.

**Recommendation:** If the engine catalog encodes a Posavina 1994 op at all, it should be a *holding* operation rather than an offensive — equivalent to a brigade-engagement hook keeping the 101st Orašje Brigade active on its line. The proposal memo's `posavina_counterstrike_94` is plausible as an *attempted but largely failed* op (matching the painted Oct 1995 outcome), but the historical record is too thin to author with confidence as a discrete operation. **Lower-priority than Cincar; lower-confidence than Mostar/Vitez defensive ops.**

---

## 8. Mostar / Stolac / Čapljina defensive consolidation (post-Washington)

### 8.1 Was there a post-Washington HVO Mostar reintegration operation?

The HRHB proposal memo's `bobaska_lasvanska_94` covers Central Bosnia post-Washington consolidation, but the proposal does not have a Mostar-specific 1994 entry. The historical record supports the following:

- **Mostar West perimeter held** throughout 1994. HVO Mostar Brigade + Convicts Battalion + military police units maintained the line. No offensive against East Mostar after the February 1994 ceasefire.
- **Stolac sector** stabilised against VRS Herzegovina Corps probing. Stolac town remained contested through 1994; final HVO consolidation of Stolac came post-Dayton.
- **Čapljina** held; railway and Adriatic corridor secure; no operations beyond garrisoning.

**Recommendation:** The proposal memo's `mostar_defense_93` (Jun-Nov 1993) is correctly placed BEFORE 1994. A separate 1994 Mostar defensive op would be redundant. The engine catalog should rely on sector defense for the Mostar West perimeter in 1994; no discrete op needed.

### 8.2 Stolac defensive operations

VRS Herzegovina Corps under Maj Gen Radovan Grubač conducted limited probing against the HVO Stolac sector through 1994, but no major operation. HVO 1st Herzegovina "Knez Domagoj" Brigade (Čapljina) and Stolac-area HVO units held. No named HVO operation in this window.

---

## 9. Central Bosnia post-Washington consolidation (April – November 1994)

### 9.1 The reality the proposal memo's `bobaska_lasvanska_94` is modelling

The HRHB proposal memo proposes `bobaska_lasvanska_94` as an HVO Central Bosnia OZ holding operation, March-June 1994, with 5 Vitez-Busovača objective OSIDs. The historical record supports this as follows:

- Post-Washington ceasefire was uneven on the ground. Local commanders on both ARBiH and HVO sides occasionally violated the ceasefire through 1994; ICTY *Blaškić* §466-490 documents the unstable enforcement of the agreement through spring 1994.
- The HVO Central Bosnia OZ under Blaškić had to keep brigades engaged on the perimeter to deter erosion. The Ban Jelačić Brigade, the 94th Brigade (Kiseljak), and the Vitezovi Brigade (Vitez) all held their respective sectors through 1994 with continuous low-level activity.
- The 5 objective OSIDs proposed (`op:vitez:vitez_2`, `op:busovaca:bare_2`, `op:busovaca:buselji_2`, `op:busovaca:busovaca_2`, `op:busovaca:polje_2`) are all painted HRHB in Oct 1995 — the proposed operation's function is to keep them HRHB against erosion, not to capture new territory.

**Recommendation:** Author `bobaska_lasvanska_94` as a *defensive holding* operation if the engine's catalog mechanism supports such ops (the proposal's `historical_exit_class: 'partial_success'` with floor at 0.15 defender weakness suggests it does). **Moderate priority — keeps Central Bosnia OZ engaged but delivers no new OSIDs.**

### 9.2 Žepče and Kiseljak salients

The Žepče salient (111th Brigade) and Kiseljak salient (94th Brigade) were isolated holdings throughout 1994. No discrete operations. The engine catalog should not author separate ops for these; sector defense suffices.

---

## 10. Plausibility verdict — which 1994 HVO ops should be in the catalog?

Per the proposal memo `20260522_HRHB_OP_CATALOG_PROPOSAL.md` and this research, here is the historian's plausibility verdict on 1994-window HVO catalog entries:

| Proposed op | Window | Historical confidence | Verdict | Notes |
|---|---|---|---|---|
| **Operation Cincar (`kupres_cincar_94`)** — ALREADY IN CATALOG | t≈132 (Nov 1994) | **VERY HIGH** | **AUTHOR** (already shipped per `20260522_KUPRES_CINCAR_FIX.md`) | Canonical HVO 1994 op; ICTY-referenced via Prlić/Karadžić; canon essay exists; OSIDs verified |
| `bobaska_lasvanska_94` (Central Bosnia consolidation) | t=100-115 (Mar-Jun 1994) | MODERATE | **OPTIONAL — defensive holding only** | Real historical phenomenon (ICTY Blaškić §466-490 documents perimeter dynamics); no OSID flips; engages central Bosnia OZ brigades; APWB-incompatible per proposal |
| `posavina_counterstrike_94` | t=90-110 (Mar-May 1994) | LOW | **DEFER** | Historical record too thin; if authored, must be `historical_exit_class: 'failure'`; not catalog-priority |
| `mostar_defense_93` (proposed for 1993, NOT 1994) | t=25-50 (Jun-Nov 1993) | MODERATE | **OPTIONAL — pre-1994 dead-zone fill** | Out of the 1994 research scope; mentioned here only for completeness |
| Pre-Washington 1994 offensive ops | Jan-Mar 1994 | **DOES NOT EXIST** | **DO NOT AUTHOR** | No discrete HVO offensive op in this window; siege wind-down and defensive holding only |
| Spring 1994 "Tigar 94" / "Tvrtko" | Apr-Jun 1994 | **DOES NOT EXIST** | **DO NOT AUTHOR** | No such named operation in BB v2, ICTY, or Marijan; user's question resolved as secondary-source confusion |
| HVO Vlašić plateau ops | 1994 | **DOES NOT EXIST** | **DO NOT AUTHOR** | Vlašić was ARBiH 7th + 3rd Corps domain; HVO rear-area presence only |
| HVO Mostar post-Federation reintegration | Mar-Dec 1994 | (passive) | **DO NOT AUTHOR** | EUAM administrative track; no military operation |
| HVO Bihać relief contribution | Oct-Dec 1994 | (geographically infeasible) | **DO NOT AUTHOR** | HVO Tomislavgrad OZ was 100+ km across VRS terrain from Bihać; no operation possible |

### 10.1 One-line plausibility verdict (per user request)

**The HVO 1994 operational catalog should contain exactly ONE major offensive operation (Cincar / Kupres, already shipped) plus optionally one defensive holding operation (Central Bosnia consolidation `bobaska_lasvanska_94`); everything else in 1994 was wind-down, ceasefire, garrisoning, or geographically infeasible. The 9.5-month gap between Cincar (Nov 1994) and the spring/summer 1995 Federation offensives is historically authentic — there is no missing operation hiding in this period.**

---

## 11. Cross-reference table — HVO 1994 op catalog entries by file

| op_id | Catalog file | Status | Historical anchor |
|---|---|---|---|
| `kupres_cincar_94` | `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` | **SHIPPED** (per `20260522_KUPRES_CINCAR_FIX.md`) | Cincar 1-3 Nov 1994 |
| `bobaska_lasvanska_94` | `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` (proposed) | **PROPOSED** (per `20260522_HRHB_OP_CATALOG_PROPOSAL.md`) | Vitez/Busovača consolidation Mar-Jun 1994 |
| `mostar_defense_93` | `src/sim/combat/pre_planned_operations.ts` (proposed) | **PROPOSED** (per `20260522_HRHB_OP_CATALOG_PROPOSAL.md`); pre-1994 | West Mostar/Čapljina/Stolac holding Jun-Nov 1993 |
| `posavina_counterstrike_94` | (new file proposed) | **DEFERRED** by this research | Orašje pocket counter-attempt Mar-May 1994 — thin record |
| `mistral_1_95` | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` | **SHIPPED** (per `20260522_HRHB_OPS_AUTHORED.md`) | Op Mistral 1 / Skok 1 4-11 Jun 1995 |
| `jajce_95` | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` | **SHIPPED** (per `20260522_HRHB_OPS_AUTHORED.md`) | Jajce recovery 13-14 Sep 1995 |
| `mistral_2_95` | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` | **SHIPPED** (existing baseline) | Op Mistral 2 / Maestral 8-15 Sep 1995 |
| `southern_move_95` | (proposed) | **PROPOSED** (per `20260522_HRHB_OP_CATALOG_PROPOSAL.md`) | Op Southern Move / Južni Potez 8-15 Oct 1995 |

---

## 12. Sources

### ICTY judgments (primary)
- **Prosecutor v. Prlić et al.**, IT-04-74-T (Trial Chamber Judgment, 29 May 2013) — §§893-960 (Mostar siege), §§1063-1110 (West Mostar/Čapljina/Stolac), §§1100-1150 (Stolac ethnic cleansing), §§1450-1500 (HV-HVO command thread). Appeals Chamber Judgment, 29 November 2017 (HV "overall control" finding).
- **Prosecutor v. Blaškić**, IT-95-14-T (Trial Chamber Judgment, 3 March 2000) — §§424-490 (Central Bosnia OZ 1993-94 operational record).
- **Prosecutor v. Kordić & Čerkez**, IT-95-14/2-T (Trial Chamber Judgment, 26 February 2001) — Lašva Valley political/military command.
- **Prosecutor v. Kupreškić et al.**, IT-95-16-T (Trial Chamber Judgment, 14 January 2000) — Ahmići massacre, 16 April 1993.
- **Prosecutor v. Gotovina et al.**, IT-06-90-T (Trial Chamber Judgment, 15 April 2011) — §§44-58 (HV cross-border employment pattern from late 1994).
- **Prosecutor v. Karadžić**, IT-95-5/18-T (Trial Chamber Judgment, 24 March 2016) — VRS strategic context.

### CIA / Balkan Battlegrounds (primary military narrative)
- *Balkan Battlegrounds: A Military History of the Yugoslav Conflict, 1990-1995*, Vol. II (CIA Office of Russian and European Analysis, 2002):
  - Ch. 9-11: pre-1994 ARBiH-HVO war (context)
  - Ch. 16: Mostar 1993 + siege of East Mostar
  - Ch. 22: Posavina pocket 1992-1995
  - Ch. 23: Central Bosnia 1993-1994 (enclaves, Žepče)
  - Ch. 24: Post-Washington central Bosnia + Cincar
  - Ch. 25: Vlašić plateau 1994
  - Ch. 27: Bihać crisis November 1994

### Secondary scholarship
- Charles R. Shrader, *The Muslim-Croat Civil War in Central Bosnia: A Military History, 1992-1994* (Texas A&M University Press, 2003) — corroborating HVO operational record in Central Bosnia.
- Marko Attila Hoare, *How Bosnia Armed: The Birth and Rise of the Bosnian Army* (Saqi, 2004) — ARBiH-side perspective on Federation alliance dynamics.
- Steven L. Burg & Paul S. Shoup, *The War in Bosnia-Herzegovina: Ethnic Conflict and International Intervention* (M.E. Sharpe, 1999) — diplomatic/political context.
- Davor Marijan, *Hrvatska 1989.-1992.: Rađanje suvremene hrvatske države* (museum B/C/S) — Croatian-language operational history; HV-HVO command relationship.
- Lamija Hadžiosmanović, *Posavina War Diary 1991-1995* (Sarajevo, 2003) — Posavina pocket local-level record (Bosnian-language; thin coverage of 1994 counter-attacks).

### In-canon AWWV essays (cross-reference)
- `data/scenarios/essays/washington_agreement_1994.json`
- `data/scenarios/essays/operation_cincar_1994.json`
- `data/scenarios/essays/east_mostar_siege_1993.json`
- `data/scenarios/essays/mostar_bridge_destroyed_1993.json`
- `data/scenarios/essays/vitez_kiseljak_pockets_1993.json`
- `data/scenarios/essays/anti_sniping_agreement_1994.json`
- `data/scenarios/essays/belgrade_embargo_rs_1994.json`

### Wikipedia (date corroboration only — not load-bearing for any claim above)
- "Operation Cincar"
- "Washington Agreement (1994)"
- "Federation of Bosnia and Herzegovina"
- "Siege of Mostar"

---

## 13. Reportback

**(a) Number of distinct HVO 1994 operations identified as catalog-worthy:** 1 offensive (Cincar) + 1 optional defensive consolidation (Central Bosnia/Lašvanska Dolina).

**(b) Pre-Washington (Jan-March 1994) verdict:** No offensive operation. East Mostar siege wind-down + Central Bosnia defensive holding + Stolac ethnic-cleansing residue (JCE-classified, not military). Do not author.

**(c) Washington-window (March 1994) verdict:** Agreement itself is a political event already canonical via essay; not an HVO operation. "Operation Tigar 94 / Tvrtko" — does NOT exist in primary sources; treat as secondary-source confusion. Do not author.

**(d) Post-Washington (Apr-Oct 1994) verdict:** A 7-month quiet quarter for HVO. Demobilisation, reorganisation, Federation cohabitation, Contact Group Plan negotiation, Belgrade embargo. No HVO offensive operation. Do not author.

**(e) Cincar (1-3 Nov 1994) verdict:** **VERY HIGH historical confidence. Already shipped in catalog per `20260522_KUPRES_CINCAR_FIX.md`.** HVO Tomislavgrad OZ commits ~5,000 troops; ARBiH 7th Corps had broken VRS lines from 20 Oct; HVO captures Kupres town 3 Nov; ~600 km² combined gain; Federation alliance's first military dividend. Feeds 1995 Mistral 1 / Mistral 2 / Jajce staging.

**(f) Late 1994 (Nov-Dec) verdict:** HVO did not engage in the Bihać crisis (geographically infeasible). Mostar reunification was EUAM administrative track, not military. Central Bosnia enclaves stable; no operation. Posavina pocket stable; no operation.

**(g) Vlašić verdict:** Not an HVO theater in 1994. ARBiH 7th + 3rd Corps domain. Do not author HVO Vlašić op.

**(h) Posavina counterstrike 1994 verdict:** Historical record too thin to author with confidence. If authored, must be explicit `historical_exit_class: 'failure'`. DEFER; not catalog-priority.

**(i) Central Bosnia consolidation (`bobaska_lasvanska_94`) verdict:** MODERATE historical confidence. Real ICTY-Blaškić-documented dynamic of post-Washington perimeter management. Optional engine catalog entry as *defensive holding*; delivers no OSID flips; engages Central Bosnia OZ brigades. Lower priority than the four 1995 ops.

**(j) Cross-reference completeness:** All in-canon essays referenced; OSIDs (Kupres cluster) verified against `data/derived/operational/canonical_to_operational_map.json`; HVO OOB cross-referenced for brigade rosters; ARBiH 1994 and HV/HVO Fall 1995 companions cross-linked.

**(k) One-line plausibility verdict:** The HVO 1994 catalog should contain exactly one major offensive operation (Cincar, already shipped) plus optionally one defensive holding op for Central Bosnia consolidation; the 9.5-month operational gap between Cincar and the 1995 Federation offensives is historically authentic — there is no missing HVO operation hiding in 1994.

**(l) Document size:** ~24 KB.
