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
 *      wins with no code edit);
 *   2. the existing, already-generated presidential-desk art this card SHARES
 *      (category cards reuse the 4:3 `packet_thumbnails/`, action cards reuse the
 *      16:9 `consequence_stills/`) via `COMMAND_CARD_DESK_ASSET`;
 *   3. otherwise the card falls back to a faction-tinted CSS gradient placeholder
 *      with a gold border so the feature works fully even for unmapped ids.
 *
 * The glob-backed resolution itself lives in the shared `presidentialCommandArt`
 * util (steps 1+2) so the `import.meta.glob` patterns are never duplicated across
 * the warroom strip and the Decision Room DirectiveCard act layer. This module
 * keeps only the command-strip id→asset map (`COMMAND_CARD_DESK_ASSET`) and the
 * thin `resolveCommandCardArt` wrapper.
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
import { resolvePresidentialCommandArt } from '../../data/presidentialCommandArt';
import { t } from '../../i18n';

/**
 * Explicit, editable command-strip card id → existing desk asset basename map.
 *
 * Category cards (4:3) reuse `packet_thumbnails/`; action cards (16:9) reuse
 * `consequence_stills/`. Re-map any card by editing the basename here — no other
 * code change needed. Ids absent from this table fall through to the placeholder.
 *
 * Action (`act_*`) entries feed the Decision Room DirectiveCard act-layer header
 * (§9): `directiveActArt.ts` maps each lever → one of these `act_*` ids and the
 * shared resolver turns that into a 16:9 consequence-still URL. Re-map a card by
 * editing the basename here — no other code change needed.
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

/**
 * Resolve the art URL for a command-strip card id.
 *
 * Precedence (via the shared `presidentialCommandArt` resolver): per-card override
 * (`command_cards/<id>.webp`) → mapped shared desk asset → null (caller renders
 * the faction-tinted placeholder).
 */
export function resolveCommandCardArt(categoryId: string, faction?: string | null): string | null {
  return resolvePresidentialCommandArt(categoryId, COMMAND_CARD_DESK_ASSET, faction);
}

/** Faction ink tint for the CSS fallback placeholder (RBiH green / RS red / HRHB blue). */
export function factionInkColor(faction: string | null | undefined): string {
  if (faction === 'RS') return 'rgba(165, 45, 45, 0.85)';
  if (faction === 'HRHB') return 'rgba(42, 91, 160, 0.85)';
  return 'rgba(35, 112, 63, 0.85)';
}

function commandCategoryTitle(id: PresidentialCommandCategoryCount['id'], fallback: string): string {
  switch (id) {
    case 'cat_war_direction': return t('commandSurface.category.warDirection.title');
    case 'cat_diplomacy': return t('commandSurface.category.diplomacy.title');
    case 'cat_home_front': return t('commandSurface.category.homeFront.title');
    case 'cat_command': return t('commandSurface.category.command.title');
    case 'cat_conscience': return t('commandSurface.category.conscience.title');
    case 'cat_record': return t('commandSurface.category.record.title');
    default: return fallback;
  }
}

function commandCategoryBlurb(id: PresidentialCommandCategoryCount['id'], fallback: string): string {
  switch (id) {
    case 'cat_war_direction': return t('commandSurface.category.warDirection.blurb');
    case 'cat_diplomacy': return t('commandSurface.category.diplomacy.blurb');
    case 'cat_home_front': return t('commandSurface.category.homeFront.blurb');
    case 'cat_command': return t('commandSurface.category.command.blurb');
    case 'cat_conscience': return t('commandSurface.category.conscience.blurb');
    case 'cat_record': return t('commandSurface.category.record.blurb');
    default: return fallback;
  }
}

function commandCategoryRole(role: PresidentialCommandCategoryCount['role']): string {
  switch (role) {
    case 'inspect': return t('commandSurface.role.inspect');
    case 'monitor': return t('commandSurface.role.monitor');
    case 'act':
    default: return t('commandSurface.role.act');
  }
}

export interface CommandCardProps {
  category: PresidentialCommandCategoryCount;
  playerFaction: string | null | undefined;
  onSelect: (category: PresidentialCommandCategoryCount) => void;
}

export function CommandCard({ category, playerFaction, onSelect }: CommandCardProps) {
  const art = resolveCommandCardArt(category.id, playerFaction);
  const tint = factionInkColor(playerFaction);
  const roleLabel = commandCategoryRole(category.role);
  const title = commandCategoryTitle(category.id, category.title);
  const blurb = commandCategoryBlurb(category.id, category.blurb);
  const footer = category.urgentCount > 0
    ? t('commandSurface.footer.urgentPending', { urgentCount: category.urgentCount, count: category.count })
    : t('commandSurface.footer.pending', { count: category.count });

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

      <div className="absolute left-1.5 top-1.5">
        <span
          data-testid={`command-card-role-${category.id}`}
          className="rounded border border-accent-gold/35 bg-black/65 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.13em] text-accent-gold"
        >
          {roleLabel}
        </span>
      </div>

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
          {title}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-stone-200/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {blurb}
        </div>
        <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.13em] text-stone-300/80">
          {footer}
        </div>
      </div>
    </button>
  );
}
