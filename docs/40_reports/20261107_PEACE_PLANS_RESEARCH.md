# Peace plans 1993–1995: dates, maps and status consequences (v2)

Historian seat research pass, version 2, 2026-11-07. This is scratchpad research, not canon. No repo file was edited.

Version 2 upgrades version 1 with primary UN documents and maps that became reachable after the network was opened. The v1 text is kept as `scratchpad/PEACE_PLANS_RESEARCH_v1_backup.md`.

The companion file is `plan_maps.json` (v2). It covers all 110 pre-war municipalities for `vance_owen`, `owen_stoltenberg`, `contact_group` and `dayton`. The JSON is built by `scratchpad/tools/build_plan_maps_v2.py`; v1 is kept as `scratchpad/plan_maps_v1_backup.json`.

## 0. Conventions, sources and method

**Week numbers.** Week 0 is 6 April 1992.

**Confidence tags**

- **[D]** documented: read from a cited primary map or text, or stated by ICTY, the UN or BB.
- **[I]** inferred: derived by a stated rule, or a map reading whose minority share may be measurement noise.
- **[U]** unknown or unverified.

**BB page references.** `BB1 KB p.N` is the KB page id in `data/derived/knowledge_base/balkan_battlegrounds/pages/`.

### 0.1 Primary documents obtained this pass

All from digitallibrary.un.org. The scanned PDFs were OCR'd locally with tesseract and the maps were read from the images.

| Symbol | Date | Content used |
|---|---|---|
| **S/25479** (record 164852) | 26 Mar 1993 | Vance–Owen package as signed by Izetbegović and Boban on 25 Mar. Annex I: interim arrangements, including governor rules, the capital city, withdrawal of forces and the App. D throughways. Annex II: constitutional principles. **Annex III / Appendix A: the revised provincial map, with municipality names and province borders**. Annex IV: military agreement. |
| **UN DPI Map 4129** (record 705482) | Nov 1999 | "Vance-Owen Peace Plan as presented January 1993" (the original map) |
| **S/26260** (record 171177) | 6 Aug 1993 | Full text of the Owen–Stoltenberg **Constitutional Agreement of the Union of Republics**, with Annex A part II. Paragraphs 30–49 cover the territorial talks: Brčko, eastern Bosnia, Bihać, Posavina, the Lašva valley and Sarajevo. |
| **S/26337** + Add.1 + Add.2 (records 173639, 171970, 171969) | 20 Aug 1993 | Owen–Stoltenberg package. **Appendix I map of the three republics**; App. II Sarajevo; App. III Brčko demarcation. Add.2 is the boundary map drawn on the 1:700,000 ethnic map. |
| **S/26395** (record 173086) | 1 Sep 1993 | Report on the 31 Aug – 1 Sep Geneva round |
| **S/26486** (record 173678) | 23 Sep 1993 | **HMS Invincible agreements of 20 Sep 1993**, with the Ploče lease appendix |
| **S/1994/173** (record 182332) | 14 Feb 1994 | EU Action Plan phase: the Serb map at 33.56%, the 33.3% target, the Croat 17.5% claim, arbitration proposals |
| **UN DPI Map 4128** (record 705480) | Nov 1999 | **"Contact Group July 1994 Proposal"**, in three shades: Bosnian Serb Republic, Muslim-Croat Federation, neutral zone |
| Wikipedia raw wikitext | – | "Peace plans proposed before and during the Bosnian War"; "Croatian Republic of Herzeg-Bosnia" (secondary; cited with their own references) |

### 0.2 Reachability

Primary documents via **curl** worked:

- digitallibrary.un.org, using the `/record/N/files/...pdf` paths and the `search?...&of=xm` API;
- en.wikipedia.org `action=raw`, rate-limited, so I used a descriptive user-agent.

WebFetch still failed on DNS, and documents.un.org is blocked (403). peaceagreements.org was not needed once the UN originals were in hand.

### 0.3 Area weighting

All shares use the repo's per-OSID areas (`data/derived/operational/osid_areas.json`, the same file `src/sim/osid_areas.ts` reads). A municipality's area is the sum of its OSIDs; the total is 51,337 km².

For the two maps that can be georeferenced (UN 4128 and S/26337 App. I):

- I fitted the map to the coordinates of town markers. That is a 2nd-order fit on 12 towns for 4128 (residual ≤ ~1 km), and an affine fit on 9 town dots for S/26337 (residual ~3–9 km).
- Each OSID polygon from `operational_settlements.geojson` was rasterised onto the map.
- Each OSID was then classified by grey shade (4128) or by enclosing region (S/26337).

For the VOPP map, membership was read municipality by municipality from the printed names. Split fractions are flood-fill pixel areas on the scan.

---

## 1. Vance–Owen Peace Plan (VOPP)

### 1.1 Dates and responses

| Date | Event | Week | Source |
|---|---|---|---|
| 27 Oct 1992 | Draft constitution: a decentralised state of 10 provinces | 29 | [D] BB1 KB p.42 |
| 2 Jan 1993 | Package presented in Geneva: 9 constitutional principles, military agreement, provincial map | 38.7 | [D] BB1 KB p.42; S/25479 |
| Jan 1993 | Croats accept the whole plan. Serbs accept the principles and the military accord. The Government accepts only the constitution. | ~39 | [D] BB1 KB p.42–43 |
| 30 Jan 1993 | Bosnian Serb side signs the nine Constitutional Principles | 42.7 | [D] S/25479 para 17 |
| 3 Mar 1993 | Government–Croat agreement on interim arrangements | 47.3 | [D] S/25479 para 6 |
| **25 Mar 1993** | **Izetbegović and Boban sign the interim arrangements and the revised provincial map** in New York, witnessed by Vance and Owen. The Serbs decline and refer the documents to their assembly. | 50.4 | [D] S/25479 paras 8–9, 14; map signature block |
| 17 Apr 1993 | UNSCR 820 commends the plan as agreed by two parties and tightens FRY sanctions | 53.6 | [D] |
| 1–2 May 1993 | Athens: Karadžić signs, conditional on the RS Assembly | 55.9 | [D] BB1 KB p.44 |
| 5–6 May 1993 | Pale Assembly rejects 51–2, with 12 abstentions | 56.4 | [D] BB1 KB p.44, p.218 |
| 15–16 May 1993 | Referendum confirms the rejection, ~96–97% against | 57.9 | [D] BB1 KB p.44; secondary for the % |

### 1.2 Territory: recomputed from the signed map

Shares are of BiH area, using OSID areas, based on the 25 Mar 1993 map.

| Party (province lead) | Provinces | Area | Published |
|---|---|---|---|
| **Serb** | 2, 4, 6 | **43.02%** | **43%** ([D] BB1 KB p.218; WaPo / GJICL 43%) — exact match |
| Muslim | 1, 5, 9 | 26.52% | 25% (WaPo, Muslim-majority provinces only); 32.3% (BarBalkans; probably including Sarajevo) |
| Croat | 3, 8, 10 | 25.33% | 24.5% (BarBalkans); "15% + a mixed province" (GJICL) |
| Sarajevo province 7 | 7 | 4.85% | – |
| Unnumbered Brčko–Orašje corridor strip | – | 0.28% | – |

**The governor rule confirms the faction leads.** S/25479 Annex I §D says each province's governor is "a member of the most numerous constituent people (1991 census)", with the vice-governor from the second. Computed from the repo census with this membership:

| Province | Name | Area | Bosniak / Serb / Croat (1991) | Governor | Vice-governor |
|---|---|---|---|---|---|
| 1 | Bihać | 7.6% | 65.9 / 25.7 / 3.5 | Bosniak | Serb |
| 2 | Banja Luka | 25.0% | 21.5 / 60.3 / 9.7 | Serb | Bosniak |
| 3 | Posavina | 3.7% | 19.5 / 31.2 / 41.7 | Croat | Serb |
| 4 | Bijeljina | 3.4% | 36.7 / 47.5 / 8.0 | Serb | Bosniak |
| 5 | Tuzla | 13.8% | 62.8 / 24.8 / 5.1 | Bosniak | Serb |
| 6 | East Herzegovina | 14.6% | 26.4 / 68.6 / 1.1 | Serb | Bosniak |
| 7 | Sarajevo | 4.9% | 51.2 / 25.6 / 10.0 | Bosniak | Serb |
| 8 | Mostar | 10.8% | 28.6 / 10.9 / 54.4 | Croat | Bosniak |
| 9 | Zenica | 5.1% | 57.4 / 14.7 / 19.5 | Bosniak | Croat |
| 10 | Travnik | 10.8% | 38.0 / 12.8 / 43.8 | Croat | Bosniak |

Every province's governor matches its designated lead. Province 7 is "special": three-party, but with a Bosniak governor.

### 1.3 The map: provinces by municipality

Source: [D] the S/25479 signed map unless marked. Province names come from S/25479 App. D (Bihać, Banja Luka, Posavina, Bijeljina, Tuzla, East Herzegovina, Sarajevo, Mostar, Zenica, Travnik).

**Province 1 — Bihać** (Muslim lead)

- Velika Kladuša, Cazin, Bihać, Bosanska Krupa.
- **Bosanski Novi** — 59% Serb in 1991, but drawn inside 1.
- **Prijedor, split**: ~61% in 1 (south/west), north and east in 2.
- **Sanski Most, split**: ~47% in 1 (north, inferred identity), ~53% in 2.

**Province 2 — Banja Luka** (Serb lead)

- Banja Luka, Bosanska Gradiška, Bosanska Dubica, Bosanska Kostajnica (unlabelled, [I]), Laktaši, Srbac, Prnjavor, Čelinac, Kotor Varoš, Skender Vakuf, Mrkonjić Grad, Šipovo, Ključ, Bosanski Petrovac, Titov Drvar, Bosansko Grahovo, Glamoč, Teslić.
- The western part of Doboj (~45%).
- App. D confirms the Bihać–Livno and Bihać–Jajce roads pass "through Banja Luka Province".

**Province 3 — Posavina** (Croat lead)

- Bosanski Brod, Derventa, Odžak, Modriča, Bosanski Šamac, Orašje.
- Northern Gradačac (~47%).

**Province 4 — Bijeljina** (Serb lead)

- Bijeljina, Ugljevik, Lopare.
- **Brčko** (town and east, ~70%). *v1 had Brčko in Province 3 on a secondary source; the signed map puts it in Province 4.*
- A separately outlined, **unnumbered strip (~30% of drawn Brčko)** runs from the Sava between Orašje and Brčko south toward Srebrenik. It is probably the Tuzla–Orašje access corridor; App. D lists the Tuzla–Orašje and Tuzla–Brčko roads as Access Authority throughways.

**Province 5 — Tuzla** (Muslim lead)

- Tuzla, Lukavac, Živinice, Kalesija, Banovići, Kladanj, Srebrenik, Gračanica.
- Zvornik — App. D: "Tuzla Province – Zvornik" border crossing.
- Bratunac, Srebrenica, Vlasenica.
- **Rogatica** (including Žepa), **Višegrad**, **Goražde**, and **western Foča** (~66%, including the town).
- The eastern part of Doboj (town, ~55%) and southern Gradačac (~53%).

**Province 6 — East Herzegovina** (Serb lead)

- Nevesinje, Gacko, Bileća, Trebinje, Ljubinje, Kalinovik.
- **Eastern Foča** (~34%), along the Montenegro border.
- **Čajniče and Rudo**: Rudo is marked "6".
- **Romanija: Sokolac (marked "6"), Han Pijesak and Pale**. Pale is unlabelled ([I]). App. D says the Pale–Kalinovik road passes *through* Sarajevo Province, so Pale itself lies outside it.
- **Šekovići**: a **Province 6 exclave**, ringed and marked "6", surrounded by Province 5. App. D confirms the Han Pijesak–Šekovići–Zvornik roads pass through Tuzla Province.

**Province 7 — Sarajevo** (special: three-party, Bosniak governor)

- The four city municipalities. The capital city is "the built-up areas of parts of Novi Grad, Centar Sarajevo, Novo Sarajevo and Stari Grad" (Annex I §C).
- Ilidža, Vogošća, Hadžići, Ilijaš and Trnovo — inside one SARAJEVO polygon, [I].
- **Kreševo** and **most of Kiseljak** (~83%): "as in the original map".
- **Visoko, Breza, Vareš** and a small border area of Kakanj, all **added on 25 Mar 1993** (S/25479 para 10).

**Province 8 — Mostar** (Croat lead)

- Mostar, Konjic, Jablanica, Prozor, Posušje, Lištica, Grude, Ljubuški, Čitluk, Čapljina, Stolac, Neum.

**Province 9 — Zenica** (Muslim lead)

- Zenica, Kakanj (~95%), Zavidovići, Žepče, Maglaj, Tešanj.
- **Olovo** [I]: thick lines on its sides facing provinces 5, 6 and 7, and a thin line to Zavidovići.

**Province 10 — Travnik** (Croat lead)

- Travnik, Novi Travnik, Vitez, Busovača, Fojnica, Gornji Vakuf, Bugojno, Donji Vakuf, Jajce, **Kupres, Livno, Duvno**.
- The NW sliver of Kiseljak (~17%) — matches Kordić TJ "part of Kiseljak".

**The January 1993 original** (UN map 4129) differs mainly in Sarajevo. Province 7 was smaller (city plus Kiseljak and Kreševo); Visoko, Breza and Vareš lay outside it. On 4129 the Provinces 1/2 border runs through Prijedor and Sanski Most towns, and Šekovići already appears as a separate "6".

**Cross-checks**

- ICTY Kordić TJ (Province 10 list) and Blaškić TJ (Province 8 "north to Prozor and Konjic"; southern Kiseljak in 7) match. [D]
- A/54/549 (Srebrenica and Žepa in Province 5) matches. [D]
- BB2 KB p.452 (Konjic and Jablanica in a Croat province) matches. [D]

### 1.4 Status consequences

**State**

- BiH continues within its existing frontiers as a decentralised state.
- Provinces are "separate constitutional entities with their own separate provincial constitutions and parliaments, which could not be merged into one Parliament" (S/25479 para 20).
- Provinces have no international legal personality (Annex II).

**RS**

- No RS. The Serb delegation's strategy was "continuing its 'Republika Srpska' by merging the three provinces", and the Co-Chairmen rejected it (paras 17–20).
- The Serb provinces are non-contiguous.
- Interim legal systems continue: the "700 acts" of RS law are tolerated only where compatible (para 18).

**Interim government** (Annex I §D)

- Each province has a governor, a vice-governor and 10 members, in proportion to the 1991 census.
- The Interim Presidency oversees the provinces.
- The Capital City has an independent Interim Executive Mayor and Board.

**Armies** (Annex I §E)

- Sarajevo Province is immediately demilitarised.
- Serb forces withdraw into Provinces 2, 4 and 6; HVO into 3; ARBiH into 1.
- ARBiH and HVO are deployed jointly in 5, 8, 9 and 10.
- Demilitarisation of all forces is supervised by UNPROFOR.
- Withdrawal is from the territory "which they at present claimed … outside the three provinces"; areas left are not to be placed under the UN while remaining Serb-run (para 15).

**International**

- A Boundary Commission makes "marginal changes" only (Annex I §B).
- International human-rights monitoring, ombudsmen, a Human Rights Court.
- UNPROFOR controls border crossings.
- An Access Authority runs the App. D throughways.

**Sanctions:** UNSCR 820 tightened sanctions; relief was tied to implementation.

---

## 2. Owen–Stoltenberg "Union of Republics" (June – October 1993)

### 2.1 Dates and responses

Rows from v1 retained, plus primary dates:

| Date | Event | Source |
|---|---|---|
| 15–16 Jun 1993 | Serb–Croat confederal map. The Co-Chairmen insist on the three eastern safe areas and **"not below 30 per cent"** for the Muslims. | [D] S/26260 paras 5–8 |
| 8 Jul | Revised Serb–Croat map drops the eastern safe areas; the Co-Chairmen reject it | [D] S/26260 para 11 |
| 30 Jul | Constitutional Agreement text (S/26260) | [D] |
| 20 Aug (week 71.6) | **Map of three republics (S/26337 App. I)** + Sarajevo (UN) and Mostar (EC) administration + Brčko demarcation | [D] S/26337 paras 5–7 |
| 27–29 Aug | Bosnian Assembly rejects | [D] BB1 KB p.47; Wikipedia (29 Aug, citing CVCE) |
| 28 Aug | RS Assembly accepts unconditionally | [D] BB1 KB p.47 |
| 28 Aug | HR-HB Assembly accepts but stipulates more territory, and **proclaims the Croatian Republic of Herzeg-Bosna "in accordance with the Owen–Stoltenberg peace proposal"** | [D] BB1 KB p.47–48; Wikipedia, citing Klemenčić et al. 1994 pp. 57–59 |
| 1 Sep | Package put to the parties: Croats and Serbs ready to sign; Izetbegović wants more sea access and territory | [D] S/26486 para 1, citing S/26395 |
| 20 Sep (week 76) | **HMS Invincible agreements** (§2.4) | [D] S/26486 |
| 29 Sep | Bosnian Assembly: conditional acceptance (return of territory seized by force) | [D] BB1 KB p.49 |
| 1–2 Oct | HR-HB, then RS Assembly, withdraw their concessions | [D] BB1 KB p.49 |

### 2.2 Territory

| Variant | Serb | Muslim | Croat | Sarajevo (UN) | Source |
|---|---|---|---|---|---|
| Guarantee | – | **≥ 30%** ("Republic marked No. 1") | – | – | [D] S/26260 para 24 |
| Serb framing | – | – | – | – | 30% means "a major roll-back of about 18 per cent" ([D] S/26260 para 31) |
| 20 Aug published | 53 (52–52.5) | 30 | 17 (17.5–18) | – | [D] Wikipedia, citing Marijan 2004 p.261 |
| **20 Aug map, recomputed (OSID)** | **52.3%** | **28.7%** | **16.0%** | **2.9%** | [D] S/26337 App. I, georeferenced |
| Invincible package | 49 | 33 | 17.5 | – | [D] BB1 KB p.48 |
| Jan 1994 Serb map | – | **33.56%** | 17.5% claimed by the Croats | – | [D] S/1994/173 paras 1, 19 |

On the recomputed map, Muslim 28.7% plus the Sarajevo district 2.9% makes 31.6%.

### 2.3 The map: 20 Aug 1993 (S/26337 App. I)

Per-municipality shares are in `plan_maps.json` → `owen_stoltenberg[*].map_share_pct`.

**Muslim republic**

- The Bihać pocket: Bihać 66%, Cazin, V. Kladuša, Bosanska Krupa 44%.
- Central Bosnia: Zenica, Kakanj, Zavidovići, **Žepče, Kiseljak, Kreševo** (these three are given to the Muslim republic on this map), Visoko, Breza, Vareš, Olovo, Travnik, Fojnica (86%), Konjic, Jablanica (~51%), east Mostar.
- The Tuzla region: Tuzla, Lukavac, Živinice, Banovići, Kladanj, Kalesija, Srebrenik, Gračanica, Gradačac (75%), Tešanj, Maglaj.
- **Southern and western Brčko** (map ~62%). Text: the Muslim boundary takes the western outskirts at the Tuzla road/railway fly-over and runs to the Sava east of Grbavica along the Brka river (S/26260 para 33).
- The eastern enclaves: **Srebrenica** (64% of the municipality), **Žepa** (in Rogatica), and **Goražde** (73%), joined to Žepa by "a special road … part of the territory of, and administered and policed by, the Muslim majority republic" (S/26337 para 6).

**Croat republic**

- West Herzegovina: Grude, Lištica, Ljubuški, Posušje, Čitluk, Čapljina (86%), Neum.
- Livno, Duvno, **Kupres**, Prozor (88%), western Mostar.
- The **Lašva pocket**: Vitez (76%), Busovača (56%), Novi Travnik (93%), Gornji Vakuf (68%), Bugojno (53%), Donji Vakuf (58%).
- Part of Jajce. Jajce is split three ways: 46 / 32 / 22.
- The **Posavina pockets**: Orašje (60%), and a separately drawn **Bosanski Brod–Odžak** pocket (67% of Brod, 80% of Odžak). Its allocation to the Croat republic is [I]: only Croats and Serbs border it, and S/26260 para 36 says the Serb–Croat Posavina line was still open.

**Serb republic.** Everything else:

- the Krajina, including all of Prijedor, Sanski Most and Ključ;
- the Posavina corridor (Derventa 86%, Modriča, Šamac 76%);
- Doboj 79%;
- the Semberija and Drina valley (Zvornik 76%, Bratunac, Vlasenica, Višegrad);
- Romanija;
- East Herzegovina (Foča 93%).

**Sarajevo district** — UN administration for up to two years [D]:

- the four city municipalities plus Ilidža, Vogošća, Ilijaš, Hadžići and Trnovo, as drawn;
- the permanent solution was to be found "within two years" (S/26486 para 5).

On 6 Aug the Serbs had wanted Ilidža, Ilijaš, Rajlovac, Butmir and Hrasnica, and Nedžarići/Dobrinja; they would give up Grbavica and Vogošća (S/26260 paras 39–41).

**Mostar** — EC administration for up to two years [D] S/26337 para 6. It was agreed again on 12 Feb 1994 (S/1994/173 para 16).

**Areas vested in the Union** [D] S/26260 Annex A II:

1. the opština of Neum and the part of Stolac below the Muslim-republic border (sea access);
2. the railway from Tuzla across Brčko to the Sava bridge;
3. Union buildings in Sarajevo.

**Corridors and throughways** [D] S/26260 paras 25–26, 34–35:

- the Ploče–Doboj railway and road under the Access Authority;
- the blue routes;
- a Goražde throughway: Sarajevo–Trnovo–Čajniče–Montenegrin border;
- a Žepa/Srebrenica throughway to Kakanj;
- Bihać access to Rijeka, and a throughway to Travnik and East Herzegovina.

### 2.4 HMS Invincible, 20 Sep 1993 (S/26486)

All [D].

- **Neum.** Muslim exit to the sea "via the Access Authority Throughway from Poplat to Neum", and Muslim title to a tract on the Kosa (Klek) isthmus, with a joint tourism authority. Experts ruled out a port at Neum.
- **Neretva port.** A Muslim port between Višići and Čeljevo. The **Muslim southern border was moved from Rečice to just above Višići**.
- **Ploče.** Croatia grants a **99-year lease** of a free-zone port facility to the Muslim-majority republic.
- **Drina.** The Serbs cede "an additional area of land along the banks of the Drina river between Goražde and Višegrad".
- **Future exchange.** Once Croatia–FRY relations normalise: Prevlaka and Dubrovnik security, Serb-republic sea access between Oštri Rt and Molunat, and compensation for Croatia.
- **Working groups.** Bosniak–Croat and Bosniak–Serb working groups on delimitation: Brčko, Bosanska Krajina, the Neretva valley, eastern Bosnia, Ozren.

### 2.5 Status consequences

From the Constitutional Agreement text, S/26260; all [D].

**Union**

- The Union "will continue as a State Member of the United Nations".
- It cannot be dissolved, and **no republic may withdraw without the prior agreement of all Republics**. Any republic may appeal to the Security Council, whose decision is final.
- If a republic did withdraw, the Annex A II areas would stay with the Union.

**Republic names**

- "**The name of each Constituent Republic will be determined by the competent authorities of that Republic**." The Serb republic could therefore call itself Republika Srpska as a constituent republic of a Union, not as a Dayton-style entity.
- HR-HB proclaimed its republic on 28 Aug on this basis.

**Powers**

- All functions not assigned to the Union belong to the republics.
- Union competences: foreign affairs and international trade, common institutions, citizenship (with dual citizenship allowed), and courts (Supreme, Constitutional, Human Rights).
- Presidency of the three republic presidents, by consensus, with the chair rotating every 4 months.
- A rotating Prime Minister and Foreign Minister.
- Parliament of 120 (one-third per republic), with laws by a majority of each republic's members.
- No border controls between republics.
- Each republic adopts its own constitution; the first elections are UN/EC-supervised.

**Armies**

- "**Neither the Union … nor any of the Constituent Republics shall maintain any military force**". All existing forces are to be progressively disarmed and disbanded under UN/EC supervision (Constitutional Agreement chap. I art. 4).
- **This is a key difference from Dayton**, which kept the entity armies.

**International**

- Implementation Force until elections, at the latest 2 years after signature (S/26260 para 50).
- Safe-area protection for Srebrenica, Žepa and Goražde, possibly longer.

---

## 3. EU Action Plan, November 1993 – February 1994

Rows from v1 retained, plus the primary record S/1994/173 [D]:

- **18–19 Jan 1994 (Geneva).** "A map proposed by the Bosnian Serbs had been on the table offering the Muslim majority republic **33.56%**". Croatia was willing to sign 99-year leases at Ploče and at a Neretva port at Čeljevo.
- **Izetbegović's position.** He acknowledged the 33.56%, but wanted areas "in eastern and western Bosnia where the Muslims had been in the majority before the outbreak of the conflict, as well as certain areas in central Bosnia, **while keeping within the target of 33.3%**".
- **Arbitration offer.** The Co-Chairmen proposed sending the disputed areas to an arbitration commission named by the ICJ President. Croats and Serbs accepted. The Presidency required force withdrawal first and denied that the disputed areas fell inside the provisional republic boundaries.
- **12 Feb 1994.** All three sides reaffirmed a Union of three republics. Mostar under the EU and Sarajevo under the UN were reaffirmed, with final delimitation during those administrations. The **Croats asked recognition of 17.5%**; the Presidency accepted it only "if not prejudicial" to its own claims.
- **Sarajevo.** On 5–6 Feb the Bosnian Serbs agreed to UN administration and demilitarisation of the Sarajevo District in advance of a settlement (S/1994/173 paras 9–10).
- **Game reading.** Model it as an O-S counter-offer: Muslims 33.3–33.56, Croats 17.5, Serbs about 49, plus the FRY sanctions-suspension rider (BB1 KB p.50).

## 4. Washington Agreement, March 1994

Rows from v1 retained, plus secondary sources [D, Wikipedia with cited sources]:

- At the time of the talks, HVO-held territory "had dropped from 16 percent to 13 percent" of BiH (Magaš & Žanić 2001 p.66; Hoare 2010 p.129).
- The combined ARBiH and HVO territory was divided into ten cantons (Bethlehem & Weller 1997 p. liv). Croats were a majority in three, Bosniaks in five, and two were mixed (Toal & Dahlman 2011 p.196).
- The Federation army was to be built by merging ARBiH and HVO, "largely ineffective" (Schindler 2007 p.252).

## 5. Contact Group plan, July 1994

### 5.1 Dates

Unchanged from v1:

- presented 6 Jul (week 117.3);
- Bosnian Assembly yes on 18 Jul;
- RS conditional 20 Jul, rejected 28 Jul;
- Milošević blockade 4 Aug;
- RS referendum 27–28 Aug.

### 5.2 Territory: recomputed from UN map 4128

| Unit | Area (OSID-weighted) |
|---|---|
| Bosnian Serb Republic | **48.9%** |
| Federation | 48.2% |
| Neutral zone (Sarajevo) | 2.8% |
| **Federation + neutral** | **51.1%** — reproduces the published **51/49** ([D] BB1 KB p.57) |
| Federation, faction layer [I] | RBiH-held ~30.5%, HVO-held or Croat-claimed ~14.3%, mixed ~3.5% |

The shade threshold was chosen so that the totals reproduce 51/49, so the 51/49 match is a calibration check, not independent evidence.

### 5.3 The map (UN 4128)

Shares per municipality are in `plan_maps.json` → `contact_group[*].map_share_pct`.

**To the Federation**

- **West**
  - The whole Bihać pocket: Bihać 69%; Bosanska Krupa 82%.
  - **Sanski Most** (58%, including Sanica): a lobe from Krupa toward Ključ.
- **Central and south-west**
  - Jajce (83%), **Kupres** (87%), **Donji Vakuf**, Livno (89%), Duvno, Bugojno, the Lašva valley, all of Herzegovina west of the Neretva, and Konjic.
- **Posavina**
  - **Odžak and Bosanski Brod**, north of the corridor.
  - About half of Derventa (53%).
  - Orašje: the map gives about 50%, near the line, uncertain.
  - Gradačac (73%).
- **East**
  - **Srebrenica (63%), Žepa/Rogatica (67%), Goražde (60%)**, linked through Rogatica to the Sarajevo neutral zone.
  - Pieces of Kalesija, Sokolac, Han Pijesak and Šekovići.
- **Neutral zone (white)**
  - The four city municipalities plus **Hadžići, Ilidža, Ilijaš, Trnovo, Vogošća** (100%).

**To RS**

- The Krajina: Prijedor 90%, Bosanski Novi 80%, Bosanski Petrovac 96%, Drvar, Grahovo, Glamoč 72%, Ključ 88%, Mrkonjić Grad, Šipovo, Kotor Varoš 64%, Teslić 62%, Skender Vakuf.
- The **Posavina corridor**: Modriča, Šamac 27–70% (near the line), Doboj ~50%, and Brčko ~46%, with the corridor passing Brčko town.
- Semberija and Majevica; Zvornik 74%, Bratunac, Vlasenica.
- Romanija: Pale 82%, Sokolac 70%.
- Višegrad 92%, Foča 78%, Čajniče, Rudo.
- East Herzegovina, including Kalinovik 91%, Nevesinje 81%, Trebinje 89%.

**Against Dayton.** The Contact Group map gave the Federation the eastern enclaves, Sanski Most, Kupres/Jajce/Donji Vakuf and Brod/Odžak/part of Derventa, but left all of western Krajina (Petrovac, Drvar, Grahovo, Glamoč, Ključ) to RS. Dayton traded:

- Srebrenica, Žepa, Rogatica and Bosanski Brod/Derventa to RS;
- the western Krajina and all of Sarajevo to the Federation.

So Dayton is not a proxy for the Contact Group map.

### 5.4 Status consequences

Unchanged from v1. The neutral zone is now documented on UN map 4128; its administration regime is not described on the map.

---

## 6. Dayton

Dates, territory, IEBL and status are unchanged from v1. All entity data is documented from the post-1995 municipal structure.

**Recomputed with OSID weighting**

| Unit | Area |
|---|---|
| RS | **48.3%** |
| Federation | 50.8% |
| Brčko District | 0.95% |
| Federation layer [I] | RBiH-run 29.0%, HRHB-run 18.5%, mixed 3.3% |

**Federation-internal split.** No primary source divides the Federation between Bosniaks and Croats; the GFAP does not. Secondary sources:

- 10 cantons: 3 Croat-majority, 5 Bosniak-majority, 2 mixed ([D] Wikipedia, citing Toal & Dahlman 2011 p.196);
- a WebSearch summary of a Wikipedia article gives "after Dayton Bosnian Croats controlled just 21% (10,640 km²), compared to more than 25% prior to Dayton". I could not locate the sentence in the raw articles fetched, so it is [U].

My inferred HRHB layer (18.5%, or 21.8% with mixed municipalities) is consistent with that figure.

---

## 7. What changed since v1

1. **VOPP is now fully mapped from the signed 25 Mar 1993 map.** Result: **101 documented, 9 inferred, 0 unknown** (v1: 33/50/27). Serb provinces = **43.02%**, matching the published 43%.
   - **Brčko is in Province 4 (Serb)**, not 3.
   - Province 6 includes Romanija (Sokolac, Han Pijesak, Pale), Čajniče, Rudo, eastern Foča and the **Šekovići exclave**.
   - Province 5 includes Rogatica, Višegrad, Goražde, western Foča, Zvornik, Bratunac, Vlasenica and Kladanj.
   - Province 10 includes **Livno, Duvno, Kupres**, Jajce, Bugojno and Donji Vakuf. Province 2 includes Glamoč, Grahovo, Drvar, Petrovac, Ključ, Teslić and Kotor Varoš.
   - **Province 1 includes Bosanski Novi** and parts of Prijedor and Sanski Most.
   - **Olovo is in Province 9.**
   - Sarajevo province (March revision) includes Visoko, Breza, Vareš, Kreševo and most of Kiseljak.
   - Croat-led provinces ≈ **25.3%** (v1 estimate 26), Muslim-led ≈ 26.5%, Sarajevo ≈ 4.9%.
2. **O-S is now map-derived.** Result: 98 documented, 12 inferred (v1: 10/89/11). Recomputed **52.3 / 28.7 (+2.9 Sarajevo) / 16.0**, close to the published 53/30/17.
   - **Žepče, Kiseljak and Kreševo go to the Muslim republic** on the 20 Aug map.
   - Brčko is split, with a Muslim corridor to the Sava.
   - A Brod–Odžak Croat pocket.
   - The Constitutional Agreement **abolishes all armies**, allows republics to choose their own names, and forbids withdrawal without unanimous consent.
3. **Contact Group is now map-derived.** Result: 96 documented, 14 inferred (v1: 3/65/42). 48.9 RS / 48.2 Federation + 2.8 neutral.
4. **EU Action Plan** figures (33.56%, 33.3% target, Croats 17.5%) now come from a primary source (S/1994/173).
5. **BB1 KB p.48's 49/33/17.5 for Invincible** is plausible as the package total: the Serbs ceded Drina land and a Neretva strip. But S/26486 gives no percentage, so that figure is BB-only.

---

## 8. Corrections to `src/sim/negotiation/peace_plan_data.ts`

v1 items 1, 3, 6–8 and 10–15 stand. The following are updated:

- **Vance–Owen `proposed_split`.** Replace `{RBiH:39, RS:43, HRHB:18}`. The signed map gives:
  - Serb provinces **43.0**;
  - Croat-led provinces **25.3**;
  - Muslim-led provinces **26.5**;
  - Sarajevo province **4.9** (three-party, Bosniak governor);
  - corridor 0.3.

  For a three-way game split: **RBiH 31–32 (with Sarajevo and the corridor), RS 43, HRHB 25**. HRHB 18 understates the plan by about 7 points.
- **Owen–Stoltenberg `proposed_split`.** The map-measured split is **RBiH 29 (+3 Sarajevo UN), RS 52, HRHB 16**, against the published 30/53/17. Use **30/52.5/17.5** for the 20 Aug stage and **33/49/17.5** for Invincible / the EU Action Plan. The current HRHB 15 is low.
- **Contact Group / Dayton.** 49/51 confirmed by map measurement. The RBiH/HRHB layer inside the Federation (game 33/18):
  - Contact Group map: ~30.5 / 14.3 / 3.5 mixed + 2.8 neutral;
  - Dayton: ~29.0 / 18.5 / 3.3 mixed + Brčko 1.0.

  Keep 33/18 only as a labelled inference; the Dayton layer supports roughly **31–32 / 18–19**.
- **New status flags to model**:
  - VOPP: no RS; non-contiguous Serb provinces; forces withdrawn to designated provinces; governors by census.
  - O-S: **no armies at all**; self-named republics in a UN-member Union; no unilateral secession; Sarajevo under the UN and Mostar under the EU for 2 years; Union-vested Neum, Brčko rail and Sarajevo buildings.
  - Contact Group: neutral Sarajevo zone.
  - Dayton: named RS entity with its own army; Brčko to arbitration.

## 9. References

All v1 references, plus these primary UN documents and maps, all at digitallibrary.un.org:

- S/25479 (record 164852);
- UN Map 4129 (705482);
- S/26260 (171177);
- S/26337 (173639);
- S/26337/Add.1 (171970);
- S/26337/Add.2 (171969);
- S/26395 (173086);
- S/26486 (173678);
- S/1994/173 (182332);
- UN Map 4128 (705480).

Wikipedia raw articles used, as secondary sources: "Peace plans proposed before and during the Bosnian War" (Marijan 2004 p.261; Klemenčić, Pratt & Schofield 1994 pp. 57–59) and "Croatian Republic of Herzeg-Bosnia" (Magaš & Žanić 2001 p.66; Hoare 2010 p.129; Toal & Dahlman 2011 p.196; Schindler 2007 p.252).


---

# Appendix A — v1 text (kept for the dates, Washington/Dayton detail and v1 corrections; superseded where §7 of v2 says so)

Historian seat research pass, 2026-11-07. This is scratchpad research, not canon. Repo files were read, not edited.

Companion file: `plan_maps.json` in this folder. It assigns all 110 pre-war municipalities for each of `vance_owen`, `owen_stoltenberg`, `contact_group` and `dayton`.

## 0. How to read this document

**Week numbers.** Week 0 is 6 April 1992, the date used in `src/ui/map/utils/formatters.ts`. "Week 56.4" means 56.4 weeks after that date.

**Confidence tags** appear on every claim:

- **[D]** documented: a cited source states it.
- **[I]** inferred: derived by a rule that is stated.
- **[U]** unknown or unverified: a best guess, or a recollection the session could not check.

**BB page numbers.** `BB1 KB p.N` is the page id in the Balkan Battlegrounds knowledge base (`data/derived/knowledge_base/balkan_battlegrounds/pages/BB1_p0N.json`). This follows the repo's existing convention, for example "BB1 p.44" in `historical_envelopes.ts`. Narrative KB pages run about 37 above the printed page numbers. For example, KB p.432 is printed p.395.

**What the session could and could not reach.** WebSearch worked; WebFetch did not.

- WebFetch failed for en.wikipedia.org, ucdp.uu.se and balkaninsight.com, because those hosts are outside the session's network allowlist. Full texts therefore came only through WebSearch result summaries:
  - the VOPP Appendix A map;
  - S/26486, the Invincible annex;
  - the Contact Group map (UN Digital Library record 705480).
- Page-level citations for the following books are **not verified this session**, so I cite them only at book or chapter level:
  - Owen, *Balkan Odyssey*;
  - Burg & Shoup, *The War in Bosnia-Herzegovina*;
  - Holbrooke, *To End a War*;
  - Silber & Little, *The Death of Yugoslavia*.
- To raise the `contact_group` and `vance_owen` maps from inferred to documented, allow these hosts:
  - en.wikipedia.org;
  - ucdp.uu.se, or peaceagreements.org;
  - digitallibrary.un.org;
  - researchbriefings.files.parliament.uk.

**Repo data used**

- `data/source/municipality_post1995_to_mun1990.json` maps the 142 post-Dayton municipalities to the 110 pre-war ones. The code prefix gives the entity: 1xxxx is the Federation (FBiH), 2xxxx is RS, 3xxxx is the Brčko District. **This makes the Dayton outcome per municipality fully documented.**
- `data/derived/municipality_borders.geojson` gives post-1995 polygon areas. Totals: FBiH 50.9%, RS 48.1%, Brčko District 1.0%. That reproduces the 51/49 split.
- `data/derived/municipalities_2_5d_viewer.geojson` gives pre-war municipality areas, used for the plan-share sanity checks.
- `data/derived/municipality_population_1991.json` gives 1991 census shares, used by the inference rules.

---

## 1. Vance–Owen Peace Plan (VOPP), October 1992 – May 1993

### 1.1 Dates and responses

| Date | Event | Week | Source |
|---|---|---|---|
| 27 Oct 1992 | Draft constitution: a "decentralized federation of 10 autonomous provinces" | 29 | [D] BB1 KB p.42 |
| 2 Jan 1993 | Full package presented in Geneva: 9 constitutional principles, military agreement, provincial map | 38.7 | [D] BB1 KB p.42; UN Yearbook 1993 p.479 |
| Jan 1993 | **Croats accept the whole plan. Serbs accept the constitutional principles and the military accord. The Bosnian Government accepts only the constitution.** | ~39 | [D] BB1 KB p.42–43 |
| 25 Mar 1993 | Izetbegović signs in New York, which isolates the Serbs. He asked for Sarajevo to be a "Muslim province" and for map changes. | 50.4 | [D] BB1 KB p.43; [D] secondary (Sarajevo Times / klix) |
| 26 Mar 1993 | SG report S/25479 packages the plan, including the Agreement on Interim Arrangements and the provisional provincial map (Appendix A) | 50.4 | [D] UN Digital Library catalogue; UNSC res. 820 |
| 17 Apr 1993 | UNSCR 820 commends the plan "in the form agreed to by two of the Bosnian parties" and tightens sanctions on the FRY | 53.6 | [D] UNSCR 820 text (Refworld) |
| 1–2 May 1993 | Athens. In return for "concessions on access corridors between the provinces", Karadžić accepts, conditional on ratification by the RS Assembly | 55.9 | [D] BB1 KB p.44 |
| 5–6 May 1993 | RS Assembly at Pale, with Milošević, Ćosić and Mitsotakis present. Mladić's intervention is decisive. **Rejected 51 to 2, with 12 abstentions.** | 56.4 | [D] BB1 KB p.44; BB1 KB p.218 |
| 15–16 May 1993 | RS referendum confirms the rejection "despite support from Serbian President Milošević". About 96–97% voted against (secondary sources give 96% to 97%). | 57.9 | [D] BB1 KB p.44; [D] secondary for the percentage |
| ~17–18 Jun 1993 | Owen declares the plan dead; the Geneva talks move to a three-way partition | ~62 | [D] secondary (hr.wikipedia via search); BB1 KB p.45 |

After the Pale rejection, the EC said personnel would "hold Milošević to his promise to stop aid to Bosnian Serbs" ([D] BB1 KB p.44, 10 May). This is the historical basis for a "patron cut-off" consequence. The full Belgrade blockade came only in August 1994 (see §5).

### 1.2 Territory: percentage per party

| Variant | Serbs | Muslims | Croats | Other | Source |
|---|---|---|---|---|---|
| CIA *Balkan Battlegrounds* | **43%**, down from the 65–70% they held, i.e. giving up "more than 20 percent" of BiH | – | – | – | [D] BB1 KB p.218 |
| Washington Post, May 1993; Georgia J. Int'l & Comp. L. note | 43% | ~25% | 15% | a Muslim–Croat province still to be decided | [D] secondary |
| BarBalkans (blog) | 42.3% | 32.3% | 24.5% | – | [U] weak source |
| **This pass: area check of `plan_maps.json`** | 40.7% plus part of the 1.3% split/unknown area (≈ 42–43%) | Provinces 1, 5, 9 ≈ 25.5% | Provinces 3, 8, 10 ≈ 26% | Sarajevo province 7 ≈ 4% | [I]; 29% of the area rests on best guesses |

BB characterises the provinces as 3 Serb, 3 Muslim, 2 Croat, 1 mixed Croat–Muslim, plus Sarajevo ([D] BB1 KB p.218). The ICTY Prlić Trial Judgement and the HVO's own reading treat **3, 8 and 10 as Croat** ([D] Prlić TJ Vol. 1).

### 1.3 The map: provinces and capitals

Capitals and ethnic leads are documented in klix.ba and in the VOPP military annex.

| No. | Capital | Lead party | Documented municipalities | Source |
|---|---|---|---|---|
| 1 | Bihać | Muslim | Bihać | [D] klix |
| 2 | Banja Luka | Serb | Banja Luka | [D] klix |
| 3 | Bosanski Brod | Croat | Derventa, Bosanski Brod, Odžak, Modriča, Bosanski Šamac, Brčko, Orašje, plus parts of Gradačac and Doboj | [D] posavina.org (secondary, local). Province 3 sat between Serb provinces 2 and 4, breaking Serb contiguity ([D] secondary summary of the JSTOR Vance/Owen volume) |
| 4 | Bijeljina | Serb | Bijeljina | [D] klix |
| 5 | Tuzla | Muslim | Tuzla, Srebrenica, Žepa (in Rogatica municipality), Zvornik, Višegrad, Foča, Goražde; "most of the areas of eastern Bosnia recently ethnically cleansed" | [D] A/54/549; [D] IZIZ Srebrenica study (secondary); [D] Mearsheimer & Pape 1993 for Goražde and Tuzla |
| 6 | Nevesinje | Serb | Nevesinje | [D] klix |
| 7 | Sarajevo | Mixed, with three-party power-sharing; Muslims had the main responsibility | The city ("enlarged Sarajevo Province") and the southern part of Kiseljak | [D] VOPP text; [D] Blaškić TJ |
| 8 | Mostar | Croat | Mostar, plus the area from the Croatian border north to **Prozor and Konjic**, and **Jablanica**. Muslim-majority Konjic and Jablanica in a Croat province helped trigger the Konjic fighting of April 1993. | [D] Blaškić TJ; [D] BB2 KB p.452 |
| 9 | Zenica | Muslim | Zenica | [D] klix |
| 10 | Travnik | Croat | Travnik, Novi Travnik, Vitez, Busovača, Fojnica, Gornji Vakuf, northern Kiseljak | [D] Kordić & Čerkez TJ; Blaškić TJ |

**Inference rule for the other municipalities [I].** BB says the boundaries were "largely determined by ethnicity, but geographical, historical, and economic factors are taken into account" ([D] BB1 KB p.42). So each remaining municipality goes by its 1991 majority and by contiguity with a documented capital.

**27 municipalities are marked unknown** (best guess only). They include:

- Bosanski Petrovac, Glamoč, Prijedor, Sanski Most, Ključ, Kotor Varoš, Teslić;
- Šekovići, Han Pijesak, Sokolac, Pale, Trnovo;
- Čajniče, Rudo, Olovo, Visoko, Breza, Vareš, Kreševo;
- Livno, Duvno, Kupres, Donji Vakuf, Žepče;
- the remainders of Gradačac, Doboj and Rogatica.

Livno and Duvno were certainly in a Croat province, but whether province 8 or 10 is not established.

**The provisional map did not follow municipal lines.** Kiseljak, Rogatica/Žepa, Gradačac and Doboj are documented splits.

### 1.4 Status and constitutional consequences

| Area | VOPP provision | Confidence and source |
|---|---|---|
| State | BiH continues "within its existing frontiers" as a decentralized state. Most functions go to the provinces, with a minimal central government. | [D] BB1 KB p.218; BB1 KB p.42 |
| RS | **No recognition and no entity name.** "Republika Srpska" ceases to exist as a unit. Serbs get three non-contiguous provinces (2, 4, 6). The plan "would have broken up their single, contiguous state — a key Serb war aim". | [D] BB1 KB p.218 |
| Contiguity and corridors | Province 3 (Posavina, Croat-led) severs provinces 2 and 4. Athens added "access corridors between the provinces". UN control of the northern corridor is generally described in the literature, but the detail is not verified here. | [D] BB1 KB p.44; [U] for the UN-control detail |
| HRHB | Provinces 3, 8 and 10 Croat-led: "autonomy, territorial compactness, and direct access to the Croatian border". The HVO used the plan to demand ARBiH subordination in 3, 8 and 10 (January 1993 ultimatum), which helped spark the Croat–Bosniak war. | [D] BB1 KB p.218; Prlić TJ; BB1 KB p.225 |
| RBiH | Keeps the unitary state in name. Gets provinces 1, 5 and 9 and leads in province 7. Loses Muslim-majority Konjic, Jablanica, Gornji Vakuf, Fojnica and Travnik to Croat provinces. | [D] Kordić TJ; BB2 KB p.452 |
| Armies | Withdrawal into designated provinces: Serb forces to 2, 4, 6; HVO to 3; ARBiH to 1; ARBiH and HVO by agreement in 5, 8, 9, 10. Sarajevo demilitarised. NATO planned about 60,000 troops for implementation. | [D] VOPP military annex (via search summary); BB1 KB p.44 |
| Sarajevo | Province 7 with three-party power-sharing. Izetbegović wanted a "Muslim province". | [D] BB1 KB p.218; secondary |
| Refugees and rights | Right of return; human rights machinery under the constitutional principles | [I] from the general VOPP literature; text not fetched |
| International | ICFY plus a UN/NATO implementation force; interim provincial governments under the Agreement on Interim Arrangements | [D] S/25479 catalogue; search summary of the interim text |
| Sanctions | UNSCR 820 tightened sanctions to force Serb acceptance; relief was tied to implementation | [D] UNSCR 820 |

---

## 2. Owen–Stoltenberg "Union of Three Republics", June – October 1993

### 2.1 Dates and responses

| Date | Event | Week | Source |
|---|---|---|---|
| 16–19 Jun 1993 | Geneva talks to rework the VOPP into ethnic partition. Izetbegović walks out on 18 June. Milošević's three-republic plan follows on 19 June. | 62 | [D] BB1 KB p.45 |
| 28 Jun | Joint Serb–Croat confederal proposal | 64 | [D] BB1 KB p.46 |
| 30 Jul | "Union" constitutional plan, a combination of the VOPP and the Serbian plan. BB records that the Bosnian Government rejects it. | 68.6 | [D] BB1 KB p.47 |
| 16 Aug | Parties agree "in principle" to a demilitarised, UN-administered Sarajevo | 71 | [D] BB1 KB p.47 |
| **20 Aug** | **Draft settlement package with a map. Owen asks the EC to administer Mostar for 2 years.** | 71.6 | [D] BB1 KB p.47 |
| 27–29 Aug | Bosnian Assembly: the proposal is "unacceptable"; it decides to reject and push for more territory | 72 | [D] BB1 KB p.47 |
| 28 Aug | **RS Assembly accepts unconditionally.** HR-HB Assembly endorses, but stipulates more territory for Croats and **proclaims the Croat Republic of Herceg-Bosna**. | 72.6 | [D] BB1 KB p.47–48 |
| 20 Sep | **HMS Invincible.** The package becomes the EC's basic goal. | 76.0 | [D] BB1 KB p.48 |
| 28–29 Sep | Bosniak congress, then Bosnian Assembly: accept **on condition that territory seized by force is returned**. The Cabinet accepted unconditionally. | 77.3 | [D] BB1 KB p.49 |
| 1 Oct / 2 Oct | HR-HB Assembly, then RS Assembly, **withdraw the territorial concessions** made to the Muslims | 77.6 | [D] BB1 KB p.49 |
| 22 Oct | Serbs and Milošević recognise Abdić's APWB "on the basis of the Geneva plan" | 80 | [D] BB1 KB p.50 |

### 2.2 Territory

| Variant | Serbs | Muslims | Croats | Source |
|---|---|---|---|---|
| 20 Aug 1993 Geneva map | 52–53% (commonly 52.5) | **30%** (the text floor: "not less than 30% of the entire territory of the Union") | 17.5–18% | [D] OS text via peaceagreements.org summary; secondary 52/30/18 |
| 20 Sep 1993 Invincible package | **49%** | **33%** | **17.5%** | [D] BB1 KB p.48 |
| Invincible, per HD Centre 2017 | – | "just over 33% … including access" | – | [D] secondary |
| This pass: front-line proxy in `plan_maps.json` | 57–60% | 21–24% | 12–13% | [I]. **Overstates RS by about 5–8 points.** The Geneva map took some Serb-held land, in places not documented here. |

### 2.3 The map

**Three constituent republics** [D] (BB1 KB p.219; OS text):

- Muslim-majority republic;
- Serb republic;
- Croat republic.

**Special areas**

- **Sarajevo district** [D]: not divided, demilitarised, UN-administered for 2 years (BB1 KB p.47–49). Its outer boundary is not documented. Ilidža, Vogošća, Ilijaš and Hadžići are marked split/unknown.
- **Mostar** [D]: EC/EU administration for 2 years (BB1 KB p.47–49). The EU actually took over on 23 July 1994, under the Washington framework (BB1 KB p.59).

**Muslim access routes** [D] (BB1 KB p.48; OS text)

- To the Adriatic: a port on the Neretva and use of Ploče and Neum. Croats would lease Ploče and Rijeka facilities but refused sovereignty at Neum ([D] UK HoC RP94-62 via search).
- To the Sava: a rail line across Brčko to the Sava bridge. Brčko stays in the Serb republic and is reportedly demilitarised.

**Eastern enclaves** [D] (BB1 KB p.48; OS text)

- "A 3-kilometer corridor will connect the Muslim enclaves in eastern Bosnia".
- The Goražde–Žepa road is part of the Muslim republic.
- Srebrenica, Žepa and Goražde are Muslim.

**Bihać** [D] (BB1 KB p.50; search summary of the OS text and Cornell ILJ)

- The pocket is in the Muslim republic.
- Under the Invincible package the Serbs reportedly gained some Bihać-pocket territory in exchange for eastern concessions.

**Everything else [I]** follows the August 1993 front line. BB calls the plan "a thinly veiled partition … into three ethnic minirepublics with a nominal central government" (BB1 KB p.219).

### 2.4 Status and constitutional consequences

| Area | O-S provision | Confidence |
|---|---|---|
| State | "Union of Republics of Bosnia and Herzegovina", a confederal union with a figurehead central government (BB: "nominal"). Union citizenship. A rotating chairmanship of the three republic presidents. | [D] BB1 KB p.48, p.219; OS text excerpts (Liverpool copy) |
| RS | **First plan to give the Serbs an ethnically defined, largely contiguous republic.** It would hold about 49–52.5% as a constituent republic, but inside a Union. It is not the Dayton "Republika Srpska" as a named, recognised entity. The text anticipated the withdrawal of a republic (Annex A Part II areas would stay in the Union), which Serbs read as a road to secession. | [D] withdrawal clause (Liverpool copy summary); [U] for the exact republic names in the text |
| HRHB | Croat republic, about 17.5%. HR-HB proclaimed its republic on 28 August 1993 on the strength of this plan. | [D] BB1 KB p.48 |
| RBiH | Landlocked Muslim republic with access rights only; Sarajevo under the UN, not RBiH. Hence the condition "return of territory seized by force". | [D] BB1 KB p.49 |
| Armies | Not established in sources reached; demilitarisation of Sarajevo is documented | [U] |
| Sanctions | The later EU Action Plan tied FRY sanctions suspension to Serb concessions on this framework (§3) | [D] BB1 KB p.50 |

---

## 3. EU Action Plan, November 1993 – February 1994: the 33.3% demand

- **22 Nov 1993.** EU foreign ministers offer **gradual suspension of FRY sanctions** if the Bosnian Serbs make territorial concessions to the Muslims, a peace plan is implemented, and Belgrade cooperates on a Krajina modus vivendi. [D] BB1 KB p.50
- **Size of the ask.** The Serbs were to give up **3–4%** more territory, "in the order of magnitude of the demands made by the Bosnian Presidency". Tuzla airport was to reopen. [D] Deseret News 29 Nov 1993; peaceagreements.org EU Action Plan text, via search
- **29 Nov – 2 Dec, Geneva.** Talks fail over the government's map and a Serb "twin cities" proposal for Sarajevo, in which Muslims keep the centre and Serbs the southern and western suburbs. [D] BB1 KB p.51
- **21–23 Dec, Brussels.** Serbs and Croats agree a **Muslim republic of 33.3%**. The Bosniaks reject it because of *which* land is offered. The EU urges acceptance of the "Invincible Plan". [D] BB1 KB p.51; secondary for the 33.3%
- **January 1994.** UN document S/1994/173 records the Serbs **offering 33.56%** to the Muslim-majority republic. A Croat proposal of 10 Jan 1994 offers **33.3% to Muslims and 17.5% to Croats**. [D] via search summary
- **18–19 Jan and 10–12 Feb 1994.** Geneva talks fail. [D] BB1 KB p.52–53
- **Game relevance.** The EU Action Plan is not a separate map. It is O-S with Serbs at about 49% and Muslims at about 33.3%, plus a **sanctions-relief rider**. If the game models it, treat it as an O-S counter-offer: the 33/49/17.5 split, Sarajevo "twin cities" versus a unified UN district, and FRY sanctions suspension on acceptance.

---

## 4. Washington Agreement, 1–18 March 1994: Federation, not a peace plan

**Timeline**

- 23 Feb 1994: HVO–ARBiH ceasefire signed, effective 25 Feb. [D] BB1 KB p.54
- 1 Mar: framework agreement in Washington (Silajdžić, Granić, Zubak). [D] BB1 KB p.54
- 13 Mar: Split guidelines for a joint military. [D] BB1 KB p.54
- 18 Mar: Izetbegović, Tuđman and Zubak sign the Federation accord, together with a preliminary confederation agreement with Croatia. [D] BB1 KB p.54
- 24 Mar: the RS Assembly refuses to join. [D] BB1 KB p.54
- 27 Mar: the HR-HB Assembly endorses the Federation. [D] BB1 KB p.55
- 30 Mar: the Federation constitution is adopted unanimously. [D] BB1 KB p.55
- 7–11 May (Vienna): agreement on delineating cantons and leadership posts. [D] BB1 KB p.57
- 30 May: Zubak named Federation President, Ganić Vice-President. [D] BB1 KB p.57
- 23 Jul: EU Administration of Mostar begins. [D] BB1 KB p.59

**Consequences to model**

| Consequence | Detail | Confidence |
|---|---|---|
| End of the war | The RBiH–HRHB war ends | [D] |
| Federation | HRHB is merged de jure into the Federation of BiH, with cantons and Croat–Bosniak parity in the top offices | [D] |
| Joint army | A joint command on paper; separate ARBiH and HVO in practice | [D] for the plan; [I] for practice |
| Croatia | Preliminary confederation agreement signed 18 Mar 1994 ([D] BB1 KB p.54). Follow-up on 24 Mar 1995: a Federation–Croatia economic and customs agreement, with a reciprocal sea-access agreement under review. | [D] BB1 KB p.69 |
| Mostar | EU administration | [D] |
| RS | **No territorial change** | [D] |
| Territorial claim | The Federation was to claim the Bosniak/Croat-majority areas. A 58% Federation claim in spring 1994 is my recollection only. | [U] |

---

## 5. Contact Group plan, May – August 1994: 51/49

### 5.1 Dates and responses

| Date | Event | Week | Source |
|---|---|---|---|
| 26 Apr 1994 | Contact Group first meets | 107 | [D] BB1 KB p.56 |
| 13 May (Geneva) | Strategy agreed: 4-month ceasefire, **51% for the Croat–Muslim federation**, sanctions continued with easing if Belgrade cooperates | 109.4 | [D] BB1 KB p.57 |
| 16 / 28 Jun | Map discussed in London; agreed in Paris with an incentives package | 114 | [D] BB1 KB p.58 |
| 6 Jul (Geneva) | Plan presented, take-it-or-leave-it, two weeks to respond | 117.3 | [D] BB1 KB p.58 |
| 18 Jul | **Bosnian Assembly approves** | 119.1 | [D] BB1 KB p.58 |
| 20 Jul | RS "conditionally" accepts, which the Contact Group reads as **rejection** (six conditions, incl. map corrections, sea access, FRY sanctions lifted) | 119.4 | [D] BB1 KB p.59; secondary for the conditions |
| 28 Jul | RS Assembly rejects a second time | 120.4 | [D] BB1 KB p.59 |
| 4 Aug | **Milošević imposes a political and economic blockade on the Bosnian Serbs** | 121.3 | [D] BB1 KB p.59 |
| 27–28 Aug | **RS referendum "overwhelmingly rejects"**, about 96% against | 124.9 | [D] BB1 KB p.61; secondary for the percentage |
| Sep 1994 | Border monitors accepted by Belgrade; FRY sanctions eased and RS sanctions tightened (UNSCR 943 and 942, 23 Sep 1994) | ~128 | [D] BB1 KB p.61 for the process; resolution numbers from my knowledge [U] |
| 3 Nov 1994 | UNGA non-binding vote to lift the arms embargo in six months if the Serbs keep rejecting | 134 | [D] BB1 KB p.63 |

### 5.2 Territory

| Party | Share | Source |
|---|---|---|
| Federation | **51%** | [D] BB1 KB p.57 |
| RS | **49%** | [D] |

The Contact Group did **not** divide the Federation's 51% between Bosniaks and Croats. The nearest historical anchor is the January 1994 33.3/17.5 Bosniak/Croat proposal (§3), which totals about 51%.

The Serbs held about 70% at the time, so the plan required them to cede roughly 21 points of BiH. Secondary sources say "22% of the territory currently controlled", or "a third less than they held".

### 5.3 The map

What is documented:

- Srebrenica, Žepa and Goražde are assigned to the Federation, with Goražde linked by a corridor. [D] secondary summaries; Australian Parliament JFADT report ch.4
- The UN map (record 705480) shows three categories: "Bosnian Serb Republic", "Muslim-Croat Federation" and a **"neutral zone"**. The neutral zone is most likely Sarajevo under interim UN administration. One secondary source instead says Sarajevo was "reunified within the Federation". [D] for the legend; [I] for the reading
- Brčko is demilitarised and the Posavina corridor stays with the Serbs. [D] secondary summary

Everything else is **not documented in reachable sources**. Rule [I]:

- Federation-held areas in mid-1994 stay Federation.
- The VRS core far from the documented cessions stays RS.

**42 municipalities are marked unknown.** That covers western Bosnia, Posavina, Ozren/Doboj, the Drina valley and the Sarajevo suburbs. Under this rule the RS share comes out at 58%, against the documented 49%. So about 9% of BiH that the plan moved to the Federation is unlocated.

Recommendation: either digitise UN map record 705480 or the Library of Congress "Dayton Accords map collection" (which overlays the Contact Group line), or label any proxy as non-historical. **Do not use the Dayton IEBL as a proxy for the Contact Group map.** Dayton swapped the eastern enclaves, which fell to the VRS in July 1995, for western Bosnia and all of Sarajevo, so the two maps differ greatly.

### 5.4 Status consequences

| Area | Provision | Confidence |
|---|---|---|
| State | One state, two entities: Federation and Serb entity | [D] |
| Serb entity | RS demanded the right to confederate with the FRY, in parallel with the Federation–Croatia link. Not granted in July 1994. | [I] |
| Sarajevo | Neutral or UN zone | [I] |
| Federation sanctions/arms | Arms embargo lift threatened if RS refused | [D] BB1 KB p.63 |
| FRY sanctions | Eased on acceptance or Belgrade cooperation; tightened on RS rejection | [D] BB1 KB p.57, p.61 |
| Patron | Belgrade blockade of RS on 4 Aug 1994 | [D] BB1 KB p.59 |

---

## 6. Dayton / General Framework Agreement for Peace (GFAP), September – December 1995

### 6.1 Dates

| Date | Event | Week | Source |
|---|---|---|---|
| 29–30 Aug 1995 | Bosnian Serbs give Milošević authority to negotiate for them | 177 | [D] BB1 KB p.76; BB1 KB p.433 |
| **8 Sep 1995** | **Geneva Agreed Basic Principles.** BiH continues within its present borders, internationally recognised. Two entities: "the Federation … established by the Washington Agreement" and **"the Republic Srpska"**. "The 51:49 parameter of the territorial proposal of the Contact Group is the basis … open for adjustment by mutual agreement." Each entity keeps its present constitution, amended. | 178.4 | [D] OHR / peaceagreements.org text |
| 26 Sep 1995 | New York Further Agreed Basic Principles: joint institutions and the constitutional court | 181 | [D] |
| 5 Oct / 12 Oct 1995 | Ceasefire agreed, effective 12 October. Fighting in the northwest continues for about a week. | 183.4 | [D] BB1 KB p.429; BB1 KB p.76 |
| **1 Nov 1995** | Dayton talks open at Wright-Patterson AFB. **BB1 KB p.76 gives "12 November", which is wrong.** | 186.3 | [D] GFAP; Holbrooke |
| **21 Nov 1995** | GFAP **initialled**. BB1 KB p.429 says "signed", which is inaccurate. | 189.1 | [D] |
| **14 Dec 1995** | **Signed in Paris** | 192.4 | [D] |
| D+45 (3 Feb 1996) and D+90 (Mar 1996) | Inter-entity transfers (§6.3) | – | [D] OHR chronology 1996 |
| 5 Mar 1999 / 8 Mar 2000 | Brčko Final Award; Brčko District established | – | [D] |

### 6.2 Territory

| Unit | Share | Source |
|---|---|---|
| Federation | **51%** (repo polygons: 50.9%) | [D] GFAP; repo data |
| RS | **49%** (repo polygons: 48.1%) | [D] |
| Brčko District | 1.0%, carved from both after 2000 | [D] |
| Inside the Federation, by end-of-war administrator / canton | HRHB-run ≈ 13.7% wholly, plus Croat parts of split municipalities; RBiH-run ≈ 20.2% wholly, plus parts | [I] (RULE-FED-LAYER) |

The GFAP does **not** split the Federation between Bosniaks and Croats.

### 6.3 The map: IEBL per municipality

All of this is documented: entity per pre-war municipality from `municipality_post1995_to_mun1990.json`.

**Wholly RS: 33 municipalities**

Banja Luka, Bijeljina, Bileća, Bosanska Dubica, Bosanska Gradiška, Bosanska Kostajnica, Bosanski Brod, Bosanski Novi, Bratunac, Čajniče, Čelinac, Derventa, Gacko, Han Pijesak, Kalinovik, Kotor Varoš, Laktaši, Ljubinje, Modriča, Mrkonjić Grad, Nevesinje, Prijedor, Prnjavor, Rogatica, Rudo, Šekovići, Šipovo, Sokolac, Srbac, Srebrenica, Teslić, Višegrad, Vlasenica.

**Wholly Federation: 46 municipalities**

Banovići, Bihać, Bosansko Grahovo, Breza, Bugojno, Busovača, Cazin, Čapljina, Centar, Čitluk, Donji Vakuf, Duvno, Fojnica, Glamoč, Gornji Vakuf, Grude, Hadžići, Ilijaš, Jablanica, Kakanj, Kiseljak, Kladanj, Konjic, Kreševo, Lištica, Livno, Ljubuški, Lukavac, Maglaj, Neum, Novi Grad, Novi Travnik, Olovo, Posušje, Prozor, Srebrenik, Tešanj, Travnik, Tuzla, Vareš, Velika Kladuša, Visoko, Vitez, Vogošća, Zavidovići, Zenica, Žepče, Živinice.

**Split by the IEBL: 30 municipalities**

Federation share of area in brackets; the RS part is named after the dash.

- Bosanska Krupa (86%) – Krupa na Uni
- Bosanski Petrovac (83%) – Petrovac
- Bosanski Šamac (18%; Domaljevac-Šamac) – Šamac
- Doboj (6%; Doboj-Istok, Doboj-Jug) – Doboj
- Foča (13%; Foča-Ustikolina) – Foča/Srbinje
- Goražde (67%) – Novo Goražde
- Gračanica (66%) – Petrovo
- Gradačac (65%) – Pelagićevo
- Ilidža (82%) – Istočna Ilidža
- Jajce (85%) – Jezero
- Kalesija (71%) – Osmaci
- Ključ (40%) – Ribnik
- Kupres (93%) – Kupres RS
- Lopare (32%; Čelić) – Lopare
- Mostar (93%) – Istočni Mostar
- Novo Sarajevo (20%) – Istočno Novo Sarajevo
- Odžak (70%) – Vukosavlje
- Orašje (76%) – Donji Žabar
- Pale (15%; Pale-Prača) – Pale
- Sanski Most (79%) – Oštra Luka
- Skender Vakuf (16%; Dobretići) – Kneževo
- Stari Grad (37%) – Istočni Stari Grad
- Stolac (52%) – Berkovići
- Drvar (88%) – Istočni Drvar
- Trebinje (26%; Ravno) – Trebinje
- Trnovo (76%) – Trnovo RS
- Ugljevik (15%; Teočak) – Ugljevik
- Zvornik (25%; Sapna) – Zvornik

**Arbitration: 1**

- Brčko: Annex 2 Article V, then the Brčko District. [D]

**Caveats on the repo data**

- The xlsx names both Goražde parts "Novo Goražde". This is a data error; the FBiH part is Goražde.
- Later-created municipalities can hide minor splits. Usora, for example, is mapped only to Tešanj, though it was formed from parts of Tešanj, Teslić and Doboj.

**Changes relative to the 12 October 1995 ceasefire line**

- **RS to Federation**
  - The Serb-held Sarajevo suburbs: Ilidža, Vogošća, Ilijaš, Hadžići and Grbavica. Handovers ran from 24 Feb to 18–19 Mar 1996, and roughly 60,000+ Serbs left. [D] OHR chronology 1996; secondary
  - The **Goražde land corridor**, through Foča-Ustikolina and Pale-Prača. [D] entity outcome; [I] route detail
  - **Odžak**, which the VRS had held since July 1992. [I] for the 1992 control date
  - The town of Trnovo. [I]
- **Federation, HV or HVO to RS**
  - **Mrkonjić Grad**, taken by HV/HVO in October 1995 (BB1 KB p.427), and **Šipovo**, taken in September 1995. Mrkonjić Grad was part of "the anvil" returned at D+45. [D] OHR 1996; BB1-1995
  - The south of Jajce (Jezero) and the eastern fringes of Drvar, Petrovac, Ključ (Ribnik) and Sanski Most (Oštra Luka). [D] entity outcome
- **Held by the Federation as captured in 1995** [D] BB1 KB p.402–427
  - Taken by HV/HVO: Grahovo and Glamoč (28 July); Drvar (Sept); Kupres (since Nov 1994).
  - Taken by ARBiH: Donji Vakuf (10–14 Sept); Petrovac and Ključ (Sept); Sanski Most (Oct).
- **Brčko** stayed VRS-held on the ground and went to arbitration. The width of the Posavina corridor was the dispute. [D]
- **Holbrooke's map figures** — the Sarajevo concession pushed the map to about 55/45, and the restore to 51/49 came mainly through the western-Bosnia returns. This is from my recollection of Holbrooke, *To End a War*, and is **not verified** this session. [U]

### 6.4 Status consequences

| Area | GFAP provision | Confidence |
|---|---|---|
| State | "Bosnia and Herzegovina" continues its legal existence within its borders (Annex 4 Art. I). Two entities, the Federation of BiH and **Republika Srpska**. **This is the first time RS is internationally recognised by name as an entity**, prefigured by the Geneva Basic Principles of 8 Sep 1995. | [D] GFAP Annex 4; Geneva ABP |
| Entity powers | The state has a short list of powers: foreign policy, foreign trade, customs, monetary policy, immigration and refugees, inter-entity law enforcement, communications, inter-entity transport, air traffic. **Everything else belongs to the entities.** Entities may form special parallel relationships with neighbouring states (RS with the FRY, Federation with Croatia). | [D] Annex 4 Art. III |
| Institutions | Three-member Presidency (Bosniak and Croat from the Federation, Serb from RS). Assembly seats two-thirds Federation, one-third RS. House of Peoples 5/5/5 with a vital-interest veto. Constitutional Court with 3 international judges. | [D] Annex 4 |
| RS contiguity | The Posavina corridor stays in RS. The Brčko width question goes to arbitration, and the 1999 Award makes Brčko a District shared by both entities. | [D] Annex 2 Art. V |
| Armies | **Each entity keeps its own army** (VRS; ARBiH plus HVO as the Federation Army). Zone of separation 2 km each side of the ceasefire line, with withdrawals and cantonment (Annex 1A). Arms control under Annex 1B. A single state army came only with the 2005 reform. | [D] Annex 1A/1B; [I] for the 2005 date |
| Sarajevo | Unified inside the Federation | [D] |
| Mostar | Federation city under an Interim Statute; EU administration until July 1996 | [D] |
| Goražde | Joined to the Federation by a corridor | [D] |
| Refugees | Right to return home and to property (Annex 7) | [D] Annex 7 |
| International administration | High Representative (Annex 10); IFOR of about 60,000 (Annex 1A); OSCE-run elections (Annex 3, held Sept 1996); IPTF (Annex 11); Human Rights Commission (Annex 6) | [D] Annexes |
| ICTY | Indictees barred from office; cooperation required | [D] Annex 4 Art. IX |
| Sanctions | UNSCR 1022 (22 Nov 1995) suspends FRY sanctions; UNSCR 1021 phases out the arms embargo; UNSCR 1074 (1 Oct 1996) terminates the sanctions | [I] — my knowledge, not re-fetched |

---

## 7. Corrections to `src/sim/negotiation/peace_plan_data.ts`

These also apply to `historical_envelopes.ts`, which duplicates the splits.

### Engine model

1. **Peace should not freeze the front lines.** None of the four plans froze the current lines.
   - VOPP required the VRS to withdraw from more than 20% of BiH (BB1 KB p.218).
   - The Contact Group plan required the Serbs to cede about a third of their holdings.
   - Dayton moved specific areas both ways: the Sarajevo suburbs and Goražde corridor to the Federation; Mrkonjić Grad and Šipovo to RS.

   Acceptance should apply the plan map in `plan_maps.json` and the status flags in §§1.4, 2.4, 5.4 and 6.4.

### Vance–Owen

2. **Split.** `{RBiH:39, RS:43, HRHB:18}` is only partly supported.
   - RS 43 is documented (BB1 KB p.218).
   - **HRHB 18 is too low.** The Croats led three provinces (3, 8 and 10; Prlić TJ); my area check gives about 24–26%, and secondary sources give 24.5%.
   - RBiH is about 25–28% for provinces 1, 5 and 9, plus Sarajevo province 7 (about 4–6%), which was power-shared.
   - Suggested values: **RBiH ≈ 31–33 (with Sarajevo), RS 43, HRHB ≈ 24–25**, or model province 7 separately.
   - The comment "Owen Balkan Odyssey pp. 98–105" could not be verified.
3. **Timing.** `trigger_week: 40` (11 Jan 1993) is fine for the offer; the plan was presented on 2 Jan, week 38.7. The decisions came later:
   - Croats in January 1993;
   - RBiH signed at week 50.4;
   - Karadžić signed at week 55.9;
   - the RS Assembly rejected at week 56.4;
   - the referendum was at week 57.9.

   Responses `{RBiH accepted, RS rejected, HRHB accepted}` are correct as **final** responses. RBiH initially accepted only the constitution (BB1 KB p.43), and Karadžić's Athens signature was conditional.
4. **Narrative.**
   - "Withdraw from roughly 30% of the territory it currently holds": the documented formulation is "more than 20 percent of the 65 to 70 percent … leaving them only 43" (BB1 KB p.218). That is a withdrawal from about a third of their holdings.
   - "Three Bosniak-majority, three Serb-majority, three Croat-majority" matches Prlić and klix. BB instead says two Croat plus one mixed Croat–Muslim. Both readings exist.
   - Add the status facts: no Serb republic, non-contiguous Serb provinces, and Posavina (province 3) cutting the corridor.

### Owen–Stoltenberg

5. **Split.** `{RBiH:33, RS:52, HRHB:15}` mixes two documents, and **Croats at 15% has no source.** Use one of:
   - **20 Aug 1993 map: 30 / 52.5 / 17.5** (text floor 30% Muslim);
   - **20 Sep 1993 Invincible: 33 / 49 / 17.5** (BB1 KB p.48).

   The comment "Owen Balkan Odyssey pp. 214–219" was not verified.
6. **Narrative is wrong on Serb reactions.** "The Serbs find the territorial allocation insufficient given their military holdings" is incorrect: the **RS Assembly accepted unconditionally on 28 Aug 1993** (BB1 KB p.47). It was the HR-HB Assembly that demanded more territory (and proclaimed the HR-HB republic), and RBiH rejected. After Invincible, RBiH gave a conditional acceptance (29 Sep), and HRHB and RS then withdrew their concessions (1–2 Oct).
7. **`historical_envelopes.ts` citations.**
   - RS "accept" cites BB1 p.45, which is Milošević's 19 June proposal. The RS Assembly acceptance is **BB1 KB p.47** (28 Aug).
   - The HRHB rider "withdraw territorial concessions" is the 1 Oct post-Invincible event (p.49). The 28 Aug HRHB response was "endorse, but more territory for Croats" (p.47–48).
8. **Trigger.** `trigger_week: 70` (9 Aug) falls between the 30 Jul constitutional plan (week 68.6) and the 20 Aug map (week 71.6), which is acceptable. Consider a second stage at week 76 for Invincible and an EU Action Plan stage at week 85.

### Contact Group

9. **Split.** `{RBiH:33, RS:49, HRHB:18}`: RS 49 and Federation 51 are documented. The 33/18 internal split is **not part of the Contact Group plan**. Label it as a game inference anchored on the January 1994 33.3/17.5 proposal.
10. **Narrative.**
    - "Belgrade sanctions … rupture" is correct: Milošević's blockade of 4 Aug 1994 (BB1 KB p.59).
    - The Contact Group was the US, Russia, UK, France and Germany. The narrative is right; BB1 KB p.56 wrongly lists "Russia, the EU, the UN, and the United States".
    - The RS rejection path was: conditional acceptance on 20 Jul, which counted as rejection; assembly rejection on 28 Jul; referendum on 27–28 Aug.

### Dayton

11. **Split.** RS 49 and Federation 51 are documented; the 33/18 internal split is a game inference, as above. The code comment says Dayton "ratified" the Contact Group framework. Only the **51:49 parameter** carried over (Geneva Agreed Basic Principles); **the map was substantially different.**

    The narrative line "ratifies the Contact Group framework that RS rejected by referendum in 1994" should become: "keeps the Contact Group's 51:49 parameter, but on a new map: Sarajevo unified in the Federation, Srebrenica and Žepa now in RS, western Bosnia in the Federation".
12. **Status.** The narrative should name the RS-specific consequence: "Republika Srpska" is recognised by name as one of two entities, keeps its army, keeps the Posavina corridor, and Brčko goes to arbitration. None of the earlier plans gave this. VOPP abolished RS as a unit; O-S gave it only as a republic in a Union.
13. **Trigger and dates.** `trigger_week: 185` (23 Oct 1995) falls between the ceasefire (week 183.4) and the opening of talks on **1 Nov** (week 186.3). Initialling was on 21 Nov (week 189.1) and signing on 14 Dec (week 192.4). The comment "Initialed Dayton … 21 November 1995; signed Paris 14 December 1995" is correct.
14. **Unverified citation.** "ICTY IT-95-5/18-T Vol. 4 §§4900–4940" (Karadžić) could not be verified in this session. Re-check it before keeping it.

### Missing plans

15. Consider adding **EU Action Plan** as an O-S variant (week ~85; 33.3% Muslim; FRY sanctions suspension rider). Consider adding **Washington** as a non-territorial RBiH–HRHB settlement event (week ~99–101.6): end of that war, HRHB merged into the Federation, Mostar under the EU. Neither is currently in `PEACE_PLANS`.

---

## 8. Short reference list

**ICTY judgements** (via WebSearch summaries of icty.org)

- Kordić & Čerkez TJ, IT-95-14/2-T, 26 Feb 2001, Part III ch. IV.
- Blaškić TJ, IT-95-14-T, 3 Mar 2000.
- Prlić et al. TJ, IT-04-74-T, 29 May 2013, Vol. 1.

**UN documents**

- S/25479 (26 Mar 1993), the VOPP package.
- UNSCR 820 (17 Apr 1993).
- S/26486 and S/26337/Add.1 (Invincible annex), catalogue only.
- S/1994/173 (Serb offer of 33.56%).
- A/54/549 (15 Nov 1999), *The fall of Srebrenica*.
- UN Yearbook 1993 p.479.
- UN Digital Library map record 705480 (Contact Group, July 1994).

**Peace texts**

- Owen–Stoltenberg Agreement relating to BiH (peaceagreements.org #472; Liverpool archive copy).
- EU Action Plan (peaceagreements.org #1179).
- Geneva Agreed Basic Principles, 8 Sep 1995 (OHR; peaceagreements.org #77).
- New York Further Agreed Basic Principles, 26 Sep 1995 (#78).
- GFAP and Annexes 1A, 1B, 2, 3, 4, 6, 7, 10 and 11.

**CIA, *Balkan Battlegrounds***

- BB1 KB pp.42–76 (chronology).
- BB1 KB p.218–219 (Ch. 34, Vance–Owen and Invincible).
- BB1 KB p.225.
- BB1 KB pp.402–433 (1995 offensives, ceasefire, Dayton).
- BB2 KB p.452.

**Secondary sources**

- klix.ba (2023, VOPP).
- posavina.org (Province 3).
- IZIZ Univ. Sarajevo, *Srebrenica 1992–1995*.
- Mearsheimer & Pape, "The Answer" (1993).
- HD Centre, *Never Again* (2017).
- Australian Parliament JFADT Bosnia report ch. 4.
- UK House of Commons research papers RP94-62, RP95-55 and RP96-80.
- OHR Chronology 1996.

**Books** (cited only at book or chapter level; pages not verified this session)

- Owen, *Balkan Odyssey* (1995).
- Burg & Shoup, *The War in Bosnia-Herzegovina* (1999).
- Holbrooke, *To End a War* (1998).
- Silber & Little, *The Death of Yugoslavia* (1996).
