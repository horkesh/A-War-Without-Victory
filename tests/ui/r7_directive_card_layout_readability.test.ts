import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Directive Card layout readability', () => {
  it('truncates every action branch while preserving its full title', () => {
    const source = readFileSync('src/ui/map/components/army_hq/DirectiveCard.tsx', 'utf8');

    // Command Surface size (owner redesign 2026-11-10): 48 px buttons, still truncating.
    expect(source.match(/className="h-12 min-w-0 truncate whitespace-nowrap/g)).toHaveLength(4);
    expect(source).toContain("title={isReviewProposal ? t('directive.button.cancelShort') : t('directive.button.cancel')}");
  });
});
