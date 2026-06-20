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
  PresidentialDecisionRoomCard,
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

export type PresidentialCommandCategoryRole = 'act' | 'inspect' | 'monitor';

export interface PresidentialCommandCategory {
  /** Stable id — also the asset key (`<id>.webp`) and the CommandCard test id. */
  id: PresidentialCommandCategoryId;
  /** Player-facing title rendered on the card. */
  title: string;
  /** One-line scan blurb. */
  blurb: string;
  /** Player-facing expectation for the card's next step. */
  role: PresidentialCommandCategoryRole;
  /** Short rendered role chip. */
  roleLabel: string;
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
  role: PresidentialCommandCategoryRole;
  roleLabel: string;
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
 *                       paramilitary bright-line stays isolated in Conscience,
 *                       and supply/economy pressure is pulled into Home Front
 *                       by card id.
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
    blurb: 'Operations, opportunities, and the front situation.',
    role: 'act',
    roleLabel: 'Act',
    sources: ['opportunity', 'operational', 'briefing'],
  },
  {
    id: 'cat_diplomacy',
    title: 'Diplomacy & Patrons',
    blurb: 'Peace plans, counter-offers, and patron relations.',
    role: 'act',
    roleLabel: 'Act',
    sources: ['decision', 'counter_offer'],
  },
  {
    id: 'cat_home_front',
    title: 'Home Front',
    blurb: 'Mobilization, logistics, and municipal support.',
    role: 'inspect',
    roleLabel: 'Inspect',
    sources: [],
  },
  {
    id: 'cat_command',
    title: 'Command & Personnel',
    blurb: 'Commanders, elite units, and officer matters.',
    role: 'act',
    roleLabel: 'Act',
    sources: ['command'],
  },
  {
    id: 'cat_conscience',
    title: 'Conscience & Atrocity',
    blurb: 'Paramilitary requests — the bright line.',
    role: 'act',
    roleLabel: 'Act',
    sources: [],
  },
  {
    id: 'cat_record',
    title: "The War's Record",
    blurb: 'Costly turns, campaign cost, and the chronicle.',
    role: 'monitor',
    roleLabel: 'Monitor',
    sources: ['turn', 'cost', 'memory'],
  },
] as const;

/**
 * Card ids (from presidentialDecisionRoom.ts) that belong to a category by an
 * explicit predicate rather than by their `category` field. These let us keep
 * the Conscience bright line isolated from the broad `decision` bucket and keep
 * supply/economy pressure on the Home Front card instead of War Direction.
 */
const PARAMILITARY_CARD_ID = 'paramilitary:pending';
const SUPPLY_VISIBILITY_CARD_ID = 'supply:player-visibility';

/** True when a card belongs to the Conscience & Atrocity bright-line card. */
function isConscienceCard(cardId: string): boolean {
  return cardId === PARAMILITARY_CARD_ID;
}

/** True when a card belongs to the Home Front supply/economy card. */
function isHomeFrontCard(cardId: string): boolean {
  return cardId === SUPPLY_VISIBILITY_CARD_ID;
}

/**
 * True when a Decision Room card belongs to a six-card presidential command
 * category. This is the exact predicate used by category-card deep links, so
 * predicate-owned cards (Home Front / Conscience) no longer fall back to the
 * mixed `all` lens when selected from the command strip.
 */
export function cardBelongsToPresidentialCommandCategory(
  card: PresidentialDecisionRoomCard,
  categoryId: PresidentialCommandCategoryId,
): boolean {
  if (categoryId === 'cat_home_front') return isHomeFrontCard(card.id);
  if (isHomeFrontCard(card.id)) return false;
  if (categoryId === 'cat_conscience') return isConscienceCard(card.id);
  if (isConscienceCard(card.id)) return false;
  const category = getPresidentialCommandCategory(categoryId);
  if (!category) return false;
  return category.sources.includes(card.category);
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
    const matched = cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, category.id));
    const urgentCount = matched.filter(
      (card) => card.severity === 'blocking' || card.severity === 'critical',
    ).length;
    return {
      id: category.id,
      title: category.title,
      blurb: category.blurb,
      role: category.role,
      roleLabel: category.roleLabel,
      count: matched.length,
      urgentCount,
      isUrgent: urgentCount > 0,
      lens: lensForCategory(category),
    };
  });
}

/**
 * Owner correction (2026-06-02): warroom hotspots are literal room objects,
 * not command-surface category shortcuts. The President's Desk overlay is the
 * entry point for the command-surface card strip until a replacement warroom IA
 * is accepted.
 */
export const WARROOM_HOTSPOT_TO_CATEGORY: Readonly<Record<string, PresidentialCommandCategoryId>> = {
};

/** Resolve a warroom hotspot id to a category, or null under the current room contract. */
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
