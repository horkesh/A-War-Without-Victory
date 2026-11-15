// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import { isDesignCounterfactualEvent } from '../../src/ui/map/data/eventDisplayCopy.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { withoutComments } from '../helpers/sourceComments';

/**
 * A design-counterfactual event is a game construct, not documented history. Its default option
 * keeps the authored `historical_default` marker (bots read it, so it is not changed), but the
 * player is never told that option is "historically attested" or a "historical default".
 * csq_patron_recovery_offer showed "This is the historically attested choice" right under a source
 * line reading "Not a documented offer" (R8 follow-up, 2026-11-15).
 */

const EVENT_FILES = [
  'data/scenarios/events/war_1992.json',
  'data/scenarios/events/war_1992_hrhb_summer.json',
  'data/scenarios/events/war_1993.json',
  'data/scenarios/events/war_1994.json',
  'data/scenarios/events/war_1995.json',
  'data/scenarios/events/consequences.json',
];

const ALL_EVENTS: EventDefinition[] = EVENT_FILES.flatMap(
  (file) => JSON.parse(readFileSync(file, 'utf8')) as EventDefinition[],
);

function hasAuthoredDefault(def: EventDefinition): boolean {
  return Boolean(def.historical_default_response_id)
    || (def.response_options ?? []).some((option) => option.historical_marker === 'historical_default');
}

const COUNTERFACTUALS_WITH_DEFAULT = ALL_EVENTS.filter(
  (def) => isDesignCounterfactualEvent(def) && hasAuthoredDefault(def),
);

// The positive claim only: "It is not documented history" / "Nije historijski potvrđena" are the
// neutral wording and must stay allowed.
const CLAIMS_ATTESTATION = /historically attested|historical default|ovo je historijski potvrđen|historijski zadano/i;

function renderDecision(def: EventDefinition) {
  return render(React.createElement(EventDecisionModal, {
    decision: {
      event_id: def.id,
      event_title: def.title ?? def.id,
      narrative: def.narrative,
      situation: def.situation,
      category: def.category,
      historical_source: def.historical_source,
      source_note: def.source_note,
      source: def.source,
      staff_assessment: def.staff_assessment,
      trigger_evidence: def.trigger_evidence,
      turn_fired: def.trigger.turn_min ?? 1,
      faction: def.responding_faction ?? 'RBiH',
      requires_player_response: def.requires_player_response,
      historical_default_response_id: def.historical_default_response_id,
      staff_recommended_response_id: def.staff_recommended_response_id,
      response_options: def.response_options ?? [],
    },
    onRespond: () => undefined,
    eventCatalog: new Map([[def.id, def]]),
  }));
}

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('design-counterfactual events never claim a historical default', () => {
  it('the check is not vacuous: Patron Recovery Offer is a counterfactual with an authored default', () => {
    expect(COUNTERFACTUALS_WITH_DEFAULT.map((def) => def.id)).toContain('csq_patron_recovery_offer');
    const csq = ALL_EVENTS.find((def) => def.id === 'csq_patron_recovery_offer')!;
    // The marker stays as authored: bots read it.
    expect(csq.historical_default_response_id).toBe('accept_recovery');
    expect(csq.response_options?.find((option) => option.id === 'accept_recovery')?.historical_marker).toBe('historical_default');
  });

  it.each(['en', 'bcs'] as const)('no counterfactual event shows an attestation label in %s', (locale) => {
    setLocale(locale);
    for (const def of COUNTERFACTUALS_WITH_DEFAULT) {
      const { container, unmount } = renderDecision(def);
      const text = container.ownerDocument.body.textContent ?? '';
      const title = container.ownerDocument.body.innerHTML;
      expect(text, `${def.id}:${locale}`).not.toMatch(CLAIMS_ATTESTATION);
      expect(title, `${def.id}:${locale} (title attributes)`).not.toMatch(CLAIMS_ATTESTATION);
      unmount();
    }
  });

  it('shows the neutral default label and sentence for Patron Recovery Offer, EN and BCS', () => {
    const csq = ALL_EVENTS.find((def) => def.id === 'csq_patron_recovery_offer')!;

    setLocale('en');
    let view = renderDecision(csq);
    let text = view.container.ownerDocument.body.textContent ?? '';
    expect(text).toContain('Default option');
    expect(text).toContain('This is the default option. You are free to choose any option. It is not documented history.');
    expect(text).toContain('Not a documented offer');
    view.unmount();

    setLocale('bcs');
    view = renderDecision(csq);
    text = view.container.ownerDocument.body.textContent ?? '';
    expect(text).toContain('Zadana opcija');
    expect(text).toContain('Ovo je zadana opcija. Slobodno možete izabrati bilo koju. Nije historijski potvrđena.');
  });

  it('a documented event keeps its historical-default label', () => {
    const documented = ALL_EVENTS.find(
      (def) => !isDesignCounterfactualEvent(def) && def.id === 'us_halts_federation_advance_1995',
    )!;
    setLocale('en');
    const { container } = renderDecision(documented);
    const text = container.ownerDocument.body.textContent ?? '';
    expect(text).toContain('Historical default');
    expect(text).toContain('This is the historically attested choice.');
    expect(text).not.toContain('Default option');
  });

  it('the Records panel badge speaks of the default, not history, for counterfactual events', () => {
    const source = withoutComments(readFileSync('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx', 'utf8'));
    expect(source).toContain('isDesignCounterfactualEvent(def)');
    expect(source).toContain("'decisionHistory.badge.staffDefault'");
    expect(source).toContain("'decisionHistory.badge.otherChoice'");
    // The documented-event badges are still there for every other event.
    expect(source).toContain("'decisionHistory.badge.historical'");
    expect(source).toContain("'decisionHistory.badge.diverged'");
  });
});
