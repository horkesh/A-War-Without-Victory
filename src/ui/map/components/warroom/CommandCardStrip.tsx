/**
 * CommandCardStrip — the presidential command-surface card strip.
 *
 * Renders the six command-surface category cards (presidentialCategories.ts)
 * with live pending-counts + urgent pips derived from the Presidential Decision
 * Room view. Clicking a card deep-links the Decision Room to that category's
 * lens (via decisionRoomLensRequest) and invokes `onOpenCategory` so the host
 * can open the Warroom-native Decision Room surface.
 *
 * Reachable two ways (design §9 COMBO nav):
 *   1. A warroom hotspot OBJECT opens the strip pre-filtered to its category
 *      (highlighted), via `initialCategoryId`.
 *   2. Directly from the Desk (accessibility) with no pre-filter.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now. Categories
 * render in the fixed PRESIDENTIAL_COMMAND_CATEGORIES order (deterministic).
 *
 * Canonical owner: src/ui/map/components/warroom/CommandCardStrip.tsx
 */

import { useEffect, useMemo, useRef } from 'react';
import { CommandCard } from './CommandCard';
import { buildPresidentialDecisionRoomView } from '../../data/presidentialDecisionRoom';
import {
  derivePresidentialCommandCategoryCounts,
  type PresidentialCommandCategoryCount,
  type PresidentialCommandCategoryId,
} from '../../data/presidentialCategories';
import { useGameStore } from '../../store/gameStore';
import { requestDecisionRoomLens } from '../../utils/decisionRoomLensRequest';

export interface CommandCardStripProps {
  /** Category to highlight when opened from a hotspot (null = direct Desk open). */
  initialCategoryId?: PresidentialCommandCategoryId | null;
  /**
   * Invoked after the lens is requested; the host opens the Warroom-native
   * Decision Room surface. Receives the chosen category.
   */
  onOpenCategory: (category: PresidentialCommandCategoryCount) => void;
  /** Dismiss the strip without opening a category. */
  onClose: () => void;
}

export function CommandCardStrip({ initialCategoryId, onOpenCategory, onClose }: CommandCardStripProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const state = useGameStore((s) => s.loadedGameState);
  const osidNameMap = useGameStore((s) => s.osidDisplayNames);
  const playerFaction = state?.player_faction ?? null;

  const counts = useMemo(() => {
    const view = buildPresidentialDecisionRoomView({ state, osidNameMap });
    return derivePresidentialCommandCategoryCounts(view);
  }, [state, osidNameMap]);

  const handleSelect = (category: PresidentialCommandCategoryCount) => {
    requestDecisionRoomLens(category.lens);
    onOpenCategory(category);
  };

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="Presidential command surface"
      aria-modal="false"
      tabIndex={-1}
      data-testid="command-card-strip"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="pointer-events-auto absolute inset-x-3 bottom-20 z-[6] mx-auto max-w-6xl rounded-md border border-accent-gold/35 bg-panel-bg/94 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-md xl:left-10 xl:right-10"
    >
      <div className="mb-3 flex items-end justify-between gap-2 border-b border-panel-border/70 pb-2">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">Command Surface</div>
          <h2 className="mt-0.5 text-[15px] font-bold leading-tight text-text-primary">Where will you direct the war?</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close command surface"
          className="shrink-0 rounded border border-panel-border bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((category) => (
          <div
            key={category.id}
            className={
              initialCategoryId === category.id
                ? 'rounded-sm ring-2 ring-accent-gold/70 ring-offset-1 ring-offset-black/40'
                : undefined
            }
          >
            <CommandCard
              category={category}
              playerFaction={playerFaction}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
