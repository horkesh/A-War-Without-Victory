/**
 * WarroomStatusBar - live campaign context strip inside the Warroom.
 *
 * Renders a thin strip at the bottom-right of the Warroom scene plate
 * showing phase and Decision Room priority docket. The Warroom command dock
 * owns navigation and Advance.
 *
 * Reads directly from useGameStore for campaign context. Navigation out of
 * the Warroom stays App-owned through onReviewPriorities/onReviewItem/onReviewTarget.
 * Canonical owner: src/ui/map/components/warroom/WarroomStatusBar.tsx
 */

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  buildWarroomPriorityDocketView,
  type WarroomPriorityDocketItem,
  type WarroomPriorityDocketTone,
} from '../../data/warroomPriorityDocket';
import type { PresidentialDecisionRoomNavigationTarget } from '../../data/presidentialDecisionRoom';
import { Z } from '../../../shared/zIndex';
import { t } from '../../i18n';

export interface WarroomStatusBarProps {
  onReviewPriorities?: () => void;
  onReviewItem?: (item: WarroomPriorityDocketItem) => void;
  onReviewTarget?: (target: PresidentialDecisionRoomNavigationTarget) => void;
}

function priorityClass(tone: WarroomPriorityDocketTone): string {
  if (tone === 'danger') return 'border-red-700/70 text-red-300 bg-red-950/45 hover:bg-red-900/45';
  if (tone === 'attention') return 'border-amber-700/70 text-amber-300 bg-amber-950/40 hover:bg-amber-900/35';
  if (tone === 'clear') return 'border-emerald-700/60 text-emerald-300 bg-emerald-950/35 hover:bg-emerald-900/30';
  return 'border-neutral-700/70 text-neutral-300 bg-neutral-950/45 hover:bg-neutral-900/45';
}

function docketBadgeClass(tone: WarroomPriorityDocketTone): string {
  if (tone === 'danger') return 'border-red-700/70 bg-red-950/60 text-red-300';
  if (tone === 'attention') return 'border-amber-700/70 bg-amber-950/55 text-amber-300';
  if (tone === 'clear') return 'border-emerald-700/60 bg-emerald-950/45 text-emerald-300';
  return 'border-neutral-700/70 bg-neutral-950/55 text-neutral-300';
}

function severityLabel(severity: WarroomPriorityDocketItem['severity']): string {
  if (severity === 'blocking') return 'Blocking';
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  return 'Info';
}

function categoryLabel(category: WarroomPriorityDocketItem['category']): string {
  if (category === 'decision') return t('decisionRoom.category.decision');
  if (category === 'opportunity') return t('decisionRoom.category.opportunity');
  if (category === 'operational') return t('decisionRoom.category.operational');
  if (category === 'turn') return t('decisionRoom.category.turn');
  if (category === 'briefing') return t('decisionRoom.category.briefing');
  if (category === 'cost') return t('decisionRoom.category.cost');
  return t('decisionRoom.category.memory');
}

function PriorityDocketPanel({
  docket,
  canReviewPriorities,
  onOpenBoard,
  onReviewItem,
  onReviewTarget,
}: {
  docket: ReturnType<typeof buildWarroomPriorityDocketView>;
  canReviewPriorities: boolean;
  onOpenBoard: () => void;
  onReviewItem: (item: WarroomPriorityDocketItem) => void;
  onReviewTarget: (target: PresidentialDecisionRoomNavigationTarget) => void;
}) {
  return (
    <div className="absolute bottom-full right-0 mb-2 w-[min(26rem,calc(100vw-2rem))] rounded border border-amber-900/70 bg-black/90 p-2 text-amber-100 shadow-2xl shadow-black/50">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-amber-900/45 pb-2">
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-500/80">{t('decisionRoom.reviewBeforeAdvance')}</div>
          <div className="mt-0.5 truncate text-[12px] font-bold uppercase tracking-[0.08em] text-amber-100">{docket.headline}</div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-amber-300/70">{docket.summary}</div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${docketBadgeClass(docket.tone)}`}>
          {docket.statusLabel}
        </span>
      </div>

      <div className="mt-2 space-y-1.5">
        {docket.items.length === 0 ? (
          <div className="rounded border border-amber-900/45 bg-black/40 px-2 py-2 text-[10px] leading-snug text-amber-200/75">
            {t('decisionRoom.noBuriedItems')}
          </div>
        ) : docket.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onReviewItem(item)}
            disabled={item.navigationTarget.kind === 'none'}
            className="flex w-full min-w-0 items-start justify-between gap-2 rounded border border-amber-900/45 bg-black/40 px-2 py-1.5 text-left transition-colors hover:border-amber-600/55 hover:bg-amber-950/30 disabled:cursor-default disabled:opacity-55"
          >
            <span className="min-w-0">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                <span className="rounded border border-amber-900/50 bg-amber-950/35 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-amber-300">
                  {categoryLabel(item.category)}
                </span>
                <span className="rounded border border-neutral-700/60 bg-neutral-950/50 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-neutral-300">
                  {severityLabel(item.severity)}
                </span>
              </span>
              <span className="mt-1 block truncate text-[10px] font-bold text-amber-50">{item.title}</span>
              <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.09em] text-amber-300/60">{item.sourceOwner}</span>
            </span>
            <span className="shrink-0 rounded border border-amber-700/55 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.09em] text-amber-300">
              {item.actionLabel}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 border-t border-amber-900/45 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-500/80">{t('decisionRoom.sourceHandoffs')}</div>
          <div className="truncate text-[8px] uppercase tracking-[0.08em] text-amber-300/60">
            {docket.sourceHandoffSummary}
          </div>
        </div>
        {docket.sourceHandoffs.length > 0 && (
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {docket.sourceHandoffs.map((handoff) => (
              <button
                key={handoff.id}
                type="button"
                onClick={() => onReviewTarget(handoff.navigationTarget)}
                disabled={handoff.navigationTarget.kind === 'none'}
                className="min-w-0 rounded border border-amber-900/35 bg-black/35 px-2 py-1 text-left transition-colors hover:border-amber-600/55 hover:bg-amber-950/30 disabled:cursor-default disabled:opacity-55"
              >
                <div className="truncate text-[9px] font-bold text-amber-100">{handoff.label}</div>
                <div className="truncate text-[7px] uppercase tracking-[0.08em] text-amber-300/60">{handoff.summary}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-end border-t border-amber-900/45 pt-2">
        <button
          type="button"
          onClick={onOpenBoard}
          disabled={!canReviewPriorities}
          aria-label={t('warroom.openDecisionRoom')}
          className="rounded border border-amber-700/60 bg-amber-950/45 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.11em] text-amber-300 transition-colors hover:bg-amber-900/45 disabled:cursor-default disabled:border-neutral-700 disabled:bg-neutral-950/45 disabled:text-neutral-500"
        >
          {docket.openBoardLabel}
        </button>
      </div>
    </div>
  );
}

export function WarroomStatusBar({ onReviewPriorities, onReviewItem, onReviewTarget }: WarroomStatusBarProps) {
  const [priorityDocketOpen, setPriorityDocketOpen] = useState(false);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

  const docket = useMemo(
    () => buildWarroomPriorityDocketView({ state: loadedGameState, osidNameMap: osidDisplayNames }),
    [loadedGameState, osidDisplayNames],
  );

  if (!loadedGameState) return null;

  const phase = loadedGameState.phase ?? '';
  const isWar = phase.toLowerCase().includes('war');
  const pendingReviewCount = docket.metrics.pendingReviews;
  const hasPendingReviews = pendingReviewCount > 0;
  const { advanceReviewCount, urgentCount } = docket.metrics;
  const canReviewPriorities = docket.canOpenBoard && Boolean(onReviewPriorities);

  const handleOpenBoard = () => {
    setPriorityDocketOpen(false);
    onReviewPriorities?.();
  };

  const handleReviewItem = (item: WarroomPriorityDocketItem) => {
    setPriorityDocketOpen(false);
    onReviewItem?.(item);
  };

  const handleReviewTarget = (target: PresidentialDecisionRoomNavigationTarget) => {
    setPriorityDocketOpen(false);
    onReviewTarget?.(target);
  };

  return (
    <div
      data-tutorial-step="warroom-status-bar"
      className="absolute bottom-[2%] right-[2%] flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded bg-black/70 px-3 py-1.5 font-mono text-[10px] text-amber-400 pointer-events-auto select-none"
      style={{ backdropFilter: 'blur(4px)', zIndex: Z.PRIORITY_DOCKET }}
    >
      {priorityDocketOpen && (
        <PriorityDocketPanel
          docket={docket}
          canReviewPriorities={canReviewPriorities}
          onOpenBoard={handleOpenBoard}
          onReviewItem={handleReviewItem}
          onReviewTarget={handleReviewTarget}
        />
      )}

      {/* Phase badge */}
      <span
        className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${
          isWar
            ? 'border-red-700 text-red-400 bg-red-950/40'
            : 'border-amber-700 text-amber-500 bg-amber-950/40'
        }`}
      >
        {isWar ? t('warroom.status.phase.war') : t('warroom.status.phase.peace')}
      </span>

      {/* Decision Room priority pulse */}
      <button
        type="button"
        onClick={() => setPriorityDocketOpen((open) => !open)}
        disabled={!canReviewPriorities}
        title={t('warroom.reviewPrioritiesTitle', { advance: advanceReviewCount, urgent: urgentCount, pending: pendingReviewCount })}
        className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors disabled:cursor-default disabled:opacity-60 ${priorityClass(docket.tone)}`}
        aria-expanded={priorityDocketOpen}
      >
        <span>{t('warroom.priorities')}</span>
        <span className="tabular-nums">{advanceReviewCount}</span>
        {urgentCount > 0 && <span className="text-[8px]">{t('warroom.urgentShort', { count: urgentCount })}</span>}
        {hasPendingReviews && <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />}
      </button>
    </div>
  );
}
