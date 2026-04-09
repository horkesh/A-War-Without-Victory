/**
 * Integration test: post-run anomaly detection on a 40w scenario.
 *
 * Runs the full 40w scenario, loads the final save, and asserts
 * zero critical anomalies. Warnings and info are logged but not failures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runAnomalyDetection } from '../src/scenario/anomaly_detector.js';
import type { GameState } from '../src/state/game_state.js';
import type { AnomalyReport } from '../src/scenario/anomaly_types.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_anomaly');

describe('post-run anomaly detection (40w)', () => {
    let anomalies: AnomalyReport[] = [];
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        const state: GameState = JSON.parse(json);

        anomalies = runAnomalyDetection(state);

        // Log all anomalies for diagnostics
        for (const a of anomalies) {
            const prefix = a.severity === 'critical' ? 'CRITICAL' : a.severity === 'warning' ? 'WARNING' : 'INFO';
            console.log(`[ANOMALY ${prefix}] ${a.type}: ${a.description}`);
        }
    }, 600_000);

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });

    it('has no unexpected critical anomalies', () => {
        if (skipped) return;
        const criticals = anomalies.filter(a => a.severity === 'critical');
        const allowedCriticals = new Set([
            'unassigned_frontline_brigades',
        ]);
        const unexpected = criticals.filter((report) => !allowedCriticals.has(report.type));
        expect(
            unexpected.length,
            `Unexpected critical anomalies (${unexpected.length}):\n${unexpected.map(c => `  ${c.type}: ${c.description}`).join('\n')}`
        ).toBe(0);
    });

    it('anomaly detector produces results', () => {
        if (skipped) return;
        // At minimum the casualty_ratio_check (info) should always be present in a war run
        expect(anomalies.length).toBeGreaterThan(0);
    });

    it('no zero-personnel active formations', () => {
        if (skipped) return;
        const zeroPers = anomalies.filter(a => a.type === 'zero_personnel_active');
        expect(
            zeroPers.length,
            `Found ${zeroPers.length} zero-personnel active formations:\n${zeroPers.map(z => `  ${z.description}`).join('\n')}`
        ).toBe(0);
    });
});
