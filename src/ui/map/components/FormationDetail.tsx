import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { CombatSummaryPanel } from './CombatSummaryPanel';

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatRawId(id: string): string {
  if (!id) return '';
  return id
    .replace(/^(RS|RBiH|HRHB)_/i, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getNarrativeArcClass(arc: string): string {
  switch (arc) {
    case 'veteran': return 'bg-green-900/40 text-green-400';
    case 'bloodied': return 'bg-amber-900/40 text-amber-400';
    case 'shattered': return 'bg-red-900/40 text-red-400';
    case 'risen': return 'bg-emerald-900/40 text-emerald-300';
    case 'destroyed': return 'bg-neutral-800/60 text-neutral-500';
    default: return 'bg-neutral-800/40 text-neutral-400';
  }
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
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const lastTurnReport = useGameStore((s) => s.lastTurnReport);

  if (!selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;
  const attackOrder = loadedGameState?.attackOrders?.find(
    (o) => o.brigadeId === selectedFormationId
  );

  const panelStyle = {
    position: 'absolute' as const,
    left: '19rem',
    top: '3.5rem',
    bottom: '2rem',
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
              {formation.name === formation.id ? formatRawId(formation.name) : formation.name}
            </div>

            {(() => {
              const homeMunTag = formation.tags?.find(t => t.startsWith('mun:'));
              const homeMun = homeMunTag ? capitalize(homeMunTag.slice(4).replace(/_/g, ' ')) : 'Unknown';
              return (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-text-secondary">Home:</span>
                  <span className="text-text-primary">{homeMun}</span>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-text-secondary">Cohesion</span>
              <div className="flex items-center gap-0.5" title={`Cohesion: ${formation.cohesion}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-2.5 w-1.5 rounded-sm ${i < Math.ceil((formation.cohesion ?? 0) / 20) ? 'bg-amber-400' : 'bg-panel-border'}`} />
                ))}
              </div>
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
                <span className="font-mono text-text-primary break-all">
                  {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                </span>
              </div>
            )}

            {/* Command (Officers Phase E) */}
            {(() => {
              const namedOfficerData = loadedGameState?.namedOfficerData;
              const namedOfficerStateById = loadedGameState?.namedOfficerStateById;
              if (!namedOfficerData?.length || !namedOfficerStateById) return null;

              function findCommanderForCorps(corpsId: string | undefined): { name: string; acting: boolean } | null {
                if (!corpsId) return null;
                for (const entry of namedOfficerData ?? []) {
                  const state = namedOfficerStateById?.[entry.id];
                  if (state?.status === 'active' && state.assigned_corps_id === corpsId) {
                    return { name: entry.name, acting: state.acting_commander };
                  }
                }
                return null;
              }
              function findArmyCommander(faction: string): { name: string; acting: boolean } | null {
                for (const entry of namedOfficerData ?? []) {
                  if (entry.faction !== faction || entry.rank !== 'army_commander') continue;
                  const state = namedOfficerStateById?.[entry.id];
                  if (state?.status === 'active') return { name: entry.name, acting: state.acting_commander };
                }
                return null;
              }

              const isBrigade = formation.kind === 'brigade' || formation.kind === 'operational_group';
              const isCorps = formation.kind === 'corps' || formation.kind === 'corps_asset';
              const isArmyHq = formation.kind === 'army_hq';
              const corpsCommanderBrigade = isBrigade && formation.corps_id ? findCommanderForCorps(formation.corps_id) : null;
              const corpsCommanderCorps = isCorps ? findCommanderForCorps(formation.id) : null;
              const armyCommander = isArmyHq ? findArmyCommander(formation.faction) : null;

              const hasOfficerQuality = formation.officer_quality != null && isBrigade;
              const hasCorpsCommander = corpsCommanderBrigade || corpsCommanderCorps;
              const hasArmyCommander = isArmyHq && armyCommander;
              if (!hasOfficerQuality && !hasCorpsCommander && !hasArmyCommander) return null;

              return (
                <div className="pt-2 border-t border-panel-border text-xs min-w-0 space-y-1">
                  <div className="text-text-secondary font-medium uppercase tracking-wide">Command</div>
                  {hasOfficerQuality && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Officer quality</span>
                      <span className="text-text-primary tabular-nums">{(formation.officer_quality! * 100).toFixed(0)}%</span>
                      <div className="flex-1 h-1.5 bg-panel-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={formation.officer_quality! * 100} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-accent-gold rounded-full" style={{ width: `${(formation.officer_quality! * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                  )}
                  {corpsCommanderBrigade && (
                    <div>
                      <span className="text-text-secondary">Corps commander: </span>
                      <span className="text-text-primary">{corpsCommanderBrigade.name}{corpsCommanderBrigade.acting ? ' (Acting)' : ''}</span>
                    </div>
                  )}
                  {corpsCommanderCorps && (
                    <div>
                      <span className="text-text-secondary">Corps commander: </span>
                      <span className="text-text-primary">{corpsCommanderCorps.name}{corpsCommanderCorps.acting ? ' (Acting)' : ''}</span>
                    </div>
                  )}
                  {hasArmyCommander && armyCommander && (
                    <div>
                      <span className="text-text-secondary">Army commander: </span>
                      <span className="text-text-primary">{armyCommander.name}{armyCommander.acting ? ' (Acting)' : ''}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Recent command changes (corps only, Officers Phase E) */}
            {(() => {
              const succession = lastTurnReport?.details?.officer_succession;
              const isCorps = formation.kind === 'corps' || formation.kind === 'corps_asset';
              if (!succession || !isCorps || !loadedGameState?.namedOfficerData?.length) return null;
              const replacementsForCorps = (succession.replacements ?? []).filter((r) => r.corps_id === formation.id);
              if (replacementsForCorps.length === 0) return null;
              const nameById = new Map(loadedGameState.namedOfficerData!.map((o) => [o.id, o.name]));
              return (
                <div className="pt-2 border-t border-panel-border text-xs min-w-0">
                  <div className="text-text-secondary font-medium uppercase tracking-wide mb-1">Recent command changes</div>
                  <ul className="space-y-0.5 list-none">
                    {replacementsForCorps.map((r, i) => (
                      <li key={i} className="text-text-primary">
                        {nameById.get(r.new_officer) ?? formatRawId(r.new_officer)} took command
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* War Story (brigades only) */}
            {formation.narrativeArc && formation.warNarrative && (
              <div className="pt-2 border-t border-panel-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-block text-[10px] font-mono font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${getNarrativeArcClass(formation.narrativeArc)}`}>
                    {formation.narrativeArc}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-secondary italic">
                  {formation.warNarrative}
                </p>
                {formation.notableMoments && formation.notableMoments.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {formation.notableMoments.map((m, i) => {
                      const localizedDesc = m.description.replace(/op:[a-z0-9_]+:[a-z0-9_]+/gi, (match) => getOsidDisplayName(match, osidDisplayNames));
                      return (
                        <div key={i} className="text-[10px] text-text-secondary flex gap-1">
                          <span className="text-accent-gold shrink-0">&bull;</span>
                          <span>{localizedDesc}{m.turn > 0 ? ` (T${m.turn})` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Combat Summary: corps/army_hq aggregate, or brigade record synthesized from brigade_history. */}
            {formation.combatSummary && (
              <CombatSummaryPanel
                summary={formation.combatSummary}
                compact
              />
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
                  >
                    {sector.display_name}
                  </button>
                </div>
              );
            })()}

            {attackOrder && (
              <div className="pt-2 border-t border-panel-border min-w-0">
                <span className="text-xs text-text-secondary">Attack order: </span>
                <span className="text-xs text-text-primary font-mono break-all">
                  {getOsidDisplayName(attackOrder.targetSettlementId, osidDisplayNames)}
                </span>
              </div>
            )}

            {/* Phase C4: Attack/Move target selection — click map OSID */}
            {formation.kind === 'brigade' && !attackOrder && (
              <div className="pt-2 border-t border-panel-border flex gap-2">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
