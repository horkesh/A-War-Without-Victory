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

  it('keeps first-run onboarding single-owned instead of stacking intro overlays', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(source).toContain('peaceWarTransitionActive');
    expect(source).toContain('onboardingActive');
    expect(source).not.toContain('FirstTurnOrientationWrapper');
    expect(source).not.toContain('FirstTurnOrientationCard');
    expect(source).toContain("appScreen === 'game' && loadedGameState && !peaceWarTransitionActive && <OnboardingOverlayWrapper />");
  });

  it('routes informational inbox situation cards into Army HQ briefing', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');
    const inbox = readFileSync('src/ui/map/components/PresidentialInbox.tsx', 'utf8');

    expect(source).toContain("if (action === 'army_hq_briefing')");
    expect(source).toContain("openArmyHQTab(gs, 'briefing')");
    expect(inbox).toContain('onClick={() => onAction(item.action, item.id)}');
    expect(inbox).not.toContain('onClick={() => {}}');
  });
});
