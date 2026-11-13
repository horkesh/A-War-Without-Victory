import { enMessages, type MessageKey } from './messages.en';

/**
 * BCS grammatical case for corps-level command names (SC8, follow-up to the
 * sensitive-copy lane, 2026-11-13).
 *
 * A BCS template asks for a case with a suffix on the placeholder:
 * `'Povuci {name} iz {corps:gen}'`. When the active locale is BCS, the
 * interpolated value is looked up here by its BCS nominative, its English data
 * name or its corps id, and replaced by the requested form. A value that is not
 * a known corps or a registered fallback phrase is left as it was passed.
 *
 * The nominative of every corps equals its `corps.name.<id>` BCS message
 * (pinned by tests/ui/bcs_corps_cases.test.ts). Data and saves are untouched.
 */
export const BCS_CASES = ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'] as const;
export type BcsCase = (typeof BCS_CASES)[number];
export type BcsCaseForms = Readonly<Record<BcsCase, string>>;

export function isBcsCase(value: unknown): value is BcsCase {
    return typeof value === 'string' && (BCS_CASES as readonly string[]).includes(value);
}

/** "1. korpus": masculine noun with a numeral ordinal, which does not inflect in writing. */
function ordinalKorpus(ordinal: string): BcsCaseForms {
    return {
        nom: `${ordinal} korpus`,
        gen: `${ordinal} korpusa`,
        dat: `${ordinal} korpusu`,
        acc: `${ordinal} korpus`,
        ins: `${ordinal} korpusom`,
        loc: `${ordinal} korpusu`,
    };
}

/** "Drinski korpus", "1. krajiški korpus": definite adjective (stem + -i) before korpus. */
function adjectiveKorpus(stem: string): BcsCaseForms {
    return {
        nom: `${stem}i korpus`,
        gen: `${stem}og korpusa`,
        dat: `${stem}om korpusu`,
        acc: `${stem}i korpus`,
        ins: `${stem}im korpusom`,
        loc: `${stem}om korpusu`,
    };
}

/** "Glavni štab ARBiH", "Glavni stožer HVO": the trailing army abbreviation stays fixed. */
function mainStaff(noun: 'štab' | 'stožer', army: string): BcsCaseForms {
    return {
        nom: `Glavni ${noun} ${army}`,
        gen: `Glavnog ${noun}a ${army}`,
        dat: `Glavnom ${noun}u ${army}`,
        acc: `Glavni ${noun} ${army}`,
        ins: `Glavnim ${noun}om ${army}`,
        loc: `Glavnom ${noun}u ${army}`,
    };
}

/**
 * "OZ Srednja Bosna": an abbreviated operativna zona followed by its proper name.
 * Written usage keeps both unchanged in every case ("zapovjednik OZ Srednja Bosna").
 */
function invariant(name: string): BcsCaseForms {
    return { nom: name, gen: name, dat: name, acc: name, ins: name, loc: name };
}

/** Case forms for every corps-level command in `data/source/oob_corps.json`, by corps id. */
export const BCS_CORPS_CASE_FORMS: Readonly<Record<string, BcsCaseForms>> = {
    arbih_general_staff: mainStaff('štab', 'ARBiH'),
    arbih_1st_corps: ordinalKorpus('1.'),
    arbih_2nd_corps: ordinalKorpus('2.'),
    arbih_3rd_corps: ordinalKorpus('3.'),
    arbih_4th_corps: ordinalKorpus('4.'),
    arbih_5th_corps: ordinalKorpus('5.'),
    vrs_main_staff: mainStaff('štab', 'VRS'),
    // The JNA's 13th (Bileća) and 2nd (Titograd) Corps of Strugar's 4th Military
    // District in Herzegovina, April-May 1992 (BB1 printed p.154). Feminine i-stem.
    jna_herzegovina_command: {
        nom: '4. vojna oblast JNA (Hercegovina)',
        gen: '4. vojne oblasti JNA (Hercegovina)',
        dat: '4. vojnoj oblasti JNA (Hercegovina)',
        acc: '4. vojnu oblast JNA (Hercegovina)',
        ins: '4. vojnom oblašću JNA (Hercegovina)',
        loc: '4. vojnoj oblasti JNA (Hercegovina)',
    },
    vrs_1st_krajina: adjectiveKorpus('1. krajišk'),
    vrs_2nd_krajina: adjectiveKorpus('2. krajišk'),
    vrs_drina: adjectiveKorpus('Drinsk'),
    vrs_east_bosnian: adjectiveKorpus('Istočnobosansk'),
    vrs_herzegovina: adjectiveKorpus('Hercegovačk'),
    vrs_sarajevo_romanija: adjectiveKorpus('Sarajevsko-romanijsk'),
    hvo_main_staff: mainStaff('stožer', 'HVO'),
    hvo_southeast_herzegovina: invariant('OZ Jugoistočna Hercegovina'),
    hvo_central_bosnia: invariant('OZ Srednja Bosna'),
    hvo_northwest_bosnia: invariant('OZ Bosanska Posavina'),
    hvo_tomislavgrad: invariant('OZ Sjeverozapadna Hercegovina'),
};

/**
 * BCS fallback phrases that stand in for an unresolved corps inside a case slot,
 * keyed by the message that holds the nominative.
 */
export const BCS_FALLBACK_CASE_FORMS: Readonly<Partial<Record<MessageKey, BcsCaseForms>>> = {
    'chiefOfStaff.corpsCommandFallback': {
        nom: 'komanda jednog korpusa',
        gen: 'komande jednog korpusa',
        dat: 'komandi jednog korpusa',
        acc: 'komandu jednog korpusa',
        ins: 'komandom jednog korpusa',
        loc: 'komandi jednog korpusa',
    },
    'operationsPanel.thisCorps': {
        nom: 'ovaj korpus',
        gen: 'ovog korpusa',
        dat: 'ovom korpusu',
        acc: 'ovaj korpus',
        ins: 'ovim korpusom',
        loc: 'ovom korpusu',
    },
    'decisionConsequences.fallback.thisCorpsCommand': {
        nom: 'ova komanda korpusa',
        gen: 'ove komande korpusa',
        dat: 'ovoj komandi korpusa',
        acc: 'ovu komandu korpusa',
        ins: 'ovom komandom korpusa',
        loc: 'ovoj komandi korpusa',
    },
    'chronicle.generated.generals.fallbackCorps': {
        nom: 'korpus',
        gen: 'korpusa',
        dat: 'korpusu',
        acc: 'korpus',
        ins: 'korpusom',
        loc: 'korpusu',
    },
};

/** The `corps.name.<id>` message key for a known corps id. */
export function corpsNameKey(corpsId: string): MessageKey {
    return `corps.name.${corpsId}` as MessageKey;
}

/**
 * Corps whose display label was renamed while the data `name` (the value copied
 * into saves and the baked startup snapshot) was kept, so that saves, the startup
 * snapshot and the simulation stay byte-identical. The saved name still resolves
 * to the corps, and is shown as the `corps.name.<id>` label in both locales.
 *
 * "JNA Herzegovina Command" was not a documented formation (owner rename,
 * 2026-11-13): the entry stands for the JNA 4th Military District's corps in
 * Herzegovina in April-May 1992.
 */
export const RENAMED_CORPS_SAVED_NAMES: Readonly<Record<string, string>> = {
    jna_herzegovina_command: 'JNA Herzegovina Command',
};

/** Corps id for a saved data name that is no longer the display label, or null. */
export function renamedCorpsIdForSavedName(value: string): string | null {
    const trimmed = value.trim();
    for (const [corpsId, savedName] of Object.entries(RENAMED_CORPS_SAVED_NAMES)) {
        if (savedName === trimmed) return corpsId;
    }
    return null;
}

let corpsIdByAlias: Map<string, string> | null = null;
let fallbackFormsByNominative: Map<string, BcsCaseForms> | null = null;

function aliasIndex(): Map<string, string> {
    if (corpsIdByAlias) return corpsIdByAlias;
    corpsIdByAlias = new Map();
    for (const [corpsId, forms] of Object.entries(BCS_CORPS_CASE_FORMS)) {
        corpsIdByAlias.set(corpsId, corpsId);
        corpsIdByAlias.set(forms.nom, corpsId);
        const englishName = enMessages[corpsNameKey(corpsId) as keyof typeof enMessages];
        if (englishName) corpsIdByAlias.set(englishName, corpsId);
    }
    for (const [corpsId, savedName] of Object.entries(RENAMED_CORPS_SAVED_NAMES)) corpsIdByAlias.set(savedName, corpsId);
    return corpsIdByAlias;
}

/**
 * Corps id for a known corps-level command, from its id, its English label, a
 * saved data name (see RENAMED_CORPS_SAVED_NAMES) or its BCS nominative. Null
 * for anything else.
 */
export function knownCorpsId(name: string | null | undefined, id?: string | null): string | null {
    const safeId = (id ?? '').trim();
    if (safeId && BCS_CORPS_CASE_FORMS[safeId]) return safeId;
    const safeName = (name ?? '').trim();
    return safeName ? aliasIndex().get(safeName) ?? null : null;
}

function fallbackForms(nominative: string): BcsCaseForms | null {
    fallbackFormsByNominative ??= new Map(
        Object.values(BCS_FALLBACK_CASE_FORMS)
            .filter((forms): forms is BcsCaseForms => Boolean(forms))
            .map((forms) => [forms.nom, forms] as const),
    );
    return fallbackFormsByNominative.get(nominative) ?? null;
}

function capitalizeFirst(value: string): string {
    return value.charAt(0).toLocaleUpperCase('bs') + value.slice(1);
}

/**
 * The requested BCS case of a corps name or registered fallback phrase. A known
 * corps given by English name or id comes back in BCS. Anything else is
 * returned unchanged, because its case forms are not known.
 */
export function resolveBcsCase(value: string, grammaticalCase: BcsCase): string {
    const trimmed = value.trim();
    const corpsId = knownCorpsId(trimmed);
    if (corpsId) return BCS_CORPS_CASE_FORMS[corpsId][grammaticalCase];
    const exact = fallbackForms(trimmed);
    if (exact) return exact[grammaticalCase];
    const lowered = trimmed.charAt(0).toLocaleLowerCase('bs') + trimmed.slice(1);
    const sentenceStart = lowered !== trimmed ? fallbackForms(lowered) : null;
    if (sentenceStart) return capitalizeFirst(sentenceStart[grammaticalCase]);
    return value;
}
