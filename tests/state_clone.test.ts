import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloneGameState } from '../src/state/clone.js';

describe('cloneGameState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to JSON cloning when structuredClone throws', () => {
    const source = {
      meta: { turn: 40, phase: 'war' },
      military: { formations: { a: { id: 'a', personnel: 100 } } },
    } as any;

    vi.stubGlobal('structuredClone', () => {
      throw new DOMException('Data cannot be cloned, out of memory.', 'DataCloneError');
    });

    const cloned = cloneGameState(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.military).not.toBe(source.military);
  });

  it('still prefers structuredClone when it succeeds', () => {
    const source = {
      meta: { turn: 1 },
      political: { war_exhaustion: { RS: 10 } },
    } as any;

    const structuredCloneMock = vi.fn((value: unknown) => ({ ...(value as object), _marker: 'structured' }));
    vi.stubGlobal('structuredClone', structuredCloneMock);

    const cloned = cloneGameState(source);
    expect(structuredCloneMock).toHaveBeenCalledWith(source);
    expect(cloned).toEqual({ ...source, _marker: 'structured' });
  });
});
