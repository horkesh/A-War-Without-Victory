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
    expect(source).not.toContain("{pendingReviews +");
    expect(source).not.toContain('OfficerEventBadge');
    expect(source).not.toContain('pendingOfficerEvents: boolean;');
    expect(source).not.toContain('pendingDecisions: number;');
  });

  it('gives reserve pressure one distinct army-level toolbar signal without folding it into presidential review', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('reserveAttention?: {');
    expect(source).toContain('leadCriticalReason?: string;');
    expect(source).toContain('getArmyReserveToolbarSignal');
    expect(source).toContain('reserveSignal.label');
    expect(source).not.toContain("{pendingReviews +");
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

  it('keeps reserve requests outside presidential review and makes the handoff explicit', () => {
    const modalSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/ArmyHQModal.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const adapterSource = readFileSync(
      new URL('../src/ui/map/data/GameStateAdapter.ts', import.meta.url),
      'utf8',
    );

    expect(adapterSource).toContain('deriveArmyReserveQueue');
    expect(panelSource).toContain('Army Reserve Requests');
    expect(panelSource).toContain('getArmyReserveAttentionSummary');
    expect(panelSource).toContain('Open Reserve Desk');
    expect(modalSource).toContain('setSelectedArmyHqId');
  });

  it('keys Warroom review signaling from the canonical presidential review queue', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/warroom/WarroomStatusBar.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('loadedGameState.presidentialReviewQueue?.pendingCount');
    expect(source).not.toContain('loadedGameState.pendingEventDecisions?.length');
  });
});
