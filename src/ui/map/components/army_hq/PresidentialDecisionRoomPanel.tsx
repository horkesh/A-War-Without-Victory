import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';
import { t } from '../../i18n';
import { DirectiveCard } from './DirectiveCard';
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
      onClick={() => onSelect(lens.id)}
      className={`flex h-9 min-w-[5.75rem] shrink-0 items-center justify-between gap-2 rounded border px-2 text-left transition ${active
        ? 'border-amber-400/45 bg-amber-400/12 text-amber-200'
        : 'border-panel-border/55 bg-panel-card/45 text-text-secondary hover:border-amber-400/25 hover:bg-white/[0.04]'}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-bold uppercase tracking-[0.11em]">
          {isAllLens ? t('decisionRoom.lens.all') : lens.label}
        </span>
        <span className="block text-[8px] uppercase tracking-[0.08em] text-text-muted">
          {t('decisionRoom.itemCount', { count: lens.count })}
        </span>
      </span>
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold tabular-nums ${lens.urgentCount > 0
        ? 'border-red-400/35 bg-red-500/10 text-red-300'
        : 'border-panel-border/55 bg-panel-bg/70 text-text-muted'}`}
      >
        {lens.urgentCount}
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

  return (
    <article
      data-testid={`decision-room-priority-card-${card.id}`}
      className={`min-h-[7.25rem] rounded border px-3 py-2 transition ${active
      ? 'border-amber-400/45 bg-amber-400/10 shadow-[inset_3px_0_0_rgba(251,191,36,0.55)]'
      : 'border-panel-border/55 bg-panel-card/55'}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${severityClass(card.severity)}`}>
              {severityLabel(card.severity)}
            </span>
            <span className="rounded border border-panel-border/70 bg-panel-bg/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              {categoryLabel(card.category)}
            </span>
            {advanceSensitive && (
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300">
                {t('decisionRoom.advanceSensitiveBadge')}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelectCard(card.id)}
              className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] transition ${active
                ? 'border-amber-400/35 bg-amber-400/15 text-amber-200'
                : 'border-panel-border/60 bg-panel-bg/60 text-text-muted hover:border-amber-400/30 hover:text-amber-300'}`}
            >
              {t('decisionRoom.dossierButton')}
            </button>
          </div>
          <div className="mt-1 truncate text-[12px] font-bold text-text-primary">{card.title}</div>
          <div className="mt-0.5 max-h-8 overflow-hidden text-[10px] leading-snug text-text-secondary">{card.explanation}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => navigateTarget(card.navigationTarget)}
          className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.11em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border disabled:bg-panel-bg/60 disabled:text-text-muted"
        >
          {card.actionLabel}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.evidence.slice(0, 4).map((entry) => (
          <span key={entry} className="min-w-0 max-w-full truncate rounded border border-panel-border/55 bg-panel-bg/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-text-secondary">
            {entry}
          </span>
        ))}
      </div>

      <div className="mt-2 truncate text-[8px] uppercase tracking-[0.12em] text-text-muted">
        {card.sourceOwner} / {card.sourceLabel}
      </div>
    </article>
  );
}

function PriorityDossier({
  dossier,
  cardsById,
  onSelectCard,
  gameState,
  navigateTarget,
}: {
  dossier: PresidentialDecisionRoomDossier | null;
  cardsById: Map<string, PresidentialDecisionRoomCard>;
  onSelectCard: (cardId: string) => void;
  gameState: LoadedGameState | null;
  navigateTarget: DecisionRoomNavigateTarget;
}) {
  if (!dossier) {
    return (
      <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
        {t('decisionRoom.noPriorityDossier')}
      </div>
    );
  }

  const disabled = dossier.navigationTarget.kind === 'none';
  const relatedCards = dossier.relatedCardIds
    .map((cardId) => cardsById.get(cardId) ?? null)
    .filter((card): card is PresidentialDecisionRoomCard => card != null);

  return (
    <section className="rounded border border-amber-400/25 bg-panel-card/65 px-3 py-2 shadow-[inset_3px_0_0_rgba(251,191,36,0.45)]">
      <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-300">{t('decisionRoom.priorityDossier')}</div>
          <div className="mt-1 text-[12px] font-bold leading-snug text-text-primary">{dossier.title}</div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${severityClass(dossier.severity)}`}>
          {categoryLabel(dossier.category)}
        </span>
      </div>

      <div className="text-[10px] leading-snug text-text-secondary">{dossier.explanation}</div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded border border-panel-border/55 bg-panel-bg/60 px-2 py-1">
          <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-text-muted">{t('decisionRoom.source')}</div>
          <div className="mt-0.5 truncate text-[10px] font-semibold text-text-primary">{dossier.sourceOwner}</div>
          <div className="truncate text-[8px] uppercase tracking-[0.08em] text-text-muted">{dossier.sourceLabel}</div>
        </div>
        <div className="rounded border border-panel-border/55 bg-panel-bg/60 px-2 py-1">
          <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-text-muted">{t('decisionRoom.advance')}</div>
          <div className={`mt-0.5 truncate text-[10px] font-semibold ${dossier.advanceSensitive ? 'text-amber-300' : 'text-text-primary'}`}>
            {dossier.advanceLabel}
          </div>
        </div>
      </div>

      {dossier.evidence.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionRoom.evidence')}</div>
          <div className="flex flex-wrap gap-1.5">
            {dossier.evidence.map((entry) => (
              <span key={entry} className="min-w-0 max-w-full truncate rounded border border-panel-border/55 bg-panel-bg/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-text-secondary">
                {entry}
              </span>
            ))}
          </div>
        </div>
      )}

      {relatedCards.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">{t('decisionRoom.sameSurface')}</div>
          <div className="space-y-1">
            {relatedCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectCard(card.id)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded border border-panel-border/55 bg-panel-bg/55 px-2 py-1 text-left transition hover:border-amber-400/25 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate text-[9px] font-semibold text-text-primary">{card.title}</span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${severityClass(card.severity)}`}>
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
        <DirectiveCard directive={dossier.directive} gameState={gameState} />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => navigateTarget(dossier.navigationTarget)}
        className="mt-2 h-8 w-full truncate rounded border border-amber-400/35 bg-amber-400/12 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
      >
        {dossier.actionLabel}
      </button>
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
  useEffect(() => {
    if (
      activeCommandCategoryId
      && view.cards.length > 0
      && !view.cards.some((card) => cardBelongsToPresidentialCommandCategory(card, activeCommandCategoryId))
    ) {
      setActiveCommandCategoryId(null);
    }
  }, [activeCommandCategoryId, view.cards]);

  if (!view.hasPlayerFaction) {
    return (
      <section className="mb-2">
        <div className="rounded border border-panel-border/60 bg-panel-card/55 px-3 py-3 text-[11px] text-text-secondary">
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
  const advanceSensitiveCardIds = new Set(view.advanceReadiness.items.map((card) => card.id));
  const selectedDossierCardId = view.activeDossier?.cardId ?? null;
  const navigateTarget = onNavigateTarget ?? openPresidentialDecisionRoomNavigationTarget;
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
      data-tutorial-step="decision-room"
      data-coachmark-id="decision-room"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-panel-border pb-1">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-text-secondary">{t('decisionRoom.title')}</div>
          <div className="text-[13px] font-bold tracking-[0.02em] text-text-primary">{t('decisionRoom.subtitle')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${view.advanceReadiness.blockedByExistingSystems ? 'border-red-400/35 bg-red-500/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
            {view.advanceReadiness.headline}
          </div>
        </div>
      </div>

      {view.lenses.length > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {view.lenses.map((lens) => (
            <LensButton
              key={lens.id}
              lens={lens}
              active={effectiveLens === lens.id}
              onSelect={handleSelectLens}
            />
          ))}
        </div>
      )}

      {view.cards.length === 0 ? (
        <div className="rounded border border-panel-border/55 bg-panel-card/55 px-3 py-3 text-[11px] text-text-secondary">
          {view.emptyState}
        </div>
      ) : (
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
        <div className="max-h-[min(70vh,52rem)] space-y-2 overflow-y-auto pr-1">
          {filteredCards.length === 0 ? (
            <div className="rounded border border-panel-border/55 bg-panel-card/55 px-3 py-3 text-[11px] text-text-secondary">
              {view.emptyState}
            </div>
          ) : filteredCards.map((card) => (
            <PriorityCard
              key={card.id}
              card={card}
              active={selectedDossierCardId === card.id}
              advanceSensitive={advanceSensitiveCardIds.has(card.id)}
              onSelectCard={setActiveCardId}
              navigateTarget={navigateTarget}
            />
          ))}
        </div>

        <aside className="space-y-2">
          <div>
            <PriorityDossier
              dossier={view.activeDossier}
              cardsById={cardsById}
              onSelectCard={setActiveCardId}
              gameState={state}
              navigateTarget={navigateTarget}
            />
          </div>
        </aside>
      </div>
      )}
    </section>
  );
}
