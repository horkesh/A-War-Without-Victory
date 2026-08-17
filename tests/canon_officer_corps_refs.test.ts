import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createOOBLookup } from '../src/sim/oob_lookup.js';

interface OfficerRecord {
    id: string;
    home_corps_id?: string | null;
    compatible_corps_ids?: string[];
    war_crimes_record?: unknown;
}

interface OfficersFile {
    officers: OfficerRecord[];
}

interface OobCorpsFile {
    corps: Array<{ id: string }>;
}

function readJson<T>(...parts: string[]): T {
    return JSON.parse(readFileSync(join(process.cwd(), ...parts), 'utf8')) as T;
}

describe('canon officer corps references', () => {
    const officers = readJson<OfficersFile>('data', 'scenarios', 'officers', 'apr1992_officers.json').officers;
    const corpsIds = new Set(readJson<OobCorpsFile>('data', 'source', 'oob_corps.json').corps.map((corps) => corps.id));

    it('every officer home_corps_id exists in oob_corps when set', () => {
        const missingHomeRefs = officers
            .filter((officer) => officer.home_corps_id != null && !corpsIds.has(officer.home_corps_id))
            .map((officer) => `${officer.id}:${officer.home_corps_id}`)
            .sort();

        expect(missingHomeRefs).toEqual([]);
    });

    it('every officer compatible_corps_ids entry exists in oob_corps', () => {
        const missingCompatibleRefs = officers
            .flatMap((officer) =>
                (officer.compatible_corps_ids ?? [])
                    .filter((corpsId) => !corpsIds.has(corpsId))
                    .map((corpsId) => `${officer.id}:${corpsId}`)
            )
            .sort();

        expect(missingCompatibleRefs).toEqual([]);
    });

    it('publishes the court dispositions of Živanović and Šiljeg — a missing citation is not a retraction', () => {
        // Both records were once deleted to clear a blocking `court_record_citation` check.
        // Neither finding was ever doubted: both rows are `disposition: supported` with exact
        // evidence (Šiljeg — ICTY IT-04-74-T transcript; Živanović — Balkan Battlegrounds
        // Vol. II p.404). What is outstanding is the court citation, which the provenance
        // harness now raises as a non-blocking `court_record_citation_todo`.
        // Full content pinning lives in tests/officer_war_crimes_record_guard.test.ts.
        for (const officerId of ['vrs_zivanovic', 'hvo_siljeg']) {
            expect(officers.find((officer) => officer.id === officerId)?.war_crimes_record).toBeDefined();
        }
    });

    it('contains only one playable row for each exact HVO/VRS alias family', () => {
        const brigadeIds = new Set(readJson<Array<{ id: string }>>('data', 'source', 'oob_brigades.json')
            .map((brigade) => brigade.id));
        // Genuine same-unit aliases: one playable row each.
        const aliasFamilies = [
            ['hrhb_mario_hrka_ikota_brigade', 'hrhb_iroki_brijeg_brigade'],
            ['hrhb_6th_brigade_ranko_boban', 'hrhb_grude_brigade'],
            ['hrhb_1st_herzegovina_brigade_knez_domagoj', 'hrhb_apljina_brigade'],
        ];

        for (const family of aliasFamilies) {
            expect(family.filter((id) => brigadeIds.has(id)), family.join(' = ')).toHaveLength(1);
        }

        // NOT AN ALIAS FAMILY — both rows must exist. `rs_visegrad_brigade` was
        // listed here and deleted as an "exact alias" of `rs_5th_podrinje`. It is a
        // SEPARATE BRIGADE that was MERGED INTO that one in mid/late 1994, which is
        // a different fact with a different consequence. BB2 p.310 (printed 291)
        // fn 118: the 2nd Podrinje was "Originally 1st Visegrad Light Infantry
        // Brigade; merged with 5th Podrinje mid-late 1994"; fn 121: the 5th was
        // "Originally 1st Gorazde Light Infantry Brigade; merged with 2nd Podrinje
        // mid-late 1994, but retained 5th designator". BB2 p.303 (284) lists both in
        // one OOB block. AWWV opens in April 1992, so collapsing them asserts the
        // consolidation about two and a half years early and strips Operation
        // Višegrad of its anchor brigade.
        //
        // The deletion was argued from Appendix G (July 1995), which shows one
        // Podrinje brigade at Višegrad precisely BECAUSE it postdates the merger —
        // the snapshot proving the merge happened was read as proof it always had.
        for (const id of ['rs_5th_podrinje', 'rs_visegrad_brigade']) {
            expect(brigadeIds.has(id), `${id} must remain a distinct playable row until the mid/late-1994 merger`).toBe(true);
        }
    });

    it('resolves formation identity by immutable ID without name normalization or similarity', () => {
        const lookup = createOOBLookup([
            { id: 'brigade_exact', name: '1st Brigade', faction: 'RBiH', home_mun: 'sarajevo' },
            { id: 'brigade_exact_2', name: '1st Brigade', faction: 'RBiH', home_mun: 'sarajevo' },
        ], {}, {}, {});

        expect(lookup.brigadeByIdLookup('brigade_exact')?.id).toBe('brigade_exact');
        expect(lookup.brigadeByIdLookup('BRIGADE_EXACT')).toBeNull();
        expect(lookup.brigadeByIdLookup('1st Brigade')).toBeNull();
    });

    it('rejects duplicate immutable formation IDs before building lookups', () => {
        expect(() => createOOBLookup([
            { id: 'duplicate', name: 'First identity', faction: 'RS', home_mun: 'a' },
            { id: 'duplicate', name: 'Second identity', faction: 'RS', home_mun: 'b' },
        ], {}, {}, {})).toThrow('Duplicate OOB formation id: duplicate');
    });
});
