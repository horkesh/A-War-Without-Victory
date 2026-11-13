// @vitest-environment jsdom

/**
 * BCS corps names in grammatical case (SC8/SC9, follow-up to the sensitive-copy
 * lane #584). The helper declines every corps-level command; BCS templates mark
 * the case their grammar needs on the placeholder ("iz {corps:gen}"); paths
 * that showed the English data name in BCS go through the helper.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    BCS_CASES,
    BCS_CORPS_CASE_FORMS,
    BCS_FALLBACK_CASE_FORMS,
    corpsNameKey,
    resolveBcsCase,
} from '../../src/ui/map/i18n/bcsCases';
import { setLocale, t, type MessageKey } from '../../src/ui/map/i18n';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { formatCorpsDisplayName } from '../../src/ui/map/utils/formatters';
import { getPlayerFacingCorpsName } from '../../src/ui/shared/playerFacingLabels';
import { formatBackTheOfficerFraming } from '../../src/ui/map/components/army_hq/OperationOpportunityDossierPanel';
import { TurnAftermathModal } from '../../src/ui/map/components/TurnAftermathModal';
import type { BackTheOfficerView } from '../../src/ui/map/data/backTheOfficer';
import type { TurnAftermathView } from '../../src/ui/map/data/turnAftermath';

afterEach(() => {
    cleanup();
    setLocale('en');
});

const ROOT = join(__dirname, '..', '..');
const corps = (JSON.parse(readFileSync(join(ROOT, 'data/source/oob_corps.json'), 'utf8')) as {
    corps: Array<{ id: string; name: string }>;
}).corps;

const en = enMessages as Record<string, string>;
const bcs = bcsMessages as Record<string, string | undefined>;
const PLACEHOLDER = /\{([a-zA-Z0-9_]+)(?::([a-z]+))?\}/g;

function placeholders(template: string): Array<{ name: string; grammaticalCase?: string }> {
    return [...template.matchAll(PLACEHOLDER)].map((m) => ({ name: m[1], grammaticalCase: m[2] }));
}

describe('BCS corps case forms', () => {
    it('covers every corps in the data, and each nominative is the corps.name BCS message', () => {
        for (const c of corps) {
            const forms = BCS_CORPS_CASE_FORMS[c.id];
            expect(forms, c.id).toBeTruthy();
            expect(forms.nom, c.id).toBe(bcs[corpsNameKey(c.id)]);
            for (const grammaticalCase of BCS_CASES) expect(forms[grammaticalCase], `${c.id} ${grammaticalCase}`).toBeTruthy();
        }
        expect(Object.keys(BCS_CORPS_CASE_FORMS).sort()).toEqual(corps.map((c) => c.id).sort());
    });

    it('declines ARBiH and VRS korpus, the staffs, the JNA command, and keeps HVO OZ names fixed', () => {
        expect(BCS_CORPS_CASE_FORMS.arbih_1st_corps).toEqual({
            nom: '1. korpus', gen: '1. korpusa', dat: '1. korpusu', acc: '1. korpus', ins: '1. korpusom', loc: '1. korpusu',
        });
        expect(BCS_CORPS_CASE_FORMS.vrs_drina).toEqual({
            nom: 'Drinski korpus', gen: 'Drinskog korpusa', dat: 'Drinskom korpusu', acc: 'Drinski korpus', ins: 'Drinskim korpusom', loc: 'Drinskom korpusu',
        });
        expect(BCS_CORPS_CASE_FORMS.vrs_1st_krajina.gen).toBe('1. krajiškog korpusa');
        expect(BCS_CORPS_CASE_FORMS.vrs_sarajevo_romanija.ins).toBe('Sarajevsko-romanijskim korpusom');
        expect(BCS_CORPS_CASE_FORMS.vrs_east_bosnian.loc).toBe('Istočnobosanskom korpusu');
        expect(BCS_CORPS_CASE_FORMS.vrs_herzegovina.gen).toBe('Hercegovačkog korpusa');
        expect(BCS_CORPS_CASE_FORMS.arbih_general_staff.ins).toBe('Glavnim štabom ARBiH');
        expect(BCS_CORPS_CASE_FORMS.vrs_main_staff.gen).toBe('Glavnog štaba VRS');
        expect(BCS_CORPS_CASE_FORMS.hvo_main_staff.loc).toBe('Glavnom stožeru HVO');
        expect(BCS_CORPS_CASE_FORMS.jna_herzegovina_command.acc).toBe('4. vojnu oblast JNA (Hercegovina)');
        expect(BCS_CORPS_CASE_FORMS.jna_herzegovina_command.ins).toBe('4. vojnom oblašću JNA (Hercegovina)');
        for (const grammaticalCase of BCS_CASES) {
            expect(BCS_CORPS_CASE_FORMS.hvo_central_bosnia[grammaticalCase]).toBe('OZ Srednja Bosna');
        }
    });

    it('keeps each fallback phrase nominative equal to its BCS message', () => {
        for (const [key, forms] of Object.entries(BCS_FALLBACK_CASE_FORMS)) {
            expect(forms!.nom, key).toBe(bcs[key]);
        }
    });

    it('resolves a corps by BCS nominative, English data name or id; leaves anything else alone', () => {
        expect(resolveBcsCase('1. korpus', 'gen')).toBe('1. korpusa');
        expect(resolveBcsCase('Drina Corps', 'ins')).toBe('Drinskim korpusom');
        expect(resolveBcsCase('vrs_herzegovina', 'loc')).toBe('Hercegovačkom korpusu');
        expect(resolveBcsCase('Drina Corps', 'nom')).toBe('Drinski korpus');
        expect(resolveBcsCase('ovaj korpus', 'gen')).toBe('ovog korpusa');
        expect(resolveBcsCase('Ovaj korpus', 'ins')).toBe('Ovim korpusom');
        expect(resolveBcsCase('OG Bosanska Krajina', 'gen')).toBe('OG Bosanska Krajina');
    });
});

describe('formatCorpsDisplayName in case', () => {
    it('returns the requested BCS case and leaves English untouched', () => {
        setLocale('en');
        expect(formatCorpsDisplayName('1st Corps', 'arbih_1st_corps', 'This corps', 'gen')).toBe('1st Corps');
        setLocale('bcs');
        expect(formatCorpsDisplayName('1st Corps', 'arbih_1st_corps')).toBe('1. korpus');
        expect(formatCorpsDisplayName('1st Corps', 'arbih_1st_corps', 'This corps', 'gen')).toBe('1. korpusa');
        expect(formatCorpsDisplayName('Drina Corps', null, 'This corps', 'ins')).toBe('Drinskim korpusom');
        expect(formatCorpsDisplayName(null, 'hvo_main_staff', 'This corps', 'gen')).toBe('Glavnog stožera HVO');
        expect(formatCorpsDisplayName(null, null, 'komanda jednog korpusa', 'gen')).toBe('komande jednog korpusa');
        expect(formatCorpsDisplayName('Some brigade', 'some_brigade', 'This corps', 'gen')).toBe('Some brigade');
    });

    it('localizes the shared id-to-name lookup that the inbox and reserve panel use', () => {
        const source = [{ id: 'vrs_drina', name: 'Drina Corps' }];
        setLocale('en');
        expect(getPlayerFacingCorpsName('vrs_drina', source)).toBe('Drina Corps');
        setLocale('bcs');
        expect(getPlayerFacingCorpsName('vrs_drina', source)).toBe('Drinski korpus');
        expect(getPlayerFacingCorpsName('vrs_missing', source, 'Assigned command')).toBe('Assigned command');
    });
});

describe('BCS template wiring', () => {
    // The parked operation planner (ops_modal, DLC) keeps its copy untouched; its three
    // corps templates already read correctly (after a colon, after "za", after "·").
    const PARKED_PLANNER = /^opsPlanning\./;

    it('every BCS template that names a corps declares the case its grammar needs', () => {
        const unmarked: string[] = [];
        for (const [key, enTemplate] of Object.entries(en)) {
            const bcsTemplate = bcs[key];
            if (!bcsTemplate || PARKED_PLANNER.test(key)) continue;
            if (!placeholders(enTemplate).some((p) => p.name === 'corps' || p.name === 'corpsName')) continue;
            for (const p of placeholders(bcsTemplate)) {
                if ((p.name === 'corps' || p.name === 'corpsName') && !p.grammaticalCase) unmarked.push(key);
            }
        }
        expect(unmarked).toEqual([]);
    });

    it('uses only known cases, only in BCS, and only on placeholders the English template also has', () => {
        for (const [key, enTemplate] of Object.entries(en)) {
            expect(placeholders(enTemplate).filter((p) => p.grammaticalCase), key).toEqual([]);
            const bcsTemplate = bcs[key];
            if (!bcsTemplate) continue;
            const enNames = new Set(placeholders(enTemplate).map((p) => p.name));
            for (const p of placeholders(bcsTemplate)) {
                if (!p.grammaticalCase) continue;
                expect(BCS_CASES as readonly string[], `${key} {${p.name}:${p.grammaticalCase}}`).toContain(p.grammaticalCase);
                expect(enNames.has(p.name), `${key} {${p.name}}`).toBe(true);
            }
        }
    });

    it('renders the oblique cases in BCS sentences and leaves English as it was', () => {
        const say = (key: MessageKey, params: Record<string, string>) => t(key, params);
        setLocale('bcs');
        expect(say('armyReserve.recallBrigadeAria', { name: '7. muslimanska', corps: '3rd Corps' }))
            .toBe('Povuci 7. muslimanska iz 3. korpusa');
        expect(say('chiefOfStaff.strain.cautious.strained', { corpsName: 'Drina Corps' }))
            .toContain('komandni odnosi sa Drinskim korpusom i dalje');
        expect(say('chiefOfStaff.strain.exhaustion.strained', { corpsName: '2. krajiški korpus' }))
            .toContain('komandni ciklus u 2. krajiškom korpusu.');
        expect(say('chiefOfStaff.strain.aggressive.strained', { corpsName: '1. korpus' }))
            .toMatch(/^Štab 1\. korpusa je još uz nas/);
        expect(say('decisionConsequences.detail.officer.replacement', { incoming: 'Atif Dudaković', corps: '5th Corps' }))
            .toBe('Atif Dudaković postavljen za komandanta 5. korpusa.');
        expect(say('decisionConsequences.detail.reserve.accepted', { brigade: '17. krajiška', corps: '3rd Corps', detail: '' }).trim())
            .toBe('17. krajiška dodijeljena 3. korpusu.');
        expect(say('oob.inspectSectorOnField', { sector: 'Doboj', corps: '1st Krajina Corps' }))
            .toBe('Pregledaj Doboj na terenu pod 1. krajiškim korpusom');
        expect(say('armyReserve.assignToCorps', { corps: 'JNA Herzegovina Command' }))
            .toBe('Pregledaj 4. vojnu oblast JNA (Hercegovina)');
        expect(say('threatAssessment.frontLabel', { name: 'Sarajevo-Romanija Corps' }))
            .toBe('Linija Sarajevsko-romanijskog korpusa');
        expect(say('chronicle.generated.generals.clause.pressed', { corpsName: '2. korpus', opName: 'Operacija Proljeće' }))
            .toBe('Operacija Proljeće u toku pod komandom 2. korpusa');
        expect(say('operationsPanel.openCorpsOrdersAria', { corps: t('operationsPanel.thisCorps') }))
            .toBe('Otvori naredbe ovog korpusa');

        setLocale('en');
        expect(say('armyReserve.recallBrigadeAria', { name: '7th Muslim', corps: '3rd Corps' }))
            .toBe('Recall 7th Muslim from 3rd Corps');
        expect(say('decisionConsequences.detail.officer.replacement', { incoming: 'Atif Dudaković', corps: '5th Corps' }))
            .toBe('Atif Dudaković appointed to 5th Corps.');
    });
});

describe('JNA Herzegovina entry renamed by display label (owner, 2026-11-13)', () => {
    it('shows the 4th Military District label in both locales, by id or by the saved data name', () => {
        const savedName = corps.find((c) => c.id === 'jna_herzegovina_command')!.name;
        expect(savedName).toBe('JNA Herzegovina Command'); // saves and the startup snapshot keep it
        setLocale('en');
        expect(formatCorpsDisplayName(savedName, 'jna_herzegovina_command')).toBe('JNA 4th Military District (Herzegovina)');
        expect(formatCorpsDisplayName(savedName, null)).toBe('JNA 4th Military District (Herzegovina)');
        expect(t('decisionRoom.card.replaceCo.title', { corps: savedName })).toBe('Replace commander: JNA 4th Military District (Herzegovina)');
        setLocale('bcs');
        expect(formatCorpsDisplayName(savedName, 'jna_herzegovina_command')).toBe('4. vojna oblast JNA (Hercegovina)');
        expect(t('armyReserve.recallBrigadeAria', { name: 'X', corps: savedName })).toBe('Povuci X iz 4. vojne oblasti JNA (Hercegovina)');
    });
});

describe('paths that bypassed the helper', () => {
    function donorView(): BackTheOfficerView {
        return {
            op_id: 'op_1',
            op_name: 'Operation Spring',
            anchor_corps_id: 'arbih_2nd_corps',
            anchor_corps_name: '2nd Corps',
            tg_name: null,
            tg_id: null,
            commander: { officer_id: 'o1', name: 'Sead Delić', lost: false },
            donors: [
                { corps_id: 'arbih_1st_corps', corps_name: '1st Corps', brigade_ids: ['b1'], personnel_lent: 0 },
                { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', brigade_ids: ['b2'], personnel_lent: 0 },
            ],
            total_personnel_lent: 0,
        } as unknown as BackTheOfficerView;
    }

    it('names dossier donors in the genitive in BCS, and joins the last pair with a conjunction', () => {
        setLocale('bcs');
        expect(formatBackTheOfficerFraming(donorView())).toContain('iz 1. korpusa i 3. korpusa');
        setLocale('en');
        expect(formatBackTheOfficerFraming(donorView())).toContain('from 1st Corps and 3rd Corps');
    });

    it('shows the BCS corps name on the aftermath command record', () => {
        const view = {
            turn: 3,
            dateLabel: '27 Apr 1992',
            playerFaction: 'RS',
            headline: 'x',
            narrativeLine: 'x',
            tone: 'quiet',
            territory: { friendlyNet: 0, gains: 0, losses: 0, breakdownComplete: true, notable: [] },
            combat: { battleCount: 0, friendlyBattleCount: 0, friendlyCasualties: 0, opposingCasualties: 0, territoryFlipsFromBattles: 0 },
            humanitarian: { displacedThisTurn: 0 },
            formations: { spawned: 0, destroyed: 0, ownSpawned: 0, ownDestroyed: 0 },
            supply: { ownSupplyDelta: 0, ownHeavyMunitionsDelta: 0 },
            cost: {
                friendlyMilitaryCasualties: 0, theaterMilitaryCasualties: 0, displacedThisTurn: 0, ownFormationsDestroyed: 0,
                ownSupplySpent: 0, ownHeavyMunitionsSpent: 0, severity: 'low', reasons: [],
            },
            signals: [],
            commandRecord: {
                directives: [],
                rows: [{
                    id: 'vrs_drina', corpsName: 'Drina Corps', officerName: 'Milenko Živanović', assignedRole: 'x',
                    interpretation: 'as_issued', interpretationDetail: 'x', action: 'x', actionDetail: 'x',
                }],
            },
            judgment: { headline: 'x', detail: 'x', memoryTone: 'territory', primarySurface: 'chronicle', secondarySurface: 'records' },
            nextActions: {
                actionableCount: 0, blockingCount: 0, opportunityCount: 0, reserveCount: 0, officerCount: 0,
                eventDecisionCount: 0, peaceCount: 0, topItems: [],
            },
        } as unknown as TurnAftermathView;
        setLocale('bcs');
        render(createElement(TurnAftermathModal, {
            isOpen: true, view, onClose: vi.fn(), onOpenInbox: vi.fn(), onOpenSummary: vi.fn(),
            onOpenRecords: vi.fn(), onOpenChronicle: vi.fn(), onOpenCodex: vi.fn(),
        }));
        const row = screen.getByTestId('turn-aftermath-command-record-row');
        expect(row.textContent).toContain('Drinski korpus');
        expect(row.textContent).not.toContain('Drina Corps');
    });
});
