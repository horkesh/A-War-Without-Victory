import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('presidential toolbar summary action', () => {
  it('does not pass the React click event as a summary focus section', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    const toolbarStart = source.indexOf('<PresidentialToolbar');
    const toolbarEnd = source.indexOf('/>', toolbarStart);
    const toolbarProps = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarProps).toContain('onOpenSummary={() => openSummary()}');
    expect(toolbarProps).not.toContain('onOpenSummary={openSummary}');
  });

  it('auto-mounts the onboarding deck but keeps the legacy first-turn surfaces retired (task #77)', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    // Task #77 re-enabled the first-run auto-mount of the onboarding deck.
    expect(source).toContain('<OnboardingOverlayWrapper />');
    // The legacy first-turn orientation surfaces stay retired.
    expect(source).not.toContain('FirstTurnOrientationWrapper');
    expect(source).not.toContain('FirstTurnOrientationCard');
  });

  it('routes informational inbox situation cards and desk actions into the Presidential Desk', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');
    const inbox = readFileSync('src/ui/map/components/PresidentialInbox.tsx', 'utf8');
    const registry = readFileSync('src/ui/map/data/decisionSurfaceRegistry.ts', 'utf8');

    expect(source).toContain("if (action === 'army_hq_briefing')");
    expect(source).toContain("if (action === 'decision_room')");
    expect(source).toContain('setWarroomDeskOpen(true)');
    expect(source).toContain('setWarroomDecisionRoomOpen(false)');
    expect(inbox).toContain('onClick={() => onAction(item.action, item.id)}');
    expect(inbox).toContain("onAction('decision_room', 'opening-brief:desk')");
    expect(inbox).toContain("onAction('decision_room', 'empty:desk')");
    expect(inbox).not.toContain("onAction('army_hq_briefing', 'opening-brief:desk')");
    expect(inbox).not.toContain("onAction('army_hq_briefing', 'empty:desk')");
    expect(inbox).not.toContain('onClick={() => {}}');
    expect(registry).toContain("actionLabel: \"Open President's Desk\"");
    expect(registry).not.toContain("actionLabel: 'War summary'");
  });
});
