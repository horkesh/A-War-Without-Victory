/**
 * @vitest-environment jsdom
 *
 * Presidential command-surface category strip — pure-view + render tests.
 *
 * Covers (design §9, UI-only):
 *   - the six categories map onto the right PresidentialDecisionRoomCategory sources
 *   - count/priority-band derivation from a mock decision-room view (incl. the
 *     paramilitary → Conscience bright-line split)
 *   - warroom hotspots are not remapped into command-surface categories
 *   - CommandCard renders its faction-tinted fallback placeholder with NO art
 */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PRESIDENTIAL_COMMAND_CATEGORIES,
  WARROOM_HOTSPOT_TO_CATEGORY,
  cardBelongsToPresidentialCommandCategory,
  categoryForWarroomHotspot,
  derivePresidentialCommandCategoryCounts,
  lensForCategory,
  type PresidentialCommandCategoryId,
} from '../../src/ui/map/data/presidentialCategories.js';
import type {
  PresidentialDecisionRoomCard,
  PresidentialDecisionRoomView,
} from '../../src/ui/map/data/presidentialDecisionRoom.js';
import {
  CommandCard,
  COMMAND_CARD_DESK_ASSET,
  resolveCommandCardArt,
} from '../../src/ui/map/components/warroom/CommandCard.js';

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
    priorityBand: partial.priorityBand
      ?? (partial.severity === 'blocking'
        ? 'required'
        : partial.category === 'turn' || partial.category === 'cost' || partial.category === 'memory'
          ? 'record'
          : partial.category === 'operational' || partial.category === 'briefing'
            ? 'monitor'
            : 'recommended'),
    ...partial,
  };
}

function makeView(cards: PresidentialDecisionRoomCard[]): PresidentialDecisionRoomView {
  return {
    hasPlayerFaction: true,
    emptyState: null,
    cards,
    lenses: [],
    activeDossier: null,
    advanceReadiness: { headline: '', blockedByExistingSystems: false, items: [] },
    metrics: {
      priorityCounts: { required: 0, recommended: 0, monitor: 0, record: 0 },
      pendingReviews: 0,
      opportunities: 0,
      hardTurns: 0,
      advanceReviewCount: 0,
    },
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
    // Home Front / Conscience have no broad source category (both are fed by
    // dedicated card predicates to avoid double-counting broad categories).
    expect(byId.get('cat_home_front')).toEqual([]);
    expect(byId.get('cat_conscience')).toEqual([]);
  });

  it('assigns stable player-facing roles to the six cards', () => {
    const roles = new Map(PRESIDENTIAL_COMMAND_CATEGORIES.map((c) => [c.id, c.role]));
    expect(roles.get('cat_war_direction')).toBe('act');
    expect(roles.get('cat_diplomacy')).toBe('act');
    expect(roles.get('cat_home_front')).toBe('inspect');
    expect(roles.get('cat_command')).toBe('act');
    expect(roles.get('cat_conscience')).toBe('act');
    expect(roles.get('cat_record')).toBe('monitor');
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
  it('derives shared priority-band counts per category from a mock view', () => {
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
    expect(war.role).toBe('act');
    expect(war.roleLabel).toBe('Act');
    expect(war.priorityCounts).toEqual({ required: 0, recommended: 1, monitor: 2, record: 0 });
    expect(war.hasPresidentialAction).toBe(true);

    const diplomacy = byId.get('cat_diplomacy')!;
    expect(diplomacy.count).toBe(2); // counter_offer + decision
    expect(diplomacy.priorityCounts).toEqual({ required: 1, recommended: 1, monitor: 0, record: 0 });

    const record = byId.get('cat_record')!;
    expect(record.count).toBe(1);
    expect(record.priorityCounts).toEqual({ required: 0, recommended: 0, monitor: 0, record: 1 });

    expect(byId.get('cat_home_front')!.count).toBe(0);
    expect(byId.get('cat_command')!.count).toBe(0);
    expect(byId.get('cat_command')!.hasPresidentialAction).toBe(false);
  });

  it('routes the paramilitary card to Conscience, not Diplomacy (bright-line split)', () => {
    const view = makeView([
      makeCard({ id: 'paramilitary:pending', category: 'decision', severity: 'blocking' }),
      makeCard({ id: 'manifest:dayton_negotiation', category: 'decision', severity: 'warning' }),
    ]);
    const byId = new Map(derivePresidentialCommandCategoryCounts(view).map((c) => [c.id, c]));

    const conscience = byId.get('cat_conscience')!;
    expect(conscience.count).toBe(1);
    expect(conscience.priorityCounts.required).toBe(1);
    expect(conscience.hasPresidentialAction).toBe(true);

    // The paramilitary decision card must NOT be double-counted under Diplomacy.
    const diplomacy = byId.get('cat_diplomacy')!;
    expect(diplomacy.count).toBe(1); // only the dayton manifest, not paramilitary
  });

  it('routes historical operation signatures to War Direction, not Diplomacy', () => {
    const historicalOperation = makeCard({
      id: 'command:review-proposal:PROP_JACKAL',
      category: 'decision',
      severity: 'blocking',
    });
    const view = makeView([historicalOperation]);
    const byId = new Map(derivePresidentialCommandCategoryCounts(view).map((count) => [count.id, count]));

    expect(cardBelongsToPresidentialCommandCategory(historicalOperation, 'cat_war_direction')).toBe(true);
    expect(cardBelongsToPresidentialCommandCategory(historicalOperation, 'cat_diplomacy')).toBe(false);
    expect(byId.get('cat_war_direction')?.count).toBe(1);
    expect(byId.get('cat_war_direction')?.priorityCounts.required).toBe(1);
    expect(byId.get('cat_diplomacy')?.count).toBe(0);
  });

  it('routes supply visibility to Home Front, not War Direction', () => {
    const view = makeView([
      makeCard({ id: 'supply:player-visibility', category: 'operational', severity: 'critical' }),
      makeCard({ id: 'sitrep:front-exposed', category: 'operational', severity: 'warning' }),
    ]);
    const byId = new Map(derivePresidentialCommandCategoryCounts(view).map((c) => [c.id, c]));

    const homeFront = byId.get('cat_home_front')!;
    expect(homeFront.count).toBe(1);
    expect(homeFront.priorityCounts.monitor).toBe(1);
    expect(homeFront.hasPresidentialAction).toBe(false);

    // Supply/economy pressure should not inflate the War Direction count.
    const war = byId.get('cat_war_direction')!;
    expect(war.count).toBe(1);
    expect(war.priorityCounts.monitor).toBe(1);
  });

  it('counts grouped modal-required decision families by represented pending items', () => {
    const view = makeView([
      makeCard({
        id: 'manifest:convoy_decision',
        category: 'decision',
        severity: 'blocking',
        countWeight: 3,
      }),
      makeCard({ id: 'counter-offer:d', category: 'counter_offer', severity: 'warning' }),
    ]);
    const byId = new Map(derivePresidentialCommandCategoryCounts(view).map((c) => [c.id, c]));

    const diplomacy = byId.get('cat_diplomacy')!;
    expect(diplomacy.count).toBe(4);
    expect(diplomacy.priorityCounts).toEqual({ required: 3, recommended: 1, monitor: 0, record: 0 });
    expect(diplomacy.hasPresidentialAction).toBe(true);
  });

  it('uses the same exact predicate for command-card filtering and counts', () => {
    const cards = [
      makeCard({ id: 'supply:player-visibility', category: 'operational', severity: 'critical' }),
      makeCard({ id: 'paramilitary:pending', category: 'decision', severity: 'blocking' }),
      makeCard({ id: 'manifest:peace_plan', category: 'decision', severity: 'warning' }),
      makeCard({ id: 'command:front-visit', category: 'command', severity: 'info' }),
    ];
    const view = makeView(cards);
    const countsById = new Map(derivePresidentialCommandCategoryCounts(view).map((count) => [count.id, count.count]));

    for (const category of PRESIDENTIAL_COMMAND_CATEGORIES) {
      const filtered = cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, category.id));
      expect(filtered).toHaveLength(countsById.get(category.id) ?? -1);
    }

    expect(
      cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, 'cat_home_front')).map((card) => card.id),
    ).toEqual(['supply:player-visibility']);
    expect(
      cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, 'cat_conscience')).map((card) => card.id),
    ).toEqual(['paramilitary:pending']);
    expect(
      cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, 'cat_diplomacy')).map((card) => card.id),
    ).toEqual(['manifest:peace_plan']);
  });

  it('returns zero counts for an empty view', () => {
    const counts = derivePresidentialCommandCategoryCounts(makeView([]));
    expect(counts).toHaveLength(6);
    expect(counts.every((c) => (
      c.count === 0
      && Object.values(c.priorityCounts).every((count) => count === 0)
      && !c.hasPresidentialAction
    ))).toBe(true);
  });
});

describe('warroom hotspot category map', () => {
  it('does not remap literal warroom hotspots into the command surface', () => {
    expect(Object.keys(WARROOM_HOTSPOT_TO_CATEGORY)).toHaveLength(0);
    expect(categoryForWarroomHotspot('command_briefing_folio')).toBeNull();
    expect(categoryForWarroomHotspot('commander_coatrack')).toBeNull();
    expect(categoryForWarroomHotspot('diplomatic_telephone')).toBeNull();
    expect(categoryForWarroomHotspot('newspaper_stack')).toBeNull();
    expect(categoryForWarroomHotspot('intelligence_journal')).toBeNull();
  });

  it('leaves diegetic objects unmapped so they keep literal meaning', () => {
    expect(categoryForWarroomHotspot('desk_map')).toBeNull();
    expect(categoryForWarroomHotspot('wall_cork_board')).toBeNull();
    expect(categoryForWarroomHotspot('wall_calendar')).toBeNull();
    expect(categoryForWarroomHotspot('wall_calendar_area')).toBeNull();
    expect(categoryForWarroomHotspot('unknown_region')).toBeNull();
  });
});

describe('CommandCard shared desk-art resolution', () => {
  it('resolves each of the six category ids to its mapped presidential_desk asset', () => {
    const expected: Record<PresidentialCommandCategoryId, string> = {
      cat_war_direction: 'packet_thumb_reserve_request.webp',
      cat_diplomacy: 'packet_thumb_peace_plan.webp',
      cat_home_front: 'packet_thumb_event_decision.webp',
      cat_command: 'packet_thumb_officer_matter.webp',
      cat_conscience: 'packet_thumb_paramilitary.webp',
      cat_record: 'packet_thumb_intelligence.webp',
    };
    for (const id of PRESIDENTIAL_COMMAND_CATEGORIES.map((c) => c.id)) {
      // The id→asset map carries the mapped basename...
      expect(COMMAND_CARD_DESK_ASSET[id]).toBe(expected[id]);
      // ...and the resolver returns a URL ending in that basename (the existing
      // packet_thumbnails desk art is shared — no new command_cards art needed).
      const url = resolveCommandCardArt(id);
      expect(url).not.toBeNull();
      expect(url!.endsWith(expected[id])).toBe(true);
      expect(url).toContain('packet_thumbnails');
    }
  });

  it('keeps the five action (act_*) ids mapped to consequence_stills (ready but unrendered)', () => {
    const expected: Record<string, string> = {
      act_authorize_op: 'consequence_reserve_deployment.webp',
      act_replace_commander: 'consequence_personnel_change.webp',
      act_patron_relations: 'consequence_negotiated_settlement.webp',
      act_convoy: 'consequence_humanitarian_access.webp',
      act_front_visit: 'consequence_public_pressure.webp',
    };
    for (const [id, basename] of Object.entries(expected)) {
      expect(COMMAND_CARD_DESK_ASSET[id]).toBe(basename);
      const url = resolveCommandCardArt(id);
      expect(url).not.toBeNull();
      expect(url!.endsWith(basename)).toBe(true);
      expect(url).toContain('consequence_stills');
    }
  });
});

describe('CommandCard fallback placeholder', () => {
  it('falls back to the faction-tinted placeholder for an UNMAPPED id', () => {
    // An id with no command_cards override AND no desk-asset mapping must return
    // null from the resolver and render the placeholder.
    expect(resolveCommandCardArt('cat_unmapped_does_not_exist')).toBeNull();
    const html = renderToStaticMarkup(
      React.createElement(CommandCard, {
        // The render path keys the fallback testid off the live category id; we
        // assert the placeholder branch via an id the desk map does not carry.
        category: {
          id: 'cat_unmapped_does_not_exist' as PresidentialCommandCategoryId,
          title: 'Unmapped',
          blurb: 'No art mapped.',
          role: 'inspect',
          roleLabel: 'Inspect',
          count: 3,
          priorityCounts: { required: 1, recommended: 0, monitor: 2, record: 0 },
          hasPresidentialAction: true,
          lens: 'all',
        },
        playerFaction: 'RS',
        onSelect: () => {},
      }),
    );
    // No art resolves → the fallback placeholder must render.
    expect(html).toContain('command-card-fallback-cat_unmapped_does_not_exist');
    expect(html).toContain('command-card-role-cat_unmapped_does_not_exist');
    expect(html).toContain('Inspect');
    expect(html).toContain('command-card-cat_unmapped_does_not_exist');
    expect(html).toContain('Unmapped');
    expect(html).toContain('command-card-action-cat_unmapped_does_not_exist'); // presidential-action pip
    expect(html).toContain('>3<'); // the count badge value
    // RS faction tint (red) present in the placeholder gradient.
    expect(html).toContain('165, 45, 45');
  });

  it('renders shared desk art (not the placeholder) for a mapped category id', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandCard, {
        category: {
          id: 'cat_home_front',
          title: 'Home Front',
          blurb: 'Mobilization.',
          role: 'inspect',
          roleLabel: 'Inspect',
          count: 0,
          priorityCounts: { required: 0, recommended: 0, monitor: 0, record: 0 },
          hasPresidentialAction: false,
          lens: 'all',
        },
        playerFaction: null,
        onSelect: () => {},
      }),
    );
    // cat_home_front is mapped → the <img> renders, not the CSS placeholder.
    expect(html).not.toContain('command-card-fallback-cat_home_front');
    expect(html).not.toContain('command-card-action-cat_home_front');
    expect(html).toContain('packet_thumb_event_decision');
  });
});
