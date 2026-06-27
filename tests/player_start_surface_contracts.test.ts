// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { startNewCampaign } from '../src/desktop/desktop_sim';
import { resolveEventDecision } from '../src/sim/events/resolve_decision';
import { EventDecisionModal } from '../src/ui/map/components/EventDecisionModal';
import type { EventDefinition, PendingEventDecision } from '../src/sim/events/event_types';
import war1992Events from '../data/scenarios/events/war_1992.json';

const FOUNDATIONAL_FLOWS = [
  { faction: 'RBiH', eventId: 'rbih_state_identity' },
  { faction: 'RS', eventId: 'rs_strategic_goals' },
  { faction: 'HRHB', eventId: 'hrhb_political_goal' },
] as const;

const FORBIDDEN_PRE_CHOICE_PATTERNS = [
  /Downstream impact preview/i,
  /long-term branch/i,
  /Future consequences/i,
  /\bShow details\b/i,
  /\bcsq_[a-z0-9_]+\b/i,
  /\bfuture_consequences\b/i,
  /\bopens_events\b/i,
  /\bcloses_events\b/i,
  /later event may or may not happen/i,
];

afterEach(() => cleanup());

function eventCatalog(): Map<string, EventDefinition> {
  return new Map((war1992Events as EventDefinition[]).map((eventDef) => [eventDef.id, eventDef]));
}

function pendingDecisionFromEvent(eventDef: EventDefinition): PendingEventDecision {
  return {
    event_id: eventDef.id,
    event_title: eventDef.title ?? eventDef.id,
    narrative: eventDef.narrative,
    situation: eventDef.situation,
    staff_assessment: eventDef.staff_assessment,
    trigger_evidence: eventDef.trigger_evidence,
    category: eventDef.category,
    source_note: eventDef.source_note,
    historical_source: eventDef.historical_source,
    turn_fired: 0,
    faction: eventDef.responding_faction ?? 'RBiH',
    historical_default_response_id: eventDef.historical_default_response_id,
    response_options: eventDef.response_options ?? [],
  };
}

describe('player start surface contracts', () => {
  it('the first-hour browser gate asserts against pre-choice player-knowledge leaks', () => {
    const source = readFileSync(resolve('tools/ui/first_hour_browser_gate.cjs'), 'utf8');

    expect(source).toContain('FORBIDDEN_DECISION_LEAK_PATTERNS');
    expect(source).toContain('assertNoDecisionKnowledgeLeaks');
    expect(source).toContain('Downstream impact preview');
    expect(source).toContain('future_consequences');
    expect(source).toContain('csq_');
  });

  it('renders every faction foundational modal without revealing future branches before choice', () => {
    const catalog = eventCatalog();

    for (const flow of FOUNDATIONAL_FLOWS) {
      const eventDef = catalog.get(flow.eventId);
      expect(eventDef, `missing ${flow.eventId}`).toBeTruthy();
      const { container, unmount } = render(React.createElement(EventDecisionModal, {
        decision: pendingDecisionFromEvent(eventDef!),
        eventCatalog: catalog,
        onRespond: () => undefined,
      }));

      expect(container.textContent).toContain(eventDef!.title);
      for (const option of eventDef!.response_options ?? []) {
        expect(container.textContent).toContain(option.label);
      }
      for (const pattern of FORBIDDEN_PRE_CHOICE_PATTERNS) {
        expect(container.textContent).not.toMatch(pattern);
      }
      expect(screen.queryByRole('button', { name: /Show details/i })).toBeNull();
      unmount();
    }
  });

  it('queues only the selected faction foundational decision and resolves every response option', async () => {
    const catalog = eventCatalog();

    for (const flow of FOUNDATIONAL_FLOWS) {
      const eventDef = catalog.get(flow.eventId);
      expect(eventDef, `missing ${flow.eventId}`).toBeTruthy();
      const { state } = await startNewCampaign(resolve('.'), flow.faction, 'apr_1992');
      const pending = state.military.pending_event_decisions ?? [];
      expect(pending.map((decision) => decision.event_id)).toEqual([flow.eventId]);
      expect(pending[0]?.faction).toBe(flow.faction);

      for (const option of eventDef!.response_options ?? []) {
        const nextState = structuredClone(state);
        resolveEventDecision(nextState, flow.eventId, option.id);
        expect(nextState.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(nextState.military.event_decision_log?.at(-1)).toMatchObject({
          event_id: flow.eventId,
          response_id: option.id,
          decision_source: 'player',
        });
      }
    }
  });
});
