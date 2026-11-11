import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

describe('DirectiveCard instruction readability', () => {
  it('wraps the full operation instruction in both command-bridge branches', () => {
    const source = withoutComments(readFileSync('src/ui/map/components/army_hq/DirectiveCard.tsx', 'utf8'));
    const wrappingClass = 'className="mt-1 break-words text-[17px] font-semibold leading-snug text-text-primary"';

    expect(source.split(wrappingClass).length - 1).toBe(2);
    expect(source).not.toContain('truncate text-[17px]');
  });
});
