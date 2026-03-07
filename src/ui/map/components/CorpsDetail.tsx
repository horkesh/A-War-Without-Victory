/**
 * Corps detail panel (Phase D.1). Shows when a corps is selected via header click.
 * Displays corps identity, stance, personnel, sectors, subordinate brigades.
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOperationId } from '../utils/operations';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { useIPC } from '../desktop/useIPC';
import { getPanelRailStyle, SECONDARY_PANEL_STYLE } from './panelRail';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { getFormationCommander } from '../utils/officerUtils';

function formatRawId(id: string): string {
  if (!id) return '';
  return id
    .replace(/^(RS|RBiH|HRHB)_/i, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function CorpsDetail() {
  const ipc = useIPC();
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setSelectedOperationKey = useGameStore((s) => s.setSelectedOperationKey);
  const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Derived values needed by hooks — computed unconditionally so hooks are always called in the same order
  const corpsFormation = loadedGameState?.formations.find(
    (f) => f.id === selectedCorpsId && (f.kind === 'corps' || f.kind === 'corps_asset')
  ) ?? null;
  const corpsSectors = useMemo(
    () => loadedGameState?.corpsFrontSectors?.filter((s) => s.corps_id === selectedCorpsId) ?? [],
    [loadedGameState?.corpsFrontSectors, selectedCorpsId]
  );


  useEffect(() => {
    setOrdersPanelOpen(false);
  }, [selectedCorpsId]);

  if (operationsPanelOpen || !selectedCorpsId) return null;

  const railSlot = selectedArmyId ? 'secondary' : 'primary';

  if (!loadedGameState || !corpsFormation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={getPanelRailStyle(railSlot, '24rem')}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-4 space-y-4">
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-4 w-2/3 bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="h-32 w-full bg-panel-card rounded panel-shimmer" />
        </div>
      </div>
    );
  }

  const corpsColorMap = loadedGameState.corpsFrontSectors
    ? buildCorpsColorMap(loadedGameState.corpsFrontSectors)
    : {};
  const corpsColor = corpsColorMap[selectedCorpsId] ?? '#888';

  const subordinates = loadedGameState.formations.filter(
    (f) => f.corps_id === selectedCorpsId && f.kind === 'brigade'
  );
  const totalPersonnel = subordinates.reduce((sum, f) => sum + (f.personnel ?? 0), 0);

  // Active operations for this corps
  const corpsOps = loadedGameState.operations?.filter(
    (op) => op.corps_id === selectedCorpsId
  ) ?? [];

  const handleOpenOpsPlanning = () => {
    const primarySector = corpsSectors[0];
    if (primarySector) {
      setSelectedCorpsFrontSectorId(primarySector.sector_id);
      setOpsPlanningModalOpen(true);
    } else {
      setLoadError('Ops Planning requires the Corps to be assigned to a front sector.');
    }
  };

  const stageCorpsStance = async (stance: string) => {
    if (!ipc.isAvailable) {
      setLoadError('Corps orders are available in desktop mode only.');
      return;
    }
    const result = await ipc.stageCorpsStanceOrder(selectedCorpsId, stance);
    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to stage corps stance order.');
    }
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={getPanelRailStyle(railSlot, '24rem')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: corpsColor }}
          />
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Corps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOrdersPanelOpen((v) => !v)}
            className="text-[11px] font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
          >
            {ordersPanelOpen ? 'Hide orders' : 'Orders'}
          </button>
          <button
            onClick={() => useGameStore.setState({
              selectedCorpsId: null,
              selectedCorpsFrontSectorId: null,
              selectedFormationId: null,
              selectedOperationKey: null,
            })}
            className="text-text-secondary hover:text-interactive text-sm leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">
            {corpsFormation.name === corpsFormation.id ? formatRawId(corpsFormation.name) : corpsFormation.name}
          </div>
          <div className="text-text-secondary mt-0.5">
            <span className={FACTION_COLORS[corpsFormation.faction] ?? 'text-text-primary'}>
              {corpsFormation.faction}
            </span>
            {' · '}
            <span className="capitalize">{corpsFormation.corpsStance ?? 'unknown'}</span>
            {corpsFormation.corpsExhaustion != null && (
              <span className="text-text-secondary"> · Exhaustion: {corpsFormation.corpsExhaustion.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Commander */}
        {(() => {
          const commander = getFormationCommander(corpsFormation, loadedGameState);
          if (!commander) return null;
          return (
            <div className="mb-4 p-2 bg-black/20 rounded border border-panel-border/30 flex items-center gap-3">
              <div className="w-10 h-10 bg-panel-card rounded border border-panel-border flex items-center justify-center text-accent-gold text-lg font-bold shrink-0">
                HQ
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] uppercase text-text-secondary tracking-wider font-semibold">Corps Commander</div>
                <div className="text-xs font-bold text-accent-gold truncate">{commander.rank} {commander.name}</div>
                <div className="flex gap-2 text-[9px] mt-0.5">
                  <span className="text-text-secondary">Comp: <span className="text-text-primary">{Math.round(commander.competence * 100)}</span></span>
                  <span className="text-text-secondary">Agg: <span className="text-text-primary">{Math.round(commander.aggressiveness * 100)}</span></span>
                  <span className="text-text-secondary">Def: <span className="text-text-primary">{Math.round(commander.defensive_skill * 100)}</span></span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Metrics */}
        <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Personnel</span>
            <span className="text-text-primary tabular-nums">{totalPersonnel.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Brigades</span>
            <span className="text-text-primary tabular-nums">{subordinates.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Sectors</span>
            <span className="text-text-primary tabular-nums">{corpsSectors.length}</span>
          </div>
          {corpsFormation.corpsOgSlots != null && (
            <div className="flex justify-between">
              <span className="text-text-secondary">OG Slots</span>
              <span className="text-text-primary tabular-nums">
                {corpsFormation.corpsActiveOgIds?.length ?? 0}/{corpsFormation.corpsOgSlots}
              </span>
            </div>
          )}
        </div>

        {/* Combat Summary */}
        {corpsFormation.combatSummary && (
          <CombatSummaryPanel
            summary={corpsFormation.combatSummary}
            formations={loadedGameState.formations}
            onSelectFormation={setSelectedFormationId}
          />
        )}

        {/* Subordinate Leaderboards */}
        {corpsFormation.combatSummary && (corpsFormation.combatSummary.most_victories_brigade_id || corpsFormation.combatSummary.most_casualties_brigade_id) && (
          <div className="border-t border-panel-border pt-2 mb-3 space-y-2">
            <div className="text-xs text-text-secondary">Subordinate Leaderboards</div>

            {corpsFormation.combatSummary.most_victories_brigade_id && (
              <div className="flex justify-between items-center text-xs p-1.5 bg-accent-gold/5 border border-accent-gold/20 rounded">
                <div className="flex items-center gap-1.5">
                  <span className="text-accent-gold" title="Most Victorious Brigade">⭐</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wide text-text-secondary">Wall of Valor</span>
                    <button
                      className="text-text-primary hover:text-interactive text-left font-semibold truncate max-w-[120px]"
                      onClick={() => setSelectedFormationId(corpsFormation.combatSummary!.most_victories_brigade_id!)}
                    >
                      {loadedGameState.formations.find(f => f.id === corpsFormation.combatSummary!.most_victories_brigade_id)?.name || corpsFormation.combatSummary.most_victories_brigade_id}
                    </button>
                  </div>
                </div>
                <span className="text-accent-gold font-mono text-xs">
                  MVP
                </span>
              </div>
            )}

            {corpsFormation.combatSummary.most_casualties_brigade_id && (
              <div className="flex justify-between items-center text-xs p-1.5 bg-[#d45555]/5 border border-[#d45555]/20 rounded">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#d45555]" title="Highest Casualties Brigade">🩸</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wide text-text-secondary">Bleeding Edge</span>
                    <button
                      className="text-text-primary hover:text-interactive text-left font-semibold truncate max-w-[120px]"
                      onClick={() => setSelectedFormationId(corpsFormation.combatSummary!.most_casualties_brigade_id!)}
                    >
                      {loadedGameState.formations.find(f => f.id === corpsFormation.combatSummary!.most_casualties_brigade_id)?.name || corpsFormation.combatSummary.most_casualties_brigade_id}
                    </button>
                  </div>
                </div>
                <span className="text-[#d45555] font-mono text-xs">
                  HEAVIEST LOSSES
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sectors */}
        {corpsSectors.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <div className="text-text-secondary mb-1">Sectors ({corpsSectors.length}):</div>
            <div className="space-y-0.5 max-h-[150px] overflow-auto">
              {corpsSectors.map((s) => (
                <button
                  key={s.sector_id}
                  type="button"
                  onClick={() => useGameStore.setState({
                    selectedArmyId,
                    selectedCorpsId,
                    selectedCorpsFrontSectorId: s.sector_id,
                    selectedFormationId: null,
                    selectedOperationKey: null,
                    selectedOsid: null,
                  })}
                  className="w-full flex justify-between text-interactive hover:underline text-left"
                >
                  <span className="truncate mr-2">{s.display_name}</span>
                  <span className="text-text-secondary tabular-nums shrink-0">
                    Density: {s.density.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Operations Dashboard */}
        {corpsOps.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <div className="text-text-secondary mb-1 flex items-center justify-between">
              <span>Active Operations</span>
              <span className="tabular-nums text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-text-primary">{corpsOps.length}</span>
            </div>
            <div className="space-y-1">
              {corpsOps.map((op) => {
                const phaseBg = op.phase === 'execution' ? 'bg-[#d45555]/60 text-white' : op.phase === 'planning' ? 'bg-[#d4a055]/60 text-white' : 'bg-neutral-600/60 text-white';
                const opKey = getOperationId(op);
                const isSelected = useGameStore.getState().selectedOperationKey === opKey;
                // Clamp momentum from -1 to 1 for the progress bar (0 is center)
                const momentum = op.momentum ?? 0;

                return (
                  <button
                    key={opKey}
                    type="button"
                    onClick={() => useGameStore.setState({
                      selectedArmyId,
                      selectedCorpsId,
                      selectedCorpsFrontSectorId: null,
                      selectedFormationId: null,
                      selectedOperationKey: opKey,
                      selectedOsid: null,
                    })}
                    className={`w-full text-left rounded border p-2 transition-colors ${isSelected ? 'border-accent-gold bg-panel-active shadow-[inset_0_0_10px_rgba(212,160,85,0.1)]' : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-text-primary text-[12px] uppercase tracking-wide">{op.name}</div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${phaseBg}`}>
                        {op.phase}
                      </span>
                    </div>

                    {op.phase === 'execution' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-text-secondary">
                          <span>Momentum</span>
                          <span className={momentum >= 0 ? 'text-[#55d48a]' : 'text-[#d45555]'}>{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/50 rounded overflow-hidden relative">
                          {/* Center line */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-panel-border/50 z-10" />
                          {/* Fill */}
                          <div
                            className={`h-full transition-all duration-500 ${momentum >= 0 ? 'bg-[#55d48a]' : 'bg-[#d45555]'}`}
                            style={{
                              width: `${Math.abs(momentum) * 50}%`,
                              marginLeft: momentum >= 0 ? '50%' : `${50 - (Math.abs(momentum) * 50)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] mt-2 pt-1.5 border-t border-panel-border/30">
                      <span className="text-text-secondary">{op.participating_brigade_count} brigades assigned</span>
                      {op.objectives && op.current_objective_index !== undefined && (
                        <span className="text-accent-gold">
                          Obj: <span className="text-text-primary tabular-nums">{op.current_objective_index}/{op.objectives.length}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible OOB Tree */}
        {subordinates.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-text-secondary text-xs">Order of Battle</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-text-primary flex items-center gap-1">
                <span>{subordinates.length} Bdes</span>
              </span>
            </div>

            <div className="space-y-[1px] max-h-[250px] overflow-auto border-l border-panel-border/50 ml-1.5 pl-2 mt-2">
              {subordinates.map((f) => {
                // Determine readiness "traffic light"
                let lightColor = '#55d48a'; // Green
                if (f.readiness === 'overextended' || (f.cohesion < 30) || (f.fatigue > 70) || (f.equipment_decay != null && f.equipment_decay < 0.4)) {
                  lightColor = '#d45555'; // Red
                } else if (f.readiness === 'degraded' || (f.cohesion < 70) || (f.fatigue > 30) || (f.equipment_decay != null && f.equipment_decay < 0.7)) {
                  lightColor = '#d4d455'; // Yellow
                }

                return (
                  <button
                    key={f.id}
                    type="button"
                    className="w-full relative flex items-center justify-between py-1 px-1.5 hover:bg-panel-hover rounded group text-left transition-colors"
                    onClick={() => setSelectedFormationId(f.id)}
                    onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                    onMouseLeave={() => setHoveredOsids([])}
                  >
                    {/* Tree visual connector */}
                    <div className="absolute -left-2 top-1/2 w-2 h-[1px] bg-panel-border/50 group-hover:bg-panel-border transition-colors" />

                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-2 h-2 rounded-full shrink-0 border border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        style={{ backgroundColor: lightColor }}
                        title={`Readiness: ${f.readiness}`}
                      />
                      <span className="truncate text-text-primary text-[11px] font-medium group-hover:text-interactive transition-colors">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {f.posture && f.posture !== 'hold' && (
                        <span className="text-[9px] uppercase text-text-secondary bg-black/20 px-1 rounded flex items-center">
                          {f.posture.slice(0, 3)}
                        </span>
                      )}
                      <span className="text-text-secondary font-mono text-[10px]">
                        {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {ordersPanelOpen && (
        <div
          className="panel-slide-in-right flex flex-col bg-panel-bg/96 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
          style={SECONDARY_PANEL_STYLE}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
            <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
              Corps Orders
            </span>
            <button
              onClick={() => setOrdersPanelOpen(false)}
              className="text-text-secondary hover:text-interactive text-sm leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-3 overflow-auto">
            <div className="text-[11px] text-text-secondary">{corpsFormation.name}</div>
            <div className="pt-1 border-t border-panel-border">
              <div className="text-[11px] text-text-secondary mb-1">Stance</div>
              <div className="flex flex-wrap gap-1">
                {['defensive', 'balanced', 'offensive', 'reorganize'].map((stance) => (
                  <button
                    key={stance}
                    type="button"
                    onClick={() => void stageCorpsStance(stance)}
                    className="text-[11px] font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                  >
                    {stance}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1 border-t border-panel-border">
              <button
                type="button"
                onClick={handleOpenOpsPlanning}
                className="w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover"
              >
                Prepare operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
