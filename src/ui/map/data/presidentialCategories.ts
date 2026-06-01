/**
 * presidentialCategories.ts — the six presidential command-surface CATEGORIES.
 *
 * Pure presentation/regrouping VIEW over the existing
 * `PresidentialDecisionRoomCategory` union (presidentialDecisionRoom.ts). NO new
 * card sources, NO engine/state touch — this maps the eight underlying decision
 * categories onto the six owner-locked presidential category cards and derives
 * each card's pending-count + urgent pip from a `PresidentialDecisionRoomView`.
 *
 * Authoritative design: docs/plans/2026-06-01-presidential-command-surface-design.md §9.
 *
 * Determinism: the category order is a fixed literal array; the selector reads
 * the view's already-sorted lenses. No Math.random / Date.now / locale sort.
 *
 * Canonical owner: src/ui/map/data/presidentialCategories.ts
 */

import type {
  PresidentialDecisionRoomCategory,
  PresidentialDecisionRoomLensId,
  PresidentialDecisionRoomView,
} from './presidentialDecisionRoom';

/** Stable identifier for each of the six presidential command-surface cards. */
export type PresidentialCommandCategoryId =
  | 'cat_war_direction'
  | 'cat_diplomacy'
  | 'cat_home_front'
  | 'cat_command'
  | 'cat_conscience'
  | 'cat_record';

export interface PresidentialCommandCategory {
  /** Stable id — also the asset key (`<id>.webp`) and the CommandCard test id. */
  id: PresidentialCommandCategoryId;
  /** Player-facing title rendered on the card. */
  title: string;
  /** One-line scan blurb. */
  blurb: string;
  /**
   * The underlying decision-room categories this card aggregates. A card with
   * exactly one source category deep-links to that lens; a multi-source card
   * deep-links to the `all` lens (the card itself is the filter).
   */
  sources: PresidentialDecisionRoomCategory[];
}

export interface PresidentialCommandCategoryCount {
  id: PresidentialCommandCategoryId;
  title: string;
  blurb: string;
  /** Total pending items across this card's source categories. */
  count: number;
  /** Blocking + critical items across this card's source categories. */
  urgentCount: number;
  /** True when at least one source item is blocking/critical (drives the pip). */
  isUrgent: boolean;
  /** The decision-room lens to open when this card is clicked. */
  lens: PresidentialDecisionRoomLensId;
}

/**
 * The six owner-locked categories (design §9). Order is the canonical display
 * order and is intentionally a fixed literal (deterministic — no sort needed).
 *
 * Source-category assignment (regrouping only — these are the existing eight
 * `PresidentialDecisionRoomCategory` values):
 *   - decision        → paramilitary review (Conscience) AND general decisions
 *                       (peace plans, reviews, pushback). Decisions are the
 *                       president's core queue; they land in War Direction's
 *                       sibling cards by their navigation, but the decision
 *                       category itself is broad. We route the bulk of
 *                       `decision` into Diplomacy & Patrons (peace/Dayton/convoy
 *                       manifests + counter-offers live there), while the
 *                       paramilitary bright-line stays isolated in Conscience.
 *
 * NOTE: `decision` is a broad bucket. To keep the bright line intact and avoid
 * double-counting, the paramilitary card source is handled by a dedicated
 * predicate in `derivePresidentialCommandCategoryCounts` (it reads the
 * `paramilitary:pending` card id), and the remaining `decision` cards count
 * under Diplomacy & Patrons. See the selector for the exact split.
 */
export const PRESIDENTIAL_COMMAND_CATEGORIES: readonly PresidentialCommandCategory[] = [
  {
    id: 'cat_war_direction',
    title: 'War Direction',
    blurb: 'Operations, opportunities, and the front sitrep.',
    sources: ['opportunity', 'operational', 'briefing'],
  },
  {
    id: 'cat_diplomacy',
    title: 'Diplomacy & Patrons',
    blurb: 'Peace plans, counter-offers, and patron relations.',
    sources: ['decision', 'counter_offer'],
  },
  {
    id: 'cat_home_front',
    title: 'Home Front',
    blurb: 'Mobilization, logistics, and municipal support.',
    sources: [],
  },
  {
    id: 'cat_command',
    title: 'Command & Personnel',
    blurb: 'Commanders, elite units, and officer matters.',
    sources: [],
  },
  {
    id: 'cat_conscience',
    title: 'Conscience & Atrocity',
    blurb: 'Paramilitary requests — the bright line.',
    sources: [],
  },
  {
    id: 'cat_record',
    title: "The War's Record",
    blurb: 'Costly turns, campaign cost, and the chronicle.',
    sources: ['turn', 'cost', 'memory'],
  },
] as const;

/**
 * Card ids (from presidentialDecisionRoom.ts) that belong to a category by an
 * explicit predicate rather than by their `category` field. These let us keep
 * the Conscience bright line isolated from the broad `decision` bucket.
 */
const PARAMILITARY_CARD_ID = 'paramilitary:pending';

/** True when a card belongs to the Conscience & Atrocity bright-line card. */
function isConscienceCard(cardId: string): boolean {
  return cardId === PARAMILITARY_CARD_ID;
}

/** The lens a category deep-links to: its single source, else `all`. */
export function lensForCategory(category: PresidentialCommandCategory): PresidentialDecisionRoomLensId {
  if (category.sources.length === 1) return category.sources[0];
  return 'all';
}

/**
 * Derive per-category pending/urgent counts from a decision-room view.
 *
 * Pure, deterministic: iterates `view.cards` once per category in the fixed
 * literal order. The Conscience card pulls the paramilitary card out of the
 * `decision` bucket so it is never double-counted under Diplomacy.
 */
export function derivePresidentialCommandCategoryCounts(
  view: PresidentialDecisionRoomView,
): PresidentialCommandCategoryCount[] {
  const cards = view.cards;
  return PRESIDENTIAL_COMMAND_CATEGORIES.map((category) => {
    const sourceSet = new Set<PresidentialDecisionRoomCategory>(category.sources);
    const matched = cards.filter((card) => {
      // Conscience owns the paramilitary card exclusively.
      if (category.id === 'cat_conscience') return isConscienceCard(card.id);
      // Every other category excludes the paramilitary card from its source set.
      if (isConscienceCard(card.id)) return false;
      return sourceSet.has(card.category);
    });
    const urgentCount = matched.filter(
      (card) => card.severity === 'blocking' || card.severity === 'critical',
    ).length;
    return {
      id: category.id,
      title: category.title,
      blurb: category.blurb,
      count: matched.length,
      urgentCount,
      isUrgent: urgentCount > 0,
      lens: lensForCategory(category),
    };
  });
}

/**
 * Warroom hotspot OBJECT → presidential category. Diegetic objects that keep
 * their literal meaning (the desk map opens the map; the wall calendar advances
 * the turn) are intentionally ABSENT from this map — they retain their existing
 * shell-handoff behavior. Only the objects below open the card strip
 * pre-filtered to the matched category.
 *
 * Owner correction (2026-06-01):
 *   - desk_map / wall_cork_board → MAIN MAP (unchanged; not in this map)
 *   - wall_calendar(_area)       → ADVANCE   (unchanged; not in this map)
 *   - command_briefing_folio     → War Direction
 *   - commander_coatrack         → Command & Personnel
 *   - diplomatic_telephone       → Diplomacy & Patrons
 *   - newspaper_stack            → The War's Record
 *   - intelligence_journal       → Home Front (ledger/intel object — clean fit)
 */
export const WARROOM_HOTSPOT_TO_CATEGORY: Readonly<Record<string, PresidentialCommandCategoryId>> = {
  command_briefing_folio: 'cat_war_direction',
  commander_coatrack: 'cat_command',
  diplomatic_telephone: 'cat_diplomacy',
  newspaper_stack: 'cat_record',
  intelligence_journal: 'cat_home_front',
};

/** Resolve a warroom hotspot id to a category, or null if it isn't a strip object. */
export function categoryForWarroomHotspot(
  regionId: string,
): PresidentialCommandCategoryId | null {
  return WARROOM_HOTSPOT_TO_CATEGORY[regionId] ?? null;
}

/** Look up a category descriptor by id. */
export function getPresidentialCommandCategory(
  id: PresidentialCommandCategoryId,
): PresidentialCommandCategory | undefined {
  return PRESIDENTIAL_COMMAND_CATEGORIES.find((category) => category.id === id);
}
