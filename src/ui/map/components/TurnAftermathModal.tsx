/**
 * LANE-V094-MODAL-MIGRATION: migrated to shared `<Modal>` wrapper for
 * canonical ESC dismissal, focus management, aria contracts, and z-index.
 * Original markup had no click-outside dismiss; preserved via
 * `closeOnBackdropClick={false}`. No tutorial `data-tutorial-step`
 * anchors inside this modal.
 */
import type { TurnAftermathTopAction, TurnAftermathView } from '../data/turnAftermath';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

interface TurnAftermathModalProps {
  isOpen: boolean;
  view: TurnAftermathView | null;
  onClose: () => void;
  onOpenInbox: () => void;
  onOpenSummary: () => void;
  onOpenRecords: () => void;
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

export function TurnAftermathModal({
  isOpen,
  view,
  onClose,
  onOpenInbox,
  onOpenSummary,
  onOpenRecords,
}: TurnAftermathModalProps) {
  if (!view) return null;

  const hasTopActions = view.nextActions.topItems.length > 0;
  const signalPreview = view.signals.slice(0, 4);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.TURN_AFTERMATH}
      closeOnBackdropClick={false}
      ariaLabelledBy="turn-aftermath-title"
      backdropClassName="bg-black/70 px-4"
      panelClassName="w-full max-w-4xl max-h-[86vh] overflow-hidden border border-white/15 bg-[#101018] shadow-2xl"
    >
      <>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/30 px-5 py-4">
          <div className="min-w-0">
            <div id="turn-aftermath-title" className="text-[10px] font-mono uppercase tracking-[0.28em] text-amber-400/70">
              Turn Aftermath
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary">{view.dateLabel}</h2>
              <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${toneClasses(view.tone)}`}>
                {view.tone}
              </span>
            </div>
            <div className="mt-1 text-sm text-text-secondary">{view.headline}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-white/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary hover:border-white/25 hover:text-text-primary"
          >
            Continue
          </button>
        </div>

        <div className="grid max-h-[62vh] gap-4 overflow-auto p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Territory" value={formatSigned(view.territory.friendlyNet)} detail={`${view.territory.gains} gained / ${view.territory.losses} lost`} />
              <Metric label="Battles" value={String(view.combat.friendlyBattleCount)} detail={`${view.combat.battleCount} total`} />
              <Metric label="Casualties" value={String(view.combat.friendlyCasualties)} detail={`${view.combat.opposingCasualties} opposing`} />
              <Metric label="Displaced" value={String(view.humanitarian.displacedThisTurn)} detail={view.humanitarian.hotspotLabel ?? 'No hotspot'} />
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                Notable Territory
              </div>
              <div className="divide-y divide-white/10">
                {view.territory.notable.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">No notable territorial flips.</div>
                ) : view.territory.notable.slice(0, 6).map((flip) => (
                  <div key={`${flip.osid}:${flip.from ?? 'none'}:${flip.to ?? 'none'}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{flip.label}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-secondary">{flip.significance.replace(/_/g, ' ')}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${flip.direction === 'gain' ? 'border-emerald-400/30 text-emerald-300' : flip.direction === 'loss' ? 'border-red-400/30 text-red-300' : 'border-white/10 text-text-secondary'}`}>
                      {flip.direction}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                Strategic Signals
              </div>
              <div className="divide-y divide-white/10">
                {signalPreview.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">No strategic signals recorded this turn.</div>
                ) : signalPreview.map((signal) => (
                  <div key={signal.id} className={`px-3 py-2 ${signalTone(signal.severity)}`}>
                    <div className="truncate text-sm font-semibold">{signal.label}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-75">{signal.kind} / {signal.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                  Turn Cost
                </div>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.16em] ${costSeverityClasses(view.cost.severity)}`}>
                  {view.cost.severity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 text-sm">
                <Metric label="Own Casualties" value={String(view.cost.friendlyMilitaryCasualties)} detail={`${view.cost.theaterMilitaryCasualties} theater`} compact />
                <Metric label="Displaced" value={String(view.cost.displacedThisTurn)} detail="This turn" compact />
                <Metric label="Destroyed" value={String(view.cost.ownFormationsDestroyed)} detail="Own formations" compact />
                <Metric label="Supply Spent" value={String(view.cost.ownSupplySpent + view.cost.ownHeavyMunitionsSpent)} detail={`${view.cost.ownHeavyMunitionsSpent} heavy`} compact />
              </div>
              <div className="border-t border-white/10 px-3 py-2 text-[10px] text-text-secondary">
                {view.cost.reasons.slice(0, 3).join(' / ')}
              </div>
            </div>

            <div className="border border-white/10 bg-black/20">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary">
                Command Desk
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 text-sm">
                <Metric label="Actionable" value={String(view.nextActions.actionableCount)} detail={`${view.nextActions.blockingCount} blocking`} compact />
                <Metric label="Opportunities" value={String(view.nextActions.opportunityCount)} detail="Army HQ" compact />
                <Metric label="Reserves" value={String(view.nextActions.reserveCount)} detail="Requests" compact />
                <Metric label="Officers" value={String(view.nextActions.officerCount)} detail="Personnel" compact />
              </div>
              <div className="divide-y divide-white/10 border-t border-white/10">
                {!hasTopActions ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">No presidential decisions pending.</div>
                ) : view.nextActions.topItems.map((item) => (
                  <div key={item.id} className={`px-3 py-2 ${actionTone(item)}`}>
                    <div className="truncate text-sm font-semibold">{item.title}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-75">{item.type.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Formations" value={`+${view.formations.ownSpawned} / -${view.formations.ownDestroyed}`} detail={`${view.formations.spawned} spawned total`} />
              <Metric label="Supply" value={formatSigned(view.supply.ownSupplyDelta)} detail={`${formatSigned(view.supply.ownHeavyMunitionsDelta)} heavy`} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/30 px-5 py-4">
          <button type="button" onClick={onOpenSummary} className="min-w-0 rounded border border-white/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:border-white/25 hover:text-text-primary sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
            War Summary
          </button>
          <button type="button" onClick={onOpenRecords} className="min-w-0 rounded border border-white/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:border-white/25 hover:text-text-primary sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
            Turn Records
          </button>
          <button type="button" onClick={onOpenInbox} className="min-w-0 rounded border border-amber-400/35 bg-amber-400/10 px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-amber-300 hover:bg-amber-400/20 sm:px-4 sm:text-[10px] sm:tracking-[0.18em]">
            Review Inbox
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
    <div className={`border border-white/10 bg-white/[0.03] ${compact ? 'px-3 py-2' : 'px-3 py-3'}`}>
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-text-primary">{value}</div>
      <div className="text-[10px] text-text-secondary">{detail}</div>
    </div>
  );
}
