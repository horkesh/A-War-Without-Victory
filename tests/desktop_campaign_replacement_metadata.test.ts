import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coalesceGameStateUpdateMetadata } from '../src/ui/shared/gameStateUpdateMetadata';

function read(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

function handler(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`ipcMain.handle('${name}'`);
  const end = source.indexOf(`ipcMain.handle('${nextName}'`, start);
  return source.slice(start, end);
}

describe('packaged campaign replacement metadata', () => {
  it('tags every packaged campaign replacement broadcast but leaves turn mutation broadcasts untagged', () => {
    const main = read('src', 'desktop', 'electron-main.cjs');
    expect(main).toContain("win.webContents.send('game-state-updated', playerVisibleStateJson, metadata)");
    expect(handler(main, 'load-scenario-dialog', 'start-new-campaign')).toContain('CAMPAIGN_REPLACEMENT_UPDATE');
    expect(handler(main, 'start-new-campaign', 'load-state-dialog')).toContain('CAMPAIGN_REPLACEMENT_UPDATE');
    expect(handler(main, 'start-new-campaign', 'load-state-dialog')).toContain('excludeSenderFromBroadcast: true');
    expect(handler(main, 'start-new-campaign', 'load-state-dialog')).toContain('stateJson: projectCurrentGameStateForRenderer()');
    expect(handler(main, 'load-state-dialog', 'advance-turn')).toContain('CAMPAIGN_REPLACEMENT_UPDATE');
    expect(handler(main, 'advance-turn', 'save-game')).not.toContain('CAMPAIGN_REPLACEMENT_UPDATE');

    const menuStart = main.indexOf("label: 'Load scenario...'");
    const menuEnd = main.indexOf("label: 'Open tactical map window'", menuStart);
    const menu = main.slice(menuStart, menuEnd);
    expect(menu.match(/CAMPAIGN_REPLACEMENT_UPDATE/g)).toHaveLength(2);
  });

  it('preserves replacement identity while coalescing a newer ordinary state', () => {
    const tagged = coalesceGameStateUpdateMetadata(undefined, { campaignReplacement: true });
    const latest = coalesceGameStateUpdateMetadata(tagged, undefined);

    expect(latest).toEqual({ campaignReplacement: true });
    expect(coalesceGameStateUpdateMetadata(undefined, undefined)).toBeUndefined();
  });

  it('forwards replacement metadata through preload, warroom, and the embedded iframe bridge', () => {
    const preload = read('src', 'desktop', 'preload.cjs');
    const warroom = read('src', 'ui', 'warroom', 'warroom.ts');
    const embedded = read('src', 'ui', 'map', 'index.html');

    expect(preload).toContain("(_event, stateJson, metadata) =>");
    expect(preload).toContain('emitToListeners(gameStateUpdatedListeners, stateJson, metadata);');
    expect(warroom).toContain('this.handleDesktopGameStateUpdated(stateJson, metadata);');
    expect(warroom).toContain("{ type: 'awwv-bridge:event', eventName, payload, metadata }");
    expect(embedded).toContain('listener(data.payload, data.metadata);');
  });

  it('keeps one App-owned success path available before any tactical viewport exists', () => {
    const app = read('src', 'ui', 'map', 'App.tsx');
    const toolbar = read('src', 'ui', 'map', 'components', 'PresidentialToolbar.tsx');

    expect(app).not.toContain('Campaign viewport owner unavailable');
    expect(app).toContain('useDesktopSession({ campaignReplacementOwner });');
    expect(app).toContain('() => useGameStore.getState().loadedGameState !== null');
    expect(app).toContain('await runCampaignReplacement(startCampaign, (started) => started);');
    expect(app).toContain('campaignViewportEpoch={campaignViewportEpoch}');
    expect(app).toContain('onReplaceCampaignState={replaceCampaignState}');
    expect(toolbar).toContain('onReplaceCampaignState');
  });
});
