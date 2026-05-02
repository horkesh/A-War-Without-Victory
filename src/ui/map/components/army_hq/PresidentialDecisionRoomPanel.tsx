import { useMemo } from 'react';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomNavigationTarget,
  type PresidentialDecisionRoomSeverity,
} from '../../data/presidentialDecisionRoom';
import { useGameStore } from '../../store/gameStore';
import {
  openArmyHQAftermathRecord,
  openArmyHQBriefingForCorps,
  openArmyHQRecordsSubTab,
  openArmyHQTab,
  openChronicle,
} from '../../utils/shellNavigation';

function severityClass(severity: PresidentialDecisionRoomSeverity): string {
  if (severity === 'blocking') return 'border-red-400/45 bg-red-500/10 text-red-300';
  if (severity === 'critical') return 'border-amber-400/45 bg-amber-400/10 text-amber-300';
  if (severity === 'warning') return 'border-sky-400/35 bg-sky-400/10 text-sky-300';
  return 'border-panel-border/70 bg-panel-bg/60 text-text-secondary';
}

function categoryLabel(category: PresidentialDecisionRoomCard['category']): string {
  if (category === 'decision') return 'Decision';
  if (category === 'opportunity') return 'Opportunity';
  if (category === 'operational') return 'SITREP';
  if (category === 'briefing') return 'Briefing';
  if (category === 'turn') return 'Turn';
  if (category === 'cost') return 'Cost';
  return 'Memory';
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

function dispatchNavigation(target: PresidentialDecisionRoomNavigationTarget): void {
  const state = useGameStore.getState();
  if (target.kind === 'army-hq-tab') {
    openArmyHQTab(state, target.tab);
    return;
  }
  if (target.kind === 'army-hq-records') {
    openArmyHQRecordsSubTab(state, target.recordsSubTab);
    return;
  }
  if (target.kind === 'army-hq-aftermath-record') {
    openArmyHQAftermathRecord(state, target.turn);
    return;
  }
  if (target.kind === 'army-hq-corps-briefing') {
    openArmyHQBriefingForCorps(state, target.corpsId);
    return;
  }
  if (target.kind === 'chronicle') {
    openChronicle(state);
  }
}

function PriorityCard({ card }: { card: PresidentialDecisionRoomCard }) {
  const disabled = card.navigationTarget.kind === 'none';

  return (
    <article className="min-h-[7.25rem] rounded border border-panel-border/55 bg-panel-card/55 px-3 py-2">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${severityClass(card.severity)}`}>
              {card.severity}
            </span>
            <span className="rounded border border-panel-border/70 bg-panel-bg/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-text-secondary">
              {categoryLabel(card.category)}
            </span>
          </div>
          <div className="mt-1 truncate text-[12px] font-bold text-text-primary">{card.title}</div>
          <div className="mt-0.5 max-h-8 overflow-hidden text-[10px] leading-snug text-text-secondary">{card.explanation}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => dispatchNavigation(card.navigationTarget)}
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

function CompactLink({ card }: { card: PresidentialDecisionRoomCard }) {
  return (
    <button
      type="button"
      onClick={() => dispatchNavigation(card.navigationTarget)}
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

export function PresidentialDecisionRoomPanel() {
  const state = useGameStore((s) => s.loadedGameState);
  const osidNameMap = useGameStore((s) => s.osidDisplayNames);

  const view = useMemo(
    () => buildPresidentialDecisionRoomView({ state, osidNameMap }),
    [state, osidNameMap],
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

  const mainCards = view.cards.slice(0, 7);
  const inspectNext = view.inspectNext.slice(0, 5);

  return (
    <section className="mb-2" data-testid="presidential-decision-room">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-panel-border pb-1">
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-text-secondary">Presidential Decision Room</div>
          <div className="text-[13px] font-bold uppercase tracking-[0.05em] text-text-primary">Strategic Priorities</div>
        </div>
        <div className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${view.advanceReadiness.blockedByExistingSystems ? 'border-red-400/35 bg-red-500/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
          {view.advanceReadiness.headline}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetricCell label="Urgent" value={view.metrics.urgentCount} tone={view.metrics.urgentCount > 0 ? 'urgent' : 'neutral'} />
        <MetricCell label="Pending" value={view.metrics.pendingReviews} tone={view.metrics.pendingReviews > 0 ? 'urgent' : 'neutral'} />
        <MetricCell label="Ops" value={view.metrics.opportunities} />
        <MetricCell label="Hard Turns" value={view.metrics.hardTurns} />
        <MetricCell label="Advance Review" value={view.metrics.advanceReviewCount} />
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-2">
          {mainCards.length === 0 ? (
            <div className="rounded border border-panel-border/55 bg-panel-card/55 px-3 py-3 text-[11px] text-text-secondary">
              {view.emptyState}
            </div>
          ) : mainCards.map((card) => (
            <PriorityCard key={card.id} card={card} />
          ))}
        </div>

        <aside className="space-y-2">
          <div>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Inspect Next</div>
            <div className="space-y-1.5">
              {inspectNext.length === 0 ? (
                <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
                  No inspection handoffs queued.
                </div>
              ) : inspectNext.map((card) => (
                <CompactLink key={card.id} card={card} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Review Before Advance</div>
            <div className="space-y-1.5">
              {view.advanceReadiness.items.length === 0 ? (
                <div className="rounded border border-panel-border/55 bg-panel-card/55 px-2 py-2 text-[10px] text-text-secondary">
                  No live desk item will be buried by the next turn.
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
