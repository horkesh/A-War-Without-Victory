import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('warroom new campaign flow truth', () => {
  it('launches the only live campaign directly from the side picker', () => {
    const warroomSource = readRepoFile('src', 'ui', 'warroom', 'warroom.ts');

    expect(warroomSource).not.toContain('showScenarioPicker');
    expect(warroomSource).not.toContain("showScreen('scenario-picker')");
    expect(warroomSource).not.toContain('wireScenarioPickerButtons');
    expect(warroomSource).not.toContain('pendingFaction');
    expect(warroomSource).toContain("scenarioKey: 'apr_1992'");
    expect(warroomSource).toContain('this.desktopBridge.startNewCampaign');
  });

  it('passes a one-shot war-start intro/reset message from fresh Warroom campaigns into the stable React shell', () => {
    const warroomSource = readRepoFile('src', 'ui', 'warroom', 'warroom.ts');

    expect(warroomSource).toContain('freshCampaignIntroPending');
    expect(warroomSource).toContain('this.freshCampaignIntroPending = true;');
    expect(warroomSource).not.toContain('intro=war_start');
    expect(warroomSource).toContain("type: 'awwv-shell:fresh-campaign-started'");
    const start = warroomSource.indexOf('const result = await this.desktopBridge.startNewCampaign({');
    const end = warroomSource.indexOf('} catch (error)', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const desktopStartBlock = warroomSource.slice(start, end);
    const introArm = warroomSource.lastIndexOf('this.freshCampaignIntroPending = true;', start);
    expect(introArm).toBeGreaterThanOrEqual(0);
    expect(introArm).toBeLessThan(start);
    expect(desktopStartBlock).toContain('result.stateJson');
    expect(desktopStartBlock).toContain('this.desktopStateGate.admitReserved(');
    expect(desktopStartBlock).toContain('CAMPAIGN_REPLACEMENT_UPDATE');
    expect(desktopStartBlock).toContain('await this.pullLatestGameState({ showShell: false });');
    expect(desktopStartBlock).toContain("this.showScreen('none');");
    expect(desktopStartBlock).not.toContain("void this.showTacticalMapScene('warroom');");
  });

  it('keeps startup state acquisition alive through early side-picker navigation', () => {
    const warroomSource = readRepoFile('src', 'ui', 'warroom', 'warroom.ts');

    expect(warroomSource).toContain('if (this.desktopBridge?.getCurrentGameState) {');
    expect(warroomSource).not.toContain('if (!this.userNavigatedFromMenu && this.desktopBridge?.getCurrentGameState) {');
    expect(warroomSource).toContain('{ showShell: !this.userNavigatedFromMenu }');
    expect(warroomSource).toContain("private async pullLatestGameState(options?: { showShell?: boolean })");
  });

  it('posts a fresh-campaign reset message into the embedded tactical map after iframe load or reuse', () => {
    const warroomSource = readRepoFile('src', 'ui', 'warroom', 'warroom.ts');

    expect(warroomSource).toContain('postFreshCampaignStartedToTacticalMap');
    expect(warroomSource).toContain("type: 'awwv-shell:fresh-campaign-started'");

    const loadStart = warroomSource.indexOf('iframe.onload = () => {');
    const loadEnd = warroomSource.indexOf('};', loadStart);
    expect(loadStart).toBeGreaterThanOrEqual(0);
    expect(loadEnd).toBeGreaterThan(loadStart);
    expect(warroomSource.slice(loadStart, loadEnd)).toContain('this.postFreshCampaignStartedToTacticalMap();');

    const reuseStart = warroomSource.indexOf('const shell = await this.ensureOperationalShellIframe(tacticalScene);');
    const reuseEnd = warroomSource.indexOf("const desk = document.getElementById('warroom-desk');", reuseStart);
    expect(reuseStart).toBeGreaterThanOrEqual(0);
    expect(reuseEnd).toBeGreaterThan(reuseStart);
    expect(warroomSource.slice(reuseStart, reuseEnd)).toContain('this.postFreshCampaignStartedToTacticalMap();');
  });

  it('the React map handles fresh Warroom campaign messages as a hard first-hour reset without leaving the Warroom shell', () => {
    const appSource = readRepoFile('src', 'ui', 'map', 'App.tsx');

    expect(appSource).toContain("event.data?.type === 'awwv-shell:fresh-campaign-started'");
    const handlerStart = appSource.indexOf("event.data?.type === 'awwv-shell:fresh-campaign-started'");
    const handlerEnd = appSource.indexOf("if (event.data?.type !== 'awwv-shell:handoff') return;", handlerStart);
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    const handler = appSource.slice(handlerStart, handlerEnd);
    expect(handler).toContain("view === 'warroom' ? 'warroom' : 'game'");
    expect(handler).toContain('setOpeningBriefDismissed(false)');
    expect(handler).toContain('setPeaceWarTransitionSeen(false)');
    expect(handler).toContain('setActiveEventDecisionId(null)');
    expect(handler).toContain('setRecentlyAcceptedEventDecisionId(null)');
    expect(handler).toContain('setLoadError(null)');
  });

  it('does not render a dead scenario-selection overlay when only apr_1992 is live', () => {
    const html = readRepoFile('src', 'ui', 'warroom', 'index.html');

    expect(html).not.toContain('id="scenario-picker"');
    expect(html).not.toContain('Select Scenario');
    expect(html).not.toContain('id="scn-apr1992"');
    expect(html).toContain('id="side-picker"');
    expect(html).toContain('Choose Your Side');
  });

  it('separates the presidential player role from the armed force in the side picker', () => {
    const html = readRepoFile('src', 'ui', 'warroom', 'index.html');

    expect(html).not.toContain('RBiH (ARBiH)');
    expect(html).not.toContain('RS (VRS)');
    expect(html).not.toContain('HRHB (HVO)');
    expect(html).toContain('Republic of Bosnia and Herzegovina');
    expect(html).toContain('Republika Srpska');
    expect(html).toContain('Croatian Republic of Herzeg-Bosnia');
    expect(html.match(/class="sp-player-role">Presidency</g)).toHaveLength(3);
    expect(html).toContain('Armed forces: ARBiH');
    expect(html).toContain('Armed forces: VRS');
    expect(html).toContain('Armed forces: HVO');
  });

  it('hides the Command Post overlay after faction selection despite #main-menu display styling', () => {
    const html = readRepoFile('src', 'ui', 'warroom', 'index.html');

    expect(html).toContain('#main-menu.mm-hidden');
    expect(html.indexOf('#main-menu.mm-hidden')).toBeGreaterThan(html.indexOf('.mm-overlay.mm-hidden'));
  });

  it('keeps embedded tactical-map replay sidecar subscriptions local to avoid cloning callbacks', () => {
    const html = readRepoFile('src', 'ui', 'map', 'index.html');

    const bridgeStart = html.indexOf('const baseBridge = {');
    const bridgeEnd = html.indexOf('window.awwv = new Proxy', bridgeStart);
    expect(bridgeStart).toBeGreaterThanOrEqual(0);
    expect(bridgeEnd).toBeGreaterThan(bridgeStart);
    const baseBridge = html.slice(bridgeStart, bridgeEnd);

    expect(baseBridge).toContain('subscribeReplaySequenceUpdated(cb)');
    expect(baseBridge).toContain('subscribeReplayManifestUpdated(cb)');
    expect(baseBridge).toContain("return subscribe('replay-sequence-updated', cb);");
    expect(baseBridge).toContain("return subscribe('replay-manifest-updated', cb);");
  });
});
