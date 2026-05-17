import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeScenario } from '../src/scenario/scenario_loader.js';
import { getAvailableScenarios } from '../src/scenario/scenario_registry.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const ACTIVE_SCENARIO_FILES = getAvailableScenarios()
    .map((entry) => entry.scenarioFile)
    .filter((file) => file.length > 0)
    .sort();

describe('scenario guardrails', () => {
    it('rejects non-empty avoided_osids_by_faction instead of silently consuming bot compensation', () => {
        expect(() =>
            normalizeScenario({
                scenario_id: 'banned_avoided_osids',
                weeks: 1,
                turns: [],
                avoided_osids_by_faction: {
                    RBiH: ['op:zavidovici:vozuca_2'],
                },
            }),
        ).toThrow(/avoided_osids_by_faction is deprecated and must be absent or empty/);
    });

    it('keeps active registered scenarios free of avoided OSID and engine ceiling workaround data', () => {
        const violations: string[] = [];

        for (const scenarioFile of ACTIVE_SCENARIO_FILES) {
            const scenarioPath = join(process.cwd(), 'data', 'scenarios', scenarioFile);
            const raw = JSON.parse(readFileSync(scenarioPath, 'utf8')) as {
                avoided_osids_by_faction?: Record<string, string[]>;
                engine_ceiling_workarounds?: unknown;
            };
            const avoidedCount = Object.values(raw.avoided_osids_by_faction ?? {})
                .reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);

            if (avoidedCount > 0) {
                violations.push(`${scenarioFile}: avoided_osids_by_faction has ${avoidedCount} entries`);
            }
            if (raw.engine_ceiling_workarounds !== undefined) {
                violations.push(`${scenarioFile}: engine_ceiling_workarounds is present`);
            }
        }

        expect(violations).toEqual([]);
    });

    it('omits the unused engine ceiling workaround from scenario override inventory', async () => {
        const outDirBase = join(process.cwd(), '.tmp_scenario_guardrails');
        if (existsSync(outDirBase)) {
            rmSync(outDirBase, { recursive: true, force: true });
        }
        const result = await runScenario({
            scenarioPath: join(process.cwd(), 'data', 'scenarios', 'noop_4w_bots.json'),
            outDirBase,
            consoleDiagnostics: false,
        });
        try {
            const summaryPath = join(result.outDir, 'run_summary.json');
            const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as {
                historical_fit?: {
                    override_inventory?: Array<{ mechanism: string }>;
                };
            };

            expect(summary.historical_fit?.override_inventory?.map((entry) => entry.mechanism)).toEqual([
                'osid_control_overrides',
                'avoided_osids_by_faction',
            ]);
        } finally {
            rmSync(outDirBase, { recursive: true, force: true });
        }
    }, 20_000);
});
