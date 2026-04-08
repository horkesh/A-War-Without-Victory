import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Army HQ / presidential review coherence', () => {
  it('routes the tactical toolbar through one canonical pending review signal', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('pendingReviews: number;');
    expect(source).toContain("{pendingReviews} {pendingReviews === 1 ? 'REVIEW' : 'REVIEWS'}");
    expect(source).not.toContain('OfficerEventBadge');
    expect(source).not.toContain('pendingOfficerEvents: boolean;');
    expect(source).not.toContain('pendingDecisions: number;');
  });

  it('makes Army HQ briefing explicitly own the live military review queue', () => {
    const modalSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/ArmyHQModal.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );

    expect(modalSource).toContain('PresidentialAttentionPanel');
    expect(panelSource).toContain('PRESIDENTIAL ATTENTION');
    expect(panelSource).toContain('This queue owns live military review work. Situation briefing below is context, not the action queue.');
    expect(panelSource).toContain('Presidential Decisions');
    expect(panelSource).toContain('Command Reactions');
    expect(panelSource).toContain('Personnel Directives');
  });
});
