import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const warroomSource = readFileSync('src/ui/warroom/warroom.ts', 'utf8');
const hostHtml = readFileSync('src/ui/warroom/index.html', 'utf8');
const embeddedHtml = readFileSync('src/ui/map/index.html', 'utf8');
const preloadSource = readFileSync('src/desktop/preload.cjs', 'utf8');

function method(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `${startMarker} must exist`).toBeGreaterThanOrEqual(0);
  expect(end, `${endMarker} must follow ${startMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('desktop host React opening ownership', () => {
  it('boots the retained React frame on its opening route before slow legacy assets load', () => {
    expect(warroomSource).toContain("const OPERATIONAL_SHELL_DOCUMENT = 'index.html?embedded=1';");
    expect(warroomSource).not.toContain("embedded=1&view=warroom");

    const init = method(warroomSource, 'async init()', 'async loadMockState');
    expect(init).toContain('void this.beginReactOpeningOwnership();');
    expect(init.indexOf('void this.beginReactOpeningOwnership();')).toBeLessThan(
      init.indexOf('await this.warPlanningMap.loadData();'),
    );

    const begin = method(
      warroomSource,
      'private async beginReactOpeningOwnership',
      'private claimReactOpeningOwnership',
    );
    expect(begin).toContain('this.ensureOperationalShellIframe(tacticalScene)');
    expect(begin).toContain('shell.hidden = false;');
    expect(begin).toContain("tacticalScene.classList.remove('tactical-map-scene-hidden');");
    expect(begin).toContain("tacticalScene.setAttribute('aria-hidden', 'false');");

    const ensure = method(
      warroomSource,
      'private async ensureOperationalShellIframe',
      'private async ensureSandboxIframe',
    );
    expect(ensure).toContain("iframe.title = 'A War Without Victory';");
  });

  it('keeps both legacy selectors hidden and inert throughout healthy loading and ownership', () => {
    expect(hostHtml).toMatch(/id="main-menu"[^>]*class="[^"]*mm-hidden[^"]*"[^>]*inert[^>]*aria-hidden="true"/);
    expect(hostHtml).toMatch(/id="side-picker"[^>]*class="[^"]*mm-hidden[^"]*"[^>]*inert[^>]*aria-hidden="true"/);

    const hideLegacy = method(
      warroomSource,
      'private hideLegacyOpeningRecovery',
      'private activateLegacyOpeningRecovery',
    );
    expect(hideLegacy).toContain("for (const id of ['main-menu', 'side-picker'])");
    expect(hideLegacy).toContain("element.classList.add('mm-hidden');");
    expect(hideLegacy).toContain('element.inert = true;');
    expect(hideLegacy).toContain("element.setAttribute('aria-hidden', 'true');");

    const claim = method(
      warroomSource,
      'private claimReactOpeningOwnership',
      'private hideLegacyOpeningRecovery',
    );
    expect(claim).toContain('this.cancelReactOpeningFallback();');
    expect(claim).toContain('this.hideLegacyOpeningRecovery();');
    expect(claim).toContain("const recoveringLoadedCampaign = this.openingOwner === 'legacy-recovery' && this.gameState !== null;");
    expect(claim).toContain("tacticalScene.classList.remove('tactical-map-scene-hidden');");
    expect(claim).toContain("tacticalScene.setAttribute('aria-hidden', 'false');");
    expect(claim).toContain("desk.classList.add('warroom-desk-hidden');");
  });

  it('exposes legacy recovery only after one bounded failure and gives a late healthy load precedence', () => {
    expect(warroomSource).toMatch(/const REACT_OPENING_FALLBACK_MS = \d+;/);

    const armFallback = method(
      warroomSource,
      'private armReactOpeningFallback',
      'private cancelReactOpeningFallback',
    );
    expect(armFallback).toContain('window.setTimeout');
    expect(armFallback).toContain('REACT_OPENING_FALLBACK_MS');
    expect(armFallback).toContain('this.activateLegacyOpeningRecovery');
    expect(armFallback).not.toContain('setInterval');

    const ensure = method(
      warroomSource,
      'private async ensureOperationalShellIframe',
      'private async ensureSandboxIframe',
    );
    expect(ensure).toContain('iframe.onerror = () => this.activateLegacyOpeningRecovery');
    expect(ensure).toContain('this.claimReactOpeningOwnership(iframe);');

    const recovery = method(
      warroomSource,
      'private activateLegacyOpeningRecovery',
      'private armReactOpeningFallback',
    );
    expect(recovery).toContain("this.openingOwner = 'legacy-recovery';");
    expect(recovery).toContain("this.showScreen('main-menu');");

    const showScreen = method(warroomSource, 'private showScreen', '/** STEP 1: Show the main menu');
    expect(showScreen).toContain("this.openingOwner !== 'legacy-recovery'");
    expect(showScreen).toContain("el.classList.toggle('mm-hidden', !isActive);");
    expect(showScreen).toContain('el.inert = !isActive;');
    expect(showScreen).toContain("el.setAttribute('aria-hidden', isActive ? 'false' : 'true');");

    // A late load always re-enters claimReactOpeningOwnership, which hides/inerts recovery.
    expect(ensure.indexOf('this.claimReactOpeningOwnership(iframe);')).toBeGreaterThanOrEqual(0);
    expect(recovery).not.toContain('iframe.onload = null');
  });

  it('keeps the legacy desk as the terminal recovery path when the React frame remains failed', () => {
    const loadedShell = method(
      warroomSource,
      'private showLoadedGameShellScene',
      '/** Show a specific overlay screen',
    );
    expect(loadedShell).toContain("this.openingOwner !== 'legacy-recovery'");
    expect(loadedShell).toContain('this.showWarroomScene();');
  });

  it('retains the generic postMessage bridge and its campaign/save/subscription surface', () => {
    const invoke = method(
      warroomSource,
      'private async handleEmbeddedBridgeInvoke',
      'private handleDesktopGameStateUpdated',
    );
    expect(invoke).toContain('const method = bridge?.[data.method];');
    expect(invoke).toContain("data.method === 'startNewCampaign'");
    expect(invoke).toContain("type: 'awwv-bridge:response'");

    for (const methodName of ['startNewCampaign', 'listSaveRecords', 'loadSaveRecord']) {
      expect(preloadSource).toContain(`${methodName}:`);
    }
    expect(embeddedHtml).toContain("type: 'awwv-bridge:invoke'");
    expect(embeddedHtml).toContain('window.awwv = new Proxy(baseBridge');
    expect(embeddedHtml).toContain('return (...args) => invoke(prop, args);');
    expect(embeddedHtml).toContain('subscribeGameStateUpdated(cb)');
    expect(warroomSource).toContain("eventName !== 'game-state-updated'");
    expect(warroomSource).toContain("this.broadcastEmbeddedBridgeEvent('game-state-updated'");
  });

  it('lets React own campaign navigation while preserving loaded-game return messaging', () => {
    const invoke = method(
      warroomSource,
      'private async handleEmbeddedBridgeInvoke',
      'private handleDesktopGameStateUpdated',
    );
    expect(invoke).toContain('this.applyGameStateFromJson(stateJson, { showShell: false });');
    expect(invoke).not.toContain("this.showSidePicker()");
    expect(invoke).not.toContain('this.desktopBridge.startNewCampaign');

    const loadedReturn = method(
      warroomSource,
      'private async returnToOperationalWarroomShell',
      'private async ensureOperationalShellIframe',
    );
    expect(loadedReturn).toContain("await this.showTacticalMapScene('warroom');");
    expect(loadedReturn).toContain("type: 'awwv-shell:show-warroom'");
    expect(loadedReturn).toContain('this.pendingShowWarroom = true;');

    const claim = method(
      warroomSource,
      'private claimReactOpeningOwnership',
      'private hideLegacyOpeningRecovery',
    );
    expect(claim).toContain('if (this.pendingShowWarroom || recoveringLoadedCampaign)');
    expect(claim).toContain("this.postToOperationalShell({ type: 'awwv-shell:show-warroom' })");
    expect(claim).toContain('this.pendingShowWarroom = false;');

    const init = method(warroomSource, 'async init()', 'async loadMockState');
    expect(init).toContain('this.applyGameStateFromJson(existingStateJson, { showShell: false });');
    expect(init).toContain('if (!this.userNavigatedFromMenu) void this.returnToOperationalWarroomShell();');
  });

  it('cleans up the one-shot fallback timer when the host unloads', () => {
    expect(warroomSource).toContain("window.addEventListener('beforeunload', () => this.cancelReactOpeningFallback(), { once: true });");
  });
});
