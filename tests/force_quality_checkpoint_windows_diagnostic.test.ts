import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..');
const TOOL = resolve(REPO_ROOT, 'tools/diagnostics/force_quality_checkpoint_windows.cjs');

function makeFixtureRun(): string {
  const dir = mkdtempSync(join(tmpdir(), 'awwv-force-quality-window-'));
  writeFileSync(join(dir, 'run_summary.json'), JSON.stringify({
    weeks: 188,
    final_state_hash: 'fixture-hash',
  }));
  const rows = [
    { kind: 'brigade', status: 'active', turn: 40, faction: 'RBiH', brigade_id: 'b1', morale: 40, cohesion: 50, officer_quality: 0.2, fatigue: 0.1, personnel: 800 },
    { kind: 'brigade', status: 'active', turn: 40, faction: 'RBiH', brigade_id: 'b2', morale: 60, cohesion: 70, officer_quality: 0.4, fatigue: 0.3, personnel: 1000 },
    { kind: 'brigade', status: 'active', turn: 40, faction: 'RS', brigade_id: 'b3', morale: 80, cohesion: 90, officer_quality: 0.8, fatigue: 0.5, personnel: 1200 },
    { kind: 'brigade', status: 'active', turn: 104, faction: 'RBiH', brigade_id: 'b1', morale: 70, cohesion: 75, officer_quality: 0.6, fatigue: 0.2, personnel: 900 },
    { kind: 'brigade', status: 'active', turn: 156, faction: 'HRHB', brigade_id: 'b4', morale: 55, cohesion: 45, officer_quality: 0.3, fatigue: 0.1, personnel: 700 },
    { kind: 'brigade', status: 'active', turn: 188, faction: 'RS', brigade_id: 'b3', morale: 30, cohesion: 35, officer_quality: 0.5, fatigue: 0.0, personnel: 1300 },
  ];
  writeFileSync(join(dir, 'brigade_temporal_log.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const weekly = [
    {
      week_index: 39,
      operation_diagnostics: [
        { operation_id: 'op-a', faction_id: 'RBiH', operation_phase: 'planning', participating_brigades: ['b1', 'b2'], eligible_attacker_count: 3, movement_order_count: 1, attack_attempt_count: 0, battle_count: 0, objective_attempt_count: 0, objective_capture_count: 0 },
        { operation_id: 'op-b', faction_id: 'RS', operation_phase: 'execution', participating_brigades: ['b3'], eligible_attacker_count: 1, movement_order_count: 0, attack_attempt_count: 2, battle_count: 1, objective_attempt_count: 2, objective_capture_count: 1 },
      ],
    },
    {
      week_index: 156,
      operation_diagnostics: [
        { operation_id: 'op-c', faction_id: 'RBiH', operation_phase: 'recovery', participating_brigades: ['b1', 'b2', 'b5'], eligible_attacker_count: 4, movement_order_count: 2, attack_attempt_count: 3, battle_count: 2, objective_attempt_count: 3, objective_capture_count: 0 },
      ],
    },
    {
      week_index: 184,
      operation_diagnostics: [
        { operation_id: 'op-d', faction_id: 'HRHB', operation_phase: 'execution', participating_brigades: ['b4'], eligible_attacker_count: 1, movement_order_count: 0, attack_attempt_count: 1, battle_count: 1, objective_attempt_count: 1, objective_capture_count: 0 },
      ],
    },
  ];
  writeFileSync(join(dir, 'weekly_report.jsonl'), weekly.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(join(dir, 'operation_aars.json'), JSON.stringify([
    {
      operation_id: 'op-a',
      faction: 'RBiH',
      started_turn: 39,
      outcome: 'success',
      participating_brigades: ['b1', 'b2'],
      total_attacks: 0,
      objectives_captured: ['x'],
      objectives_logged_captured: ['x'],
      axis_summaries: [{ axis_id: 'a', brigades: ['b1', 'b2'] }],
      force_quality_traits_at_launch: { traits: { operation_readiness: 0.5, staging_reliability: 0.4 } },
    },
    {
      operation_id: 'op-c',
      faction: 'RBiH',
      started_turn: 156,
      outcome: 'staging_failure',
      participating_brigades: ['b1', 'b2', 'b5', 'b6', 'b7'],
      total_attacks: 3,
      objectives_captured: [],
      objectives_logged_captured: [],
      axis_summaries: [
        { axis_id: 'a', brigades: ['b1', 'b2'] },
        { axis_id: 'b', brigades: ['b5'] },
      ],
      force_quality_traits_at_launch: { traits: { operation_readiness: 0.7, staging_reliability: 0.2 } },
    },
    {
      operation_id: 'op-d',
      faction: 'HRHB',
      started_turn: 184,
      outcome: 'failed',
      participating_brigades: ['b4'],
      total_attacks: 1,
      objectives_captured: [],
      objectives_logged_captured: [],
      axis_summaries: [{ axis_id: 'a', brigades: ['b4'] }],
      force_quality_traits_at_launch: { traits: { operation_readiness: 0.3 } },
    },
  ]));
  return dir;
}

describe('force_quality_checkpoint_windows diagnostic', () => {
  it('emits deterministic checkpoint and window metrics from run artifacts', () => {
    const runDir = makeFixtureRun();
    try {
      const a = execFileSync('node', [TOOL, runDir, '--json'], { encoding: 'utf8' });
      const b = execFileSync('node', [TOOL, runDir, '--json'], { encoding: 'utf8' });
      expect(a).toEqual(b);

      const report = JSON.parse(a);
      expect(report.run.final_state_hash).toBe('fixture-hash');
      expect(report.checkpoints['40'].RBiH.active_brigades).toBe(2);
      expect(report.checkpoints['40'].RBiH.morale.mean).toBe(50);
      expect(report.checkpoints['40'].RBiH.morale.p25).toBe(45);
      expect(report.checkpoints['40'].RBiH.morale.p75).toBe(55);
      expect(report.checkpoints['188'].RS.officer_quality.mean).toBe(0.5);

      expect(report.weekly_windows['0-40'].RBiH.unique_ops).toBe(1);
      expect(report.weekly_windows['0-40'].RBiH.planning_rows).toBe(1);
      expect(report.weekly_windows['156-188'].RBiH.attack_attempt_count).toBe(3);
      expect(report.weekly_windows['156-188'].RBiH.avg_participating_brigades).toBe(3);
      expect(report.weekly_windows['183-188'].HRHB.unique_ops).toBe(1);
      expect(report.weekly_windows['183-188'].HRHB.attack_attempt_count).toBe(1);

      expect(report.completed_operations['0-40'].RBiH.ops).toBe(1);
      expect(report.completed_operations['0-40'].RBiH.movement_only_ops).toBe(1);
      expect(report.completed_operations['156-188'].RBiH.staging_failures).toBe(1);
      expect(report.completed_operations['156-188'].RBiH.multi_brigade_5plus).toBe(1);
      expect(report.completed_operations['156-188'].RBiH.traits.operation_readiness.mean).toBe(0.7);
      expect(report.completed_operations['183-188'].HRHB.ops).toBe(1);
      expect(report.completed_operations['183-188'].HRHB.traits.operation_readiness.mean).toBe(0.3);

      const before = readFileSync(join(runDir, 'brigade_temporal_log.jsonl'), 'utf8');
      execFileSync('node', [TOOL, runDir, '--json'], { encoding: 'utf8' });
      const after = readFileSync(join(runDir, 'brigade_temporal_log.jsonl'), 'utf8');
      expect(after).toEqual(before);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  });
});
