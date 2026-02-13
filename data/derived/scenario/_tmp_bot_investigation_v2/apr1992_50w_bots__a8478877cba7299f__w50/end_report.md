# AWWV Scenario report

- Scenario: apr1992_50w_bots
- Weeks simulated: 50
- Run id: apr1992_50w_bots__a8478877cba7299f__w50

## Control changes (most important)

- Total settlements with controller change: 1728
- Net control counts (start → end): HRHB: 1024, RBiH: 2409, RS: 2389 → HRHB: 902, RBiH: 2282, RS: 2638

Top municipalities by number of flips (aggregates settlement flips by municipality):
  - zenica: 69
  - travnik: 61
  - ilijas: 52
  - sanski_most: 51
  - vares: 49
  - jajce: 48
  - tesanj: 47
  - donji_vakuf: 45
  - brcko: 44
  - derventa: 44

Top direction changes:
  - HRHB → RBiH: 124
  - HRHB → RS: 210
  - RBiH → HRHB: 155
  - RBiH → RS: 639
  - RS → HRHB: 57
  - RS → RBiH: 543

## Other key shifts

Exhaustion (start → end):
  - HRHB: 0.000297 → 0.06710669600000005
  - RBiH: 0.00040699999999999986 → 39.07562919600001
  - RS: 0.0005060000000000002 → 77.07324259999999

Supply pressure (start → end):
  - HRHB: — → 100
  - RBiH: — → 100
  - RS: — → 100

Displacement: settlement count/total (start → end): 55/432825 → 4214/2229.8411309051767
Displacement: municipality count/total (start → end): 55/432825 → 108/54.12331565325483

## Activity over run

- Front-active: max 5297, mean 2846.8, nonzero weeks 31/50
- Pressure-eligible (edges): max 5071, mean 2772.46, nonzero weeks 31/50
- Displacement-trigger eligible: max 192, mean 48.62, nonzero weeks 31/50


## Baseline ops

- Intensity: 1
- Average engagement level: 0.62
- Produced nonzero exhaustion: yes, nonzero displacement: no

## Control events (harness log)

- Total control events: 5425
  - phase_i_control_flip: 5425

## Formation delta

- Formations added: 123, removed: 0
  Added by kind: brigade: 123

## Brigade casualties (fatigue proxy)

- Total fatigue (start → end): 0 → 7143

- **F_HRHB_0001** (HRHB, HRHB derventa Brigade 2): fatigue 0 → 1
- **F_HRHB_0002** (HRHB, HRHB odzak Brigade 1): fatigue 0 → 1
- **F_HRHB_0003** (HRHB, HRHB banja_luka Brigade 1): fatigue 0 → 19
- **F_HRHB_0004** (HRHB, HRHB banja_luka Brigade 2): fatigue 0 → 23
- **F_HRHB_0005** (HRHB, HRHB bosanski_brod Brigade 1): fatigue 0 → 23
- **F_HRHB_0006** (HRHB, HRHB bugojno Brigade 2): fatigue 0 → 31
- **F_HRHB_0007** (HRHB, HRHB odzak Brigade 2): fatigue 0 → 31
- **F_HRHB_0008** (HRHB, HRHB bosanski_samac Brigade 1): fatigue 0 → 31
- **F_HRHB_0009** (HRHB, HRHB jablanica Brigade 1): fatigue 0 → 31
- **F_HRHB_0010** (HRHB, HRHB jajce Brigade 1): fatigue 0 → 31
- **F_HRHB_0011** (HRHB, HRHB bosanski_brod Brigade 2): fatigue 0 → 31
- **F_HRHB_0012** (HRHB, HRHB bosanski_samac Brigade 2): fatigue 0 → 31
- **F_HRHB_0013** (HRHB, HRHB jajce Brigade 2): fatigue 0 → 31
- **F_HRHB_0014** (HRHB, HRHB donji_vakuf Brigade 1): fatigue 0 → 16
- **F_HRHB_0015** (HRHB, HRHB fojnica Brigade 1): fatigue 0 → 10
- **F_HRHB_0016** (HRHB, HRHB zavidovici Brigade 1): fatigue 0 → 13
- **F_HRHB_0017** (HRHB, HRHB zenica Brigade 2): fatigue 0 → 11
- **F_HRHB_0018** (HRHB, HRHB kotor_varos Brigade 1): fatigue 0 → 7
- **F_HRHB_0019** (HRHB, HRHB fojnica Brigade 2): fatigue 0 → 2
- **F_HRHB_0020** (HRHB, HRHB busovaca Brigade 2): fatigue 0 → 2
- **F_HRHB_0021** (HRHB, HRHB gornji_vakuf Brigade 1): fatigue 0 → 11
- **F_HRHB_0022** (HRHB, HRHB konjic Brigade 2): fatigue 0 → 27
- **F_HRHB_0023** (HRHB, HRHB kupres Brigade 2): fatigue 0 → 22
- **F_HRHB_0024** (HRHB, HRHB kotor_varos Brigade 2): fatigue 0 → 18
- **F_HRHB_0025** (HRHB, 107th "Gradačac" Brigade): fatigue 0 → 1
- **F_RBiH_0001** (RBiH, RBiH brcko Brigade 2): fatigue 0 → 13
- **F_RBiH_0002** (RBiH, RBiH ilidza Brigade 2): fatigue 0 → 14
- **F_RBiH_0003** (RBiH, RBiH srebrenica Brigade 1): fatigue 0 → 5
- **F_RBiH_0004** (RBiH, RBiH doboj Brigade 2): fatigue 0 → 14
- **F_RBiH_0005** (RBiH, RBiH foca Brigade 1): fatigue 0 → 4
- **F_RBiH_0006** (RBiH, RBiH foca Brigade 2): fatigue 0 → 17
- **F_RBiH_0007** (RBiH, RBiH ilijas Brigade 1): fatigue 0 → 16
- **F_RBiH_0008** (RBiH, RBiH novo_sarajevo Brigade 1): fatigue 0 → 20
- **F_RBiH_0009** (RBiH, RBiH novo_sarajevo Brigade 2): fatigue 0 → 5
- **F_RBiH_0010** (RBiH, RBiH teslic Brigade 1): fatigue 0 → 13
- **F_RBiH_0011** (RBiH, RBiH vogosca Brigade 1): fatigue 0 → 16
- **F_RBiH_0012** (RBiH, RBiH bosanski_novi Brigade 1): fatigue 0 → 15
- **F_RBiH_0013** (RBiH, RBiH bratunac Brigade 1): fatigue 0 → 21
- **F_RBiH_0014** (RBiH, RBiH cajnice Brigade 1): fatigue 0 → 20
- **F_RBiH_0015** (RBiH, RBiH ilijas Brigade 2): fatigue 0 → 10
- **F_RBiH_0016** (RBiH, RBiH prijedor Brigade 1): fatigue 0 → 11
- **F_RBiH_0017** (RBiH, RBiH sanski_most Brigade 1): fatigue 0 → 21
- **F_RBiH_0018** (RBiH, RBiH sanski_most Brigade 2): fatigue 0 → 13
- **F_RBiH_0019** (RBiH, RBiH teslic Brigade 2): fatigue 0 → 13
- **F_RBiH_0020** (RBiH, RBiH vlasenica Brigade 2): fatigue 0 → 8
- **F_RBiH_0021** (RBiH, RBiH vogosca Brigade 2): fatigue 0 → 20
- **F_RBiH_0022** (RBiH, RBiH bijeljina Brigade 1): fatigue 0 → 12
- **F_RBiH_0023** (RBiH, RBiH bosanski_petrovac Brigade 1): fatigue 0 → 13
- **F_RBiH_0024** (RBiH, RBiH prijedor Brigade 2): fatigue 0 → 7
- **F_RBiH_0025** (RBiH, RBiH visegrad Brigade 1): fatigue 0 → 12
- **F_RBiH_0026** (RBiH, RBiH banja_luka Brigade 1): fatigue 0 → 19
- **F_RBiH_0027** (RBiH, RBiH bijeljina Brigade 2): fatigue 0 → 6
- **F_RBiH_0028** (RBiH, RBiH busovaca Brigade 2): fatigue 0 → 5
- **F_RBiH_0029** (RBiH, RBiH cajnice Brigade 2): fatigue 0 → 9
- **F_RBiH_0030** (RBiH, RBiH han_pijesak Brigade 1): fatigue 0 → 7
- **F_RBiH_0031** (RBiH, RBiH banja_luka Brigade 2): fatigue 0 → 14
- **F_RBiH_0032** (RBiH, RBiH kiseljak Brigade 2): fatigue 0 → 20
- **F_RBiH_0033** (RBiH, RBiH derventa Brigade 1): fatigue 0 → 4
- **F_RBiH_0034** (RBiH, RBiH duvno Brigade 1): fatigue 0 → 14
- **F_RBiH_0035** (RBiH, RBiH gacko Brigade 1): fatigue 0 → 20
- **F_RBiH_0036** (RBiH, RBiH bosanska_dubica Brigade 1): fatigue 0 → 10
- **F_RBiH_0037** (RBiH, RBiH bosanski_brod Brigade 1): fatigue 0 → 9
- **F_RBiH_0038** (RBiH, RBiH kalinovik Brigade 1): fatigue 0 → 6
- **F_RBiH_0039** (RBiH, RBiH derventa Brigade 2): fatigue 0 → 19
- **F_RBiH_0040** (RBiH, RBiH jajce Brigade 1): fatigue 0 → 15
- **F_RBiH_0041** (RBiH, RBiH jajce Brigade 2): fatigue 0 → 9
- **F_RBiH_0042** (RBiH, RBiH kotor_varos Brigade 1): fatigue 0 → 29
- **F_RBiH_0043** (RBiH, RBiH celinac Brigade 1): fatigue 0 → 1
- **F_RBiH_0044** (RBiH, RBiH pale Brigade 1): fatigue 0 → 9
- **F_RBiH_0045** (RBiH, RBiH mrkonjic_grad Brigade 1): fatigue 0 → 12
- **F_RBiH_0046** (RBiH, RBiH bosanski_brod Brigade 2): fatigue 0 → 16
- **F_RBiH_0047** (RBiH, RBiH novi_travnik Brigade 2): fatigue 0 → 11
- **F_RBiH_0048** (RBiH, RBiH bosanska_gradiska Brigade 1): fatigue 0 → 14
- **F_RBiH_0049** (RBiH, RBiH kljuc Brigade 1): fatigue 0 → 12
- **F_RBiH_0050** (RBiH, RBiH kljuc Brigade 2): fatigue 0 → 14
- **F_RBiH_0051** (RBiH, RBiH odzak Brigade 1): fatigue 0 → 22
- **F_RBiH_0052** (RBiH, RBiH odzak Brigade 2): fatigue 0 → 16
- **F_RBiH_0053** (RBiH, RBiH zepce Brigade 2): fatigue 0 → 28
- **F_RS_0001** (RS, RS foca Brigade 2): fatigue 0 → 1
- **F_RS_0002** (RS, RS kljuc Brigade 2): fatigue 0 → 1
- **F_RS_0003** (RS, RS novo_sarajevo Brigade 2): fatigue 0 → 1
- **F_RS_0004** (RS, RS sanski_most Brigade 2): fatigue 0 → 31
- **F_RS_0005** (RS, 15th Bihać Infantry): fatigue 0 → 31
- **F_RS_0006** (RS, 1st Posavina Infantry): fatigue 0 → 31
- **F_RS_0007** (RS, RS centar_sarajevo Brigade 1): fatigue 0 → 31
- **F_RS_0008** (RS, RS derventa Brigade 2): fatigue 0 → 31
- **F_RS_0009** (RS, RS ilidza Brigade 1): fatigue 0 → 16
- **F_RS_0010** (RS, RS ilidza Brigade 2): fatigue 0 → 19
- **F_RS_0011** (RS, 3rd Majevica Infantry): fatigue 0 → 31
- **F_RS_0012** (RS, RS novi_grad_sarajevo Brigade 1): fatigue 0 → 12
- **F_RS_0013** (RS, RS novi_grad_sarajevo Brigade 2): fatigue 0 → 31
- **F_RS_0014** (RS, RS zenica Brigade 1): fatigue 0 → 29
- **F_RS_0015** (RS, RS bihac Brigade 2): fatigue 0 → 31
- **F_RS_0016** (RS, RS bosanski_brod Brigade 1): fatigue 0 → 31
- **F_RS_0017** (RS, RS bosanski_samac Brigade 2): fatigue 0 → 29
- **F_RS_0018** (RS, RS brcko Brigade 2): fatigue 0 → 31
- **F_RS_0019** (RS, RS centar_sarajevo Brigade 2): fatigue 0 → 31
- **F_RS_0020** (RS, RS gorazde Brigade 1): fatigue 0 → 20
- **F_RS_0021** (RS, RS kalesija Brigade 1): fatigue 0 → 31
- **F_RS_0022** (RS, RS mostar Brigade 1): fatigue 0 → 23
- **F_RS_0023** (RS, RS zenica Brigade 2): fatigue 0 → 28
- **F_RS_0024** (RS, RS bosanski_brod Brigade 2): fatigue 0 → 11
- **F_RS_0025** (RS, RS bugojno Brigade 1): fatigue 0 → 12
- **F_RS_0026** (RS, RS mostar Brigade 2): fatigue 0 → 19
- **F_RS_0027** (RS, RS cajnice Brigade 2): fatigue 0 → 26
- **F_RS_0028** (RS, RS ilijas Brigade 1): fatigue 0 → 27
- **F_RS_0029** (RS, RS bugojno Brigade 2): fatigue 0 → 29
- **F_RS_0030** (RS, RS ilijas Brigade 2): fatigue 0 → 29
- **F_RS_0031** (RS, RS srebrenica Brigade 1): fatigue 0 → 29
- **F_RS_0032** (RS, RS tuzla Brigade 1): fatigue 0 → 16
- **F_RS_0033** (RS, 3rd Posavina Light Infantry): fatigue 0 → 29
- **F_RS_0034** (RS, RS maglaj Brigade 1): fatigue 0 → 22
- **F_RS_0035** (RS, RS olovo Brigade 1): fatigue 0 → 29
- **F_RS_0036** (RS, RS tuzla Brigade 2): fatigue 0 → 23
- **F_RS_0037** (RS, RS odzak Brigade 1): fatigue 0 → 29
- **F_RS_0038** (RS, RS banovici Brigade 1): fatigue 0 → 27
- **F_RS_0039** (RS, RS jajce Brigade 1): fatigue 0 → 29
- **F_RS_0040** (RS, RS kladanj Brigade 1): fatigue 0 → 29
- **F_RS_0041** (RS, RS srebrenik Brigade 1): fatigue 0 → 28
- **F_RS_0042** (RS, RS odzak Brigade 2): fatigue 0 → 28
- **F_RS_0043** (RS, RS tesanj Brigade 1): fatigue 0 → 29
- **F_RS_0044** (RS, RS jajce Brigade 2): fatigue 0 → 29
- **F_RS_0045** (RS, RS kiseljak Brigade 1): fatigue 0 → 29
- **arbih_101st_mountain** (RBiH, 101st Mountain): fatigue 0 → 1
- **arbih_102nd_motorized** (RBiH, 102nd Motorized): fatigue 0 → 1
- **arbih_104th_vitezka_motorized** (RBiH, 104th Vitezka Motorized): fatigue 0 → 1
- **arbih_105th_motorized** (RBiH, 105th Motorized): fatigue 0 → 7
- **arbih_109th_mountain** (RBiH, 109th Mountain): fatigue 0 → 9
- **arbih_10th_mountain** (RBiH, 10th Mountain Brigade): fatigue 0 → 2
- **arbih_111th_vitezka_motorized** (RBiH, 111th Vitezka Motorized): fatigue 0 → 11
- **arbih_112th_vitezka_motorized** (RBiH, 112th Vitezka Motorized): fatigue 0 → 14
- **arbih_115th_mountain** (RBiH, 115th Mountain): fatigue 0 → 15
- **arbih_116th_mountain** (RBiH, 116th Mountain Brigade): fatigue 0 → 13
- **arbih_120th_liberation_black_swans** (RBiH, 120th Liberation "Black Swans"): fatigue 0 → 2
- **arbih_123rd_light** (RBiH, 123rd Light): fatigue 0 → 9
- **arbih_124th_light_king_tvrtko** (RBiH, 124th Light "King Tvrtko"): fatigue 0 → 10
- **arbih_131st_light** (RBiH, 131st Light): fatigue 0 → 1
- **arbih_141st_light** (RBiH, 141st Light): fatigue 0 → 8
- **arbih_143rd_light** (RBiH, 143rd Light): fatigue 0 → 1
- **arbih_145th_light** (RBiH, 145th Light): fatigue 0 → 1
- **arbih_146th_light** (RBiH, 146th Light): fatigue 0 → 1
- **arbih_147th_light** (RBiH, 147th Light): fatigue 0 → 6
- **arbih_152nd_mountain** (RBiH, 152nd Mountain): fatigue 0 → 1
- **arbih_155th_motorized** (RBiH, 155th Motorized): fatigue 0 → 1
- **arbih_161st_slavna_olovo_mountain** (RBiH, 161st Slavna Olovo Mountain): fatigue 0 → 1
- **arbih_162nd_mountain** (RBiH, 162nd Mountain): fatigue 0 → 1
- **arbih_164th_mountain** (RBiH, 164th Mountain): fatigue 0 → 1
- **arbih_165th_mountain** (RBiH, 165th Mountain): fatigue 0 → 1
- **arbih_17th_muslim_light** (RBiH, 17th Muslim Light): fatigue 0 → 1
- **arbih_17th_vitezka_mountain** (RBiH, 17th Vitezka Mountain): fatigue 0 → 2
- **arbih_181st_mountain** (RBiH, 181st Mountain): fatigue 0 → 20
- **arbih_182nd_vitezka_light** (RBiH, 182nd Vitezka Light): fatigue 0 → 11
- **arbih_185th_light** (RBiH, 185th Light): fatigue 0 → 1
- **arbih_1st_cerska** (RBiH, 1st Cerska Brigade): fatigue 0 → 12
- **arbih_1st_corps** (RBiH, 1st Corps): fatigue 0 → 1
- **arbih_1st_kamenica** (RBiH, 1st Kamenica Brigade): fatigue 0 → 10
- **arbih_1st_mountain** (RBiH, 1st Mountain Brigade): fatigue 0 → 8
- **arbih_1st_olovo** (RBiH, 1st Olovo Brigade): fatigue 0 → 20
- **arbih_210th_vitezka_liberation_nesib_maliki** (RBiH, 210th Vitezka Liberation "Nesib Malikić"): fatigue 0 → 5
- **arbih_211th_liberation** (RBiH, 211th Liberation): fatigue 0 → 13
- **arbih_212th_mountain** (RBiH, 212th Mountain): fatigue 0 → 20
- **arbih_213th_vitezka_mountain** (RBiH, 213th Vitezka Mountain): fatigue 0 → 20
- **arbih_215th_vitezka_mountain** (RBiH, 215th Vitezka Mountain): fatigue 0 → 11
- **arbih_217th_vitezka_mountain** (RBiH, 217th Vitezka Mountain): fatigue 0 → 17
- **arbih_221st_mountain** (RBiH, 221st Mountain): fatigue 0 → 20
- **arbih_222nd_liberation** (RBiH, 222nd Liberation): fatigue 0 → 18
- **arbih_223rd_mountain** (RBiH, 223rd Mountain): fatigue 0 → 7
- **arbih_224th_mountain** (RBiH, 224th Mountain): fatigue 0 → 15
- **arbih_225th_muslim_mountain** (RBiH, 225th Muslim Mountain): fatigue 0 → 20
- **arbih_240th_muslim_mountain** (RBiH, 240th Muslim Mountain): fatigue 0 → 20
- **arbih_241st_spreca_muslim_light_gazije** (RBiH, 241st Spreca Muslim Light "Gazije"): fatigue 0 → 20
- **arbih_242nd_zvornik_muslim_light** (RBiH, 242nd Zvornik Muslim Light): fatigue 0 → 20
- **arbih_243rd_muslimpodrinje_mountain** (RBiH, 243rd Muslim-Podrinje Mountain): fatigue 0 → 20
- **arbih_244th_mountain** (RBiH, 244th Mountain): fatigue 0 → 20
- **arbih_245th_mountain** (RBiH, 245th Mountain): fatigue 0 → 20
- **arbih_246th_vitezka_mountain** (RBiH, 246th Vitezka Mountain): fatigue 0 → 20
- **arbih_24th_antiterrorist_company_ivinice_wasps** (RBiH, 24th Antiterrorist Company "Živinice Wasps"): fatigue 0 → 20
- **arbih_24th_sabotage_battalion_black_wolves** (RBiH, 24th Sabotage Battalion "Black Wolves"): fatigue 0 → 21
- **arbih_250th_liberation** (RBiH, 250th Liberation): fatigue 0 → 22
- **arbih_252nd_slavna_mountain** (RBiH, 252nd Slavna Mountain): fatigue 0 → 20
- **arbih_253rd_mountain** (RBiH, 253rd Mountain): fatigue 0 → 20
- **arbih_254th_mountain** (RBiH, 254th Mountain): fatigue 0 → 20
- **arbih_255th_slavna_mountain_hajrudin_mesi** (RBiH, 255th Slavna Mountain "Hajrudin Mesić"): fatigue 0 → 20
- **arbih_285th_light** (RBiH, 285th Light Brigade): fatigue 0 → 20
- **arbih_286th_mountain** (RBiH, 286th Mountain): fatigue 0 → 22
- **arbih_287th_mountain** (RBiH, 287th Mountain): fatigue 0 → 20
- **arbih_28th_independent** (RBiH, 28th Independent Division): fatigue 0 → 20
- **arbih_2nd_corps** (RBiH, 2nd Corps): fatigue 0 → 22
- **arbih_2nd_mountain** (RBiH, 2nd Mountain Brigade): fatigue 0 → 22
- **arbih_2nd_tuzla** (RBiH, 2nd Tuzla Brigade): fatigue 0 → 20
- **arbih_303rd_vitezka_mountain** (RBiH, 303rd Vitezka Mountain): fatigue 0 → 24
- **arbih_314th_slavna_liberation** (RBiH, 314th Slavna Liberation): fatigue 0 → 22
- **arbih_319th_liberation** (RBiH, 319th Liberation): fatigue 0 → 20
- **arbih_327th_vitezka_mountain** (RBiH, 327th Vitezka Mountain): fatigue 0 → 20
- **arbih_328th_mountain** (RBiH, 328th Mountain): fatigue 0 → 20
- **arbih_329th_mountain** (RBiH, 329th Mountain): fatigue 0 → 24
- **arbih_330th_liberation** (RBiH, 330th Liberation): fatigue 0 → 22
- **arbih_351st_liberation** (RBiH, 351st Liberation): fatigue 0 → 20
- **arbih_372nd_vitezka_mountain** (RBiH, 372nd Vitezka Mountain): fatigue 0 → 20
- **arbih_373rd_slavna_mountain** (RBiH, 373rd Slavna Mountain): fatigue 0 → 20
- **arbih_374th_slavna_light** (RBiH, 374th Slavna Light): fatigue 0 → 26
- **arbih_375th_liberation** (RBiH, 375th Liberation): fatigue 0 → 20
- **arbih_377th_vitezka_mountain** (RBiH, 377th Vitezka Mountain): fatigue 0 → 20
- **arbih_3rd_corps** (RBiH, 3rd Corps): fatigue 0 → 20
- **arbih_441st_vitezka_mountain** (RBiH, 441st Vitezka Mountain): fatigue 0 → 17
- **arbih_442nd_mountain** (RBiH, 442nd Mountain): fatigue 0 → 20
- **arbih_443rd_mountain** (RBiH, 443rd Mountain): fatigue 0 → 20
- **arbih_444th_mountain** (RBiH, 444th Mountain): fatigue 0 → 20
- **arbih_445th_mountain** (RBiH, 445th Mountain): fatigue 0 → 20
- **arbih_446th_light** (RBiH, 446th Light): fatigue 0 → 20
- **arbih_447th_liberation** (RBiH, 447th Liberation): fatigue 0 → 20
- **arbih_448th_liberation** (RBiH, 448th Liberation): fatigue 0 → 20
- **arbih_449th_eastern_herzegovina_mountain** (RBiH, 449th Eastern Herzegovina Mountain): fatigue 0 → 20
- **arbih_450th_light** (RBiH, 450th Light): fatigue 0 → 20
- **arbih_4th_corps** (RBiH, 4th Corps): fatigue 0 → 20
- **arbih_4th_muslim_light** (RBiH, 4th Muslim Light): fatigue 0 → 20
- **arbih_501st_slavna_mountain** (RBiH, 501st Slavna Mountain): fatigue 0 → 20
- **arbih_502nd_vitezka_mountain** (RBiH, 502nd Vitezka Mountain): fatigue 0 → 20
- **arbih_503rd_slavna_mountain** (RBiH, 503rd Slavna Mountain): fatigue 0 → 20
- **arbih_505th_vitezka_mountain** (RBiH, 505th Vitezka Mountain): fatigue 0 → 26
- **arbih_506th_mountain** (RBiH, 506th Mountain): fatigue 0 → 20
- **arbih_510th_bosnian_liberation** (RBiH, 510th Bosnian Liberation): fatigue 0 → 20
- **arbih_511th_slavna_mountain** (RBiH, 511th Slavna Mountain): fatigue 0 → 18
- **arbih_517th_light** (RBiH, 517th Light): fatigue 0 → 20
- **arbih_5th_corps** (RBiH, 5th Corps): fatigue 0 → 20
- **arbih_6th_corps** (RBiH, 6th Corps): fatigue 0 → 20
- **arbih_705th_slavna_mountain** (RBiH, 705th Slavna Mountain): fatigue 0 → 20
- **arbih_706th_muslim_mountain** (RBiH, 706th Muslim Mountain): fatigue 0 → 20
- **arbih_707th_slavna_mountain** (RBiH, 707th Slavna Mountain): fatigue 0 → 20
- **arbih_708th_mountain** (RBiH, 708th Mountain): fatigue 0 → 20
- **arbih_712th_mountain** (RBiH, 712th Mountain): fatigue 0 → 17
- **arbih_717th_slavna_mountain** (RBiH, 717th Slavna Mountain): fatigue 0 → 21
- **arbih_725th_light** (RBiH, 725th Light): fatigue 0 → 24
- **arbih_727th_slavna** (RBiH, 727th Slavna): fatigue 0 → 19
- **arbih_733rd_mountain** (RBiH, 733rd Mountain): fatigue 0 → 20
- **arbih_737th_muslim_light** (RBiH, 737th Muslim Light): fatigue 0 → 20
- **arbih_770th_slavna_mountain** (RBiH, 770th Slavna Mountain): fatigue 0 → 20
- **arbih_7th_corps** (RBiH, 7th Corps): fatigue 0 → 20
- **arbih_7th_vitezka_muslim_liberation** (RBiH, 7th Vitezka Muslim Liberation): fatigue 0 → 7
- **arbih_801st_light** (RBiH, 801st Light): fatigue 0 → 6
- **arbih_802nd_light** (RBiH, 802nd Light): fatigue 0 → 24
- **arbih_803rd_light** (RBiH, 803rd Light): fatigue 0 → 18
- **arbih_807th_muslim_liberation** (RBiH, 807th Muslim Liberation): fatigue 0 → 31
- **arbih_808th_liberation** (RBiH, 808th Liberation): fatigue 0 → 6
- **arbih_81st_independent** (RBiH, 81st Independent Division): fatigue 0 → 14
- **arbih_81st_reconnaissancesabotage_company** (RBiH, 81st Reconnaissance-Sabotage Company): fatigue 0 → 22
- **arbih_843rd_light** (RBiH, 843rd Light): fatigue 0 → 22
- **arbih_851st_vitezka_liberation** (RBiH, 851st Vitezka Liberation): fatigue 0 → 19
- **arbih_9th_muslim_liberation** (RBiH, 9th Muslim Liberation): fatigue 0 → 18
- **arbih_general_staff** (RBiH, General Staff ARBiH): fatigue 0 → 19
- **arbih_guards_brigade** (RBiH, Guards Brigade): fatigue 0 → 22
- **arbih_hvo_kralj_tvrtko** (RBiH, HVO Brigade "Kralj Tvrtko"): fatigue 0 → 15
- **arbih_main_logistics_center** (RBiH, Main Logistics Center): fatigue 0 → 22
- **arbih_military_school_center** (RBiH, Military School Center): fatigue 0 → 31
- **hrhb_101st_oraje_brigade** (HRHB, 101st Orašje Brigade): fatigue 0 → 18
- **hrhb_102nd_brigade** (HRHB, 102nd Brigade): fatigue 0 → 25
- **hrhb_103rd_104th_105th_106th_brigades** (HRHB, 103rd, 104th, 105th, 106th Brigades): fatigue 0 → 23
- **hrhb_110th_usora_brigade** (HRHB, 110th Usora Brigade): fatigue 0 → 21
- **hrhb_111th_brigade** (HRHB, 111th Brigade): fatigue 0 → 1
- **hrhb_1st_brigade_mostar** (HRHB, 1st Brigade (Mostar)): fatigue 0 → 18
- **hrhb_1st_herzegovina_brigade_knez_domagoj** (HRHB, 1st Herzegovina Brigade "Knez Domagoj"): fatigue 0 → 29
- **hrhb_2nd_brigade_mostar** (HRHB, 2nd Brigade (Mostar)): fatigue 0 → 30
- **hrhb_6th_brigade_ranko_boban** (HRHB, 6th Brigade "Ranko Boban"): fatigue 0 → 29
- **hrhb_94th_brigade** (HRHB, 94th Brigade): fatigue 0 → 25
- **hrhb_95th_brigade** (HRHB, 95th Brigade): fatigue 0 → 25
- **hrhb_apljina_brigade** (HRHB, Čapljina Brigade): fatigue 0 → 18
- **hrhb_ban_jelai_brigade** (HRHB, Ban Jelačić Brigade): fatigue 0 → 11
- **hrhb_grude_brigade** (HRHB, Grude Brigade): fatigue 0 → 16
- **hrhb_herceg_stjepan_brigade** (HRHB, Herceg Stjepan Brigade): fatigue 0 → 1
- **hrhb_iroki_brijeg_brigade** (HRHB, Široki Brijeg Brigade): fatigue 0 → 1
- **hrhb_itluk_brigade** (HRHB, Čitluk Brigade): fatigue 0 → 1
- **hrhb_jure_franceti_brigade** (HRHB, "Jure Francetić" Brigade): fatigue 0 → 11
- **hrhb_kiseljak_brigade** (HRHB, Kiseljak Brigade): fatigue 0 → 18
- **hrhb_kralj_petar_kreimir_iv_brigade** (HRHB, Kralj Petar Krešimir IV Brigade): fatigue 0 → 17
- **hrhb_kralj_tomislav_brigade** (HRHB, Kralj Tomislav Brigade): fatigue 0 → 4
- **hrhb_kreevo_brigade** (HRHB, Kreševo Brigade): fatigue 0 → 1
- **hrhb_kupres_battalion_kralj_tomislav** (HRHB, Kupres battalion (Kralj Tomislav)): fatigue 0 → 3
- **hrhb_ljubuki_brigade** (HRHB, Ljubuški Brigade): fatigue 0 → 3
- **hrhb_mario_hrka_ikota_brigade** (HRHB, Mario Hrkač Čikota Brigade): fatigue 0 → 1
- **hrhb_mostar_brigade** (HRHB, Mostar Brigade): fatigue 0 → 1
- **hrhb_posuje_battalion_kralj_tomislav** (HRHB, Posušje battalion (Kralj Tomislav)): fatigue 0 → 5
- **hrhb_stjepan_tomaevi_brigade** (HRHB, "Stjepan Tomašević" Brigade): fatigue 0 → 9
- **hrhb_stolac_units** (HRHB, Stolac Units): fatigue 0 → 3
- **hrhb_travnik_brigade** (HRHB, Travnik Brigade): fatigue 0 → 31
- **hrhb_vitezovi_brigade_vitez** (HRHB, "Vitezovi" Brigade (Vitez)): fatigue 0 → 8
- **hvo_bobovac** (HRHB, Brigade "Bobovac"): fatigue 0 → 21
- **hvo_central_bosnia** (HRHB, Central Bosnia OZ): fatigue 0 → 16
- **hvo_eugen_kvaternik** (HRHB, Brigade "Eugen Kvaternik"): fatigue 0 → 27
- **hvo_frankopan** (HRHB, Brigade "Frankopan"): fatigue 0 → 1
- **hvo_jure_francetic** (HRHB, Brigade "Jure Francetić"): fatigue 0 → 1
- **hvo_kotromanic** (HRHB, Brigade "Kotromanić"): fatigue 0 → 13
- **hvo_northwest_bosnia** (HRHB, Northwest Bosnia OZ): fatigue 0 → 1
- **hvo_southeast_herzegovina** (HRHB, Southeast Herzegovina OZ): fatigue 0 → 4
- **hvo_stjepan_tomasevic** (HRHB, Brigade "Stjepan Tomašević"): fatigue 0 → 2
- **hvo_tomislavgrad** (HRHB, Tomislavgrad OZ): fatigue 0 → 1
- **hvo_travnik** (HRHB, Brigade "Travnik"): fatigue 0 → 5
- **hvo_zvijezda** (HRHB, Brigade "Zvijezda"): fatigue 0 → 1
- **rs_10th_sabotage_detachment** (RS, 10th Sabotage Detachment): fatigue 0 → 29
- **rs_11th_dubica_infantry** (RS, 11th Dubica Infantry): fatigue 0 → 28
- **rs_11th_krupa_light_infantry** (RS, 11th Krupa Light Infantry): fatigue 0 → 29
- **rs_11th_mrkonji_light_infantry** (RS, 11th Mrkonjić Light Infantry): fatigue 0 → 29
- **rs_12th_kotorsko_light_infantry** (RS, 12th Kotorsko Light Infantry): fatigue 0 → 29
- **rs_14th_rear_base** (RS, 14th Rear Base): fatigue 0 → 29
- **rs_16th_krajina_motorized** (RS, 16th Krajina Motorized): fatigue 0 → 28
- **rs_17th_klju_light_infantry** (RS, 17th Ključ Light Infantry): fatigue 0 → 29
- **rs_19th_krajina_light_infantry** (RS, 19th Krajina Light Infantry): fatigue 0 → 29
- **rs_1st_armored** (RS, 1st Armored): fatigue 0 → 29
- **rs_1st_banja_luka_light_infantry** (RS, 1st Banja Luka Light Infantry): fatigue 0 → 29
- **rs_1st_bijeljina_light_infantry_panthers** (RS, 1st Bijeljina Light Infantry "Panthers"): fatigue 0 → 29
- **rs_1st_birac** (RS, 1st Birač): fatigue 0 → 29
- **rs_1st_bratunac** (RS, 1st Bratunac): fatigue 0 → 25
- **rs_1st_celinac_light_infantry** (RS, 1st Celinac Light Infantry): fatigue 0 → 28
- **rs_1st_doboj_light_infantry** (RS, 1st Doboj Light Infantry): fatigue 0 → 28
- **rs_1st_drvar_light_infantry** (RS, 1st Drvar Light Infantry): fatigue 0 → 29
- **rs_1st_gradika_light_infantry** (RS, 1st Gradiška Light Infantry): fatigue 0 → 24
- **rs_1st_guards_motorized** (RS, 1st Guards Motorized): fatigue 0 → 28
- **rs_1st_kotor_varo_light_infantry** (RS, 1st Kotor Varoš Light Infantry): fatigue 0 → 26
- **rs_1st_krnjin_light_infantry** (RS, 1st Krnjin Light Infantry): fatigue 0 → 29
- **rs_1st_majevica_light_infantry** (RS, 1st Majevica Light Infantry): fatigue 0 → 21
- **rs_1st_milii** (RS, 1st Milići): fatigue 0 → 24
- **rs_1st_novigrad_infantry** (RS, 1st Novigrad Infantry): fatigue 0 → 29
- **rs_1st_ozren_light_infantry** (RS, 1st Ozren Light Infantry): fatigue 0 → 29
- **rs_1st_podrinje** (RS, 1st Podrinje): fatigue 0 → 29
- **rs_1st_prnjavor_light_infantry** (RS, 1st Prnjavor Light Infantry): fatigue 0 → 28
- **rs_1st_romanija_infantry** (RS, 1st Romanija Infantry): fatigue 0 → 29
- **rs_1st_sarajevo_mechanized** (RS, 1st Sarajevo Mechanized): fatigue 0 → 24
- **rs_1st_semberija_light_infantry** (RS, 1st Semberija Light Infantry): fatigue 0 → 25
- **rs_1st_sipovo_light_infantry** (RS, 1st Sipovo Light Infantry): fatigue 0 → 29
- **rs_1st_srbac_light_infantry** (RS, 1st Srbac Light Infantry): fatigue 0 → 27
- **rs_1st_tesli_infantry** (RS, 1st Teslić Infantry): fatigue 0 → 26
- **rs_1st_trebava_infantry** (RS, 1st Trebava Infantry): fatigue 0 → 25
- **rs_1st_vlasenica** (RS, 1st Vlasenica): fatigue 0 → 29
- **rs_1st_vujak_light_infantry** (RS, 1st Vučjak Light Infantry): fatigue 0 → 23
- **rs_1st_zvornik** (RS, 1st Zvornik): fatigue 0 → 25
- **rs_21st_independent_armored_battalion** (RS, 21st Independent Armored Battalion): fatigue 0 → 25
- **rs_22nd_krajina_infantry** (RS, 22nd Krajina Infantry): fatigue 0 → 30
- **rs_27th_derventa_motorized** (RS, 27th Derventa Motorized): fatigue 0 → 25
- **rs_27th_rear_base** (RS, 27th Rear Base): fatigue 0 → 23
- **rs_2nd_armored** (RS, 2nd Armored): fatigue 0 → 23
- **rs_2nd_banja_luka_light_infantry** (RS, 2nd Banja Luka Light Infantry): fatigue 0 → 23
- **rs_2nd_krajina_infantry** (RS, 2nd Krajina Infantry): fatigue 0 → 23
- **rs_2nd_majevica_light_infantry** (RS, 2nd Majevica Light Infantry): fatigue 0 → 26
- **rs_2nd_ozren_light_infantry** (RS, 2nd Ozren Light Infantry): fatigue 0 → 23
- **rs_2nd_posavina_light_infantry** (RS, 2nd Posavina Light Infantry): fatigue 0 → 23
- **rs_2nd_sarajevo_light_infantry** (RS, 2nd Sarajevo Light Infantry): fatigue 0 → 25
- **rs_2nd_semberija_light_infantry** (RS, 2nd Semberija Light Infantry): fatigue 0 → 27
- **rs_2nd_tesli_light_infantry** (RS, 2nd Teslić Light Infantry): fatigue 0 → 29
- **rs_30th_infantry_division_elements_30th_recce_30th_mp_30th_comms_36th_ind_armored_bn** (RS, 30th Infantry Division elements (30th Recce, 30th MP, 30th Comms, 36th Ind Armored Bn)): fatigue 0 → 29
- **rs_30th_rear_base** (RS, 30th Rear Base): fatigue 0 → 21
- **rs_31st_light_infantry** (RS, 31st Light Infantry): fatigue 0 → 25
- **rs_35th_rear_base** (RS, 35th Rear Base): fatigue 0 → 23
- **rs_3rd_banja_luka_light_infantry** (RS, 3rd Banja Luka Light Infantry): fatigue 0 → 25
- **rs_3rd_ozren_light_infantry** (RS, 3rd Ozren Light Infantry): fatigue 0 → 25
- **rs_3rd_petrovac_light_infantry** (RS, 3rd Petrovac Light Infantry): fatigue 0 → 18
- **rs_3rd_sarajevo_infantry** (RS, 3rd Sarajevo Infantry): fatigue 0 → 26
- **rs_3rd_semberija_light_infantry** (RS, 3rd Semberija Light Infantry): fatigue 0 → 22
- **rs_410th_intelligence_center** (RS, 410th Intelligence Center): fatigue 0 → 23
- **rs_43rd_prijedor_motorized** (RS, 43rd Prijedor Motorized): fatigue 0 → 26
- **rs_4th_banja_luka_light_infantry** (RS, 4th Banja Luka Light Infantry): fatigue 0 → 21
- **rs_4th_ozren_light_infantry** (RS, 4th Ozren Light Infantry): fatigue 0 → 16
- **rs_4th_sarajevo_light_infantry** (RS, 4th Sarajevo Light Infantry): fatigue 0 → 28
- **rs_5th_glamo_light_infantry** (RS, 5th Glamoč Light Infantry): fatigue 0 → 22
- **rs_5th_kozara_light_infantry** (RS, 5th Kozara Light Infantry): fatigue 0 → 22
- **rs_5th_podrinje** (RS, 5th Podrinje): fatigue 0 → 26
- **rs_63rd_autotransport_battalion** (RS, 63rd Autotransport Battalion): fatigue 0 → 19
- **rs_65th_protection_motorized_regiment** (RS, 65th Protection Motorized Regiment): fatigue 0 → 17
- **rs_67th_communications_regiment** (RS, 67th Communications Regiment): fatigue 0 → 29
- **rs_6th_sanske_infantry** (RS, 6th Sanske Infantry): fatigue 0 → 29
- **rs_7th_krajina_motorized** (RS, 7th Krajina Motorized): fatigue 0 → 30
- **rs_89th_rocket_artillery_brigade** (RS, 89th Rocket Artillery Brigade): fatigue 0 → 21
- **rs_9th_grahovo_light_infantry** (RS, 9th Grahovo Light Infantry): fatigue 0 → 31
- **rs_ajnie_brigade** (RS, Čajniče Brigade): fatigue 0 → 17
- **rs_bilea_brigade** (RS, Bileća Brigade): fatigue 0 → 15
- **rs_doboj_operational_group_9_9th_recce_9th_mp_9th_mixed_engineer** (RS, "Doboj" Operational Group 9 (9th Recce, 9th MP, 9th Mixed Engineer)): fatigue 0 → 15
- **rs_ekovii_brigade** (RS, Šekovići Brigade): fatigue 0 → 14
- **rs_foa_brigade** (RS, Foča Brigade): fatigue 0 → 15
- **rs_gacko_brigade** (RS, Gacko Brigade): fatigue 0 → 15
- **rs_kalinovik_brigade** (RS, Kalinovik Brigade): fatigue 0 → 15
- **rs_military_hospital** (RS, Military Hospital): fatigue 0 → 29
- **rs_nevesinje_brigade** (RS, Nevesinje Brigade): fatigue 0 → 16
- **rs_rajko_bala_center_for_military_schools** (RS, "Rajko Balač" Center for Military Schools): fatigue 0 → 16
- **rs_rogatica_brigade** (RS, Rogatica Brigade): fatigue 0 → 12
- **rs_technical_repair_institute_hadii** (RS, Technical Repair Institute "Hadžići"): fatigue 0 → 31
- **rs_trebinje_brigade** (RS, Trebinje Brigade): fatigue 0 → 16
- **rs_viegrad_brigade** (RS, Višegrad Brigade): fatigue 0 → 19
- **vrs_1st_celinac** (RS, 1st Čelinac Light Brigade): fatigue 0 → 12
- **vrs_1st_krajina** (RS, 1st Krajina Corps): fatigue 0 → 16
- **vrs_1st_laktasi** (RS, 1st Laktaši Light Brigade): fatigue 0 → 24
- **vrs_2nd_krajina** (RS, 2nd Krajina Corps): fatigue 0 → 25
- **vrs_30th_division** (RS, 30th Light Infantry Division): fatigue 0 → 3
- **vrs_31st_mountain_storm** (RS, 31st Mountain "Storm" Brigade): fatigue 0 → 5
- **vrs_drina** (RS, Drina Corps): fatigue 0 → 7
- **vrs_east_bosnian** (RS, East Bosnian Corps): fatigue 0 → 2
- **vrs_herzegovina** (RS, Herzegovina Corps): fatigue 0 → 6
- **vrs_main_staff** (RS, Main Staff VRS): fatigue 0 → 8
- **vrs_sarajevo_romanija** (RS, Sarajevo-Romanija Corps): fatigue 0 → 22
- **vrs_wolves_of_drina** (RS, Wolves of Drina): fatigue 0 → 12

## Army strengths (end state)

Formations by faction (militia / brigade / other):
  - HRHB: 68 total (68)
  - RBiH: 184 total (184)
  - RS: 145 total (145)

Militia pools by faction (available / committed / exhausted):
  - HRHB: 466 / 100234 / 0
  - RBiH: 176 / 313234 / 0
  - RS: 221 / 242143 / 0

Areas of responsibility (settlements per faction):
  - HRHB: 2007 settlements
  - RBiH: 4651 settlements
  - RS: 4672 settlements

## Bot benchmark evaluation

- Evaluated: 3
- Passed: 2
- Failed: 1
- Not reached (turn outside run): 3

Benchmark checks:
  - [HRHB] turn 26 (secure_herzegovina_core): actual 0.155101 vs expected 0.15 ± 0.08 => PASS
  - [RBiH] turn 26 (hold_core_centers): actual 0.365167 vs expected 0.2 ± 0.1 => FAIL
  - [RS] turn 26 (early_territorial_expansion): actual 0.479732 vs expected 0.45 ± 0.15 => PASS
  - [HRHB] turn 52 (hold_central_bosnia_nodes): not reached (expected 0.18 ± 0.1)
  - [RBiH] turn 52 (preserve_survival_corridors): not reached (expected 0.25 ± 0.12)
  - [RS] turn 52 (consolidate_gains): not reached (expected 0.5 ± 0.15)

## Phase II attack resolution (pipeline)

- Weeks in Phase II: 32
- Weeks with nonzero orders processed: 31
- Orders processed: 2240
- Settlement flips applied: 1035
- Casualties (attacker / defender): 11320 / 4859

## Notes on interpretation

This is a read-only summary of canonical state and derived reporting. No claim of causality; only deltas.
