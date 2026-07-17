import { useEffect, useRef } from 'react';
import type { EventDefinition } from '../../../../sim/events/event_types';
import type { InboxItem } from '../../data/inboxItems';
import { countActionableItems, deriveInboxItems } from '../../data/inboxItems';
import { derivePresidentialBlockers } from '../../data/presidentialBlockers';
import { buildPreAdvanceCommandReviewView } from '../../data/preAdvanceCommandReview';
import type { LoadedGameState } from '../../data/types';
import { t } from '../../i18n';
import { turnToDateString } from '../../utils/formatters';
import { ConsequenceStrip } from './ConsequenceStrip';
import { DeskAuthorityHeader } from './DeskAuthorityHeader';
import { DeskPacket } from './DeskPacket';

export interface PresidentDeskShellProps {
  state: LoadedGameState | null;
  osidNameMap: Record<string, string> | null;
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
  onAction: (action: InboxItem['action'], itemId: string) => void;
  onAdvance: () => void;
  onOpenArmyHQ: () => void;
  onOpenRecords: () => void;
  onOpenDecisionRecords?: (recordId?: string) => void;
  onOpenChronicle?: (recordId?: string) => void;
  onClose?: () => void;
  /** Open the advance-turn review modal for blockers or recommended staff review. */
  onReviewAdvance?: () => void;
}

function factionTitle(state: LoadedGameState | null): string {
  if (state?.player_faction === 'RS') return t('desk.faction.rs');
  if (state?.player_faction === 'HRHB') return t('desk.faction.hrhb');
  if (state?.player_faction === 'RBiH') return t('desk.faction.rbih');
  return t('desk.faction.fallback');
}

export function PresidentDeskShell({
  state,
  osidNameMap,
  eventCatalog,
  onAction,
  onAdvance,
  onOpenArmyHQ,
  onOpenRecords,
  onOpenDecisionRecords,
  onOpenChronicle,
  onClose,
  onReviewAdvance,
}: PresidentDeskShellProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const items = deriveInboxItems(state, osidNameMap, eventCatalog);
  const actionableCount = countActionableItems(items);
  const advanceReview = buildPreAdvanceCommandReviewView({ state, osidNameMap });
  const presidentialBlockers = derivePresidentialBlockers(state, osidNameMap);
  const requiredItemIds = new Set(presidentialBlockers.map((blocker) => blocker.id));
  const blocked = advanceReview.status === 'blocked' || presidentialBlockers.length > 0;
  const reviewRecommended = !blocked && advanceReview.status === 'review';

  useEffect(() => {
    if (onClose) shellRef.current?.focus();
  }, [onClose]);

  return (
    <section
      ref={shellRef}
      role={onClose ? 'dialog' : 'region'}
      aria-label={t('desk.region.ariaLabel')}
      aria-modal={onClose ? 'false' : undefined}
      tabIndex={onClose ? -1 : undefined}
      data-testid="president-desk-shell"
      data-awwv-counter-occluder="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onClose) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="pointer-events-none absolute right-3 top-[var(--awwv-toolbar-clearance,5.5rem)] bottom-16 z-[3] flex w-[min(32rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto md:right-6 xl:right-10"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('desk.closeOverlayAria')}
          data-testid="desk-close-overlay"
          className="pointer-events-auto self-end border border-panel-border/80 bg-[#11141b] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary shadow-[0_16px_48px_rgba(0,0,0,0.42)] transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          {t('common.close')}
        </button>
      )}
      <div>
        <DeskAuthorityHeader state={state} />
      </div>

      <div className="pointer-events-auto self-start border border-panel-border/80 bg-[#11141b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.52)]">
        <DeskPacket items={items} onAction={onAction} requiredItemIds={requiredItemIds} />
      </div>

      <aside className="pointer-events-auto self-start border border-panel-border/80 bg-[#11141b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.46)]">
        <div className="border-b border-panel-border/70 pb-3">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-gold">{t('desk.strategicSituation')}</div>
          <h2 className="mt-1 text-[18px] font-bold leading-tight text-text-primary">{factionTitle(state)}</h2>
          <div className="mt-1 text-xs text-text-secondary">
            {state ? t('desk.situation.dateTurn', { date: turnToDateString(state.turn) }) : t('desk.situation.noCampaign')}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.items.label')}</div>
            <div className="mt-1 text-[18px] font-bold text-text-primary">{actionableCount}</div>
          </div>
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.advance.label')}</div>
            <div className={`mt-1 text-[13px] font-bold ${
              blocked ? 'text-red-200' : reviewRecommended ? 'text-amber-200' : 'text-green-200'
            }`}>
              {blocked
                ? t('desk.advance.blocked')
                : reviewRecommended
                  ? t('desk.advance.reviewRecommended')
                  : t('desk.advance.ready')}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenArmyHQ}
            data-testid="desk-action-army-hq"
            className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-accent-gold transition-colors hover:bg-accent-gold/20"
          >
            {t('desk.action.callArmyHQ')}
          </button>
          <button
            type="button"
            onClick={(blocked || reviewRecommended) && onReviewAdvance ? onReviewAdvance : onAdvance}
            data-testid={
              blocked
                ? 'desk-action-review-blockers'
                : reviewRecommended
                  ? 'desk-action-review-priorities'
                  : 'desk-action-advance-clearance'
            }
            className={[
              'border px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.14em] transition-colors',
              blocked
                ? 'border-red-300/45 bg-red-500/12 text-red-100 hover:bg-red-500/20'
                : reviewRecommended
                  ? 'border-amber-300/45 bg-amber-500/12 text-amber-100 hover:bg-amber-500/20'
                : 'border-accent-gold/50 bg-accent-gold/14 text-accent-gold hover:bg-accent-gold/22',
            ].join(' ')}
          >
            {blocked
              ? t('desk.action.reviewBlockers')
              : reviewRecommended
                ? t('desk.action.reviewPriorities')
                : t('desk.action.advanceClearance')}
          </button>
        </div>

        <div className="mt-4">
          <ConsequenceStrip
            state={state}
            onOpenRecords={onOpenRecords}
            onOpenDecisionRecords={onOpenDecisionRecords}
            onOpenChronicle={onOpenChronicle ?? onOpenRecords}
          />
        </div>
      </aside>
    </section>
  );
}
