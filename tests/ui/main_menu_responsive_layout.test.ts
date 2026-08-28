import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/ui/map/styles/globals.css'), 'utf8');

describe('cinematic main-menu responsive layout', () => {
  it('moves the fixed version label into the header metadata band on narrow or short screens', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*820px\),\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.main-menu-opening__version\s*\{[^}]*top:\s*4\.25rem;[^}]*right:\s*1rem;[^}]*bottom:\s*auto;[^}]*\}/,
    );
  });

  it('keeps short-height campaign content below the header with a bounded console scroll surface', () => {
    expect(css).toMatch(
      /@media\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.main-menu-opening__workspace\s*\{[^}]*min-height:\s*auto;[^}]*align-items:\s*start;[^}]*padding:\s*1\.5rem\s+0;[^}]*\}/,
    );
    expect(css).toMatch(
      /@media\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.main-menu-opening__console\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*calc\(100vh\s*-\s*10rem\);[^}]*overflow-y:\s*auto;[^}]*\}/,
    );
  });

  it('fits short-height dossier identity and actions inside the bounded console', () => {
    expect(css).toMatch(
      /@media\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.main-menu-opening__console\s*\{[^}]*padding:\s*1\.25rem;[^}]*\}/,
    );
    expect(css).toMatch(
      /@media\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.command-dossier__rows\s*\{[^}]*max-height:\s*calc\(100vh\s*-\s*24rem\);[^}]*\}/,
    );
    expect(css).toMatch(
      /@media\s*\(max-height:\s*760px\)\s*\{[\s\S]*?\.command-mode-list\s*\{[^}]*margin-top:\s*1rem;[^}]*\}[\s\S]*?\.command-console-footer\s*\{[^}]*margin-top:\s*1rem;[^}]*\}/,
    );
  });
});
