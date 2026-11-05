import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

describe('DirectiveCard instruction readability', () => {
  it('wraps the full operation instruction in both command-bridge branches', () => {
    const source = withoutComments(readFileSync('src/ui/map/components/army_hq/DirectiveCard.tsx', 'utf8'));
    const wrappingClass = 'className="mt-0.5 break-words text-xs font-bold leading-snug text-text-primary"';

    expect(source.match(new RegExp(wrappingClass, 'g')) ?? []).toHaveLength(2);
    expect(source).not.toContain('className="mt-0.5 truncate text-xs font-bold text-text-primary"');
  });
});
