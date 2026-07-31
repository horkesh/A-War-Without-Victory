import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  consumeRequestedDecisionRoomLens,
  getDecisionRoomLensRequestSnapshot,
  subscribeDecisionRoomLensRequest,
} from '../../utils/decisionRoomLensRequest';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomCategory,
  type PresidentialDecisionRoomDossier,
  type PresidentialDecisionRoomLens,
  type PresidentialDecisionRoomNavigationTarget,
  type PresidentialDecisionRoomSeverity,
} from '../../data/presidentialDecisionRoom';
import {
  cardBelongsToPresidentialCommandCategory,
  type PresidentialCommandCategoryId,
} from '../../data/presidentialCategories';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';
import { t } from '../../i18n';
import { DirectiveCard, type DirectiveReceipt } from './DirectiveCard';
import type { LoadedGameState } from '../../data/types';

function severityClass(severity: PresidentialDecisionRoomSeverity): string {
  if (severity === 'blocking') return 'border-red-400/45 bg-red-500/10 text-red-300';
  if (severity === 'critical') return 'border-amber-400/45 bg-amber-400/10 text-amber-300';
  if (severity === 'warning') return 'border-sky-400/35 bg-sky-400/10 text-sky-300';
  return 'border-panel-border/70 bg-panel-bg/60 text-text-secondary';
}

function severityLabel(severity: PresidentialDecisionRoomSeverity): string {
  if (severity === 'blocking') return t('warroom.severity.blocking');
  if (severity === 'critical') return t('warroom.severity.critical');
  if (severity === 'warning') return t('warroom.severity.warning');
  return t('warroom.severity.info');
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

function commandCategoryLabel(categoryId: PresidentialCommandCategoryId): string {
  if (categoryId === 'cat_war_direction') return t('commandSurface.category.warDirection.title');
  if (categoryId === 'cat_diplomacy') return t('commandSurface.category.diplomacy.title');
  if (categoryId === 'cat_home_front') return t('commandSurface.category.homeFront.title');
  if (categoryId === 'cat_command') return t('commandSurface.category.command.title');
  if (categoryId === 'cat_conscience') return t('commandSurface.category.conscience.title');
  return t('commandSurface.category.record.title');
}

function advanceReviewLabel(card: PresidentialDecisionRoomCard): string {
  const hardBlock = card.severity === 'blocking'
    && (card.category === 'decision' || card.category === 'counter_offer');
  return hardBlock
    ? t('decisionRoom.advance.reviewBeforeAdvance')
    : t('decisionRoom.advance.recommendedBeforeAdvance');
}

type ActiveDecisionRoomLens = 'all' | PresidentialDecisionRoomCategory;
type DecisionRoomNavigateTarget = (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;

function LensButton({
  lens,
  active,
  onSelect,
}: {
  lens: PresidentialDecisionRoomLens;
  active: boolean;
  onSelect: (id: ActiveDecisionRoomLens) => void;
}) {
  const isAllLens = lens.id === 'all';
  return (
    <button
      type="button"
      data-testid={`decision-room-lens-${lens.id}`}
      aria-pressed={active}
      onClick={() => onSelect(lens.id)}
      className={`flex h-9 min-w-[5.75rem] shrink-0 items-center justify-between gap-2 rounded border px-2 text-left transition ${active
        ? 'border-amber-400/45 bg-amber-400/12 text-amber-200'
        : 'border-panel-border/55 bg-[#121820]/90 text-text-secondary hover:border-amber-400/25 hover:bg-white/[0.04]'}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold uppercase tracking-[0.08em]">
          {isAllLens ? t('decisionRoom.lens.all') : lens.label}
        </span>
        <span className="block text-xs uppercase tracking-[0.06em] text-text-muted">
          {t(lens.count === 1 ? 'decisionRoom.itemCount.one' : 'decisionRoom.itemCount.many', { count: lens.count })}
        </span>
      </span>
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-bold tabular-nums ${lens.urgentCount > 0
        ? 'border-red-400/35 bg-red-500/10 text-red-300'
        : 'border-panel-border/55 bg-panel-bg/70 text-text-muted'}`}
      >
        {t(lens.urgentCount === 1 ? 'decisionRoom.urgentCount.one' : 'decisionRoom.urgentCount.many', { count: lens.urgentCount })}
      </span>
    </button>
  );
}

function PriorityCard({
  card,
  active,
  advanceSensitive,
  onSelectCard,
  navigateTarget,
}: {
  card: PresidentialDecisionRoomCard;
  active: boolean;
  advanceSensitive: boolean;
  onSelectCard: (cardId: string) => void;
  navigateTarget: DecisionRoomNavigateTarget;
}) {
  const disabled = card.navigationTarget.kind === 'none';
  const selfReviewDisabled = active
    && card.navigationTarget.kind === 'decision-room'
    && card.navigationTarget.cardId === card.id;
  const actionDisabled = disabled || selfReviewDisabled;
  const actionLabel = selfReviewDisabled
    ? t('decisionRoom.action.currentDossier')
    : card.actionLabel;

  return (
    <article
      data-testid={`decision-room-priority-card-${card.id}`}
      className={`min-h-[7.25rem] rounded border px-3 py-2 transition ${active
      ? 'border-amber-400/45 bg-[#2a2112]/95 shadow-[inset_3px_0_0_rgba(251,191,36,0.55)]'
      : 'border-panel-border/55 bg-[#121820]/95'}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] ${severityClass(card.severity)}`}>
              {severityLabel(card.severity)}
            </span>
            <span className="rounded border border-panel-border/70 bg-panel-bg/85 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
              {categoryLabel(card.category)}
            </span>
            {advanceSensitive && (
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-amber-300">
                {advanceReviewLabel(card)}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelectCard(card.id)}
              className={`rounded border px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] transition ${active
                ? 'border-amber-400/35 bg-amber-400/15 text-amber-200'
                : 'border-panel-border/60 bg-panel-bg/60 text-text-muted hover:border-amber-400/30 hover:text-amber-300'}`}
            >
              {t('decisionRoom.dossierButton')}
            </button>
          </div>
          <div className="mt-1 truncate text-[14px] font-bold text-text-primary">{card.title}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-text-secondary">{card.explanation}</div>
        </div>
        <button
          type="button"
          data-testid={`decision-room-card-action-${card.id}`}
          data-navigation-kind={card.navigationTarget.kind}
          disabled={actionDisabled}
          onClick={() => navigateTarget(card.navigationTarget)}
          className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border disabled:bg-panel-bg/60 disabled:text-text-muted"
        >
          {actionLabel}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.evidence.slice(0, 4).map((entry) => (
          <span key={entry} className="min-w-0 max-w-full break-words rounded border border-panel-border/55 bg-panel-bg/80 px-1.5 py-0.5 text-xs leading-snug text-text-secondary">
            {entry}
          </span>
        ))}
      </div>

      <div className="mt-2 truncate text-xs uppercase tracking-[0.08em] text-text-muted">
        {card.sourceOwner} / {card.sourceLabel}
      </div>
    </article>
  );
}

function isHistoricalOperationAuthorizationCard(card: PresidentialDecisionRoomCard | undefined): boolean {
  return card?.category === 'decision'
    && card.directive?.lever === 'review_proposal'
    && card.sourceLabel === t('decisionRoom.card.historicalOperation.sourceLabel');
}

function historicalAuthorizationRun(
  cards: PresidentialDecisionRoomCard[],
  startIndex: number,
): PresidentialDecisionRoomCard[] {
  const run: PresidentialDecisionRoomCard[] = [];
  for (let index = startIndex; index < cards.length; index += 1) {
    const card = cards[index];
    if (!isHistoricalOperationAuthorizationCard(card)) break;
    run.push(card!);
  }
  return run;
}

function OperationsAuthorizationPacket({
  cards,
  selectedDossierCardId,
  advanceSensitiveCardIds,
  onSelectCard,
  navigateTarget,
  onDirectiveReceipt,
}: {
  cards: PresidentialDecisionRoomCard[];
  selectedDossierCardId: string | null;
  advanceSensitiveCardIds: Set<string>;
  onSelectCard: (cardId: string) => void;
  navigateTarget: DecisionRoomNavigateTarget;
  onDirectiveReceipt: (receipt: DirectiveReceipt) => void;
}) {
  const ipc = useIPC();
  const [authorizing, setAuthorizing] = useState(false);
  const handleAuthorizeHistoricalPacket = async () => {
    if (authorizing || !ipc.isAvailable) return;
    setAuthorizing(true);
    let authorized = 0;
    try {
      for (const card of cards) {
        const proposalId = typeof card.directive?.payload.proposalId === 'string'
          ? card.directive.payload.proposalId
          : '';
        if (!proposalId) {
          onDirectiveReceipt({
            kind: 'error',
            message: t('decisionRoom.historicalOperationPacket.failed', {
              count: authorized,
              reason: t('decisionRoom.historicalOperationPacket.missingProposal'),
            }),
          });
          return;
        }
        const result = await ipc.acceptProposal(proposalId);
        if (!result.ok) {
          onDirectiveReceipt({
            kind: 'error',
            message: t('decisionRoom.historicalOperationPacket.failed', {
              count: authorized,
              reason: result.error ?? t('decisionRoom.historicalOperationPacket.unknownFailure'),
            }),
          });
          return;
        }
        authorized += 1;
      }
      onDirectiveReceipt({
        kind: 'success',
        message: t('decisionRoom.historicalOperationPacket.authorized', { count: authorized }),
      });
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <section
      data-testid="operations-authorization-packet"
      className="border-l-2 border-amber-400/45 pl-2"
      aria-labelledby="operations-authorization-packet-title"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h3
          id="operations-authorization-packet-title"
          className="text-xs font-bold uppercase tracking-[0.08em] text-amber-200"
        >
          {t('decisionRoom.historicalOperationPacket.title')}
        </h3>
        <span className="text-xs font-semibold text-text-secondary">
          {t('decisionRoom.historicalOperationPacket.count', { count: cards.length })}
        </span>
        <button
          type="button"
          onClick={() => { void handleAuthorizeHistoricalPacket(); }}
          disabled={authorizing || !ipc.isAvailable}
          className="rounded border border-amber-400/45 bg-amber-400/15 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-400/25 disabled:cursor-default disabled:opacity-45"
        >
          {authorizing
            ? t('decisionRoom.historicalOperationPacket.authorizing')
            : t('decisionRoom.historicalOperationPacket.authorize')}
        </button>
      </div>
      <div className="space-y-2">
        {cards.map((card) => (
          <PriorityCard
            key={card.id}
            card={card}
            active={selectedDossierCardId === card.id}
            advanceSensitive={advanceSensitiveCardIds.has(card.id)}
            onSelectCard={onSelectCard}
            navigateTarget={navigateTarget}
          />
        ))}
      </div>
    </section>
  );
}

function PriorityDossier({
  dossier,
  cardsById,
  onSelectCard,
  gameState,
  navigateTarget,
  onDirectiveReceipt,
}: {
  dossier: PresidentialDecisionRoomDossier | null;
  cardsById: Map<string, PresidentialDecisionRoomCard>;
  onSelectCard: (cardId: string) => void;
  gameState: LoadedGameState | null;
  navigateTarget: DecisionRoomNavigateTarget;
  onDirectiveReceipt: (receipt: DirectiveReceipt) => void;
}) {
  if (!dossier) {
    return (
      <div className="rounded border border-panel-border/55 bg-[#121820]/95 px-2 py-2 text-xs text-text-secondary">
        {t('decisionRoom.noPriorityDossier')}
      </div>
    );
  }

  const exactSourceHandoffTarget = cardsById.get(dossier.cardId)?.sourceHandoffTarget;
  const reviewTarget = dossier.navigationTarget.kind === 'decision-room'
    ? exactSourceHandoffTarget ?? dossier.sourceHandoff?.navigationTarget ?? dossier.navigationTarget
    : dossier.navigationTarget;
  const reviewActionLabel = dossier.navigationTarget.kind === 'decision-room' && dossier.sourceHandoff
    ? dossier.sourceHandoff.actionLabel
    : dossier.actionLabel;
  const reviewIsCurrentDossier = reviewTarget.kind === 'decision-room'
    && reviewTarget.cardId === dossier.cardId;
  const reviewDisabled = reviewTarget.kind === 'none' || reviewIsCurrentDossier;
  const effectiveReviewActionLabel = reviewIsCurrentDossier
    ? t('decisionRoom.action.currentDossier')
    : reviewActionLabel;
  const relatedCards = dossier.relatedCardIds
    .map((cardId) => cardsById.get(cardId) ?? null)
    .filter((card): card is PresidentialDecisionRoomCard => card != null);

  return (
    <section
      data-testid="decision-room-active-dossier"
      data-card-id={dossier.cardId}
      className="rounded border border-amber-400/30 bg-[#15191f] px-3 py-2 shadow-[inset_3px_0_0_rgba(251,191,36,0.45)]"
    >
      <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-amber-300">{t('decisionRoom.priorityDossier')}</div>
          <div className="mt-1 text-[14px] font-bold leading-snug text-text-primary">{dossier.title}</div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-bold uppercase ${severityClass(dossier.severity)}`}>
          {categoryLabel(dossier.category)}
        </span>
      </div>

      <div className="text-[12px] leading-snug text-text-secondary">{dossier.explanation}</div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded border border-panel-border/65 bg-[#101318] px-2 py-1">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">{t('decisionRoom.source')}</div>
          <div className="mt-0.5 break-words text-[12px] font-semibold leading-snug text-text-primary">{dossier.sourceOwner}</div>
          <div className="break-words text-xs leading-snug uppercase tracking-[0.05em] text-text-muted">{dossier.sourceLabel}</div>
        </div>
        <div className="rounded border border-panel-border/65 bg-[#101318] px-2 py-1">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">{t('decisionRoom.advance')}</div>
          <div className={`mt-0.5 break-words text-[12px] font-semibold leading-snug ${dossier.advanceSensitive ? 'text-amber-300' : 'text-text-primary'}`}>
            {dossier.advanceLabel}
          </div>
        </div>
      </div>

      {dossier.evidence.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">{t('decisionRoom.evidence')}</div>
          <div className="flex flex-wrap gap-1.5">
            {dossier.evidence.map((entry) => (
              <span key={entry} className="min-w-0 max-w-full break-words rounded border border-panel-border/65 bg-[#101318] px-1.5 py-0.5 text-xs leading-snug text-text-secondary">
                {entry}
              </span>
            ))}
          </div>
        </div>
      )}

      {relatedCards.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">{t('decisionRoom.sameSurface')}</div>
          <div className="space-y-1">
            {relatedCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectCard(card.id)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded border border-panel-border/65 bg-[#101318] px-2 py-1 text-left transition hover:border-amber-400/25 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 break-words text-xs font-semibold leading-snug text-text-primary">{card.title}</span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-bold uppercase ${severityClass(card.severity)}`}>
                  {categoryLabel(card.category)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* War-Direction directive: ISSUE the lever inline (Presidential Command
          Surface §2). Rendered ABOVE the navigate button — the navigate button
          remains the commander's deep-drill path. */}
      {dossier.directive && gameState && (
        <DirectiveCard
          directive={dossier.directive}
          gameState={gameState}
          onReceipt={onDirectiveReceipt}
        />
      )}

      <div
        data-decision-room-dossier-actions="true"
        className="mt-2 border-t border-panel-border/60 pt-2"
      >
        <button
          type="button"
          data-testid="decision-room-dossier-review"
          data-navigation-kind={reviewTarget.kind}
          disabled={reviewDisabled}
          onClick={() => navigateTarget(reviewTarget)}
          className="h-8 w-full truncate rounded border border-amber-400/35 bg-amber-400/12 px-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
        >
          {effectiveReviewActionLabel}
        </button>
      </div>
    </section>
  );
}

export interface PresidentialDecisionRoomPanelProps {
  onNavigateTarget?: DecisionRoomNavigateTarget;
}

export function PresidentialDecisionRoomPanel({ onNavigateTarget }: PresidentialDecisionRoomPanelProps = {}) {
  const state = useGameStore((s) => s.loadedGameState);
  const osidNameMap = useGameStore((s) => s.osidDisplayNames);
  const [activeLens, setActiveLens] = useState<ActiveDecisionRoomLens>('all');
  const [activeCommandCategoryId, setActiveCommandCategoryId] = useState<PresidentialCommandCategoryId | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<DirectiveReceipt | null>(null);
  const dossierScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!actionReceipt) return undefined;
    const timeout = window.setTimeout(() => setActionReceipt(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [actionReceipt]);

  // Command-surface deep-link: the card strip pushes a requested lens here; we
  // consume it (one-shot) and pre-filter the Decision Room to that category.
  const lensRequest = useSyncExternalStore(
    subscribeDecisionRoomLensRequest,
    getDecisionRoomLensRequestSnapshot,
    getDecisionRoomLensRequestSnapshot,
  );
  useEffect(() => {
    if (lensRequest === null) return;
    const requested = consumeRequestedDecisionRoomLens();
    if (requested === null) return;
    setActiveLens(requested.lens);
    setActiveCommandCategoryId(requested.commandCategoryId);
    setActiveCardId(requested.cardId ?? null);
  }, [lensRequest]);

  const categorySeedCardId = useMemo(() => {
    if (activeCardId || !activeCommandCategoryId) return null;
    const seedView = buildPresidentialDecisionRoomView({ state, osidNameMap });
    return seedView.cards.find((card) => cardBelongsToPresidentialCommandCategory(card, activeCommandCategoryId))?.id ?? null;
  }, [state, osidNameMap, activeCardId, activeCommandCategoryId]);
  const selectedCardId = activeCardId ?? categorySeedCardId;
  useEffect(() => {
    if (dossierScrollRef.current) dossierScrollRef.current.scrollTop = 0;
  }, [selectedCardId]);
  const view = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap, selectedCardId }),
    [state, osidNameMap, selectedCardId],
  );
  const cardsById = useMemo(
    () => new Map(view.cards.map((card) => [card.id, card])),
    [view.cards],
  );
  useEffect(() => {
    if (activeCardId && !cardsById.has(activeCardId)) {
      setActiveCardId(null);
    }
  }, [activeCardId, cardsById]);
  if (!view.hasPlayerFaction) {
    return (
      <section className="mb-2">
        <div className="rounded border border-panel-border/60 bg-[#121820]/95 px-3 py-3 text-xs text-text-secondary">
          {view.emptyState}
        </div>
      </section>
    );
  }

  const availableLensIds = new Set(view.lenses.map((lens) => lens.id));
  const effectiveLens: ActiveDecisionRoomLens = activeLens === 'all' || availableLensIds.has(activeLens) ? activeLens : 'all';
  const filteredCards = activeCommandCategoryId
    ? view.cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, activeCommandCategoryId))
    : effectiveLens === 'all'
    ? view.cards
    : view.cards.filter((card) => card.category === effectiveLens);
  const filteredCardIds = new Set(filteredCards.map((card) => card.id));
  const visibleDossier = view.activeDossier && filteredCardIds.has(view.activeDossier.cardId)
    ? view.activeDossier
    : null;
  const filteredEmptyState = activeCommandCategoryId
    ? t('decisionRoom.noCommandCategoryItems')
    : view.emptyState;
  const advanceSensitiveCardIds = new Set(view.advanceReadiness.items.map((card) => card.id));
  const readinessStatusClass = view.advanceReadiness.blockedByExistingSystems
    ? 'border-red-400/35 bg-red-500/10 text-red-300'
    : view.advanceReadiness.items.length > 0
      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  const selectedDossierCardId = visibleDossier?.cardId ?? null;
  const activeCommandCategoryLabel = activeCommandCategoryId
    ? commandCategoryLabel(activeCommandCategoryId)
    : null;
  const navigateTarget = onNavigateTarget ?? openPresidentialDecisionRoomNavigationTarget;
  const handleSelectCard = (cardId: string) => {
    if (cardId === selectedCardId && dossierScrollRef.current) dossierScrollRef.current.scrollTop = 0;
    setActiveCardId(cardId);
  };
  const handleSelectLens = (id: ActiveDecisionRoomLens) => {
    setActiveLens(id);
    setActiveCommandCategoryId(null);
    const lens = view.lenses.find((entry) => entry.id === id);
    setActiveCardId(lens?.topCardId ?? null);
  };

  return (
    <section
      className="mb-2"
      data-testid="presidential-decision-room"
      data-command-category-id={activeCommandCategoryId ?? ''}
      data-tutorial-step="decision-room"
      data-coachmark-id="decision-room"
    >
      <div
        data-testid="decision-room-heading"
        className="mb-2 flex flex-wrap items-end justify-between gap-2 rounded border border-panel-border/70 bg-[#10151d]/95 px-3 py-2 shadow-sm"
      >
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">{t('decisionRoom.title')}</div>
          <div className="text-[15px] font-bold tracking-[0.02em] text-text-primary">{t('decisionRoom.subtitle')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`rounded border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] ${readinessStatusClass}`}>
            {view.advanceReadiness.headline}
          </div>
        </div>
      </div>

      {actionReceipt && (
        <div
          role="status"
          aria-live="polite"
          data-testid="decision-room-action-receipt"
          className={`mb-2 rounded border px-3 py-2 text-xs font-semibold ${
            actionReceipt.kind === 'error'
              ? 'border-red-500/45 bg-red-500/10 text-red-200'
              : actionReceipt.kind === 'cancelled'
                ? 'border-panel-border/70 bg-[#10151d]/95 text-text-secondary'
                : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
          }`}
        >
          {actionReceipt.message}
        </div>
      )}

      {view.lenses.length > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {view.lenses.map((lens) => (
            <LensButton
              key={lens.id}
              lens={lens}
              active={activeCommandCategoryId === null && effectiveLens === lens.id}
              onSelect={handleSelectLens}
            />
          ))}
        </div>
      )}

      {activeCommandCategoryLabel && (
        <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2 rounded border border-amber-400/30 bg-amber-400/[0.07] px-2 py-1.5">
          <div role="status" aria-live="polite" className="text-xs font-semibold text-amber-200">
            {t('decisionRoom.commandCategoryFilter.active', { category: activeCommandCategoryLabel })}
          </div>
          <button
            type="button"
            data-testid="decision-room-clear-command-category"
            aria-label={t('decisionRoom.commandCategoryFilter.clear')}
            onClick={() => handleSelectLens('all')}
            className="h-7 shrink-0 rounded border border-panel-border/70 bg-[#121820]/90 px-2 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary transition hover:border-amber-400/35 hover:text-amber-200"
          >
            {t('decisionRoom.commandCategoryFilter.clear')}
          </button>
        </div>
      )}

      {view.cards.length === 0 ? (
        <div className="rounded border border-panel-border/55 bg-[#121820]/95 px-3 py-3 text-xs text-text-secondary">
          {view.emptyState}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded border border-panel-border/55 bg-[#121820]/95 px-3 py-3 text-xs text-text-secondary">
          {filteredEmptyState}
        </div>
      ) : (
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-2 pr-1">
          {filteredCards.map((card, index) => {
            if (isHistoricalOperationAuthorizationCard(card)) {
              if (isHistoricalOperationAuthorizationCard(filteredCards[index - 1])) return null;
              const packetCards = historicalAuthorizationRun(filteredCards, index);
              if (packetCards.length > 1) {
                return (
                  <OperationsAuthorizationPacket
                    key={`operations-authorization-packet:${card.id}`}
                    cards={packetCards}
                    selectedDossierCardId={selectedDossierCardId}
                    advanceSensitiveCardIds={advanceSensitiveCardIds}
                    onSelectCard={handleSelectCard}
                    navigateTarget={navigateTarget}
                    onDirectiveReceipt={setActionReceipt}
                  />
                );
              }
            }
            return (
              <PriorityCard
                key={card.id}
                card={card}
                active={selectedDossierCardId === card.id}
                advanceSensitive={advanceSensitiveCardIds.has(card.id)}
                onSelectCard={handleSelectCard}
                navigateTarget={navigateTarget}
              />
            );
          })}
        </div>

        <aside
          ref={dossierScrollRef}
          data-testid="decision-room-dossier-scroll"
          aria-label={t('decisionRoom.priorityDossier')}
          className="space-y-2 lg:sticky lg:top-0 lg:self-start"
        >
          <div>
            <PriorityDossier
              dossier={visibleDossier}
              cardsById={cardsById}
              onSelectCard={handleSelectCard}
              gameState={state}
              navigateTarget={navigateTarget}
              onDirectiveReceipt={setActionReceipt}
            />
          </div>
        </aside>
      </div>
      )}
    </section>
  );
}
