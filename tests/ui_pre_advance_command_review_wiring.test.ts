import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('pre-advance command review wiring', () => {
  it('keeps the pre-advance synthesis as a Decision Room read-model projection', () => {
    const model = read('../src/ui/map/data/preAdvanceCommandReview.ts');

    expect(model).toContain('buildPreAdvanceCommandReviewView');
    expect(model).toContain('buildPresidentialDecisionRoomView');
    expect(model).toContain('advanceReadiness');
    expect(model).not.toMatch(/from ['"].*src\/sim\/combat/);
    expect(model).not.toMatch(/from ['"].*combat\//);
    expect(model).not.toContain('Math.random');
    expect(model).not.toContain('Date.now');
    expect(model).not.toContain('new Date');
    expect(model).not.toContain('performance.now');
    expect(model).not.toContain('crypto.randomUUID');
    expect(model).not.toContain('localeCompare');
  });

  it('renders Decision Room readiness inside the advance-turn modal', () => {
    const modal = read('../src/ui/map/components/warroom/AdvanceTurnModal.tsx');

    expect(modal).toContain('buildPreAdvanceCommandReviewView');
    expect(modal).toContain('loadedGameState');
    expect(modal).toContain('osidDisplayNames');
    expect(modal).toContain('Review Before Advance');
    expect(modal).toContain('Review Priorities');
    expect(modal).toContain('onReviewPriorities');
    expect(modal).toContain('getTurnAftermathAdvanceDeps');
  });

  it('routes review-priorities action through the App shell into Army HQ briefing', () => {
    const app = read('../src/ui/map/App.tsx');

    expect(app).toContain('const reviewPreAdvancePriorities');
    expect(app).toContain("openArmyHQTab(gs, 'briefing')");
    expect(app).toContain("setAppScreen('game')");
    expect(app).toContain('<AdvanceTurnModal onReviewPriorities={reviewPreAdvancePriorities} />');
  });
});
