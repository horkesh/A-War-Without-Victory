import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('desktop and roadmap truth docs', () => {
  it('keeps desktop startup docs aligned with the baked apr_1992 artifact path', () => {
    const playbook = readRepoFile('docs', '20_engineering', 'GUI_PLAYBOOK_DESKTOP.md');
    const ipcContract = readRepoFile('docs', '20_engineering', 'DESKTOP_GUI_IPC_CONTRACT.md');

    expect(playbook).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(playbook).toContain('one-way derived copy of canonical builder truth');
    expect(playbook).not.toContain('apr1992_historical_52w.json');

    expect(ipcContract).toContain('loadStartupSnapshotState(...)');
    expect(ipcContract).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(ipcContract).toContain('data/scenarios/apr1992_definitive_52w.json');
  });

  it('defines one authoritative roadmap and one derived command board', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');
    const board = readRepoFile('docs', 'plans', 'COMMAND_BOARD.md');
    const plansIndex = readRepoFile('docs', 'plans', 'README.md');

    expect(roadmap).toContain('This file is the sole source of truth for unfinished product work.');
    expect(roadmap).toContain('nine executable workstreams, R1–R9');
    expect(board).toContain('Derived execution view');
    expect(board).toContain('MASTER_ROADMAP.md');
    expect(plansIndex).toContain('**Sole authority**');
    expect(plansIndex).toContain('Each roadmap point has exactly one detailed plan');

    expect(roadmap.length).toBeLessThan(60_000);
    expect(board.length).toBeLessThan(20_000);
  });

  it('binds every R1-R9 roadmap row to an existing executable plan', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');
    const expectedPlans = [
      '2026-07-31-seamless-command-room-map-transition-plan.md',
      '2026-07-31-rs-104week-friction-remediation-plan.md',
      '2026-07-31-operational-tactical-group-closeout-implementation-plan.md',
      '2026-07-31-command-event-codex-convergence-plan.md',
      '2026-07-31-engine-quality-performance-stability-plan.md',
      '2026-07-31-historical-gameplay-depth-calibration-plan.md',
      '2026-07-31-content-history-localization-audio-plan.md',
      '2026-07-31-full-campaign-electron-validation-plan.md',
      '2026-07-31-release-candidate-gold-publication-plan.md',
    ];

    expectedPlans.forEach((filename, index) => {
      expect(roadmap).toContain(`| R${index + 1} |`);
      expect(roadmap).toContain(`(${filename})`);
      expect(existsSync(join(process.cwd(), 'docs', 'plans', filename))).toBe(true);
    });
  });

  it('removes owner-verdict product gates while retaining verification and publication boundaries', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');
    const activePlanNames = [
      '2026-07-31-seamless-command-room-map-transition-plan.md',
      '2026-07-31-rs-104week-friction-remediation-plan.md',
      '2026-07-31-operational-tactical-group-closeout-implementation-plan.md',
      '2026-07-31-command-event-codex-convergence-plan.md',
      '2026-07-31-engine-quality-performance-stability-plan.md',
      '2026-07-31-historical-gameplay-depth-calibration-plan.md',
      '2026-07-31-content-history-localization-audio-plan.md',
      '2026-07-31-full-campaign-electron-validation-plan.md',
      '2026-07-31-release-candidate-gold-publication-plan.md',
    ];
    const activeTruth = [
      roadmap,
      ...activePlanNames.map((name) => readRepoFile('docs', 'plans', name)),
    ].join('\n');

    expect(roadmap).toContain('`Execute the master roadmap`');
    expect(roadmap).toContain('`Publish 1.0`');
    expect(roadmap).toContain('verification barriers and authority boundaries');
    expect(activeTruth).not.toMatch(/STOP FOR VERDICT|GOVERNANCE-GATED|BEHAVIOR-GATED|Historical stop gate/i);
  });

  it('locks the researched product, history, locale, audio, and release dispositions', () => {
    const roadmap = readRepoFile('docs', 'plans', 'MASTER_ROADMAP.md');

    expect(roadmap).toContain('The final player command model has five levers.');
    expect(roadmap).toContain('maximum 12 turns, cohesion drain 4 per engaged turn, dissolve at cohesion 15');
    expect(roadmap).toContain('ADR-0007 Phase C stays retired.');
    expect(roadmap).toContain('Neretva/Grabovica/Uzdol belongs to 1993');
    expect(roadmap).toContain('Canonical Bosnian locale is `bs`; formatting uses `bs-BA`.');
    expect(roadmap).toContain('first-party/generated UI sound, then CC0');
    expect(roadmap).toContain('Steam is the primary store.');
  });

  it('keeps canonical directive and closed v0.9.1 truth in their owning documents', () => {
    const fora = readRepoFile('docs', '10_canon', 'FORAWWV.md');
    const systems = readRepoFile('docs', '10_canon', 'Systems_Manual_v0_9_0.md');
    const knowledge = readRepoFile('docs', 'PROJECT_LEDGER_KNOWLEDGE.md');
    const v091Plan = readRepoFile('docs', 'plans', '2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md');
    const bible = readRepoFile('docs', '10_canon', 'Game_Bible_v0_9_0.md');

    expect(fora).toContain('PRESIDENT_TO_CANONICAL_DIRECTIVE');
    expect(fora).toContain('permission_flags');
    expect(systems).toContain('displacement_recent_by_turn');
    expect(knowledge).toContain('president_directive_bridge.ts');

    expect(v091Plan).toContain('**Status:** CLOSED-FOR-AGENT-SCOPE');
    expect(v091Plan).toContain('sixty `v091_` authored dynamic sections');
    expect(bible).toContain('v0.9.1 is agent-closed with sixty authored `v091_` consumers');
  });

  it('keeps force-quality reassessment truth in its audit and issue packet', () => {
    const audit = readRepoFile('docs', '40_reports', 'audits', '20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md');
    const issue = readRepoFile('docs', 'plans', '2026-05-01-force-quality-trajectory-calibration-issue.md');

    expect(audit).toContain('a4bf8b8095050881');
    expect(audit).toContain('RS and HRHB average brigade personnel still rise');
    expect(issue).toContain('**Status:** Audit packet complete; successor calibration/design lanes open');
    expect(issue).toContain('tools/diagnostics/force_quality_checkpoint_windows.cjs');
  });
});
