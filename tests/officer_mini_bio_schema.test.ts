import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const OFFICER_DATA_PATH = path.resolve('data/scenarios/officers/apr1992_officers.json');

const FIRST_PASS_OPENING_COMMANDERS = [
    'arbih_drekovic',
    'arbih_halilovic',
    'hvo_blaskic',
    'hvo_lasic',
    'hvo_petkovic',
    'vrs_grubac',
    'vrs_mladic',
    'vrs_simic',
    'vrs_sipcic',
    'vrs_talic',
] as const;

type OfficerRecord = {
    id?: string;
    rank?: string;
    available_from_turn?: number;
    is_historical_start?: boolean;
    bio_short?: unknown;
    sensitive_history_note?: unknown;
};

function loadOfficerRecords(): OfficerRecord[] {
    const raw = JSON.parse(fs.readFileSync(OFFICER_DATA_PATH, 'utf8')) as { officers?: OfficerRecord[] };
    return raw.officers ?? [];
}

function expectShortString(value: unknown, field: string, officerId: string, maxLength: number) {
    expect(typeof value, `${officerId}.${field}`).toBe('string');
    const text = String(value);
    expect(text.trim(), `${officerId}.${field} must not be blank`).toBe(text);
    expect(text.length, `${officerId}.${field} must be compact`).toBeLessThanOrEqual(maxLength);
}

describe('officer mini-bio schema', () => {
    it('keeps the first pass limited to opening commanders already displayed by HQ/OOB surfaces', () => {
        const officers = loadOfficerRecords();
        const discovered = officers
            .filter((officer) =>
                officer.is_historical_start === true
                && officer.available_from_turn === 0
                && (officer.rank === 'army_commander' || officer.rank === 'corps_commander')
            )
            .map((officer) => String(officer.id))
            .sort();

        expect(discovered).toEqual([...FIRST_PASS_OPENING_COMMANDERS].sort());
    });

    it('authors a compact, source-bounded mini-bio for every supported opening commander', () => {
        const byId = new Map(loadOfficerRecords().map((officer) => [officer.id, officer]));

        for (const officerId of FIRST_PASS_OPENING_COMMANDERS) {
            const officer = byId.get(officerId);
            expect(officer, `${officerId} exists`).toBeDefined();
            expectShortString(officer?.bio_short, 'bio_short', officerId, 150);
            if (officer?.sensitive_history_note !== undefined) {
                expectShortString(officer.sensitive_history_note, 'sensitive_history_note', officerId, 120);
                expect(String(officer.sensitive_history_note).toLowerCase()).not.toMatch(/\b(guilty|culpable|ordered|responsible)\b/);
            }
        }
    });
});
