import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { formatOperationType, turnToDateString, toTitleCase } from '../utils/formatters';
import { getPanelRailStyle } from './panelRail';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import { findPlayerFacingOperationByKey } from '../../shared/playerVisibility';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';

function PhaseBadge({ phase }: { phase: string }) {
  const cls =
    phase === 'execution' ? 'bg-red-800/60 text-white' :
      phase === 'planning' ? 'bg-yellow-700/60 text-white' :
        'bg-neutral-600/60 text-neutral-300';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls}`}>
      {toTitleCase(phase)}
    </span>
  );
}

const RECOVERY_REASON_BADGE: Record<string, { label: string; className: string }> = {
  completed: { label: 'COMPLETED', className: 'bg-green-700/60 text-green-200' },
  max_failures: { label: 'FAILED \u2014 MAX FAILURES', className: 'bg-red-700/60 text-red-200' },
  orphaned_sector: { label: 'ENDED \u2014 SECTOR LOST', className: 'bg-amber-700/60 text-amber-200' },
  no_logged_attempt: { label: 'ENDED \u2014 NO CONTACT', className: 'bg-neutral-600/60 text-neutral-300' },
  manual_termination: { label: 'HALTED BY COMMAND', className: 'bg-blue-700/60 text-blue-200' },
};

const TEMPO_BADGE: Record<string, { label: string; className: string }> = {
  methodical: { label: 'Methodical', className: 'bg-blue-700/60 text-blue-200' },
  standard: { label: 'Standard', className: 'bg-neutral-600/60 text-neutral-300' },
  all_out: { label: 'All Out', className: 'bg-red-700/60 text-red-200' },
};

const AXIS_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  executing: { label: 'Executing', className: 'bg-green-700/60 text-green-200' },
  stalled: { label: 'Stalled', className: 'bg-amber-700/60 text-amber-200' },
  complete: { label: 'Complete', className: 'bg-blue-700/60 text-blue-200' },
};

function formatOutcomeName(outcome: string): string {
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function MomentumBar({ momentum }: { momentum: number }) {
  const filled = Math.round(Math.max(0, Math.min(3, momentum)));
  return (
    <span className="flex gap-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-sm ${i < filled ? 'bg-accent-gold' : 'bg-panel-border'}`}
        />
      ))}
      <span className="ml-1 tabular-nums text-text-primary">{filled}/3</span>
    </span>
  );
}

/**
 * Operation detail panel: shows when an operation card is clicked in OOBSidebar.
 * Positioned at left: 19rem (second column, next to OOBSidebar).
 */
interface OperationDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function OperationDetail({ railSlot }: OperationDetailProps) {
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedOperationKey = useGameStore((s) => s.setSelectedOperationKey);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

  const op = findPlayerFacingOperationByKey(loadedGameState, selectedOperationKey);

  if (!op) return null;

  const objectives = op.objectives ?? [];
  const currentIdx = op.current_objective_index ?? 0;
  const getSectorName = (sid: string) =>
    getPlayerFacingSectorName(sid, loadedGameState.corpsFrontSectors ?? []);

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={getPanelRailStyle(railSlot, '20rem', 'left')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Operation
        </span>
        <button
          onClick={() => setSelectedOperationKey(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">{op.name}</div>
          <div className="text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
            <span className={FACTION_COLORS[op.faction] ?? 'text-text-primary'}>{getPlayerSafeMilitaryFactionName(op.faction)}</span>
            <span>·</span>
            <span>{op.corps_name}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <PhaseBadge phase={op.phase} />
            <span className="text-text-secondary">{formatOperationType(op.type)}</span>
            {op.phase === 'recovery' && op.recovery_reason && RECOVERY_REASON_BADGE[op.recovery_reason] && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${RECOVERY_REASON_BADGE[op.recovery_reason].className}`}>
                {RECOVERY_REASON_BADGE[op.recovery_reason].label}
              </span>
            )}
          </div>
        </div>

        {/* Commander */}
        {(() => {
          const corpsFormation = loadedGameState.formations.find(f => f.id === op.corps_id);
          const commander = corpsFormation ? getFormationCommander(corpsFormation, loadedGameState) : null;
          if (!commander) return null;
          return <OfficerProfile officer={commander} label="Operation Commander" className="mb-4" />;
        })()}

        {/* Metrics */}
        <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Brigades</span>
            <span className="text-text-primary tabular-nums">{op.participating_brigade_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Started</span>
            <span className="text-text-primary tabular-nums whitespace-nowrap text-[11px]">{turnToDateString(op.started_turn)}</span>
          </div>
          {op.momentum != null && (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Momentum</span>
              <MomentumBar momentum={op.momentum} />
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-secondary">Supply readiness</span>
            {op.supply_readiness != null ? (
              <span className={`tabular-nums ${op.supply_readiness < 0.3 ? 'text-red-400 font-semibold' : op.supply_readiness < 0.7 ? 'text-amber-300' : 'text-green-400'}`}>
                {(op.supply_readiness * 100).toFixed(0)}%
              </span>
            ) : (
              <span className="text-text-secondary italic" title="Supply readiness not yet assessed for this operation">N/A</span>
            )}
          </div>
          {op.tempo && TEMPO_BADGE[op.tempo] && (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Tempo</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${TEMPO_BADGE[op.tempo].className}`}>
                {TEMPO_BADGE[op.tempo].label}
              </span>
            </div>
          )}
          {op.min_attack_outcome && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Minimum</span>
              <span className="text-text-primary">{formatOutcomeName(op.min_attack_outcome)}</span>
            </div>
          )}
        </div>

        {/* Staging */}
        {op.staging_osid && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <span className="text-text-secondary">Staging: </span>
            <span className="font-mono text-text-primary">
              {getOsidDisplayName(op.staging_osid, osidDisplayNames)}
            </span>
          </div>
        )}

        {/* Sector anchor — shows primary sector and cross-sector risk transfer */}
        {op.sector_id && (
          <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
            <div className="text-text-secondary text-[10px] uppercase tracking-wide font-semibold mb-1">Sector Anchor</div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Primary sector</span>
              <span className="text-text-primary font-mono text-[11px]">
                {getSectorName(op.sector_id)}
              </span>
            </div>
            {op.primary_sector_brigades != null && op.primary_sector_brigades.length > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Primary bdes</span>
                <span className="text-text-primary tabular-nums">{op.primary_sector_brigades.length}</span>
              </div>
            )}
            {op.attached_brigades != null && op.attached_brigades.length > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Attached bdes</span>
                <span className="text-amber-300 tabular-nums" title="Brigades drawn from adjacent sectors — risk transferred to those sectors">
                  {op.attached_brigades.length}
                </span>
              </div>
            )}
            {op.supporting_sector_ids != null && op.supporting_sector_ids.length > 0 && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-text-secondary shrink-0">Risk transferred from</span>
                <span className="text-amber-300 text-[11px] text-right">
                  {op.supporting_sector_ids
                    .map(sid => getSectorName(sid))
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Objectives */}
        {objectives.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="text-text-secondary mb-1">
              Objectives ({currentIdx + 1}/{objectives.length}):
            </div>
            <div className="space-y-0.5">
              {objectives.map((osid, i) => {
                const isCurrent = i === currentIdx;
                const isDone = i < currentIdx;
                return (
                  <div
                    key={osid}
                    className={`flex items-center gap-1.5 ${isDone ? 'text-text-secondary line-through' : isCurrent ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}
                  >
                    <span className="shrink-0">
                      {isDone ? '✓' : isCurrent ? '▶' : '○'}
                    </span>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="font-mono truncate">
                        {getOsidDisplayName(osid, osidDisplayNames)}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] text-accent-gold font-bold uppercase tracking-tighter px-1 bg-accent-gold/10 rounded border border-accent-gold/30 ml-2 shrink-0">
                          Schwerpunkt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Axes */}
        {op.axes && op.axes.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="text-text-secondary mb-1">Axes:</div>
            <div className="space-y-1.5">
              {op.axes.map((axis) => {
                const statusBadge = AXIS_STATUS_BADGE[axis.status];
                return (
                  <div key={axis.axis_id} className="border-l-2 border-panel-border/50 pl-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-text-primary font-semibold text-[11px] truncate">{axis.name}</span>
                      {statusBadge && (
                        <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5">
                      <span>{axis.assigned_brigades.length} bde{axis.assigned_brigades.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>Obj {axis.current_objective_index + 1}/{axis.objectives.length}</span>
                      <span>·</span>
                      <span className={axis.momentum >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {axis.momentum >= 0 ? '+' : ''}{axis.momentum.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
