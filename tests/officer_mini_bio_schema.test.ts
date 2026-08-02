import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const OFFICER_DATA_PATH = path.resolve('data/scenarios/officers/apr1992_officers.json');

const FIRST_PASS_PROFILED_COMMANDERS = [
    'arbih_halilovic',
    'arbih_talijan',
    'hvo_blaskic',
    'hvo_lasic',
    'hvo_matuzovic',
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
    known_for?: unknown;
    historical_role?: unknown;
    political_alignment_note?: unknown;
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
    it('does not preserve the legacy false turn-zero opening classification', () => {
        const officers = loadOfficerRecords();
        const discovered = officers
            .filter((officer) =>
                officer.is_historical_start === true
                && officer.available_from_turn === 0
                && (officer.rank === 'army_commander' || officer.rank === 'corps_commander')
            )
            .map((officer) => String(officer.id))
            .sort();

        expect(discovered).toEqual([]);
        const byId = new Map(officers.map((officer) => [officer.id, officer]));
        for (const officerId of FIRST_PASS_PROFILED_COMMANDERS) {
            expect(byId.get(officerId)?.available_from_turn, officerId).toBeGreaterThan(0);
        }
    });

    it('retains a compact, source-bounded mini-bio for every first-pass profile', () => {
        const byId = new Map(loadOfficerRecords().map((officer) => [officer.id, officer]));

        for (const officerId of FIRST_PASS_PROFILED_COMMANDERS) {
            const officer = byId.get(officerId);
            expect(officer, `${officerId} exists`).toBeDefined();
            expectShortString(officer?.bio_short, 'bio_short', officerId, 150);
            if (officer?.sensitive_history_note !== undefined) {
                expectShortString(officer.sensitive_history_note, 'sensitive_history_note', officerId, 120);
                expect(String(officer.sensitive_history_note).toLowerCase()).not.toMatch(/\b(guilty|culpable|ordered|responsible)\b/);
            }
        }
    });

    it('does not describe post-opening appointments as scenario-start commands', () => {
        for (const officer of loadOfficerRecords()) {
            if ((officer.available_from_turn ?? 0) <= 0) continue;
            const chronologyCopy = [officer.bio_short, officer.known_for]
                .filter((value): value is string => typeof value === 'string')
                .join(' ');
            expect(chronologyCopy, officer.id).not.toMatch(/\b(?:scenario start|opening (?:army |corps |regional |northwest |command))\b/i);
        }
    });

    it('keeps Matuzović bounded to the exact Court of BiH command record', () => {
        const officer = loadOfficerRecords().find((candidate) => candidate.id === 'hvo_matuzovic');
        expect(officer?.available_from_turn).toBe(69);
        expect(officer?.historical_role).toBe('operational_zone_commander');
        expect(officer?.bio_short).toMatch(/Court of BiH.*106th HVO Brigade.*Operational Group.*Operational Zone/i);
        expect(officer?.political_alignment_note).not.toMatch(/corps command/i);
    });
});
