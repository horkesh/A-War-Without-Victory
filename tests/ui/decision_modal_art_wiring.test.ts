// @vitest-environment jsdom
/**
 * Visual polish Phase C — art wiring.
 *
 * The required event decision (the first thing a player decides) carries the
 * same image header the six sibling decision modals already use. An event that
 * authors an `image` shows its own illustration; otherwise the header falls
 * back to a decision plate chosen by the event's category. Turn aftermath and
 * Army HQ carry a consequence still and the army crest respectively.
 */
import { readFileSync } from 'node:fs';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EventDecisionModal } from '../../src/ui/map/components/EventDecisionModal.js';
import { resolveEventIllustration, section6StillAlt } from '../../src/ui/map/data/eventIllustrationArt.js';
import {
  getAftermathHeaderForTone,
  getConsequenceStillForTone,
  getDecisionHeaderForEventCategory,
} from '../../src/ui/map/data/presidentialDeskAssets.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import war1992Events from '../../data/scenarios/events/war_1992.json';

afterEach(() => {
  cleanup();
  setLocale('en');
});

const EVENT_CATEGORIES = ['command', 'diplomatic', 'economic', 'humanitarian', 'military', 'political', 'territorial'] as const;

function fixtureEvent(id: string): EventDefinition {
  const def = (war1992Events as EventDefinition[]).find((event) => event.id === id);
  if (!def) throw new Error(`Missing fixture event: ${id}`);
  return def;
}

function decisionFor(def: EventDefinition) {
  return {
    event_id: def.id,
    event_title: def.title ?? def.id,
    narrative: def.narrative,
    staff_assessment: def.staff_assessment,
    source_note: def.source_note,
    historical_source: def.historical_source,
    category: def.category,
    turn_fired: 0,
    faction: def.responding_faction ?? 'RBiH',
    historical_default_response_id: def.historical_default_response_id,
    response_options: def.response_options ?? [],
  };
}

describe('decision plate by event category', () => {
  it('returns a shipped decision plate for every event category and a fallback for the rest', () => {
    for (const category of EVENT_CATEGORIES) {
      const url = getDecisionHeaderForEventCategory(category);
      expect(typeof url, category).toBe('string');
      expect(url.length, category).toBeGreaterThan(0);
    }
    expect(getDecisionHeaderForEventCategory(undefined)).toBe(getDecisionHeaderForEventCategory('military'));
    expect(getDecisionHeaderForEventCategory('not-a-category')).toBe(getDecisionHeaderForEventCategory('military'));
    expect(getDecisionHeaderForEventCategory('political')).not.toBe(getDecisionHeaderForEventCategory('humanitarian'));
  });

  it('returns a consequence still for every aftermath tone', () => {
    const stills = new Set<string>();
    for (const tone of ['gain', 'loss', 'mixed', 'quiet'] as const) {
      const url = getConsequenceStillForTone(tone);
      expect(url.length, tone).toBeGreaterThan(0);
      stills.add(url);
    }
    expect(stills.size).toBeGreaterThanOrEqual(2);
  });

  it('returns a distinct wide aftermath header for every tone (round 2 art)', () => {
    const headers = new Set<string>();
    for (const tone of ['gain', 'loss', 'mixed', 'quiet'] as const) {
      const url = getAftermathHeaderForTone(tone);
      expect(url, tone).toContain(`aftermath_${tone}_wide`);
      expect(url).not.toBe(getConsequenceStillForTone(tone));
      headers.add(url);
    }
    expect(headers.size).toBe(4);
  });
});

describe('EventDecisionModal image header', () => {
  it('shows the category plate when the event authors no image and keeps the labelled title', () => {
    const def = fixtureEvent('rbih_state_identity');
    expect(def.image).toBeUndefined();
    render(React.createElement(EventDecisionModal, {
      decision: decisionFor(def),
      eventCatalog: new Map([[def.id, def]]),
      onRespond: () => undefined,
    }));
    const art = screen.getByTestId('event-decision-header-art') as HTMLImageElement;
    expect(art.getAttribute('src')).toBe(getDecisionHeaderForEventCategory(def.category));
    const title = document.getElementById('event-decision-title');
    expect(title?.textContent).toContain('What Is Bosnia?');
    expect(screen.getByTestId('event-decision-response-rail')).toBeTruthy();
  });

  it('prefers the authored illustration when the catalog event carries an image', () => {
    const base = fixtureEvent('rbih_state_identity');
    const def: EventDefinition = { ...base, image: 'event_referendum.webp' };
    const expected = resolveEventIllustration('event_referendum.webp');
    expect(expected).not.toBeNull();
    render(React.createElement(EventDecisionModal, {
      decision: decisionFor(def),
      eventCatalog: new Map([[def.id, def]]),
      onRespond: () => undefined,
    }));
    const art = screen.getByTestId('event-decision-header-art') as HTMLImageElement;
    expect(art.getAttribute('src')).toBe(expected);
    expect(art.getAttribute('alt')).toBe('');
  });

  // §6 panel on D8 (2026-11-06): a gated still is record, never decoration.
  it('gives a §6 still a factual alt and a neutral eyebrow, in both languages', () => {
    const base = fixtureEvent('rbih_state_identity');
    const def: EventDefinition = { ...base, image: 'event_concentration_camps_revealed_1992.webp' };
    for (const locale of ['en', 'bcs'] as const) {
      setLocale(locale);
      render(React.createElement(EventDecisionModal, {
        decision: decisionFor(def),
        eventCatalog: new Map([[def.id, def]]),
        onRespond: () => undefined,
      }));
      const art = screen.getByTestId('event-decision-header-art') as HTMLImageElement;
      const alt = art.getAttribute('alt') ?? '';
      expect(alt).toBe(section6StillAlt(def.image));
      expect(alt).toMatch(/Prijedor/);
      const eyebrow = art.parentElement?.querySelector('.uppercase') as HTMLElement;
      expect(eyebrow.className).toContain('text-accent-gold');
      // A rendered className, not source text: no faction class may sit over a §6 still.
      expect(eyebrow.className.includes('text-faction-')).toBe(false);
      cleanup();
    }
    expect(section6StillAlt('event_referendum.webp')).toBeNull();
    expect(section6StillAlt(undefined)).toBeNull();
  });
});

describe('aftermath still and Army HQ crest wiring', () => {
  it('turn aftermath draws the wide tone header behind its header', () => {
    const source = readFileSync('src/ui/map/components/TurnAftermathModal.tsx', 'utf8');
    expect(source).toContain('getAftermathHeaderForTone(view.tone)');
    expect(source).toContain('data-testid="turn-aftermath-header-art"');
  });

  it('army HQ carries the army crest at nameplate size', () => {
    const source = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');
    expect(source).toContain('data-testid="army-hq-crest"');
  });
});
