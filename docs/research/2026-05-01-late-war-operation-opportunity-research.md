# Late-War Operation Opportunity Research

**Date:** 2026-05-01
**Scope:** Major operation-scale campaigns in Bosnia and linked Croatia/Bosnia theaters from the Washington Agreement aftermath through October 1995.
**Purpose:** Source catalog for future operation design docs. This is research and product framing, not an implementation plan and not approval for forced scripted territorial outcomes.

## Executive Direction

AWWV should treat late-war operations as **historical opportunities**, not calendar-forced scripts.

The player is not a brigade commander. Per canon and current architecture, the player influences army/corps command, political constraints, logistics, diplomacy, and operation authorization. The engine should surface historically grounded windows such as "5th Corps can exploit after the Bihac pocket stabilizes" or "VRS Drina Corps can propose the Srebrenica operation after safe-area pressure and local force prerequisites align." The player/bot may approve, delay, redirect, under-resource, or decline. The simulation then resolves the result through normal command, staging, supply, combat, morale, commander, and AAR systems.

Late-war target paints should evaluate date-specific plausibility, but they should not become a demand that every historical operation fires and succeeds. A healthy engine can produce counterfactual outcomes if the upstream military and political situation diverges.

## Representation Tiers

| Tier | Meaning | Use |
|---|---|---|
| T1 operation opportunity | Corps/army-level operation proposal with objectives, staging, resource ask, timing window, and risk model. | Player/bot can approve or decline; simulation executes through operation systems. |
| T2 strategic event/modifier | Theater event that changes constraints or capabilities but is not directly commanded by the player. | Example: NATO air campaign, Croatian theater collapse, diplomatic ultimatum. |
| T3 defensive crisis | Enemy pressure event or failed offensive that should create alert, resource drain, morale risk, and possible local counterattack. | Especially useful for failed VRS offensives and siege episodes. |
| T4 sensitive-history gate | Territorial or military operation whose aftermath crosses atrocity / protected-civilian boundaries. | Military control can be simulated; atrocity is consequence, not a player lever. |
| T5 research pending | Named or suspected operation that needs stronger BB/ICTY/primary support before design. | Keep as backlog seed only. |

## High-Confidence Operation Catalog

### Eastern Bosnia / Sarajevo / Safe-Area Axis

| Operation / campaign | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Operation Zvezda 94 / Gorazde offensive | Mar-Apr 1994 | VRS | Tactical gains, strategic objective not achieved after NATO/UN pressure. | T3 | Defensive crisis around Gorazde; should test safe-area pressure, NATO ultimatum, and VRS pullback logic. | BB2 p.480. |
| Brana 94 / Vozuca-Ozren attempt | Jun-Jul 1994 | ARBiH 2nd + 3rd Corps | Failed ARBiH offensive. | T1 failed-op | Good template for player-authorized joint-corps offensive that can fail through terrain, staging, and defender quality. | BB2 p.508; [Operation Brana 94](https://en.wikipedia.org/wiki/Operation_Brana_%2794). |
| Tekbir 95 / Sarajevo breakout attempt | Jun 1995 | ARBiH | Failed attempt to break Sarajevo siege. | T1/T3 | Should be an expensive high-political-pressure operation with limited military odds unless prerequisites improve. | [Operation Tekbir 95](https://en.wikipedia.org/wiki/Operation_Tekbir_%2795). |
| Operation Krivaja-95 / Srebrenica | Jul 1995 | VRS Drina Corps | Srebrenica enclave captured. | T4 | Military control opportunity can exist; protected-civilian consequences are locked behind sensitive-history design gates. | [ICTY Krstic judgment](https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm); [Operation Krivaja 95](https://en.wikipedia.org/wiki/Operation_Krivaja_%2795). |
| Operation Stupcanica-95 / Zepa | Jul 1995 | VRS Drina Corps | Zepa enclave captured. | T4 | Same safe-area and protected-civilian constraints as Krivaja, with separate geography and force requirements. | [Operation Stupcanica 95](https://en.wikipedia.org/wiki/Operation_Stup%C4%8Danica_%2795). |
| Vozuca-Ozren / Farz / Uragan line | Sep 1995 | ARBiH 2nd + 3rd Corps | ARBiH gains around Vozuca/Ozren. | T1 | Joint-corps late-war offensive; excellent candidate for operation opportunity after VRS exhaustion and Federation strategic momentum. | IRMCT exhibit mentioning Operation Uragan/Farz: [certificate PDF](https://ucr.irmct.org/LegalRef/CMSDocStore/Public/English/Certificate/NotIndexable/IT-04-83/MSC6928R0000255537.pdf); [Battle of Vozuca](https://en.wikipedia.org/wiki/Battle_of_Vozu%C4%87a). |

### Central Bosnia / Vlasic / Kupres Axis

| Operation / campaign | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Autumn 1994 Kupres pressure | Oct-Nov 1994 | ARBiH 7th Corps | Opens western Central Bosnia pressure before HVO/HV entry. | T1 | A precondition/opportunity that can create the road into Kupres and later Glamac/Livno logic. | BB2 pp.529-530. |
| Operation Cincar / Kupres | Nov 1994 | HVO/HV with ARBiH pressure | Kupres captured by Croat forces; Central Bosnia balance shifts. | T1 | Dependency node for later western Bosnia operations; should not be buried inside Mistral. | BB2 pp.529-530; [Historija.ba Cincar](https://historija.ba/d/188-pocetak-operacije-cincar). |
| Domet-95 / first Vlasic attempt | Feb 1995 | ARBiH 7th Corps | Failed/postponed due conditions and readiness. | T3/T1 failed-op | Model as weather/readiness-limited proposal; gives the player a risky early option rather than a guaranteed success. | [Assault on Vlasic](https://en.wikipedia.org/wiki/Assault_on_Vla%C5%A1i%C4%87_%281995%29). |
| Domet-1 / Vlasic assault | Mar 1995 | ARBiH 7th Corps | ARBiH captures key Vlasic positions. | T1 | User-requested priority. Needs its own design doc: mountain warfare, winter conditions, morale effect, and Central Bosnia visibility. | [Assault on Vlasic](https://en.wikipedia.org/wiki/Assault_on_Vla%C5%A1i%C4%87_%281995%29); [UNSA/IZIIS Vlasic page](https://iziz.unsa.ba/en/vijest.php?akt_id=298). |

### Bihac / 5th Corps / Western Bosnia Axis

| Operation / campaign | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Tigar-Sloboda 94 | Jul 1994 | ARBiH 5th Corps | Deception/counter-APWB operation improves 5th Corps position. | T1 | Signature 5th Corps mechanic: deception, intelligence, internal Bosniak rival politics, and pocket operations. | BB2 p.533; [Operation Tiger 94](https://en.wikipedia.org/wiki/Operation_Tiger_%281994%29). |
| Pecigrad / Velika Kladusa reduction | Aug 1994 | ARBiH 5th Corps | APWB temporarily defeated; Velika Kladusa taken. | T1 | Should connect military control, Abdić/APWB legitimacy, and 5th Corps supply/political pressure. | BB2 pp.532-535; [Operation Tiger 94](https://en.wikipedia.org/wiki/Operation_Tiger_%281994%29). |
| Operation Una 94 / Grabex pressure | Aug-Sep 1994 | VRS/SVK vs 5th Corps | VRS/SVK pressure; 5th Corps holds. | T3 / failed enemy offensive | Failed VRS/SVK pressure against Bihac; should drain defenders and create crisis without assuming collapse. | BB2 p.534. |
| Operation Breza 94 | Sep 1994 | VRS/SVK vs 5th Corps | Failed attempt to crush Bihac. | T3 | Mandatory failed-VRS design example: strong pressure, risk of pocket collapse, but historically failed. | BB2 pp.540-542; [Operation Breza 94](https://en.wikipedia.org/wiki/Operation_Breza_%2794). |
| Operation Grmec 94 | Oct-Nov 1994 | ARBiH 5th Corps | ARBiH success and overextension dynamics. | T1 | Opportunity with exploitation risk: gains can trigger overextension and counteroffensive vulnerability. | BB2 pp.546-548, 555; [Operation Grmec](https://en.wikipedia.org/wiki/Operation_Grme%C4%8D). |
| Operation Pauk / Shield 94 | Nov-Dec 1994 | SVK/VRS/APWB vs 5th Corps | Major pressure; 5th Corps survives. | T3 | Defensive-crisis package: APWB return, SVK/VRS pressure, pocket supply crisis, international attention. | BB2 pp.550-556; [Operation Spider](https://en.wikipedia.org/wiki/Operation_Spider); [Operation Shield 94](https://en.wikipedia.org/wiki/Operation_Shield_%2794). |
| Operation Sana 95 | Sep-Oct 1995 | ARBiH 5th Corps | Major ARBiH gains toward Sanski Most/Kljuc. | T1 | Should be the capstone 5th Corps offensive, unlocked by pocket survival plus western theater collapse. | [Operation Sana](https://en.wikipedia.org/wiki/Operation_Sana). |

### HV/HVO Western Bosnia / Croatia-Linked Axis

| Operation / campaign | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Operation Winter 94 / Zima 94 | Nov-Dec 1994 | HV/HVO | Croatian forces gain Livno-Dinara leverage. | T2/T1 | Cross-border strategic opportunity; may be AI/patron-driven rather than direct BiH-player operation. | BB2 p.553; [Operation Winter 94](https://en.wikipedia.org/wiki/Operation_Winter_%2794). |
| Leap 1 | Apr 1995 | HV/HVO | Incremental western Bosnia/Croatia-linked gains. | T2/T1 | Follow-on leverage after Winter; likely dependency for Summer/Mistral. | [Operation Leap 1](https://en.wikipedia.org/wiki/Operation_Leap_1). |
| Leap 2 | Jun 1995 | HV/HVO | Further positioning before Summer/Storm. | T2/T1 | Theater-position event/opportunity. | [Operation Leap 2](https://en.wikipedia.org/wiki/Operation_Leap_2). |
| Operation Summer 95 / Ljeto 95 | Jul 1995 | HV/HVO | Livno/Grahovo corridor pressure; sets conditions for Krajina collapse. | T2/T1 | Important bridge from Croatian theater to Bosnia operational map. | [Operation Summer 95](https://en.wikipedia.org/wiki/Operation_Summer_%2795). |
| Operation Storm / Oluja | Aug 1995 | HV | Croatian theater collapse of RSK. | T2 | Strategic event with enormous Bosnia-side consequences; not directly owned by the BiH player. | [Operation Storm](https://en.wikipedia.org/wiki/Operation_Storm). |
| Mistral 2 / Maestral 2 | Sep 1995 | HV/HVO/ARBiH-linked pressure | Western Bosnia gains. | T1/T2 | Should be an opportunity emerging from Cincar + Winter/Summer/Storm dependencies, not a naked calendar script. | [Operation Mistral 2](https://en.wikipedia.org/wiki/Operation_Mistral_2); [Historija.ba Maestral](https://historija.ba/d/136-pocela-operacija-maestral/). |
| Southern Move / Juzni potez | Oct 1995 | HV/HVO | Late push toward Mrkonjic Grad/Banja Luka approaches. | T1/T2 | Endgame pressure event/opportunity; should interact with ceasefire/diplomacy rather than only map painting. | [Operation Southern Move](https://en.wikipedia.org/wiki/Operation_Southern_Move). |
| Operation Una | Sep 1995 | HV | Failed river crossing into western/northern Bosnia. | T3 | Useful failed-allied operation: demonstrates that "historical opportunity" can be declined or fail. | [Operation Una](https://en.wikipedia.org/wiki/Operation_Una). |

### Posavina / Northern Bosnia

| Operation / campaign | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Battle of Orasje / VRS offensive | May-Jun 1995 | VRS | Failed VRS offensive against HVO-held Orasje. | T3 | Important failed VRS operation. Good test of defensive logistics, enclaves/salients, and HVO resilience. | [Battle of Orasje](https://en.wikipedia.org/wiki/Battle_of_Ora%C5%A1je). |

### NATO / International Pressure

| Event | Approx. date | Main actor | Result | Tier | Design note | Current source basis |
|---|---:|---|---|---|---|---|
| Udbina air strike | Nov 1994 | NATO | Air strike on Krajina Serb airfield after Bihac air attacks. | T2 | International constraint signal around Bihac; should affect air threat and escalation. | BB1 p.63; [NATO Bosnia operations](https://www.nato.int/en/what-we-do/operations-and-missions/peace-support-operations-in-bosnia-and-herzegovina-1995-2004). |
| Operation Deliberate Force | Aug-Sep 1995 | NATO | Air campaign against VRS targets. | T2 | Strategic pressure modifier; should affect VRS command/supply/morale and diplomatic timeline, not be a player attack button. | [NATO Bosnia operations](https://www.nato.int/en/what-we-do/operations-and-missions/peace-support-operations-in-bosnia-and-herzegovina-1995-2004); [ICTY Mladic judgment summary](https://www.icty.org/x/cases/mladic/tjug/en/171122-summary-en.pdf). |

## Research-Pending Seeds

These names should not become implementation scope until citations are stronger and objectives can be mapped to OSIDs.

| Seed | Why keep it | Needed next |
|---|---|---|
| APWB 1995 actions around Vrnograc / Mala Kladusa | Likely important to the 5th Corps pocket arc. | Stronger BB/ICTY citation and OSID mapping. |
| Majevica 1995 | Potential late-war northeastern Bosnia action. | Verify whether operation-scale and relevant after Washington Agreement. |
| Trokut 95 | Could matter in western/northern Bosnian endgame. | Identify actor, date, objectives, and whether in Bosnia map scope. |
| "Miracle" / "Cudo" named action | Name appears in secondary lists. | Confirm official name and source basis. |
| Prijedor 95 pressure | May be better represented through Sana/Southern Move endgame pressure. | Determine whether standalone op or downstream objective family. |
| Vucja Planina | Possible local operation / terrain objective. | Citation and map relevance needed. |
| Mostobran / Bosanska Krupa action | Could be part of Sana or 5th Corps local offensive chain. | Decide whether separate op or Sana sub-axis. |

## Design Implications

1. **Create an operation-opportunity layer before adding more calendar scripts.** A proposal should appear when prerequisites align: political authorization, corps readiness, commander confidence, logistics, staging access, weather/season, enemy weakness, and alliance context.
2. **Use date paints as evaluation targets, not destiny.** April 1994, April 1995, and October 1995 paints are scenario-health tools. They should explain divergence, not force a deterministic replay.
3. **Prioritize the 5th Corps arc as the first full design family.** It includes deception, pocket survival, APWB politics, failed enemy offensives, overextension, and final exploitation. That makes it ideal for proving the opportunity model.
4. **Give Vlasic its own design doc.** It is not just a calibration patch; it is a distinct mountain-operation story with weather/readiness/failure/success phases.
5. **Model failed VRS operations explicitly.** Breza, Pauk/Shield pressure, Orasje, Zvezda 94, and other failed offensives are essential for engine health because they create pressure without demanding historical success.
6. **Make Cincar/Kupres a dependency node.** Mistral/Summer/Southern Move should not be asked to solve missing 1994 control by themselves.
7. **Keep Krivaja/Stupcanica behind sensitive-history gates.** Military control objectives can be represented, but atrocity, civilian detention, displacement, and massacre are consequence systems with locked ethical treatment.

## Proposed Design-Doc Backlog

1. `docs/plans/late-war-operation-opportunity-system-design.md`
   Defines the generic opportunity model: triggers, proposal UI, bot authorization, staging, decline/delay, and AAR.
2. `docs/plans/late-war-5th-corps-opportunities-design.md`
   Authored 2026-05-01. Treats 5th Corps as a special isolated-pocket family: APWB politics, pocket hardening, Breza/Pauk pressure, Grmec overextension, Storm/Oluja theater opening, and Sana exploitation.
3. `docs/plans/late-war-central-bosnia-vlasic-kupres-design.md`
   Kupres/Cincar, Domet-95 failure window, Domet-1/Vlasic success window.
4. `docs/plans/late-war-western-bosnia-hv-hvo-design.md`
   Winter, Leap 1/2, Summer, Storm as strategic event, Mistral 2, Southern Move, Una failure.
5. `docs/plans/late-war-vrs-failed-offensives-design.md`
   Zvezda 94, Breza 94, Pauk/Shield pressure, Orasje, and other failed VRS pressure ops.
6. `docs/plans/late-war-safe-area-and-sensitive-history-design.md`
   Krivaja-95, Stupcanica-95, Gorazde pressure, UN/NATO/diplomatic constraints, protected-civilian boundaries.

## Source Notes

Local BB knowledge base currently covers useful pages through roughly BB2 p.560. Known local anchors from this pass:

- BB1 p.63: Udbina air strike context.
- BB1 pp.73-74: 1995 chronology anchors.
- BB2 p.480: Gorazde / Zvezda 94.
- BB2 p.508: Brana 94 / Vozuca-Ozren.
- BB2 pp.529-530: Kupres / Cincar OOB and control shift.
- BB2 pp.532-535: Tigar-Sloboda, APWB, Pecigrad/Velika Kladusa, Una 94/Bihac pressure.
- BB2 pp.540-542: Breza 94.
- BB2 pp.546-548, 550-556: Grmec, Pauk/Shield, Bihac crisis, Winter 94 context.

Several late-1995 operations need refreshed BB extraction beyond the currently indexed local pages or stronger ICTY/primary sourcing before final design. Secondary web pages are acceptable as discovery scaffolding in this catalog, but implementation docs should prefer BB, ICTY, NATO, UN, or other primary/near-primary citations wherever possible.
