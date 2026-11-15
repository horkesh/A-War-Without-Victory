// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import type { EventDefinition, EventEffect, EventResponseOption, DimensionShift } from '../../src/sim/events/event_types.js';
import { buildEventAcceptanceReport } from '../../tools/diagnostics/event_acceptance_report.js';
import { getPlayerSafePoliticalFactionName } from '../../src/ui/map/utils/playerSafeText.js';
import { isDisplayEventEffect } from '../../src/ui/map/utils/eventEffectDisplay.js';
import { displayEventProse, resolveEventSourceLine } from '../../src/ui/map/data/eventDisplayCopy.js';
import { restoreBosnianProperNames } from '../../src/ui/shared/bosnianPlaceNames.js';

afterEach(() => cleanup());

function loadEvent(file: string, eventId: string): EventDefinition {
  const events = JSON.parse(readFileSync(file, 'utf8')) as EventDefinition[];
  const event = events.find((entry) => entry.id === eventId);
  if (!event) throw new Error(`${eventId} not found in ${file}`);
  return event;
}

function humanizeToken(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function sentenceToken(value: string | undefined): string {
  const text = humanizeToken(value).trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function displayFactionName(faction: string | undefined): string {
  switch (faction) {
    case 'RBiH': return 'Republic of Bosnia and Herzegovina';
    case 'RS': return 'Republika Srpska';
    case 'HRHB': return 'Herzeg-Bosna';
    default: return faction ? getPlayerSafePoliticalFactionName(faction) : 'Campaign';
  }
}

function displayDimensionName(dimension: string | undefined): string {
  switch (dimension) {
    case 'military_credibility': return 'Military Credibility';
    case 'territorial_legitimacy': return 'Territorial Legitimacy';
    case 'international_standing': return 'International Standing';
    case 'patron_confidence': return 'Patron Confidence';
    case 'internal_cohesion': return 'Internal Cohesion';
    case 'negotiating_leverage': return 'Negotiating Leverage';
    default: return humanizeToken(dimension);
  }
}

function signedDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}`;
}

// Council fix 4 (C4/C11): state attributes name the state by its canonical short form, army
// attributes name its army; engine shares in [-1, 1] read as whole points.
function stateName(faction: string | undefined): string {
  return faction === 'RBiH' || faction === 'RS' || faction === 'HRHB' ? faction : displayFactionName(faction);
}

function armyName(faction: string | undefined): string {
  return ({ RBiH: 'ARBiH', RS: 'VRS', HRHB: 'HVO' } as Record<string, string>)[faction ?? ''] ?? displayFactionName(faction);
}

function points(share: number): number {
  return Math.round(share * 100);
}

function playerSafeDossierText(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\brbih_state_identity\b/g, 'state identity posture')
    .replace(/\bretain_minorities\b/g, 'civic minority-protection line')
    .replace(/\bmandatory_purge\b/g, 'hardline expulsion line')
    .replace(/\bcsq_[a-z0-9_]+\b/g, 'later consequence branch')
    .replace(/\b[\w./-]+\.json\b/gi, 'source dossier')
    .replace(/\bsource_note\b/g, 'source note')
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => humanizeToken(token).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function describeEffect(effect: EventEffect): string | null {
  const faction = 'faction' in effect ? stateName(effect.faction) : '';
  const army = 'faction' in effect ? armyName(effect.faction) : '';
  switch (effect.kind) {
    case 'narrative': return null;
    case 'morale_change': return `${army} morale ${signedDelta(effect.delta)}`;
    case 'supply_delta': return `${army} supply ${signedDelta(effect.delta)}`;
    case 'cohesion_change': return `${army} cohesion ${signedDelta(effect.delta)}`;
    case 'humanitarian_impact': return `${faction} humanitarian impact${effect.war_crimes_delta ? ` (${signedDelta(effect.war_crimes_delta)})` : ''}`;
    case 'patron_pressure': return `${faction} patron pressure ${signedDelta(effect.delta)}`;
    case 'alliance_change': return `RBiH–HRHB alliance ${signedDelta(points(effect.delta))}`;
    case 'negotiation_capital': return `${faction} negotiating capital ${signedDelta(effect.delta)} (${effect.dimension === 'international_credibility' ? 'international credibility' : displayDimensionName(effect.dimension).toLocaleLowerCase()})`;
    case 'equipment_grant': {
      const granted = [
        effect.tanks ? `${effect.tanks} tanks` : '',
        effect.artillery ? `${effect.artillery} artillery` : '',
        effect.aa_systems ? `${effect.aa_systems} AA systems` : '',
      ].filter(Boolean).join(', ');
      return `${army} equipment added: ${granted || 'support'}`;
    }
    case 'aggression_modifier': return `${army} offensive drive ${signedDelta(points(effect.delta))}% for ${effect.duration_turns} weeks (noted in the record; it does not change army planning)`;
    case 'control_change': return `${faction} territorial control changes in ${effect.osids.length} area${effect.osids.length === 1 ? '' : 's'}`;
    case 'guerrilla_threat': return `${faction} rear-area threat for ${effect.duration_turns} weeks`;
    case 'recruitment_modifier': return `${army} recruitment ${Math.round(effect.pool_multiplier * 100)}% for ${effect.duration_turns} weeks`;
    case 'equipment_quality_modifier': return `${army} combat effectiveness ${Math.round(effect.multiplier * 100)}% for ${effect.duration_turns} weeks`;
    case 'doctrine_constraint': return `${army} doctrine constraint for ${effect.duration_turns} weeks`;
    case 'offensive_ops_suppression': return `${army} offensive operations suppressed for ${effect.duration_turns} weeks`;
    case 'alliance_lock': return `RBiH–HRHB alliance kept ${effect.mode === 'floor' ? 'at or above' : 'at or below'} ${points(effect.value)} for ${effect.duration_turns} weeks`;
    case 'bot_priority_shift': return `${army} staff priorities shift for ${effect.duration_turns} weeks`;
    case 'cost_ledger_annotation': return effect.text ?? 'Campaign cost ledger annotation recorded';
  }
  return 'Effect recorded';
}

function describeDimensionShift(shift: DimensionShift): string {
  return `${stateName(shift.faction)} ${displayDimensionName(shift.dimension)} ${signedDelta(shift.delta)}`;
}

function describeFlagValue(value: string | number | boolean, option: EventResponseOption): string {
  const valueText = String(value);
  if (valueText === option.id) return option.label;
  if (typeof value === 'number' || typeof value === 'boolean') return valueText;
  return 'recorded choice';
}

function expectedPreviewRows(option: EventResponseOption): string[] {
  const rows = (option.effects ?? [])
    .filter(isDisplayEventEffect)
    .map(describeEffect)
    .filter((row): row is string => row !== null);
  for (const shift of option.dimension_shifts ?? []) rows.push(describeDimensionShift(shift));
  const flagValues = Object.values(option.sets_flags ?? {});
  if (flagValues.length > 0) {
    rows.push(`Campaign record updated: ${flagValues.map((value) => describeFlagValue(value, option)).join(', ')}`);
  }
  return rows;
}

function eventTitle(event: EventDefinition): string {
  if (event.title) return event.title;
  if (event.narrative) return event.narrative;
  const effects = [event.effect, ...(event.effects ?? [])];
  return effects
    .filter((effect): effect is EventEffect & { kind: 'narrative' } => effect.kind === 'narrative')
    .map((effect) => effect.text)
    .join(' ') || event.id;
}

describe('production modal-ready event catalog rendering', () => {
  it('renders every accepted ready row as a complete player-facing decision modal', () => {
    const report = buildEventAcceptanceReport();

    // Derived, not pinned. These two were `47` and `76`, and the `47` was
    // stale from 2026-08-15 — but this file is NOT in the Event System CI job
    // list, so the red never showed up alongside the nine failures in the
    // three files that are. It waits for the full suite, which gates the merge
    // to `main` rather than the push.
    expect(report.summary.production_modal_authoring_ready_events).toBe(
      report.production_modal_authoring_ready_rows.length,
    );
    expect(report.summary.required_response_events).toBe(report.required_response_rows.length);
    expect(report.production_modal_authoring_ready_rows.length).toBeGreaterThan(0);

    for (const row of report.production_modal_authoring_ready_rows) {
      const event = loadEvent(row.file, row.id);
      const sourceNote = event.source_note ?? event.historical_source ?? event.source;
      const historicalOption = event.response_options?.find((option) => option.id === event.historical_default_response_id);
      const staffOption = event.response_options?.find((option) => option.id === event.staff_recommended_response_id);
      const respondingFaction = event.responding_faction;
      const usesStaffRecommendation = Boolean(event.staff_recommended_response_id);

      expect(event.narrative || event.situation, row.id).toEqual(expect.any(String));
      expect(sourceNote, row.id).toEqual(expect.any(String));
      expect(event.staff_assessment, row.id).toEqual(expect.any(String));
      expect(event.trigger_evidence, row.id).toEqual(expect.arrayContaining([expect.any(String)]));
      if (usesStaffRecommendation) {
        expect(staffOption, row.id).toBeTruthy();
        expect(historicalOption, row.id).toBeUndefined();
      } else {
        expect(historicalOption?.historical_marker, row.id).toBe('historical_default');
      }
      expect(event.response_options?.every((option) => expectedPreviewRows(option).length > 0), row.id).toBe(true);
      expect(respondingFaction, row.id).toEqual(expect.any(String));

      render(React.createElement(EventDecisionModal, {
        decision: {
          event_id: event.id,
          event_title: eventTitle(event),
          narrative: event.narrative,
          situation: event.situation,
          category: event.category,
          historical_source: event.historical_source,
          source_note: event.source_note,
          source: event.source,
          staff_assessment: event.staff_assessment,
          trigger_evidence: event.trigger_evidence,
          turn_fired: event.trigger.turn_min ?? 1,
          faction: respondingFaction!,
          requires_player_response: event.requires_player_response,
          historical_default_response_id: event.historical_default_response_id,
          staff_recommended_response_id: event.staff_recommended_response_id,
          response_options: event.response_options ?? [],
        },
        onRespond: () => undefined,
      }));

      expect(screen.getByRole('dialog', { name: restoreBosnianProperNames(eventTitle(event)) }), row.id).toBeTruthy();
      expect(screen.getByText('Situation'), row.id).toBeTruthy();
      expect(screen.getByText(displayEventProse(event.narrative ?? event.situation!)), row.id).toBeTruthy();
      // Council fix 4 (C1): the dossier shows the first source line free of developer text, or none.
      const sourceLine = resolveEventSourceLine(event, 'en');
      if (sourceLine) {
        expect(screen.getByText('Source note'), row.id).toBeTruthy();
        expect(screen.getByText(playerSafeDossierText(sourceLine)), row.id).toBeTruthy();
      } else {
        expect(screen.queryByText('Source note'), row.id).toBeNull();
      }
      expect(screen.getByText(playerSafeDossierText(displayEventProse(event.staff_assessment!))), row.id).toBeTruthy();
      for (const evidence of event.trigger_evidence ?? []) {
        expect(screen.getByText(playerSafeDossierText(displayEventProse(evidence))), row.id).toBeTruthy();
      }
      if (usesStaffRecommendation) {
        expect(screen.getAllByText('Staff recommendation'), row.id).toHaveLength(1);
        expect(screen.getByText(/It is not the historical default; you may choose any option/), row.id).toBeTruthy();
        expect(screen.queryByText('Historical default'), row.id).toBeNull();
        expect(screen.queryByText(/historically attested choice/), row.id).toBeNull();
      } else {
        expect(screen.getAllByText('Historical default'), row.id).toHaveLength(1);
        expect(screen.getByText(/historically attested choice/), row.id).toBeTruthy();
      }
      if (!usesStaffRecommendation) expect(screen.queryByText(/No response is marked as the historical choice/), row.id).toBeNull();
      expect(screen.queryByText('No immediate mechanical effects.'), row.id).toBeNull();

      for (const option of event.response_options ?? []) {
        expect(screen.getByRole('button', { name: new RegExp(option.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }), `${row.id}:${option.id}`).toBeTruthy();
        if (option.description) expect(screen.getByText(displayEventProse(option.description)), `${row.id}:${option.id}`).toBeTruthy();
        for (const preview of expectedPreviewRows(option)) {
          expect(screen.getAllByText(preview).length, `${row.id}:${option.id}`).toBeGreaterThan(0);
        }
      }

      cleanup();
    }
  });
});
