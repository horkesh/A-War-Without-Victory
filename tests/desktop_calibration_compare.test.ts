import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { advanceTurn, serializeState, startNewCampaign } from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';

const cli = resolve(process.cwd(), 'tools', 'ai_play', 'desktop_calibration_compare.ts');
const tsx = resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runZeroTurnComparison(eventPolicy = 'defer', paramilitaryPolicy = 'defer') {
  return spawnSync(process.execPath, [
    tsx,
    cli,
    '--turns', '0',
    '--faction', 'RS',
    '--event-policy', eventPolicy,
    '--paramilitary-policy', paramilitaryPolicy,
    '--historical-operation-policy', 'accept',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function runComparison(args: string[]) {
  return spawnSync(process.execPath, [tsx, cli, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function controlCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const faction of Object.values(state.political.political_controllers ?? {})) {
    if (faction == null) continue;
    counts[faction] = (counts[faction] ?? 0) + 1;
  }
  return counts;
}

let fixtureDir = '';
let electronLogPath = '';
let electronAutosavePath = '';
let wrongFactionLogPath = '';
let wrongTurnAutosavePath = '';
let wrongScenarioAutosavePath = '';

beforeAll(async () => {
  fixtureDir = mkdtempSync(join(tmpdir(), 'awwv-desktop-calibration-'));
  electronLogPath = join(fixtureDir, 'electron-log.json');
  electronAutosavePath = join(fixtureDir, 'electron-autosave.json');
  wrongFactionLogPath = join(fixtureDir, 'wrong-faction-log.json');
  wrongTurnAutosavePath = join(fixtureDir, 'wrong-turn-autosave.json');
  wrongScenarioAutosavePath = join(fixtureDir, 'wrong-scenario-autosave.json');

  const initialState = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992')).state;
  initialState.meta.autonomy_level = 1;
  const initialCounts = controlCounts(initialState);
  const advanced = await advanceTurn(initialState, process.cwd());
  if (advanced.error) throw new Error(advanced.error);
  const electronState = advanced.state;
  const electronControllers = electronState.political.political_controllers;
  if (!electronControllers) throw new Error('Electron control fixture is unavailable');
  const changedOsid = Object.entries(electronControllers)
    .find(([, faction]) => faction === 'RBiH')?.[0];
  if (!changedOsid) throw new Error('RBiH control fixture is empty');
  electronControllers[changedOsid] = 'RS';
  const electronCounts = controlCounts(electronState);

  const electronLog = {
    startedAt: '2026-07-12T00:00:00.000Z',
    completedAt: '2026-07-12T00:01:00.000Z',
    command: ['--faction=RBiH', '--turns=1', '--strategic', '--auto-recruit'],
    factions: [{
      faction: 'RBiH',
      strategicCommandAuthority: {
        ok: true,
        results: [{
          lever: 'front-visit',
          issued: true,
          spent: 10,
          stagedEventId: 'visit_to_front_rbih',
          responded: true,
        }],
      },
      events: [{
        label: 'campaign-start',
        state: {
          turn: 0,
          playerFaction: 'RBiH',
          controlCounts: initialCounts,
          controlSourceCount: Object.values(initialCounts).reduce((sum, count) => sum + count, 0),
        },
      }],
      playtest: {
        maxObservedTurn: 1,
        recruitmentSucceeded: true,
        turnEvents: [{
          guard: 1,
          step: 'strategic-recruitment',
          before: { turn: 0, controlCounts: initialCounts },
          recruitment: {
            handled: true,
            beforeOwned: 84,
            afterOwned: 85,
            recruitAction: { clicked: true },
          },
        }, {
          guard: 2,
          step: 'handled',
          action: 'strategic-proposal:APPROVE_OP:arbih_1st_corps:test-plan',
          before: { turn: 1, controlCounts: electronCounts },
          after: { turn: 1, controlCounts: electronCounts },
        }, {
          guard: 3,
          step: 'handled',
          action: 'strategic-proposal:HISTORICAL_OP:green-lit-by-controlled-policy',
          before: { turn: 1, controlCounts: electronCounts },
          after: { turn: 1, controlCounts: electronCounts },
        }],
        finalState: {
          turn: 1,
          playerFaction: 'RBiH',
          controlCounts: electronCounts,
        },
      },
    }],
  };

  writeFileSync(electronAutosavePath, serializeState(electronState));
  writeFileSync(electronLogPath, JSON.stringify(electronLog));
  writeFileSync(wrongFactionLogPath, JSON.stringify({
    ...electronLog,
    command: ['--faction=RS', '--turns=1'],
    factions: [{ ...electronLog.factions[0], faction: 'RS' }],
  }));

  const wrongTurnState = JSON.parse(serializeState(electronState)) as GameState;
  wrongTurnState.meta.turn = 2;
  writeFileSync(wrongTurnAutosavePath, serializeState(wrongTurnState));

  const wrongScenarioState = JSON.parse(serializeState(electronState)) as GameState;
  const timeline = wrongScenarioState.military.war_timeline as { phases?: unknown[] } | undefined;
  if (timeline?.phases) timeline.phases = [...timeline.phases, { id: 'wrong-scenario' }];
  else wrongScenarioState.military.war_timeline = { phases: [{ id: 'wrong-scenario' }] } as never;
  writeFileSync(wrongScenarioAutosavePath, serializeState(wrongScenarioState));
}, 30_000);

afterAll(() => {
  if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

describe('desktop calibration comparison provenance', () => {
  it('binds both branches to one current startup snapshot and labels player-choice divergence', () => {
    const result = runZeroTurnComparison();

    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.schema_version).toBe(1);
    expect(output.comparison_kind).toBe('player_choice_vs_headless');
    expect(output.scenario).toMatchObject({
      key: 'apr_1992',
      scenario_id: 'apr1992_definitive_52w',
      source_path: 'data/scenarios/apr1992_definitive_52w.json',
      startup_snapshot_path: 'data/derived/startup/apr_1992_initial_save.json',
    });
    expect(output.scenario.startup_snapshot_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(output.player_policy).toEqual({
      autonomy_level: 1,
      event_decisions: 'defer',
      non_player_event_mode: 'emergent',
      player_event_resolution_timing: 'between_turns',
      historical_operations: 'accept',
      paramilitary_requests: 'defer',
      paramilitary_resolution_timing: 'deferred',
      paramilitary_target_scope: 'player_unrestricted_municipality_scope_undefended_only',
    });
    expect(output.decision_transcript).toEqual([]);
  });

  it('puts non-player factions in historical mode for a historical-default comparison', () => {
    const result = runZeroTurnComparison('historical_default');

    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.player_policy).toMatchObject({
      event_decisions: 'historical_default',
      non_player_event_mode: 'historical',
    });
  });

  it('distinguishes standing same-turn authorization from between-turn request approval', () => {
    const result = runZeroTurnComparison('historical_default', 'standing_allow');

    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.player_policy).toMatchObject({
      paramilitary_requests: 'standing_allow',
      paramilitary_resolution_timing: 'same_turn',
      paramilitary_target_scope: 'player_unrestricted_municipality_scope_undefended_only',
    });
  });

  it('emits byte-identical JSON for identical zero-turn inputs', () => {
    const first = runZeroTurnComparison();
    const second = runZeroTurnComparison();

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toBe(first.stdout);
  });

  it('requires the Electron log and autosave inputs as a pair', () => {
    const result = runComparison([
      '--turns', '1',
      '--faction', 'RBiH',
      '--electron-log', electronLogPath,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--electron-log and --electron-autosave must be provided together');
  });

  it('binds a validated Electron replay and attributes actions outside the controlled policy', () => {
    const result = runComparison([
      '--turns', '1',
      '--faction', 'RBiH',
      '--event-policy', 'defer',
      '--paramilitary-policy', 'defer',
      '--historical-operation-policy', 'accept',
      '--electron-log', electronLogPath,
      '--electron-autosave', electronAutosavePath,
    ]);

    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.schema_version).toBe(2);
    expect(output.comparison_kind).toBe('electron_replay_vs_controlled_player_and_headless');
    expect(output.branch_roles).toEqual({
      headless: 'headless_auto_control',
      player: 'controlled_player_policy',
      electron: 'observed_electron_replay',
    });
    expect(output.electron_replay.provenance).toMatchObject({
      faction: 'RBiH',
      turn: 1,
      scenario_id: 'apr1992_definitive_52w',
      validation: {
        faction: 'matched',
        turn: 'matched',
        scenario_start_date: 'matched',
        war_timeline: 'matched',
        initial_control_counts: 'matched',
      },
    });
    expect(output.electron_replay.provenance.log_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(output.electron_replay.provenance.autosave_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(output.electron_replay.action_attribution.interpretation).toBe(
      'expected_input_divergence_not_nondeterminism',
    );
    expect(output.electron_replay.action_attribution.categories).toMatchObject({
      recruitment: { count: 1 },
      command_authority: { count: 1 },
      proposal: { count: 1 },
    });
    expect(output.electron_replay.action_attribution.categories.proposal.actions).toEqual([
      expect.objectContaining({ id: 'APPROVE_OP:arbih_1st_corps:test-plan' }),
    ]);
    expect(output.electron_replay.action_attribution.total_count).toBe(3);
    expect(output.branches.electron.final.state_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(output.turns).toHaveLength(1);
    expect(output.turns[0]).toMatchObject({
      turn: 1,
      electron: { control_counts: output.branches.electron.final.control_counts },
      control_delta_electron_minus_player: {
        HRHB: expect.any(Number),
        RBiH: expect.any(Number),
        RS: expect.any(Number),
      },
      control_delta_electron_minus_headless: {
        HRHB: expect.any(Number),
        RBiH: expect.any(Number),
        RS: expect.any(Number),
      },
    });
    expect(output.final_control_deltas).toEqual({
      electron_minus_controlled_player: output.turns[0].control_delta_electron_minus_player,
      electron_minus_headless: output.turns[0].control_delta_electron_minus_headless,
      controlled_player_minus_headless: output.turns[0].control_delta_player_minus_headless,
    });
  }, 30_000);

  it.each([
    ['faction', () => wrongFactionLogPath, () => electronAutosavePath, 'Electron faction provenance mismatch'],
    ['turn', () => electronLogPath, () => wrongTurnAutosavePath, 'Electron turn provenance mismatch'],
    ['scenario', () => electronLogPath, () => wrongScenarioAutosavePath, 'Electron scenario provenance mismatch'],
  ])('rejects %s provenance mismatches', (_label, logPath, autosavePath, message) => {
    const result = runComparison([
      '--turns', '1',
      '--faction', 'RBiH',
      '--electron-log', logPath(),
      '--electron-autosave', autosavePath(),
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(message);
  });
});
