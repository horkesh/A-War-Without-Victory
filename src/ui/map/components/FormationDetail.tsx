import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Right panel when a formation marker is clicked: name, kind, faction, strength, fatigue, orders.
 */
export function FormationDetail() {
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);

  if (!selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;
  const attackOrder = loadedGameState?.attackOrders?.find(
    (o) => o.brigadeId === selectedFormationId
  );

  const panelStyle = {
    position: 'absolute' as const,
    left: 'auto' as const,
    right: '1rem',
    top: '3.5rem',
    bottom: '1rem',
    width: '20rem',
    zIndex: 50,
    direction: 'ltr' as const,
  };

  return (
    <div
      className="flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={panelStyle}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Formation
        </span>
        <button
          onClick={() => setSelectedFormationId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3 overflow-auto min-w-0">
        {!formation ? (
          <p className="text-xs text-text-secondary italic">Formation not found.</p>
        ) : (
          <>
            <div className={`font-mono text-sm font-medium ${FACTION_COLORS_SUBTLE[formation.faction] ?? 'text-text-primary'}`}>
              {formation.name}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-text-secondary">Kind:</span>
              <span className="text-text-primary">{formation.kind}</span>
              <span className="text-text-secondary">Faction:</span>
              <span className={FACTION_COLORS_SUBTLE[formation.faction] ?? 'text-text-primary'}>{formation.faction}</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-text-secondary">Cohesion</span>
              <span className="text-text-primary tabular-nums">{formation.cohesion}</span>
              <span className="text-text-secondary">Fatigue</span>
              <span className="text-text-primary tabular-nums">{formation.fatigue}</span>
              {formation.personnel != null && (
                <>
                  <span className="text-text-secondary">Personnel</span>
                  <span className="text-text-primary tabular-nums">{formation.personnel.toLocaleString()}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-x-2 text-xs">
              <span className="text-text-secondary">Status:</span>
              <span className="text-text-primary">{capitalize(formation.status)}</span>
              <span className="text-text-secondary">Readiness:</span>
              <span className="text-text-primary">{capitalize(formation.readiness)}</span>
            </div>

            {formation.location_osid && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Location: </span>
                <span className="font-mono text-text-primary break-all" title={formation.location_osid}>
                  {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                </span>
              </div>
            )}

            {attackOrder && (
              <div className="pt-2 border-t border-panel-border min-w-0">
                <span className="text-xs text-text-secondary">Attack order: </span>
                <span className="text-xs text-text-primary font-mono break-all" title={attackOrder.targetSettlementId}>
                  {getOsidDisplayName(attackOrder.targetSettlementId, osidDisplayNames)}
                </span>
              </div>
            )}

            {/* Phase C4: Attack target selection — click map OSID after this to open confirmation modal */}
            {formation.kind === 'brigade' && !attackOrder && (
              <div className="pt-2 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => setOrderModeForFormation('attack')}
                  className={`text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover ${orderModeForFormation === 'attack' ? 'ring-1 ring-accent-gold bg-panel-active' : ''}`}
                >
                  {orderModeForFormation === 'attack' ? 'Click map to choose target…' : 'Attack'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
