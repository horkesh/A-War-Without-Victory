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
} from '../../utils/decisionRoomLensRequest';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomNavigationTarget,
} from '../../data/presidentialDecisionRoom';
import {
  cardBelongsToPresidentialCommandCategory,
  PRESIDENTIAL_COMMAND_CATEGORIES,
  type PresidentialCommandCategoryId,
} from '../../data/presidentialCategories';
import { resolveCommandCardArt } from '../../data/commandSurfaceArt';
import { resolveDirectiveActArt } from '../../data/directiveActArt';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';
import { turnToDateString } from '../../utils/formatters';
import { t, type MessageKey } from '../../i18n';
import { DirectiveCard, type DirectiveReceipt } from '../army_hq/DirectiveCard';
import type { FieldOperationPlanTarget } from '../../utils/fieldInspectionTarget';

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
  if (group === 'needs') return { label: t('commandSurface.chip.needs'), className: 'border-red-400/50 text-red-200' };
  if (group === 'actions') {
    const cost = card.directive?.cost ?? 0;
    return {
      label: cost === 0 ? t('commandSurface.chip.free') : t('commandSurface.chip.cost', { cost }),
      className: 'border-amber-400/40 text-amber-200',
    };
  }
  if (group === 'review') return { label: t('commandSurface.chip.review'), className: 'border-amber-400/45 text-amber-200' };
  if (group === 'watch') return { label: t('commandSurface.chip.watch'), className: 'border-sky-400/40 text-sky-200' };
  return { label: t('commandSurface.chip.record'), className: 'border-panel-border text-text-secondary' };
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

  const baseView = useMemo(() => buildPresidentialDecisionRoomView({ state, osidNameMap }), [state, osidNameMap]);
  const areas = useMemo(() => PRESIDENTIAL_COMMAND_CATEGORIES.map((category) => {
    const cards = baseView.cards.filter((card) => cardBelongsToPresidentialCommandCategory(card, category.id));
    const counts: Record<MatterGroup, number> = { needs: 0, review: 0, actions: 0, watch: 0, record: 0 };
    for (const card of cards) counts[matterGroup(card)] += card.countWeight ?? 1;
    return { id: category.id, cards, counts };
  }), [baseView.cards]);

  // Deep links: a requested card selects it and its area; an area opens it; a legacy
  // lens opens the first area holding a card of that kind.
  const lensRequest = useSyncExternalStore(subscribeDecisionRoomLensRequest, getDecisionRoomLensRequestSnapshot, getDecisionRoomLensRequestSnapshot);
  useEffect(() => {
    if (lensRequest === null) return;
    const requested = consumeRequestedDecisionRoomLens();
    if (requested === null) return;
    const requestedCard = requested.cardId ? baseView.cards.find((card) => card.id === requested.cardId) : undefined;
    if (requestedCard) {
      const home = areas.find((area) => area.cards.some((card) => card.id === requestedCard.id));
      if (home) setAreaId(home.id);
      setCardId(requestedCard.id);
      return;
    }
    if (requested.commandCategoryId) {
      setAreaId(requested.commandCategoryId);
      setCardId(null);
      return;
    }
    if (requested.lens !== 'all') {
      const home = areas.find((area) => area.cards.some((card) => card.category === requested.lens));
      if (home) { setAreaId(home.id); setCardId(null); }
    }
  }, [lensRequest, baseView.cards, areas]);

  const firstBusyArea = areas.find((area) => area.counts.needs > 0) ?? areas.find((area) => area.cards.length > 0) ?? areas[0] ?? EMPTY_AREA;
  const activeArea = areas.find((area) => area.id === areaId) ?? firstBusyArea;
  const groups = GROUP_ORDER
    .map((group) => ({ group, cards: activeArea.cards.filter((card) => matterGroup(card) === group) }))
    .filter((entry) => entry.cards.length > 0);
  const orderedCards = groups.flatMap((entry) => entry.cards);
  const selectedCardId = cardId && orderedCards.some((card) => card.id === cardId) ? cardId : orderedCards[0]?.id ?? null;

  const view = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap, selectedCardId }),
    [state, osidNameMap, selectedCardId],
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
  if (dossier) {
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
  const bannerArt = resolveCommandCardArt(activeArea.id, playerFaction);
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
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-label={t('commandSurface.aria')}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      data-testid="warroom-decision-room-host"
      className="pointer-events-auto absolute bottom-6 left-1/2 top-[4.5rem] z-[7] flex w-[min(110rem,calc(100%-3rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-10 gap-y-3 border-b border-[#262b35] bg-[#141821] px-7 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[13px] font-semibold tracking-[0.2em] text-[#e0c27a]">{t('commandSurface.eyebrow').toUpperCase()}</span>
          <h2 className="m-0 text-[26px] font-semibold leading-tight text-[#f1e6c8]">
            {turnToDateString(turn)}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[16px] text-[#b9ad94]">{t('commandSurface.authority')}</span>
          <div
            role="meter"
            aria-label={t('commandSurface.authority')}
            aria-valuemin={0}
            aria-valuemax={authorityMax}
            aria-valuenow={authority}
            className="h-2.5 w-56 overflow-hidden rounded-full bg-[#262b35]"
          >
            <div className="h-full bg-[#c9a75c]" style={{ width: `${Math.max(0, Math.min(100, (authority / authorityMax) * 100))}%` }} />
          </div>
          <span className="font-mono text-[16px] font-semibold tabular-nums text-[#f1e6c8]">{authority} / {authorityMax}</span>
        </div>
        <div className="flex-grow" />
        <div data-testid="command-surface-advance-status" className={`rounded border px-4 py-2 text-[16px] ${readinessClass}`}>
          {readiness.headline}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('commandSurface.closeAria')}
          data-testid="warroom-decision-room-close"
          className="h-11 rounded border border-[#3a4150] bg-[#1b2029] px-5 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 hover:text-accent-gold"
        >
          {t('commandSurface.close')}
        </button>
      </header>

      <div
        data-testid="presidential-decision-room"
        data-command-category-id={activeArea.id}
        data-tutorial-step="decision-room"
        data-coachmark-id="decision-room"
        className="grid min-h-0 flex-1 grid-cols-[clamp(17rem,calc(var(--interface-viewport-width,100vw)*0.19),21rem)_minmax(0,1fr)_clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.31),35rem)]"
      >
        <nav
          aria-label={t('commandSurface.areasLabel')}
          data-testid="command-card-strip"
          className="flex min-h-0 flex-col gap-2 overflow-y-auto border-r border-[#262b35] bg-[#0f1218] px-4 py-5"
        >
          <span className="px-2 pb-1 font-mono text-[13px] font-semibold tracking-[0.16em] text-[#b9ad94]">{t('commandSurface.thisWeek').toUpperCase()}</span>
          {areas.map((area, index) => {
            const selected = area.id === activeArea.id;
            const art = resolveCommandCardArt(area.id, playerFaction);
            const parts: string[] = [];
            if (area.counts.needs) parts.push(t('commandSurface.status.needs', { count: area.counts.needs }));
            if (area.counts.review) parts.push(t('commandSurface.status.review', { count: area.counts.review }));
            if (area.counts.actions) parts.push(t(area.counts.actions === 1 ? 'commandSurface.status.actionOne' : 'commandSurface.status.actionMany', { count: area.counts.actions }));
            if (area.counts.watch) parts.push(t('commandSurface.status.watch', { count: area.counts.watch }));
            if (area.counts.record) parts.push(t('commandSurface.status.record', { count: area.counts.record }));
            const badge = area.counts.needs || area.counts.review;
            return (
              <button
                key={area.id}
                type="button"
                data-testid={`command-card-${area.id}`}
                aria-pressed={selected}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => selectArea(area.id)}
                className={`grid w-full grid-cols-[clamp(3rem,calc(var(--interface-viewport-width,100vw)*0.028),4rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2.5 text-left transition ${selected
                  ? 'border-[#c9a75c] bg-[#232936]'
                  : 'border-transparent hover:border-[#3a4150] hover:bg-[#171b23]'}`}
              >
                {art
                  ? <img src={art} alt="" className="aspect-square w-full rounded object-cover" />
                  : <span aria-hidden="true" className="aspect-square w-full rounded bg-[#232936]" />}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[18px] font-semibold leading-tight text-[#f1e6c8]">{t(AREA_COPY[area.id].title)}</span>
                  <span className="text-[15px] leading-snug text-[#b9ad94]">{parts.length ? parts.join(' · ') : t('commandSurface.status.nothing')}</span>
                </span>
                {badge > 0 && (
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-[14px] font-semibold text-[#15120b] ${area.counts.needs ? 'bg-red-300' : 'bg-[#e0b45a]'}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="flex-grow" />
          <p className="m-0 px-2 pt-2 text-[14px] leading-snug text-[#9c917b]">{t('commandSurface.keysHint')}</p>
        </nav>

        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div className="relative h-44 shrink-0">
            {bannerArt && <img src={bannerArt} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-[#0a0c10]/70" />
            <div className="absolute inset-x-8 bottom-6 flex flex-col gap-1.5">
              <h3 className="m-0 text-[34px] font-semibold leading-tight text-[#f6ecd2]">{t(AREA_COPY[activeArea.id].title)}</h3>
              <p className="m-0 text-[18px] text-[#e2d6b8]">{t(AREA_COPY[activeArea.id].blurb)}</p>
            </div>
          </div>
          {groups.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-8 py-10">
              <p className="m-0 text-[22px] font-semibold text-[#f1e6c8]">{t('commandSurface.empty.title')}</p>
              <p className="m-0 max-w-[40rem] text-[17px] leading-relaxed text-[#c2b69c]">{t(AREA_COPY[activeArea.id].empty)}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-7 px-8 pb-8 pt-6">
              {groups.map(({ group, cards }) => (
                <section key={group} className="flex flex-col gap-2.5" aria-label={t(GROUP_HEADING[group])}>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="m-0 font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]">{t(GROUP_HEADING[group]).toUpperCase()}</h4>
                    {group === 'needs' && historicalNeeds.length > 1 && (
                      <AuthorizeAllButton cards={historicalNeeds} onReceipt={setReceipt} />
                    )}
                  </div>
                  {cards.map((card) => {
                    const selected = card.id === selectedCardId;
                    const chip = chipFor(card, group);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        data-testid={`decision-room-priority-card-${card.id}`}
                        aria-pressed={selected}
                        onClick={() => setCardId(card.id)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6 rounded-md border px-5 py-4 text-left transition ${selected
                          ? 'border-[#c9a75c] bg-[#232936]'
                          : 'border-[#2a303c] bg-[#161a22] hover:border-[#4a4436]'}`}
                      >
                        <span className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-[19px] font-semibold leading-snug text-[#f1e6c8]">{card.title}</span>
                          <span className="line-clamp-2 text-[16px] leading-relaxed text-[#c2b69c]">{card.explanation}</span>
                        </span>
                        <span className={`whitespace-nowrap rounded border px-3 py-1.5 font-mono text-[14px] font-semibold ${chip.className}`}>{chip.label}</span>
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </div>

        <aside
          aria-label={t('decisionRoom.priorityDossier')}
          className="flex min-h-0 flex-col border-l border-[#262b35] bg-[#0f1218]"
        >
          {receipt && (
            <div
              data-testid="decision-room-action-receipt"
              className={`flex shrink-0 items-start justify-between gap-3 border-b px-6 py-3 text-[15px] ${receipt.kind === 'error'
                ? 'border-red-500/45 bg-red-500/10 text-red-100'
                : receipt.kind === 'cancelled'
                  ? 'border-[#262b35] bg-[#141821] text-text-secondary'
                  : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50'}`}
            >
              <span role="status" aria-live="polite">{receipt.message}</span>
              <button type="button" onClick={() => setReceipt(null)} className="shrink-0 text-[14px] font-semibold underline-offset-2 hover:underline">
                {t('common.close')}
              </button>
            </div>
          )}
          {dossier ? (
            <section
              data-testid="decision-room-active-dossier"
              data-card-id={dossier.cardId}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div ref={detailScrollRef} data-testid="decision-room-dossier-scroll" className="min-h-0 flex-1 overflow-y-auto">
                {detailArt && <img src={detailArt} alt="" className="block h-52 w-full object-cover" />}
                <div className="flex flex-col gap-4 px-7 py-6">
                  <span className="font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]">{categoryLabel(dossier.category).toUpperCase()}</span>
                  <h3 className="m-0 text-[28px] font-semibold leading-tight text-[#f6ecd2]">{dossier.title}</h3>
                  <p className="m-0 text-[18px] leading-relaxed text-[#ddd1b3]">{dossier.explanation}</p>
                  {dossier.evidence.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="font-mono text-[13px] font-semibold tracking-[0.16em] text-[#b9ad94]">{t('commandSurface.whatToKnow').toUpperCase()}</span>
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {dossier.evidence.map((entry) => (
                          <li key={entry} className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2.5 text-[17px] leading-relaxed text-[#ddd1b3]">
                            <span aria-hidden="true" className="text-[#c9a75c]">•</span>
                            <span>{entry}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 border-t border-[#262b35] bg-[#12161e] px-7 pb-6 pt-5">
                {dossier.directive && state && (
                  <DirectiveCard directive={dossier.directive} gameState={state} onReceipt={setReceipt} />
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
              </div>
            </section>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-2.5 p-10">
              <p className="m-0 text-[22px] font-semibold text-[#f1e6c8]">{t('commandSurface.detail.chooseTitle')}</p>
              <p className="m-0 text-[17px] leading-relaxed text-[#c2b69c]">{t('commandSurface.detail.chooseBody')}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
