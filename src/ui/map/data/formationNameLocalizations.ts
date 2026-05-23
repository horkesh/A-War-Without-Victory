import type { Locale } from '../i18n';

interface FormationNameInput {
  id: string;
  kind?: string | null;
  name: string;
}

const EXACT_BCS_NAMES: Record<string, string> = {
  arbih_guards_brigade: 'Gardijska brigada',
  arbih_120th_liberation_black_swans: '120. oslobodilačka brigada "Crni labudovi"',
  arbih_124th_light_king_tvrtko: '124. lahka brigada "Kralj Tvrtko"',
  arbih_255th_slavna_mountain_hajrudin_mesi: '255. slavna brdska brigada "Hajrudin Mesić"',
  arbih_7th_vitezka_muslim_liberation: '7. viteška muslimanska oslobodilačka brigada',
  arbih_210th_vitezka_liberation_nesib_maliki: '210. viteška oslobodilačka brigada "Nesib Malikić"',
  arbih_241st_spreca_muslim_light_gazije: '241. sprečanska muslimanska lahka brigada "Gazije"',
  arbih_243rd_muslimpodrinje_mountain: '243. muslimansko-podrinjska brdska brigada',
  arbih_hvo_kralj_tvrtko: 'HVO brigada "Kralj Tvrtko"',

  rs_1st_guards_motorized: '1. gardijska motorizovana brigada',
  rs_1st_armored: '1. oklopna brigada',
  rs_2nd_armored: '2. oklopna brigada',
  rs_31st_light_infantry: '31. laka pješadijska brigada',
  rs_1st_bijeljina_light_infantry_panthers: 'Garda Panteri (1. bijeljinska laka pješadijska brigada)',
  rs_1st_sarajevo_mechanized: '1. sarajevska mehanizovana brigada',
  rs_2nd_sarajevo_light_infantry: '2. sarajevska laka pješadijska brigada',
  rs_3rd_sarajevo_infantry: '3. sarajevska pješadijska brigada',
  rs_4th_sarajevo_light_infantry: '4. sarajevska laka pješadijska brigada',
  rs_1st_romanija_infantry: '1. romanijska pješadijska brigada',
  rs_ilidza_brigade: 'Ilidžanska brigada',
  rs_ilijas_brigade: 'Ilijaška pješadijska brigada',
  rs_igman_brigade: 'Igmanska laka pješadijska brigada',
  rs_trnovo_brigade: 'Trnovska brigada',
  rs_2nd_romanija_brigade: '2. romanijska motorizovana brigada',
  rs_trebinje_brigade: '1. hercegovačka motorizovana brigada (Trebinje)',
  rs_nevesinje_brigade: '8. motorizovana brigada (Nevesinje)',
  rs_gacko_brigade: '18. hercegovačka laka pješadijska brigada (Gacko)',
  rs_bilea_brigade: '15. hercegovačka motorizovana brigada (Bileća)',
  rs_foa_brigade: '11. hercegovačka pješadijska brigada (Foča)',
  rs_ajnie_brigade: '14. hercegovačka laka pješadijska brigada (Čajniče)',
  rs_kalinovik_brigade: '3. hercegovačka laka pješadijska brigada (Kalinovik)',
  rs_visegrad_brigade: '2. podrinjska laka pješadijska brigada (Višegrad)',
  rs_2nd_herzegovina_light_infantry: '2. hercegovačka laka pješadijska brigada',
  rs_1st_podrinje: '1. podrinjska laka pješadijska brigada',
  rs_5th_podrinje: '5. podrinjska laka pješadijska brigada',
  rs_skelani_battalion: 'Samostalni pješadijski bataljon Skelani',
  rs_65th_protection_motorized_regiment: '65. zaštitni motorizovani puk',
  rs_1st_birac: '1. biračka brigada',
  vrs_1st_laktasi: '1. laktaška laka pješadijska brigada',

  hrhb_mostar_brigade: 'Mostarska brigada',
  hrhb_iroki_brijeg_brigade: 'Širokobriješka brigada',
  hrhb_ljubuki_brigade: 'Ljubuška brigada',
  hrhb_grude_brigade: 'Grudska brigada',
  hrhb_itluk_brigade: 'Čitlučka brigada',
  hrhb_apljina_brigade: 'Čapljinska brigada',
  hrhb_1st_herzegovina_brigade_knez_domagoj: '1. hercegovačka brigada "Knez Domagoj"',
  hrhb_stolac_units: 'Stolačke jedinice',
  hrhb_kralj_petar_kreimir_iv_brigade: 'Brigada "Kralj Petar Krešimir IV"',
  hrhb_kralj_tomislav_brigade: 'Brigada "Kralj Tomislav"',
  hrhb_ban_jelai_brigade: 'Brigada "Ban Jelačić"',
  hrhb_herceg_stjepan_brigade: 'Brigada "Herceg Stjepan"',
  hrhb_mario_hrka_ikota_brigade: 'Brigada "Mario Hrkač Čikota"',
  hrhb_vitezovi_brigade_vitez: 'Brigada "Vitezovi" (Vitez)',
  hrhb_jure_franceti_brigade: 'Brigada "Jure Francetić"',
  hrhb_stjepan_tomaevi_brigade: 'Brigada "Stjepan Tomašević"',
  hrhb_kiseljak_brigade: 'Kiseljačka brigada',
  hrhb_kreevo_brigade: 'Kreševska brigada',
  hrhb_travnik_brigade: 'Travnička brigada',
  hrhb_101st_oraje_brigade: '101. oraška brigada',
  hrhb_103rd_derventa_brigade: '103. derventska brigada',
  hrhb_104th_bosanski_brod_brigade: '104. bosanskobrodska brigada',
  hrhb_105th_modrica_brigade: '105. modrička brigada',
  hvo_1st_guard_abb: '1. gardijska brigada "Ante Bruno Bušić"',
  hvo_2nd_guard_mechanized: '2. gardijska mehanizovana brigada',
  hvo_3rd_guard_jastrebovi: '3. gardijska brigada "Jastrebovi"',
  hvo_4th_guard_sinovi_posavine: '4. gardijska brigada "Sinovi Posavine"',
  hrhb_106th_bosanska_posavina_brigade: '106. brigada "Bosanska Posavina"',
  hrhb_107th_gradaac_brigade: '107. brigada "Gradačac"',
  hrhb_108th_brko_brigade: '108. brigada "Brčko"',
  hvo_rama_brigade: 'Ramska brigada',
  hvo_ante_starcevic_brigade: 'Brigada "Ante Starčević"',
  hvo_nikola_subic_zrinski_brigade: 'Brigada "Nikola Šubić Zrinski"',
  hvo_hrvoje_vukcic_brigade: 'Brigada "Hrvoje Vukčić Hrvatinić"',
  hvo_posusje_brigade: 'Posuška brigada',
  hvo_101st_bihac: '101. bihaćka brigada HVO-a',
  hrhb_110th_usora_brigade: '110. usorska brigada',
  hrhb_115th_zrinski_brigade: '115. brigada "Zrinski"',
};

const ADJECTIVE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bMuslim-Podrinje\b/g, 'muslimansko-podrinjska'],
  [/\bEast Bosnian\b/g, 'istočnobosanska'],
  [/\bEastern Herzegovina\b/g, 'istočnohercegovačka'],
  [/\bBosnian\b/g, 'bosanska'],
  [/\bSpreca\b/g, 'sprečanska'],
  [/\bKrajina\b/g, 'krajiška'],
  [/\bKozara\b/g, 'kozarska'],
  [/\bSanske\b/g, 'sanska'],
  [/\bDubica\b/g, 'dubička'],
  [/\bKotorsko\b/g, 'kotorvaroška'],
  [/\bMrkonjić\b/g, 'mrkonjićka'],
  [/\bDerventa\b/g, 'derventska'],
  [/\bPrijedor\b/g, 'prijedorska'],
  [/\bDoboj\b/g, 'dobojska'],
  [/\bCelinac\b/g, 'čelinačka'],
  [/\bSrbac\b/g, 'srbačka'],
  [/\bGradiška\b/g, 'gradiška'],
  [/\bNovigrad\b/g, 'novogradska'],
  [/\bBanja Luka\b/g, 'banjalučka'],
  [/Kotor Varoš/g, 'kotorvaroška'],
  [/\bPrnjavor\b/g, 'prnjavorska'],
  [/\bSipovo\b/g, 'šipovačka'],
  [/Teslić/g, 'teslićka'],
  [/\bOzren\b/g, 'ozrenska'],
  [/\bTrebava\b/g, 'trebavska'],
  [/\bKrnjin\b/g, 'krnjinska'],
  [/\bVučjak\b/g, 'vučjačka'],
  [/\bDrvar\b/g, 'drvarska'],
  [/\bPetrovac\b/g, 'petrovačka'],
  [/Glamoč/g, 'glamočka'],
  [/\bGrahovo\b/g, 'grahovska'],
  [/\bKrupa\b/g, 'krupska'],
  [/Bihać/g, 'bihaćka'],
  [/Ključ/g, 'ključka'],
  [/\bPosavina\b/g, 'posavska'],
  [/\bSemberija\b/g, 'semberska'],
  [/\bMajevica\b/g, 'majevička'],
  [/\bZvornik\b/g, 'zvornička'],
  [/\bBratunac\b/g, 'bratunačka'],
  [/\bVlasenica\b/g, 'vlasenička'],
  [/\bMilići\b/g, 'milićka'],
  [/\bBirač\b/g, 'biračka'],
  [/\bPodrinje\b/g, 'podrinjska'],
  [/\bCazin\b/g, 'cazinska'],
  [/\bOlovo\b/g, 'olovska'],
  [/\bTuzla\b/g, 'tuzlanska'],
  [/\bCerska\b/g, 'cerska'],
  [/\bKamenica\b/g, 'kamenička'],
  [/\bSarajevo\b/g, 'sarajevska'],
];

const UNIT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSlavna\b/g, 'slavna'],
  [/\bVitezka\b/g, 'viteška'],
  [/\bMuslim\b/g, 'muslimanska'],
  [/\bGuards\b/g, 'gardijska'],
  [/\bGuard\b/g, 'gardijska'],
  [/\bArmored\b/g, 'oklopna'],
  [/\bMechanized\b/g, 'mehanizovana'],
  [/\bMotorized\b/g, 'motorizovana'],
  [/\bMountain\b/g, 'brdska'],
  [/\bLight Infantry\b/g, 'laka pješadijska'],
  [/\bLight\b/g, 'lahka'],
  [/\bInfantry\b/g, 'pješadijska'],
  [/\bLiberation\b/g, 'oslobodilačka'],
  [/\bBrigade\b/g, 'brigada'],
  [/\bRegiment\b/g, 'puk'],
  [/\bBattalion\b/g, 'bataljon'],
  [/\bUnits\b/g, 'jedinice'],
];

function ordinalize(value: string): string {
  return value.replace(/\b(\d+)(?:st|nd|rd|th)\b/g, '$1.');
}

function normalizeQuotedNames(value: string): string {
  return value
    .replace(/"Black Swans"/g, '"Crni labudovi"')
    .replace(/"King Tvrtko"/g, '"Kralj Tvrtko"')
    .replace(/'([^']+)'/g, '"$1"');
}

function applyReplacements(value: string, replacements: Array<[RegExp, string]>): string {
  return replacements.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}

function normalizeSpacing(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .trim();
}

function lowerFirstUnitWord(value: string): string {
  return value.replace(/^([A-ZŠĐČĆŽ])/, (letter) => letter.toLocaleLowerCase('bs-BA'));
}

function localizeGenericBrigadeName(name: string): string {
  const normalized = normalizeQuotedNames(ordinalize(name));
  const withAdjectives = applyReplacements(normalized, ADJECTIVE_REPLACEMENTS);
  const translated = applyReplacements(withAdjectives, UNIT_REPLACEMENTS);
  const withBrigade = /\b(brigada|puk|bataljon|jedinice)\b/i.test(translated)
    ? translated
    : `${translated} brigada`;
  return normalizeSpacing(lowerFirstUnitWord(withBrigade));
}

export function getLocalizedFormationName(
  formation: FormationNameInput,
  locale: Locale,
): string {
  if (locale !== 'bcs') return formation.name;
  if (formation.kind && !['brigade', 'operational_group'].includes(formation.kind)) return formation.name;
  return EXACT_BCS_NAMES[formation.id] ?? localizeGenericBrigadeName(formation.name);
}
