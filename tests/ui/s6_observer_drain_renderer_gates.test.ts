/**
 * §6 mechanics item 6, renderer half (#851 review). At Observer a required card the drain answers must not hold the
 * player in the renderer either: no blocking inbox item, no pre-Advance block, no auto-opened EventDecisionModal and
 * no toolbar lock. The renderer reads the classification from GameStateAdapter (`observer_drainable`), which calls the
 * SAME predicate as the manifest's Advance gate and the drain; there is no second copy of the rule.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { deriveInboxItems, hasBlockingItems } from '../../src/ui/map/data/inboxItems.js';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview.js';
import { isRequiredPendingEventDecision, selectNextPendingEventDecision } from '../../src/ui/map/data/eventDecisionRouting.js';
import { listBlockingPlayerDecisions } from '../../src/state/player_decision_manifest.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const WITH_DEFAULT = 's6_render_with_default';
const NO_DEFAULT = 's6_render_no_default';

function card(eventId: string, withDefault: boolean) {
  return {
    event_id: eventId,
    event_title: eventId,
    turn_fired: 8,
    faction: 'RS',
    requires_player_response: true,
    ...(withDefault ? { historical_default_response_id: 'hold' } : {}),
    response_options: [
      { id: 'hold', label: 'Hold', effects: [] },
      { id: 'yield', label: 'Yield', effects: [] },
    ],
  };
}

function rawSave(autonomy: number, cards: ReturnType<typeof card>[]) {
  return {
    meta: { turn: 9, phase: 'war', player_faction: 'RS', autonomy_level: autonomy },
    political: { political_controllers: {}, initial_political_controllers: {} },
    military: {
      formations: {},
      fired_event_ids: cards.map((row) => row.event_id),
      pending_event_decisions: cards,
      event_decision_log: [],
      event_causality_log: [],
    },
  };
}

afterEach(() => setLocale('en'));

describe('§6 item 6 renderer: a card the Observer drain answers does not hold the player', () => {
  it('the adapter flags exactly the rows the manifest stopped blocking (one predicate)', () => {
    const raw = rawSave(3, [card(WITH_DEFAULT, true), card(NO_DEFAULT, false)]);
    const loaded = parseGameState(raw);
    const flagged = (loaded.pendingEventDecisions ?? []).filter((row) => row.observer_drainable === true).map((row) => row.event_id);
    expect(flagged).toEqual([WITH_DEFAULT]);
    const manifestBlocking = listBlockingPlayerDecisions(raw as never, 'RS')
      .filter((item) => item.familyId === 'event_decision')
      .map((item) => item.id);
    expect(manifestBlocking).toEqual([NO_DEFAULT]);
    expect((loaded.pendingEventDecisions ?? []).filter(isRequiredPendingEventDecision).map((row) => row.event_id))
      .toEqual(manifestBlocking);
  });

  it('inbox: the drained card is a normal item, the card with no default stays blocking', () => {
    const loaded = parseGameState(rawSave(3, [card(WITH_DEFAULT, true), card(NO_DEFAULT, false)]));
    const items = deriveInboxItems(loaded, null);
    expect(items.find((item) => item.id === `event:${WITH_DEFAULT}`)?.severity).toBe('normal');
    expect(items.find((item) => item.id === `event:${NO_DEFAULT}`)?.severity).toBe('blocking');
    expect(hasBlockingItems(deriveInboxItems(parseGameState(rawSave(3, [card(WITH_DEFAULT, true)])), null))).toBe(false);
  });

  it('pre-Advance review: Observer with only a drained card does not block; Full Control and Delegate still do', () => {
    expect(buildPreAdvanceCommandReviewView({ state: parseGameState(rawSave(3, [card(WITH_DEFAULT, true)])) }).blockingDecisionCount).toBe(0);
    for (const level of [0, 1, 2]) {
      expect(buildPreAdvanceCommandReviewView({ state: parseGameState(rawSave(level, [card(WITH_DEFAULT, true)])) }).blockingDecisionCount).toBe(1);
    }
    expect(buildPreAdvanceCommandReviewView({ state: parseGameState(rawSave(3, [card(NO_DEFAULT, false)])) }).blockingDecisionCount).toBe(1);
  });

  it('auto-launch: the modal never auto-opens on a drained card; it opens the card with no default', () => {
    const drainedOnly = parseGameState(rawSave(3, [card(WITH_DEFAULT, true)]));
    expect(selectNextPendingEventDecision(drainedOnly.pendingEventDecisions, 'RS')).toBeNull();
    const both = parseGameState(rawSave(3, [card(WITH_DEFAULT, true), card(NO_DEFAULT, false)]));
    expect(selectNextPendingEventDecision(both.pendingEventDecisions, 'RS')?.event_id).toBe(NO_DEFAULT);
    const delegate = parseGameState(rawSave(2, [card(WITH_DEFAULT, true)]));
    expect(selectNextPendingEventDecision(delegate.pendingEventDecisions, 'RS')?.event_id).toBe(WITH_DEFAULT);
  });

  it('App reads the blocking classification only through isRequiredPendingEventDecision (auto-open and toolbar lock)', () => {
    const app = readFileSync(join(__dirname, '../../src/ui/map/App.tsx'), 'utf8');
    expect(app).not.toContain('requires_player_response');
    expect(app).toContain("isRequiredPendingEventDecision(decision)");
    expect(app).toContain('selectNextPendingEventDecision(');
  });
});
