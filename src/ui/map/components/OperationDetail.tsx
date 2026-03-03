import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOsidDisplayName } from '../utils/osidDisplayName';

function PhaseBadge({ phase }: { phase: string }) {
  const cls =
    phase === 'execution' ? 'bg-red-800/60 text-white' :
    phase === 'planning' ? 'bg-yellow-700/60 text-white' :
    'bg-neutral-600/60 text-neutral-300';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls}`}>
      {phase}
    </span>
  );
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
export function OperationDetail() {
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedOperationKey = useGameStore((s) => s.setSelectedOperationKey);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

  if (!selectedOperationKey || !loadedGameState) return null;

  const [corpsId, opName] = selectedOperationKey.split('|');
  const op = loadedGameState.operations?.find(
    (o) => o.corps_id === corpsId && o.name === opName
  ) ?? null;

  if (!op) return null;

  const objectives = op.objectives ?? [];
  const currentIdx = op.current_objective_index ?? 0;

  return (
    <div
      className="flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={{
        position: 'absolute',
        left: '19rem',
        top: '3.5rem',
        bottom: '2rem',
        width: '20rem',
        zIndex: 50,
      }}
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
            <span className={FACTION_COLORS[op.faction] ?? 'text-text-primary'}>{op.faction}</span>
            <span>·</span>
            <span>{op.corps_name}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <PhaseBadge phase={op.phase} />
            <span className="text-text-secondary capitalize">{op.type.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Brigades</span>
            <span className="text-text-primary tabular-nums">{op.participating_brigade_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Started turn</span>
            <span className="text-text-primary tabular-nums">{op.started_turn}</span>
          </div>
          {op.momentum != null && (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Momentum</span>
              <MomentumBar momentum={op.momentum} />
            </div>
          )}
          {op.supply_readiness != null && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Supply readiness</span>
              <span className={`tabular-nums ${op.supply_readiness < 0.4 ? 'text-red-400' : op.supply_readiness < 0.7 ? 'text-amber-300' : 'text-green-400'}`}>
                {(op.supply_readiness * 100).toFixed(0)}%
              </span>
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
                    <span className="font-mono">
                      {getOsidDisplayName(osid, osidDisplayNames)}
                    </span>
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
