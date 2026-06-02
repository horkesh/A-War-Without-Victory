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
  type PresidentialDecisionRoomCommandQuestion,
  type PresidentialDecisionRoomDossier,
  type PresidentialDecisionRoomLens,
  type PresidentialDecisionRoomLoopStep,
  type PresidentialDecisionRoomSeverity,
  type PresidentialDecisionRoomSourceHandoff,
} from '../../data/presidentialDecisionRoom';
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

function MetricCell({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'urgent' }) {
  return (
    <div className="min-w-0 rounded border border-panel-border/60 bg-panel-card/70 px-2 py-1.5">
      <div className="truncate text-[8px] font-bold uppercase tracking-[0.13em] text-text-muted">{label}</div>
      <div className={`text-[15px] font-bold tabular-nums ${tone === 'urgent' ? 'text-amber-300' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}

type ActiveDecisionRoomLens = 'all' | PresidentialDecisionRoomCategory;

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

function CommandQuestionLane({ question }: { question: PresidentialDecisionRoomCommandQuestion }) {
  const disabled = question.navigationTarget.kind === 'none';
  return (
    <article className="min-w-0 rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">
            {question.label}
          </div>
          <div className="mt-1 truncate text-[11px] font-bold text-text-primary">
            {question.headline}
          </div>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold tabular-nums ${question.urgentCount > 0
          ? 'border-red-400/35 bg-red-500/10 text-red-300'
          : 'border-panel-border/55 bg-panel-bg/70 text-text-muted'}`}
        >
          {question.count}
        </span>
      </div>
      <div className="mt-1 truncate text-[9px] uppercase tracking-[0.08em] text-text-secondary">
        {question.summary}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => openPresidentialDecisionRoomNavigationTarget(question.navigationTarget)}
        className="mt-2 h-7 w-full truncate rounded border border-amber-400/25 bg-amber-400/10 px-2 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
      >
        {question.actionLabel}
      </button>
    </article>
  );
}

function ProductLoopStep({ step }: { step: PresidentialDecisionRoomLoopStep }) {
  const disabled = step.navigationTarget.kind === 'none';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => openPresidentialDecisionRoomNavigationTarget(step.navigationTarget)}
      className="flex min-h-[4.75rem] min-w-0 flex-col justify-between rounded border border-panel-border/55 bg-panel-card/50 px-2 py-2 text-left transition hover:border-amber-400/25 hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-55"
    >
      <span className="min-w-0">
        <span className="block truncate text-[8px] font-bold uppercase tracking-[0.14em] text-amber-300">
          {step.label}
        </span>
        <span className="mt-1 block truncate text-[10px] font-semibold text-text-primary">
          {step.headline}
        </span>
      </span>
      <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[8px] uppercase tracking-[0.08em] text-text-muted">{step.summary}</span>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold tabular-nums ${step.urgentCount > 0
          ? 'border-red-400/35 bg-red-500/10 text-red-300'
          : 'border-panel-border/55 bg-panel-bg/70 text-text-muted'}`}
        >
          {step.count}
        </span>
      </span>
    </button>
  );
}

function PriorityCard({
  card,
  active,
  onSelectCard,
}: {
  card: PresidentialDecisionRoomCard;
  active: boolean;
  onSelectCard: (cardId: string) => void;
}) {
  const disabled = card.navigationTarget.kind === 'none';

  return (
    <article className={`min-h-[7.25rem] rounded border px-3 py-2 transition ${active
      ? 'border-amber-400/45 bg-amber-400/10 shadow-[inset_3px_0_0_rgba(251,191,36,0.55)]'
      : 'border-panel-border/55 bg-panel-card/55'}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${severityClass(card.severity)}`}>
              {card.severity}
            </span>
            <span className="rounded border border-panel-border/70 bg-panel-bg/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              {categoryLabel(card.category)}
            </span>
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
          onClick={() => openPresidentialDecisionRoomNavigationTarget(card.navigationTarget)}
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
}: {
  dossier: PresidentialDecisionRoomDossier | null;
  cardsById: Map<string, PresidentialDecisionRoomCard>;
  onSelectCard: (cardId: string) => void;
  gameState: LoadedGameState | null;
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
          <div className="truncate text-[8px] uppercase tracking-[0.08em] text-text-muted">
            {dossier.sourceHandoff?.summary ?? t('decisionRoom.noHandoff')}
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
        onClick={() => openPresidentialDecisionRoomNavigationTarget(dossier.navigationTarget)}
        className="mt-2 h-8 w-full truncate rounded border border-amber-400/35 bg-amber-400/12 px-2 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
      >
        {dossier.actionLabel}
      </button>
    </section>
  );
}

function CompactLink({ card }: { card: PresidentialDecisionRoomCard }) {
  return (
    <button
      type="button"
      onClick={() => openPresidentialDecisionRoomNavigationTarget(card.navigationTarget)}
      className="flex min-w-0 items-center justify-between gap-2 rounded border border-panel-border/55 bg-panel-card/55 px-2 py-1.5 text-left transition hover:border-amber-400/25 hover:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold text-text-primary">{card.title}</span>
        <span className="block truncate text-[8px] uppercase tracking-[0.1em] text-text-muted">{card.actionLabel}</span>
      </span>
      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${severityClass(card.severity)}`}>
        {categoryLabel(card.category)}
      </span>
    </button>
  );
}

function SourceHandoffLink({ handoff }: { handoff: PresidentialDecisionRoomSourceHandoff }) {
  const disabled = handoff.navigationTarget.kind === 'none';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => openPresidentialDecisionRoomNavigationTarget(handoff.navigationTarget)}
      className="flex min-w-0 items-center justify-between gap-2 rounded border border-panel-border/55 bg-panel-card/55 px-2 py-1.5 text-left transition hover:border-amber-400/25 hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-55"
    >
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold text-text-primary">{handoff.label}</span>
        <span className="block truncate text-[8px] uppercase tracking-[0.1em] text-text-muted">{handoff.summary}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {handoff.urgentCount > 0 && (
          <span className="rounded border border-red-400/35 bg-red-500/10 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-red-300">
            {handoff.urgentCount}
          </span>
        )}
        <span className="rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.09em] text-amber-300">
          {handoff.actionLabel}
        </span>
      </span>
    </button>
  );
}

export function PresidentialDecisionRoomPanel() {
  const state = useGameStore((s) => s.loadedGameState);
  const osidNameMap = useGameStore((s) => s.osidDisplayNames);
  const [activeLens, setActiveLens] = useState<ActiveDecisionRoomLens>('all');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Command-surface deep-link: the card strip pushes a requested lens here; we
  // consume it (one-shot) and pre-filter the Decision Room to that category.
  // The lens bar lives in the advanced desk, so we reveal it for non-`all` lenses.
  const lensRequest = useSyncExternalStore(
    subscribeDecisionRoomLensRequest,
    getDecisionRoomLensRequestSnapshot,
    getDecisionRoomLensRequestSnapshot,
  );
  useEffect(() => {
    if (lensRequest === null) return;
    const requested = consumeRequestedDecisionRoomLens();
    if (requested === null) return;
    setActiveLens(requested);
    setActiveCardId(null);
    if (requested !== 'all') setShowAdvanced(true);
  }, [lensRequest]);

  const view = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap, selectedCardId: activeCardId }),
    [state, osidNameMap, activeCardId],
  );
  const cardsById = useMemo(
    () => new Map(view.cards.map((card) => [card.id, card])),
    [view.cards],
  );

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
  const filteredCards = effectiveLens === 'all'
    ? view.cards
    : view.cards.filter((card) => card.category === effectiveLens);
  const mainCards = filteredCards.slice(0, showAdvanced ? 7 : 4);
  const inspectNext = (effectiveLens === 'all'
    ? view.inspectNext
    : filteredCards.filter((card) => card.navigationTarget.kind !== 'none')).slice(0, 5);
  const selectedDossierCardId = view.activeDossier?.cardId ?? null;
  const handleSelectLens = (id: ActiveDecisionRoomLens) => {
    setActiveLens(id);
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
          <div className="text-[13px] font-bold uppercase tracking-[0.05em] text-text-primary">{t('decisionRoom.subtitle')}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextShowAdvanced = !showAdvanced;
              setShowAdvanced(nextShowAdvanced);
              if (!nextShowAdvanced) {
                setActiveLens('all');
              }
            }}
            className="rounded border border-panel-border/65 bg-panel-card/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary transition hover:border-amber-400/30 hover:bg-white/[0.04] hover:text-amber-300"
            aria-pressed={showAdvanced}
          >
            {showAdvanced ? t('decisionRoom.hideAdvanced') : t('decisionRoom.viewAdvanced')}
          </button>
          <div className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${view.advanceReadiness.blockedByExistingSystems ? 'border-red-400/35 bg-red-500/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
            {view.advanceReadiness.headline}
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="mb-2 rounded border border-panel-border/55 bg-panel-bg/35 p-2" data-testid="decision-room-advanced">
          <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.advancedDesk')}</div>
          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MetricCell label={t('decisionRoom.metric.urgent')} value={view.metrics.urgentCount} tone={view.metrics.urgentCount > 0 ? 'urgent' : 'neutral'} />
            <MetricCell label={t('decisionRoom.metric.pending')} value={view.metrics.pendingReviews} tone={view.metrics.pendingReviews > 0 ? 'urgent' : 'neutral'} />
            <MetricCell label={t('decisionRoom.metric.ops')} value={view.metrics.opportunities} />
            <MetricCell label={t('decisionRoom.metric.hardTurns')} value={view.metrics.hardTurns} />
            <MetricCell label={t('decisionRoom.metric.advanceReview')} value={view.metrics.advanceReviewCount} />
          </div>
          {view.loopSteps.length > 0 && (
            <div>
              <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.productLoop')}</div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
                {view.loopSteps.map((step) => (
                  <ProductLoopStep key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view.commandQuestions.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.commandLoop')}</div>
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
            {view.commandQuestions.map((question) => (
              <CommandQuestionLane key={question.id} question={question} />
            ))}
          </div>
        </div>
      )}

      {showAdvanced && view.lenses.length > 0 && (
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

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-2">
          {mainCards.length === 0 ? (
            <div className="rounded border border-panel-border/55 bg-panel-card/55 px-3 py-3 text-[11px] text-text-secondary">
              {view.emptyState}
            </div>
          ) : mainCards.map((card) => (
            <PriorityCard
              key={card.id}
              card={card}
              active={selectedDossierCardId === card.id}
              onSelectCard={setActiveCardId}
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
            />
          </div>

          {showAdvanced && (
          <div>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.inspectNext')}</div>
            <div className="space-y-1.5">
              {inspectNext.length === 0 ? (
                <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
                  {t('decisionRoom.noInspectionHandoffs')}
                </div>
              ) : inspectNext.map((card) => (
                <CompactLink key={card.id} card={card} />
              ))}
            </div>
          </div>
          )}

          {showAdvanced && (
          <div>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.sourceHandoffs')}</div>
            <div className="space-y-1.5">
              {view.sourceHandoffs.length === 0 ? (
                <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
                  {t('decisionRoom.noSourceHandoffs')}
                </div>
              ) : view.sourceHandoffs.map((handoff) => (
                <SourceHandoffLink key={handoff.id} handoff={handoff} />
              ))}
            </div>
          </div>
          )}

          <div>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">{t('decisionRoom.reviewBeforeAdvance')}</div>
            <div className="space-y-1.5">
              {view.advanceReadiness.items.length === 0 ? (
                <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
                  {t('decisionRoom.noBuriedItems')}
                </div>
              ) : view.advanceReadiness.items.map((card) => (
                <CompactLink key={`advance:${card.id}`} card={card} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
