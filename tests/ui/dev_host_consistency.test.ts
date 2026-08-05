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

  it('Warroom never reaches through the tactical iframe DOM boundary', () => {
    const source = readRepoFile('src/ui/warroom/warroom.ts');

    expect(source).not.toContain('iframeWindow.document');
    expect(source).not.toContain('contentWindow.document');
    expect(source).toContain('private isTrustedTacticalFrameMessage(event: MessageEvent): boolean');
  });
});
