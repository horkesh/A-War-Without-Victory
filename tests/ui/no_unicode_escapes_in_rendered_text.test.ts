import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..', '..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('rendered text unicode escapes', () => {
  it('Presidential Inbox player-facing copy does not use raw unicode escape sequences', () => {
    const source = readRepoFile('src/ui/map/components/PresidentialInbox.tsx');

    expect(source).not.toMatch(/\\[uU]2014/);
    expect(source).not.toMatch(/\\[uU]2019/);
  });
});
