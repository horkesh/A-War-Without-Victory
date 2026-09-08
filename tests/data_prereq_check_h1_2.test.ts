/**
 * Phase H1.2: Data prerequisites checker tests.
 * (A) When required files exist: checkDataPrereqs().ok === true
 * (B) When a required file is absent: ok === false and includes expected prereq_id
 * Uses baseDir override to avoid depending on real repo files.
 */

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkDataPrereqs, formatMissingRemediation } from '../src/data_prereq/check_data_prereqs.js';

const TMP_BASE = join(process.cwd(), '.tmp_data_prereq_h1_2');
const RUNTIME_INPUT_PATHS = [
    'data/derived/municipality_population_1991.json',
    'data/derived/census_rolled_up_wgs84.json',
    'data/derived/settlement_ethnicity_data.json',
    'data/source/oob_brigades.json',
    'data/source/municipalities_1990_registry_110.json',
    'data/derived/municipality_hq_settlement.json',
] as const;

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

async function writeRuntimeInputPlaceholders(baseDir: string): Promise<void> {
    await Promise.all(RUNTIME_INPUT_PATHS.map((relativePath) => writeFile(join(baseDir, relativePath), '{}', 'utf8')));
}

describe('data prerequisite checks', () => {
    it('returns ok when all required files exist', async () => {
        const baseDir = join(TMP_BASE, 'all_present');
        await ensureRemoved(baseDir);

        await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
        await mkdir(join(baseDir, 'data', 'derived'), { recursive: true });
        await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');
        await writeFile(join(baseDir, 'data/derived/settlements_index.json'), '{}', 'utf8');
        await writeFile(join(baseDir, 'data/derived/settlement_edges.json'), '{}', 'utf8');
        await writeRuntimeInputPlaceholders(baseDir);

        const result = checkDataPrereqs({ baseDir });
        expect(result.ok).toBe(true);
        expect(result.missing).toHaveLength(0);

        await ensureRemoved(baseDir);
    });

    it('returns production_turn_inputs when shared production resources are absent', async () => {
        const baseDir = join(TMP_BASE, 'missing_turn_inputs');
        await ensureRemoved(baseDir);

        await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
        await mkdir(join(baseDir, 'data', 'derived'), { recursive: true });
        await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');
        await writeFile(join(baseDir, 'data/derived/settlements_index.json'), '{}', 'utf8');
        await writeFile(join(baseDir, 'data/derived/settlement_edges.json'), '{}', 'utf8');

        const result = checkDataPrereqs({ baseDir });
        const turnInputs = result.missing.find((m) => m.prereq_id === 'production_turn_inputs');
        expect(turnInputs).toBeDefined();
        expect(turnInputs?.missing_paths).toEqual([...RUNTIME_INPUT_PATHS].sort((a, b) => a.localeCompare(b)));

        await ensureRemoved(baseDir);
    });

    it('returns municipality_controller_mapping when controller mapping is absent', async () => {
        const baseDir = join(TMP_BASE, 'missing_controller');
        await ensureRemoved(baseDir);

        await mkdir(join(baseDir, 'data', 'derived'), { recursive: true });
        await writeFile(join(baseDir, 'data/derived/settlements_index.json'), '{}', 'utf8');
        await writeFile(join(baseDir, 'data/derived/settlement_edges.json'), '{}', 'utf8');

        const result = checkDataPrereqs({ baseDir });
        expect(result.ok).toBe(false);
        const controllerMissing = result.missing.find((m) => m.prereq_id === 'municipality_controller_mapping');
        expect(controllerMissing, 'missing should include municipality_controller_mapping').toBeDefined();
        expect(controllerMissing?.missing_paths).toContain('data/source/municipality_political_controllers.json');

        await ensureRemoved(baseDir);
    });

    it('returns settlement_graph when graph files are absent', async () => {
        const baseDir = join(TMP_BASE, 'missing_graph');
        await ensureRemoved(baseDir);

        await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
        await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');

        const result = checkDataPrereqs({ baseDir });
        expect(result.ok).toBe(false);
        const graphMissing = result.missing.find((m) => m.prereq_id === 'settlement_graph');
        expect(graphMissing, 'missing should include settlement_graph').toBeDefined();
        expect(graphMissing?.missing_paths).toContain('data/derived/settlements_index.json');
        expect(graphMissing?.missing_paths).toContain('data/derived/settlement_edges.json');
        expect(graphMissing?.missing_paths).toHaveLength(2);

        await ensureRemoved(baseDir);
    });

    it('formats missing remediation with fix guidance and commands', async () => {
        const baseDir = join(TMP_BASE, 'format_test');
        await ensureRemoved(baseDir);
        await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
        await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');

        const result = checkDataPrereqs({ baseDir });
        expect(result.ok).toBe(false);
        const formatted = formatMissingRemediation(result);
        expect(formatted).toContain('MISSING DATA PREREQUISITES:');
        expect(formatted).toContain('To fix:');
        expect(formatted).toContain('npm run map:build');

        await ensureRemoved(baseDir);
    });
});
