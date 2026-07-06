import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const uiRoot = join(repoRoot, 'src/ui/map');

const LEVER_METHODS = [
  'stageOpDirectiveOrder',
  'stageOpHaltOrder',
  'stageOperationForceLaunch',
  'stageCoReplacementOrder',
  'approveReserveRequest',
] as const;

const ALLOWED_CALL_HOSTS = new Set([
  'src/ui/map/components/army_hq/DirectiveCard.tsx',
  'src/ui/map/desktop/useIPC.ts',
]);

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(fullPath);
      if (!entry.isFile()) return [];
      if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
      if (entry.name.endsWith('.d.ts')) return [];
      return [fullPath];
    })
    .sort((a, b) => a.localeCompare(b));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function lineNumberForOffset(source: string, offset: number): number {
  return source.slice(0, offset).split(/\r?\n/).length;
}

describe('presidential lever IPC single-host guard', () => {
  it('keeps Level-3 lever calls hosted by DirectiveCard only', () => {
    const methodPattern = LEVER_METHODS.join('|');
    const callPattern = new RegExp(`(?:\\.|(?<![\\w$]))(${methodPattern})\\s*\\(`, 'g');
    const violations: string[] = [];

    for (const file of collectSourceFiles(uiRoot)) {
      if (statSync(file).size === 0) continue;
      const relPath = relative(repoRoot, file).replace(/\\/g, '/');
      if (ALLOWED_CALL_HOSTS.has(relPath)) continue;

      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(callPattern)) {
        violations.push(`${relPath}:${lineNumberForOffset(source, match.index ?? 0)} ${match[1]}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
