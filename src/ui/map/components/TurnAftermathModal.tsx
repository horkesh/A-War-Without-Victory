/**
 * LANE-V094-MODAL-MIGRATION: migrated to shared `<Modal>` wrapper for
 * canonical ESC dismissal, focus management, aria contracts, and z-index.
 * Original markup had no click-outside dismiss; preserved via
 * `closeOnBackdropClick={false}`. No tutorial `data-tutorial-step`
 * anchors inside this modal.
 */
import type { TurnAftermathTopAction, TurnAftermathView } from '../data/turnAftermath';
import type { ConsequenceReceipt } from '../data/consequenceReceipts';
import type { ForcedOpReceipt } from '../data/forcedOpReceipts';
import type { OfficerResentmentReceipt } from '../data/officerResentmentReceipts';
import { getDecisionSurfaceForInboxType } from '../data/decisionSurfaceRegistry';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { getAftermathHeaderForTone } from '../data/presidentialDeskAssets';
import { t, type MessageKey } from '../i18n';
import { formatCorpsDisplayName, formatPersonnel, formatCount, turnToDateString } from '../utils/formatters';
import {
  SurfaceColumns,
  SurfaceContent,
  SurfaceDetail,
  SurfaceDetailFooter,
  SurfaceSections,
  SURFACE_CHIP,
  SURFACE_CLOSE_BUTTON,
  SURFACE_LABEL,
  SURFACE_MODAL_BACKDROP,
  SURFACE_MODAL_PANEL_FULL,
  SURFACE_PRIMARY_BUTTON,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

interface TurnAftermathModalProps {
  isOpen: boolean;
  view: TurnAftermathView | null;
  onClose: () => void;
  onOpenInbox: () => void;
  onOpenSummary: () => void;
  onOpenRecords: () => void;
  onOpenChronicle: () => void;
  onOpenCodex: (eventId?: string) => void;
  onReviewAction?: (action: TurnAftermathTopAction) => void;
  /**
   * Realized consequence receipts whose CONFIRMED firing landed on this turn.
   * Closes the promise→receipt loop: each entry pairs the player's originating
   * decision with the downstream consequence the dossier predicted, now
   * actually delivered by the engine. Empty/absent → section not rendered.
   */
  consequences?: readonly ConsequenceReceipt[];
  /**
   * Forced-operation receipts whose operation resolved on this turn. Closes the
   * force-op AFTER-loop: each entry pairs an operation the president
   * force-launched over the corps commander's objection with the outcome it
   * actually produced. Sober/negative-sum tone, never celebratory.
   * Empty/absent → section not rendered.
   */
  forcedOps?: readonly ForcedOpReceipt[];
  /**
   * Officer-resentment receipts whose override landed on this turn. Closes the
   * force-op HUMAN-COST loop: each entry names a corps commander the president
   * overrode by force-launching past his objection, and the command-loyalty cost
   * it incurred (running override count, and whether the CO is now cowed). Sober
   * tone, never celebratory. Empty/absent → section not rendered.
   */
  officerResentment?: readonly OfficerResentmentReceipt[];
}

function formatSigned(value: number): string {
  if (value > 0) return `+${formatCount(value)}`;
  return formatCount(value);
}

function toneClasses(tone: TurnAftermathView['tone']): string {
  if (tone === 'gain') return 'border-emerald-400/40 text-emerald-300 bg-emerald-950/30';
  if (tone === 'loss') return 'border-red-400/40 text-red-300 bg-red-950/30';
  if (tone === 'mixed') return 'border-amber-400/40 text-amber-300 bg-amber-950/30';
  return 'border-white/15 text-text-secondary bg-white/5';
}

function actionTone(action: TurnAftermathTopAction): string {
  if (action.severity === 'blocking') return 'text-red-300 border-red-400/30 bg-red-950/20';
  if (action.severity === 'urgent') return 'text-amber-300 border-amber-400/30 bg-amber-950/20';
  return 'text-text-primary border-white/10 bg-white/[0.03]';
}

function costSeverityClasses(severity: TurnAftermathView['cost']['severity']): string {
  if (severity === 'critical') return 'border-red-400/40 text-red-300 bg-red-950/30';
  if (severity === 'severe') return 'border-amber-400/40 text-amber-300 bg-amber-950/30';
  if (severity === 'moderate') return 'border-sky-400/35 text-sky-300 bg-sky-950/25';
  return 'border-white/15 text-text-secondary bg-white/5';
}

function signalTone(severity: TurnAftermathView['signals'][number]['severity']): string {
  if (severity === 'urgent') return 'border-red-400/30 text-red-300 bg-red-950/20';
  if (severity === 'notable') return 'border-amber-400/30 text-amber-300 bg-amber-950/20';
  return 'border-white/10 text-text-secondary bg-white/[0.03]';
}

function signalDetailCopy(detail: string): string {
  if (/[a-z]+_[a-z0-9_]+/.test(detail) || /\binternal\b/i.test(detail)) {
    return t('turnAftermath.signal.detail.notableEvent');
  }
  return detail;
}

function signalEventId(signalId: string): string | undefined {
  return signalId.startsWith('event:') ? signalId.slice('event:'.length) : undefined;
}

function enumLabel(prefix: string, value: string): string {
  return t(`${prefix}.${value}` as MessageKey);
}

function actionTypeLabel(type: TurnAftermathTopAction['type']): string {
  const surface = getDecisionSurfaceForInboxType(type);
  if (!surface) return t('records.actionType.reviewItem');
  return t(`records.actionType.${surface.familyId}` as MessageKey);
}

function territorySignificanceLabel(significance: string): string {
  switch (significance) {
    case 'corridor':
      return t('turnAftermath.significance.corridor');
    case 'strategic':
    case 'strategic_center':
      return t('turnAftermath.significance.strategic');
    case 'urban':
    case 'urban_center':
      return t('turnAftermath.significance.urban');
    case 'enclave':
      return t('turnAftermath.significance.enclave');
    case 'humanitarian':
      return t('turnAftermath.significance.humanitarian');
    default:
      return t('turnAftermath.significance.notable');
  }
}

function forcedOpRecommendationLabel(assessment: ForcedOpReceipt['assessmentAtLaunch']): string {
  if (assessment === 'postpone') return 'he recommended waiting';
  if (assessment === 'abort') return 'he recommended abort';
  return 'the command record carried no no-go recommendation';
}

function memoryToneClasses(tone: TurnAftermathView['judgment']['memoryTone']): string {
  if (tone === 'cost') return 'border-red-400/35 text-red-300 bg-red-950/25';
  if (tone === 'signal') return 'border-amber-400/35 text-amber-300 bg-amber-950/20';
  if (tone === 'action') return 'border-sky-400/35 text-sky-300 bg-sky-950/20';
  if (tone === 'territory') return 'border-emerald-400/35 text-emerald-300 bg-emerald-950/20';
  return 'border-white/15 text-text-secondary bg-white/[0.03]';
}

export function TurnAftermathModal({
  isOpen,
  view,
  onClose,
  onOpenInbox,
  onOpenSummary,
  onOpenRecords,
  onOpenChronicle,
  onOpenCodex,
  onReviewAction,
  consequences,
  forcedOps,
  officerResentment,
}: TurnAftermathModalProps) {
  if (!view) return null;

  const hasTopActions = view.nextActions.topItems.length > 0;
  const commandRecord = view.commandRecord ?? { directives: [], rows: [] };
  const primaryAction = view.nextActions.topItems[0] ?? null;
  const primaryActionLabelKey = primaryAction?.severity === 'blocking'
    ? 'turnAftermath.primaryAction.requiredLabel'
    : 'turnAftermath.primaryAction.label';
  const signalPreview = view.signals.slice(0, 4);
  const realizedConsequences = consequences ?? [];
  const realizedForcedOps = forcedOps ?? [];
  const realizedOfficerResentment = officerResentment ?? [];
  const triggerActionReview = (item: TurnAftermathTopAction) => {
    if (onReviewAction) {
      onReviewAction(item);
    } else {
      onOpenInbox();
    }
  };

  // Surface redesign (owner, 2026-11-10): the week's aftermath is one surface in the
  // Command Surface's style — the week's still, date, tone and story across the top;
  // what happened (figures, territory, the staff's record, consequences, signals, cost)
  // on the left; what needs the president now on the right, with the next step, the
  // war summary and the records in a footer that never scrolls away.
  const box = 'rounded-md border border-[#2a303c] bg-[#161a22]';
  const boxHead = 'border-b border-[#262b35] px-5 py-3';
  const rowText = 'px-5 py-3 text-[16px] leading-relaxed text-[#ddd1b3]';
  const subText = 'mt-1 text-[15px] leading-relaxed text-[#b9ad94]';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.TURN_AFTERMATH}
      closeOnBackdropClick={false}
      initialFocusTestId={primaryAction?.severity === 'blocking' ? 'turn-aftermath-primary-action' : undefined}
      ariaLabelledBy="turn-aftermath-title"
      backdropClassName={SURFACE_MODAL_BACKDROP}
      panelClassName={SURFACE_MODAL_PANEL_FULL}
    >
      <>
        <div className="relative flex min-h-44 shrink-0 items-end justify-between gap-6 overflow-hidden border-b border-[#262b35] px-8 py-6">
          {/* Image-plus-fade band, kept inline because this header lays the close
              button beside the title; DecisionModalImageHeader owns the shared recipe. */}
          <img
            data-testid="turn-aftermath-header-art"
            src={getAftermathHeaderForTone(view.tone)}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/92 via-black/80 to-black/45" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="relative flex min-w-0 max-w-[52rem] flex-col gap-1.5">
            <div id="turn-aftermath-title" className={SURFACE_LABEL}>
              {t('turnAftermath.title')}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-[30px] font-semibold leading-tight text-[#f6ecd2]">{view.dateLabel}</h2>
              <span className={`${SURFACE_CHIP} ${toneClasses(view.tone)}`}>
                {enumLabel('turnAftermath.tone', view.tone)}
              </span>
            </div>
            <div className="text-[18px] font-semibold text-[#e2d6b8]">{view.headline}</div>
            <div className="text-[17px] leading-relaxed text-[#ddd1b3]">{view.narrativeLine}</div>
          </div>
          <button
            type="button"
            data-testid="turn-aftermath-close"
            onClick={onClose}
            className={`relative ${SURFACE_CLOSE_BUTTON}`}
          >
            {t('turnAftermath.continue')}
          </button>
        </div>

        <SurfaceColumns layout="content-wide-detail">
          <SurfaceContent>
            <SurfaceSections>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Metric
                  label={t('turnAftermath.metric.territory')}
                  value={formatSigned(view.territory.friendlyNet)}
                  detail={view.territory.breakdownComplete
                    ? t('turnAftermath.detail.gainedLost', {
                      gained: view.territory.gains,
                      lost: view.territory.losses,
                    })
                    : t('turnAftermath.detail.notablePartial', {
                      gained: view.territory.gains,
                      lost: view.territory.losses,
                      other: Math.abs(view.territory.friendlyNet - (view.territory.gains - view.territory.losses)),
                    })}
                />
                <Metric label={t('turnAftermath.metric.battles')} value={formatCount(view.combat.friendlyBattleCount)} detail={t('turnAftermath.detail.total', { count: formatCount(view.combat.battleCount) })} />
                <Metric label={t('turnAftermath.metric.casualties')} value={formatCount(view.combat.friendlyCasualties)} detail={t('turnAftermath.detail.opposing', { count: formatCount(view.combat.opposingCasualties) })} />
                <Metric label={t('turnAftermath.metric.displaced')} value={formatCount(view.humanitarian.displacedThisTurn)} detail={view.humanitarian.hotspotLabel ?? t('turnAftermath.noHotspot')} />
              </div>

              <section className={box}>
                <div className={`${boxHead} ${SURFACE_LABEL}`}>
                  {t('turnAftermath.notableTerritory')}
                </div>
                <div className="divide-y divide-[#262b35]">
                  {view.territory.notable.length === 0 ? (
                    <div className="px-5 py-3 text-[16px] text-[#c2b69c]">{t('turnAftermath.noTerritoryFlips')}</div>
                  ) : view.territory.notable.slice(0, 6).map((flip) => (
                    <div key={`${flip.osid}:${flip.from ?? 'none'}:${flip.to ?? 'none'}`} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <div className="break-words text-[17px] font-semibold text-[#f1e6c8]">{flip.label}</div>
                        <div className="text-[15px] text-[#b9ad94]">{territorySignificanceLabel(flip.significance)}</div>
                      </div>
                      <span className={`${SURFACE_CHIP} ${flip.direction === 'gain' ? 'border-emerald-400/40 text-emerald-200' : flip.direction === 'loss' ? 'border-red-400/40 text-red-200' : 'border-[#3a4150] text-[#c2b69c]'}`}>
                        {enumLabel('turnAftermath.direction', flip.direction)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {(commandRecord.directives.length > 0 || commandRecord.rows.length > 0) && (
                <section data-testid="turn-aftermath-command-record" className="rounded-md border border-sky-400/30 bg-sky-950/15">
                  <div className="border-b border-sky-400/20 px-5 py-3">
                    <div className={`${SURFACE_LABEL} !text-sky-200`}>
                      {t('turnAftermath.commandRecord.title')}
                    </div>
                    <div className={subText}>
                      {t('turnAftermath.commandRecord.subtitle')}
                    </div>
                  </div>
                  {commandRecord.directives.length > 0 && (
                    <div className="divide-y divide-[#262b35] border-b border-[#262b35]">
                      {commandRecord.directives.map((directive, index) => (
                        <div key={`${directive.label}:${index}`} className="px-5 py-3">
                          <div className="text-[15px] text-[#b9ad94]">
                            {t('turnAftermath.commandRecord.directive')}
                          </div>
                          <div className="mt-0.5 text-[17px] font-semibold text-[#f1e6c8]">{directive.label}</div>
                          <div className={subText}>{directive.rationale}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="divide-y divide-[#262b35]">
                    {commandRecord.rows.map((row) => (
                      <div key={row.id} data-testid="turn-aftermath-command-record-row" className="px-5 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <div>
                            <span className="text-[17px] font-semibold text-[#f1e6c8]">{formatCorpsDisplayName(row.corpsName, row.id, row.corpsName)}</span>
                            <span className="ml-2 text-[15px] text-[#b9ad94]">{row.officerName}</span>
                          </div>
                          <span className={`${SURFACE_CHIP} ${row.interpretation === 'reinterpreted' ? 'border-amber-400/40 text-amber-200' : 'border-[#3a4150] text-[#c2b69c]'}`}>
                            {t(`turnAftermath.commandRecord.status.${row.interpretation === 'as_issued' ? 'asIssued' : row.interpretation}` as MessageKey)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[15px] text-[#b9ad94]">{t('turnAftermath.commandRecord.assignment')}</div>
                            <div className="mt-0.5 text-[16px] font-semibold text-[#f1e6c8]">{row.assignedRole}</div>
                            <div className={subText}>{row.interpretationDetail}</div>
                          </div>
                          <div>
                            <div className="text-[15px] text-[#b9ad94]">{t('turnAftermath.commandRecord.action')}</div>
                            <div className="mt-0.5 text-[16px] font-semibold text-[#f1e6c8]">{row.action}</div>
                            <div className={subText}>{row.actionDetail}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {realizedConsequences.length > 0 && (
                <section
                  data-testid="turn-aftermath-consequences"
                  className="rounded-md border border-amber-400/35 bg-amber-950/15"
                >
                  <div className={`border-b border-amber-400/20 px-5 py-3 ${SURFACE_LABEL}`}>
                    {t('turnAftermath.consequencesRealized')}
                  </div>
                  <div className="divide-y divide-[#262b35]">
                    {realizedConsequences.map((receipt) => (
                      <div
                        key={receipt.id}
                        data-testid="turn-aftermath-consequence-row"
                        className={rowText}
                      >
                        {t('turnAftermath.consequenceWarned', {
                          decision: receipt.decisionOptionLabel,
                          date: turnToDateString(receipt.decisionTurn),
                          consequence: receipt.predictedLabel,
                        })}
                        {receipt.predictedExplanation && (
                          <div className={`${subText} italic`}>
                            {receipt.predictedExplanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {realizedForcedOps.length > 0 && (
                <section
                  data-testid="turn-aftermath-forced-op-consequences"
                  className="rounded-md border border-red-400/35 bg-red-950/15"
                >
                  <div className={`border-b border-red-400/20 px-5 py-3 ${SURFACE_LABEL} !text-red-200`}>
                    {t('turnAftermath.forcedOpRealized')}
                  </div>
                  <div className="divide-y divide-[#262b35]">
                    {realizedForcedOps.map((receipt) => (
                      <div
                        key={receipt.id}
                        data-testid="turn-aftermath-forced-op-row"
                        className={rowText}
                      >
                        {t('turnAftermath.forcedOpForced', {
                          op: receipt.opName,
                          commander: receipt.commanderName,
                          recommendation: forcedOpRecommendationLabel(receipt.assessmentAtLaunch),
                        })}
                        <div className={`${subText} italic`}>
                          {t('turnAftermath.forcedOpOutcome', {
                            grade: t(`turnAftermath.opOutcome.${receipt.outcome}` as MessageKey),
                            casualties: receipt.casualtiesSuffered,
                            objectives: receipt.objectivesHeldAtClose > 0
                              ? t('turnAftermath.forcedOpObjectives', { count: receipt.objectivesHeldAtClose })
                              : t('turnAftermath.forcedOpNoObjectives'),
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {realizedOfficerResentment.length > 0 && (
                <section
                  data-testid="turn-aftermath-officer-resentment"
                  className="rounded-md border border-red-400/35 bg-red-950/15"
                >
                  <div className={`border-b border-red-400/20 px-5 py-3 ${SURFACE_LABEL} !text-red-200`}>
                    {t('officerResentment.realized')}
                  </div>
                  <div className="divide-y divide-[#262b35]">
                    {realizedOfficerResentment.map((receipt) => (
                      <div
                        key={receipt.id}
                        data-testid="turn-aftermath-officer-resentment-row"
                        className={rowText}
                      >
                        {t('officerResentment.overrode', {
                          officer: receipt.officerName,
                        })}
                        <div className={`${subText} italic`}>
                          {receipt.newlyCowed && receipt.cowedUntilTurn !== null
                            ? t('officerResentment.cowed', {
                                officer: receipt.officerName,
                                date: turnToDateString(receipt.cowedUntilTurn),
                              })
                            : t('officerResentment.resents', {
                                officer: receipt.officerName,
                                count: receipt.overrideCount,
                              })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className={box}>
                <div className={`${boxHead} ${SURFACE_LABEL}`}>
                  {t('turnAftermath.strategicSignals')}
                </div>
                <div className="divide-y divide-[#262b35]">
                  {signalPreview.length === 0 ? (
                    <div className="px-5 py-3 text-[16px] text-[#c2b69c]">{t('turnAftermath.noSignals')}</div>
                  ) : signalPreview.map((signal) => (
                    signalEventId(signal.id) ? (
                      <button
                        key={signal.id}
                        type="button"
                        onClick={() => onOpenCodex(signalEventId(signal.id))}
                        data-testid="turn-aftermath-signal-row"
                        className={`block w-full px-5 py-3 text-left transition-colors hover:bg-amber-400/10 focus:outline-none focus:ring-1 focus:ring-amber-400/70 ${signalTone(signal.severity)}`}
                      >
                        <div className="min-w-0 break-words text-[17px] font-semibold">{signal.label}</div>
                        <div className="text-[15px] opacity-85">{enumLabel('turnAftermath.signal.kind', signal.kind)} · {signalDetailCopy(signal.detail)}</div>
                      </button>
                    ) : (
                      <div
                        key={signal.id}
                        data-testid="turn-aftermath-signal-row"
                        className={`block w-full px-5 py-3 text-left ${signalTone(signal.severity)}`}
                      >
                        <div className="min-w-0 break-words text-[17px] font-semibold">{signal.label}</div>
                        <div className="text-[15px] opacity-85">{enumLabel('turnAftermath.signal.kind', signal.kind)} · {signalDetailCopy(signal.detail)}</div>
                      </div>
                    )
                  ))}
                </div>
              </section>

              <section className={box}>
                <div className={`flex items-center justify-between gap-3 ${boxHead}`}>
                  <div className={SURFACE_LABEL}>
                    {t('turnAftermath.turnCost')}
                  </div>
                  <span className={`${SURFACE_CHIP} ${costSeverityClasses(view.cost.severity)}`}>
                    {enumLabel('turnAftermath.severity', view.cost.severity)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-4">
                  <Metric label={t('turnAftermath.metric.ownCasualties')} value={formatPersonnel(view.cost.friendlyMilitaryCasualties)} detail={t('turnAftermath.detail.theater', { count: formatCount(view.cost.theaterMilitaryCasualties) })} compact />
                  <Metric label={t('turnAftermath.metric.displaced')} value={formatCount(view.cost.displacedThisTurn)} detail={t('turnAftermath.detail.thisTurn')} compact />
                  <Metric label={t('turnAftermath.metric.destroyed')} value={formatCount(view.cost.ownFormationsDestroyed)} detail={t('turnAftermath.detail.ownFormations')} compact />
                  <Metric label={t('turnAftermath.metric.supplySpent')} value={formatCount(view.cost.ownSupplySpent + view.cost.ownHeavyMunitionsSpent)} detail={t('turnAftermath.detail.heavy', { count: formatCount(view.cost.ownHeavyMunitionsSpent) })} compact />
                </div>
                {view.cost.reasons.length > 0 && (
                  <div className="border-t border-[#262b35] px-5 py-3 text-[15px] leading-relaxed text-[#b9ad94]">
                    {view.cost.reasons.slice(0, 3).join(' · ')}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-2 gap-3">
                <Metric label={t('turnAftermath.metric.formations')} value={`+${view.formations.ownSpawned} / -${view.formations.ownDestroyed}`} detail={t('turnAftermath.detail.spawnedTotal', { count: formatCount(view.formations.spawned) })} />
                <Metric label={t('turnAftermath.metric.supply')} value={formatSigned(view.supply.ownSupplyDelta)} detail={t('turnAftermath.detail.heavyValue', { value: formatSigned(view.supply.ownHeavyMunitionsDelta) })} />
              </div>
            </SurfaceSections>
          </SurfaceContent>

          <SurfaceDetail aria-label={t('turnAftermath.commandDesk')}>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 py-6">
              <section className="flex flex-col gap-3">
                <div className={SURFACE_LABEL}>
                  {t('turnAftermath.commandDesk')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label={t('turnAftermath.metric.actionable')} value={formatCount(view.nextActions.actionableCount)} detail={t('turnAftermath.detail.blocking', { count: formatCount(view.nextActions.blockingCount) })} compact />
                  <Metric label={t('turnAftermath.metric.opportunities')} value={formatCount(view.nextActions.opportunityCount)} detail={t('turnAftermath.detail.armyHq')} compact />
                  <Metric label={t('turnAftermath.metric.reserves')} value={formatCount(view.nextActions.reserveCount)} detail={t('turnAftermath.detail.requests')} compact />
                  <Metric label={t('turnAftermath.metric.officers')} value={formatCount(view.nextActions.officerCount)} detail={t('turnAftermath.detail.personnel')} compact />
                </div>
                <div className="flex flex-col gap-2">
                  {!hasTopActions ? (
                    <div className="rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-3 text-[16px] text-[#c2b69c]">{t('turnAftermath.noDecisions')}</div>
                  ) : view.nextActions.topItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`turn-aftermath-action-${item.id}`}
                      data-action-id={item.id}
                      aria-label={t('turnAftermath.action.aria', {
                        action: item.actionLabel,
                        title: item.title,
                        detail: item.detail ?? '',
                      })}
                      onClick={() => triggerActionReview(item)}
                      className={`block w-full rounded-md border px-4 py-3 text-left transition-colors hover:bg-amber-400/10 focus:outline-none focus:ring-1 focus:ring-amber-400/70 ${actionTone(item)}`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="break-words text-[17px] font-semibold">{item.title}</div>
                          {item.detail && <div className="mt-0.5 break-words text-[15px] leading-snug opacity-85">{item.detail}</div>}
                          <div className="mt-0.5 text-[14px] opacity-75">{actionTypeLabel(item.type)}</div>
                        </div>
                        <span className={`${SURFACE_CHIP} border-current/40`}>
                          {item.actionLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className={`rounded-md border px-5 py-4 ${memoryToneClasses(view.judgment.memoryTone)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[13px] font-semibold uppercase tracking-[0.16em] opacity-80">{t('turnAftermath.judgmentMemory')}</div>
                    <div className="mt-1 text-[17px] font-semibold">{view.judgment.headline}</div>
                    <div className="mt-1 text-[15px] leading-relaxed opacity-90">{view.judgment.detail}</div>
                  </div>
                  <span className={`${SURFACE_CHIP} border-current/40`}>
                    {enumLabel('turnAftermath.memoryTone', view.judgment.memoryTone)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button type="button" onClick={onOpenChronicle} className={SURFACE_SECONDARY_BUTTON}>
                    {t('turnAftermath.chronicle')}
                  </button>
                  <button type="button" onClick={() => onOpenCodex()} className={SURFACE_SECONDARY_BUTTON}>
                    {t('turnAftermath.codex')}
                  </button>
                </div>
              </section>
            </div>

            <SurfaceDetailFooter>
              {primaryAction ? (
                <button
                  type="button"
                  data-testid="turn-aftermath-primary-action"
                  onClick={() => triggerActionReview(primaryAction)}
                  aria-label={t('turnAftermath.primaryAction.aria', {
                    action: primaryAction.actionLabel,
                    title: primaryAction.title,
                    detail: primaryAction.detail ?? '',
                  })}
                  title={t('turnAftermath.primaryAction.aria', {
                    action: primaryAction.actionLabel,
                    title: primaryAction.title,
                    detail: primaryAction.detail ?? '',
                  })}
                  className="flex min-h-14 flex-col justify-center rounded-md bg-[#c9a75c] px-5 py-2 text-left text-[#15120b] transition hover:bg-[#d8b86c] focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span className="block text-[14px] font-semibold opacity-80">
                    {t(primaryActionLabelKey)}
                  </span>
                  <span className="block break-words text-[18px] font-bold leading-snug">
                    {primaryAction.actionLabel}
                  </span>
                </button>
              ) : (
                <button type="button" onClick={onOpenInbox} className={SURFACE_PRIMARY_BUTTON}>
                  {t('turnAftermath.reviewInbox')}
                </button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onOpenSummary} className={SURFACE_SECONDARY_BUTTON}>
                  {t('turnAftermath.warSummary')}
                </button>
                <button type="button" onClick={onOpenRecords} className={SURFACE_SECONDARY_BUTTON}>
                  {t('turnAftermath.turnRecords')}
                </button>
              </div>
            </SurfaceDetailFooter>
          </SurfaceDetail>
        </SurfaceColumns>
      </>
    </Modal>
  );
}

function Metric({
  label,
  value,
  detail,
  compact = false,
}: {
  label: string;
  value: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-md border border-[#2a303c] bg-[#161a22] ${compact ? 'px-4 py-2.5' : 'px-4 py-3'}`}>
      <div className="break-words text-[15px] text-[#b9ad94]">{label}</div>
      <div className="mt-0.5 break-words font-mono text-[22px] font-semibold tabular-nums text-[#f1e6c8]">{value}</div>
      <div className="break-words text-[14px] leading-snug text-[#9c917b]">{detail}</div>
    </div>
  );
}
