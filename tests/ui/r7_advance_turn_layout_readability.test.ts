import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Advance Turn layout readability', () => {
  it('lets metric labels use two lines and exposes the full label', () => {
    const source = readFileSync('src/ui/map/components/warroom/AdvanceTurnModal.tsx', 'utf8');

    // Surface redesign 2026-11-10: figures are full-width label/value rows in plain words;
    // the label wraps freely and keeps its title.
    expect(source).toContain('title={label}');
    expect(source).toContain('<SurfaceStat label={<span title={label}>{label}</span>}');
    expect(source).not.toContain('text-xs');
    expect(source).not.toContain('truncate');
    expect(source).not.toContain('className="truncate text-xs font-bold uppercase tracking-[0.14em] text-text-muted"');
    expect(source).not.toContain('uppercase leading-tight tracking-[0.14em] text-text-muted');
  });
});
