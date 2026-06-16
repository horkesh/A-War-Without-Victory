import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readApp(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/App.tsx'), 'utf8');
}

function readPresidentialAttentionPanel(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx'), 'utf8');
}

describe('event decision modal auto-launch contract', () => {
  it('auto-opens pending player event decisions directly from pendingEventDecisions', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('// Auto-dismiss non-decision events'),
    );

    expect(autoLaunchEffect).toContain('selectNextPendingEventDecision');
    expect(autoLaunchEffect).toContain('setActiveEventDecisionId(nextDecision.event_id)');
    expect(autoLaunchEffect).not.toContain('setAppScreen(\'warroom\')');
    expect(autoLaunchEffect).not.toContain('openArmyHQTab');
  });

  it('defers event decision auto-launch while the war-start transition is active', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('// Auto-dismiss non-decision events'),
    );

    expect(autoLaunchEffect).toContain('if (peaceWarTransitionActive) return;');
    expect(autoLaunchEffect).toContain('peaceWarTransitionActive,');
    expect(autoLaunchEffect.indexOf('if (peaceWarTransitionActive) return;')).toBeLessThan(
      autoLaunchEffect.indexOf('selectNextPendingEventDecision'),
    );
  });

  it('renders the selected pending event decision payload as the primary modal surface', () => {
    const app = readApp();
    const modalRenderBlock = app.slice(
      app.indexOf('{activeEventDecisionId !== null'),
      app.indexOf('<ConvoyDecisionModal'),
    );

    expect(modalRenderBlock).toContain('(loadedGameState?.pendingEventDecisions ?? [])');
    expect(modalRenderBlock).toContain('d.event_id === activeEventDecisionId && d.faction === playerFaction');
    expect(modalRenderBlock).toContain('<EventDecisionModal');
    expect(modalRenderBlock).toContain('decision={decision}');
    expect(modalRenderBlock).not.toContain('PresidentialAttentionPanel');
    expect(modalRenderBlock).not.toContain('PresidentDeskShell');
    expect(modalRenderBlock).not.toContain('openPresidentialDecisionRoomNavigationTarget');
  });

  it('orders multiple pending decisions by required/blocking status, turn, then event id without a once-per-turn gate', () => {
    const app = readApp();

    expect(app).toContain('function comparePendingEventDecisionPriority');
    expect(app).toContain('requires_player_response');
    expect(app).toContain('a.turn_fired - b.turn_fired');
    expect(app).toContain('a.event_id < b.event_id');
    expect(app).not.toContain('lastAutoLaunchTurn');
  });

  it('keeps the modal open unless IPC accepts the response', () => {
    const app = readApp();
    const modalRenderBlock = app.slice(
      app.indexOf('<EventDecisionModal'),
      app.indexOf('<ConvoyDecisionModal'),
    );

    expect(modalRenderBlock).toContain('const result = await ipc.respondToEventDecision(eventId, responseId)');
    expect(modalRenderBlock).toContain('if (result.ok === true)');
    expect(modalRenderBlock).toContain('setActiveEventDecisionId(null)');
  });

  it('clears stale active modal state from effects rather than during render', () => {
    const app = readApp();
    const modalRenderBlock = app.slice(
      app.indexOf('{activeEventDecisionId !== null'),
      app.indexOf('onRespond={async'),
    );

    expect(app).toContain('setActiveEventDecisionId(null);');
    expect(app).toContain('useEffect(() => {');
    expect(modalRenderBlock).not.toContain('// Decision already resolved or filtered out');
    expect(modalRenderBlock).not.toContain('setActiveEventDecisionId(null);');
  });

  it('keeps PresidentialAttentionPanel as a summary surface, not an event response executor', () => {
    const panel = readPresidentialAttentionPanel();
    const pendingDecisionBlock = panel.slice(
      panel.indexOf('{pendingDecisions.length > 0'),
      panel.indexOf('{reviewQueue && reviewQueue.commandInterpretationCount > 0'),
    );

    expect(panel).not.toContain('respondToEventDecision');
    expect(pendingDecisionBlock).not.toContain('decision.response_options.map');
    expect(pendingDecisionBlock).not.toContain('handleDecisionResponse');
  });
});
