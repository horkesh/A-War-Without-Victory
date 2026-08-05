/**
 * AdvanceTurnModal - React confirmation dialog for advancing the turn.
 *
 * Triggered when the player clicks the wall_calendar_area hotspot in the
 * React WarroomShellLayer. The Warroom shell posts an 'advance-turn'
 * ShellHandoffCommand; applyShellHandoffCommand sets advanceTurnPending=true
 * in gameStore, and this modal renders.
 *
 * Uses the same advanceTurnAndSync path as PresidentialToolbar so advance-turn
 * behavior is identical regardless of which surface the player uses.
 *
 * Canonical owner: src/ui/map/components/warroom/AdvanceTurnModal.tsx
 */

/**
 * LANE-V094-MODAL-MIGRATION: migrated to shared `<Modal>` wrapper for
 * canonical ESC dismissal, focus management, aria contracts, and z-index.
 * Original markup had no click-outside dismiss; preserved via
 * `closeOnBackdropClick={false}`. ESC is gated by `advancing` so the
 * confirmation flow cannot be ducked mid-advance. No tutorial
 * `data-tutorial-step` anchors inside this modal.
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { advanceTurnAndSync } from '../../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../../desktop/turnAftermathAdvanceDeps';
import {
  buildPreAdvanceCommandReviewView,
  type PreAdvanceCommandReviewItem,
  type PreAdvanceCommandReviewStatus,
} from '../../data/preAdvanceCommandReview';
import {
  derivePresidentialBlockers,
  type PresidentialBlocker,
} from '../../data/presidentialBlockers';
import type { InboxItem } from '../../data/inboxItems';
import { openPresidentialDecisionRoomNavigationTarget } from '../../utils/presidentialDecisionRoomNavigation';
import { Z } from '../../../shared/zIndex';
import { Modal } from '../../../shared/Modal';
import { playCue } from '../../audio/audio_engine';
import { t } from '../../i18n';
// LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI: read-only display of Army HQ
// pushback (CO objections + Mladić-class autonomous-launch warnings).
// DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
// (eee308e0). Predecessors A1 (18136710) + A2 (ba6955bf) + A3 (c8ff93d8) + A4 (93c75b1d).
import {
  ArmyCoPushbackPanel,
  type ArmyCoOfficerInput,
  type ArmyCoPendingEventInput,
  type ArmyCoDecisionTraceInput,
} from '../../../components/ArmyCoPushbackPanel';

export interface AdvanceTurnModalProps {
  onReviewPriorities?: () => void;
  onReviewItem?: (item: PreAdvanceCommandReviewItem) => void;
  onResolveBlocker?: (action: InboxItem['action'], itemId: string) => void;
}

function statusClass(status: PreAdvanceCommandReviewStatus): string {
  if (status === 'blocked') return 'border-red-500/60 bg-red-950/40 text-red-300';
  if (status === 'review') return 'border-amber-500/60 bg-amber-950/35 text-amber-300';
  if (status === 'clear') return 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300';
  return 'border-panel-border bg-panel-card text-text-secondary';
}

function categoryLabel(category: PreAdvanceCommandReviewItem['category']): string {
  if (category === 'decision') return t('decisionRoom.category.decision');
  if (category === 'counter_offer') return t('warroom.status.category.counterOffer');
  if (category === 'opportunity') return t('decisionRoom.category.opportunity');
  if (category === 'operational') return t('decisionRoom.category.operational');
  if (category === 'turn') return t('decisionRoom.category.turn');
  if (category === 'briefing') return t('decisionRoom.category.briefing');
  if (category === 'command') return t('warroom.status.category.command');
  if (category === 'cost') return t('decisionRoom.category.cost');
  return t('decisionRoom.category.memory');
}

function severityLabel(severity: PreAdvanceCommandReviewItem['severity']): string {
  if (severity === 'blocking') return t('warroom.severity.blocking');
  if (severity === 'critical') return t('warroom.severity.critical');
  if (severity === 'warning') return t('warroom.severity.warning');
  return t('warroom.severity.info');
}

function MetricCell({ label, value, highlighted = false }: { label: string; value: number; highlighted?: boolean }) {
  return (
    <div className="min-w-0 border border-panel-border/60 bg-panel-card/65 px-2 py-1.5">
      <div className="truncate text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className={`text-base font-bold tabular-nums ${highlighted ? 'text-amber-300' : 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}

function ReviewItemRow({
  item,
  disabled,
  onReview,
}: {
  item: PreAdvanceCommandReviewItem;
  disabled: boolean;
  onReview: (item: PreAdvanceCommandReviewItem) => void;
}) {
  const canReview = item.navigationTarget.kind !== 'none';

  return (
    <div className="border border-panel-border/60 bg-panel-card/65 px-2 py-1.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="border border-panel-border/70 bg-panel-bg/70 px-1 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-text-secondary">
              {categoryLabel(item.category)}
            </span>
            <span className="border border-panel-border/55 bg-black/15 px-1 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
              {severityLabel(item.severity)}
            </span>
          </div>
          <div className="mt-1 truncate text-xs font-bold text-text-primary">{item.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">{item.explanation}</div>
        </div>
        <div className="shrink-0 text-right">
          <button
            type="button"
            onClick={() => onReview(item)}
            disabled={disabled || !canReview}
            className="border border-amber-400/35 bg-amber-400/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-amber-300 transition-colors hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
          >
            {item.actionLabel}
          </button>
          <div className="mt-1 max-w-[8rem] truncate text-xs uppercase tracking-[0.1em] text-text-muted">
            {item.sourceOwner}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockerRow({
  blocker,
  disabled,
  onResolve,
}: {
  blocker: PresidentialBlocker;
  disabled: boolean;
  onResolve: (blocker: PresidentialBlocker) => void;
}) {
  return (
    <div className="border border-red-500/45 bg-red-950/25 px-2 py-1.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="border border-red-500/45 bg-red-950/45 px-1 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-red-300">
              {t('advanceTurn.required')}
            </span>
            <span className="border border-panel-border/55 bg-black/15 px-1 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
              {blocker.typeLabel}
            </span>
          </div>
          <div className="mt-1 truncate text-xs font-bold text-text-primary">{blocker.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">{blocker.summary}</div>
        </div>
        <button
          type="button"
          onClick={() => onResolve(blocker)}
          disabled={disabled}
          className="shrink-0 border border-red-400/45 bg-red-400/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-red-200 transition-colors hover:bg-red-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
        >
          {blocker.actionLabel}
        </button>
      </div>
    </div>
  );
}

export function AdvanceTurnModal({ onReviewPriorities, onReviewItem, onResolveBlocker }: AdvanceTurnModalProps) {
  const pending = useGameStore((s) => s.advanceTurnPending);
  const setPending = useGameStore((s) => s.setAdvanceTurnPending);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const turnAftermath = useGameStore((s) => s.turnAftermath);
  const loadSave = useGameStore((s) => s.loadSave);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const ipc = useIPC();
  const [advancing, setAdvancing] = useState(false);
  const review = useMemo(
    () => buildPreAdvanceCommandReviewView({
      state: loadedGameState,
      osidNameMap: osidDisplayNames,
      reviewedAftermathTurn: turnAftermath?.turn ?? null,
    }),
    [loadedGameState, osidDisplayNames, turnAftermath?.turn],
  );
  const blockers = useMemo(
    () => derivePresidentialBlockers(loadedGameState, osidDisplayNames),
    [loadedGameState, osidDisplayNames],
  );

  useEffect(() => {
    if (!pending) return;
    void playCue('turn_review_open');
  }, [pending]);

  // LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI: extract substrate fields from
  // loadedGameState. A2 fields (stubbornness / override_tolerance /
  // last_autonomous_launch_turn / recent_overrides) and A3 traces are not yet
  // typed in LoadedGameState — read via permissive cast and degrade gracefully
  // when undefined. The panel itself returns null when no data surfaces.
  const armyCoPushbackData = useMemo(() => {
    const lgs = loadedGameState as
      | (Record<string, unknown> & {
          turn?: number;
          player_faction?: string | null;
          namedOfficerData?: Array<Record<string, unknown>>;
          namedOfficerStateById?: Record<string, Record<string, unknown>>;
          pendingOfficerEvents?: Array<Record<string, unknown>>;
          armyCoDecisionTraces?: Record<string, Array<Record<string, unknown>>>;
          military?: { army_co_decision_traces?: Record<string, Array<Record<string, unknown>>> };
        })
      | null
      | undefined;
    if (!lgs) {
      return {
        currentTurn: 0,
        officers: [] as ArmyCoOfficerInput[],
        pendingOfficerEvents: [] as ArmyCoPendingEventInput[],
        decisionTraces: {} as Record<string, ArmyCoDecisionTraceInput[]>,
        playerFaction: null as string | null,
      };
    }
    const officers: ArmyCoOfficerInput[] = (lgs.namedOfficerData ?? []).map((d) => {
      const id = String(d.id ?? '');
      const stateById = lgs.namedOfficerStateById?.[id];
      const dAny = d as Record<string, unknown>;
      const sAny = (stateById ?? {}) as Record<string, unknown>;
      return {
        id,
        name: String(d.name ?? ''),
        faction: String(d.faction ?? ''),
        rank: String(d.rank ?? ''),
        stubbornness: typeof dAny.stubbornness === 'number' ? dAny.stubbornness : undefined,
        override_tolerance:
          typeof dAny.override_tolerance === 'number' ? dAny.override_tolerance : undefined,
        last_autonomous_launch_turn:
          typeof sAny.last_autonomous_launch_turn === 'number'
            ? sAny.last_autonomous_launch_turn
            : undefined,
        recent_overrides: Array.isArray(sAny.recent_overrides)
          ? (sAny.recent_overrides as Array<{
              turn: number;
              resolution: 'accept' | 'override' | 'relieve';
            }>)
          : undefined,
      };
    });
    const pending: ArmyCoPendingEventInput[] = (lgs.pendingOfficerEvents ?? []).map((e) => ({
      event_id: String(e.event_id ?? ''),
      type: String(e.type ?? ''),
      faction: String(e.faction ?? ''),
      turn: Number(e.turn ?? 0),
      officer_id: String(e.officer_id ?? ''),
      officer_name: typeof e.officer_name === 'string' ? e.officer_name : undefined,
      reason: typeof e.reason === 'string' ? e.reason : undefined,
      overridable: Boolean(e.overridable),
    }));
    // Trace source order:
    //  1. Top-level `armyCoDecisionTraces` if the adapter ever surfaces it.
    //  2. `military.army_co_decision_traces` from raw state pass-through.
    //  3. {} fallback (panel renders nothing for that section).
    const tracesRaw =
      lgs.armyCoDecisionTraces ?? lgs.military?.army_co_decision_traces ?? {};
    const decisionTraces: Record<string, ArmyCoDecisionTraceInput[]> = {};
    for (const faction of Object.keys(tracesRaw).sort()) {
      const arr = tracesRaw[faction];
      if (!Array.isArray(arr)) continue;
      decisionTraces[faction] = arr.map((entry) => ({
        turn: Number(entry.turn ?? 0),
        campaign_role: String(entry.campaign_role ?? ''),
        rationale: String(entry.rationale ?? ''),
        raw_directive_id:
          typeof entry.raw_directive_id === 'string' ? entry.raw_directive_id : undefined,
      }));
    }
    return {
      currentTurn: typeof lgs.turn === 'number' ? lgs.turn : 0,
      officers,
      pendingOfficerEvents: pending,
      decisionTraces,
      playerFaction: typeof lgs.player_faction === 'string' ? lgs.player_faction : null,
    };
  }, [loadedGameState]);

  const handleConfirm = async () => {
    if (advancing) return;
    if (review.status === 'blocked' || blockers.length > 0) return;
    setAdvancing(true);
    try {
      await advanceTurnAndSync({
        ipc,
        loadSave,
        clearStagedOrders,
        setLoadError,
        ...getTurnAftermathAdvanceDeps(),
      });
    } finally {
      setAdvancing(false);
      setPending(false);
    }
  };

  const handleCancel = () => {
    if (advancing) return;
    setPending(false);
  };

  const handleReviewPriorities = () => {
    if (advancing) return;
    setPending(false);
    onReviewPriorities?.();
  };

  const handleReviewItem = (item: PreAdvanceCommandReviewItem) => {
    if (advancing) return;
    setPending(false);
    if (onReviewItem) {
      onReviewItem(item);
      return;
    }
    openPresidentialDecisionRoomNavigationTarget(item.navigationTarget);
  };

  const handleResolveBlocker = (blocker: PresidentialBlocker) => {
    if (advancing) return;
    setPending(false);
    onResolveBlocker?.(blocker.action, blocker.id);
  };

  useEffect(() => {
    if (!pending || advancing) return;
    if (blockers.length !== 1) return;
    const [blocker] = blockers;
    if (!blocker) return;
    setPending(false);
    onResolveBlocker?.(blocker.action, blocker.id);
  }, [advancing, blockers, onResolveBlocker, pending, setPending]);

  return (
    <Modal
      isOpen={pending}
      onClose={handleCancel}
      zIndex={Z.CRITICAL_MODAL}
      closeOnBackdropClick={false}
      ariaLabelledBy="advance-turn-title"
      backdropClassName="bg-black/65 px-4"
      panelClassName="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto border border-panel-border bg-panel-bg/97 text-text-primary shadow-2xl backdrop-blur-md"
    >
      <>
        <div className="border-b border-panel-border bg-panel-card/70 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div id="advance-turn-title" className="text-xs font-bold uppercase tracking-wider text-accent-gold">
                {t('advanceTurn.title')}
              </div>
              <div className="mt-0.5 text-sm font-bold text-text-primary">
                {t(
                  review.status === 'clear'
                    ? 'advanceTurn.clearQuestion'
                    : review.status === 'review'
                      ? 'advanceTurn.reviewQuestion'
                      : 'advanceTurn.confirmQuestion',
                )}
              </div>
            </div>
            <div className={`border px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(review.status)}`}>
              {review.headline}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="text-xs leading-snug text-text-secondary">
            {t(review.status === 'clear' ? 'advanceTurn.holdRecommendation' : 'advanceTurn.warning')}
          </div>

          {(review.status === 'blocked' || blockers.length > 0) && (
            <section className="rounded border border-red-500/40 bg-red-950/30 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-red-300">
                {t('advanceTurn.blockedTitle')}
              </div>
              <div className="mt-1 text-xs leading-snug text-text-secondary">
                {t('advanceTurn.blockedSummary')}
              </div>
              {review.canReviewPriorities && (
                <button
                  type="button"
                  onClick={handleReviewPriorities}
                  disabled={advancing}
                  className="mt-2 border border-red-300/35 bg-red-400/10 px-2 py-1 text-xs font-bold uppercase text-red-200 transition-colors hover:bg-red-400/20 disabled:opacity-50"
                >
                  {t('advanceTurn.openReview')}
                </button>
              )}
            </section>
          )}

          <section>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              {t('decisionRoom.reviewBeforeAdvance')}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCell label={t('decisionRoom.metric.required')} value={review.metrics.priorityCounts.required} highlighted={review.metrics.priorityCounts.required > 0} />
              <MetricCell label={t('decisionRoom.metric.recommended')} value={review.metrics.priorityCounts.recommended} />
              <MetricCell label={t('decisionRoom.metric.monitor')} value={review.metrics.priorityCounts.monitor} />
              <MetricCell label={t('decisionRoom.metric.record')} value={review.metrics.priorityCounts.record} />
            </div>
          </section>

          {blockers.length > 0 && (
            <section className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
                {t('advanceTurn.resolveBeforeAdvancing')}
              </div>
              {blockers.map((blocker) => (
                <BlockerRow
                  key={blocker.id}
                  blocker={blocker}
                  disabled={advancing}
                  onResolve={handleResolveBlocker}
                />
              ))}
            </section>
          )}

          <section className="space-y-1.5">
            {review.items.length === 0 ? (
              <div className="border border-panel-border/60 bg-panel-card/65 px-2 py-2 text-xs text-text-secondary">
                {t('decisionRoom.noBuriedItems')}
              </div>
            ) : review.items.map((item) => (
              <ReviewItemRow
                key={item.id}
                item={item}
                disabled={advancing}
                onReview={handleReviewItem}
              />
            ))}
          </section>

          {/* LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI: read-only display of CO
              objections + Mladić-class autonomous-launch warnings. Panel
              returns null when no data surfaces — keeps shell clean. */}
          <ArmyCoPushbackPanel
            currentTurn={armyCoPushbackData.currentTurn}
            officers={armyCoPushbackData.officers}
            pendingOfficerEvents={armyCoPushbackData.pendingOfficerEvents}
            decisionTraces={armyCoPushbackData.decisionTraces}
            playerFaction={armyCoPushbackData.playerFaction}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-panel-border bg-panel-card/70 px-4 py-3">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={advancing || review.status === 'blocked' || blockers.length > 0}
            className="border border-accent-gold/70 bg-accent-gold px-3 py-1.5 text-xs font-bold uppercase text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {advancing
              ? t('advanceTurn.advancing')
              : t(
                review.status === 'clear'
                  ? 'advanceTurn.advanceHoldingPolicy'
                  : review.status === 'review'
                    ? 'advanceTurn.advanceRecordedDecisions'
                    : 'advanceTurn.advance',
              )}
          </button>
          {review.canReviewPriorities && (
            <button
              type="button"
              onClick={handleReviewPriorities}
              disabled={advancing}
              className="border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-bold uppercase text-amber-300 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
            >
              {t('advanceTurn.reviewPriorities')}
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={advancing}
            className="border border-panel-border/70 bg-panel-bg/70 px-3 py-1.5 text-xs font-bold uppercase text-text-secondary transition-colors hover:bg-panel-hover hover:text-text-primary disabled:opacity-50"
          >
            {t('armyHq.cancel')}
          </button>
        </div>
      </>
    </Modal>
  );
}
