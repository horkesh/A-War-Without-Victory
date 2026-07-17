import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..', '..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('dev host consistency', () => {
  it('Warroom browser tactical-map launcher uses the same 127.0.0.1 host as Electron and docs', () => {
    const source = readRepoFile('src/ui/warroom/warroom.ts');

    expect(source).not.toContain('http://localhost:3002');
    expect(source).toContain('http://127.0.0.1:3002');
  });

  it('Warroom tactical iframe document injection is same-origin gated', () => {
    const source = readRepoFile('src/ui/warroom/warroom.ts');
    const methodStart = source.indexOf('private injectBridgeIntoTacticalMap');
    const methodEnd = source.indexOf('private postFreshCampaignStartedToTacticalMap');
    const method = source.slice(methodStart, methodEnd);

    const originGuard = method.indexOf('new URL(iframe.src, window.location.href).origin');
    const documentAccess = method.indexOf('iframeWindow.document');

    expect(methodStart).toBeGreaterThanOrEqual(0);
    expect(methodEnd).toBeGreaterThan(methodStart);
    expect(originGuard).toBeGreaterThanOrEqual(0);
    expect(documentAccess).toBeGreaterThan(originGuard);
  });
});
