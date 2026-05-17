import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

const fixtureDir = resolve(process.cwd(), 'tests', 'fixtures', 'save_migration');

describe('save migration round-trip fixture contract', () => {
    const fixtureFiles = readdirSync(fixtureDir)
        .filter((name) => /^v\d{2}_.+\.json$/.test(name))
        .sort();

    it('has one fixture for every schema version before the current startup artifact', () => {
        expect(fixtureFiles.map((name) => name.slice(0, 3))).toEqual(
            Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_, index) => `v${String(index + 1).padStart(2, '0')}`),
        );
    });

    it.each(fixtureFiles)('%s migrates and save/loads byte-stably', (fileName) => {
        const payload = readFileSync(resolve(fixtureDir, fileName), 'utf8');

        const migrated = deserializeState(payload);
        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);

        const serialized = serializeState(migrated);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('current startup artifact is already canonical after migration', () => {
        const payload = readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        );

        const migrated = deserializeState(payload);
        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);

        const serialized = serializeState(migrated);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });
});
