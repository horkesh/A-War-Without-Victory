/**
 * CommandCard — image-backed clickable presidential category card.
 *
 * Renders one of the six command-surface categories (presidentialCategories.ts)
 * as a period photo-illustration card with a bottom-gradient title safe-area, a
 * pending-count badge, and an urgent pip. Mirrors the DecisionCard.tsx markup
 * idiom (object-cover img + gradient + badge).
 *
 * Art resolution precedence (first hit wins):
 *   1. a per-card override at `assets/command_cards/<id>.webp` (drop one in and it
 *      wins with no code edit — eager `import.meta.glob`, hashed into dist);
 *   2. the existing, already-generated presidential-desk art this card SHARES
 *      (category cards reuse the 4:3 `packet_thumbnails/`, action cards reuse the
 *      16:9 `consequence_stills/`) via `COMMAND_CARD_DESK_ART`;
 *   3. otherwise the card falls back to a faction-tinted CSS gradient placeholder
 *      with a gold border so the feature works fully even for unmapped ids.
 *
 * No new art is added — step 2 reuses the desk assets that already ship for the
 * decision modals. The id→asset map (`COMMAND_CARD_DESK_ASSET`) is an explicit,
 * editable data structure so the owner can re-map any card later.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/components/warroom/CommandCard.tsx
 */

import type { PresidentialCommandCategoryCount } from '../../data/presidentialCategories';

// Drop-in per-card override: place `<id>.webp` in assets/command_cards/ and it
// wins with no code edit. Eager + ?url so the bundler hashes the asset into dist
// and we get a plain URL string keyed by the glob path.
const COMMAND_CARD_ART = import.meta.glob('../../assets/command_cards/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Shared desk art: the already-generated presidential-desk decision-family
// thumbnails/stills. ES-import (same packaging-safe pattern as the override glob)
// so these existing assets hash into dist and ship automatically.
const COMMAND_CARD_DESK_ART = import.meta.glob(
  '../../assets/presidential_desk/{packet_thumbnails,consequence_stills}/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

/**
 * Explicit, editable command-strip card id → existing desk asset basename map.
 *
 * Category cards (4:3) reuse `packet_thumbnails/`; action cards (16:9) reuse
 * `consequence_stills/`. Re-map any card by editing the basename here — no other
 * code change needed. Ids absent from this table fall through to the placeholder.
 *
 * Action (`act_*`) entries are READY but currently UNRENDERED: the action /
 * Directive-Card act layer is not yet built, so no surface renders these images
 * today. They are kept here so the act layer resolves art the moment it lands.
 */
export const COMMAND_CARD_DESK_ASSET: Readonly<Record<string, string>> = {
  // Category cards (4:3 → packet_thumbnails)
  cat_war_direction: 'packet_thumb_reserve_request.webp',
  cat_diplomacy: 'packet_thumb_peace_plan.webp',
  cat_home_front: 'packet_thumb_event_decision.webp',
  cat_command: 'packet_thumb_officer_matter.webp',
  cat_conscience: 'packet_thumb_paramilitary.webp',
  cat_record: 'packet_thumb_intelligence.webp',
  // Action cards (16:9 → consequence_stills) — ready but unrendered (no act surface yet)
  act_authorize_op: 'consequence_reserve_deployment.webp',
  act_replace_commander: 'consequence_personnel_change.webp',
  act_patron_relations: 'consequence_negotiated_settlement.webp',
  act_convoy: 'consequence_humanitarian_access.webp',
  act_front_visit: 'consequence_public_pressure.webp',
};

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

/**
 * Resolve the art URL for a command-strip card id.
 *
 * Precedence: per-card override (`command_cards/<id>.webp`) → mapped shared desk
 * asset → null (caller renders the faction-tinted placeholder).
 */
export function resolveCommandCardArt(categoryId: string): string | null {
  // 1. Per-card override always wins.
  const override = resolveGlobBySuffix(COMMAND_CARD_ART, `/${categoryId}.webp`);
  if (override) return override;
  // 2. Shared desk asset for this id, if mapped.
  const deskBasename = COMMAND_CARD_DESK_ASSET[categoryId];
  if (deskBasename) {
    const shared = resolveGlobBySuffix(COMMAND_CARD_DESK_ART, `/${deskBasename}`);
    if (shared) return shared;
  }
  // 3. No art — caller falls back to the placeholder.
  return null;
}

/** Faction ink tint for the CSS fallback placeholder (RBiH green / RS red / HRHB blue). */
export function factionInkColor(faction: string | null | undefined): string {
  if (faction === 'RS') return 'rgba(165, 45, 45, 0.85)';
  if (faction === 'HRHB') return 'rgba(42, 91, 160, 0.85)';
  return 'rgba(35, 112, 63, 0.85)';
}

export interface CommandCardProps {
  category: PresidentialCommandCategoryCount;
  playerFaction: string | null | undefined;
  onSelect: (category: PresidentialCommandCategoryCount) => void;
}

export function CommandCard({ category, playerFaction, onSelect }: CommandCardProps) {
  const art = resolveCommandCardArt(category.id);
  const tint = factionInkColor(playerFaction);

  return (
    <button
      type="button"
      data-testid={`command-card-${category.id}`}
      onClick={() => onSelect(category)}
      className="group relative block aspect-[4/3] w-full overflow-hidden rounded-sm border border-accent-gold/40 bg-black/40 text-left shadow-[0_12px_28px_rgba(0,0,0,0.32)] transition-colors hover:border-accent-gold/70"
    >
      {art ? (
        <img
          src={art}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // Faction-tinted CSS placeholder — the card renders fully before art exists.
        <div
          aria-hidden="true"
          data-testid={`command-card-fallback-${category.id}`}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, ${tint}, rgba(18,16,12,0.96) 78%)`,
          }}
        />
      )}

      {/* Bottom gradient title safe-area */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: 'linear-gradient(to top, rgba(8,7,5,0.92), rgba(8,7,5,0.55) 45%, rgba(8,7,5,0))',
        }}
      />

      {/* Count badge + urgent pip (top-right) */}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        {category.isUrgent && (
          <span
            data-testid={`command-card-urgent-${category.id}`}
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full border border-red-200/70 bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.85)]"
          />
        )}
        <span
          className={`min-w-[1.4rem] rounded border px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums ${
            category.urgentCount > 0
              ? 'border-red-300/55 bg-red-950/70 text-red-100'
              : category.count > 0
                ? 'border-accent-gold/45 bg-black/65 text-accent-gold'
                : 'border-stone-400/35 bg-black/55 text-stone-300'
          }`}
        >
          {category.count}
        </span>
      </div>

      {/* Title safe-area */}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <div className="text-[12px] font-bold leading-tight text-text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {category.title}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-stone-200/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {category.blurb}
        </div>
        <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.13em] text-stone-300/80">
          {category.urgentCount > 0
            ? `${category.urgentCount} urgent · ${category.count} pending`
            : `${category.count} pending`}
        </div>
      </div>
    </button>
  );
}
