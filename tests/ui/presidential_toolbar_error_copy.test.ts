import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PresidentialToolbar load-error copy', () => {
  it('renders load errors through the player-facing error sanitizer', () => {
    const source = readFileSync('src/ui/map/components/PresidentialToolbar.tsx', 'utf8');

    expect(source).toContain("import { playerFacingErrorCopy } from '../utils/errorCopy'");
    expect(source).toContain('{playerFacingErrorCopy(loadError)}');
    expect(source).not.toContain('{loadError}');
  });
});
