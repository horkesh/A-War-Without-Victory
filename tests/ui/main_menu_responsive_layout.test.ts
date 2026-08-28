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
});
