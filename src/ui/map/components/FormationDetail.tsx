import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { stagePostureOrderAction } from '../desktop/orderActions';
import { DETAIL_PANEL_STYLE, SECONDARY_PANEL_STYLE } from './panelRail';

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function humanizeMunicipalityId(munId: string): string {
  return munId
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function formatOutcome(outcome: string): string {
  return outcome
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Right panel when a formation marker is clicked: name, kind, faction, strength, fatigue, orders.
 */
export function FormationDetail() {
  const ipc = useIPC();
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const operationsPanelOpen = useGameStore((s) => s.operationsPanelOpen);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const addStagedOrder = useGameStore((s) => s.addStagedOrder);
  const setLoadError = useGameStore((s) => s.setLoadError);

  useEffect(() => {
    setOrdersPanelOpen(false);
  }, [selectedFormationId]);

  if (operationsPanelOpen || !selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;
  const formationCasualties = formation
    ? loadedGameState?.formationCasualtyLedger?.[formation.id]
    : undefined;
  const attackOrder = loadedGameState?.attackOrders?.find(
    (o) => o.brigadeId === selectedFormationId
  );

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={DETAIL_PANEL_STYLE}
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

            <div className="text-xs min-w-0">
              <span className="text-text-secondary">ID: </span>
              <span className="font-mono text-text-primary break-all" title={formation.id}>
                {formation.id}
              </span>
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

            {formation.kind === 'brigade' && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Home municipality: </span>
                <span
                  className="font-mono text-text-primary break-all"
                  title={formation.municipalityId ?? '—'}
                >
                  {formation.municipalityId ? humanizeMunicipalityId(formation.municipalityId) : '—'}
                </span>
              </div>
            )}

            {formation.kind === 'brigade' && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-text-secondary">KIA</span>
                <span className="text-text-primary tabular-nums">{(formationCasualties?.killed ?? 0).toLocaleString()}</span>
                <span className="text-text-secondary">WIA</span>
                <span className="text-text-primary tabular-nums">{(formationCasualties?.wounded ?? 0).toLocaleString()}</span>
                <span className="text-text-secondary">MIA/Captured</span>
                <span className="text-text-primary tabular-nums">{(formationCasualties?.missing_captured ?? 0).toLocaleString()}</span>
              </div>
            )}

            {formation.kind === 'brigade' && formation.brigadeHistory && (
              <div className="pt-2 border-t border-panel-border space-y-1">
                <div className="text-xs text-text-secondary">Brigade history</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-text-secondary">Battles</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.battles_fought.toLocaleString()}</span>
                  <span className="text-text-secondary">Victories</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.victories.toLocaleString()}</span>
                  <span className="text-text-secondary">Defeats</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.defeats.toLocaleString()}</span>
                  <span className="text-text-secondary">Stalemates</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.stalemates.toLocaleString()}</span>
                  <span className="text-text-secondary">OSIDs captured</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.total_osids_captured.toLocaleString()}</span>
                  <span className="text-text-secondary">OSIDs lost</span>
                  <span className="text-text-primary tabular-nums">{formation.brigadeHistory.total_osids_lost.toLocaleString()}</span>
                </div>
                {formation.brigadeHistory.recent_engagements.length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs text-text-secondary mb-1">Recent engagements</div>
                    <div className="space-y-1">
                      {formation.brigadeHistory.recent_engagements.map((engagement, idx) => (
                        <div key={`${engagement.turn}-${engagement.osid}-${engagement.role}-${idx}`} className="text-[11px] leading-4">
                          <span className="text-text-secondary">T{engagement.turn} </span>
                          <span className="text-text-primary">{formatOutcome(engagement.outcome)}</span>
                          <span className="text-text-secondary"> @ </span>
                          <span className="font-mono text-text-primary">{getOsidDisplayName(engagement.osid, osidDisplayNames)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(() => {
              if (!loadedGameState?.corpsFrontSectors) return null;
              const sectors = loadedGameState.corpsFrontSectors;

              // Corps/corps_asset: show all sectors belonging to this corps
              if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
                const corpsSectors = sectors.filter((s) => s.corps_id === formation.id);
                if (corpsSectors.length === 0) return null;
                return (
                  <div className="pt-2 border-t border-panel-border text-xs min-w-0">
                    <div className="text-text-secondary mb-1">Sectors ({corpsSectors.length}):</div>
                    <div className="space-y-0.5">
                      {corpsSectors.map((s) => (
                        <button
                          key={s.sector_id}
                          type="button"
                          onClick={() => setSelectedCorpsFrontSectorId(s.sector_id)}
                          className="block w-full text-left text-interactive hover:underline truncate"
                          title={s.sector_id}
                        >
                          {s.display_name}
                          <span className="text-text-secondary ml-1">
                            ({s.assigned_brigade_ids.length}+{s.reserve_brigade_ids.length})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // Brigade: show the single sector it belongs to
              if (!formation.corps_id) return null;
              const sector = sectors.find(
                (s) => s.corps_id === formation.corps_id &&
                  (s.assigned_brigade_ids.includes(formation.id) || s.reserve_brigade_ids.includes(formation.id))
              );
              if (!sector) return null;
              return (
                <div className="text-xs min-w-0">
                  <span className="text-text-secondary">Sector: </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCorpsFrontSectorId(sector.sector_id)}
                    className="text-interactive hover:underline"
                    title={sector.sector_id}
                  >
                    {sector.display_name}
                  </button>
                </div>
              );
            })()}

            {attackOrder && (
              <div className="pt-2 border-t border-panel-border min-w-0">
                <span className="text-xs text-text-secondary">Attack order: </span>
                <span className="text-xs text-text-primary font-mono break-all" title={attackOrder.targetSettlementId}>
                  {getOsidDisplayName(attackOrder.targetSettlementId, osidDisplayNames)}
                </span>
              </div>
            )}

            {/* Phase C4: Attack/Move target selection — click map OSID */}
            {formation.kind === 'brigade' && (
              <div className="pt-2 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => setOrdersPanelOpen((v) => !v)}
                  className="text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                >
                  {ordersPanelOpen ? 'Hide orders' : 'Order'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {formation?.kind === 'brigade' && ordersPanelOpen && (
        <div
          className="panel-slide-in-right flex flex-col bg-panel-bg/96 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
          style={SECONDARY_PANEL_STYLE}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
            <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
              Orders
            </span>
            <button
              onClick={() => setOrdersPanelOpen(false)}
              className="text-text-secondary hover:text-interactive text-sm leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-3 overflow-auto">
            <div className="text-[11px] text-text-secondary">
              {formation.name}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderModeForFormation(orderModeForFormation === 'attack' ? null : 'attack')}
                className={`text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover ${orderModeForFormation === 'attack' ? 'ring-1 ring-accent-gold bg-panel-active' : ''}`}
              >
                {orderModeForFormation === 'attack' ? 'Click target…' : 'Attack'}
              </button>
              <button
                type="button"
                onClick={() => setOrderModeForFormation(orderModeForFormation === 'move' ? null : 'move')}
                className={`text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover ${orderModeForFormation === 'move' ? 'ring-1 ring-green-500 bg-panel-active' : ''}`}
              >
                {orderModeForFormation === 'move' ? 'Click destination…' : 'Move'}
              </button>
            </div>
            <div className="pt-1 border-t border-panel-border">
              <div className="text-[11px] text-text-secondary mb-1">Posture</div>
              <div className="flex flex-wrap gap-1">
                {(['hold', 'defend', 'defend_at_all_costs', 'elastic_defense', 'counterattack', 'dig_in', 'attack', 'assault'] as const).map((posture) => {
                  const isOffensive = posture === 'attack' || posture === 'assault';
                  const blocked = isOffensive && (formation.home_defense_active ?? false);
                  return (
                  <button
                    key={posture}
                    type="button"
                    disabled={blocked}
                    onClick={() => void stagePostureOrderAction(
                      {
                        ipc,
                        addStagedOrder,
                        setLoadError,
                      },
                      formation.id,
                      posture
                    )}
                    title={blocked ? 'Blocked: home defense active' : undefined}
                    className={`text-[11px] font-sans px-2 py-1 rounded border border-panel-border ${blocked ? 'opacity-40 cursor-not-allowed text-text-secondary' : 'text-interactive hover:bg-panel-hover'}`}
                  >
                    {posture.replace(/_/g, ' ')}
                  </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
