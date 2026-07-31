import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldShowOpeningBrief } from '../../src/ui/map/data/openingBriefGate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readApp(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/App.tsx'), 'utf8');
}

function readPresidentialAttentionPanel(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx'), 'utf8');
}

function readEventDecisionModal(): string {
  return readFileSync(join(__dirname, '../../src/ui/map/components/EventDecisionModal.tsx'), 'utf8');
}

describe('event decision modal auto-launch contract', () => {
  it('exposes the exact visible event identity to QA on the response rail', () => {
    const modal = readEventDecisionModal();

    expect(modal).toContain('data-event-id={localizedDecision.event_id}');
    expect(modal).not.toContain('data-event-id={decision.event_id}');
  });

  it('auto-opens pending player event decisions directly from pendingEventDecisions', () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('const handleEventAcknowledge'),
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
      app.indexOf('const handleEventAcknowledge'),
    );

    expect(autoLaunchEffect).toContain('if (peaceWarTransitionActive) return;');
    expect(autoLaunchEffect).toContain('peaceWarTransitionActive,');
    expect(autoLaunchEffect.indexOf('if (peaceWarTransitionActive) return;')).toBeLessThan(
      autoLaunchEffect.indexOf('selectNextPendingEventDecision'),
    );
  });

  it("defers event decision auto-launch until the President's Desk opening brief is cleared", () => {
    const app = readApp();
    const autoLaunchEffect = app.slice(
      app.indexOf('auto-launch the EventDecisionModal'),
      app.indexOf('const handleEventAcknowledge'),
    );

    expect(autoLaunchEffect).toContain('if (openingBriefPending) return;');
    expect(autoLaunchEffect).toContain('openingBriefPending,');
    expect(autoLaunchEffect.indexOf('if (openingBriefPending) return;')).toBeLessThan(
      autoLaunchEffect.indexOf('selectNextPendingEventDecision'),
    );
  });

  it('keeps the opening brief visible ahead of a required foundational decision', () => {
    const app = readApp();
    const blockingSurfaceBlock = app.slice(
      app.indexOf('const openingBriefPending = shouldShowOpeningBrief'),
      app.indexOf('const onboardingBlockingOverlayActive'),
    );

    expect(blockingSurfaceBlock).toContain(
      '(requiredPlayerEventDecisionPending && !openingBriefPending) ||',
    );
    expect(blockingSurfaceBlock.indexOf('const openingBriefPending')).toBeLessThan(
      blockingSurfaceBlock.indexOf('const presidentialBlockingSurfaceActive'),
    );
  });

  it('does not let the opening brief gate hide pending decisions on later-turn loads', () => {
    expect(shouldShowOpeningBrief({ turn: 0, player_faction: 'RBiH' } as any, false)).toBe(true);
    expect(shouldShowOpeningBrief({ turn: 12, player_faction: 'RBiH' } as any, false)).toBe(false);
    expect(shouldShowOpeningBrief({ turn: 0, player_faction: 'RBiH' } as any, true)).toBe(false);
    expect(shouldShowOpeningBrief({ turn: 0, player_faction: null } as any, false)).toBe(false);
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

  it('auto-launch selector ignores advisory event decisions', () => {
    const app = readApp();
    const selectorBlock = app.slice(
      app.indexOf('function selectNextPendingEventDecision'),
      app.indexOf('/**', app.indexOf('function selectNextPendingEventDecision')),
    );

    expect(selectorBlock).toContain('isRequiredPendingEventDecision');
    expect(selectorBlock).toContain('.filter(isRequiredPendingEventDecision)');
  });

  it('keeps the modal open unless IPC accepts the response', () => {
    const app = readApp();
    const modalRenderBlock = app.slice(
      app.indexOf('<EventDecisionModal'),
      app.indexOf('<ConvoyDecisionModal'),
    );

    expect(modalRenderBlock).toContain('const result = await ipc.respondToEventDecision(eventId, responseId)');
    expect(modalRenderBlock).toContain('setActionReceiptMessage');
    expect(modalRenderBlock).toContain("t('firedEvent.wrapper.responseRecorded'");
    expect(modalRenderBlock).toContain('if (result.ok === true)');
    expect(modalRenderBlock).toContain('setActiveEventDecisionId(null)');
  });

  it('renders the durable action receipt on an opaque non-intercepting surface', () => {
    const app = readApp();
    const receiptBlock = app.slice(
      app.indexOf('data-testid="action-receipt-toast"'),
      app.indexOf('{actionReceiptMessage}', app.indexOf('data-testid="action-receipt-toast"')),
    );

    expect(receiptBlock).toContain('pointer-events-none');
    expect(receiptBlock).toContain('border-emerald-400/45 bg-[#10151d] px-4');
    expect(receiptBlock).not.toContain('bg-[#10151d]/');
  });

  it('logs raw browser fallback event-decision errors while showing generic player copy', () => {
    const app = readApp();
    const modalRenderBlock = app.slice(
      app.indexOf('<EventDecisionModal'),
      app.indexOf('<ConvoyDecisionModal'),
    );

    expect(modalRenderBlock).toContain('resolveBrowserEventDecision(nextState, eventId, responseId)');
    expect(modalRenderBlock).toContain('console.warn(\'[EventDecisionModal] browser fallback failed\', err)');
    expect(modalRenderBlock).toContain('setLoadError(\'Failed to record event decision.\')');
    expect(modalRenderBlock).toContain('errorMessage={loadError}');
    expect(modalRenderBlock).toContain('onDismissError={dismissActiveEventDecisionError}');
    expect(app).toContain('const dismissActiveEventDecisionError = () => {');
    expect(app).toContain('setActiveEventDecisionId(null);');
    expect(app).toContain('setLoadError(null);');
    expect(modalRenderBlock).not.toContain('setLoadError(err instanceof Error ? err.message : String(err))');
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

  it('queues non-decision event essays only for the latest turn and remembers shown ids', () => {
    const app = readApp();
    const eventQueueEffect = app.slice(
      app.indexOf('detect new events from game state and queue for display'),
      app.indexOf('const pendingPeacePlan = loadedGameState?.pendingPeacePlan'),
    );

    expect(eventQueueEffect).toContain('shownEventModalIds');
    expect(eventQueueEffect).toContain('e.turn === loadedGameState.turn');
    expect(eventQueueEffect).toContain('setShownEventModalIds');
    expect(eventQueueEffect).not.toContain('!acknowledgedEventIds.has(e.id) && !e.isDecision');
  });

  it('retains acknowledged event ids across ordinary state projection updates', () => {
    const app = readApp();

    expect(app).not.toContain('const stateFingerprint = useGameStore((s) => s.lastLoadedStateFingerprint)');
    expect(app).toContain('const resetCampaignScopedUiState = useCallback(() => {');
    expect(app).toContain('setShownEventModalIds(new Set());');
    expect(app).toContain('setEventQueue([]);');
    expect(app).toContain('setEventQueueIndex(0);');
    expect(app).toMatch(/handleSelectFaction[\s\S]*resetCampaignScopedUiState\(\)/);
    expect(app).toMatch(/handleMainMenuLoadGame[\s\S]*resetCampaignScopedUiState\(\)/);
    expect(app).toMatch(/awwv-shell:fresh-campaign-started[\s\S]*resetCampaignScopedUiState\(\)/);
  });

  it('keeps non-decision event essays visible until the player acknowledges them', () => {
    const app = readApp();
    const queueDismissalBlock = app.slice(
      app.indexOf('const pendingPeacePlan = loadedGameState?.pendingPeacePlan'),
      app.indexOf('const handleEventAcknowledge'),
    );

    expect(queueDismissalBlock).not.toContain('setTimeout');
    expect(queueDismissalBlock).not.toContain('setEventQueue([])');
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

  it('passes Codex signal event ids through to the Codex panel selector', () => {
    const app = readApp();

    expect(app).toContain('setRequestedCodexEventId');
    expect(app).toContain('onOpenCodex={(eventId) => {');
    expect(app).toContain('requestedEventId={requestedCodexEventId}');
  });
});
