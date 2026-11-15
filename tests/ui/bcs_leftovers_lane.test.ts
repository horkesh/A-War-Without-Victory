/**
 * BCS and UI leftovers lane: untranslated officer-card text, missing diacritics,
 * English words inside BCS strings, and the §4 wording of two Verdict strings.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

import { setLocale, t } from '../../src/ui/map/i18n';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { OFFICER_PROSE_BCS, localizeOfficerProse } from '../../src/ui/map/i18n/officerProse';
import {
    formatCombatRecord,
    formatRank,
    formatTenure,
    getAggressionLabel,
    getArchetype,
    getCompetenceLabel,
    getDefenseLabel,
    getOriginDisplay,
    getPersonalitySummary,
    getReliabilityLabel,
} from '../../src/ui/map/utils/officerCharacter';
import type { NamedOfficerView } from '../../src/ui/map/data/types';
import type { EventDefinition } from '../../src/sim/events/event_types';
import { localizedEventTitle } from '../../src/ui/map/data/inboxItems';

const DIACRITICS = /[čćšžđČĆŠŽĐ]/;

afterEach(() => {
    setLocale('en');
});

function officerFixture(competence: number, aggressiveness: number, defensive: number): NamedOfficerView {
    return { competence, aggressiveness, defensive_skill: defensive } as NamedOfficerView;
}

describe('officer card words (BC2)', () => {
    it('EN output is unchanged', () => {
        setLocale('en');
        expect(getArchetype(officerFixture(4, 5, 3))).toBe('Assault Commander');
        expect(getCompetenceLabel(4)).toBe('Skilled');
        expect(getDefenseLabel(3)).toBe('Steady');
        expect(getAggressionLabel(5)).toBe('Relentless');
        expect(getReliabilityLabel(4)).toBe('Loyal');
        expect(getOriginDisplay('jna').label).toBe('JNA');
        expect(getOriginDisplay('militia').label).toBe('Militia');
        expect(formatRank('deputy')).toBe('Dep.');
        expect(formatCombatRecord(10, 7)).toBe('7W/3L (70%)');
        expect(formatCombatRecord(0, 0)).toBe('No combat record');
        expect(formatTenure(0)).toBe('Newly assigned');
        expect(formatTenure(12)).toBe('12w in command');
        expect(getPersonalitySummary(5, 5)).toBe('Fast prep, accepts risk');
    });

    it('BCS output carries no English word the card used to show', () => {
        setLocale('bcs');
        const shown = [
            getArchetype(officerFixture(4, 5, 3)),
            getCompetenceLabel(4),
            getDefenseLabel(3),
            getAggressionLabel(5),
            getReliabilityLabel(4),
            getOriginDisplay('militia').label,
            formatRank('deputy'),
            formatCombatRecord(10, 7),
            formatCombatRecord(0, 0),
            formatTenure(0),
            formatTenure(12),
            getPersonalitySummary(5, 5),
        ];
        expect(shown).toEqual([
            'Komandant juriša', 'Vješt', 'Postojan', 'Nepopustljiv', 'Lojalan', 'Milicija', 'Zam.',
            '7P/3I (70%)', 'Nema borbenog dosijea', 'Tek postavljen', '12 sed. na dužnosti',
            'Brza priprema, prihvata rizik',
        ]);
    });

    it('every officerChar.* key has a BCS value that differs from EN unless it is an abbreviation', () => {
        const same = Object.keys(enMessages)
            .filter((k) => k.startsWith('officerChar.'))
            .filter((k) => !(k in bcsMessages));
        expect(same).toEqual([]);
        const identical = Object.keys(enMessages)
            .filter((k) => k.startsWith('officerChar.'))
            .filter((k) => (bcsMessages as Record<string, string>)[k] === (enMessages as Record<string, string>)[k]);
        expect(identical.sort()).toEqual([
            'officerChar.origin.hv', 'officerChar.origin.jna', 'officerChar.origin.to', 'officerChar.rank.general',
        ]);
    });

    it('every officer prose line in the scenario data has a BCS line and none is left English', () => {
        const officers = JSON.parse(readFileSync('data/scenarios/officers/apr1992_officers.json', 'utf8')) as Array<Record<string, unknown>>;
        const list = Array.isArray(officers) ? officers : (officers as { officers: Array<Record<string, unknown>> }).officers;
        const fields = ['bio_short', 'command_style', 'known_for', 'political_alignment_note'] as const;
        const missing: string[] = [];
        for (const officer of list) {
            for (const field of fields) {
                const value = officer[field];
                if (typeof value === 'string' && !(value in OFFICER_PROSE_BCS)) missing.push(`${String(officer.id)}.${field}`);
            }
        }
        expect(missing).toEqual([]);
        // No entry is a leftover English line.
        for (const [en, bcs] of Object.entries(OFFICER_PROSE_BCS)) {
            expect(bcs, en).not.toBe(en);
            expect(bcs, en).not.toMatch(/\b(the|and|assigned|command|officer|opening)\b/i);
        }
    });

    it('localizeOfficerProse follows the locale and falls back to the data text', () => {
        setLocale('en');
        expect(localizeOfficerProse('Balanced line command')).toBe('Balanced line command');
        setLocale('bcs');
        expect(localizeOfficerProse('Balanced line command')).toBe('Uravnoteženo linijsko komandovanje');
        expect(localizeOfficerProse('A line the table does not know')).toBe('A line the table does not know');
        expect(localizeOfficerProse(undefined)).toBeUndefined();
    });
});

describe('BCS dictionary coverage and wording', () => {
    it('every EN key has a BCS value except the deliberate fallback probe', () => {
        const missing = Object.keys(enMessages).filter((k) => !(k in bcsMessages));
        expect(missing).toEqual(['settings.experimentalFallbackProbe']);
    });

    it('the briefing tile and reserve counter are translated (BC2)', () => {
        expect(t('attention.reviewCritical', undefined, 'bcs')).toBe('Kritični pregledi');
        expect(t('attention.reserveCritical', undefined, 'bcs')).toBe('Kritični zahtjevi za rezervu');
    });

    it('uses dosije, not dosje (BC3)', () => {
        const offenders = Object.entries(bcsMessages)
            .filter(([key, value]) => !key.startsWith('opsPlanning.') && /[Dd]osj/.test(String(value)))
            .map(([key]) => key);
        expect(offenders).toEqual([]);
        expect(t('attention.opDossiers', undefined, 'bcs')).toBe('Op dosijei');
    });

    it('no English loanwords the register named (ST5)', () => {
        const offenders = Object.entries(bcsMessages)
            .filter(([key, value]) => !key.startsWith('opsPlanning.') && /docket|stack trace|dump/i.test(String(value)))
            .map(([key]) => key);
        expect(offenders).toEqual([]);
        expect(t('decisionRoom.card.counterOffer.explanation', { planName: 'X' }, 'bcs')).toContain('spisak');
    });

    it('the Army HQ aria labels read in BCS', () => {
        expect(t('presidentialToolbar.armyHqLabel', { army: 'ARBiH' }, 'bcs')).toBe('Štab ARBiH [H]');
        expect(t('toolbar.armyHqAriaLabel', { army: 'ARBiH' }, 'bcs')).toBe('Štab ARBiH [H]');
    });
});

describe('1992 event BCS text keeps its diacritics (BC3, ST2)', () => {
    const events = JSON.parse(readFileSync('data/scenarios/events/war_1992.json', 'utf8')) as Array<{
        id: string;
        localizations?: { bcs?: Record<string, unknown> };
    }>;

    function bcsStrings(): Array<[string, string]> {
        const out: Array<[string, string]> = [];
        const visit = (node: unknown, path: string): void => {
            if (typeof node === 'string') out.push([path, node]);
            else if (Array.isArray(node)) node.forEach((n, i) => visit(n, `${path}.${i}`));
            else if (node && typeof node === 'object') {
                for (const [k, v] of Object.entries(node)) visit(v, `${path}.${k}`);
            }
        };
        for (const event of events) if (event.localizations?.bcs) visit(event.localizations.bcs, event.id);
        return out;
    }

    it('names the three events with their diacritics', () => {
        const titles = new Map(events.map((e) => [e.id, e.localizations?.bcs?.title]));
        expect(titles.get('rs_strategic_goals')).toBe('Skupština govori');
        expect(titles.get('rbih_state_identity')).toBe('Šta je Bosna?');
        expect(titles.get('hrhb_political_goal')).toBe('Šta je Herceg-Bosna?');
    });

    it('no BCS prose line is written without a single diacritic', () => {
        const bare = bcsStrings()
            .filter(([path]) => !/\.(historical_source|source_tier)$/.test(path))
            .filter(([, value]) => !DIACRITICS.test(value) && /[a-z]{4}/.test(value) && / /.test(value))
            // Labels of three or fewer words that genuinely carry none are checked by hand below.
            .map(([path, value]) => `${path}: ${value}`);
        expect(bare).toEqual([
            'rs_strategic_goals.response_options.selective.label: Usvojiti ciljeve selektivno',
            'rs_strategic_goals.response_options.aggressive.label: Centralizovati operativnu komandu',
            'hrhb_political_goal.response_options.croat_republic.label: Hrvatska republika - slijediti Zagreb',
        ]);
    });

    it('known stripped spellings are gone', () => {
        const text = bcsStrings()
            .filter(([path]) => !/\.(historical_source|source_tier)$/.test(path))
            .map(([, value]) => value)
            .join('\n');
        for (const stripped of [/\bsest\b/, /strateskih/, /[Ss]kupstin/, /\bSta je\b/, /Mladic/, /Predsjednistv/, /gradjan/i, /bosnjack/i, /\bce\b/]) {
            expect(text).not.toMatch(stripped);
        }
    });
});

describe('English left in BCS found by the render check', () => {
    it('the Presidential Attention decision card takes its title from the event catalog in BCS', () => {
        const catalog = new Map([
            ['rbih_state_identity', { id: 'rbih_state_identity', title: 'What Is Bosnia?', localizations: { bcs: { title: 'Šta je Bosna?' } } }],
        ]) as unknown as ReadonlyMap<string, EventDefinition>;
        setLocale('en');
        expect(localizedEventTitle('rbih_state_identity', 'What Is Bosnia?', catalog)).toBe('What Is Bosnia?');
        setLocale('bcs');
        expect(localizedEventTitle('rbih_state_identity', 'What Is Bosnia?', catalog)).toBe('Šta je Bosna?');
        // No catalog or no BCS entry: the event's own title.
        expect(localizedEventTitle('rbih_state_identity', 'What Is Bosnia?', undefined)).toBe('What Is Bosnia?');
        const panel = readFileSync('src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', 'utf8');
        expect(panel).toContain('localizedEventTitle(decision.event_id, decision.event_title, eventCatalog)');
        expect(readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8')).toContain('eventCatalog={eventCatalog}\n                                            />');
    });

    it('the Verdict hero duration goes through i18n, not a literal "weeks" or "y/w" suffix', () => {
        const source = withoutComments(readFileSync('src/ui/map/components/VerdictScreen.tsx', 'utf8'));
        expect(source).not.toMatch(/`\$\{weeks\} weeks`|`\$\{years\}y \$\{weeks\}w`/);
        setLocale('bcs');
        expect(t('gameOver.week.many', { count: 0 }, 'bcs')).not.toMatch(/weeks/);
        expect(t('gameOver.year.many', { count: 3 }, 'bcs')).not.toMatch(/years/);
    });
});

describe('Verdict wording bound by gate §4 (SC4, SC5)', () => {
    const SECOND_PERSON_EN = /\b(you|your|yours)\b/i;
    const SECOND_PERSON_BCS = /\b(vaš|vaša|vaše|vašu|vašem|svoj|svoju|tvoj)\b/i;
    const keys = [
        'gameOver.viewYourWar',
        'verdict.scene.headline.earlyPeace',
        'verdict.scene.subheadline.earlyPeace',
    ] as const;

    it('has the panel-signed text', () => {
        expect(t('gameOver.viewYourWar', undefined, 'en')).toBe('Open campaign recap');
        expect(t('gameOver.viewYourWar', undefined, 'bcs')).toBe('Otvori pregled kampanje');
        expect(t('verdict.scene.headline.earlyPeace', undefined, 'en')).toBe('A war ended by a peace agreement');
        expect(t('verdict.scene.headline.earlyPeace', undefined, 'bcs')).toBe('Rat okončan mirovnim sporazumom');
    });

    it('is third person, has no contrast construction and no em dash', () => {
        for (const key of keys) {
            const en = t(key, undefined, 'en');
            const bcs = t(key, undefined, 'bcs');
            expect(en, key).not.toMatch(SECOND_PERSON_EN);
            expect(bcs, key).not.toMatch(SECOND_PERSON_BCS);
            expect(en, key).not.toMatch(/\bnot\b|, but\b|—/i);
            expect(bcs, key).not.toMatch(/\bne\b|, ali\b|—/i);
        }
    });

    it('carries none of the words the historian barred (spared, averted, fewer, shorter)', () => {
        for (const key of keys) {
            expect(t(key, undefined, 'en'), key).not.toMatch(/spared|averted|saved|fewer|shorter|less\b/i);
        }
    });
});
