import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface OfficerRecord {
    id: string;
    home_corps_id?: string | null;
    compatible_corps_ids?: string[];
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
});
