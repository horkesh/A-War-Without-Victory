/**
 * CommandCard — image-backed clickable presidential category card.
 *
 * Renders one of the six command-surface categories (presidentialCategories.ts)
 * as a period photo-illustration card with a bottom-gradient title safe-area, a
 * pending-count badge, and an urgent pip. Mirrors the DecisionCard.tsx markup
 * idiom (object-cover img + gradient + badge).
 *
 * Art is ES-imported via `import.meta.glob` keyed by category id
 * (`assets/command_cards/<id>.webp`). When no art resolves, the card falls back
 * to a faction-tinted CSS gradient placeholder with a gold border so the feature
 * works fully before any art exists.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/components/warroom/CommandCard.tsx
 */

import type { PresidentialCommandCategoryCount } from '../../data/presidentialCategories';

// Drop-in art: place `<id>.webp` in assets/command_cards/ and it resolves with
// no code edit. Eager + ?url so the bundler hashes the asset into dist and we
// get a plain URL string keyed by the glob path.
const COMMAND_CARD_ART = import.meta.glob('../../assets/command_cards/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Resolve the art URL for a category id, or null when no asset is present. */
export function resolveCommandCardArt(categoryId: string): string | null {
  const suffix = `/${categoryId}.webp`;
  for (const [path, url] of Object.entries(COMMAND_CARD_ART)) {
    if (path.endsWith(suffix)) return url;
  }
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
