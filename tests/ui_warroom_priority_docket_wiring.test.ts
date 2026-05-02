import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('Warroom priority docket wiring', () => {
  it('renders a compact Warroom docket from the Decision Room pre-advance projection', () => {
    const source = read('../src/ui/map/components/warroom/WarroomStatusBar.tsx');

    expect(source).toContain('buildWarroomPriorityDocketView');
    expect(source).toContain('priorityDocketOpen');
    expect(source).toContain('PriorityDocketPanel');
    expect(source).toContain('Review Before Advance');
    expect(source).toContain('Open Decision Room');
    expect(source).toContain('docket.items.map');
    expect(source).toContain('Source Handoffs');
    expect(source).toContain('docket.sourceHandoffs.map');
  });

  it('routes docket row actions through the same App-owned Decision Room target handler', () => {
    const source = read('../src/ui/map/components/warroom/WarroomStatusBar.tsx');
    const app = read('../src/ui/map/App.tsx');

    expect(source).toContain('onReviewItem');
    expect(source).toContain('handleReviewItem');
    expect(source).toContain('onReviewItem?.(item)');
    expect(app).toContain('<WarroomStatusBar');
    expect(app).toContain('onReviewPriorities={reviewPreAdvancePriorities}');
    expect(app).toContain('onReviewItem={reviewPreAdvanceItem}');
  });

  it('keeps the docket as a UI read model without combat or nondeterministic imports', () => {
    const model = read('../src/ui/map/data/warroomPriorityDocket.ts');
    const source = read('../src/ui/map/components/warroom/WarroomStatusBar.tsx');
    const combined = `${model}\n${source}`;

    expect(model).toContain('buildPreAdvanceCommandReviewView');
    expect(model).toContain('sourceHandoffSummary');
    expect(model).toContain('sourceHandoffs');
    expect(model).not.toMatch(/from ['"].*src\/sim\/combat/);
    expect(combined).not.toMatch(/src\/sim\/combat|sim\\combat|triggered|rupture|drina|srebrenica|krivaja/i);
    expect(combined).not.toContain('Math.random');
    expect(combined).not.toContain('Date.now');
    expect(combined).not.toContain('new Date');
    expect(combined).not.toContain('performance.now');
    expect(combined).not.toContain('crypto.randomUUID');
    expect(combined).not.toContain('localeCompare');
  });
});
