/**
 * BCS wording for the officer prose that lives in scenario data
 * (`data/scenarios/officers/*.json`: bio_short, command_style, known_for,
 * political_alignment_note). The data stays English and canonical; the UI shows
 * the BCS line when the active locale is BCS and the text is one the data ships.
 *
 * Keyed by the exact English data string, so a repeated line is written once and
 * an edited data line falls back to English until its entry is updated.
 * `tests/ui/officer_prose_bcs.test.ts` fails when a data string has no entry.
 *
 * Corps and operational-zone names follow `corps.name.*` in messages.bcs.ts.
 */
import { getActiveLocale } from './index';

export const OFFICER_PROSE_BCS: Readonly<Record<string, string>> = {
    // bio_short
    'JNA officer leading the VRS main staff at the opening of the war.':
        'Oficir JNA koji je na početku rata predvodio Glavni štab VRS.',
    'JNA-trained commander assigned to 1st Krajina Corps in the opening OOB.':
        'Komandant školovan u JNA, raspoređen u 1. krajiški korpus na početku rata.',
    'JNA-background officer assigned to 2nd Krajina Corps at scenario start.':
        'Oficir porijeklom iz JNA, raspoređen u 2. krajiški korpus na početku rata.',
    'JNA-trained commander assigned to East Bosnian Corps in the opening OOB.':
        'Komandant školovan u JNA, raspoređen u Istočnobosanski korpus na početku rata.',
    'JNA-background officer assigned to Sarajevo-Romanija Corps at scenario start.':
        'Oficir porijeklom iz JNA, raspoređen u Sarajevsko-romanijski korpus na početku rata.',
    'JNA-background officer assigned to Herzegovina Corps in the opening OOB.':
        'Oficir porijeklom iz JNA, raspoređen u Hercegovački korpus na početku rata.',
    'JNA-background officer leading the RBiH army command at scenario start.':
        'Oficir porijeklom iz JNA na čelu komande Armije RBiH na početku rata.',
    'JNA-trained officer assigned to 1st Corps around Sarajevo at scenario start.':
        'Oficir školovan u JNA, raspoređen u 1. korpus oko Sarajeva na početku rata.',
    'JNA-background officer assigned to 2nd Corps in the opening OOB.':
        'Oficir porijeklom iz JNA, raspoređen u 2. korpus na početku rata.',
    'JNA-background officer assigned to 5th Corps in the Bihac pocket.':
        'Oficir porijeklom iz JNA, raspoređen u 5. korpus u bihaćkom džepu.',
    'JNA-background officer leading HVO army command at scenario start.':
        'Oficir porijeklom iz JNA na čelu komande HVO-a na početku rata.',
    'JNA-background officer assigned to Central Bosnia HVO command at scenario start.':
        'Oficir porijeklom iz JNA, raspoređen u OZ Srednja Bosna na početku rata.',
    'HV-background officer assigned to Tomislavgrad command in the opening OOB.':
        'Oficir porijeklom iz HV-a, raspoređen u OZ Sjeverozapadna Hercegovina na početku rata.',
    'Militia-origin commander assigned to Southeast Herzegovina in the opening OOB.':
        'Komandant iz milicije, raspoređen u OZ Jugoistočna Hercegovina na početku rata.',
    'Military-origin commander assigned to Northwest Bosnia in the opening OOB.':
        'Komandant vojnog porijekla, raspoređen u OZ Bosanska Posavina na početku rata.',

    // command_style
    'Forceful, offensive-minded central command': 'Snažno, ofanzivno usmjereno središnje komandovanje',
    'Skilled all-round corps command': 'Vješto sveobuhvatno komandovanje korpusom',
    'Cautious, steady corps defense': 'Oprezna, postojana odbrana korpusa',
    'Methodical, defense-capable command': 'Metodično komandovanje, sposobno za odbranu',
    'Balanced line command': 'Uravnoteženo linijsko komandovanje',
    'Defensive, low-risk corps command': 'Odbrambeno komandovanje korpusom uz nizak rizik',
    'Assertive, improvised central command': 'Odlučno, improvizirano središnje komandovanje',
    'Bold, resilient enclave command': 'Smjelo, otporno komandovanje enklavom',
    'Cautious, uneven corps command': 'Oprezno, neujednačeno komandovanje korpusom',
    'Defensive, enclave-oriented command': 'Odbrambeno komandovanje usmjereno na enklavu',
    'Methodical, defense-capable central command': 'Metodično središnje komandovanje, sposobno za odbranu',
    'Bold, defense-capable corps command': 'Smjelo komandovanje korpusom, sposobno za odbranu',
    'Balanced regional command': 'Uravnoteženo regionalno komandovanje',
    'Balanced local command': 'Uravnoteženo lokalno komandovanje',
    'Cautious, defensive regional command': 'Oprezno, odbrambeno regionalno komandovanje',

    // known_for
    'Opening VRS army command': 'Početna komanda VRS-a',
    '1st Krajina Corps opening command': 'Početna komanda 1. krajiškog korpusa',
    '2nd Krajina Corps opening command': 'Početna komanda 2. krajiškog korpusa',
    'East Bosnian Corps opening command': 'Početna komanda Istočnobosanskog korpusa',
    'Sarajevo-Romanija opening command': 'Početna komanda Sarajevsko-romanijskog korpusa',
    'Herzegovina Corps opening command': 'Početna komanda Hercegovačkog korpusa',
    'Opening RBiH army command': 'Početna komanda Armije RBiH',
    '1st Corps opening command': 'Početna komanda 1. korpusa',
    '2nd Corps opening command': 'Početna komanda 2. korpusa',
    '5th Corps opening command': 'Početna komanda 5. korpusa',
    'Opening HVO army command': 'Početna komanda HVO-a',
    'Central Bosnia opening command': 'Početna komanda OZ Srednja Bosna',
    'Tomislavgrad opening command': 'Početna komanda OZ Sjeverozapadna Hercegovina',
    'Southeast Herzegovina opening command': 'Početna komanda OZ Jugoistočna Hercegovina',
    'Northwest Bosnia opening command': 'Početna komanda OZ Bosanska Posavina',

    // political_alignment_note
    'Modeled as an RS army-command appointment.': 'Imenovan u komandu VRS-a.',
    'Modeled as an RBiH army-command appointment.': 'Imenovan u komandu Armije RBiH.',
    'Modeled as an HRHB army-command appointment.': 'Imenovan u komandu HVO-a.',
    'Regular RS corps command appointment.': 'Redovno imenovanje na komandu korpusa VRS-a.',
    'Regular RBiH corps command appointment.': 'Redovno imenovanje na komandu korpusa Armije RBiH.',
    'Regular HRHB corps command appointment.': 'Redovno imenovanje u komandu HVO-a.',
};

/**
 * English display wording for data lines written in scenario-setup voice ("at scenario start",
 * "in the opening OOB", "Modeled as ...") — council fix 4, C14. The officer data is copied into
 * the save, so the line is corrected here at display time and the data string stays the key.
 * Lines not listed display as written.
 */
export const OFFICER_PROSE_EN: Readonly<Record<string, string>> = {
    // bio_short
    'JNA-trained commander assigned to 1st Krajina Corps in the opening OOB.':
        'JNA-trained commander of the 1st Krajina Corps when the war began.',
    'JNA-background officer assigned to 2nd Krajina Corps at scenario start.':
        'Former JNA officer with the 2nd Krajina Corps when the war began.',
    'JNA-trained commander assigned to East Bosnian Corps in the opening OOB.':
        'JNA-trained commander of the East Bosnian Corps when the war began.',
    'JNA-background officer assigned to Sarajevo-Romanija Corps at scenario start.':
        'Former JNA officer with the Sarajevo-Romanija Corps when the war began.',
    'JNA-background officer assigned to Herzegovina Corps in the opening OOB.':
        'Former JNA officer with the Herzegovina Corps when the war began.',
    'JNA-background officer leading the RBiH army command at scenario start.':
        'Former JNA officer at the head of the ARBiH command when the war began.',
    'JNA-trained officer assigned to 1st Corps around Sarajevo at scenario start.':
        'JNA-trained officer with the 1st Corps around Sarajevo when the war began.',
    'JNA-background officer assigned to 2nd Corps in the opening OOB.':
        'Former JNA officer with the 2nd Corps when the war began.',
    'JNA-background officer assigned to 5th Corps in the Bihac pocket.':
        'Former JNA officer with the 5th Corps in the Bihać pocket.',
    'JNA-background officer leading HVO army command at scenario start.':
        'Former JNA officer at the head of the HVO command when the war began.',
    'JNA-background officer assigned to Central Bosnia HVO command at scenario start.':
        'Former JNA officer in the HVO Central Bosnia Operative Zone when the war began.',
    'HV-background officer assigned to Tomislavgrad command in the opening OOB.':
        'Former HV officer in the HVO Northwest Herzegovina Operative Zone when the war began.',
    'Militia-origin commander assigned to Southeast Herzegovina in the opening OOB.':
        'Commander from the militia, in the HVO Southeast Herzegovina Operative Zone when the war began.',
    'Military-origin commander assigned to Northwest Bosnia in the opening OOB.':
        'Career soldier in the HVO Bosnian Posavina Operative Zone when the war began.',

    // political_alignment_note
    'Modeled as an RS army-command appointment.': 'Appointed to the VRS command.',
    'Modeled as an RBiH army-command appointment.': 'Appointed to the ARBiH command.',
    'Modeled as an HRHB army-command appointment.': 'Appointed to the HVO command.',
    'Regular RS corps command appointment.': 'Regular VRS corps command appointment.',
    'Regular RBiH corps command appointment.': 'Regular ARBiH corps command appointment.',
    'Regular HRHB corps command appointment.': 'Regular HVO command appointment.',
};

/** The officer prose line in the active locale; the data line when no display line exists. */
export function localizeOfficerProse(text: string | undefined): string | undefined {
    if (text === undefined) return undefined;
    return getActiveLocale() === 'bcs' ? OFFICER_PROSE_BCS[text] ?? text : OFFICER_PROSE_EN[text] ?? text;
}
