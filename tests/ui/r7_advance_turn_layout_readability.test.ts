import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Advance Turn layout readability', () => {
  it('lets metric labels use two lines and exposes the full label', () => {
    const source = readFileSync('src/ui/map/components/warroom/AdvanceTurnModal.tsx', 'utf8');

    expect(source).toContain('title={label}');
    expect(source).toContain('line-clamp-2 text-xs font-bold uppercase leading-tight tracking-[0.08em]');
    expect(source).not.toContain('className="truncate text-xs font-bold uppercase tracking-[0.14em] text-text-muted"');
    expect(source).not.toContain('uppercase leading-tight tracking-[0.14em] text-text-muted');
  });
});
