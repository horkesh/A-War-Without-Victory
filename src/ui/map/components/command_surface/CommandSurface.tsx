/**
 * CommandSurface — the President's single command surface (owner redesign, 2026-11-10).
 *
 * Replaces the two-step "card strip, then Decision Room" flow with one surface:
 *   - left: the six areas of command, each with its art and a plain status line;
 *   - middle: the chosen area's matters, grouped by what they ask of the president
 *     (decide, review, act, watch, record);
 *   - right: the selected matter — what it is, what to know, and its action.
 *
 * Read model unchanged: `buildPresidentialDecisionRoomView` supplies the cards, the
 * active dossier and Advance readiness; `cardBelongsToPresidentialCommandCategory`
 * places every card in exactly one area. Deep links still arrive through
 * `decisionRoomLensRequest` (a card id, an area, or a legacy lens).
 *
 * Pure presentation: no engine/state touch, deterministic ordering (view order).
 *
 * Canonical owner: src/ui/map/components/command_surface/CommandSurface.tsx
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  consumeRequestedDecisionRoomLens,
  getDecisionRoomLensRequestSnapshot,
  subscribeDecisionRoomLensRequest,
  type DecisionRoomLensRequest,
} from '../../utils/decisionRoomLensRequest';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomNavigationTarget,
} from '../../data/presidentialDecisionRoom';
import {
  cardBelongsToPresidentialCommandCategory,
  derivePresidentialCommandCategoryCounts,
  PRESIDENTIAL_COMMAND_CATEGORIES,
  type PresidentialCommandCategoryId,
} from '../../data/presidentialCategories';
import { resolveCommandBannerArt, resolveCommandCardArt } from '../../data/commandSurfaceArt';
import { resolveDirectiveActArt } from '../../data/directiveActArt';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { useRecruitmentMatterInput } from '../../utils/useRecruitmentMatter';
import { buildRecruitmentMatterCopy } from '../../data/recruitmentMatterCopy';
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';
import { turnToDateString } from '../../utils/formatters';
import { t, type MessageKey } from '../../i18n';
import { DirectiveCard, type DirectiveReceipt } from '../army_hq/DirectiveCard';
import type { FieldOperationPlanTarget } from '../../utils/fieldInspectionTarget';
import {
  SurfaceBanner,
  SurfaceCloseButton,
  SurfaceColumns,
  SurfaceContent,
  SurfaceDetail,
  SurfaceDetailBody,
  SurfaceDetailFooter,
  SurfaceEmpty,
  SurfaceFrame,
  SurfaceHeader,
  SurfaceMatterCard,
  SurfaceMeter,
  SurfaceRail,
  SurfaceRailItem,
  SurfaceReceipt,
  SurfaceSection,
  SurfaceSections,
  SURFACE_TONE,
} from '../surface/Surface';

type NavigateTarget = (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;
type MatterGroup = 'needs' | 'review' | 'actions' | 'watch' | 'record';

const GROUP_ORDER: readonly MatterGroup[] = ['needs', 'review', 'actions', 'watch', 'record'];

/** Only reached if the category catalogue were empty; keeps the surface total without a cast. */
const EMPTY_AREA: { id: PresidentialCommandCategoryId; cards: PresidentialDecisionRoomCard[]; counts: Record<MatterGroup, number> } = {
  id: 'cat_war_direction',
  cards: [],
  counts: { needs: 0, review: 0, actions: 0, watch: 0, record: 0 },
};

const AREA_COPY: Record<PresidentialCommandCategoryId, { title: MessageKey; blurb: MessageKey; empty: MessageKey }> = {
  cat_war_direction: { title: 'commandSurface.category.warDirection.title', blurb: 'commandSurface.category.warDirection.blurb', empty: 'commandSurface.empty.warDirection' },
  cat_diplomacy: { title: 'commandSurface.category.diplomacy.title', blurb: 'commandSurface.category.diplomacy.blurb', empty: 'commandSurface.empty.diplomacy' },
  cat_home_front: { title: 'commandSurface.category.homeFront.title', blurb: 'commandSurface.category.homeFront.blurb', empty: 'commandSurface.empty.homeFront' },
  cat_command: { title: 'commandSurface.category.command.title', blurb: 'commandSurface.category.command.blurb', empty: 'commandSurface.empty.command' },
  cat_conscience: { title: 'commandSurface.category.conscience.title', blurb: 'commandSurface.category.conscience.blurb', empty: 'commandSurface.empty.conscience' },
  cat_record: { title: 'commandSurface.category.record.title', blurb: 'commandSurface.category.record.blurb', empty: 'commandSurface.empty.record' },
};

const GROUP_HEADING: Record<MatterGroup, MessageKey> = {
  needs: 'commandSurface.group.needs',
  review: 'commandSurface.group.review',
  actions: 'commandSurface.group.actions',
  watch: 'commandSurface.group.watch',
  record: 'commandSurface.group.record',
};

/** Which group a matter belongs to: what it asks of the president. */
export function matterGroup(card: PresidentialDecisionRoomCard): MatterGroup {
  if (card.priorityBand === 'required') return 'needs';
  if (card.directive) return 'actions';
  if (card.priorityBand === 'recommended') return 'review';
  if (card.priorityBand === 'monitor') return 'watch';
  return 'record';
}

function categoryLabel(category: PresidentialDecisionRoomCard['category']): string {
  if (category === 'decision') return t('decisionRoom.category.decision');
  if (category === 'counter_offer') return t('decisionRoom.category.counter');
  if (category === 'opportunity') return t('decisionRoom.category.opportunity');
  if (category === 'operational') return t('decisionRoom.category.operational');
  if (category === 'briefing') return t('decisionRoom.category.briefing');
  if (category === 'command') return t('decisionRoom.category.command');
  if (category === 'turn') return t('decisionRoom.category.turn');
  if (category === 'cost') return t('decisionRoom.category.cost');
  return t('decisionRoom.category.memory');
}

function chipFor(card: PresidentialDecisionRoomCard, group: MatterGroup): { label: string; className: string } {
  if (group === 'needs') return { label: t('commandSurface.chip.needs'), className: SURFACE_TONE.danger };
  if (group === 'actions') {
    const cost = card.directive?.cost ?? 0;
    return {
      label: cost === 0 ? t('commandSurface.chip.free') : t('commandSurface.chip.cost', { cost }),
      className: SURFACE_TONE.warn,
    };
  }
  if (group === 'review') return { label: t('commandSurface.chip.review'), className: SURFACE_TONE.warn };
  if (group === 'watch') return { label: t('commandSurface.chip.watch'), className: SURFACE_TONE.info };
  return { label: t('commandSurface.chip.record'), className: SURFACE_TONE.neutral };
}

function isHistoricalOperationAuthorizationCard(card: PresidentialDecisionRoomCard | undefined): boolean {
  return card?.category === 'decision'
    && card.directive?.lever === 'review_proposal'
    && card.sourceLabel === t('decisionRoom.card.historicalOperation.sourceLabel');
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Authorize every listed historical operation in order (the signature packet). */
function AuthorizeAllButton({ cards, onReceipt }: { cards: PresidentialDecisionRoomCard[]; onReceipt: (r: DirectiveReceipt) => void }) {
  const ipc = useIPC();
  const [authorizing, setAuthorizing] = useState(false);
  const authorizeAll = async () => {
    if (authorizing || !ipc.isAvailable) return;
    setAuthorizing(true);
    let authorized = 0;
    try {
      for (const card of cards) {
        const proposalId = typeof card.directive?.payload.proposalId === 'string' ? card.directive.payload.proposalId : '';
        if (!proposalId) {
          onReceipt({ kind: 'error', message: t('decisionRoom.historicalOperationPacket.failed', { count: authorized, reason: t('decisionRoom.historicalOperationPacket.missingProposal') }) });
          return;
        }
        const result = await ipc.acceptProposal(proposalId);
        if (!result.ok) {
          onReceipt({ kind: 'error', message: t('decisionRoom.historicalOperationPacket.failed', { count: authorized, reason: result.error ?? t('decisionRoom.historicalOperationPacket.unknownFailure') }) });
          return;
        }
        authorized += 1;
      }
      onReceipt({ kind: 'success', message: t('decisionRoom.historicalOperationPacket.authorized', { count: authorized }) });
    } finally {
      setAuthorizing(false);
    }
  };
  return (
    <button
      type="button"
      data-testid="operations-authorization-packet"
      onClick={() => { void authorizeAll(); }}
      disabled={authorizing || !ipc.isAvailable}
      className="h-10 rounded-md border border-amber-400/45 bg-amber-400/15 px-4 text-[15px] font-semibold text-amber-100 transition hover:bg-amber-400/25 disabled:cursor-default disabled:opacity-45"
    >
      {authorizing
        ? t('decisionRoom.historicalOperationPacket.authorizing')
        : `${t('decisionRoom.historicalOperationPacket.authorize')} (${cards.length})`}
    </button>
  );
}

/**
 * Where a Decision Room deep link lands: a requested card selects it and its area; an
 * area opens it; a legacy lens opens the first area holding a card of that kind.
 * `areaId: null` keeps the current area. Null when the request changes nothing.
 */
function resolveLensRequestFocus(
  requested: DecisionRoomLensRequest,
  cards: readonly PresidentialDecisionRoomCard[],
  areas: readonly { id: PresidentialCommandCategoryId; cards: readonly PresidentialDecisionRoomCard[] }[],
): { areaId: PresidentialCommandCategoryId | null; cardId: string | null } | null {
  const requestedCard = requested.cardId ? cards.find((card) => card.id === requested.cardId) : undefined;
  if (requestedCard) {
    const home = areas.find((area) => area.cards.some((card) => card.id === requestedCard.id));
    return { areaId: home?.id ?? null, cardId: requestedCard.id };
  }
  if (requested.commandCategoryId) return { areaId: requested.commandCategoryId, cardId: null };
  if (requested.lens !== 'all') {
    const home = areas.find((area) => area.cards.some((card) => card.category === requested.lens));
    if (home) return { areaId: home.id, cardId: null };
  }
  return null;
}

export interface CommandSurfaceProps {
  /** Area to open on (a toolbar or hotspot entry); null opens the first area with matters. */
  initialCategoryId?: PresidentialCommandCategoryId | null;
  onClose: () => void;
  onNavigateTarget?: NavigateTarget;
  onInspectFieldPlan?: (target: FieldOperationPlanTarget, dossierCardId: string) => void;
}

export function CommandSurface({ initialCategoryId = null, onClose, onNavigateTarget, onInspectFieldPlan }: CommandSurfaceProps) {
  const state = useGameStore((s) => s.loadedGameState);
  const osidNameMap = useGameStore((s) => s.osidDisplayNames);
  const playerFaction = state?.player_faction ?? null;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const [areaId, setAreaId] = useState<PresidentialCommandCategoryId | null>(initialCategoryId);
  const [cardId, setCardId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DirectiveReceipt | null>(null);

  useEffect(() => { rootRef.current?.focus(); }, []);
  useEffect(() => {
    if (!receipt) return undefined;
    const timeout = window.setTimeout(() => setReceipt(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [receipt]);

  const recruitmentInput = useRecruitmentMatterInput();
  const setAsideRecruitmentMatter = useGameStore((s) => s.setAsideRecruitmentMatter);
  const baseView = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap, ...recruitmentInput }),
    [state, osidNameMap, recruitmentInput],
  );
  const areas = useMemo(() => PRESIDENTIAL_COMMAND_CATEGORIES.map((category) => {
    const cards = baseView.cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, category.id));
    const counts: Record<MatterGroup, number> = { needs: 0, review: 0, actions: 0, watch: 0, record: 0 };
    for (const card of cards) counts[matterGroup(card)] += card.countWeight ?? 1;
    return { id: category.id, cards, counts };
  }), [baseView.cards]);
  // The shared agenda totals per area, exposed on each rail item as data attributes
  // (as the retired command cards did) so the browser gates can read area counts.
  const agendaCounts = useMemo(
    () => new Map(derivePresidentialCommandCategoryCounts(baseView).map((entry) => [entry.id, entry])),
    [baseView],
  );

  // Deep links: a requested card selects it and its area; an area opens it; a legacy
  // lens opens the first area holding a card of that kind.
  // The request is set before the surface mounts, so the first render already shows the
  // requested area and card: rendering the default area for one frame and switching in
  // the effect started (then dropped) the wrong area's banner load (R8 RS-07, event 484).
  const lensRequest = useSyncExternalStore(subscribeDecisionRoomLensRequest, getDecisionRoomLensRequestSnapshot, getDecisionRoomLensRequestSnapshot);
  // Applied during render (React's "adjust state while rendering"), so React re-renders
  // before committing; clearing it in an effect afterwards cannot open a gap frame.
  const [appliedLensRequest, setAppliedLensRequest] = useState<DecisionRoomLensRequest | null>(null);
  if (lensRequest !== null && lensRequest !== appliedLensRequest) {
    setAppliedLensRequest(lensRequest);
    const focus = resolveLensRequestFocus(lensRequest, baseView.cards, areas);
    if (focus) {
      if (focus.areaId) setAreaId(focus.areaId);
      setCardId(focus.cardId);
    }
  }
  useEffect(() => {
    if (lensRequest !== null) consumeRequestedDecisionRoomLens();
  }, [lensRequest]);

  const firstBusyArea = areas.find((area) => area.counts.needs > 0) ?? areas.find((area) => area.cards.length > 0) ?? areas[0] ?? EMPTY_AREA;
  const activeArea = areas.find((area) => area.id === areaId) ?? firstBusyArea;
  const groups = GROUP_ORDER
    .map((group) => ({ group, cards: activeArea.cards.filter((card) => matterGroup(card) === group) }))
    .filter((entry) => entry.cards.length > 0);
  const orderedCards = groups.flatMap((entry) => entry.cards);
  const selectedCardId = cardId && orderedCards.some((card) => card.id === cardId) ? cardId : orderedCards[0]?.id ?? null;

  const view = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap, selectedCardId, ...recruitmentInput }),
    [state, osidNameMap, selectedCardId, recruitmentInput],
  );
  const dossier = view.activeDossier && view.activeDossier.cardId === selectedCardId ? view.activeDossier : null;
  const selectedCard = selectedCardId ? baseView.cards.find((card) => card.id === selectedCardId) : undefined;
  useEffect(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0; }, [selectedCardId]);

  const navigate = onNavigateTarget ?? openPresidentialDecisionRoomNavigationTarget;
  const readiness = view.advanceReadiness;
  const readinessClass = readiness.blockedByExistingSystems
    ? 'border-red-400/50 bg-red-500/10 text-red-200'
    : readiness.items.length > 0
      ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
      : 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100';
  const authority = state?.commandAuthority?.current ?? 100;
  const authorityMax = 100;
  const turn = state?.turn ?? 0;

  const selectArea = (id: PresidentialCommandCategoryId) => {
    setAreaId(id);
    setCardId(null);
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (isTypingTarget(event.target)) return;
    const index = Number(event.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < areas.length) {
      event.preventDefault();
      const target = areas[index];
      if (target) selectArea(target.id);
    }
  };

  // The review / source handoff for the selected matter (what the old dossier's review did).
  let review: { target: PresidentialDecisionRoomNavigationTarget; label: string } | null = null;
  const recruitmentMatter = recruitmentInput.recruitmentMatter;
  const recruitmentSelected = Boolean(dossier && recruitmentMatter && dossier.cardId === recruitmentMatter.id);
  const recruitmentCopy = recruitmentSelected && recruitmentMatter
    ? buildRecruitmentMatterCopy(recruitmentMatter, recruitmentInput.municipalityNames)
    : null;
  if (dossier && !recruitmentSelected) {
    const sourceTarget = baseView.cards.find((card) => card.id === dossier.cardId)?.sourceHandoffTarget;
    const target = dossier.navigationTarget.kind === 'decision-room'
      ? sourceTarget ?? dossier.sourceHandoff?.navigationTarget ?? dossier.navigationTarget
      : dossier.navigationTarget;
    const label = dossier.navigationTarget.kind === 'decision-room' && dossier.sourceHandoff
      ? dossier.sourceHandoff.actionLabel
      : dossier.actionLabel;
    const selfTarget = target.kind === 'decision-room' && target.cardId === dossier.cardId;
    if (target.kind !== 'none' && !selfTarget) review = { target, label };
  }
  const bannerArt = resolveCommandBannerArt(activeArea.id, playerFaction);
  const detailArt = selectedCard?.directive
    ? resolveDirectiveActArt(selectedCard.directive.lever, playerFaction)
    : null;
  const historicalNeeds = groups.find((entry) => entry.group === 'needs')?.cards.filter((card) => isHistoricalOperationAuthorizationCard(card)) ?? [];

  if (!view.hasPlayerFaction) {
    return (
      <div role="dialog" aria-label={t('commandSurface.aria')} className="pointer-events-auto absolute left-1/2 top-[4.5rem] z-[7] w-[min(40rem,calc(100%-3rem))] -translate-x-1/2 rounded-lg border border-accent-gold/35 bg-[#11141b] p-6 text-[16px] text-text-secondary">
        {view.emptyState}
      </div>
    );
  }

  return (
    <SurfaceFrame
      ref={rootRef}
      aria-modal="false"
      aria-label={t('commandSurface.aria')}
      onKeyDown={handleKeyDown}
      data-testid="warroom-decision-room-host"
    >
      <SurfaceHeader
        eyebrow={t('commandSurface.eyebrow')}
        title={turnToDateString(turn)}
        close={(
          <SurfaceCloseButton
            onClick={onClose}
            aria-label={t('commandSurface.closeAria')}
            data-testid="warroom-decision-room-close"
          >
            {t('commandSurface.close')}
          </SurfaceCloseButton>
        )}
        trailing={(
          <div data-testid="command-surface-advance-status" className={`rounded border px-4 py-2 text-[16px] ${readinessClass}`}>
            {readiness.headline}
          </div>
        )}
      >
        <SurfaceMeter label={t('commandSurface.authority')} value={authority} max={authorityMax} />
      </SurfaceHeader>

      <SurfaceColumns
        layout="rail-content-detail"
        data-testid="presidential-decision-room"
        data-command-category-id={activeArea.id}
        data-tutorial-step="decision-room"
        data-coachmark-id="decision-room"
      >
        <SurfaceRail
          aria-label={t('commandSurface.areasLabel')}
          data-testid="command-card-strip"
          heading={t('commandSurface.thisWeek')}
          footer={<p className="m-0 px-2 pt-2 text-[14px] leading-snug text-[#9c917b]">{t('commandSurface.keysHint')}</p>}
        >
          {areas.map((area, index) => {
            const parts: string[] = [];
            if (area.counts.needs) parts.push(t('commandSurface.status.needs', { count: area.counts.needs }));
            if (area.counts.review) parts.push(t('commandSurface.status.review', { count: area.counts.review }));
            if (area.counts.actions) parts.push(t(area.counts.actions === 1 ? 'commandSurface.status.actionOne' : 'commandSurface.status.actionMany', { count: area.counts.actions }));
            if (area.counts.watch) parts.push(t('commandSurface.status.watch', { count: area.counts.watch }));
            if (area.counts.record) parts.push(t('commandSurface.status.record', { count: area.counts.record }));
            return (
              <SurfaceRailItem
                key={area.id}
                data-testid={`command-card-${area.id}`}
                data-awwv-count={agendaCounts.get(area.id)?.count ?? 0}
                data-awwv-required-count={agendaCounts.get(area.id)?.priorityCounts.required ?? 0}
                data-awwv-recommended-count={agendaCounts.get(area.id)?.priorityCounts.recommended ?? 0}
                data-awwv-monitor-count={agendaCounts.get(area.id)?.priorityCounts.monitor ?? 0}
                data-awwv-record-count={agendaCounts.get(area.id)?.priorityCounts.record ?? 0}
                aria-keyshortcuts={String(index + 1)}
                selected={area.id === activeArea.id}
                onClick={() => selectArea(area.id)}
                art={resolveCommandCardArt(area.id, playerFaction)}
                title={t(AREA_COPY[area.id].title)}
                status={parts.length ? parts.join(' · ') : t('commandSurface.status.nothing')}
                badge={area.counts.needs || area.counts.review}
                badgeTone={area.counts.needs ? 'danger' : 'gold'}
              />
            );
          })}
        </SurfaceRail>

        <SurfaceContent>
          <SurfaceBanner art={bannerArt} title={t(AREA_COPY[activeArea.id].title)} blurb={t(AREA_COPY[activeArea.id].blurb)} />
          {groups.length === 0 ? (
            <SurfaceEmpty title={t('commandSurface.empty.title')} body={t(AREA_COPY[activeArea.id].empty)} />
          ) : (
            <SurfaceSections>
              {groups.map(({ group, cards }) => (
                <SurfaceSection
                  key={group}
                  label={t(GROUP_HEADING[group])}
                  action={group === 'needs' && historicalNeeds.length > 1
                    ? <AuthorizeAllButton cards={historicalNeeds} onReceipt={setReceipt} />
                    : undefined}
                >
                  {cards.map((card) => {
                    return (
                      <SurfaceMatterCard
                        key={card.id}
                        data-testid={`decision-room-priority-card-${card.id}`}
                        selected={card.id === selectedCardId}
                        onClick={() => setCardId(card.id)}
                        title={card.title}
                        explanation={card.explanation}
                        chip={chipFor(card, group)}
                      />
                    );
                  })}
                </SurfaceSection>
              ))}
            </SurfaceSections>
          )}
        </SurfaceContent>

        <SurfaceDetail aria-label={t('decisionRoom.priorityDossier')}>
          {receipt && (
            <SurfaceReceipt
              data-testid="decision-room-action-receipt"
              kind={receipt.kind}
              message={receipt.message}
              onDismiss={() => setReceipt(null)}
            />
          )}
          {dossier ? (
            <section
              data-testid="decision-room-active-dossier"
              data-card-id={dossier.cardId}
              className="flex min-h-0 flex-1 flex-col"
            >
              <SurfaceDetailBody
                ref={detailScrollRef}
                data-testid="decision-room-dossier-scroll"
                art={detailArt}
                eyebrow={recruitmentCopy?.familyLabel ?? categoryLabel(dossier.category)}
                title={dossier.title}
                explanation={dossier.explanation}
                facts={dossier.evidence}
                factsLabel={t('commandSurface.whatToKnow')}
              />
              <SurfaceDetailFooter>
                {dossier.directive && state && (
                  <DirectiveCard directive={dossier.directive} gameState={state} onReceipt={setReceipt} />
                )}
                {recruitmentCopy && recruitmentMatter && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      data-testid="recruitment-matter-open"
                      data-brigade-id={recruitmentMatter.focusBrigadeId ?? ''}
                      onClick={() => { navigate({ kind: 'recruitment', brigadeId: recruitmentMatter.focusBrigadeId }); }}
                      className="h-14 flex-1 rounded-md bg-[#c9a75c] px-5 text-[18px] font-bold text-[#15120b] transition hover:bg-[#d8b86c]"
                    >
                      {recruitmentCopy.primaryActionLabel}
                    </button>
                    <button
                      type="button"
                      data-testid="recruitment-matter-set-aside"
                      onClick={() => { setAsideRecruitmentMatter(); setCardId(null); }}
                      className="h-14 rounded-md border border-[#3a4150] bg-[#1b2029] px-5 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
                    >
                      {recruitmentCopy.setAsideLabel}
                    </button>
                  </div>
                )}
                {(review || (dossier.fieldInspectionTarget && onInspectFieldPlan)) && (
                  <div className="flex flex-wrap gap-3">
                    {review && (
                      <button
                        type="button"
                        data-testid="decision-room-dossier-review"
                        data-navigation-kind={review.target.kind}
                        onClick={() => { if (review) navigate(review.target); }}
                        className={dossier.directive
                          ? 'h-12 flex-1 rounded-md border border-[#3a4150] bg-[#1b2029] px-5 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60'
                          : 'h-14 flex-1 rounded-md bg-[#c9a75c] px-5 text-[18px] font-bold text-[#15120b] transition hover:bg-[#d8b86c]'}
                      >
                        {review.label}
                      </button>
                    )}
                    {dossier.fieldInspectionTarget && onInspectFieldPlan && (
                      <button
                        type="button"
                        data-testid="decision-room-dossier-show-on-map"
                        onClick={() => { if (dossier.fieldInspectionTarget) onInspectFieldPlan(dossier.fieldInspectionTarget, dossier.cardId); }}
                        className="h-12 rounded-md border border-sky-400/40 bg-sky-400/10 px-5 text-[16px] font-semibold text-sky-100 transition hover:bg-sky-400/20"
                      >
                        {t('decisionRoom.action.showOnMap')}
                      </button>
                    )}
                  </div>
                )}
                <span className={`text-[15px] ${dossier.advanceSensitive ? 'text-amber-200' : 'text-[#9c917b]'}`}>{dossier.advanceLabel}</span>
              </SurfaceDetailFooter>
            </section>
          ) : (
            <SurfaceEmpty centered title={t('commandSurface.detail.chooseTitle')} body={t('commandSurface.detail.chooseBody')} />
          )}
        </SurfaceDetail>
      </SurfaceColumns>
    </SurfaceFrame>
  );
}
