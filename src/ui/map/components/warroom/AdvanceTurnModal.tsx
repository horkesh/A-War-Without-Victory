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
import { useRecruitmentMatterInput } from '../../utils/useRecruitmentMatter';
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
import { turnToDateString } from '../../utils/formatters';
import {
  SurfaceColumns,
  SurfaceContent,
  SurfaceDetail,
  SurfaceDetailBody,
  SurfaceDetailFooter,
  SurfaceHeader,
  SurfaceSection,
  SurfaceSections,
  SurfaceStat,
  SURFACE_CHIP,
  SURFACE_LABEL_MUTED,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_MEDIUM,
  SURFACE_PRIMARY_BUTTON,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
  SURFACE_STATUS_TONE,
  SURFACE_TONE,
} from '../surface/Surface';
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

function isBlockerReviewDuplicate(item: PreAdvanceCommandReviewItem, blockers: PresidentialBlocker[]): boolean {
  return blockers.some((blocker) => {
    if (item.id === blocker.id) return true;
    switch (blocker.type) {
      case 'event_decision': return item.id === 'review:pending';
      case 'peace_plan': return item.id === 'manifest:peace_plan';
      case 'dayton_negotiation': return item.id === 'manifest:dayton_negotiation';
      case 'convoy_decision': return item.id === 'manifest:convoy_decision';
      case 'paramilitary_request': return item.id === 'paramilitary:pending';
      default: return false;
    }
  });
}

function statusTone(status: PreAdvanceCommandReviewStatus): keyof typeof SURFACE_STATUS_TONE {
  if (status === 'blocked') return 'danger';
  if (status === 'review') return 'warn';
  if (status === 'clear') return 'good';
  return 'neutral';
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

function severityChip(severity: PreAdvanceCommandReviewItem['severity']): { label: string; className: string } | null {
  if (severity === 'blocking') return { label: t('warroom.severity.blocking'), className: SURFACE_TONE.danger };
  if (severity === 'critical') return { label: t('warroom.severity.critical'), className: SURFACE_TONE.danger };
  if (severity === 'warning') return { label: t('warroom.severity.warning'), className: SURFACE_TONE.warn };
  return null;
}

/** One figure of the week's review (surface redesign 2026-11-10: plain group words, full label). */
function MetricCell({ label, value, highlighted = false }: { label: string; value: number; highlighted?: boolean }) {
  return (
    <SurfaceStat label={<span title={label}>{label}</span>} value={value} tone={highlighted ? 'text-amber-200' : undefined} />
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
  const chip = severityChip(item.severity);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={SURFACE_LABEL_MUTED}>{categoryLabel(item.category)}</span>
          {chip && <span className={`${SURFACE_CHIP} ${chip.className}`}>{chip.label}</span>}
        </div>
        <div className="text-[18px] font-semibold leading-snug text-[#f1e6c8]">{item.title}</div>
        <div className="text-[16px] leading-relaxed text-[#c2b69c]">{item.explanation}</div>
        {item.sourceOwner && <div className="text-[14px] text-[#9c917b]">{item.sourceOwner}</div>}
      </div>
      <button
        type="button"
        onClick={() => onReview(item)}
        disabled={disabled || !canReview}
        className={SURFACE_SECONDARY_BUTTON}
      >
        {item.actionLabel}
      </button>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-md border border-red-400/40 bg-[#1c1719] px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={SURFACE_LABEL_MUTED}>{blocker.typeLabel}</span>
        </div>
        <div className="text-[18px] font-semibold leading-snug text-[#f1e6c8]">{blocker.title}</div>
        <div className="text-[16px] leading-relaxed text-[#c2b69c]">{blocker.summary}</div>
      </div>
      <button
        type="button"
        onClick={() => onResolve(blocker)}
        disabled={disabled}
        className={SURFACE_PRIMARY_BUTTON_COMPACT}
      >
        {blocker.actionLabel}
      </button>
    </div>
  );
}

export function AdvanceTurnModal({ onReviewPriorities, onReviewItem, onResolveBlocker }: AdvanceTurnModalProps) {
  const pending = useGameStore((s) => s.advanceTurnPending);
  const setPending = useGameStore((s) => s.setAdvanceTurnPending);
  // PAUSE BEFORE COMBAT: while the in-flight turn waits on the player's decisions this modal
  // steps aside (it stays mounted, so the advance it started keeps running) and the decision
  // modal takes the screen.
  const turnPausedForDecisions = useGameStore((s) => s.turnPauseStatus?.status === 'paused');
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const turnAftermath = useGameStore((s) => s.turnAftermath);
  const loadSave = useGameStore((s) => s.loadSave);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const ipc = useIPC();
  const [advancing, setAdvancing] = useState(false);
  const recruitmentInput = useRecruitmentMatterInput();
  const review = useMemo(
    () => buildPreAdvanceCommandReviewView({
      state: loadedGameState,
      osidNameMap: osidDisplayNames,
      reviewedAftermathTurn: turnAftermath?.turn ?? null,
      ...recruitmentInput,
    }),
    [loadedGameState, osidDisplayNames, turnAftermath?.turn, recruitmentInput],
  );
  const blockers = useMemo(
    () => derivePresidentialBlockers(loadedGameState, osidDisplayNames),
    [loadedGameState, osidDisplayNames],
  );
  const reviewItems = useMemo(
    () => review.items.filter((item) => !isBlockerReviewDuplicate(item, blockers)),
    [blockers, review.items],
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
    // Acknowledge the explicit request. The completed turn has its own cue
    // from the authoritative player-visible summary observer.
    void playCue('turn_advance');
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


  const isBlocked = review.status === 'blocked' || blockers.length > 0;
  const turn = loadedGameState?.turn ?? null;

  // Surface redesign (owner, 2026-11-10): Advance is a surface in the Command Surface's
  // style — what stands between the president and the next week on the left (blockers,
  // then staff review items, then Army HQ pushback), the week's figures and the decision
  // on the right with the Advance button in a footer that never scrolls away.
  return (
    <Modal
      isOpen={pending && !turnPausedForDecisions}
      onClose={handleCancel}
      zIndex={Z.CRITICAL_MODAL}
      closeOnBackdropClick={false}
      ariaLabelledBy="advance-turn-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_MEDIUM}
    >
      <>
        <SurfaceHeader
          eyebrow={turn != null ? turnToDateString(turn) : t('advanceTurn.title')}
          title={<span id="advance-turn-title">{t('advanceTurn.title')}</span>}
          trailing={(
            <div className={`rounded border px-4 py-2 text-[16px] ${SURFACE_STATUS_TONE[statusTone(review.status)]}`}>
              {review.headline}
            </div>
          )}
        />

        <SurfaceColumns layout="content-detail">
          <SurfaceContent>
            <SurfaceSections>
              {isBlocked && (
                <section className="flex flex-col gap-2 rounded-md border border-red-400/40 bg-red-950/25 px-5 py-4">
                  <div className="text-[20px] font-semibold text-red-100">
                    {t('advanceTurn.blockedTitle')}
                  </div>
                  <div className="text-[16px] leading-relaxed text-[#ddd1b3]">
                    {t('advanceTurn.blockedSummary')}
                  </div>
                  {review.canReviewPriorities && (
                    <button
                      type="button"
                      onClick={handleReviewPriorities}
                      disabled={advancing}
                      className={`self-start ${SURFACE_SECONDARY_BUTTON}`}
                    >
                      {t('advanceTurn.openReview')}
                    </button>
                  )}
                </section>
              )}

              {blockers.length > 0 && (
                <SurfaceSection label={t('advanceTurn.resolveBeforeAdvancing')}>
                  {blockers.map((blocker) => (
                    <BlockerRow
                      key={blocker.id}
                      blocker={blocker}
                      disabled={advancing}
                      onResolve={handleResolveBlocker}
                    />
                  ))}
                </SurfaceSection>
              )}

              <SurfaceSection label={t('decisionRoom.reviewBeforeAdvance')}>
                {reviewItems.length === 0 ? (
                  <div className="rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4 text-[16px] leading-relaxed text-[#c2b69c]">
                    {t('decisionRoom.noBuriedItems')}
                  </div>
                ) : reviewItems.map((item) => (
                  <ReviewItemRow
                    key={item.id}
                    item={item}
                    disabled={advancing}
                    onReview={handleReviewItem}
                  />
                ))}
              </SurfaceSection>

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
            </SurfaceSections>
          </SurfaceContent>

          <SurfaceDetail>
            <SurfaceDetailBody
              title={t(
                review.status === 'clear'
                  ? 'advanceTurn.clearQuestion'
                  : review.status === 'review'
                    ? 'advanceTurn.reviewQuestion'
                    : 'advanceTurn.confirmQuestion',
              )}
              explanation={t(review.status === 'clear' ? 'advanceTurn.holdRecommendation' : 'advanceTurn.warning')}
            >
              <div className="flex flex-col pt-1">
                <MetricCell label={t('commandSurface.group.needs')} value={review.metrics.priorityCounts.required} highlighted={review.metrics.priorityCounts.required > 0} />
                <MetricCell label={t('commandSurface.group.review')} value={review.metrics.priorityCounts.recommended} />
                <MetricCell label={t('commandSurface.group.watch')} value={review.metrics.priorityCounts.monitor} />
                <MetricCell label={t('commandSurface.group.record')} value={review.metrics.priorityCounts.record} />
              </div>
            </SurfaceDetailBody>
            <SurfaceDetailFooter>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={advancing || isBlocked}
                className={SURFACE_PRIMARY_BUTTON}
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
              <div className="flex flex-wrap gap-3">
                {review.canReviewPriorities && (
                  <button
                    type="button"
                    onClick={handleReviewPriorities}
                    disabled={advancing}
                    className={`flex-1 ${SURFACE_SECONDARY_BUTTON}`}
                  >
                    {t('advanceTurn.reviewPriorities')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={advancing}
                  className={`flex-1 ${SURFACE_SECONDARY_BUTTON}`}
                >
                  {t('armyHq.cancel')}
                </button>
              </div>
            </SurfaceDetailFooter>
          </SurfaceDetail>
        </SurfaceColumns>
      </>
    </Modal>
  );
}
