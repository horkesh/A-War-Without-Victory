// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/ui/warroom/components/WarPlanningMap.js', () => ({
  WarPlanningMap: class {
    private readonly container = document.createElement('div');
    getContainer() { return this.container; }
    setCloseCallback() {}
    async loadData() {}
    setControlFromState() {}
    setGameState() {}
    setPlayerFaction() {}
  },
}));

vi.mock('../src/ui/warroom/components/ModalManager.js', () => ({
  ModalManager: class { showModal() {} },
}));

vi.mock('../src/ui/warroom/data/player_visible_state_adapter.js', () => ({
  parsePlayerVisibleWarroomState: () => ({
    meta: { turn: 0, phase: 'war', player_faction: 'RBiH' },
    factions: [],
    military: { formations: {} },
    political: { political_controllers: {} },
  }),
}));

function installHostDom(): void {
  document.body.innerHTML = `
    <div id="warroom-scene" class="warroom-scene-hidden">
      <div id="warroom-desk"></div>
      <div id="map-scene" class="map-scene-hidden"></div>
      <div id="tactical-map-scene" class="tactical-map-scene-hidden" aria-hidden="true"></div>
    </div>
    <div id="main-menu" class="mm-overlay mm-hidden" inert aria-hidden="true">
      <button id="mm-new-campaign"></button>
      <button id="mm-load-save"></button>
      <button id="mm-continue"></button>
      <input id="mm-file-input" type="file" />
    </div>
    <div id="side-picker" class="mm-overlay mm-hidden" inert aria-hidden="true">
      <button id="sp-back"></button>
      <div id="sp-error" class="hidden"></div>
      <button class="sp-faction-option" data-faction="RBiH"></button>
    </div>
  `;
}

async function bootHost(overrides: Record<string, unknown> = {}) {
  const bridge = {
    getMapServerUrl: vi.fn().mockResolvedValue('https://map.local'),
    getCurrentGameState: vi.fn().mockResolvedValue(null),
    startNewCampaign: vi.fn(),
    subscribeGameStateUpdated: vi.fn().mockReturnValue(() => {}),
    subscribeTurnReportUpdated: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
  Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
  await import('../src/ui/warroom/warroom.js');
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  const iframe = document.getElementById('tactical-map-iframe') as HTMLIFrameElement | null;
  expect(iframe).not.toBeNull();
  return { bridge, iframe: iframe! };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function sendReady(iframe: HTMLIFrameElement, source: MessageEventSource | null = iframe.contentWindow): void {
  window.dispatchEvent(new MessageEvent('message', {
    data: { type: 'awwv-shell:ready' },
    source,
    origin: 'https://map.local',
  }));
}

describe('desktop React opening lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    installHostDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('keeps recovery armed when transport loads without a committed React ready signal', async () => {
    const { iframe } = await bootHost();

    iframe.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(8000);

    const mainMenu = document.getElementById('main-menu')!;
    expect(mainMenu.classList.contains('mm-hidden')).toBe(false);
    expect(mainMenu.inert).toBe(false);
    expect(iframe.hidden).toBe(true);
  });

  it('emits readiness from a React effect after the embedded root commits', () => {
    const mainSource = readFileSync('src/ui/map/main.tsx', 'utf8');
    expect(mainSource).toContain('function EmbeddedAppRoot()');
    expect(mainSource).toContain('useEffect(() => {');
    expect(mainSource).toContain("window.parent.postMessage({ type: 'awwv-shell:ready' }, '*');");
    expect(mainSource).toContain('render(<EmbeddedAppRoot />)');
  });

  it('claims React ownership only after a trusted ready signal and cancels recovery', async () => {
    const { iframe } = await bootHost();

    sendReady(iframe);
    vi.advanceTimersByTime(8000);

    const mainMenu = document.getElementById('main-menu')!;
    expect(mainMenu.classList.contains('mm-hidden')).toBe(true);
    expect(mainMenu.inert).toBe(true);
    expect(iframe.hidden).toBe(false);
  });

  it('ignores ready signals from the wrong or a stale iframe window', async () => {
    const { iframe } = await bootHost();
    const staleFrame = document.createElement('iframe');
    document.body.appendChild(staleFrame);

    sendReady(iframe, window);
    sendReady(iframe, staleFrame.contentWindow);
    vi.advanceTimersByTime(8000);

    expect(document.getElementById('main-menu')!.classList.contains('mm-hidden')).toBe(false);
    expect(iframe.hidden).toBe(true);
  });

  it('lets a late trusted ready signal reclaim sole ownership after timeout recovery', async () => {
    const { iframe } = await bootHost();
    vi.advanceTimersByTime(8000);
    expect(document.getElementById('main-menu')!.classList.contains('mm-hidden')).toBe(false);

    sendReady(iframe);

    expect(document.getElementById('main-menu')!.classList.contains('mm-hidden')).toBe(true);
    expect(document.getElementById('main-menu')!.inert).toBe(true);
    expect(document.getElementById('side-picker')!.classList.contains('mm-hidden')).toBe(true);
    expect(document.getElementById('side-picker')!.inert).toBe(true);
    expect(iframe.hidden).toBe(false);
  });

  it('promotes a recovery-started campaign on late ready and never repeats its fresh reset', async () => {
    const startNewCampaign = vi.fn().mockResolvedValue({ ok: true, stateJson: '{}' });
    const { iframe } = await bootHost({ startNewCampaign });
    const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
    vi.advanceTimersByTime(8000);

    document.getElementById('mm-new-campaign')!.click();
    (document.querySelector('.sp-faction-option') as HTMLButtonElement).click();
    await flushMicrotasks();
    expect(startNewCampaign).toHaveBeenCalledTimes(1);
    expect(startNewCampaign).toHaveBeenCalledWith({
      playerFaction: 'RBiH',
      decisionMode: 'emergent',
      scenarioKey: 'apr_1992',
    });

    sendReady(iframe);
    await flushMicrotasks();
    const routingMessages = postMessage.mock.calls
      .map(([message]) => (message as { type?: string })?.type)
      .filter((type) => type === 'awwv-shell:fresh-campaign-started' || type === 'awwv-shell:show-warroom');
    expect(routingMessages).toEqual([
      'awwv-shell:fresh-campaign-started',
      'awwv-shell:show-warroom',
    ]);
    expect(routingMessages.at(-1)).toBe('awwv-shell:show-warroom');
    const freshMessages = () => postMessage.mock.calls.filter(
      ([message]) => (message as { type?: string })?.type === 'awwv-shell:fresh-campaign-started',
    );
    expect(freshMessages()).toHaveLength(1);

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'awwv-back-to-hq' },
      source: iframe.contentWindow,
      origin: 'https://map.local',
    }));
    await flushMicrotasks();
    expect(freshMessages()).toHaveLength(1);
  });

  it('delivers a queued loaded-game Warroom handoff only after committed readiness', async () => {
    const getCurrentGameState = vi.fn().mockResolvedValue('{}');
    const { iframe } = await bootHost({ getCurrentGameState });
    const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
    await flushMicrotasks();

    const showWarroomMessages = () => postMessage.mock.calls.filter(
      ([message]) => (message as { type?: string })?.type === 'awwv-shell:show-warroom',
    );
    expect(getCurrentGameState).toHaveBeenCalled();
    expect(showWarroomMessages()).toHaveLength(0);

    sendReady(iframe);

    expect(showWarroomMessages()).toHaveLength(1);
  });

  it('defers late readiness until a recovery campaign mutation succeeds', async () => {
    const campaign = deferred<{ ok: boolean; stateJson?: string }>();
    const startNewCampaign = vi.fn().mockReturnValue(campaign.promise);
    const { iframe } = await bootHost({ startNewCampaign });
    const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
    vi.advanceTimersByTime(8000);
    document.getElementById('mm-new-campaign')!.click();
    (document.querySelector('.sp-faction-option') as HTMLButtonElement).click();
    await flushMicrotasks();

    sendReady(iframe);
    expect(document.getElementById('side-picker')!.classList.contains('mm-hidden')).toBe(false);
    expect(document.getElementById('side-picker')!.inert).toBe(false);
    expect(iframe.hidden).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();

    campaign.resolve({ ok: true, stateJson: '{}' });
    await flushMicrotasks();

    expect(startNewCampaign).toHaveBeenCalledWith({
      playerFaction: 'RBiH',
      decisionMode: 'emergent',
      scenarioKey: 'apr_1992',
    });
    expect(postMessage.mock.calls.map(([message]) => (message as { type?: string }).type)).toEqual([
      'awwv-shell:fresh-campaign-started',
      'awwv-shell:show-warroom',
    ]);
    expect(iframe.hidden).toBe(false);
    expect(document.getElementById('side-picker')!.inert).toBe(true);
  });

  it('keeps failed recovery authoritative and consumes deferred readiness on a successful retry', async () => {
    const campaign = deferred<{ ok: boolean; error?: string }>();
    const startNewCampaign = vi.fn().mockReturnValue(campaign.promise);
    const { iframe } = await bootHost({ startNewCampaign });
    const postMessage = vi.spyOn(iframe.contentWindow!, 'postMessage');
    vi.advanceTimersByTime(8000);
    document.getElementById('mm-new-campaign')!.click();
    const factionButton = document.querySelector('.sp-faction-option') as HTMLButtonElement;
    factionButton.click();
    await flushMicrotasks();

    sendReady(iframe);
    expect(document.getElementById('side-picker')!.classList.contains('mm-hidden')).toBe(false);
    expect(iframe.hidden).toBe(true);

    campaign.resolve({ ok: false, error: 'campaign rejected' });
    await flushMicrotasks();

    expect(document.getElementById('sp-error')!.textContent).toBe('campaign rejected');
    expect(document.getElementById('sp-error')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('side-picker')!.classList.contains('mm-hidden')).toBe(false);
    expect(document.getElementById('side-picker')!.inert).toBe(false);
    expect(iframe.hidden).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();

    sendReady(iframe);
    expect(document.getElementById('side-picker')!.inert).toBe(false);
    expect(iframe.hidden).toBe(true);
    expect(postMessage).not.toHaveBeenCalled();

    const retry = deferred<{ ok: boolean; stateJson?: string }>();
    startNewCampaign.mockReturnValue(retry.promise);
    factionButton.click();
    await flushMicrotasks();
    retry.resolve({ ok: true, stateJson: '{}' });
    await flushMicrotasks();

    expect(startNewCampaign).toHaveBeenCalledTimes(2);
    expect(document.getElementById('sp-error')!.textContent).toBe('');
    expect(document.getElementById('sp-error')!.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('side-picker')!.classList.contains('mm-hidden')).toBe(true);
    expect(document.getElementById('side-picker')!.inert).toBe(true);
    expect(iframe.hidden).toBe(false);
    expect(postMessage.mock.calls.map(([message]) => (message as { type?: string }).type)).toEqual([
      'awwv-shell:fresh-campaign-started',
      'awwv-shell:show-warroom',
    ]);
  });
});
