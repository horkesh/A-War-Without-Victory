import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function cssFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(path);
    return entry.isFile() && entry.name.endsWith('.css') ? [path] : [];
  });
}

function expectNoExternalFontDependency(source: string): void {
  expect(source).not.toMatch(/https?:\/\/fonts\.(?:googleapis|gstatic)\.com/i);
  expect(source).not.toMatch(/@import\s+(?:url\()?\s*['"]?https?:\/\//i);
}

describe('packaged UI font network contract', () => {
  it.each([
    'src/ui/map/index.html',
    'src/ui/warroom/index.html',
  ])('%s has no external font dependency', (file) => {
    expectNoExternalFontDependency(readFileSync(file, 'utf8'));
  });

  it.each([
    ...cssFilesUnder('src/ui/map'),
    ...cssFilesUnder('src/ui/warroom'),
  ])('%s cannot restore an external font import', (file) => {
    expectNoExternalFontDependency(readFileSync(file, 'utf8'));
  });
});
