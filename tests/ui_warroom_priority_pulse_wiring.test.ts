import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('Warroom priority pulse wiring', () => {
  it('projects Decision Room readiness into the Warroom status bar', () => {
    const source = read('../src/ui/map/components/warroom/WarroomStatusBar.tsx');

    expect(source).toContain('buildPreAdvanceCommandReviewView');
    expect(source).toContain('loadedGameState.presidentialReviewQueue?.pendingCount');
    expect(source).toContain('osidDisplayNames');
    expect(source).toContain('advanceReviewCount');
    expect(source).toContain('urgentCount');
    expect(source).toContain('Review priorities');
    expect(source).toContain('onReviewPriorities');
  });

  it('routes the status-bar priority action through the App shell into Army HQ briefing', () => {
    const app = read('../src/ui/map/App.tsx');

    expect(app).toContain('const reviewPreAdvancePriorities');
    expect(app).toContain('<WarroomStatusBar onReviewPriorities={reviewPreAdvancePriorities} />');
    expect(app).toContain("openArmyHQTab(gs, 'briefing')");
    expect(app).toContain("setAppScreen('game')");
  });

  it('keeps the Warroom pulse out of combat and nondeterministic code paths', () => {
    const source = read('../src/ui/map/components/warroom/WarroomStatusBar.tsx');

    expect(source).not.toMatch(/src\/sim\/combat|sim\\combat|triggered|rupture|drina|srebrenica|krivaja/i);
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('new Date');
    expect(source).not.toContain('performance.now');
    expect(source).not.toContain('crypto.randomUUID');
    expect(source).not.toContain('localeCompare');
  });
});
