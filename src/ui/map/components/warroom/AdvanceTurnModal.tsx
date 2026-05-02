/**
 * AdvanceTurnModal - React confirmation dialog for advancing the turn.
 *
 * Triggered when the player clicks the wall_calendar_area hotspot in the
 * React WarroomShellLayer. The Warroom shell posts an 'advance-turn'
 * ShellHandoffCommand; applyShellHandoffCommand sets advanceTurnPending=true
 * in gameStore, and this modal renders.
 *
 * Uses the same advanceTurnAndSync path as PresidentialToolbar so advance-turn
 * behavior is identical regardless of which surface the player uses.
 *
 * Canonical owner: src/ui/map/components/warroom/AdvanceTurnModal.tsx
 */

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { advanceTurnAndSync } from '../../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../../desktop/turnAftermathAdvanceDeps';
import {
  buildPreAdvanceCommandReviewView,
  type PreAdvanceCommandReviewItem,
  type PreAdvanceCommandReviewStatus,
} from '../../data/preAdvanceCommandReview';
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';

export interface AdvanceTurnModalProps {
  onReviewPriorities?: () => void;
  onReviewItem?: (item: PreAdvanceCommandReviewItem) => void;
}

function statusClass(status: PreAdvanceCommandReviewStatus): string {
  if (status === 'blocked') return 'border-red-500 bg-red-50 text-red-700';
  if (status === 'review') return 'border-amber-500 bg-amber-50 text-amber-700';
  if (status === 'clear') return 'border-emerald-500 bg-emerald-50 text-emerald-700';
  return 'border-neutral-300 bg-neutral-100 text-neutral-600';
}

function categoryLabel(category: PreAdvanceCommandReviewItem['category']): string {
  if (category === 'decision') return 'Decision';
  if (category === 'opportunity') return 'Opportunity';
  if (category === 'operational') return 'SITREP';
  if (category === 'turn') return 'Turn';
  if (category === 'briefing') return 'Briefing';
  if (category === 'cost') return 'Cost';
  return 'Memory';
}

function MetricCell({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className="min-w-0 border border-neutral-300 bg-white px-2 py-1.5">
      <div className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className={`text-base font-bold tabular-nums ${urgent ? 'text-amber-700' : 'text-neutral-900'}`}>
        {value}
      </div>
    </div>
  );
}

function ReviewItemRow({
  item,
  disabled,
  onReview,
}: {
  item: PreAdvanceCommandReviewItem;
  disabled: boolean;
  onReview: (item: PreAdvanceCommandReviewItem) => void;
}) {
  const canReview = item.navigationTarget.kind !== 'none';

  return (
    <div className="border border-neutral-300 bg-white px-2 py-1.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="border border-neutral-300 bg-neutral-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-neutral-600">
              {categoryLabel(item.category)}
            </span>
            <span className="border border-neutral-300 bg-neutral-50 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-neutral-500">
              {item.severity}
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] font-bold text-neutral-900">{item.title}</div>
          <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-neutral-600">{item.explanation}</div>
        </div>
        <div className="shrink-0 text-right">
          <button
            type="button"
            onClick={() => onReview(item)}
            disabled={disabled || !canReview}
            className="border border-amber-500 bg-amber-100 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-800 transition-colors hover:bg-amber-200 disabled:cursor-default disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
          >
            {item.actionLabel}
          </button>
          <div className="mt-1 max-w-[8rem] truncate text-[8px] uppercase tracking-[0.1em] text-neutral-400">
            {item.sourceOwner}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdvanceTurnModal({ onReviewPriorities, onReviewItem }: AdvanceTurnModalProps) {
  const pending = useGameStore((s) => s.advanceTurnPending);
  const setPending = useGameStore((s) => s.setAdvanceTurnPending);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadSave = useGameStore((s) => s.loadSave);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const ipc = useIPC();
  const [advancing, setAdvancing] = useState(false);
  const review = useMemo(
    () => buildPreAdvanceCommandReviewView({ state: loadedGameState, osidNameMap: osidDisplayNames }),
    [loadedGameState, osidDisplayNames],
  );

  if (!pending) return null;

  const handleConfirm = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await advanceTurnAndSync({
        ipc,
        loadSave,
        clearStagedOrders,
        setLoadError,
        ...getTurnAftermathAdvanceDeps(),
      });
    } finally {
      setAdvancing(false);
      setPending(false);
    }
  };

  const handleCancel = () => {
    if (advancing) return;
    setPending(false);
  };

  const handleReviewPriorities = () => {
    if (advancing) return;
    setPending(false);
    onReviewPriorities?.();
  };

  const handleReviewItem = (item: PreAdvanceCommandReviewItem) => {
    if (advancing) return;
    setPending(false);
    if (onReviewItem) {
      onReviewItem(item);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(item.navigationTarget);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 px-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto border-2 border-neutral-400 bg-neutral-50 shadow-xl">
        <div className="border-b-2 border-neutral-300 bg-neutral-100 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                End of Turn
              </div>
              <div className="mt-0.5 text-sm font-bold text-neutral-950">Advance to next turn?</div>
            </div>
            <div className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${statusClass(review.status)}`}>
              {review.headline}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="text-[11px] leading-snug text-neutral-600">
            All pending orders will be processed. This cannot be undone.
          </div>

          <section>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Review Before Advance
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCell label="Urgent" value={review.metrics.urgentCount} urgent={review.metrics.urgentCount > 0} />
              <MetricCell label="Pending" value={review.metrics.pendingReviews} urgent={review.metrics.pendingReviews > 0} />
              <MetricCell label="Ops" value={review.metrics.opportunities} />
              <MetricCell label="Hard Turns" value={review.metrics.hardTurns} />
            </div>
          </section>

          <section className="space-y-1.5">
            {review.items.length === 0 ? (
              <div className="border border-neutral-300 bg-white px-2 py-2 text-[11px] text-neutral-600">
                No live desk item will be buried by the next turn.
              </div>
            ) : review.items.map((item) => (
              <ReviewItemRow
                key={item.id}
                item={item}
                disabled={advancing}
                onReview={handleReviewItem}
              />
            ))}
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t-2 border-neutral-300 bg-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={advancing}
            className="border border-green-700 bg-green-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {advancing ? 'Advancing...' : 'Advance Turn'}
          </button>
          {review.canReviewPriorities && (
            <button
              type="button"
              onClick={handleReviewPriorities}
              disabled={advancing}
              className="border border-amber-500 bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-800 transition-colors hover:bg-amber-200 disabled:opacity-50"
            >
              Review Priorities
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={advancing}
            className="border border-neutral-400 bg-neutral-200 px-3 py-1.5 text-[10px] font-bold uppercase text-neutral-800 transition-colors hover:bg-neutral-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
