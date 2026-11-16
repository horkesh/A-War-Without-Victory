/**
 * Staff-sweep disclosure (Option B, §6 sitting 2026-11-16): at Assisted, Delegated or Observer command the staff decides
 * rear-area paramilitary sweeps without asking and the standing order is not consulted; those sweeps count against the
 * side. The player-facing copy must say so truthfully, and must never call a sweep "authorized" or the flag "ethnic
 * cleansing" (SENSITIVE_HISTORY_DESIGN_GATE.md §2a(0)). Reviewed by the narrative, historian and canon seats.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { withoutComments } from '../helpers/sourceComments';

const en = enMessages as Record<string, string>;
const bcs = bcsMessages as Record<string, string>;

const FLAG_AND_RECEIPT_KEYS = [
    'verdict.condemnation.authorizedCleansing',
    'dayton.folder.condemnation.cleansing',
    'decisionConsequences.title.paramilitary.unrequested',
    'decisionConsequences.outcome.unrequested',
    'decisionConsequences.detail.paramilitary.unrequested',
    'warCost.finding.paramilitary.text',
    'warCost.finding.paramilitary.textOne',
    'eventDecision.paramilitaryPolicyRule',
] as const;

describe('staff-sweep disclosure copy', () => {
    it('never calls a sweep authorized or the flag ethnic cleansing, in either language', () => {
        for (const key of FLAG_AND_RECEIPT_KEYS) {
            expect(en[key], key).toBeTypeOf('string');
            expect(bcs[key], `${key} (bcs)`).toBeTypeOf('string');
            expect(en[key], key).not.toMatch(/authori[sz]ed|ethnic cleansing/i);
            expect(bcs[key], `${key} (bcs)`).not.toMatch(/odobr|etničk\w* čišćenj/i);
        }
    });

    it('the Dayton flag line is an assessment attributed to the side\'s forces, never a court finding, and BCS never says convicted or sentenced', () => {
        expect(en['dayton.folder.condemnation.cleansing']).toMatch(/political assessment, not a court finding/);
        expect(en['dayton.folder.condemnation.cleansing']).toMatch(/by its forces/);
        expect(bcs['dayton.folder.condemnation.cleansing']).toMatch(/politička ocjena, a ne sudska presuda/);
        expect(bcs['dayton.folder.condemnation.cleansing']).not.toMatch(/osuđen/i);
    });

    it('the three command levels that delegate say the staff decides sweeps without asking and that Always deny is bypassed', () => {
        for (const key of ['autonomy.level.assisted.desc', 'autonomy.level.delegated.desc']) {
            expect(en[key], key).toMatch(/decides rear-area paramilitary sweeps without asking you/);
            expect(en[key], key).toMatch(/even when set to Always deny/);
            expect(en[key], key).toMatch(/counts against your side/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/bez pitanja/);
            expect(bcs[key], `${key} (bcs)`).toMatch(/Uvijek odbij/);
        }
        expect(en['autonomy.level.fullControl.desc']).toMatch(/yours to decide/);
    });

    it('the receipt names the municipality scale and says it is a simulated-war event, not a statement about the place', () => {
        for (const text of [en['decisionConsequences.detail.paramilitary.unrequested'], bcs['decisionConsequences.detail.paramilitary.unrequested']]) {
            expect(text).toContain('{place}');
            expect(text).toContain('{faction}');
        }
        expect(en['decisionConsequences.detail.paramilitary.unrequested']).toMatch(/not a statement about what happened in that place/);
        expect(bcs['decisionConsequences.detail.paramilitary.unrequested']).toMatch(/simuliranog rata/);
    });

    it('both opening paramilitary policy cards carry the game-rule block in the decision modal', () => {
        const source = withoutComments(readFileSync('src/ui/map/components/EventDecisionModal.tsx', 'utf8'));
        expect(source).toContain("'rbih_paramilitary_policy_1992'");
        expect(source).toContain("'rs_paramilitary_policy_1992'");
        expect(source).toContain("t('eventDecision.paramilitaryPolicyRule')");
        expect(en['eventDecision.gameRule']).toBe('Game rule');
        expect(bcs['eventDecision.gameRule']).toBe('Pravilo igre');
    });

    it('the reviewed policy event text keeps no meta sentence (the rule lives in the game-rule block, not in the 1992 card)', () => {
        const events = readFileSync('data/scenarios/events/war_1992.json', 'utf8');
        expect(events).not.toMatch(/counts against your side/);
    });
});
