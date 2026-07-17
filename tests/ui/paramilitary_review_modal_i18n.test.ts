/**
 * i18n Car 3 — Paramilitary Authorization decision modal localization contract.
 *
 * ParamilitaryReviewModal reads from the Zustand store + IPC, so (like the
 * boot/QA contracts) we assert on the component source rather than mounting it:
 * every player-facing literal must route through the `t('paramilitaryReview.*')`
 * catalog, and the EN values are pinned here so the player-safe wording (and the
 * war-crimes-risk framing in particular) cannot silently regress.
 *
 * Scope note: EN keys only (matches i18n Car 1 / Car 2). BCS translations are an
 * owner-gated native-speaker pass; the catalog falls back to EN until then.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { enMessages } from '../../src/ui/map/i18n/messages.en';

function read(path: string): string {
    return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('Paramilitary review modal — i18n Car 3 (EN keys)', () => {
    const src = read('../../src/ui/map/components/ParamilitaryReviewModal.tsx');

    it('imports and uses the i18n t() helper', () => {
        expect(src).toMatch(/import \{[^}]*\bt\b[^}]*\} from '\.\.\/i18n';/);
        expect(src).toContain("t('paramilitaryReview.");
    });

    it('routes every migrated player-facing literal through the catalog (no hardcoded strings left)', () => {
        const retired = [
            "'Offensive sweep'",
            "'Rear-area consolidation'",
            'imageAlt="Internal security desk"',
            'eyebrow="Presidential Decision Required"',
            'title="Paramilitary Authorization"',
            'No paramilitary requests are pending.',
            'estimated strength {totalStrength}',
            'Deny All',
            'Allow All',
            "'This action requires the desktop command shell.'",
            "'Failed to resolve paramilitary requests.'",
            "'Submit Decisions'",
            "'Submitting...'",
        ];
        for (const literal of retired) {
            expect(src.includes(literal)).toBe(false);
        }
        // The keyed call sites are present.
        for (const key of [
            'paramilitaryReview.title',
            'paramilitaryReview.description',
            'paramilitaryReview.empty',
            'paramilitaryReview.estimatedStrength',
            'paramilitaryReview.requestMeta',
            'paramilitaryReview.deny',
            'paramilitaryReview.allow',
            'paramilitaryReview.denyPacket',
            'paramilitaryReview.allowPacket',
            'paramilitaryReview.alwaysDeny',
            'paramilitaryReview.alwaysAllow',
            'paramilitaryReview.policyHint',
            'paramilitaryReview.close',
            'paramilitaryReview.submit',
            'paramilitaryReview.submitting',
            'paramilitaryReview.error.ipcUnavailable',
            'paramilitaryReview.error.resolveFailed',
            'paramilitaryReview.error.stateUnavailable',
        ]) {
            expect(src).toContain(`t('${key}'`);
        }
    });

    it('pins the EN catalog disclosure and action wording', () => {
        const en = enMessages as Record<string, string>;
        expect(en['paramilitaryReview.mode.offensive']).toBe('Offensive sweep');
        expect(en['paramilitaryReview.mode.rearArea']).toBe('Rear-area consolidation');
        expect(en['paramilitaryReview.imageAlt']).toBe('Internal security desk');
        expect(en['paramilitaryReview.eyebrow']).toBe('Presidential Decision Required');
        expect(en['paramilitaryReview.title']).toBe('Paramilitary Authorization');
        expect(en['paramilitaryReview.description']).toBe(
            'Authorization deploys irregular forces into the named undefended rear pocket. The projected civilian deaths, war crimes record, and international consequences are shown for each request.',
        );
        expect(en['paramilitaryReview.requestCount']).toBe('{count} request');
        expect(en['paramilitaryReview.requestCountPlural']).toBe('{count} requests');
        expect(en['paramilitaryReview.estimatedStrength']).toBe('estimated strength {strength}');
        expect(en['paramilitaryReview.empty']).toBe('No paramilitary requests are pending.');
        expect(en['paramilitaryReview.requestMeta']).toBe('{faction} - {mode} - strength {strength}');
        expect(en['paramilitaryReview.deny']).toBe('Deny');
        expect(en['paramilitaryReview.allow']).toBe('Allow');
        expect(en['paramilitaryReview.denyPacket']).toBe('Deny packet');
        expect(en['paramilitaryReview.allowPacket']).toBe('Allow packet');
        expect(en['paramilitaryReview.alwaysDeny']).toBe('Always deny');
        expect(en['paramilitaryReview.alwaysAllow']).toBe('Always allow');
        expect(en['paramilitaryReview.policyHint']).toBe('Use a standing order if you want future paramilitary packets resolved the same way.');
        expect(en['paramilitaryReview.close']).toBe('Close');
        expect(en['paramilitaryReview.submit']).toBe('Submit Decisions');
        expect(en['paramilitaryReview.submitting']).toBe('Submitting...');
        expect(en['paramilitaryReview.error.ipcUnavailable']).toBe('This action requires the desktop command shell.');
        expect(en['paramilitaryReview.error.resolveFailed']).toBe('Failed to resolve paramilitary requests.');
        expect(en['paramilitaryReview.error.stateUnavailable']).toBe('Paramilitary decisions were recorded, but the updated player-visible state was unavailable.');
    });
});
