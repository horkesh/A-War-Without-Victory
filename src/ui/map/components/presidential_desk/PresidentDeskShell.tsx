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
import { PRESIDENTIAL_DESK_BANNER } from '../../data/presidentialDeskAssets';
import {
  SurfaceBanner,
  SurfaceCloseButton,
  SurfaceColumns,
  SurfaceContent,
  SurfaceDetail,
  SurfaceDetailBody,
  SurfaceDetailFooter,
  SurfaceFrame,
  SurfaceHeader,
  SurfaceRail,
  SurfaceSections,
  SurfaceStat,
  SURFACE_LABEL_MUTED,
  SURFACE_SECONDARY_BUTTON,
  SURFACE_STATUS_TONE,
} from '../surface/Surface';

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
  /** Current-session aftermath already presented to the player. */
  reviewedAftermathTurn?: number | null;
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
  reviewedAftermathTurn,
}: PresidentDeskShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const items = deriveInboxItems(state, osidNameMap, eventCatalog);
  const actionableCount = countActionableItems(items);
  const advanceReview = buildPreAdvanceCommandReviewView({
    state,
    osidNameMap,
    reviewedAftermathTurn,
  });
  const presidentialBlockers = derivePresidentialBlockers(state, osidNameMap);
  const requiredItemIds = new Set(presidentialBlockers.map((blocker) => blocker.id));
  const blocked = advanceReview.status === 'blocked' || presidentialBlockers.length > 0;
  const reviewRecommended = !blocked && advanceReview.status === 'review';
  const singleBlocker = presidentialBlockers.length === 1 ? presidentialBlockers[0] : null;

  useEffect(() => {
    if (onClose) shellRef.current?.focus();
  }, [onClose]);

  const advanceTone = blocked ? 'danger' : reviewRecommended ? 'warn' : 'good';
  const advanceStatus = blocked
    ? t('desk.advance.signatureRequired')
    : reviewRecommended
      ? t('desk.advance.staffReview')
      : t('desk.advance.noActRequired');

  // Surface redesign (owner, 2026-11-10): the Desk is one surface below the toolbar in the
  // Command Surface's style — Authority and what it buys on the left, the matters that need
  // the president in the middle, the situation, what followed and the week's two handoffs
  // (Army HQ, Advance) on the right, in a footer that never scrolls away. The date is in
  // the fixed header, so it never scrolls away either.
  return (
    <SurfaceFrame
      ref={shellRef}
      role={onClose ? 'dialog' : 'region'}
      aria-label={t('desk.region.ariaLabel')}
      aria-modal={onClose ? 'false' : undefined}
      data-testid="president-desk-shell"
      data-awwv-counter-occluder="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onClose) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <SurfaceHeader
        eyebrow={t('desk.packet.eyebrow')}
        title={(
          <span data-testid="desk-pinned-date">
            {state ? turnToDateString(state.turn) : t('desk.situation.noCampaign')}
          </span>
        )}
        close={onClose && (
          <SurfaceCloseButton
            onClick={onClose}
            aria-label={t('desk.closeOverlayAria')}
            data-testid="desk-close-overlay"
          />
        )}
        trailing={(
          <div data-testid="desk-advance-status" className={`rounded border px-4 py-2 text-[16px] ${SURFACE_STATUS_TONE[advanceTone]}`}>
            {advanceStatus}
          </div>
        )}
      />
      {/* Authority is the left column's subject on the Desk, so the header carries no meter. */}

      <SurfaceColumns layout="rail-content-detail">
        <SurfaceRail as="div" aria-label={t('deskAuthority.title')}>
          <DeskAuthorityHeader state={state} />
        </SurfaceRail>

        <SurfaceContent
          data-testid="president-desk-scroll-region"
          className="overscroll-contain [-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)] [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)]"
        >
          <SurfaceBanner art={PRESIDENTIAL_DESK_BANNER} title={t('desk.packet.title')} blurb={t('desk.banner.blurb')} />
          <SurfaceSections>
            <DeskPacket items={items} onAction={onAction} requiredItemIds={requiredItemIds} />
          </SurfaceSections>
        </SurfaceContent>

        <SurfaceDetail aria-label={t('desk.strategicSituation')}>
          <SurfaceDetailBody eyebrow={t('desk.strategicSituation')} title={factionTitle(state)}>
            {/* The date and the Advance status live in the fixed header; not repeated here. */}
            <div className="flex flex-col">
              <SurfaceStat label={t('desk.items.label')} value={actionableCount} />
            </div>
            <ConsequenceStrip
              state={state}
              onOpenRecords={onOpenRecords}
              onOpenDecisionRecords={onOpenDecisionRecords}
              onOpenChronicle={onOpenChronicle ?? onOpenRecords}
            />
          </SurfaceDetailBody>
          <SurfaceDetailFooter>
            <span className={SURFACE_LABEL_MUTED}>{t('desk.footer.heading')}</span>
            <button
              type="button"
              onClick={
                blocked && singleBlocker
                  ? () => onAction(singleBlocker.action, singleBlocker.id)
                  : (blocked || reviewRecommended) && onReviewAdvance
                    ? onReviewAdvance
                    : onAdvance
              }
              data-testid={
                blocked && singleBlocker
                  ? 'desk-action-open-required-signature'
                  : blocked
                  ? 'desk-action-review-blockers'
                  : reviewRecommended
                    ? 'desk-action-review-priorities'
                    : 'desk-action-advance-clearance'
              }
              className={[
                'min-h-14 rounded-md px-6 py-3 text-[18px] font-bold leading-snug transition',
                blocked
                  ? 'border border-red-300/50 bg-red-500/15 text-red-100 hover:bg-red-500/25'
                  : reviewRecommended
                    ? 'border border-amber-300/50 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
                  : 'bg-[#c9a75c] text-[#15120b] hover:bg-[#d8b86c]',
              ].join(' ')}
            >
              {blocked
                ? singleBlocker
                  ? t('desk.action.openRequiredSignature')
                  : t('desk.action.reviewBlockers')
                : reviewRecommended
                  ? t('desk.action.reviewStaffRecommendation')
                  : t('desk.action.advanceHoldingPolicy')}
            </button>
            <button
              type="button"
              onClick={onOpenArmyHQ}
              data-testid="desk-action-army-hq"
              className={SURFACE_SECONDARY_BUTTON}
            >
              {t('desk.action.callArmyHQ')}
            </button>
          </SurfaceDetailFooter>
        </SurfaceDetail>
      </SurfaceColumns>
    </SurfaceFrame>
  );
}
