/**
 * R8 player-facing name sweep (2026-11-11): municipality spellings, OSID names, ASCII place
 * names restored in rendered text, unique OG names, and no raw reason codes on screen.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
    MUNICIPALITY_DISPLAY_NAMES,
    municipalityDisplayName,
    restoreBosnianPlaceNames,
} from '../../src/ui/shared/bosnianPlaceNames';
import { humanizeOsid } from '../../src/ui/map/utils/osidDisplayName';
import { getPlayerSafeMunicipalityName, getPlayerSafeOperationName, getPlayerSafeEnclaveName } from '../../src/ui/map/utils/playerSafeText';
import { disambiguateSectorDisplayNames } from '../../src/ui/map/data/GameStateAdapter';
import { enMessages } from '../../src/ui/map/i18n/messages.en';

const repo = path.resolve(__dirname, '..', '..');

describe('municipality display names', () => {
    it('match the canonical 1990 registry spelling for every municipality (Drvar is the one deliberate short name)', () => {
        const canonical = JSON.parse(fs.readFileSync(path.join(repo, 'data/derived/mun1990_names.json'), 'utf8'))
            .by_municipality_id as Record<string, { mun1990_id: string; display_name: string }>;
        for (const { mun1990_id, display_name } of Object.values(canonical)) {
            const expected = mun1990_id === 'titov_drvar' ? 'Drvar' : display_name.replace('Han-Pijesak', 'Han Pijesak');
            expect(MUNICIPALITY_DISPLAY_NAMES[mun1990_id], mun1990_id).toBe(expected);
        }
        expect(municipalityDisplayName('modrica')).toBe('Modriča');
        expect(getPlayerSafeMunicipalityName('bosanska_krupa')).toBe('Bosanska Krupa');
        expect(getPlayerSafeMunicipalityName('foca')).toBe('Foča');
    });
});

describe('OSID names', () => {
    it('the generated table is in sync with the operational settlements GeoJSON', () => {
        expect(() => execFileSync(process.execPath, ['tools/ui/generate_osid_place_names.cjs', '--check'], { cwd: repo, stdio: 'pipe' }))
            .not.toThrow();
    });

    it('renders census spellings with a capitalised municipality, never the slug', () => {
        expect(humanizeOsid('op:bosanska_krupa:arapusa_2')).toBe('Arapuša (Bosanska Krupa)');
        expect(humanizeOsid('op:rogatica:zepa_2')).toBe('Žepa (Rogatica)');
        expect(humanizeOsid('op:bosanski_samac:samac_2')).toBe('Šamac (Bosanski Šamac)');
        // Unknown OSIDs still humanize, with the municipality table for the bracket.
        expect(humanizeOsid('op:gorazde:not_a_real_place')).toBe('Not A Real Place (Goražde)');
    });
});

describe('restoreBosnianPlaceNames', () => {
    it('restores ASCII place names in prose and leaves identifiers and ordinary words alone', () => {
        expect(restoreBosnianPlaceNames('Operation Foca')).toBe('Operation Foča');
        expect(restoreBosnianPlaceNames('Advance from Orasac (Bihac)')).toBe('Advance from Orašac (Bihać)');
        expect(restoreBosnianPlaceNames('Gorazde, Sarajevo, Srebrenica, Teocak')).toBe('Goražde, Sarajevo, Srebrenica, Teočak');
        expect(restoreBosnianPlaceNames('Bosanski Samac')).toBe('Bosanski Šamac');
        expect(restoreBosnianPlaceNames('Focal point')).toBe('Focal point');
        expect(restoreBosnianPlaceNames('op:foca:foca')).toBe('op:foca:foca');
        expect(restoreBosnianPlaceNames('Bihać')).toBe('Bihać');
    });

    it('changes no English UI message (no false positives in the catalogue)', () => {
        const changed = Object.entries(enMessages)
            .filter(([, value]) => typeof value === 'string' && restoreBosnianPlaceNames(value) !== value)
            .map(([key]) => key);
        expect(changed).toEqual([]);
    });

    it('event and Codex text carries no ASCII-stripped place names', () => {
        // Content-fingerprinted reviewed contracts (src/sim/events/opening_policy_transition.ts):
        // their text changes only through re-review, so the sweep leaves them byte-identical.
        const REVIEWED = new Set(['rbih_state_identity', 'rbih_paramilitary_policy_1992']);
        const FIELDS = new Set(['title', 'narrative', 'label', 'description', 'source_note', 'headline', 'body',
            'summary', 'text', 'explanation', 'staff_assessment', 'historical_source']);
        const offenders: string[] = [];
        const walk = (node: unknown, where: string): void => {
            if (Array.isArray(node)) { node.forEach((child) => walk(child, where)); return; }
            if (!node || typeof node !== 'object') return;
            for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
                if (typeof value === 'string') {
                    if (FIELDS.has(key) && restoreBosnianPlaceNames(value) !== value) offenders.push(`${where}.${key}: ${value.slice(0, 60)}`);
                } else {
                    walk(value, where);
                }
            }
        };
        for (const dir of ['data/scenarios/events', 'data/scenarios/essays']) {
            for (const file of fs.readdirSync(path.join(repo, dir)).filter((n) => n.endsWith('.json')).sort()) {
                const parsed = JSON.parse(fs.readFileSync(path.join(repo, dir, file), 'utf8'));
                const rows = Array.isArray(parsed) ? parsed : [parsed];
                for (const row of rows) {
                    const id = (row as { id?: string })?.id ?? file;
                    if (REVIEWED.has(id)) continue;
                    walk(row, `${file}#${id}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('operation and enclave names reach the player with diacritics', () => {
        expect(getPlayerSafeOperationName('Operation Kotor Varos')).toBe('Operation Kotor Varoš');
        expect(getPlayerSafeOperationName('Operation Visegrad')).toBe('Operation Višegrad');
        expect(getPlayerSafeEnclaveName('Gorazde')).toBe('Goražde');
    });
});

describe('OG/TG/OZ sector names', () => {
    it('two sectors of one faction never share a name; the qualifier is a municipality they cover', () => {
        const sectors = [
            { sector_id: 's2', faction: 'RS', display_name: 'OG Donji Vakuf' },
            { sector_id: 's1', faction: 'RS', display_name: 'OG Donji Vakuf' },
            { sector_id: 's3', faction: 'RBiH', display_name: 'OG Donji Vakuf' },
            { sector_id: 's4', faction: 'HRHB', display_name: 'OZ Central Bosnia' },
            { sector_id: 's5', faction: 'HRHB', display_name: 'OZ Central Bosnia' },
        ];
        disambiguateSectorDisplayNames(sectors, new Map([
            ['s1', ['Donji Vakuf', 'Bugojno']],
            ['s2', ['Donji Vakuf', 'Bugojno', 'Jajce']],
            ['s4', ['Vitez']],
            ['s5', []],
        ]));
        const byId = Object.fromEntries(sectors.map((s) => [s.sector_id, s.display_name]));
        expect(byId.s1).toBe('OG Donji Vakuf (Bugojno)');
        expect(byId.s2).toBe('OG Donji Vakuf (Jajce)');
        expect(byId.s3).toBe('OG Donji Vakuf'); // other faction: not a clash
        expect(byId.s4).toBe('OZ Central Bosnia I'); // s5 has no municipality to tell them apart
        expect(byId.s5).toBe('OZ Central Bosnia II');
    });
});

describe('leadership gesture reasons', () => {
    it('no machine reason code is rendered verbatim', () => {
        const source = fs.readFileSync(path.join(repo, 'src/ui/map/components/army_hq/DirectiveCard.tsx'), 'utf8');
        expect(source).not.toMatch(/r\.reason\s*\?\?/);
        expect(source).toMatch(/function gestureReasonText/);
        expect(enMessages['directive.gesture.alreadyPending']).toBeTruthy();
        expect(enMessages['directive.gesture.exhausted']).toBeTruthy();
    });
});
