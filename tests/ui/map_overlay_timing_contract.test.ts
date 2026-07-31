import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createDevTimer } from '../../src/ui/map/map/overlayTiming.js';

describe('Map overlay dev timing', () => {
  it('uses unique labels for overlapping timers and ends each timer once', () => {
    const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => undefined);
    const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => undefined);
    try {
      const first = createDevTimer('overlay front+formations', true);
      const second = createDevTimer('overlay front+formations', true);

      expect(timeSpy).toHaveBeenCalledTimes(2);
      expect(timeSpy.mock.calls[0]?.[0]).not.toBe(timeSpy.mock.calls[1]?.[0]);

      first.end();
      first.end();
      second.end();

      expect(timeEndSpy).toHaveBeenCalledTimes(2);
      expect(timeEndSpy.mock.calls.map((call) => call[0])).toEqual(timeSpy.mock.calls.map((call) => call[0]));
    } finally {
      timeSpy.mockRestore();
      timeEndSpy.mockRestore();
    }
  });

  it('is a no-op when dev timing is disabled', () => {
    const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => undefined);
    const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => undefined);
    try {
      const timer = createDevTimer('overlay front+formations', false);
      timer.end();

      expect(timeSpy).not.toHaveBeenCalled();
      expect(timeEndSpy).not.toHaveBeenCalled();
    } finally {
      timeSpy.mockRestore();
      timeEndSpy.mockRestore();
    }
  });

  it('keeps MapContainer away from raw duplicate-prone console timers', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).not.toContain("console.time('[MapContainer] overlay front+formations')");
    expect(source).not.toContain("console.timeEnd('[MapContainer] overlay front+formations')");
    expect(source).toContain('createDevTimer(');
  });

  it('marks overlay state stale when cleanup cancels deferred overlay work', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const cleanupStart = source.indexOf('if (deferredOverlayHandleRef.current != null)');
    const cleanupEnd = source.indexOf('if (sourceUpdatePollRef.current)', cleanupStart);

    expect(cleanupStart).toBeGreaterThan(0);
    expect(cleanupEnd).toBeGreaterThan(cleanupStart);
    expect(source.slice(cleanupStart, cleanupEnd)).toContain('appliedStateRef.current = null');
  });

  it('marks the complete transition lifecycle without replacing the readiness gate', () => {
    const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
    const mapSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const loaderSource = readFileSync('src/ui/map/data/DataLoader.ts', 'utf8');

    expect(appSource).toMatch(/beginMapTransition\(\)/);
    for (const mark of [
      'viewport-visible',
      'map-created',
      'style-loaded',
      'current-state-rendered',
      'interactive',
    ]) {
      expect(mapSource).toContain(`'${mark}'`);
    }
    expect(loaderSource).toMatch(/countMapTransitionResource/);
    expect(mapSource).toMatch(/countMapTransitionConstruction/);
    expect(mapSource).toMatch(/countMapTransitionRelease/);
    expect(mapSource).toMatch(/map\.once\('style\.load',\s*\(\) => markMapTransition\('style-loaded'\)\)/);
    expect(mapSource).not.toMatch(/map\.once\('load',\s*\(\) => markMapTransition\('style-loaded'\)\)/);
    expect(mapSource).toMatch(/isTacticalMapStateReady/);
    expect(mapSource).not.toMatch(/console\.time\(/);
  });
});
