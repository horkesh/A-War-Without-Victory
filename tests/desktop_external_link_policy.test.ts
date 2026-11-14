import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { OSM_COPYRIGHT_URL } from '../src/ui/map/components/OsmAttribution';

// The policy lives inside electron-main.cjs: a new src/desktop/*.cjs module would have to be
// added to electron-builder's `files`, which is packaging config. The block between the
// markers is pure (it needs only URL) and is evaluated here, as the PMTiles route test does.
const MAIN_PATH = join(process.cwd(), 'src', 'desktop', 'electron-main.cjs');
const mainSource = readFileSync(MAIN_PATH, 'utf8');
const BEGIN = '// BEGIN external-link-policy';
const END = '// END external-link-policy';

type NavigationEvent = { preventDefault: () => void; url?: string; isMainFrame?: boolean };
type Policy = {
  EXTERNAL_LINK_HOSTS: Set<string>;
  allowedExternalUrl: (url: string) => string | null;
  isInternalAppUrl: (url: string) => boolean;
  installExternalLinkPolicy: (contents: FakeContents, openExternal: (href: string) => void) => boolean;
};

function loadPolicy(): Policy {
  const start = mainSource.indexOf(BEGIN);
  const end = mainSource.indexOf(END);
  expect(start, 'policy block start marker').toBeGreaterThan(-1);
  expect(end, 'policy block end marker').toBeGreaterThan(start);
  const block = mainSource.slice(start, end);
  return Function(
    'URL',
    `${block}\nreturn { EXTERNAL_LINK_HOSTS, allowedExternalUrl, isInternalAppUrl, installExternalLinkPolicy };`,
  )(URL) as Policy;
}

class FakeContents {
  windowOpenHandler: ((details: { url: string }) => { action: string }) | null = null;
  listeners = new Map<string, (...args: unknown[]) => void>();
  constructor(private readonly type: string = 'window') {}
  getType() {
    return this.type;
  }
  setWindowOpenHandler(handler: (details: { url: string }) => { action: string }) {
    this.windowOpenHandler = handler;
  }
  on(name: string, listener: (...args: unknown[]) => void) {
    this.listeners.set(name, listener);
  }
  emit(name: string, ...args: unknown[]) {
    this.listeners.get(name)?.(...args);
  }
}

function navigationEvent(url: string, extra: Partial<NavigationEvent> = {}) {
  return { url, preventDefault: vi.fn(), ...extra };
}

const policy = loadPolicy();

describe('external link policy: URL rules', () => {
  it('sends only https OpenStreetMap pages to the browser', () => {
    expect(policy.allowedExternalUrl('https://www.openstreetmap.org/copyright')).toBe('https://www.openstreetmap.org/copyright');
    expect(policy.allowedExternalUrl('https://openstreetmap.org/copyright')).toBe('https://openstreetmap.org/copyright');
    for (const rejected of [
      'http://www.openstreetmap.org/copyright',
      'https://www.openstreetmap.org.evil.example/copyright',
      'https://evilopenstreetmap.org/',
      'https://user:secret@www.openstreetmap.org/copyright',
      'https://www.openstreetmap.org:8443/copyright',
      'https://example.com/',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'awwv://warroom/index.html',
      'not a url',
    ]) {
      expect(policy.allowedExternalUrl(rejected), rejected).toBeNull();
    }
  });

  it('treats the awwv:// shell, the loopback servers, blank and blob documents as app content', () => {
    for (const internal of [
      'awwv://warroom/index.html',
      'awwv://warroom/tactical-map',
      'http://127.0.0.1:41234/?desktop_window=operational',
      'http://127.0.0.1:3002/index.html?view=warroom',
      'http://localhost:3001/',
      'about:blank',
      'blob:http://127.0.0.1:41234/2f1c',
      'blob:awwv://warroom/2f1c',
    ]) {
      expect(policy.isInternalAppUrl(internal), internal).toBe(true);
    }
    for (const external of [
      'https://www.openstreetmap.org/copyright',
      'http://192.168.1.20:3002/',
      'https://127.0.0.1.evil.example/',
      'file:///C:/Windows/',
      'blob:https://example.com/2f1c',
      'not a url',
    ]) {
      expect(policy.isInternalAppUrl(external), external).toBe(false);
    }
  });
});

describe('external link policy: webContents handlers', () => {
  it('denies every popup and opens an allow-listed link in the browser', () => {
    const contents = new FakeContents();
    const openExternal = vi.fn();
    expect(policy.installExternalLinkPolicy(contents, openExternal)).toBe(true);

    expect(contents.windowOpenHandler?.({ url: OSM_COPYRIGHT_URL })).toEqual({ action: 'deny' });
    expect(openExternal).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');

    openExternal.mockClear();
    expect(contents.windowOpenHandler?.({ url: 'https://example.com/' })).toEqual({ action: 'deny' });
    expect(contents.windowOpenHandler?.({ url: 'http://127.0.0.1:3002/index.html' })).toEqual({ action: 'deny' });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('cancels top-level navigation away from app content and leaves app navigation alone', () => {
    const contents = new FakeContents();
    const openExternal = vi.fn();
    policy.installExternalLinkPolicy(contents, openExternal);

    const internal = navigationEvent('awwv://warroom/index.html');
    contents.emit('will-navigate', internal, internal.url);
    expect(internal.preventDefault).not.toHaveBeenCalled();

    const osm = navigationEvent(OSM_COPYRIGHT_URL);
    contents.emit('will-navigate', osm, osm.url);
    expect(osm.preventDefault).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledWith(OSM_COPYRIGHT_URL);

    openExternal.mockClear();
    // Older Electron passes the URL only positionally.
    const legacy = { preventDefault: vi.fn() };
    contents.emit('will-navigate', legacy, 'https://example.com/phish');
    expect(legacy.preventDefault).toHaveBeenCalledTimes(1);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('cancels sub-frame navigation away from app content, without double-handling the main frame', () => {
    const contents = new FakeContents();
    const openExternal = vi.fn();
    policy.installExternalLinkPolicy(contents, openExternal);

    const frame = navigationEvent(OSM_COPYRIGHT_URL, { isMainFrame: false });
    contents.emit('will-frame-navigate', frame);
    expect(frame.preventDefault).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledTimes(1);

    const mainFrame = navigationEvent(OSM_COPYRIGHT_URL, { isMainFrame: true });
    contents.emit('will-frame-navigate', mainFrame);
    expect(mainFrame.preventDefault).not.toHaveBeenCalled();
    expect(openExternal).toHaveBeenCalledTimes(1);

    const mapFrame = navigationEvent('http://127.0.0.1:41234/?desktop_window=operational', { isMainFrame: false });
    contents.emit('will-frame-navigate', mapFrame);
    expect(mapFrame.preventDefault).not.toHaveBeenCalled();
  });

  it('leaves DevTools alone', () => {
    const contents = new FakeContents('devtools');
    expect(policy.installExternalLinkPolicy(contents, vi.fn())).toBe(false);
    expect(contents.windowOpenHandler).toBeNull();
    expect(contents.listeners.size).toBe(0);
  });
});

describe('external link policy: wiring', () => {
  it('installs the policy on every new webContents and opens links with shell.openExternal', () => {
    expect(mainSource.split(BEGIN)).toHaveLength(2);
    expect(mainSource).toMatch(/const \{[^}]*\bshell\b[^}]*\} = _electronModule;/);
    const wiring = mainSource.slice(mainSource.indexOf(END));
    expect(wiring).toMatch(
      /app\.on\('web-contents-created', \(_event, contents\) => \{\s*installExternalLinkPolicy\(contents, \(href\) => \{\s*shell\.openExternal\(href\)/,
    );
    // Registered at module load, before the first window exists.
    expect(mainSource.indexOf("app.on('web-contents-created'")).toBeLessThan(mainSource.indexOf('app.whenReady().then('));
  });

  it('allow-lists every external link the renderer offers', () => {
    const roots = [join(process.cwd(), 'src', 'ui')];
    const hrefs = new Set<string>([OSM_COPYRIGHT_URL]);
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'stories' || name === '__mocks__') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.(tsx?|html)$/.test(name) && !/\.(test|stories)\./.test(name)) {
          // Anchors only: a <link href> stylesheet is not something the player clicks.
          for (const match of readFileSync(path, 'utf8').matchAll(/<a\b[^>]*?\bhref=["'](https?:\/\/[^"']+)["']/gs)) {
            hrefs.add(match[1]);
          }
        }
      }
    };
    roots.forEach(walk);
    expect(hrefs.size).toBeGreaterThan(0);
    const blocked = [...hrefs].filter((href) => policy.allowedExternalUrl(href) === null);
    expect(blocked, `not allow-listed in ${relative(process.cwd(), MAIN_PATH)}`).toEqual([]);
  });
});
