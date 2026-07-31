import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readApp(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/App.tsx'), 'utf8');
}

describe('presidential modal stack priority', () => {
  it('does not auto-launch event decisions over an active peace plan modal', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('const handleEventAcknowledge'),
    );

    expect(autoLaunchEffect).toContain('if (showPeacePlanModal) return;');
    expect(autoLaunchEffect).toContain('showPeacePlanModal');
  });

  it('does not mount event decisions behind the turn aftermath modal', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('const handleEventAcknowledge'),
    );
    const modalRenderBlock = app.slice(
      app.indexOf('{activeEventDecisionId !== null'),
      app.indexOf('<ConvoyDecisionModal'),
    );

    expect(autoLaunchEffect).toContain('if (turnAftermathOpen) return;');
    expect(autoLaunchEffect).toContain('turnAftermathOpen,');
    expect(modalRenderBlock).toContain('activeEventDecisionId !== null && !turnAftermathOpen');
  });

  it('does not mount a peace plan underneath turn aftermath', () => {
    const app = readApp();
    const peacePlanComponentIndex = app.indexOf('<PeacePlanModal');
    const peacePlanRenderBlock = app.slice(
      Math.max(0, peacePlanComponentIndex - 240),
      app.indexOf('<ParamilitaryReviewModal'),
    );

    expect(peacePlanComponentIndex).toBeGreaterThanOrEqual(0);
    expect(peacePlanRenderBlock).toContain('!turnAftermathOpen');
  });

  it('does not mount informational event essays behind presidential blockers or aftermath', () => {
    const app = readApp();
    const eventModalRenderBlock = app.slice(
      app.indexOf('{eventQueue.length > 0'),
      app.indexOf('{/* v0.5.0: Peace Plan Modal'),
    );

    expect(app).toContain('const requiredPlayerEventDecisionPending = (loadedGameState?.pendingEventDecisions ?? [])');
    expect(app).toContain('decision.faction === playerFaction && isRequiredPendingEventDecision(decision)');
    expect(eventModalRenderBlock).toContain('!presidentialBlockingSurfaceActive');
    expect(eventModalRenderBlock).toContain('!requiredPlayerEventDecisionPending');
    expect(eventModalRenderBlock).toContain('activeEventDecisionId === null');
    expect(eventModalRenderBlock).toContain('!turnAftermathOpen');
  });

  it('acknowledges turn aftermath before opening Warroom advance review', () => {
    const app = readApp();
    const navigateStart = app.indexOf('onNavigate={(command) =>');
    const advanceStart = app.indexOf("if (command.kind === 'advance-turn')", navigateStart);
    const applyIndex = app.indexOf('applyShellCommand(command);', advanceStart);
    const advanceBlock = app.slice(advanceStart, applyIndex);

    expect(navigateStart).toBeGreaterThanOrEqual(0);
    expect(advanceStart).toBeGreaterThan(navigateStart);
    expect(advanceBlock).toContain('if (turnAftermathOpen)');
    expect(advanceBlock).toContain('setTurnAftermathOpen(false);');
  });
});
