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
import { t, type MessageKey } from '../i18n';
import { turnToDateString } from '../utils/formatters';

interface TurnAftermathModalProps {
  isOpen: boolean;
  view: TurnAftermathView | null;
  onClose: () => void;
  onOpenInbox: () => void;
  onOpenSummary: () => void;
  onOpenRecords: () => void;
  onOpenChronicle: () => void;
  onOpenCodex: () => void;
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
  if (value > 0) return `+${value}`;
  return String(value);
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
  consequences,
  forcedOps,
  officerResentment,
}: TurnAftermathModalProps) {
  if (!view) return null;

  const hasTopActions = view.nextActions.topItems.length > 0;
  const signalPreview = view.signals.slice(0, 4);
  const realizedConsequences = consequences ?? [];
  const realizedForcedOps = forcedOps ?? [];
  const realizedOfficerResentment = officerResentment ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.TURN_AFTERMATH}
      closeOnBackdropClick={false}
      ariaLabelledBy="turn-aftermath-title"
      backdropClassName="bg-black/70 px-4"
      panelClassName="w-full max-w-6xl max-h-[86vh] overflow-hidden border border-white/15 bg-[#101018] shadow-2xl"
    >
      <>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/30 px-5 py-4">
          <div className="min-w-0">
            <div id="turn-aftermath-title" className="text-[10px] font-mono uppercase tracking-[0.28em] text-amber-400/70">
              {t('turnAftermath.title')}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary">{view.dateLabel}</h2>
              <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${toneClasses(view.tone)}`}>
                {enumLabel('turnAftermath.tone', view.tone)}
              </span>
            </div>
            <div className="mt-1 text-sm text-text-secondary">{view.headline}</div>
            <div className="mt-2 max-w-2xl text-[13px] leading-5 text-text-primary/85">{view.narrativeLine}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-white/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary hover:border-white/25 hover:text-text-primary"
          >
            {t('turnAftermath.continue')}
          </button>
        </div>

        <div className="grid max-h-[62vh] min-w-0 gap-4 overflow-y-auto overflow-x-hidden p-5 lg:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.35fr)]">
          <section className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label={t('turnAftermath.metric.territory')} value={formatSigned(view.territory.friendlyNet)} detail={t('turnAftermath.detail.gainedLost', { gained: view.territory.gains, lost: view.territory.losses })} />
              <Metric label={t('turnAftermath.metric.battles')} value={String(view.combat.friendlyBattleCount)} detail={t('turnAftermath.detail.total', { count: view.combat.battleCount })} />
              <Metric label={t('turnAftermath.metric.casualties')} value={String(view.combat.friendlyCasualties)} detail={t('turnAftermath.detail.opposing', { count: view.combat.opposingCasualties })} />
              <Metric label={t('turnAftermath.metric.displaced')} value={String(view.humanitarian.displacedThisTurn)} detail={view.humanitarian.hotspotLabel ?? t('turnAftermath.noHotspot')} />
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                {t('turnAftermath.notableTerritory')}
              </div>
              <div className="divide-y divide-white/10">
                {view.territory.notable.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">{t('turnAftermath.noTerritoryFlips')}</div>
                ) : view.territory.notable.slice(0, 6).map((flip) => (
                  <div key={`${flip.osid}:${flip.from ?? 'none'}:${flip.to ?? 'none'}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{flip.label}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-secondary">{territorySignificanceLabel(flip.significance)}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${flip.direction === 'gain' ? 'border-emerald-400/30 text-emerald-300' : flip.direction === 'loss' ? 'border-red-400/30 text-red-300' : 'border-white/10 text-text-secondary'}`}>
                      {enumLabel('turnAftermath.direction', flip.direction)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="min-w-0 space-y-4">
            {realizedConsequences.length > 0 && (
              <div
                data-testid="turn-aftermath-consequences"
                className="border border-amber-400/30 bg-amber-950/15"
              >
                <div className="border-b border-amber-400/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-amber-300/80">
                  {t('turnAftermath.consequencesRealized')}
                </div>
                <div className="divide-y divide-white/10">
                  {realizedConsequences.map((receipt) => (
                    <div
                      key={receipt.id}
                      data-testid="turn-aftermath-consequence-row"
                      data-receipt-id={receipt.id}
                      className="px-3 py-2.5 text-[12px] leading-5 text-text-primary/85"
                    >
                      {t('turnAftermath.consequenceWarned', {
                        decision: receipt.decisionOptionLabel,
                        date: turnToDateString(receipt.decisionTurn),
                        consequence: receipt.predictedLabel,
                      })}
                      {receipt.predictedExplanation && (
                        <div className="mt-1 text-[10px] leading-4 text-text-secondary/80 italic">
                          {receipt.predictedExplanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {realizedForcedOps.length > 0 && (
              <div
                data-testid="turn-aftermath-forced-op-consequences"
                className="border border-red-400/30 bg-red-950/15"
              >
                <div className="border-b border-red-400/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-red-300/80">
                  {t('turnAftermath.forcedOpRealized')}
                </div>
                <div className="divide-y divide-white/10">
                  {realizedForcedOps.map((receipt) => (
                    <div
                      key={receipt.id}
                      data-testid="turn-aftermath-forced-op-row"
                      data-receipt-id={receipt.id}
                      className="px-3 py-2.5 text-[12px] leading-5 text-text-primary/85"
                    >
                      {t('turnAftermath.forcedOpForced', {
                        op: receipt.opName,
                        commander: receipt.commanderName,
                        recommendation: forcedOpRecommendationLabel(receipt.assessmentAtLaunch),
                      })}
                      <div className="mt-1 text-[10px] leading-4 text-text-secondary/80 italic">
                        {t('turnAftermath.forcedOpOutcome', {
                          grade: t(`turnAftermath.opOutcome.${receipt.outcome}` as MessageKey),
                          casualties: receipt.casualtiesSuffered,
                          objectives: receipt.objectivesCaptured > 0
                            ? t('turnAftermath.forcedOpObjectives', { count: receipt.objectivesCaptured })
                            : t('turnAftermath.forcedOpNoObjectives'),
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {realizedOfficerResentment.length > 0 && (
              <div
                data-testid="turn-aftermath-officer-resentment"
                className="border border-red-400/30 bg-red-950/15"
              >
                <div className="border-b border-red-400/20 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-red-300/80">
                  {t('officerResentment.realized')}
                </div>
                <div className="divide-y divide-white/10">
                  {realizedOfficerResentment.map((receipt) => (
                    <div
                      key={receipt.id}
                      data-testid="turn-aftermath-officer-resentment-row"
                      data-receipt-id={receipt.id}
                      className="px-3 py-2.5 text-[12px] leading-5 text-text-primary/85"
                    >
                      {t('officerResentment.overrode', {
                        officer: receipt.officerName,
                      })}
                      <div className="mt-1 text-[10px] leading-4 text-text-secondary/80 italic">
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
              </div>
            )}

            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                {t('turnAftermath.strategicSignals')}
              </div>
              <div className="divide-y divide-white/10">
                {signalPreview.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">{t('turnAftermath.noSignals')}</div>
                ) : signalPreview.map((signal) => (
                  <div key={signal.id} className={`px-3 py-2 ${signalTone(signal.severity)}`}>
                    <div className="min-w-0 truncate text-sm font-semibold">{signal.label}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-75">{enumLabel('turnAftermath.signal.kind', signal.kind)} / {signalDetailCopy(signal.detail)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                  {t('turnAftermath.turnCost')}
                </div>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] ${costSeverityClasses(view.cost.severity)}`}>
                  {enumLabel('turnAftermath.severity', view.cost.severity)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 text-sm">
                <Metric label={t('turnAftermath.metric.ownCasualties')} value={String(view.cost.friendlyMilitaryCasualties)} detail={t('turnAftermath.detail.theater', { count: view.cost.theaterMilitaryCasualties })} compact />
                <Metric label={t('turnAftermath.metric.displaced')} value={String(view.cost.displacedThisTurn)} detail={t('turnAftermath.detail.thisTurn')} compact />
                <Metric label={t('turnAftermath.metric.destroyed')} value={String(view.cost.ownFormationsDestroyed)} detail={t('turnAftermath.detail.ownFormations')} compact />
                <Metric label={t('turnAftermath.metric.supplySpent')} value={String(view.cost.ownSupplySpent + view.cost.ownHeavyMunitionsSpent)} detail={t('turnAftermath.detail.heavy', { count: view.cost.ownHeavyMunitionsSpent })} compact />
              </div>
              <div className="border-t border-white/10 px-3 py-2 text-[10px] text-text-secondary">
                {view.cost.reasons.slice(0, 3).join(' / ')}
              </div>
            </div>

            <div className={`border px-3 py-3 ${memoryToneClasses(view.judgment.memoryTone)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-70">{t('turnAftermath.judgmentMemory')}</div>
                  <div className="mt-1 text-sm font-semibold">{view.judgment.headline}</div>
                  <div className="mt-1 text-[11px] leading-5 opacity-80">{view.judgment.detail}</div>
                </div>
                <span className="shrink-0 rounded border border-current/30 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.14em] opacity-80">
                  {enumLabel('turnAftermath.memoryTone', view.judgment.memoryTone)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={onOpenChronicle} className="rounded border border-current/25 px-2 py-1.5 text-[9px] font-mono uppercase tracking-[0.12em] hover:bg-white/10">
                  {t('turnAftermath.chronicle')}
                </button>
                <button type="button" onClick={onOpenCodex} className="rounded border border-current/25 px-2 py-1.5 text-[9px] font-mono uppercase tracking-[0.12em] hover:bg-white/10">
                  {t('turnAftermath.codex')}
                </button>
              </div>
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                {t('turnAftermath.commandDesk')}
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 text-sm">
                <Metric label={t('turnAftermath.metric.actionable')} value={String(view.nextActions.actionableCount)} detail={t('turnAftermath.detail.blocking', { count: view.nextActions.blockingCount })} compact />
                <Metric label={t('turnAftermath.metric.opportunities')} value={String(view.nextActions.opportunityCount)} detail={t('turnAftermath.detail.armyHq')} compact />
                <Metric label={t('turnAftermath.metric.reserves')} value={String(view.nextActions.reserveCount)} detail={t('turnAftermath.detail.requests')} compact />
                <Metric label={t('turnAftermath.metric.officers')} value={String(view.nextActions.officerCount)} detail={t('turnAftermath.detail.personnel')} compact />
              </div>
              <div className="divide-y divide-white/10 border-t border-white/10">
                {!hasTopActions ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">{t('turnAftermath.noDecisions')}</div>
                ) : view.nextActions.topItems.map((item) => (
                  <div key={item.id} className={`px-3 py-2 ${actionTone(item)}`}>
                    <div className="truncate text-sm font-semibold">{item.title}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-75">{actionTypeLabel(item.type)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label={t('turnAftermath.metric.formations')} value={`+${view.formations.ownSpawned} / -${view.formations.ownDestroyed}`} detail={t('turnAftermath.detail.spawnedTotal', { count: view.formations.spawned })} />
              <Metric label={t('turnAftermath.metric.supply')} value={formatSigned(view.supply.ownSupplyDelta)} detail={t('turnAftermath.detail.heavyValue', { value: formatSigned(view.supply.ownHeavyMunitionsDelta) })} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/30 px-5 py-4">
          <button type="button" onClick={onOpenSummary} className="min-w-0 rounded border border-white/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:border-white/25 hover:text-text-primary sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
            {t('turnAftermath.warSummary')}
          </button>
          <button type="button" onClick={onOpenRecords} className="min-w-0 rounded border border-white/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:border-white/25 hover:text-text-primary sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
            {t('turnAftermath.turnRecords')}
          </button>
          <button type="button" onClick={onOpenInbox} className="min-w-0 rounded border border-amber-400/35 bg-amber-400/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/20 sm:px-4 sm:text-[10px] sm:tracking-[0.18em]">
            {t('turnAftermath.reviewInbox')}
          </button>
        </div>
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
    <div className={`min-w-0 overflow-hidden border border-white/10 bg-white/[0.03] ${compact ? 'px-3 py-2' : 'px-3 py-3'}`}>
      <div className="break-words text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-text-primary">{value}</div>
      <div className="break-words text-[10px] text-text-secondary">{detail}</div>
    </div>
  );
}
