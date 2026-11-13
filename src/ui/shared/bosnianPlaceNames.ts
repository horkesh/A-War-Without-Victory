import { OSID_PLACE_NAMES } from './osidPlaceNames.generated.js';

/**
 * Detects ASCII-stripped Bosnian place names in player-facing text.
 *
 * This is a correctness issue, not a cosmetic one: the game is set in Bosnia, and rendering
 * "Bihac" where "Bihać" is meant is the same class of error as misspelling a person's name.
 * The 2026-09-03 showcase audit recorded it as a live defect class (`Ilijaš`/`Ilijas` inside a
 * single card); `inbox.openingBrief.RBiH.bullet.0` carried "Bihac" in both locales while the
 * same file spelled "Bihać" correctly elsewhere.
 *
 * Drafted by the local executor model and reviewed/cleaned by the planner — see
 * tools/local_executor/README.md. Its boundary semantics were correct as proposed; the
 * cleanup was efficiency and dead code.
 */

/**
 * SCOPE WARNING — player-facing PROSE only, never identifiers.
 *
 * OSID slugs (`op:bihac:bihac_2`), formation ids, event ids, save keys and scenario keys are
 * ASCII BY DESIGN and must never be "corrected". Adding diacritics to an identifier changes a
 * key and breaks lookups, saves and calibration. A sweep across `tests/` on 2026-09-10 found
 * ~20 files containing "Bihac" and ~24 containing "Gorazde" — essentially all of them slugs.
 *
 * Apply this checker to localized message catalogues and rendered prose. Nothing else.
 */

export interface BosnianPlaceName {
  /** The ASCII-stripped form that should never appear in player-facing text. */
  ascii: string;
  /** The correct form, with diacritics. */
  correct: string;
}

export const BOSNIAN_PLACE_NAMES: ReadonlyArray<BosnianPlaceName> = [
  { ascii: 'Bihac', correct: 'Bihać' },
  { ascii: 'Gorazde', correct: 'Goražde' },
  { ascii: 'Zepa', correct: 'Žepa' },
  { ascii: 'Foca', correct: 'Foča' },
  { ascii: 'Cajnice', correct: 'Čajniče' },
  { ascii: 'Sipovo', correct: 'Šipovo' },
  { ascii: 'Vogosca', correct: 'Vogošća' },
  { ascii: 'Ilijas', correct: 'Ilijaš' },
  { ascii: 'Gradacac', correct: 'Gradačac' },
  { ascii: 'Brcko', correct: 'Brčko' },
  { ascii: 'Tesanj', correct: 'Tešanj' },
  { ascii: 'Visegrad', correct: 'Višegrad' },
  { ascii: 'Buzim', correct: 'Bužim' },
  { ascii: 'Kljuc', correct: 'Ključ' },
  { ascii: 'Sekovici', correct: 'Šekovići' },
  { ascii: 'Zivinice', correct: 'Živinice' },
  { ascii: 'Teocak', correct: 'Teočak' },
  { ascii: 'Celic', correct: 'Čelić' },
  { ascii: 'Orasje', correct: 'Orašje' },
  { ascii: 'Odzak', correct: 'Odžak' },
  { ascii: 'Samac', correct: 'Šamac' },
  { ascii: 'Mrkonjic', correct: 'Mrkonjić' },
  { ascii: 'Lasva', correct: 'Lašva' },
  { ascii: 'Ahmici', correct: 'Ahmići' },
];

/**
 * Every place name appearing in `text` in its ASCII-stripped form, as a whole word.
 *
 * Whole-word matching is why this tokenises rather than using `includes`: "Foca" must not
 * match inside "Focal", and "Samac" must not match inside "Samacki". Matching is
 * case-sensitive, so only the capitalised place-name form counts and ordinary lowercase
 * words are never flagged.
 *
 * `\w` deliberately excludes diacritics, so a correctly-spelled "Bihać" tokenises as "Biha"
 * and can never be reported as a violation of itself.
 *
 * Results follow BOSNIAN_PLACE_NAMES order, each pair at most once.
 */
export function findStrippedPlaceNames(text: string): BosnianPlaceName[] {
  const tokens = new Set(text.match(/\b\w+\b/g) ?? []);
  if (tokens.size === 0) return [];
  return BOSNIAN_PLACE_NAMES.filter((place) => tokens.has(place.ascii));
}

// ---------------------------------------------------------------------------------------
// Display-name resolution and restoration (R8 player-facing name sweep, 2026-11-11).
// Same scope rule as above: these produce PLAYER-FACING text. They never rewrite an id.
// ---------------------------------------------------------------------------------------


/**
 * mun1990 slug -> display name. Census spellings (data/derived/mun1990_names.json); the
 * sole deliberate difference is `titov_drvar`, shown by its wartime short name "Drvar".
 */
export const MUNICIPALITY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    banja_luka: 'Banja Luka', banovici: 'Banovići', bihac: 'Bihać', bijeljina: 'Bijeljina',
    bileca: 'Bileća', bosanska_dubica: 'Bosanska Dubica', bosanska_gradiska: 'Bosanska Gradiška',
    bosanska_kostajnica: 'Bosanska Kostajnica', bosanska_krupa: 'Bosanska Krupa',
    bosanski_brod: 'Bosanski Brod', bosanski_novi: 'Bosanski Novi',
    bosanski_petrovac: 'Bosanski Petrovac', bosanski_samac: 'Bosanski Šamac',
    bosansko_grahovo: 'Bosansko Grahovo', bratunac: 'Bratunac', brcko: 'Brčko',
    breza: 'Breza', bugojno: 'Bugojno', busovaca: 'Busovača', cajnice: 'Čajniče',
    capljina: 'Čapljina', cazin: 'Cazin', celinac: 'Čelinac',
    centar_sarajevo: 'Centar Sarajevo', citluk: 'Čitluk', derventa: 'Derventa',
    doboj: 'Doboj', donji_vakuf: 'Donji Vakuf', duvno: 'Duvno', foca: 'Foča',
    fojnica: 'Fojnica', gacko: 'Gacko', glamoc: 'Glamoč', gorazde: 'Goražde',
    gornji_vakuf: 'Gornji Vakuf', gracanica: 'Gračanica', gradacac: 'Gradačac',
    grude: 'Grude', hadzici: 'Hadžići', hanpijesak: 'Han Pijesak', han_pijesak: 'Han Pijesak',
    ilidza: 'Ilidža', ilijas: 'Ilijaš', jablanica: 'Jablanica', jajce: 'Jajce',
    kakanj: 'Kakanj', kalesija: 'Kalesija', kalinovik: 'Kalinovik', kiseljak: 'Kiseljak',
    kladanj: 'Kladanj', kljuc: 'Ključ', konjic: 'Konjic', kotor_varos: 'Kotor Varoš',
    kresevo: 'Kreševo', kupres: 'Kupres', laktasi: 'Laktaši', listica: 'Lištica',
    livno: 'Livno', ljubinje: 'Ljubinje', ljubuski: 'Ljubuški', lopare: 'Lopare',
    lukavac: 'Lukavac', maglaj: 'Maglaj', modrica: 'Modriča', mostar: 'Mostar',
    mrkonjic_grad: 'Mrkonjić Grad', neum: 'Neum', nevesinje: 'Nevesinje',
    novi_grad_sarajevo: 'Novi Grad Sarajevo', novi_travnik: 'Novi Travnik',
    novo_sarajevo: 'Novo Sarajevo', odzak: 'Odžak', olovo: 'Olovo', orasje: 'Orašje',
    pale: 'Pale', posusje: 'Posušje', prijedor: 'Prijedor', prnjavor: 'Prnjavor',
    prozor: 'Prozor', rogatica: 'Rogatica', rudo: 'Rudo', sanski_most: 'Sanski Most',
    sekovici: 'Šekovići', sipovo: 'Šipovo', skender_vakuf: 'Skender Vakuf',
    sokolac: 'Sokolac', srbac: 'Srbac', srebrenica: 'Srebrenica', srebrenik: 'Srebrenik',
    stari_grad_sarajevo: 'Stari Grad Sarajevo', stolac: 'Stolac', tesanj: 'Tešanj',
    teslic: 'Teslić', titov_drvar: 'Drvar', travnik: 'Travnik', trebinje: 'Trebinje',
    trnovo: 'Trnovo', tuzla: 'Tuzla', ugljevik: 'Ugljevik', vares: 'Vareš',
    velika_kladusa: 'Velika Kladuša', visegrad: 'Višegrad', visoko: 'Visoko',
    vitez: 'Vitez', vlasenica: 'Vlasenica', vogosca: 'Vogošća',
    zavidovici: 'Zavidovići', zenica: 'Zenica', zepce: 'Žepče',
    zivinice: 'Živinice', zvornik: 'Zvornik',
};

/** Display name for a mun1990 slug (`bosanska_krupa`, `bosanska-krupa`), or null when unknown. */
export function municipalityDisplayName(slug: string | null | undefined): string | null {
    const key = (slug ?? '').trim().toLowerCase().replace(/-/g, '_');
    return key ? MUNICIPALITY_DISPLAY_NAMES[key] ?? null : null;
}

/** [settlement, municipality] census names for an OSID, or null when the OSID is unknown. */
export function osidPlaceNames(osid: string | null | undefined): readonly [string, string] | null {
    if (!osid) return null;
    return OSID_PLACE_NAMES[osid] ?? null;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripDiacritics = (value: string): string => value
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * ASCII form -> correct form for every known place name whose ASCII form differs, built
 * from the municipality table, every OSID settlement name and the curated list above.
 * An ASCII form that maps to two different spellings is ambiguous and is left alone.
 * Longest forms first so "Bosanski Samac" wins over "Samac".
 */
const RESTORATIONS: ReadonlyArray<readonly [RegExp, string]> = (() => {
    const byAscii = new Map<string, Set<string>>();
    const add = (correct: string) => {
        const ascii = stripDiacritics(correct);
        if (ascii === correct) return;
        if (!byAscii.has(ascii)) byAscii.set(ascii, new Set());
        byAscii.get(ascii)!.add(correct);
    };
    for (const name of Object.values(MUNICIPALITY_DISPLAY_NAMES)) add(name);
    for (const [settlement, municipality] of Object.values(OSID_PLACE_NAMES)) {
        add(settlement);
        add(municipality);
    }
    for (const place of BOSNIAN_PLACE_NAMES) add(place.correct);
    return [...byAscii.entries()]
        .filter(([, spellings]) => spellings.size === 1)
        .map(([ascii, spellings]) => [ascii, [...spellings][0]!] as const)
        .sort((a, b) => b[0].length - a[0].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([ascii, correct]) => [
            new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(ascii)}(?![\\p{L}\\p{N}_])`, 'gu'),
            correct,
        ] as const);
})();

/**
 * Restores diacritics in ASCII-stripped place names inside player-facing text
 * ("Operation Foca" -> "Operation Foča", "TG Visegrad" -> "TG Višegrad"). Case-sensitive
 * whole-word matching, so lowercase words and identifiers like `op:foca:foca` are untouched.
 */
export function restoreBosnianPlaceNames(text: string): string {
    if (!text || !/[A-Z]/.test(text)) return text;
    let out = text;
    for (const [pattern, correct] of RESTORATIONS) {
        out = out.replace(pattern, correct);
    }
    return out;
}
