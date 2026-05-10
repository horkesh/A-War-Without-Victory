import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('replay surface truth', () => {
  it('does not expose a standalone replay loader IPC on the live desktop bridge', () => {
    const preload = readRepoFile('src', 'desktop', 'preload.cjs');
    const electronMain = readRepoFile('src', 'desktop', 'electron-main.cjs');
    const useIpc = readRepoFile('src', 'ui', 'map', 'desktop', 'useIPC.ts');

    expect(preload).not.toContain('load-replay-dialog');
    expect(preload).not.toContain('get-last-replay');
    expect(electronMain).not.toContain("ipcMain.handle('load-replay-dialog'");
    expect(electronMain).not.toContain("ipcMain.handle('get-last-replay'");
    expect(useIpc).not.toContain('loadReplayDialog');
    expect(useIpc).not.toContain('getLastReplay');
    expect(preload).toContain('subscribeReplayManifestUpdated');
    expect(electronMain).toContain('replay_save_manifest.json');
    expect(electronMain.indexOf('sendReplayManifestToRenderer(manifestJson')).toBeLessThan(
      electronMain.indexOf('sendGameStateToRenderer(currentGameStateJson'),
    );

    expect(preload).toContain('queryBattleEvents');
    expect(electronMain).toContain("ipcMain.handle('query-battle-events'");
    expect(useIpc).toContain('queryBattleEvents');
  });

  it('keeps replay artifacts harness-side rather than pretending they are absent', () => {
    const scenarioRunner = readRepoFile('src', 'scenario', 'scenario_runner.ts');
    const decisionLog = readRepoFile('src', 'sim', 'ai_commander', 'decision_log.ts');

    expect(scenarioRunner).toContain('replay.jsonl');
    expect(scenarioRunner).toContain('replay_timeline.json');
    expect(decisionLog).toContain('Decision log for AI commander replay determinism');
  });

  it('keeps the desktop IPC contract honest about replay attachment', () => {
    const ipcContract = readRepoFile('docs', '20_engineering', 'DESKTOP_GUI_IPC_CONTRACT.md');

    expect(ipcContract).toContain('query-battle-events');
    expect(ipcContract).toContain('replay_save_manifest.json');
    expect(ipcContract).toContain('not a standalone replay-loader contract');
    expect(ipcContract).not.toContain('load-replay-dialog');
    expect(ipcContract).not.toContain('get-last-replay');
  });

  it('keeps the engineering docs aligned on replay consumer truth', () => {
    const playbook = readRepoFile('docs', '20_engineering', 'GUI_PLAYBOOK_DESKTOP.md');
    const pipelineEntrypoints = readRepoFile('docs', '20_engineering', 'PIPELINE_ENTRYPOINTS.md');
    const repoMap = readRepoFile('docs', '20_engineering', 'REPO_MAP.md');
    const tacticalMap = readRepoFile('docs', '20_engineering', 'TACTICAL_MAP_SYSTEM.md');

    expect(playbook).toContain('loads replay summaries from `replay_save_manifest.json`');

    expect(pipelineEntrypoints).toContain('live replay consumer/playback owner');
    expect(pipelineEntrypoints).toContain('replay_save_manifest.json');
    expect(pipelineEntrypoints).toContain('gameStore.startReplayInspection');
    expect(pipelineEntrypoints).toContain('sparse manifests stay summary-only');
    expect(pipelineEntrypoints).not.toContain('Replay code does **not** exist in the repo today.');

    expect(repoMap).toContain('Replay consumer/playback owner exists');
    expect(repoMap).toContain('replay_save_manifest.json');
    expect(repoMap).toContain('ReplayInspectionBanner.tsx');
    expect(repoMap).not.toContain('No replay code exists in the repo today.');

    expect(tacticalMap).toContain('ReplayScrubber consumes the manifest-backed summary path');
    expect(tacticalMap).toContain('gameStore.startReplayInspection');
    expect(tacticalMap).toContain('manifests provide deterministic summaries but not map-state inspection');
    expect(tacticalMap).not.toContain('advance turn, replay) supply the same raw `GameState`');
  });
});
