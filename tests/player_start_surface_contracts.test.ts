// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import { startNewCampaign } from '../src/desktop/desktop_sim';
import { resolveEventDecision } from '../src/sim/events/resolve_decision';
import { EventDecisionModal } from '../src/ui/map/components/EventDecisionModal';
import type { DimensionShift, EventDefinition, EventEffect, PendingEventDecision } from '../src/sim/events/event_types';
import { isDisplayEventEffect } from '../src/ui/map/utils/eventEffectDisplay';
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

function signedDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function factionLabel(faction: string | undefined): string {
  return ({ RBiH: 'Republic of Bosnia and Herzegovina', RS: 'Republika Srpska', HRHB: 'Herzeg-Bosna' } as Record<string, string>)[faction ?? ''] ?? faction ?? '';
}

function dimensionLabel(dimension: string): string {
  return ({
    military_credibility: 'Military Credibility', territorial_legitimacy: 'Territorial Legitimacy',
    international_standing: "Int'l Standing", patron_confidence: 'Patron Confidence',
    internal_cohesion: 'Internal Cohesion', negotiating_leverage: 'Negotiating Leverage',
  } as Record<string, string>)[dimension] ?? dimension;
}

function displayedEffectRow(effect: EventEffect): string | null {
  if (!isDisplayEventEffect(effect) || effect.kind === 'narrative') return null;
  if (effect.kind === 'morale_change') return `${factionLabel(effect.faction)} morale ${signedDelta(effect.delta)}`;
  if (effect.kind === 'alliance_change') return `${factionLabel('RBiH')} / ${factionLabel('HRHB')} alliance ${signedDelta(effect.delta)}`;
  if (effect.kind === 'aggression_modifier') return `${factionLabel(effect.faction)} operational aggression ${signedDelta(effect.delta)} for ${effect.duration_turns} turns`;
  throw new Error(`Unhandled display-safe foundational effect: ${effect.kind}`);
}

function displayedDimensionRow(shift: DimensionShift): string {
  return `${factionLabel(shift.faction)} ${dimensionLabel(shift.dimension)} ${signedDelta(shift.delta)}`;
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
        for (const effect of option.effects ?? []) {
          const row = displayedEffectRow(effect);
          if (row) expect(container.textContent, `${flow.eventId}:${option.id}:${effect.kind}`).toContain(row);
        }
        for (const shift of option.dimension_shifts ?? []) {
          expect(container.textContent, `${flow.eventId}:${option.id}:${shift.faction}:${shift.dimension}`)
            .toContain(displayedDimensionRow(shift));
        }
      }
      for (const pattern of FORBIDDEN_PRE_CHOICE_PATTERNS) {
        expect(container.textContent).not.toMatch(pattern);
      }
      expect(screen.queryByRole('button', { name: /Show details/i })).toBeNull();
      unmount();
    }
  });

  it('renders the real policy decision with complete authored content and no implicit response', () => {
    const catalog = eventCatalog();
    const policy = catalog.get('rbih_paramilitary_policy_1992')!;
    const onRespond = vi.fn();
    const { container } = render(React.createElement(EventDecisionModal, {
      decision: pendingDecisionFromEvent(policy),
      eventCatalog: catalog,
      onRespond,
    }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(container.textContent).toContain(policy.source_note);
    expect(pendingDecisionFromEvent(policy).historical_source).toBe(policy.historical_source);
    for (const option of policy.response_options ?? []) {
      expect(container.textContent).toContain(option.label);
      expect(container.textContent).toContain(option.description);
      for (const effect of option.effects ?? []) {
        const row = displayedEffectRow(effect);
        if (row) expect(container.textContent, `${policy.id}:${option.id}:${effect.kind}`).toContain(row);
      }
      for (const shift of option.dimension_shifts ?? []) {
        expect(container.textContent, `${policy.id}:${option.id}:${shift.faction}:${shift.dimension}`)
          .toContain(displayedDimensionRow(shift));
      }
      const button = screen.getByRole('button', { name: `Choose response: ${option.label}` });
      expect((button as HTMLButtonElement).disabled).toBe(false);
      button.focus();
      expect(onRespond).not.toHaveBeenCalled();
    }
    expect(policy.response_options?.map((option) => option.historical_marker)).toEqual([
      'historical_default', 'counterfactual', 'counterfactual',
    ]);
    expect(container.textContent).toMatch(/Historical default/i);
    expect(container.textContent).toMatch(/historically attested choice/i);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onRespond).not.toHaveBeenCalled();
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
        const beforeDimensions = structuredClone(nextState.military.negotiation!.strategic_dimensions!);
        resolveEventDecision(nextState, flow.eventId, option.id);
        expect(nextState.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(nextState.military.event_decision_log?.at(-1)).toMatchObject({
          event_id: flow.eventId,
          response_id: option.id,
          decision_source: 'player',
        });
        for (const shift of option.dimension_shifts ?? []) {
          const targetFaction = shift.faction ?? flow.faction;
          const before = beforeDimensions[targetFaction]![shift.dimension]!.effective_value;
          const after = nextState.military.negotiation!.strategic_dimensions![targetFaction]![shift.dimension]!.effective_value;
          expect(after - before, `${flow.eventId}:${option.id}:${targetFaction}:${shift.dimension}`).toBe(shift.delta);
        }
      }
    }
  });
});
