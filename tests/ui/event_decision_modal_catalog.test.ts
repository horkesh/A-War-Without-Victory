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
  switch (effect.kind) {
    case 'narrative': return null;
    case 'morale_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} morale ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'supply_delta': return `${getPlayerSafePoliticalFactionName(effect.faction)} supply ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'cohesion_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} cohesion ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'humanitarian_impact': return `${getPlayerSafePoliticalFactionName(effect.faction)} humanitarian impact${effect.war_crimes_delta ? ` (${effect.war_crimes_delta > 0 ? '+' : ''}${effect.war_crimes_delta})` : ''}`;
    case 'patron_pressure': return `${getPlayerSafePoliticalFactionName(effect.faction)} patron pressure ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'alliance_change': return `${getPlayerSafePoliticalFactionName('RBiH')} / ${getPlayerSafePoliticalFactionName('HRHB')} alliance ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'negotiation_capital': return `${getPlayerSafePoliticalFactionName(effect.faction)} ${humanizeToken(effect.dimension)} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    case 'equipment_grant': {
      const granted = [
        effect.tanks ? `${effect.tanks} tanks` : '',
        effect.artillery ? `${effect.artillery} artillery` : '',
        effect.aa_systems ? `${effect.aa_systems} AA systems` : '',
      ].filter(Boolean).join(', ');
      return `${getPlayerSafePoliticalFactionName(effect.faction)} equipment ${granted || 'support'} added`;
    }
    case 'aggression_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} operational aggression ${effect.delta > 0 ? '+' : ''}${effect.delta} for ${effect.duration_turns} turns`;
    case 'control_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} territorial control changes in ${effect.osids.length} area${effect.osids.length === 1 ? '' : 's'}`;
    case 'guerrilla_threat': return `${getPlayerSafePoliticalFactionName(effect.faction)} rear-area threat for ${effect.duration_turns} turns`;
    case 'recruitment_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} recruitment ${Math.round(effect.pool_multiplier * 100)}% for ${effect.duration_turns} turns`;
    case 'equipment_quality_modifier': return `${getPlayerSafePoliticalFactionName(effect.faction)} combat effectiveness ${Math.round(effect.multiplier * 100)}% for ${effect.duration_turns} turns`;
    case 'doctrine_constraint': return `${getPlayerSafePoliticalFactionName(effect.faction)} doctrine constraint for ${effect.duration_turns} turns`;
    case 'offensive_ops_suppression': return `${getPlayerSafePoliticalFactionName(effect.faction)} offensive operations suppressed for ${effect.duration_turns} turns`;
    case 'alliance_lock': return `Alliance ${effect.mode === 'floor' ? 'floor' : 'ceiling'} ${effect.value} for ${effect.duration_turns} turns`;
    case 'bot_priority_shift': return `${getPlayerSafePoliticalFactionName(effect.faction)} staff priorities shift for ${effect.duration_turns} turns`;
    case 'cost_ledger_annotation': return effect.text ?? 'Campaign cost ledger annotation recorded';
  }
  return 'Effect recorded';
}

function describeDimensionShift(shift: DimensionShift): string {
  return `${getPlayerSafePoliticalFactionName(shift.faction)} ${humanizeToken(shift.dimension).toLowerCase()} ${shift.delta > 0 ? '+' : ''}${shift.delta}`;
}

function expectedPreviewRows(option: EventResponseOption): string[] {
  const rows = (option.effects ?? [])
    .filter(isDisplayEventEffect)
    .map(describeEffect)
    .filter((row): row is string => row !== null);
  for (const shift of option.dimension_shifts ?? []) rows.push(describeDimensionShift(shift));
  const flagValues = Object.values(option.sets_flags ?? {});
  if (flagValues.length > 0) {
    rows.push(`Campaign record updated: ${flagValues.map((value) => sentenceToken(String(value))).join(', ')}`);
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

    expect(report.summary.production_modal_authoring_ready_events).toBe(45);
    // 71 → 74: +3 HRHB Jul–Sep 1992 required-response decision events.
    expect(report.summary.required_response_events).toBe(74);

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

      expect(screen.getByRole('dialog', { name: eventTitle(event) }), row.id).toBeTruthy();
      expect(screen.getByText('Situation'), row.id).toBeTruthy();
      expect(screen.getByText(event.narrative ?? event.situation!), row.id).toBeTruthy();
      expect(screen.getByText('Source note'), row.id).toBeTruthy();
      expect(screen.getByText(playerSafeDossierText(sourceNote!)), row.id).toBeTruthy();
      expect(screen.getByText(playerSafeDossierText(event.staff_assessment!)), row.id).toBeTruthy();
      for (const evidence of event.trigger_evidence ?? []) {
        expect(screen.getByText(playerSafeDossierText(evidence)), row.id).toBeTruthy();
      }
      if (usesStaffRecommendation) {
        expect(screen.getAllByText('Staff recommendation'), row.id).toHaveLength(1);
        expect(screen.getByText(/not a historical default and does not control bot calibration/), row.id).toBeTruthy();
        expect(screen.queryByText('Historical default'), row.id).toBeNull();
        expect(screen.queryByText(/historically attested choice/), row.id).toBeNull();
      } else {
        expect(screen.getAllByText('Historical default'), row.id).toHaveLength(1);
        expect(screen.getByText(/historically attested choice/), row.id).toBeTruthy();
      }
      expect(screen.queryByText('Historical default source review required'), row.id).toBeNull();
      expect(screen.queryByText('No immediate mechanical effects.'), row.id).toBeNull();

      for (const option of event.response_options ?? []) {
        expect(screen.getByRole('button', { name: new RegExp(option.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }), `${row.id}:${option.id}`).toBeTruthy();
        if (option.description) expect(screen.getByText(option.description), `${row.id}:${option.id}`).toBeTruthy();
        for (const preview of expectedPreviewRows(option)) {
          expect(screen.getAllByText(preview).length, `${row.id}:${option.id}`).toBeGreaterThan(0);
        }
      }

      cleanup();
    }
  });
});
