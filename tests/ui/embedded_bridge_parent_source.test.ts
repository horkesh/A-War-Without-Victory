import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

type EmbeddedDom = { window: Window & typeof globalThis };
const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html?: string, options?: { url?: string; runScripts?: string }) => EmbeddedDom;
};

function createEmbeddedProxy() {
  const html = readFileSync('src/ui/map/index.html', 'utf8');
  const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(inlineScript).toBeTruthy();

  const parent = { postMessage: vi.fn() };
  const foreign = { postMessage: vi.fn() };
  const dom = new JSDOM('', {
    url: 'https://map.local/index.html?embedded=1',
    runScripts: 'outside-only',
  });
  Object.defineProperty(dom.window, 'parent', { configurable: true, value: parent });
  dom.window.eval(inlineScript!);

  return {
    bridge: (dom.window as unknown as { awwv: Record<string, (...args: unknown[]) => unknown> }).awwv,
    dom,
    foreign,
    parent,
  };
}

function message(dom: EmbeddedDom, source: unknown, data: unknown): MessageEvent {
  return new dom.window.MessageEvent('message', {
    data,
    source: source as MessageEventSource,
  }) as unknown as MessageEvent;
}

describe('embedded bridge parent source boundary', () => {
  it('does not resolve a pending bridge invocation from a foreign source', async () => {
    const { bridge, dom, foreign, parent } = createEmbeddedProxy();
    try {
      let resolved = false;
      const resultPromise = (bridge.listSaveRecords() as Promise<unknown>).then((value) => {
        resolved = true;
        return value;
      });
      const request = parent.postMessage.mock.calls[0]?.[0] as { id: string };

      dom.window.dispatchEvent(message(dom, foreign, {
        type: 'awwv-bridge:response',
        id: request.id,
        ok: true,
        result: { records: ['foreign'] },
      }));
      await Promise.resolve();
      expect(resolved).toBe(false);

      dom.window.dispatchEvent(message(dom, parent, {
        type: 'awwv-bridge:response',
        id: request.id,
        ok: true,
        result: { records: ['parent'] },
      }));
      await expect(resultPromise).resolves.toEqual({ records: ['parent'] });
    } finally {
      dom.window.close();
    }
  });

  it('does not deliver game-state or turn-report events from a foreign source', () => {
    const { bridge, dom, foreign, parent } = createEmbeddedProxy();
    try {
      const onGameState = vi.fn();
      const onTurnReport = vi.fn();
      bridge.subscribeGameStateUpdated(onGameState);
      bridge.subscribeTurnReportUpdated(onTurnReport);

      dom.window.dispatchEvent(message(dom, foreign, {
        type: 'awwv-bridge:event', eventName: 'game-state-updated', payload: 'foreign-state',
      }));
      dom.window.dispatchEvent(message(dom, foreign, {
        type: 'awwv-bridge:event', eventName: 'turn-report-updated', payload: 'foreign-report',
      }));
      expect(onGameState).not.toHaveBeenCalled();
      expect(onTurnReport).not.toHaveBeenCalled();

      dom.window.dispatchEvent(message(dom, parent, {
        type: 'awwv-bridge:event', eventName: 'game-state-updated', payload: 'parent-state',
      }));
      dom.window.dispatchEvent(message(dom, parent, {
        type: 'awwv-bridge:event', eventName: 'turn-report-updated', payload: 'parent-report',
      }));
      expect(onGameState).toHaveBeenCalledWith('parent-state', undefined);
      expect(onTurnReport).toHaveBeenCalledWith('parent-report', undefined);
    } finally {
      dom.window.close();
    }
  });
});
