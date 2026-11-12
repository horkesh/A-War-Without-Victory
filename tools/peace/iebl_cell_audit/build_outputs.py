import json, sys, collections
S = sys.argv[1]
cells = json.load(open(S + '/work/cells_computed.json', encoding='utf-8'))
war = json.load(open(S + '/work/wartime_controllers.json', encoding='utf-8'))

A2 = "GFAP Annex 2 Art. I and Appendix (text: ohr.int/dayton-peace-agreement/annex-2/)"
BHAS = ("IEBL as implemented, read from the 1991 census republished on the post-1995 municipal structure "
        "(data/source/bih_census_1991.json; BHAS codes 1xxxx=FBiH, 2xxxx=RS, 3xxxx=Brcko District), joined to the "
        "cell's member settlements via settlements_wgs84_1990.geojson census_ids")

# faction layer by post-1995 FBiH municipality code: (faction, confidence, evidence)
FAC = {
 '11428': ('RBiH', 'verified', 'Una-Sana Canton (Bosniak-majority canton; Law on Federal Units 12 Jun 1996)'),
 '11436': ('RBiH', 'verified', 'Una-Sana Canton; taken by ARBiH 5th Corps Sept 1995 (BB1 KB p0419)'),
 '11541': ('RBiH', 'verified', 'Una-Sana Canton; taken by ARBiH 5th Corps Oct 1995 (BB1 KB p0420)'),
 '11509': ('RBiH', 'verified', 'Una-Sana Canton; Kljuc fell to ARBiH 17 Sept 1995 (BB1 KB p0419)'),
 '11282': ('HRHB', 'verified', 'Posavina Canton (Croat-majority canton); HVO 202nd Home Defence Regt vic. Domaljevac-Grebnice 1995 (BB1 KB p0437)'),
 '11525': ('HRHB', 'verified', 'Posavina Canton (Croat-majority canton); VRS took Odzak 12 Jul 1992 (BB1 KB p0182) and the area went to the Croat-run canton at Dayton'),
 '11533': ('HRHB', 'verified', 'Posavina Canton; HVO Orasje Corps District held the Orasje pocket to war end (BB1 KB p0217, p0437)'),
 '11258': ('RBiH', 'verified', 'Tuzla Canton (Doboj-Istok); ARBiH 224th Mtn Bde HQ Klokotnica (BB1 KB p0509)'),
 '11266': ('RBiH', 'verified', 'Zenica-Doboj Canton (Doboj-Jug), Bosniak-run'),
 '11444': ('RBiH', 'verified', 'Bosnian-Podrinje Canton Gorazde (Foca-Ustikolina); ARBiH supply corridor Trnovo-Jabuka-Grebak-Gorazde (BB2 KB p0410)'),
 '11452': ('RBiH', 'verified', 'Bosnian-Podrinje Canton Gorazde; ARBiH-held enclave to war end (BB2 KB p0478-0479)'),
 '11576': ('RBiH', 'verified', 'Bosnian-Podrinje Canton Gorazde (Pale-Praca)'),
 '11479': ('RBiH', 'verified', 'Tuzla Canton'),
 '10391': ('RBiH', 'verified', 'Tuzla Canton; ARBiH 107th Gradacac Mot Bde (BB2 KB p0401)'),
 '11495': ('RBiH', 'verified', 'Tuzla Canton; ARBiH 241st/242nd/245th Bdes HQ Kalesija (BB1 KB p0514)'),
 '11231': ('RBiH', 'verified', 'Tuzla Canton (Celic); ARBiH 208th/254th Celic Mtn Bde (BB2 KB p0401, BB1 KB p0509)'),
 '11312': ('RBiH', 'verified', 'Tuzla Canton (Sapna); ARBiH 246th Mtn Bde HQ Sapna, the Sapna thumb held 1992-95 (BB1 KB p0514; BB2 KB p0490-0491)'),
 '11339': ('RBiH', 'verified', 'Tuzla Canton (Teocak); ARBiH 255th Mtn Bde Hajrudin Mesic HQ Teocak (BB1 KB p0439, p0509)'),
 '11550': ('RBiH', 'verified', 'Sarajevo Canton; RS-held Ilidza transferred to the Federation Feb-Mar 1996 (OHR chronology 1996, per research report 6.3)'),
 '11568': ('RBiH', 'verified', 'Sarajevo Canton; Grbavica transferred 18-19 Mar 1996 (OHR 1996)'),
 '11584': ('RBiH', 'verified', 'Sarajevo Canton'),
 '11592': ('RBiH', 'verified', 'Sarajevo Canton (Trnovo FBiH); 1995 Treskavica-Trnovo fighting (BB1 KB p0443)'),
 '11487': ('HRHB', 'approximate', 'Central Bosnia Canton (mixed); Jajce retaken by HV/HVO Sept 1995 (BB1 KB p0419) and HDZ-run after the war (RULE-FED-LAYER inference)'),
 '11274': ('HRHB', 'approximate', 'Central Bosnia Canton (mixed); Dobretici is a Croat village cluster held by the HVO (RULE-FED-LAYER inference)'),
 '11517': ('HRHB', 'verified', 'Canton 10 (Croat-majority canton); Kupres taken by HVO/ARBiH 3 Nov 1994 and administered by the HVO side (BB2 KB p0527)'),
 '11614': ('HRHB', 'verified', 'Canton 10 (Croat-majority canton); Drvar taken by HV Sept 1995 (research entry, BB1 KB p0417)'),
 '11606': ('HRHB', 'approximate', 'Herzegovina-Neretva Canton (mixed); HVO 1st Knez Domagoj Bde took Stolac June 1992, Muslim population removed Jul-Aug 1993 (ICTY Prlic TJ IT-04-74-T Vol.2 paras 1897, 1203ff) (RULE-FED-LAYER)'),
 '11304': ('HRHB', 'approximate', 'Herzegovina-Neretva Canton (mixed); Ravno (Popovo polje) Croat-run municipality formed 1996 (RULE-FED-LAYER inference)'),
}
# Mostar per-cell faction
MOSTAR = {
 'op:mostar:mostar_zapad_2': ('HRHB', 'verified', 'West Mostar (right bank: Cim, Ilici, Rodoc): HVO side of the Bulevar/Santiceva front line (ICTY Prlic TJ Vol.2 para 782); Croat city-municipalities of the Feb 1996 Interim Statute'),
 'op:mostar:mostar_istok_2': ('RBiH', 'verified', 'East Mostar (Vrapcici, Gnojnice): ABiH side east of the Bulevar (Prlic TJ Vol.2 para 782); Bosniak city-municipalities of the 1996 Interim Statute'),
 'op:mostar:blagaj_2': ('RBiH', 'approximate', 'Blagaj: ABiH-held sector connected to East Mostar Jun 1993-Apr 1994 (Prlic TJ Vol.2 para 991); Mostar Jugoistok (Bosniak) under the 1996 Interim Statute'),
 'op:mostar:potoci': ('RBiH', 'approximate', 'Bijelo Polje/Potoci north valley: left bank under ABiH control 1993-94 (Prlic TJ Vol.2 paras 881-882 area); Mostar Sjever (Bosniak) under the 1996 Interim Statute'),
 'op:mostar:gornja_dreznica': ('RBiH', 'approximate', 'Dreznica: Bosniak valley held by the ARBiH 4th Corps; Goranci/Bogodol Croat villages in the same cell were HVO-held (mixed cell; RULE-FED-LAYER inference)'),
 'op:mostar:hodbina_2': ('HRHB', 'approximate', 'Buna-Gubavica-Hodbina: HVO took the area in Jul 1993 after clashes at Buna, Gubavica and Laksevine (Prlic TJ Vol.2 para 917); Mostar Jug (Croat) under the 1996 Interim Statute'),
 'op:mostar:jasenica': ('HRHB', 'verified', 'Right-bank south (Jasenica, Buna, Ortijes, airport): HVO-held throughout 1993-94, HV 8th Light Assault Bde stationed in Buna (Prlic TJ Vol.2 para 694 fn 1552)'),
 'op:mostar:kruzanj_2': ('RBiH', 'approximate', 'Podvelezje plateau (Podvelez, Kruzanj, Banjdol): Bosniak villages east of Mostar on the ABiH side; Zijemlje (RS) is Istocni Mostar'),
 'op:mostar:vranjevici_2': ('RBiH', 'approximate', 'Vranjevici-Rabina-Zulja: Bosniak villages SE of Mostar toward Nevesinje, ABiH side; Kokorina/Kamena (RS) are Istocni Mostar'),
}
MUNEV = {
 'bosanska_krupa': 'RS keeps Krupa na Uni (right bank of the Una south of the town)',
 'bosanski_petrovac': 'RS keeps Petrovac (Drinic); BB1 KB p0419 for the Sept 1995 ARBiH capture of the town',
 'bosanski_samac': 'RS keeps Samac town and the corridor; Federation keeps Domaljevac-Samac (HVO pocket, BB1 KB p0437)',
 'doboj': 'RS keeps Doboj town and the Ozren side; Federation keeps Doboj-Istok (Klokotnica) and Doboj-Jug (Matuzici)',
 'foca': 'RS keeps Foca town (Srbinje); Federation receives Foca-Ustikolina on the Gorazde corridor (Bosnian-Podrinje Canton)',
 'gorazde': 'Federation keeps the town and enclave; RS keeps Novo Gorazde (Kopaci, Ustipraca; VRS-held 1994, BB2 KB p0478-0479). NOTE repo xlsx names both parts Novo Gorazde; BHAS codes 11452 (Gorazde FBiH) vs 20419 (Novo Gorazde RS) disambiguate',
 'gracanica': 'RS keeps Petrovo (Ozren)',
 'gradacac': 'RS keeps Pelagicevo (VRS 3rd Posavina LIB HQ, BB1 KB p0500)',
 'ilidza': 'RS keeps Istocna Ilidza (Kasindo, Lukavica side); Serb-held Ilidza transferred to the Federation Feb-Mar 1996 (OHR 1996)',
 'jajce': 'RS keeps Jezero (south toward Mrkonjic Grad)',
 'kalesija': 'RS keeps Osmaci',
 'kljuc': 'RS keeps Ribnik (larger area); Federation keeps Kljuc town',
 'kupres': 'RS keeps a small Kupres (RS) around Novo Selo',
 'lopare': 'RS keeps Lopare; Federation keeps Celic',
 'mostar': 'RS keeps Istocni Mostar (Zijemlje, Kokorina, Kamena highland villages)',
 'novo_sarajevo': 'RS keeps Istocno Novo Sarajevo (Lukavica); Grbavica transferred to the Federation Mar 1996 (OHR 1996)',
 'odzak': 'RS keeps Vukosavlje (Modricki Lug, Pecnik, Gnionica, Jakes side)',
 'orasje': 'RS keeps Donji Zabar',
 'pale': 'RS keeps Pale; Federation receives Pale-Praca (Praca valley) on the Gorazde corridor (Bosnian-Podrinje Canton)',
 'sanski_most': 'RS keeps Ostra Luka (Japra valley, Koprivna); Federation keeps Sanski Most town (ARBiH Oct 1995, BB1 KB p0420)',
 'skender_vakuf': 'RS keeps Knezevo; Federation keeps Dobretici',
 'stari_grad_sarajevo': 'RS keeps Istocni Stari Grad (rural east: Hresa side); the Faletici/Barice cell remains FBiH',
 'stolac': 'RS keeps Berkovici (Dabar polje); Federation keeps Stolac town (HVO since June 1992, Prlic TJ Vol.2 para 1897)',
 'titov_drvar': 'RS keeps Istocni Drvar (Potoci, Srnetica, Uvala)',
 'trebinje': 'RS keeps Trebinje; Federation keeps Ravno (Popovo polje and Ivanica/Bobani)',
 'trnovo': 'Split between Trnovo (FBiH) and Trnovo (RS); BHAS places Trnovo town (1,985 of 2,099 inhabitants) in RS Trnovo, contrary to the research-report v1 note',
 'ugljevik': 'RS keeps Ugljevik; Federation keeps Teocak (ARBiH-held 1992-95, BB1 KB p0439)',
 'zvornik': 'RS keeps Zvornik; Federation keeps Sapna (ARBiH Sapna thumb 1992-95, BB2 KB p0490-0491)',
 'srebrenica': 'Whole municipality RS at Dayton; the enclave fell to the VRS 11 Jul 1995 (A/54/549; BB1 KB p0432-0435)',
 'bratunac': 'Whole municipality RS at Dayton (VRS-held from Apr-May 1992)',
 'cajnice': 'Whole municipality RS at Dayton',
 'rogatica': 'Whole municipality RS at Dayton, including the Zepa enclave (fell 25 Jul 1995, BB1 KB p0444-0448)',
 'visegrad': 'Whole municipality RS at Dayton',
 'brcko': ('Annex 2 Art. V: disputed IEBL portion in the Brcko area to binding arbitration, administered as currently meanwhile. '
           'Final Award 5 Mar 1999 (ohr.int/?p=111275) para 11: the entire pre-war Brcko opstina becomes the Brcko District held in condominium; District established 8 Mar 2000'),
}
BRCKO_INTERIM = {
 'op:brcko:brcko': 'RS portion (town)',
 'op:brcko:brezovo_polje_selo_2': 'RS portion',
 'op:brcko:krepsic': 'RS portion (corridor west of the town)',
 'op:brcko:potocari_2': 'RS portion',
 'op:brcko:skakava_donja': 'RS portion (approximate; the line ran through this area)',
 'op:brcko:donji_rahic': 'RS portion (approximate; Donji Rahic/Grbavica were on or near the line)',
 'op:brcko:bijela_2': 'Federation portion (Ravne-Brcko, Croat-run)',
 'op:brcko:boce_2': 'Federation portion (Rahic-Brcko)',
 'op:brcko:bukvik_gornji_2': 'Federation portion (approximate)',
 'op:brcko:brka_2': 'Federation portion (Rahic-Brcko)',
 'op:brcko:gornji_rahic_2': 'Federation portion (Rahic-Brcko, seat)',
 'op:brcko:maoca_2': 'Federation portion (Rahic-Brcko)',
 'op:brcko:palanka': 'Federation portion (Rahic-Brcko)',
}
# decisions for crossed cells: osid -> (entity, confidence, rule text, note)
X = {
 'op:bosanska_krupa:arapusa_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 78.9% FED (pop 92.9%)', 'Veliki Dubovik settlement split; Srednji Petrovici RS'),
 'op:bosanska_krupa:ivanjska_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 53.0% FED; principal settlement Ivanjska (633) FBiH; population majority RS (58%) - indicators conflict', 'Gornji and Srednji Busevic, Osredak are RS (Krupa na Uni)'),
 'op:bosanska_krupa:jasenica_2': ('FED', 'verified', 'A2-MAJORITY-AREA 87.0% FED', 'Hasani (RS) and Potkalinje (split) on the Una'),
 'op:bosanski_petrovac:jasenovac_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 74.2% FED (pop 77.3%)', 'Drinic and parts of Bunara/Klenovac are RS Petrovac'),
 'op:bosanski_samac:domaljevac_2': ('FED', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 58.4% RS, but population 53.8% FED and principal settlement Domaljevac (4,152) FBiH', 'Obudovac and Batkusa (RS) vs Domaljevac, Bazik, Grebnice (FBiH). Owner question'),
 'op:doboj:klokotnica_2': ('FED', 'verified', 'A2-MAJORITY-AREA 89.8% FED', 'Stanic Rijeka split'),
 'op:foca:izbisno': ('RS', 'approximate', 'A2-MAJORITY-AREA 79.5% RS (pop 69.8%)', 'Jabuka, Lokve, Zabor, Slavicici are FBiH (Foca-Ustikolina) - the Jabuka-Grebak corridor trail (BB2 KB p0410) lies in this cell'),
 'op:foca:patkovina': ('RS', 'verified', 'A2-MAJORITY-AREA 90.3% RS', 'Prisoje/Filipovici/Brajici split'),
 'op:foca:ustikolina': ('FED', 'approximate', 'A2-MAJORITY-AREA 77.3% FED (pop 89.5%); principal settlement Ustikolina FBiH', 'Sorlaci RS; Gosticaj/Cvilin split'),
 'op:gorazde:glamoc': ('FED', 'approximate', 'A2-MAJORITY-AREA 81.8% FED', 'Odzak (Gorazde) and Hrid RS'),
 'op:gorazde:gorazde_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 53.3% FED; population 96.4% FED; principal settlement Gorazde town (16,273) FBiH', 'Zidine, Zivojevici, Bucje (RS Novo Gorazde) lie east of the town'),
 'op:gorazde:kolovarice': ('FED', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 54.2% RS, but population 69.8% FED and principal settlement Kolovarice FBiH', 'SW plateau; Krasici, Nevorici, Dragovici RS. Owner question'),
 'op:gorazde:podkozara_donja_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 85.2% RS (pop 67.4%)', 'Biljin FBiH; Podkozara Donja split'),
 'op:gorazde:sopotnica': ('RS', 'verified', 'A2-MAJORITY-AREA 87.7% RS', 'Radici FBiH'),
 'op:gracanica:gracanica_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 76.4% FED (pop 86.8%)', 'Kakmuz and part of Karanovac RS (Petrovo)'),
 'op:gradacac:donja_tramosnica_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 85.4% RS; all three settlements split, population 84% RS', 'Donja/Gornja Tramosnica, Turic split between Gradacac and Pelagicevo. SENSITIVITY: a 50/50 area split of the cut settlements gives an exact tie; population decides for RS'),
 'op:gradacac:mionica': ('FED', 'approximate', 'A2-MAJORITY-AREA 73.9% FED (pop 84.6%)', 'Blazevac and Porebrice mostly RS'),
 'op:gradacac:pelagicevo': ('RS', 'verified', 'A2-MAJORITY-AREA 87.7% RS (pop 99.1%)', 'Gajevi FBiH'),
 'op:ilidza:kasindo': ('RS', 'approximate', 'A2-MAJORITY-AREA 71.5% RS (pop 97.1%)', 'Jasen (uninhabited mountain land) FBiH'),
 'op:ilidza:sarajevo_dio_ilidza_2': ('FED', 'verified', 'A2-MAJORITY-AREA 95.7% FED', 'small part of the Ilidza built-up area in Istocna Ilidza'),
 'op:jajce:jezero_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 79.7% RS (pop 95.3%)', 'Zaovine FBiH'),
 'op:jajce:prisoje': ('RS', 'verified', 'A2-MAJORITY-AREA 91.4% RS', 'Borci/Prisoje split'),
 'op:kalesija:gojcin_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 63.0% RS; population 54.8% RS', 'Gojcin split (776 FBiH / 291 RS), Jelovo Brdo FBiH; Osmaci seat RS'),
 'op:kalesija:seher_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 82.5% RS', 'Bulatovci, Staro Selo FBiH'),
 'op:kljuc:donje_ratkovo_2': ('RS', 'verified', 'A2-MAJORITY-AREA 85.5% RS', 'Donje Sokolovo and part of Donje Ratkovo FBiH'),
 'op:kupres:novo_selo_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 77.5% RS (pop 66.7%)', 'Blagaj and Bajramovci FBiH; this is the whole of Kupres (RS). SENSITIVITY: the three cut settlements (Mrdjanovci, Novo Selo, Semenovci) are almost wholly RS by population; with a 50/50 area split the cell would read 57% FBiH'),
 'op:lopare:celic_3': ('FED', 'approximate', 'A2-MAJORITY-AREA 75.3% FED (pop 94.0%)', 'Pukis mostly RS'),
 'op:lopare:jablanica_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 64.1% RS (pop 91.3%)', 'Visori FBiH. SENSITIVITY: a 50/50 area split of the cut settlements gives an exact tie; population decides for RS'),
 'op:lopare:nahvioci': ('FED', 'verified', 'A2-MAJORITY-AREA 96.9% FED', ''),
 'op:mostar:kruzanj_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 67.0% FED (pop 93.0%)', 'Zijemlje (74 km2, RS Istocni Mostar)'),
 'op:mostar:vranjevici_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 85.6% FED', 'Kokorina, Kamena mostly RS'),
 'op:odzak:donja_dubica': ('FED', 'approximate', 'A2-MAJORITY-AREA 74.3% FED (pop 76.0%)', 'Pecnik, Modricki Lug, Vukosavlje RS'),
 'op:odzak:gornji_svilaj': ('FED', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 51.9% RS, but population 65.3% FED and principal settlement Gornji Svilaj (1,810) FBiH', 'Gnionica, Josavica RS. Owner question'),
 'op:odzak:potocani_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 84.3% FED', 'Srnava RS'),
 'op:orasje:orasje': ('FED', 'approximate', 'A2-MAJORITY-AREA 81.2% FED (pop 96.1%)', 'Jenjic, Lepnica split'),
 'op:orasje:ostra_luka': ('RS', 'unresolved', 'A2-MAJORITY-AREA 63.7% RS, but population 50.6% FED and principal settlement Ostra Luka split 63% FBiH; Donji Zabar (RS seat) also in the cell - indicators conflict', 'Owner decision needed'),
 'op:pale:podgrab': ('RS', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 51.3% FED, but population 56.4% RS and principal settlement Podgrab (722) RS Pale', 'Datelji, Celjadinici, Brojnici, Cemernica, Komrani, Brdarici are FBiH Pale-Praca (corridor). Owner question'),
 'op:pale:praca': ('FED', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 51.2% RS, but population 70.6% FED and principal settlement Praca (seat of Pale-Praca) FBiH', 'Modrik, Petovici, Strane RS. Corridor cell'),
 'op:sanski_most:budimlic_japra_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 70.1% RS (pop 64.1%)', 'Kozin, Donji Lipnik, Djurici, Bjeline FBiH'),
 'op:sanski_most:donja_kozica': ('RS', 'approximate', 'A2-MAJORITY-AREA 75.0% RS (pop 63.0%)', 'Podovi, Donja Tramosnja FBiH'),
 'op:sanski_most:stari_majdan': ('RS', 'unresolved', 'A2-MAJORITY-AREA 73.6% RS, but population 54.6% FED and principal settlement Stari Majdan (1,212) FBiH - indicators conflict', 'Garevica (29 km2), Ovanjska RS; Stara Rijeka, Batkovci split. Owner decision needed'),
 'op:skender_vakuf:donji_koricani': ('FED', 'approximate', 'A2-MAJORITY-AREA 57.5% FED; population 86.1% FED (Dobretici municipality, 17 settlements)', 'Gornji and Donji Koricani (RS Knezevo) are the two largest-area settlements'),
 'op:stolac:pjesivac_kula_2': ('FED', 'approximate', 'A2-PRINCIPAL-SETTLEMENT override: area 58.5% RS (Dabrica 41 km2), but population 80.8% FED and principal settlement Pjesivac-Kula FBiH', 'Dabrica, Ljubljenica RS Berkovici. Owner question'),
 'op:stolac:rotimlja_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 70.5% FED (pop 88.3%)', 'Scepan Krst, Brstanik RS'),
 'op:stolac:stolac_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 55.6% FED; population 92.7% FED; principal settlement Stolac town FBiH', 'Zegulja (26 km2) and Bitunja RS Berkovici'),
 'op:titov_drvar:prekaja_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 65.0% FED (pop 96.0%)', 'Potoci, Uvala, Srnetica RS Istocni Drvar'),
 'op:trebinje:bihovo_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 74.1% RS (pop 91.3%)', 'Glavska, Zagradinje, Sparozici FBiH Ravno'),
 'op:trebinje:ivanica': ('FED', 'verified', 'A2-MAJORITY-AREA 92.3% FED', 'Cerovac, Klikovici RS'),
 'op:trebinje:velicani': ('RS', 'unresolved', 'A2-MAJORITY-AREA 62.4% RS, but population 52.8% FED and the Ravno municipal seat lies in the cell - indicators conflict', 'Velicani, Grmljani, Strujici RS; Ravno, Zavala, Cvaljina FBiH. Owner decision needed'),
 'op:trebinje:zakovo_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 81.3% RS', ''),
 'op:trnovo:delijas': ('FED', 'approximate', 'A2-MAJORITY-AREA 84.0% FED (pop 95.1%)', 'Zabojska RS'),
 'op:trnovo:kijevo_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 82.7% RS (pop 90.1%)', 'part of Donja Presjenica FBiH'),
 'op:trnovo:tosici': ('FED', 'unresolved', 'A2-MAJORITY-AREA 64.5% FED, but population 59.2% RS and principal settlement Tosici (391) RS - indicators conflict', 'Treskavica slopes FBiH; Tosici, Rajski Do RS. Owner decision needed'),
 'op:trnovo:trnovo': ('FED', 'unresolved', 'A2-MAJORITY-AREA 79.2% FED, but population 65.5% RS and principal settlement Trnovo town (1,985 of 2,099) in RS Trnovo - indicators conflict', 'Dejcici-Trebecaj-Ledici valley FBiH; Trnovo town and Turovi RS. Research-report v1 claimed the town went to the Federation; BHAS says otherwise. Owner decision needed'),
 'op:ugljevik:jasikovac': ('FED', 'verified', 'A2-MAJORITY-AREA 95.5% FED', ''),
 'op:ugljevik:srednja_trnova_2': ('RS', 'approximate', 'A2-MAJORITY-AREA 72.1% RS (pop 91.2%)', 'Tursunovo Brdo FBiH Teocak'),
 'op:zvornik:rastosnica_2': ('FED', 'approximate', 'A2-MAJORITY-AREA 51.2% FED; population 72.6% FED; principal settlement Rastosnica (2,335) FBiH Sapna', 'Kiseljak, Gornji Lokanj RS Zvornik'),
 'op:zvornik:sapna': ('FED', 'approximate', 'A2-MAJORITY-AREA 81.8% FED (pop 92.5%); Sapna municipal seat in the cell', 'Potocani, Dugi Dio RS Zvornik'),
}

ORDER = ['bosanska_krupa', 'bosanski_petrovac', 'bosanski_samac', 'doboj', 'foca', 'gorazde', 'gracanica', 'gradacac', 'ilidza', 'jajce', 'kalesija', 'kljuc', 'kupres', 'lopare', 'mostar', 'novo_sarajevo', 'odzak', 'orasje', 'pale', 'sanski_most', 'skender_vakuf', 'stari_grad_sarajevo', 'stolac', 'titov_drvar', 'trebinje', 'trnovo', 'ugljevik', 'zvornik', 'srebrenica', 'bratunac', 'cajnice', 'rogatica', 'visegrad', 'brcko']

out = {}
for osid, v in sorted(cells.items()):
    mun = v['mun']; sa = v['share_area']
    maj = max(sa.items(), key=lambda x: x[1])[0]
    minority = 100 - sa[maj]
    def tag(p):
        e = {'1': 'FBiH', '2': 'RS', '3': 'BD'}[p[0][0]]
        return f"{p[1]}[{e}]"
    settl = '; '.join(f"{s['name']}->{'/'.join(sorted(set(tag(p) for p in s['post1995'])))}" for s in v['settlements'] if s.get('post1995'))
    if mun == 'brcko':
        ent = 'special'; conf = 'verified'
        rule = 'A2-ART-V arbitration; Final Award 1999 -> Brcko District (whole pre-war opstina)'
        ev = f"{A2}; {MUNEV['brcko']}. Interim 1995-2000: {BRCKO_INTERIM[osid]}. {BHAS}: {settl}"
    elif osid in X:
        ent, conf, rule, note = X[osid]
        ev = f"{A2}; {BHAS}: {settl}. Shares by area: {json.dumps(sa)}; by population: {json.dumps(v['share_pop'])}. {MUNEV.get(mun, '')}. {note}".replace('. .', '.')
    else:
        ent = maj; conf = 'verified'
        rule = 'A2-SETTLEMENT: all member settlements lie in one post-1995 municipality' if minority < 3 else f'A2-MAJORITY-AREA {sa[maj]:.1f}% {maj}'
        ev = f"{A2}; {BHAS}: {settl}. {MUNEV.get(mun, '')}"
    fconf = 'verified'; fev = ''
    if ent == 'RS':
        fac = 'RS'
    elif ent == 'special':
        fac = None
    else:
        if osid in MOSTAR:
            fac, fconf, fev = MOSTAR[osid]
        else:
            codes = {k.split(' ')[0]: p for k, p in v['post1995_codes'].items() if k[0] == '1'}
            code = max(codes.items(), key=lambda x: x[1])[0]
            fac, fconf, fev = FAC[code]
        ev += f" FED-LAYER: {fev}"
    final = conf
    if conf != 'unresolved' and fconf == 'approximate':
        final = 'approximate'
    out[osid] = {'entity': ent, 'faction': fac, 'confidence': final,
                 'rule': rule + (f"; FED-LAYER ({fconf})" if ent == 'FED' else ''), 'evidence': ev}

res = {'schema': 'dayton_cell_assignments/v1', 'generated': '2026-11-08', 'cells': out}
json.dump(res, open(S + '/dayton_cell_assignments.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

rows = []
tot = collections.Counter()
for m in ORDER:
    cs = [(o, out[o]) for o in sorted(out) if cells[o]['mun'] == m]
    ents = collections.Counter(); facs = collections.Counter(); confs = collections.Counter(); area = collections.Counter()
    for o, c in cs:
        ents[c['entity']] += 1; facs[c['faction'] or 'n/a'] += 1; confs[c['confidence']] += 1; area[c['entity']] += cells[o]['area_km2']
    ta = sum(area.values())
    tot.update(confs)
    rows.append({'mun': m, 'cells': len(cs), 'entities': dict(ents), 'factions': dict(facs),
                 'area_share': {k: round(100 * a / ta, 1) for k, a in area.items()},
                 'verified': confs['verified'], 'approximate': confs['approximate'], 'unresolved': confs['unresolved']})
json.dump(rows, open(S + '/work/summary_rows.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('TOTAL', dict(tot), 'cells', len(out))
for r in rows:
    print(r)

diff = []
for o in sorted(out):
    w = war.get(o); c = out[o]
    went = {'RBiH': 'FED', 'HRHB': 'FED', 'RS': 'RS'}.get(w)
    if c['entity'] == 'special' or c['entity'] != went or (c['entity'] == 'FED' and c['faction'] != w):
        diff.append({'osid': o, 'wartime': w, 'entity': c['entity'], 'faction': c['faction'], 'confidence': c['confidence']})
json.dump(diff, open(S + '/work/diff_rows.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('diff count', len(diff))
