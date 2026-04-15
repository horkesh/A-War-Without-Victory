import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_bots.json');
const BASE_OUT = join(process.cwd(), '.tmp_scenario_control_change_attribution_contract');

function isMissingMappingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Municipality controller mapping file not found')
    || msg.includes('not in municipality_political_controllers')
  );
}

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('scenario control change attribution contract', () => {
  it('emits control-change attribution and no longer writes control_events.jsonl', async () => {
    await ensureRemoved(BASE_OUT);

    let runId: string;
    try {
      const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT, consoleDiagnostics: false });
      runId = result.run_id;
      expect('control_events' in result.paths).toBe(false);
    } catch (err) {
      if (isMissingMappingError(err)) {
        return;
      }
      throw err;
    }

    try {
      const outDir = join(BASE_OUT, runId!);
      expect(existsSync(join(outDir, 'control_events.jsonl'))).toBe(false);

      const summaryRaw = await readFile(join(outDir, 'run_summary.json'), 'utf8');
      const summary = JSON.parse(summaryRaw) as {
        behavioral_health?: {
          valid_for_combat_calibration: boolean;
          battleless_weeks?: number[];
          combat_causality?: {
            valid_for_combat_calibration: boolean;
            total_battles: number;
          };
        };
        historical_fit?: {
          bot_benchmark_status?: {
            contract_valid: boolean;
          };
          override_inventory?: Array<{
            mechanism: string;
            classification: string;
            active_entries: number;
          }>;
        };
        recovery_status?: {
          state_protected: boolean;
          reporting_split_complete: boolean;
          calibration_resumed_under_gate: boolean;
          calibration_resumed_run_id: string | null;
          calibration_resumed_run_date: string | null;
        };
        control_change_attribution?: {
          total_changes: number;
          combat: number;
          consolidation: number;
          abandoned: number;
          init_overrides: number;
          other: number;
        };
      };

      expect(summary.control_change_attribution).toBeTruthy();
      expect(summary.behavioral_health).toBeTruthy();
      expect(summary.behavioral_health?.valid_for_combat_calibration).toBe(
        summary.behavioral_health?.combat_causality?.valid_for_combat_calibration,
      );
      expect(Array.isArray(summary.behavioral_health?.battleless_weeks)).toBe(true);
      expect(summary.historical_fit).toBeTruthy();
      expect(summary.historical_fit?.bot_benchmark_status?.contract_valid).toBe(true);
      expect(Array.isArray(summary.historical_fit?.override_inventory)).toBe(true);
      expect(summary.historical_fit?.override_inventory).toHaveLength(3);
      expect(summary.recovery_status?.state_protected).toBe(true);
      expect(summary.recovery_status?.reporting_split_complete).toBe(true);
      expect(summary.recovery_status?.calibration_resumed_under_gate).toBe(
        summary.behavioral_health?.valid_for_combat_calibration,
      );

      if (summary.recovery_status?.calibration_resumed_under_gate) {
        expect(summary.recovery_status.calibration_resumed_run_id).toBeTruthy();
        expect(summary.recovery_status.calibration_resumed_run_date).toBeTruthy();
      } else {
        expect(summary.recovery_status?.calibration_resumed_run_id).toBeNull();
        expect(summary.recovery_status?.calibration_resumed_run_date).toBeNull();
      }

      expect(summary.control_change_attribution?.total_changes).toBe(
        (summary.control_change_attribution?.combat ?? 0)
        + (summary.control_change_attribution?.consolidation ?? 0)
        + (summary.control_change_attribution?.abandoned ?? 0)
        + (summary.control_change_attribution?.init_overrides ?? 0)
        + (summary.control_change_attribution?.other ?? 0),
      );

      const weeklyRaw = await readFile(join(outDir, 'weekly_report.jsonl'), 'utf8');
      const rows = weeklyRaw.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as {
        behavioral_health?: {
          valid_for_combat_calibration: boolean;
          control_change_attribution?: { total_changes: number };
        };
        control_change_attribution?: { total_changes: number };
      });

      expect(rows.some((row) => row.control_change_attribution !== undefined)).toBe(true);
      expect(rows.some((row) => row.behavioral_health !== undefined)).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.behavioral_health?.control_change_attribution?.total_changes
            === row.control_change_attribution?.total_changes,
        ),
      ).toBe(true);
    } finally {
      await ensureRemoved(BASE_OUT);
    }
  }, 20_000);
});
