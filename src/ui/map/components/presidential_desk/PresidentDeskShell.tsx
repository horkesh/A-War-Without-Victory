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
  onOpenMap: () => void;
  onOpenRecords: () => void;
  onOpenDecisionRecords?: (recordId?: string) => void;
  onOpenChronicle?: () => void;
  onClose?: () => void;
  /** Open the presidential command-surface card strip directly (accessibility). */
  onOpenCommandSurface?: () => void;
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
  onOpenMap,
  onOpenRecords,
  onOpenDecisionRecords,
  onOpenChronicle,
  onClose,
  onOpenCommandSurface,
}: PresidentDeskShellProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const items = deriveInboxItems(state, osidNameMap, eventCatalog);
  const actionableCount = countActionableItems(items);
  const advanceReview = buildPreAdvanceCommandReviewView({ state, osidNameMap });
  const blocked = advanceReview.status === 'blocked' || derivePresidentialBlockers(state, osidNameMap).length > 0;

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
          className="pointer-events-auto self-end border border-panel-border/80 bg-panel-bg/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary shadow-[0_16px_48px_rgba(0,0,0,0.42)] transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
        >
          {t('common.close')}
        </button>
      )}
      <div>
        <DeskAuthorityHeader state={state} />
      </div>

      <div className="pointer-events-auto self-start border border-panel-border/80 bg-panel-bg/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.52)] backdrop-blur-md">
        <DeskPacket items={items} onAction={onAction} />
      </div>

      <aside className="pointer-events-auto self-start border border-panel-border/80 bg-panel-bg/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.46)] backdrop-blur-md">
        <div className="border-b border-panel-border/70 pb-3">
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">{t('desk.strategicSituation')}</div>
          <h2 className="mt-1 text-[18px] font-bold leading-tight text-text-primary">{factionTitle(state)}</h2>
          <div className="mt-1 text-[11px] text-text-secondary">
            {state ? t('desk.situation.dateTurn', { date: turnToDateString(state.turn) }) : t('desk.situation.noCampaign')}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.items.label')}</div>
            <div className="mt-1 text-[18px] font-bold text-text-primary">{actionableCount}</div>
          </div>
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('desk.advance.label')}</div>
            <div className={`mt-1 text-[13px] font-bold ${blocked ? 'text-red-200' : 'text-green-200'}`}>
              {blocked ? t('desk.advance.blocked') : t('desk.advance.ready')}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenArmyHQ}
            data-testid="desk-action-army-hq"
            className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-accent-gold transition-colors hover:bg-accent-gold/20"
          >
            {t('desk.action.callArmyHQ')}
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            data-testid="desk-action-war-map"
            className="border border-panel-border bg-black/20 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
          >
            {t('desk.action.warMap')}
          </button>
          <button
            type="button"
            onClick={onAdvance}
            data-testid="desk-action-advance-clearance"
            className="border border-red-300/45 bg-red-500/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-red-100 transition-colors hover:bg-red-500/20"
          >
            {t('desk.action.advanceClearance')}
          </button>
          <button
            type="button"
            onClick={onOpenRecords}
            data-testid="desk-action-records"
            className="border border-panel-border bg-black/20 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
          >
            {t('desk.action.records')}
          </button>
        </div>

        {onOpenCommandSurface && (
          <button
            type="button"
            onClick={onOpenCommandSurface}
            data-testid="desk-open-command-surface"
            className="mt-3 w-full border border-accent-gold/45 bg-accent-gold/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-accent-gold transition-colors hover:bg-accent-gold/20"
          >
            {t('desk.action.commandSurface')}
          </button>
        )}

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
