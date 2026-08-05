import { describe, expect, it } from 'vitest';
import {
  isTrustedTacticalFrameMessage,
  resolveTacticalFrameOrigin,
  type TacticalFrameRef,
} from '../../src/ui/warroom/tacticalFrameTrust';

function frame(src: string, contentWindow: MessageEventSource | null): TacticalFrameRef {
  return { src, contentWindow };
}

describe('tactical frame message trust', () => {
  const parentHref = 'awwv://warroom/index.html';

  it('accepts only the matching source and HTTP origin', () => {
    const source = {} as MessageEventSource;
    const tacticalFrame = frame('http://127.0.0.1:3002/index.html?embedded=1', source);

    expect(isTrustedTacticalFrameMessage(
      { source, origin: 'http://127.0.0.1:3002' },
      [tacticalFrame],
      parentHref,
    )).toBe(true);
    expect(isTrustedTacticalFrameMessage(
      { source, origin: 'https://attacker.invalid' },
      [tacticalFrame],
      parentHref,
    )).toBe(false);
  });

  it('accepts the exact opaque origin but rejects a navigated origin with the same source', () => {
    const source = {} as MessageEventSource;
    const tacticalFrame = frame('awwv://warroom/tactical-map/index.html?embedded=1', source);

    expect(resolveTacticalFrameOrigin(tacticalFrame.src, parentHref)).toBeNull();
    expect(isTrustedTacticalFrameMessage(
      { source, origin: 'null' },
      [tacticalFrame],
      parentHref,
    )).toBe(true);
    expect(isTrustedTacticalFrameMessage(
      { source, origin: 'https://attacker.invalid' },
      [tacticalFrame],
      parentHref,
    )).toBe(false);
  });

  it('rejects an unregistered source even when its origin matches', () => {
    const registeredSource = {} as MessageEventSource;
    const otherSource = {} as MessageEventSource;
    const tacticalFrame = frame('http://127.0.0.1:3002/index.html?embedded=1', registeredSource);

    expect(isTrustedTacticalFrameMessage(
      { source: otherSource, origin: 'http://127.0.0.1:3002' },
      [tacticalFrame],
      parentHref,
    )).toBe(false);
  });
});
