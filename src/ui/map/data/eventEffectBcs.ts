/**
 * Bosnian/Croatian/Serbian lines for the narrative effect line under an acknowledgement card,
 * each pinned to the exact English it translates. Resolution, keys and the stale-pin rule are
 * documented in `eventEffectText.ts`; `tests/ui/event_effect_text_localised.test.ts` keeps this
 * table equal to the narrative lines the shipped event catalogs can show.
 */
export interface EventEffectBcsEntry {
    readonly en: string;
    readonly bcs: string;
}

export const EVENT_EFFECT_BCS: Readonly<Record<string, EventEffectBcsEntry>> = {
    "foca_1992#0": {
        en: "The historical record of the Foča takeover is documented in the Codex.",
        bcs: "Historijski zapis o preuzimanju vlasti u Foči dokumentovan je u Kodeksu.",
    },
    "zvornik_takeover_1992#0": {
        en: "The historical record of the Zvornik takeover is documented in the Codex.",
        bcs: "Historijski zapis o preuzimanju vlasti u Zvorniku dokumentovan je u Kodeksu.",
    },
    "arms_embargo_impact_1992#0": {
        en: "The UN arms embargo leaves the ARBiH critically short of weapons and ammunition.",
        bcs: "Embargo UN-a na oružje ostavlja ARBiH s kritičnim nedostatkom oružja i municije.",
    },
    "battle_of_the_barracks_visoko#0": {
        en: "Local TDF forces seize the Visoko depot. A few tanks and mortars join the defense of the Sarajevo corridor.",
        bcs: "Lokalne snage TO-a zauzimaju skladište u Visokom. Nekoliko tenkova i minobacača pridružuje se odbrani sarajevskog koridora.",
    },
    "battle_of_the_barracks_sarajevo#0": {
        en: "JNA soldiers killed during the seizure provoke international condemnation. VRS commanders vow to avenge the barracks.",
        bcs: "Vojnici JNA ubijeni tokom zauzimanja izazivaju međunarodnu osudu. Komandanti VRS-a zaklinju se da će osvetiti kasarnu.",
    },
    "jna_withdrawal_1992#0": {
        en: "The JNA formally withdraws from Bosnia. Equipment, bases, and ammunition stores are left to the VRS.",
        bcs: "JNA se formalno povlači iz Bosne. Oprema, baze i skladišta municije ostaju VRS-u.",
    },
    "battle_of_the_barracks_tuzla#0": {
        en: "The Brčanska Malta ambush kills over 50 JNA soldiers. Belgrade and the international community condemn the attack. TDF forces secure the Simin Han barracks complex. VRS high command redirects forces toward the Tuzla corridor.",
        bcs: "U zasjedi na Brčanskoj Malti ubijeno je više od 50 vojnika JNA. Beograd i međunarodna zajednica osuđuju napad. Snage TO-a osiguravaju kompleks kasarne Simin Han. Visoka komanda VRS-a preusmjerava snage prema tuzlanskom koridoru.",
    },
    "srebrenica_enclave_forms_1992#0": {
        en: "Bosniak forces consolidate around Srebrenica, forming a besieged enclave that becomes a symbol of resistance.",
        bcs: "Bošnjačke snage se učvršćuju oko Srebrenice i oblikuju opkoljenu enklavu koja postaje simbol otpora.",
    },
    "bijeljina_killings_1992#0": {
        en: "The historical record of the Bijeljina takeover is documented in the Codex.",
        bcs: "Historijski zapis o preuzimanju vlasti u Bijeljini dokumentovan je u Kodeksu.",
    },
    "battle_of_the_barracks_zenica#0": {
        en: "3rd Corps inherits JNA artillery from the Zenica garrison. Central Bosnia defenses are strengthened.",
        bcs: "3. korpus preuzima artiljeriju JNA iz zeničkog garnizona. Odbrana srednje Bosne je ojačana.",
    },
    "drina_valley_ethnic_cleansing_1992#0": {
        en: "Systematic ethnic cleansing sweeps through the Drina Valley. Tens of thousands of Bosniaks are expelled or killed.",
        bcs: "Sistematsko etničko čišćenje zahvata dolinu Drine. Desetine hiljada Bošnjaka protjerano je ili ubijeno.",
    },
    "visegrad_1992#0": {
        en: "The historical record of the Višegrad takeover is documented in the Codex.",
        bcs: "Historijski zapis o preuzimanju vlasti u Višegradu dokumentovan je u Kodeksu.",
    },
    "embargo_croatia_transit_1992#0": {
        en: "A limited Croatia transit channel eases, but does not solve, the ARBiH supply crisis.",
        bcs: "Ograničeni tranzitni kanal preko Hrvatske ublažava, ali ne rješava, krizu snabdijevanja ARBiH.",
    },
    "omarska_camp_1992#0": {
        en: "The historical record of the Omarska detention facility is documented in the Codex.",
        bcs: "Historijski zapis o mjestu zatočenja Omarska dokumentovan je u Kodeksu.",
    },
    "keraterm_camp_1992#0": {
        en: "The historical record of the Keraterm detention facility is documented in the Codex.",
        bcs: "Historijski zapis o mjestu zatočenja Keraterm dokumentovan je u Kodeksu.",
    },
    "trnopolje_camp_1992#0": {
        en: "The historical record of the Trnopolje detention facility is documented in the Codex.",
        bcs: "Historijski zapis o mjestu zatočenja Trnopolje dokumentovan je u Kodeksu.",
    },
    "prijedor_takeover_1992#0": {
        en: "The historical record of the Prijedor takeover is documented in the Codex.",
        bcs: "Historijski zapis o preuzimanju vlasti u Prijedoru dokumentovan je u Kodeksu.",
    },
    "gorazde_pocket_consolidation_1992#0": {
        en: "ARBiH forces consolidate the Goražde pocket and improve the enclave's defensive perimeter.",
        bcs: "Snage ARBiH učvršćuju goraždanski džep i poboljšavaju odbrambeni perimetar enklave.",
    },
    "milosevic_isolation_warning_aug92#0": {
        en: "Belgrade privately signals to Pale that international pressure is mounting and the pace of events must slow.",
        bcs: "Beograd nejavno signalizira Palama da međunarodni pritisak raste i da tempo događaja mora usporiti.",
    },
    "hvo_arbih_tensions_rise_1992#0": {
        en: "HVO and ARBiH forces clash at Prozor and Novi Travnik. The fragile alliance between Croats and Bosniaks shows deepening cracks.",
        bcs: "Snage HVO-a i ARBiH sukobljavaju se u Prozoru i Novom Travniku. Krhki savez Hrvata i Bošnjaka pokazuje sve dublje pukotine.",
    },
    "jajce_falls_1992#0": {
        en: "Jajce falls to the VRS. Refugee columns flood central Bosnia; mutual blame between HVO and ARBiH accelerates the breakdown of their alliance.",
        bcs: "Jajce pada u ruke VRS-a. Kolone izbjeglica preplavljuju srednju Bosnu; uzajamno okrivljavanje HVO-a i ARBiH ubrzava raspad njihovog saveza.",
    },
    "kravica_attack_1993#0": {
        en: "The Christmas raid on Kravica galvanizes VRS commanders. The Drina Corps begins preparations for an offensive to crush the eastern enclaves once and for all.",
        bcs: "Božićni napad na Kravicu podstiče komandante VRS-a. Drinski korpus počinje pripreme za ofanzivu kojom bi jednom zauvijek slomio istočne enklave.",
    },
    "turajlic_assassination_1993#0": {
        en: "The murder of Turajlic inside a UN vehicle exposes the fragility of UNPROFOR's protection and the VRS's contempt for international norms.",
        bcs: "Ubistvo Turajlića u vozilu UN-a razotkriva krhkost zaštite UNPROFOR-a i prezir VRS-a prema međunarodnim normama.",
    },
    "croat_bosniak_war_begins_1993#0": {
        en: "The HVO-ARBiH alliance breaks down in central Bosnia.",
        bcs: "Savez HVO-a i ARBiH raspada se u srednjoj Bosni.",
    },
    "us_envoy_appointed_1993#0": {
        en: "American diplomacy enters the Bosnian arena. The 'lift and strike' proposal fails in Europe, but Washington's trajectory toward intervention has begun.",
        bcs: "Američka diplomatija ulazi u bosansku arenu. Prijedlog „lift and strike“ ne prolazi u Evropi, ali putanja Washingtona prema intervenciji je počela.",
    },
    "vrs_cerska_offensive_1993#0": {
        en: "Cerska and Konjevic Polje fall to the Drina Corps. Srebrenica is now completely isolated and bursting with refugees.",
        bcs: "Cerska i Konjević Polje padaju u ruke Drinskog korpusa. Srebrenica je sada potpuno izolovana i prepuna izbjeglica.",
    },
    "un_resolution_808_tribunal_1993#0": {
        en: "Resolution 808 puts all commanders on notice: the international community is documenting crimes and building the architecture for prosecution.",
        bcs: "Rezolucija 808 upozorava sve komandante: međunarodna zajednica dokumentuje zločine i gradi okvir za krivično gonjenje.",
    },
    "zagreb_restrains_boban_vopp#0": {
        en: "Zagreb quietly orders Boban to hold back HVO offensive operations during the Vance-Owen window.",
        bcs: "Zagreb tiho nalaže Bobanu da obuzda ofanzivne operacije HVO-a tokom perioda Vance-Owenova plana.",
    },
    "morillon_enters_srebrenica_1993#0": {
        en: "Morillon's dramatic declaration creates an obligation the UN cannot fulfill. The gap between his promise and UNPROFOR's means defines the enclave's tragic position.",
        bcs: "Morillonova dramatična izjava stvara obavezu koju UN ne mogu ispuniti. Jaz između njegovog obećanja i sredstava UNPROFOR-a određuje tragičan položaj enklave.",
    },
    "un_nfz_enforcement_1993#0": {
        en: "NATO combat aircraft now patrol Bosnian airspace. The VRS loses its fixed-wing air support but retains overwhelming ground-based fire superiority.",
        bcs: "Borbeni avioni NATO-a sada patroliraju bosanskim zračnim prostorom. VRS gubi zračnu podršku aviona, ali zadržava ogromnu nadmoć u vatri s kopna.",
    },
    "croatia_herceg_bosna_control_1993#0": {
        en: "Zagreb's patronage deepens. HVO commanders receive Croatian Army support — and with it, the expectation that Herceg-Bosna will serve Croatian strategic interests.",
        bcs: "Pokroviteljstvo Zagreba se produbljuje. Komandanti HVO-a dobijaju podršku Hrvatske vojske, a s njom i očekivanje da će Herceg-Bosna služiti hrvatskim strateškim interesima.",
    },
    "ahmici_massacre_1993#0": {
        en: "The Ahmići massacre shocks the international community. HVO credibility suffers a devastating blow.",
        bcs: "Masakr u Ahmićima šokira međunarodnu zajednicu. Kredibilitet HVO-a trpi razoran udarac.",
    },
    "sovici_doljani_attack_1993#0": {
        en: "HVO forces attack Sovići and Doljani near Jablanica, a day after the Ahmići massacre.",
        bcs: "Snage HVO-a napadaju Soviće i Doljane kod Jablanice, dan nakon masakra u Ahmićima.",
    },
    "trusina_killings_1993#0": {
        en: "The Trusina killings are documented as war crimes against Croat civilians and prisoners of war. They neither mitigate the HVO crimes committed the same day nor establish equivalent culpability between the parties.",
        bcs: "Ubistva u Trusini dokumentovana su kao ratni zločini nad hrvatskim civilima i ratnim zarobljenicima. Ona ne ublažavaju zločine HVO-a počinjene istog dana, niti uspostavljaju jednaku krivicu između strana.",
    },
    "un_resolution_819_srebrenica_1993#0": {
        en: "Srebrenica is declared a UN safe area. The VRS ignores the ceasefire demand while the UN lacks any credible enforcement mechanism.",
        bcs: "Srebrenica je proglašena zaštićenom zonom UN-a. VRS ignoriše zahtjev za prekid vatre, a UN nemaju nikakav vjerodostojan mehanizam provedbe.",
    },
    "un_resolution_820_sanctions_1993#0": {
        en: "The tightened embargo enters force. Belgrade's ability to sustain the VRS is visibly constrained, and Milošević's patience with Pale is running thin.",
        bcs: "Pooštreni embargo stupa na snagu. Sposobnost Beograda da izdržava VRS vidljivo je ograničena, a Miloševiću ponestaje strpljenja s Palama.",
    },
    "milosevic_vopp_pressure#0": {
        en: "Milošević and Bulatović personally demand that the Bosnian Serb Assembly accept the Vance-Owen Plan.",
        bcs: "Milošević i Bulatović lično zahtijevaju da Skupština bosanskih Srba prihvati Vance-Owenov plan.",
    },
    "vitez_kiseljak_pockets_1993#0": {
        en: "HVO garrisons in central Bosnia hold on inside their pockets. Supplies reach them only with difficulty.",
        bcs: "Garnizoni HVO-a u srednjoj Bosni opstaju u svojim džepovima. Snabdijevanje do njih stiže samo uz poteškoće.",
    },
    "east_mostar_siege_1993#0": {
        en: "Mostar is divided between the HVO on the west bank and the ARBiH on the east.",
        bcs: "Mostar je podijeljen između HVO-a na zapadnoj obali i ARBiH na istočnoj.",
    },
    "un_safe_areas_declared_1993#0": {
        en: "Six UN safe areas are declared. The promise of protection raises hope among besieged populations, but no credible enforcement mechanism exists.",
        bcs: "Proglašeno je šest zaštićenih zona UN-a. Obećanje zaštite budi nadu među opkoljenim stanovništvom, ali ne postoji vjerodostojan mehanizam provedbe.",
    },
    "icty_established_1993#0": {
        en: "The ICTY opens for business in The Hague. Every commander who orders atrocities now does so with knowledge that a court exists to try them.",
        bcs: "MKSJ počinje s radom u Hagu. Svaki komandant koji naređuje zvjerstva to sada čini znajući da postoji sud koji će mu suditi.",
    },
    "battle_of_travnik_1993#0": {
        en: "ARBiH forces take an HVO position near Travnik.",
        bcs: "Snage ARBiH zauzimaju položaj HVO-a kod Travnika.",
    },
    "un_resolution_836_force_1993#0": {
        en: "NATO now has legal authority to strike VRS positions. Whether it has the political will to use it is another question entirely.",
        bcs: "NATO sada ima pravno ovlaštenje da udara na položaje VRS-a. Ima li političku volju da ga upotrijebi, sasvim je drugo pitanje.",
    },
    "operation_sharp_guard_1993#0": {
        en: "NATO warships enforce the Adriatic blockade. Serbia's supply corridor tightens further, but the arms embargo continues to hurt the outgunned ARBiH most.",
        bcs: "Ratni brodovi NATO-a provode jadransku blokadu. Koridor snabdijevanja Srbije se dodatno steže, ali embargo na oružje i dalje najviše pogađa slabije naoružanu ARBiH.",
    },
    "hvo_detention_camps_1993#0": {
        en: "Images of Bosniak men crowded behind Heliodrom wire reach the international press. Croatia's patron relationship with the West enters a period of severe strain.",
        bcs: "Slike bošnjačkih muškaraca zbijenih iza žice Heliodroma stižu u međunarodnu štampu. Odnos pokroviteljstva između Hrvatske i Zapada ulazi u razdoblje ozbiljne napetosti.",
    },
    "sarajevo_tunnel_completed_1993#0": {
        en: "Sarajevo breathes again. The tunnel is a military and psychological lifeline — proof that the city's will to resist can find a way through any encirclement.",
        bcs: "Sarajevo ponovo diše. Tunel je vojna i psihološka žila kucavica: dokaz da volja grada da se odupre može naći put kroz svako okruženje.",
    },
    "maglaj_enclave_blockade_1993#0": {
        en: "Around Maglaj the ARBiH now faces the VRS and the HVO in the same valley.",
        bcs: "Oko Maglaja se ARBiH sada suočava s VRS-om i HVO-om u istoj dolini.",
    },
    "battle_of_bugojno_1993#0": {
        en: "Bugojno falls and its HVO arsenal is absorbed into the ARBiH. The momentum in central Bosnia has decisively shifted.",
        bcs: "Bugojno pada, a njegov arsenal HVO-a preuzima ARBiH. Zamah u srednjoj Bosni odlučno se promijenio.",
    },
    "markale_area_shelling_1993#0": {
        en: "Artillery continues to target civilian areas in Sarajevo. International pressure for intervention builds steadily.",
        bcs: "Artiljerija i dalje gađa civilna područja u Sarajevu. Međunarodni pritisak za intervenciju stalno raste.",
    },
    "milosevic_owen_stoltenberg_distancing#0": {
        en: "Milošević signals through back-channels that Serbia's patience with Pale is exhausted.",
        bcs: "Milošević putem diskretnih kanala signalizira da je strpljenje Srbije s Palama iscrpljeno.",
    },
    "nato_air_strike_threat_1993#0": {
        en: "NATO's ultimatum is the clearest signal yet that the international community may use force. The VRS calculates its next move carefully.",
        bcs: "Ultimatum NATO-a najjasniji je dosadašnji signal da bi međunarodna zajednica mogla upotrijebiti silu. VRS pažljivo proračunava svoj sljedeći potez.",
    },
    "operation_neretva_93_1993#0": {
        en: "ARBiH forces open the September offensive east of Prozor.",
        bcs: "ARBiH otvara septembarsku ofanzivu istočno od Prozora.",
    },
    "grabovica_uzdol_massacres_1993#0": {
        en: "ARBiH crimes against Croat civilians at Grabovica and Uždol enter the tribunal record; Halilović's acquittal resolves his individual superior responsibility, not whether the crimes occurred.",
        bcs: "Zločini ARBiH nad hrvatskim civilima u Grabovici i Uždolu ulaze u sudski zapis Tribunala; oslobađajuća presuda Haliloviću rješava pitanje njegove individualne odgovornosti nadređenog, a ne pitanje jesu li se zločini dogodili.",
    },
    "bosnian_assembly_rejects_os_1993#0": {
        en: "The Bosnian assembly refuses partition. The war will continue — but so will Bosnia's legal claim to its full territory.",
        bcs: "Skupština odbija podjelu Bosne. Rat će se nastaviti, ali tako će i pravni zahtjev Bosne na cijelu njenu teritoriju.",
    },
    "abdic_karadzic_pact_1993#0": {
        en: "Abdić and Karadžić formalize their alliance. The 5th Corps now faces encirclement from three directions — VRS, RSK, and APWB.",
        bcs: "Abdić i Karadžić formalizuju svoj savez. 5. korpus se sada suočava s okruženjem iz tri smjera: od VRS-a, RSK i Autonomne pokrajine Zapadna Bosna.",
    },
    "stupni_do_massacre_1993#0": {
        en: "Stupni Do is added to the growing list of documented HVO atrocities. Rajic will eventually plead guilty at The Hague.",
        bcs: "Stupni Do se dodaje na rastući popis dokumentovanih zvjerstava HVO-a. Rajić će se na kraju u Hagu izjasniti krivim.",
    },
    "zagreb_orders_hrhb_ceasefire#0": {
        en: "Tuđman orders Boban to stand down HVO operations against ARBiH under the Washington Agreement framework.",
        bcs: "Tuđman nalaže Bobanu da obustavi operacije HVO-a protiv ARBiH u okviru Washingtonskog sporazuma.",
    },
    "markale_massacre_1994#0": {
        en: "The Markale massacre kills 68 civilians. The atrocity becomes the catalyst for NATO's ultimatum to the VRS.",
        bcs: "Masakr na Markalama ubija 68 civila. Zvjerstvo postaje katalizator ultimatuma NATO-a VRS-u.",
    },
    "sarajevo_exclusion_zone_1994#0": {
        en: "VRS heavy weapons are withdrawn from around Sarajevo. The exclusion zone brings the first sustained relief to the besieged capital.",
        bcs: "Teško naoružanje VRS-a povlači se iz okoline Sarajeva. Zona isključenja donosi prvo trajnije olakšanje opkoljenom glavnom gradu.",
    },
    "nato_shoots_down_planes_1994#0": {
        en: "NATO shoots down four of six VRS aircraft violating the no-fly zone. The alliance demonstrates its willingness to use force for the first time.",
        bcs: "NATO obara četiri od šest aviona VRS-a koji krše zonu zabrane letova. Savez po prvi put pokazuje spremnost da upotrijebi silu.",
    },
    "arbih_7th_corps_formed_1994#0": {
        en: "The General Staff forms the 7th Corps at Travnik under Alagić. The western brigades of the 3rd Corps pass to it.",
        bcs: "Glavni štab formira 7. korpus u Travniku pod komandom Alagića. Zapadne brigade 3. korpusa prelaze u njegov sastav.",
    },
    "gorazde_crisis_1994#0": {
        en: "The VRS attacks the Goražde safe area. Limited NATO strikes fail to stop the offensive, exposing the fragility of safe area protection.",
        bcs: "VRS napada zaštićenu zonu Goražde. Ograničeni udari NATO-a ne zaustavljaju ofanzivu, što otkriva krhkost zaštite u zaštićenim zonama.",
    },
    "milosevic_drina_warning#0": {
        en: "Milošević warns Pale that rejection of the Contact Group Plan means Belgrade will close the Drina.",
        bcs: "Milošević upozorava Pale da odbijanje plana Kontakt grupe znači da će Beograd zatvoriti Drinu.",
    },
    "anti_sniping_agreement_1994#0": {
        en: "An anti-sniping agreement is signed for Sarajevo. Compliance is uneven but civilian casualties decrease temporarily.",
        bcs: "Za Sarajevo je potpisan sporazum protiv snajperskog djelovanja. Poštivanje je neujednačeno, ali broj civilnih žrtava privremeno opada.",
    },
    "operation_cincar_1994#0": {
        en: "Kupres falls to HVO forces in Operation Cincar. VRS supply routes in western Bosnia are threatened.",
        bcs: "Kupres pada u ruke snaga HVO-a u operaciji Cincar. Putevi snabdijevanja VRS-a u zapadnoj Bosni su ugroženi.",
    },
    "bihac_crisis_1994#0": {
        en: "The Bihać pocket faces collapse as VRS and allied forces close in. NATO strikes prove inadequate to lift the siege.",
        bcs: "Bihaćki džep se suočava sa slomom dok se snage VRS-a i saveznika približavaju. Udari NATO-a pokazuju se nedovoljnim da se prekine opsada.",
    },
    "embargo_lifted_non_enforcement_1994#0": {
        en: "The embargo is not formally gone, but enforcement against Bosnia is loosening.",
        bcs: "Embargo formalno nije ukinut, ali se njegova provedba prema Bosni popušta.",
    },
    "coha_ceasefire_begins_1995#0": {
        en: "The four-month ceasefire begins. Both sides use the respite to rearm and reposition.",
        bcs: "Četveromjesečni prekid vatre počinje. Obje strane koriste predah da se ponovo naoružaju i pregrupišu.",
    },
    "operation_flash_1995#0": {
        en: "Croatia's Operation Flash shatters the RSK enclave in western Slavonia in three days. The strategic balance in the region begins to shift.",
        bcs: "Hrvatska operacija Bljesak za tri dana razbija enklavu RSK u zapadnoj Slavoniji. Strateški odnos snaga u regiji počinje se mijenjati.",
    },
    "tuzla_gate_massacre_1995#0": {
        en: "71 civilians, mostly young people, are killed by VRS shelling of Tuzla's town center on Youth Day. The youngest victim is two years old.",
        bcs: "U granatiranju centra Tuzle koje je izvršio VRS na Dan mladosti ubijeno je 71 civil, uglavnom mladih ljudi. Najmlađa žrtva imala je dvije godine.",
    },
    "srebrenica_falls_1995#0": {
        en: "Srebrenica falls. Over 8,000 Bosniak men and boys are executed in the worst atrocity in Europe since World War II.",
        bcs: "Srebrenica pada. Pogubljeno je više od 8.000 bošnjačkih muškaraca i dječaka, u najgorem zvjerstvu u Evropi od Drugog svjetskog rata.",
    },
    "zepa_falls_1995#0": {
        en: "Žepa falls to the VRS. A second UN safe area is overrun in two weeks, deepening the international crisis.",
        bcs: "Žepa pada u ruke VRS-a. Druga zaštićena zona UN-a zauzeta je u roku od dvije sedmice, što produbljuje međunarodnu krizu.",
    },
    "srebrenica_column_breakout_1995#0": {
        en: "The column out of Srebrenica is recorded as historical fact. ICTY judgments (Krstić, Popovic et al., Mladić) establish its flight and the killings along the route as part of the genocide.",
        bcs: "Kolona iz Srebrenice zabilježena je kao historijska činjenica. Presude MKSJ-a (Krstić, Popović i drugi, Mladić) utvrđuju njen bijeg i ubistva duž puta kao dio genocida.",
    },
    "un_safe_area_enforcement_1995#0": {
        en: "The UN safe-area regime is recorded as having failed. The 1999 UN Secretary-General report (A/54/549) documents the institutional failure of the safe-area guarantee after the fall of Srebrenica.",
        bcs: "Režim zaštićenih zona UN-a zabilježen je kao propao. Izvještaj generalnog sekretara UN-a iz 1999. (A/54/549) dokumentuje institucionalni neuspjeh jamstva zaštićenih zona nakon pada Srebrenice.",
    },
    "second_markale_massacre_1995#0": {
        en: "The second Markale massacre kills 43 civilians. NATO prepares to launch sustained air strikes against VRS forces.",
        bcs: "Drugi masakr na Markalama ubija 43 civila. NATO se priprema da pokrene kontinuirane zračne udare na snage VRS-a.",
    },
    "nato_deliberate_force_1995#0": {
        en: "NATO launches Operation Deliberate Force. Sustained air strikes hit VRS military infrastructure across Bosnia.",
        bcs: "NATO pokreće operaciju Deliberate Force. Kontinuirani zračni udari pogađaju vojnu infrastrukturu VRS-a širom Bosne.",
    },
    "federation_ground_offensive_1995#0": {
        en: "Federation forces launch a broad offensive. VRS lines collapse across western Bosnia as Republika Srpska's territory shrinks dramatically.",
        bcs: "Snage Federacije pokreću široku ofanzivu. Linije VRS-a se urušavaju širom zapadne Bosne, a teritorija Republike Srpske dramatično se smanjuje.",
    },
    "rapid_reaction_force_1995#0": {
        en: "The UN Rapid Reaction Force deploys heavy artillery on Mount Igman. For the first time, the international military presence in Bosnia has offensive capability.",
        bcs: "Snage za brzo djelovanje UN-a raspoređuju tešku artiljeriju na planini Igman. Po prvi put međunarodno vojno prisustvo u Bosni ima ofanzivnu sposobnost.",
    },
    "operation_summer_95#0": {
        en: "Grahovo and Glamoč fall to HV-HVO forces. The Knin-Banja Luka supply road is severed, isolating the RSK.",
        bcs: "Grahovo i Glamoč padaju u ruke snaga HV-a i HVO-a. Put snabdijevanja Knin-Banja Luka je presječen, čime je RSK izolovana.",
    },
    "operation_storm_1995#0": {
        en: "Operation Storm shatters the Republic of Serbian Krajina. The strategic balance in the western Balkans shifts decisively against Serb forces.",
        bcs: "Operacija Oluja razbija Republiku Srpsku Krajinu. Strateški odnos snaga na zapadnom Balkanu odlučno se mijenja na štetu srpskih snaga.",
    },
    "hv_ammo_transfusion_post_storm_1995#0": {
        en: "The 5th Corps enters the Sana campaign with captured heavy equipment and HV artillery support strengthening its offensive position.",
        bcs: "5. korpus ulazi u operaciju Sana sa zarobljenom teškom opremom i artiljerijskom podrškom HV-a, koje jačaju njegov ofanzivni položaj.",
    },
    "operation_mistral_2_1995#0": {
        en: "Jajce is recaptured after three years. HV-HVO forces advance through western Bosnia, taking substantial territory and forcing VRS withdrawals.",
        bcs: "Jajce je ponovo zauzeto nakon tri godine. Snage HV-a i HVO-a napreduju kroz zapadnu Bosnu, zauzimaju znatnu teritoriju i primoravaju VRS na povlačenja.",
    },
    "operation_sana_1995#0": {
        en: "The 5th Corps advances from the Bihać pocket toward Bosanski Petrovac, Ključ, Bosanska Krupa, and Sanski Most.",
        bcs: "5. korpus napreduje iz bihaćkog džepa prema Bosanskom Petrovcu, Ključu, Bosanskoj Krupi i Sanskom Mostu.",
    },
    "csq_winter_held_audit#0": {
        en: "No side's winter supply broke down this season.",
        bcs: "Zimsko snabdijevanje nijedne strane nije se urušilo ove sezone.",
    },
    "csq_corridor_blocked_audit#0": {
        en: "The Posavina corridor is still cut; the corridor operation did not reach its objective.",
        bcs: "Posavinski koridor je i dalje presječen; operacija za koridor nije ostvarila cilj.",
    },
    "csq_arms_embargo_compliance_audit#0": {
        en: "No side has an outside arms channel on record.",
        bcs: "Ni za jednu stranu nema zabilježenog vanjskog kanala za oružje.",
    },
    "csq_political_unity_audit#0": {
        en: "No side's leadership has split this far into the war.",
        bcs: "Rukovodstvo nijedne strane nije se raskolilo do ovog trenutka u ratu.",
    },
};
