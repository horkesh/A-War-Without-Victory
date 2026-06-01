/**
 * @vitest-environment jsdom
 *
 * Presidential command-surface category strip — pure-view + render tests.
 *
 * Covers (design §9, UI-only):
 *   - the six categories map onto the right PresidentialDecisionRoomCategory sources
 *   - count/urgent derivation from a mock decision-room view (incl. the
 *     paramilitary → Conscience bright-line split)
 *   - the warroom hotspot → category map covers the rewired hotspots and leaves
 *     diegetic objects (desk_map, wall_calendar) unmapped
 *   - CommandCard renders its faction-tinted fallback placeholder with NO art
 */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PRESIDENTIAL_COMMAND_CATEGORIES,
  WARROOM_HOTSPOT_TO_CATEGORY,
  categoryForWarroomHotspot,
  derivePresidentialCommandCategoryCounts,
  lensForCategory,
  type PresidentialCommandCategoryId,
} from '../../src/ui/map/data/presidentialCategories.js';
import type {
  PresidentialDecisionRoomCard,
  PresidentialDecisionRoomView,
} from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { CommandCard } from '../../src/ui/map/components/warroom/CommandCard.js';

function makeCard(
  partial: Partial<PresidentialDecisionRoomCard> & Pick<PresidentialDecisionRoomCard, 'id' | 'category' | 'severity'>,
): PresidentialDecisionRoomCard {
  return {
    title: partial.title ?? partial.id,
    explanation: '',
    sourceOwner: '',
    sourceLabel: '',
    actionLabel: '',
    evidence: [],
    navigationTarget: { kind: 'none' },
    sortKey: 0,
    ...partial,
  };
}

function makeView(cards: PresidentialDecisionRoomCard[]): PresidentialDecisionRoomView {
  return {
    hasPlayerFaction: true,
    emptyState: null,
    cards,
    lenses: [],
    commandQuestions: [],
    loopSteps: [],
    sourceHandoffs: [],
    activeDossier: null,
    inspectNext: [],
    advanceReadiness: { headline: '', blockedByExistingSystems: false, items: [] },
    metrics: { urgentCount: 0, pendingReviews: 0, opportunities: 0, hardTurns: 0, advanceReviewCount: 0 },
  };
}

describe('presidential command categories — taxonomy', () => {
  it('defines exactly the six owner-locked categories in fixed order', () => {
    expect(PRESIDENTIAL_COMMAND_CATEGORIES.map((c) => c.id)).toEqual([
      'cat_war_direction',
      'cat_diplomacy',
      'cat_home_front',
      'cat_command',
      'cat_conscience',
      'cat_record',
    ]);
  });

  it('maps each category onto the correct decision-room source categories', () => {
    const byId = new Map(PRESIDENTIAL_COMMAND_CATEGORIES.map((c) => [c.id, c.sources]));
    expect(byId.get('cat_war_direction')).toEqual(['opportunity', 'operational', 'briefing']);
    expect(byId.get('cat_diplomacy')).toEqual(['decision', 'counter_offer']);
    expect(byId.get('cat_record')).toEqual(['turn', 'cost', 'memory']);
    // Command & Personnel is wired (Slice 2): replace-CO / elite-deploy / front-visit
    // cards carry the `command` category.
    expect(byId.get('cat_command')).toEqual(['command']);
    // Home Front / Conscience have no broad source category (Conscience is fed by the
    // paramilitary card predicate; Home Front stays scan-only this slice).
    expect(byId.get('cat_home_front')).toEqual([]);
    expect(byId.get('cat_conscience')).toEqual([]);
  });

  it('single-source categories deep-link to their lens; multi-source link to all', () => {
    const diplomacy = PRESIDENTIAL_COMMAND_CATEGORIES.find((c) => c.id === 'cat_diplomacy')!;
    const warDirection = PRESIDENTIAL_COMMAND_CATEGORIES.find((c) => c.id === 'cat_war_direction')!;
    expect(lensForCategory(diplomacy)).toBe('all'); // 2 sources
    expect(lensForCategory(warDirection)).toBe('all'); // 3 sources
    const homeFront = PRESIDENTIAL_COMMAND_CATEGORIES.find((c) => c.id === 'cat_home_front')!;
    expect(lensForCategory(homeFront)).toBe('all'); // 0 sources
  });
});

describe('presidential command categories — count derivation', () => {
  it('derives pending/urgent counts per category from a mock view', () => {
    const view = makeView([
      makeCard({ id: 'opportunity:a', category: 'opportunity', severity: 'critical' }),
      makeCard({ id: 'sitrep:b', category: 'operational', severity: 'warning' }),
      makeCard({ id: 'briefing:c', category: 'briefing', severity: 'info' }),
      makeCard({ id: 'counter-offer:d', category: 'counter_offer', severity: 'blocking' }),
      makeCard({ id: 'manifest:peace_plan', category: 'decision', severity: 'warning' }),
      makeCard({ id: 'turn:10:hard-turn', category: 'turn', severity: 'critical' }),
    ]);
    const counts = derivePresidentialCommandCategoryCounts(view);
    const byId = new Map(counts.map((c) => [c.id, c]));

    const war = byId.get('cat_war_direction')!;
    expect(war.count).toBe(3); // opportunity + operational + briefing
    expect(war.urgentCount).toBe(1); // the critical opportunity
    expect(war.isUrgent).toBe(true);

    const diplomacy = byId.get('cat_diplomacy')!;
    expect(diplomacy.count).toBe(2); // counter_offer + decision
    expect(diplomacy.urgentCount).toBe(1); // the blocking counter-offer

    const record = byId.get('cat_record')!;
    expect(record.count).toBe(1);
    expect(record.urgentCount).toBe(1);

    expect(byId.get('cat_home_front')!.count).toBe(0);
    expect(byId.get('cat_command')!.count).toBe(0);
    expect(byId.get('cat_command')!.isUrgent).toBe(false);
  });

  it('routes the paramilitary card to Conscience, not Diplomacy (bright-line split)', () => {
    const view = makeView([
      makeCard({ id: 'paramilitary:pending', category: 'decision', severity: 'blocking' }),
      makeCard({ id: 'manifest:dayton_negotiation', category: 'decision', severity: 'warning' }),
    ]);
    const byId = new Map(derivePresidentialCommandCategoryCounts(view).map((c) => [c.id, c]));

    const conscience = byId.get('cat_conscience')!;
    expect(conscience.count).toBe(1);
    expect(conscience.urgentCount).toBe(1);
    expect(conscience.isUrgent).toBe(true);

    // The paramilitary decision card must NOT be double-counted under Diplomacy.
    const diplomacy = byId.get('cat_diplomacy')!;
    expect(diplomacy.count).toBe(1); // only the dayton manifest, not paramilitary
  });

  it('returns zero counts for an empty view', () => {
    const counts = derivePresidentialCommandCategoryCounts(makeView([]));
    expect(counts).toHaveLength(6);
    expect(counts.every((c) => c.count === 0 && c.urgentCount === 0 && !c.isUrgent)).toBe(true);
  });
});

describe('warroom hotspot → category map', () => {
  it('covers the rewired hotspot objects with their matched categories', () => {
    const expected: Record<string, PresidentialCommandCategoryId> = {
      command_briefing_folio: 'cat_war_direction',
      commander_coatrack: 'cat_command',
      diplomatic_telephone: 'cat_diplomacy',
      newspaper_stack: 'cat_record',
      intelligence_journal: 'cat_home_front',
    };
    for (const [hotspot, category] of Object.entries(expected)) {
      expect(categoryForWarroomHotspot(hotspot)).toBe(category);
      expect(WARROOM_HOTSPOT_TO_CATEGORY[hotspot]).toBe(category);
    }
  });

  it('leaves diegetic objects (map, calendar) unmapped so they keep literal meaning', () => {
    expect(categoryForWarroomHotspot('desk_map')).toBeNull();
    expect(categoryForWarroomHotspot('wall_cork_board')).toBeNull();
    expect(categoryForWarroomHotspot('wall_calendar')).toBeNull();
    expect(categoryForWarroomHotspot('wall_calendar_area')).toBeNull();
    expect(categoryForWarroomHotspot('unknown_region')).toBeNull();
  });
});

describe('CommandCard fallback placeholder', () => {
  it('renders the faction-tinted fallback (no art) with title, count, and urgent pip', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandCard, {
        category: {
          id: 'cat_war_direction',
          title: 'War Direction',
          blurb: 'Operations and the front.',
          count: 3,
          urgentCount: 1,
          isUrgent: true,
          lens: 'all',
        },
        playerFaction: 'RS',
        onSelect: () => {},
      }),
    );
    // No art resolves in the test bundle → the fallback placeholder must render.
    expect(html).toContain('command-card-fallback-cat_war_direction');
    expect(html).toContain('command-card-cat_war_direction');
    expect(html).toContain('War Direction');
    expect(html).toContain('command-card-urgent-cat_war_direction'); // urgent pip
    expect(html).toContain('>3<'); // the count badge value
    // RS faction tint (red) present in the placeholder gradient.
    expect(html).toContain('165, 45, 45');
  });

  it('omits the urgent pip when the category is not urgent', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandCard, {
        category: {
          id: 'cat_home_front',
          title: 'Home Front',
          blurb: 'Mobilization.',
          count: 0,
          urgentCount: 0,
          isUrgent: false,
          lens: 'all',
        },
        playerFaction: null,
        onSelect: () => {},
      }),
    );
    expect(html).toContain('command-card-fallback-cat_home_front');
    expect(html).not.toContain('command-card-urgent-cat_home_front');
    // Default (RBiH) green tint when faction is null.
    expect(html).toContain('35, 112, 63');
  });
});
