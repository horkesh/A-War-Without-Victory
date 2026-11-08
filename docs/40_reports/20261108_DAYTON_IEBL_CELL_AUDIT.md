# Dayton IEBL per-cell audit (historian seat, 2026-11-08)

Research output of the historian seat for DC plan stage 1 (opening boundary). Companion file: `data/source/peace_plans/dayton_cell_assignments.json` (schema `dayton_cell_assignments/v1`, 252 cells), validated by `tools/peace/build_peace_settlement_maps.cjs` into `data/derived/peace/plan_cell_assignments.json` and applied by `src/sim/negotiation/peace_settlement.ts` before the municipality quota pass. Pipeline scripts and evidence tables are in `tools/peace/iebl_cell_audit/`.

**Totals:** 252 cells in scope; confidence verified 190, approximate 57, unresolved 5.

## 1. Method

1. **Enumeration.** Every cell id (`op:<mun>:<cell>`) in `data/derived/operational/osid_areas.json` whose middle segment is one of the 34 municipalities in scope (28 split municipalities + Srebrenica, Bratunac, Čajniče, Rogatica (holds Žepa; there is no `zepa` municipality key), Višegrad, Brčko). 252 cells, all present in `operational_settlements.geojson`.
2. **The IEBL at settlement resolution.** The repo already holds the implemented IEBL, although not under that name: `data/source/bih_census_1991.json` is the 1991 census as republished by the BiH Agency for Statistics on the post-1995 (Dayton) municipal structure. Every 1991 settlement carries the post-1995 municipality code (`1xxxx` = Federation, `2xxxx` = Republika Srpska, `3xxxx` = Brčko District). Settlements cut by the IEBL appear twice, once per side, with the population of each part (e.g. Trnovo 114 FBiH / 1,985 RS; Prača 710 FBiH / 314 RS). The post-1995 municipal boundaries *are* the IEBL inside split pre-war municipalities, so this gives the line at settlement resolution, which is finer than the cells.
3. **Join.** cell -> `constituent_sids` -> `settlements_wgs84_1990.geojson` (`census_ids`) -> census code -> entity. Each member settlement's polygon area (km², shoelace on a local equirectangular projection) is attributed to its entity; split settlements are attributed in proportion to the BHAS population split. Result per cell: area share and population share per entity, listed in `work/cells_computed.json` and `work/crossed_cells.txt`.
4. **Rules applied** (recorded in each cell's `rule` field):
   - `A2-SETTLEMENT`: all member settlements lie in one post-1995 municipality -> that entity, confidence *verified*.
   - `A2-MAJORITY-AREA x%`: the cell is crossed by the IEBL; it goes to the side holding the larger area. *Verified* when the minority share is under 15 %, *approximate* otherwise.
   - `A2-PRINCIPAL-SETTLEMENT override`: used only when the area majority is below 60 % **and** both the population majority and the cell's principal settlement (namesake / largest town) lie on the other side. Applied to 6 cells (Domaljevac, Kolovarice, Gornji Svilaj, Podgrab, Prača, Pješivac-Kula).
   - *Unresolved*: area majority >= 60 % but population majority and principal settlement on the other side (Oštra Luka/Donji Žabar, Stari Majdan, Veličani/Ravno, Tošići, Trnovo). The entity field carries the area-rule answer; the owner decides.
   - `FED-LAYER`: inside the Federation the faction follows the existing RULE-FED-LAYER convention of `plan_maps_research.json` (party administering the ground at war end / Washington cantonal arrangement; Croat-majority cantons 2, 8, 10 and HDZ-run municipalities of mixed cantons 6 and 7 -> HRHB; otherwise RBiH). The canton membership is documented (Law on Federal Units, 12 Jun 1996); the HDZ-run reading of Jajce, Dobretići, Stolac and Ravno is an inference and caps those cells at *approximate*. Mostar is assigned per cell from the ICTY Prlić judgement front line and the Feb 1996 Interim Statute (three Croat west, three Bosniak east city-municipalities).
   - `A2-ART-V`: all 13 Brčko cells are `special`; Annex 2 Art. V put the disputed line to arbitration and the Final Award (5 Mar 1999, para 11) made the entire pre-war opština the District. The interim 1995-2000 RS/Federation portion of each cell is noted in `evidence`.
5. **Wartime control** (`political.political_controllers` of the reference save) was used only for the difference list in §5. That save is an *emergent* RS run at turn 104 (~April 1994), not a historical end-state, so differences are expected and not all of them are Dayton transfers.

## 2. Sources consulted

Primary / judicial first, then BB, then secondary, per the historian source rule.

- **GFAP Annex 2** (Agreement on Inter-Entity Boundary Line and Related Issues), Arts I-VII and Appendix: https://www.ohr.int/dayton-peace-agreement/annex-2/ (fetched; Art. V arbitration text and the 'administered as currently' clause quoted from it).
- **Brčko Arbitral Tribunal, Final Award, 5 Mar 1999**: https://www.ohr.int/?p=111275 (fetched). Para 9: each entity delegates its powers within the pre-war Brčko opština; para 11: the whole opština is held in condominium; para 39: 'the RS portion and the Federation portion of the Brcko Opstina' continue under their laws until harmonised.
- **ICTY Prlić et al., Trial Judgement IT-04-74-T, 29 May 2013, Vol. 2** (https://www.icty.org/x/cases/prlic/tjug/en/130529-2.pdf, fetched and text-extracted): para 782 (Mostar front line along the Bulevar and Šantićeva Street, ABiH east of it), para 917 (HVO-ABiH fighting at Buna, Gubavica, Lakševine, July 1993), para 991 (East Mostar and connected sectors, notably Blagaj, under siege Jun 1993 - Apr 1994), para 694 fn 1552 (HV 8th Light Assault Bde in Buna), para 1897 (HVO 1st Knez Domagoj Bde took Stolac June 1992), Stolac chapter (removal of Muslims Jul-Aug 1993).
- **UN A/54/549** (Fall of Srebrenica) for the enclave outcome, as already cited in `plan_maps_research.json`.
- **Balkan Battlegrounds KB** (`data/derived/knowledge_base/balkan_battlegrounds/pages`, KB page ids): BB1 p0175 (Ustikolina, Apr 1992), p0182 (VRS takes Odžak 12 Jul 1992), p0217 and p0437 (HVO Orašje pocket; 202nd Home Defence Regt Domaljevac-Grebnice, 106th at Oštra Luka), p0419-0420 (ARBiH 5th Corps takes Petrovac, Ključ 17 Sep, drive on Sanski Most; HV/HVO toward Jajce), p0439 (VRS sectors opposite Teočak and Sapna, 1995), p0442 (SRK 1st Sarajevo Mech Bde vic. Grbavica-Lukavica), p0443 (Treskavica-Trnovo 1995), p0500 (VRS 3rd Posavina LIB HQ Pelagićevo), p0509 and p0514 (ARBiH brigades at Klokotnica, Čelić, Teočak, Kalesija, Sapna); BB2 p0401 (208th Čelić Bde, 107th Gradačac Bde), p0409-0410 (Ustiprača line 1993; Trnovo-Goražde corridor, Jabuka-Grebak route), p0478-0479 (VRS advance through Kopači, Apr 1994), p0481 (Prača Battalion), p0490-0491 ('Sapna thumb' 1994), p0527 (Kupres falls to HVO/ARBiH 3 Nov 1994).
- **Repo data**: `data/source/bih_census_1991.json` (BHAS 1991 census on post-1995 borders), `data/source/municipality_post1995_to_mun1990.json` (142 post-1995 municipalities, names/codes), `data/derived/settlements_wgs84_1990.geojson`, `data/derived/operational/operational_settlements.geojson`, `data/derived/operational/osid_areas.json`, `data/source/peace_plans/plan_maps_research.json` (dayton entries, RULE-FED-LAYER), `docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md` §6.
- **Secondary cross-checks (Wikipedia raw wikitext, fetched)**: 'Inter-Entity Boundary Line' (table of FBiH/RS municipality pairs, matches the BHAS pairing exactly), 'Bosnian-Podrinje Canton Goražde' (municipalities Goražde, Foča-Ustikolina, Pale-Prača), 'Brčko District' (Final Award date 5 Mar 1999; Statute 8 Mar 2000), 'Goražde' ('After the Dayton Agreement, a land corridor was established between Goražde and the Federation'), 'Siege of Goražde' (split into Novo Goražde RS / Goražde FBiH), 'Mostar' (Feb 1996 Interim Statute: six city-municipalities, three Croat west, three Bosniak east, plus a Central Zone), 'Cantons of the Federation of BiH' (Law on Federal Units 12 Jun 1996; 5 Bosniak-majority, 3 Croat-majority, 2 mixed cantons).

Not reachable or not used: the 1:50,000 Annex 2 Appendix map sheets themselves (not online); OHR's Mostar Interim Statute text (not located); Wikipedia stubs for Rahić-Brčko / Ravne-Brčko (rate-limited). The pre-2000 Brčko portions are therefore recorded from Final Award para 39 plus the ceasefire geography, as *approximate* notes only.

## 3. Per-municipality summary

Area shares are over the cells as assigned (whole cells), so they differ from the polygon-exact shares in `plan_maps_research.json`.

| Municipality | Cells | Entity (cells) | Faction (cells) | Area share by assigned entity | Verified | Approx. | Unresolved |
|---|---|---|---|---|---|---|---|
| bosanska_krupa | 9 | FED 8, RS 1 | RBiH 8, RS 1 | FED 89.6%, RS 10.4% | 7 | 2 | 0 |
| bosanski_petrovac | 8 | FED 8 | RBiH 8 | FED 100.0% | 7 | 1 | 0 |
| bosanski_samac | 5 | FED 1, RS 4 | HRHB 1, RS 4 | FED 32.7%, RS 67.3% | 4 | 1 | 0 |
| doboj | 13 | FED 3, RS 10 | RBiH 3, RS 10 | FED 11.5%, RS 88.5% | 13 | 0 | 0 |
| foca | 14 | FED 3, RS 11 | RBiH 3, RS 11 | FED 14.4%, RS 85.6% | 12 | 2 | 0 |
| gorazde | 17 | FED 13, RS 4 | RBiH 13, RS 4 | FED 75.8%, RS 24.2% | 13 | 4 | 0 |
| gracanica | 5 | FED 4, RS 1 | RBiH 4, RS 1 | FED 67.0%, RS 33.0% | 4 | 1 | 0 |
| gradacac | 6 | FED 4, RS 2 | RBiH 4, RS 2 | FED 64.3%, RS 35.7% | 4 | 2 | 0 |
| ilidza | 5 | FED 3, RS 2 | RBiH 3, RS 2 | FED 65.6%, RS 34.4% | 4 | 1 | 0 |
| jajce | 10 | FED 8, RS 2 | HRHB 8, RS 2 | FED 83.4%, RS 16.6% | 1 | 9 | 0 |
| kalesija | 6 | FED 4, RS 2 | RBiH 4, RS 2 | FED 59.0%, RS 41.0% | 4 | 2 | 0 |
| kljuc | 7 | FED 4, RS 3 | RBiH 4, RS 3 | FED 46.0%, RS 54.0% | 7 | 0 | 0 |
| kupres | 5 | FED 4, RS 1 | HRHB 4, RS 1 | FED 86.7%, RS 13.3% | 4 | 1 | 0 |
| lopare | 9 | FED 3, RS 6 | RBiH 3, RS 6 | FED 31.5%, RS 68.5% | 7 | 2 | 0 |
| mostar | 9 | FED 9 | HRHB 3, RBiH 6 | FED 100.0% | 3 | 6 | 0 |
| novo_sarajevo | 2 | FED 1, RS 1 | RBiH 1, RS 1 | FED 26.2%, RS 73.8% | 2 | 0 | 0 |
| odzak | 3 | FED 3 | HRHB 3 | FED 100.0% | 0 | 3 | 0 |
| orasje | 3 | FED 2, RS 1 | HRHB 2, RS 1 | FED 50.4%, RS 49.6% | 1 | 1 | 1 |
| pale | 8 | FED 3, RS 5 | RBiH 3, RS 5 | FED 10.7%, RS 89.3% | 6 | 2 | 0 |
| sanski_most | 10 | FED 6, RS 4 | RBiH 6, RS 4 | FED 65.5%, RS 34.5% | 7 | 2 | 1 |
| skender_vakuf | 4 | FED 1, RS 3 | HRHB 1, RS 3 | FED 42.5%, RS 57.5% | 3 | 1 | 0 |
| stari_grad_sarajevo | 2 | FED 2 | RBiH 2 | FED 100.0% | 2 | 0 | 0 |
| stolac | 5 | FED 4, RS 1 | HRHB 4, RS 1 | FED 75.9%, RS 24.1% | 1 | 4 | 0 |
| titov_drvar | 3 | FED 3 | HRHB 3 | FED 100.0% | 2 | 1 | 0 |
| trebinje | 7 | FED 2, RS 5 | HRHB 2, RS 5 | FED 22.6%, RS 77.4% | 2 | 4 | 1 |
| trnovo | 6 | FED 5, RS 1 | RBiH 5, RS 1 | FED 88.6%, RS 11.4% | 2 | 2 | 2 |
| ugljevik | 6 | FED 2, RS 4 | RBiH 2, RS 4 | FED 23.1%, RS 76.9% | 5 | 1 | 0 |
| zvornik | 9 | FED 2, RS 7 | RBiH 2, RS 7 | FED 26.3%, RS 73.7% | 7 | 2 | 0 |
| srebrenica | 13 | RS 13 | RS 13 | RS 100.0% | 13 | 0 | 0 |
| bratunac | 8 | RS 8 | RS 8 | RS 100.0% | 8 | 0 | 0 |
| cajnice | 5 | RS 5 | RS 5 | RS 100.0% | 5 | 0 | 0 |
| rogatica | 8 | RS 8 | RS 8 | RS 100.0% | 8 | 0 | 0 |
| visegrad | 9 | RS 9 | RS 9 | RS 100.0% | 9 | 0 | 0 |
| brcko | 13 | special 13 | n/a 13 | special 100.0% | 13 | 0 | 0 |
| **Total** | **252** | | | | **190** | **57** | **5** |

### 3.1 Cells crossed by the IEBL (minority share >= 3 %)

| Cell | Area FED/RS % | Pop FED/RS % | Assigned | Rule | Confidence |
|---|---|---|---|---|---|
| op:bosanska_krupa:arapusa_2 | 78.9/21.1 | 92.9/7.1 | FED/RBiH | A2-MAJORITY-AREA 78.9% FED (pop 92.9%) | approximate |
| op:bosanska_krupa:ivanjska_2 | 53.0/47.0 | 42.0/58.0 | FED/RBiH | A2-MAJORITY-AREA 53.0% FED | approximate |
| op:bosanska_krupa:jasenica_2 | 87.0/13.0 | 82.0/18.0 | FED/RBiH | A2-MAJORITY-AREA 87.0% FED | verified |
| op:bosanski_petrovac:jasenovac_2 | 74.2/25.8 | 77.3/22.7 | FED/RBiH | A2-MAJORITY-AREA 74.2% FED (pop 77.3%) | approximate |
| op:bosanski_samac:domaljevac_2 | 41.6/58.4 | 53.8/46.2 | FED/HRHB | A2-PRINCIPAL-SETTLEMENT override: area 58.4% RS, but population 53.8% FED and principal settlement Domaljevac (4,152) FBiH | approximate |
| op:doboj:klokotnica_2 | 89.8/10.2 | 84.4/15.6 | FED/RBiH | A2-MAJORITY-AREA 89.8% FED | verified |
| op:foca:izbisno | 20.5/79.5 | 30.2/69.8 | RS/RS | A2-MAJORITY-AREA 79.5% RS (pop 69.8%) | approximate |
| op:foca:patkovina | 9.7/90.3 | 8.7/91.3 | RS/RS | A2-MAJORITY-AREA 90.3% RS | verified |
| op:foca:ustikolina | 77.3/22.7 | 89.5/10.5 | FED/RBiH | A2-MAJORITY-AREA 77.3% FED (pop 89.5%) | approximate |
| op:gorazde:glamoc | 81.8/18.2 | 86.4/13.6 | FED/RBiH | A2-MAJORITY-AREA 81.8% FED | approximate |
| op:gorazde:gorazde_2 | 53.3/46.7 | 96.4/3.6 | FED/RBiH | A2-MAJORITY-AREA 53.3% FED | approximate |
| op:gorazde:kolovarice | 45.8/54.2 | 69.8/30.2 | FED/RBiH | A2-PRINCIPAL-SETTLEMENT override: area 54.2% RS, but population 69.8% FED and principal settlement Kolovarice FBiH | approximate |
| op:gorazde:podkozara_donja_2 | 14.8/85.2 | 32.6/67.4 | RS/RS | A2-MAJORITY-AREA 85.2% RS (pop 67.4%) | approximate |
| op:gorazde:sopotnica | 12.3/87.7 | 14.4/85.6 | RS/RS | A2-MAJORITY-AREA 87.7% RS | verified |
| op:gracanica:gracanica_2 | 76.4/23.6 | 86.8/13.2 | FED/RBiH | A2-MAJORITY-AREA 76.4% FED (pop 86.8%) | approximate |
| op:gradacac:donja_tramosnica_2 | 14.6/85.4 | 15.7/84.3 | RS/RS | A2-MAJORITY-AREA 85.4% RS | approximate |
| op:gradacac:mionica | 73.9/26.1 | 84.6/15.4 | FED/RBiH | A2-MAJORITY-AREA 73.9% FED (pop 84.6%) | approximate |
| op:gradacac:pelagicevo | 12.3/87.7 | 0.9/99.1 | RS/RS | A2-MAJORITY-AREA 87.7% RS (pop 99.1%) | verified |
| op:ilidza:kasindo | 28.5/71.5 | 2.9/97.1 | RS/RS | A2-MAJORITY-AREA 71.5% RS (pop 97.1%) | approximate |
| op:ilidza:sarajevo_dio_ilidza_2 | 95.7/4.3 | 93.1/6.9 | FED/RBiH | A2-MAJORITY-AREA 95.7% FED | verified |
| op:jajce:jezero_2 | 20.3/79.7 | 4.7/95.3 | RS/RS | A2-MAJORITY-AREA 79.7% RS (pop 95.3%) | approximate |
| op:jajce:prisoje | 8.6/91.4 | 16.7/83.3 | RS/RS | A2-MAJORITY-AREA 91.4% RS | verified |
| op:kalesija:gojcin_2 | 37.0/63.0 | 45.2/54.8 | RS/RS | A2-MAJORITY-AREA 63.0% RS | approximate |
| op:kalesija:seher_2 | 17.5/82.5 | 11.3/88.7 | RS/RS | A2-MAJORITY-AREA 82.5% RS | approximate |
| op:kljuc:donje_ratkovo_2 | 14.5/85.5 | 21.4/78.6 | RS/RS | A2-MAJORITY-AREA 85.5% RS | verified |
| op:kupres:novo_selo_2 | 22.5/77.5 | 33.3/66.7 | RS/RS | A2-MAJORITY-AREA 77.5% RS (pop 66.7%) | approximate |
| op:lopare:celic_3 | 75.3/24.7 | 94.0/6.0 | FED/RBiH | A2-MAJORITY-AREA 75.3% FED (pop 94.0%) | approximate |
| op:lopare:jablanica_2 | 35.9/64.1 | 8.7/91.3 | RS/RS | A2-MAJORITY-AREA 64.1% RS (pop 91.3%) | approximate |
| op:lopare:nahvioci | 96.9/3.1 | 95.3/4.7 | FED/RBiH | A2-MAJORITY-AREA 96.9% FED | verified |
| op:mostar:kruzanj_2 | 67.0/33.0 | 93.0/7.0 | FED/RBiH | A2-MAJORITY-AREA 67.0% FED (pop 93.0%) | approximate |
| op:mostar:vranjevici_2 | 85.6/14.4 | 83.9/16.1 | FED/RBiH | A2-MAJORITY-AREA 85.6% FED | approximate |
| op:odzak:donja_dubica | 74.3/25.7 | 76.0/24.0 | FED/HRHB | A2-MAJORITY-AREA 74.3% FED (pop 76.0%) | approximate |
| op:odzak:gornji_svilaj | 48.1/51.9 | 65.3/34.7 | FED/HRHB | A2-PRINCIPAL-SETTLEMENT override: area 51.9% RS, but population 65.3% FED and principal settlement Gornji Svilaj (1,810) FBiH | approximate |
| op:odzak:potocani_2 | 84.3/15.7 | 86.0/14.0 | FED/HRHB | A2-MAJORITY-AREA 84.3% FED | approximate |
| op:orasje:orasje | 81.2/18.8 | 96.1/3.9 | FED/HRHB | A2-MAJORITY-AREA 81.2% FED (pop 96.1%) | approximate |
| op:orasje:ostra_luka | 36.3/63.7 | 50.6/49.4 | RS/RS | A2-MAJORITY-AREA 63.7% RS, but population 50.6% FED and principal settlement Ostra Luka split 63% FBiH | unresolved |
| op:pale:podgrab | 51.3/48.7 | 43.6/56.4 | RS/RS | A2-PRINCIPAL-SETTLEMENT override: area 51.3% FED, but population 56.4% RS and principal settlement Podgrab (722) RS Pale | approximate |
| op:pale:praca | 48.8/51.2 | 70.6/29.4 | FED/RBiH | A2-PRINCIPAL-SETTLEMENT override: area 51.2% RS, but population 70.6% FED and principal settlement Praca (seat of Pale-Praca) FBiH | approximate |
| op:sanski_most:budimlic_japra_2 | 29.9/70.1 | 35.9/64.1 | RS/RS | A2-MAJORITY-AREA 70.1% RS (pop 64.1%) | approximate |
| op:sanski_most:donja_kozica | 25.0/75.0 | 37.0/63.0 | RS/RS | A2-MAJORITY-AREA 75.0% RS (pop 63.0%) | approximate |
| op:sanski_most:stari_majdan | 26.4/73.6 | 54.6/45.4 | RS/RS | A2-MAJORITY-AREA 73.6% RS, but population 54.6% FED and principal settlement Stari Majdan (1,212) FBiH - indicators conflict | unresolved |
| op:skender_vakuf:donji_koricani | 57.5/42.5 | 86.1/13.9 | FED/HRHB | A2-MAJORITY-AREA 57.5% FED | approximate |
| op:stolac:pjesivac_kula_2 | 41.5/58.5 | 80.8/19.2 | FED/HRHB | A2-PRINCIPAL-SETTLEMENT override: area 58.5% RS (Dabrica 41 km2), but population 80.8% FED and principal settlement Pjesivac-Kula FBiH | approximate |
| op:stolac:rotimlja_2 | 70.5/29.5 | 88.3/11.7 | FED/HRHB | A2-MAJORITY-AREA 70.5% FED (pop 88.3%) | approximate |
| op:stolac:stolac_2 | 55.6/44.4 | 92.7/7.3 | FED/HRHB | A2-MAJORITY-AREA 55.6% FED | approximate |
| op:titov_drvar:prekaja_2 | 65.0/35.0 | 96.0/4.0 | FED/HRHB | A2-MAJORITY-AREA 65.0% FED (pop 96.0%) | approximate |
| op:trebinje:bihovo_2 | 25.9/74.1 | 8.7/91.3 | RS/RS | A2-MAJORITY-AREA 74.1% RS (pop 91.3%) | approximate |
| op:trebinje:ivanica | 92.3/7.7 | 96.6/3.4 | FED/HRHB | A2-MAJORITY-AREA 92.3% FED | approximate |
| op:trebinje:velicani | 37.6/62.4 | 52.8/47.2 | RS/RS | A2-MAJORITY-AREA 62.4% RS, but population 52.8% FED and the Ravno municipal seat lies in the cell - indicators conflict | unresolved |
| op:trebinje:zakovo_2 | 18.7/81.3 | 8.5/91.5 | RS/RS | A2-MAJORITY-AREA 81.3% RS | approximate |
| op:trnovo:delijas | 84.0/16.0 | 95.1/4.9 | FED/RBiH | A2-MAJORITY-AREA 84.0% FED (pop 95.1%) | approximate |
| op:trnovo:kijevo_2 | 17.3/82.7 | 9.9/90.1 | RS/RS | A2-MAJORITY-AREA 82.7% RS (pop 90.1%) | approximate |
| op:trnovo:tosici | 64.5/35.5 | 40.8/59.2 | FED/RBiH | A2-MAJORITY-AREA 64.5% FED, but population 59.2% RS and principal settlement Tosici (391) RS - indicators conflict | unresolved |
| op:trnovo:trnovo | 79.2/20.8 | 34.5/65.5 | FED/RBiH | A2-MAJORITY-AREA 79.2% FED, but population 65.5% RS and principal settlement Trnovo town (1,985 of 2,099) in RS Trnovo - indicators conflict | unresolved |
| op:ugljevik:jasikovac | 95.5/4.5 | 94.7/5.3 | FED/RBiH | A2-MAJORITY-AREA 95.5% FED | verified |
| op:ugljevik:srednja_trnova_2 | 27.9/72.1 | 8.8/91.2 | RS/RS | A2-MAJORITY-AREA 72.1% RS (pop 91.2%) | approximate |
| op:zvornik:rastosnica_2 | 51.2/48.8 | 72.6/27.4 | FED/RBiH | A2-MAJORITY-AREA 51.2% FED | approximate |
| op:zvornik:sapna | 81.8/18.2 | 92.5/7.5 | FED/RBiH | A2-MAJORITY-AREA 81.8% FED (pop 92.5%) | approximate |

## 4. Enclaves, corridor and Brčko (history only, no game rule proposed)

**Srebrenica** (13 cells) and **Bratunac** (8): wholly RS at Dayton. The Srebrenica safe area fell to the VRS on 11 July 1995 (A/54/549; BB1 KB p0432-0435); Dayton confirmed RS control of the whole municipality. **Žepa** (`op:rogatica:zepa_2`, inside Rogatica) fell on 25 July 1995 (BB1 KB p0444-0448) and the whole of Rogatica is RS. **Čajniče, Višegrad**: wholly RS.

**Goražde**: the enclave stayed with the Federation and was joined to it by a land corridor. In the data this is the Bosnian-Podrinje Canton Goražde = Goražde (FBiH, code 11452) + Foča-Ustikolina (11444) + Pale-Prača (11576). RS kept Novo Goražde (20419: Kopači, Ustiprača, the right-bank villages east and south-east of the town; VRS-held since the April 1994 offensive, BB2 KB p0478-0479). Note the repo xlsx names both Goražde parts 'Novo Goražde'; the BHAS codes disambiguate (1475355/11452 Goražde FBiH vs 1255549/20419 Novo Goražde RS).

Cells that form the corridor between Goražde and the Sarajevo canton (Federation side, west to east): `op:trnovo:tusila`, `op:trnovo:delijas`, `op:trnovo:gornja_presjenica` (Trnovo FBiH, the Treskavica side) -> `op:foca:donje_zesce`, `op:foca:mazlina`, `op:foca:ustikolina` (Foča-Ustikolina; the wartime Jabuka-Grebak trail of BB2 KB p0410 runs through `op:foca:izbisno`, whose FBiH settlements Jabuka, Lokve, Zabor and Slavičići are outvoted by RS area in that cell) -> Goražde cells. The Prača valley arm is `op:pale:praca`, `op:pale:vrazalice`, `op:pale:bulozi` and the FBiH part of `op:pale:podgrab`. The exact Dayton corridor road alignment is documented only at municipality level here; the cell list is *approximate*.

**Brčko**: Annex 2 Art. V left the disputed IEBL portion to binding arbitration and kept the area 'administered as currently'; the 1995-2000 Dayton line left Brčko town and the Sava corridor north of it in RS and the south of the municipality in the Federation (Rahić-Brčko, Bosniak-run; Ravne-Brčko, Croat-run, in the west). The Final Award of 5 March 1999 (para 11) made **the entire pre-war opština** the Brčko District in condominium, established 8 March 2000. Therefore all 13 cells are `special`, and all 13 became District. Interim-side notes per cell are in `evidence`.

## 5. Cells where the Dayton assignment differs from the wartime controller in the reference save

97 of 252 cells. The save is an emergent RS run at turn 104 (~Apr 1994), so this list mixes (a) genuine Dayton transfers against the end-1995 line, (b) the save's own divergence from history (e.g. Petrovac, Ključ, Sanski Most, Drvar, Kupres and Jajce are still RS at turn 104 but were taken by the ARBiH/HV/HVO in Sept-Oct 1995 and Nov 1994; the eastern enclaves are still RBiH), and (c) all Brčko cells (special). Faction-level differences inside the Federation are included.

| Cell | Wartime (save t104) | Dayton entity | Faction | Confidence |
|---|---|---|---|---|
| op:bosanska_krupa:arapusa_2 | RS | FED | RBiH | approximate |
| op:bosanska_krupa:gornja_suvaja | RS | FED | RBiH | verified |
| op:bosanska_krupa:ivanjska_2 | RS | FED | RBiH | approximate |
| op:bosanska_krupa:jasenica_2 | RS | FED | RBiH | verified |
| op:bosanska_krupa:vranjska_2 | RS | FED | RBiH | verified |
| op:bosanski_petrovac:bosanski_petrovac_2 | RS | FED | RBiH | verified |
| op:bosanski_petrovac:dobro_selo_2 | RS | FED | RBiH | verified |
| op:bosanski_petrovac:jasenovac_2 | RS | FED | RBiH | approximate |
| op:bosanski_petrovac:kolonic_2 | RS | FED | RBiH | verified |
| op:bosanski_petrovac:krnjeusa | RS | FED | RBiH | verified |
| op:bosanski_petrovac:prkosi | RS | FED | RBiH | verified |
| op:bosanski_petrovac:vodjenica | RS | FED | RBiH | verified |
| op:bosanski_petrovac:vrtoce | RS | FED | RBiH | verified |
| op:bratunac:pobudje_2 | RBiH | RS | RS | verified |
| op:brcko:bijela_2 | RBiH | special | None | verified |
| op:brcko:boce_2 | RBiH | special | None | verified |
| op:brcko:brcko | RS | special | None | verified |
| op:brcko:brezovo_polje_selo_2 | RS | special | None | verified |
| op:brcko:brka_2 | RBiH | special | None | verified |
| op:brcko:bukvik_gornji_2 | RBiH | special | None | verified |
| op:brcko:donji_rahic | RS | special | None | verified |
| op:brcko:gornji_rahic_2 | RBiH | special | None | verified |
| op:brcko:krepsic | RS | special | None | verified |
| op:brcko:maoca_2 | RBiH | special | None | verified |
| op:brcko:palanka | RBiH | special | None | verified |
| op:brcko:potocari_2 | RS | special | None | verified |
| op:brcko:skakava_donja | RS | special | None | verified |
| op:cajnice:batotici | RBiH | RS | RS | verified |
| op:cajnice:miljeno_2 | RBiH | RS | RS | verified |
| op:cajnice:todorovici | RBiH | RS | RS | verified |
| op:foca:brusna_2 | RBiH | RS | RS | verified |
| op:foca:donje_zesce | RS | FED | RBiH | verified |
| op:foca:ustikolina | RS | FED | RBiH | approximate |
| op:gorazde:podkozara_donja_2 | RBiH | RS | RS | approximate |
| op:gorazde:slatina_2 | RBiH | RS | RS | verified |
| op:gorazde:ustipraca_2 | RBiH | RS | RS | verified |
| op:gradacac:donja_tramosnica_2 | RBiH | RS | RS | approximate |
| op:ilidza:rakovica_2 | RS | FED | RBiH | verified |
| op:ilidza:rudnik_2 | RS | FED | RBiH | verified |
| op:ilidza:sarajevo_dio_ilidza_2 | RS | FED | RBiH | verified |
| op:jajce:barevo_2 | RS | FED | HRHB | approximate |
| op:jajce:bravnice | RS | FED | HRHB | approximate |
| op:jajce:divicani_2 | RS | FED | HRHB | approximate |
| op:jajce:grdovo | RS | FED | HRHB | approximate |
| op:jajce:jajce_3 | RS | FED | HRHB | approximate |
| op:jajce:kruscica | RS | FED | HRHB | approximate |
| op:jajce:lupnica | RS | FED | HRHB | approximate |
| op:jajce:vinac_2 | RS | FED | HRHB | approximate |
| op:kalesija:seher_2 | RBiH | RS | RS | approximate |
| op:kljuc:hadzici | RS | FED | RBiH | verified |
| op:kljuc:kljuc_2 | RS | FED | RBiH | verified |
| op:kljuc:krasulje_2 | RS | FED | RBiH | verified |
| op:kljuc:sanica_2 | RS | FED | RBiH | verified |
| op:kupres:bucovaca | RS | FED | HRHB | verified |
| op:kupres:donji_malovan | RS | FED | HRHB | verified |
| op:kupres:goravci | RS | FED | HRHB | verified |
| op:kupres:kupres_2 | RS | FED | HRHB | verified |
| op:mostar:kruzanj_2 | RS | FED | RBiH | approximate |
| op:mostar:vranjevici_2 | RS | FED | RBiH | approximate |
| op:odzak:donja_dubica | RS | FED | HRHB | approximate |
| op:odzak:gornji_svilaj | RS | FED | HRHB | approximate |
| op:odzak:potocani_2 | RS | FED | HRHB | approximate |
| op:orasje:ostra_luka | HRHB | RS | RS | unresolved |
| op:pale:bulozi | RS | FED | RBiH | verified |
| op:pale:podgrab | RBiH | RS | RS | approximate |
| op:pale:vrazalice | RS | FED | RBiH | verified |
| op:rogatica:brcigovo | RBiH | RS | RS | verified |
| op:rogatica:zepa_2 | RBiH | RS | RS | verified |
| op:sanski_most:ilidza_2 | RS | FED | RBiH | verified |
| op:sanski_most:jelasinovci | RS | FED | RBiH | verified |
| op:sanski_most:kljevci | RS | FED | RBiH | verified |
| op:sanski_most:lusci_palanka_2 | RS | FED | RBiH | verified |
| op:sanski_most:sanski_most_2 | RS | FED | RBiH | verified |
| op:sanski_most:skucani_vakuf_2 | RS | FED | RBiH | verified |
| op:skender_vakuf:donji_koricani | RS | FED | HRHB | approximate |
| op:srebrenica:bostahovine_2 | RBiH | RS | RS | verified |
| op:srebrenica:donji_potocari_2 | RBiH | RS | RS | verified |
| op:srebrenica:ljeskovik_2 | RBiH | RS | RS | verified |
| op:srebrenica:luka_2 | RBiH | RS | RS | verified |
| op:srebrenica:milacevici | RBiH | RS | RS | verified |
| op:srebrenica:osmace_2 | RBiH | RS | RS | verified |
| op:srebrenica:radovcici | RBiH | RS | RS | verified |
| op:srebrenica:srebrenica_2 | RBiH | RS | RS | verified |
| op:srebrenica:suceska | RBiH | RS | RS | verified |
| op:srebrenica:sulice_2 | RBiH | RS | RS | verified |
| op:stari_grad_sarajevo:faletici | RS | FED | RBiH | verified |
| op:stolac:pjesivac_kula_2 | RS | FED | HRHB | approximate |
| op:titov_drvar:drvar_2 | RS | FED | HRHB | verified |
| op:titov_drvar:prekaja_2 | RS | FED | HRHB | approximate |
| op:titov_drvar:sipovljani_2 | RS | FED | HRHB | verified |
| op:trebinje:ivanica | RS | FED | HRHB | approximate |
| op:trnovo:gornja_presjenica | RS | FED | RBiH | verified |
| op:trnovo:kijevo_2 | RBiH | RS | RS | approximate |
| op:trnovo:tosici | RS | FED | RBiH | unresolved |
| op:ugljevik:srednja_trnova_2 | RBiH | RS | RS | approximate |
| op:visegrad:medjedja_2 | RBiH | RS | RS | verified |
| op:zvornik:djulici | RBiH | RS | RS | verified |

**Known defect confirmed.** `op:zvornik:sapna` (Vitinica, Sapna, Zaseok, Kraljevići, Nezuk, Međeđa: all Sapna FBiH; 81.8 % of area, 92.5 % of population) and `op:ugljevik:teocak_krstac_2` (all five settlements in Teočak FBiH) are Federation/RBiH. Both were ARBiH-held throughout the war (BB1 KB p0439, p0514; BB2 KB p0490-0491). The quota pass's RS assignment is wrong for both.

## 6. Where sources disagree, and open questions for the owner

1. **Trnovo town.** Research report v1 (§6.3) says 'the town of Trnovo to the Federation'. The BHAS structure puts the Trnovo settlement 1,985 RS / 114 FBiH, i.e. the town is in Trnovo (RS); the FBiH municipality of the same name is the Dejčići-Trebečaj-Ledići valley to the west. The cell `op:trnovo:trnovo` is 79 % FBiH by area but RS by town and population: **unresolved**, owner decision. The v1 note should be corrected.
2. **Unresolved cells (5)**: `op:orasje:ostra_luka` (Donji Žabar RS seat vs Oštra Luka/Bok FBiH, population 51/49), `op:sanski_most:stari_majdan` (74 % RS land, but Stari Majdan town FBiH), `op:trebinje:velicani` (62 % RS land, Ravno seat FBiH), `op:trnovo:tosici`, `op:trnovo:trnovo`. Recommend the owner pick either the area rule or the principal-settlement rule for all five consistently.
3. **Principal-settlement overrides (6)**: Domaljevac, Kolovarice, Gornji Svilaj, Podgrab, Prača, Pješivac-Kula. Each is recorded with both indicators; flipping them to the area rule changes about 406 km² in total.
4. **Mostar faction layer.** The research JSON's 'Federation/split' (half RBiH, half HRHB) is replaced by per-cell: RBiH 6 cells (east bank, north valley, Blagaj, Podveležje, Drežnica, Vranjevići), HRHB 3 (west bank, Jasenica/Buna right bank, Hodbina-Gubavica). Hodbina-Gubavica (Bosniak villages taken by the HVO in July 1993) and Drežnica (ARBiH valley with HVO Croat villages Goranci/Bogodol in the same cell) are the weakest calls.
5. **Jajce as HRHB** follows the existing RULE-FED-LAYER (HDZ-run after HV/HVO retook the town in Sept 1995). The pre-war plurality was Bosniak and the ARBiH 7th Corps fought alongside; if the owner prefers 'liberating force' over 'administering party', Jajce's 8 FBiH cells are the ones that move.
6. **Ilidža/Sarajevo suburbs.** Entity is documented (OHR 1996 transfers). The reference save shows them RS; the Dayton map transfers them to the Federation. No disagreement among sources.
7. **Odžak** was VRS-held from 12 July 1992 (BB1 KB p0182) and went to the Federation at Dayton: the research JSON's 'inferred' control date is now BB-documented.
8. **Brčko interim portions** (which cells were RS-administered 1995-2000) are from ceasefire geography, not from the Appendix map: approximate notes only; the District outcome is documented.
9. **Area weighting of split settlements** uses the BHAS population split as a proxy for the area split (no settlement-part polygons exist). Sensitivity check: under the alternative of splitting each cut settlement's area 50/50, five cells change or tie their area majority: `op:kupres:novo_selo_2` (RS 77.5 % -> FED 57.1 %: the three cut settlements Mrđanovci, Novo Selo, Šemenovci are almost wholly RS by population, so the population weighting is the better reading, but the cell is flagged), `op:trebinje:velicani` and `op:trnovo:tosici` (already unresolved), `op:gradacac:donja_tramosnica_2` and `op:lopare:jablanica_2` (exact 50/50 ties; population 84 % and 91 % RS, assignment RS kept). All five are marked approximate or unresolved.
10. The `plan_maps_research.json` xlsx-derived name 'Novo Goražde' for the FBiH part of Goražde should read 'Goražde' (BHAS 1475355 / code 11452).

## 7. Files

- `data/source/peace_plans/dayton_cell_assignments.json`: the deliverable (252 cells).
- `tools/peace/iebl_cell_audit/compute_cells.py`, `build_outputs.py`, `build_audit_md.py`: deterministic pipeline (reads repo data read-only; regenerates the deliverable and this report).
- `tools/peace/iebl_cell_audit/crossed_cells.txt`: per-cell settlement-level evidence for the IEBL-crossed cells; `diff_rows.json`: reference-save comparison; `CHECKPOINT.md`: run record.
- Fetched sources (Annex 2, Final Award, Prlić TJ Vol. 2 PDF + text, Wikipedia raw wikitext) are not committed; the pipeline re-fetches them from the URLs in §2.
