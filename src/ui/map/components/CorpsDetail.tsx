/**
 * Corps detail panel. Shows when a corps is selected via header click.
 * Tabs: Overview · ORBAT · Sectors · Ops · Orders
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOperationId } from '../utils/operations';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { useIPC } from '../desktop/useIPC';
import { getPanelRailStyle } from './panelRail';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { BrigadeRow } from './BrigadeRow';
import { TabBar } from './TabBar';
import { toTitleCase } from '../utils/formatters';

type CorpsTab = 'overview' | 'orbat' | 'sectors' | 'ops' | 'orders';

interface CorpsDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function CorpsDetail({ railSlot }: CorpsDetailProps) {
  const ipc = useIPC();
  const [activeTab, setActiveTab] = useState<CorpsTab>('overview');
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
  const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);

  const corpsFormation = loadedGameState?.formations.find(
    (f) => f.id === selectedCorpsId && (f.kind === 'corps' || f.kind === 'corps_asset')
  ) ?? null;

  const corpsSectors = useMemo(
    () => loadedGameState?.corpsFrontSectors?.filter((s) => s.corps_id === selectedCorpsId) ?? [],
    [loadedGameState?.corpsFrontSectors, selectedCorpsId]
  );

  const subordinates = useMemo(
    () => loadedGameState?.formations.filter(
      (f) => f.corps_id === selectedCorpsId && f.kind === 'brigade'
    ) ?? [],
    [loadedGameState?.formations, selectedCorpsId]
  );

  const corpsOps = useMemo(
    () => loadedGameState?.operations?.filter((op) => op.corps_id === selectedCorpsId) ?? [],
    [loadedGameState?.operations, selectedCorpsId]
  );

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedCorpsId]);

  if (operationsPanelOpen || !selectedCorpsId) return null;

  if (!loadedGameState || !corpsFormation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={getPanelRailStyle(railSlot, '24rem', 'left')}
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
  const totalPersonnel = subordinates.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const corpsDisplayName = corpsFormation.name === corpsFormation.id
    ? toTitleCase(corpsFormation.name.replace(/^(RS|RBiH|HRHB)_/i, ''))
    : corpsFormation.name;

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'orbat'    as const, label: 'ORBAT',   count: subordinates.length },
    { id: 'sectors'  as const, label: 'Sectors', count: corpsSectors.length },
    { id: 'ops'      as const, label: 'Ops',     count: corpsOps.length },
    { id: 'orders'   as const, label: 'Orders' },
  ];

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
    if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance order.');
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
      style={getPanelRailStyle(railSlot, '24rem', 'left')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: corpsColor }} />
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold truncate">
            {corpsDisplayName}
          </span>
        </div>
        <button
          onClick={() => useGameStore.setState({
            selectedCorpsId: null,
            selectedCorpsFrontSectorId: null,
            selectedFormationId: null,
            selectedOperationKey: null,
          })}
          className="text-text-secondary hover:text-interactive text-sm leading-none shrink-0 ml-2"
        >
          ✕
        </button>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0 text-[12px]">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            <div className="text-text-secondary text-[11px]">
              <span className={FACTION_COLORS[corpsFormation.faction] ?? 'text-text-primary'}>
                {corpsFormation.faction}
              </span>
              {' · '}
              <span className="capitalize">{corpsFormation.corpsStance ?? 'unknown'}</span>
              {corpsFormation.corpsExhaustion != null && (
                <span> · Exh: {corpsFormation.corpsExhaustion.toFixed(1)}</span>
              )}
            </div>

            {(() => {
              const commander = getFormationCommander(corpsFormation, loadedGameState);
              if (!commander) return null;
              return <OfficerProfile officer={commander} label="Corps Commander" />;
            })()}

            <div className="border-t border-panel-border pt-3 space-y-1.5">
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

            {corpsFormation.combatSummary && (
              <div className="border-t border-panel-border pt-3">
                <CombatSummaryPanel
                  summary={corpsFormation.combatSummary}
                  formations={loadedGameState.formations}
                  onSelectFormation={setSelectedFormationId}
                />
              </div>
            )}
          </div>
        )}

        {/* ── ORBAT ── */}
        {activeTab === 'orbat' && (
          <div className="py-1">
            {subordinates.length === 0 ? (
              <div className="p-4 text-text-secondary italic text-xs">No subordinate brigades.</div>
            ) : (
              [...subordinates]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                .map((f) => (
                  <BrigadeRow
                    key={f.id}
                    formation={f}
                    onClick={() => setSelectedFormationId(f.id)}
                    onHoverChange={(hovered, e) => {
                      setHoveredOsids(hovered ? (f.aorSettlementIds ?? (f.location_osid ? [f.location_osid] : [])) : []);
                      if (hovered) {
                        setTooltipTargetWithPosition(
                          { type: 'formation', id: f.id },
                          e ? { x: e.clientX, y: e.clientY } : undefined
                        );
                      } else {
                        clearTooltipTarget();
                      }
                    }}
                  />
                ))
            )}
          </div>
        )}

        {/* ── SECTORS ── */}
        {activeTab === 'sectors' && (
          <div className="p-4 space-y-1">
            {corpsSectors.length === 0 ? (
              <div className="text-text-secondary italic text-xs">No sectors assigned.</div>
            ) : (
              corpsSectors.map((s) => (
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
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-panel-border bg-panel-card hover:bg-panel-hover transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary text-[11px] font-medium truncate">{s.display_name}</div>
                    <div className="text-text-secondary text-[10px] tabular-nums">
                      {s.assigned_brigade_ids.length} front
                      {s.reserve_brigade_ids.length > 0 && ` + ${s.reserve_brigade_ids.length} reserve`}
                      {' · ~'}{s.length_edges} km
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <div className="text-[10px] text-text-secondary tabular-nums">
                      Density: {s.density.toFixed(2)}
                    </div>
                    {s.sector_stance && (
                      <div className="text-[9px] uppercase text-text-secondary opacity-70">
                        {s.sector_stance.replace(/_/g, ' ')}
                        {s.stance_source === 'player' && <span className="ml-1 text-accent-gold">●</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── OPS ── */}
        {activeTab === 'ops' && (
          <div className="p-4 space-y-3">
            {corpsOps.length === 0 ? (
              <div className="text-text-secondary italic text-xs">No active operations.</div>
            ) : (
              corpsOps.map((op) => {
                const phaseBg = op.phase === 'execution'
                  ? 'bg-[#d45555]/60 text-white'
                  : op.phase === 'planning'
                  ? 'bg-[#d4a055]/60 text-white'
                  : 'bg-neutral-600/60 text-white';
                const opKey = getOperationId(op);
                const isSelected = selectedOperationKey === opKey;
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
                    className={`w-full text-left rounded border p-2 transition-colors ${
                      isSelected
                        ? 'border-accent-gold bg-panel-active shadow-[inset_0_0_10px_rgba(212,160,85,0.1)]'
                        : 'border-panel-border bg-panel-card hover:bg-panel-hover'
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
                          <span className={momentum >= 0 ? 'text-[#55d48a]' : 'text-[#d45555]'}>
                            {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-black/50 rounded overflow-hidden relative">
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-panel-border/50 z-10" />
                          <div
                            className={`h-full transition-all duration-500 ${momentum >= 0 ? 'bg-[#55d48a]' : 'bg-[#d45555]'}`}
                            style={{
                              width: `${Math.abs(momentum) * 50}%`,
                              marginLeft: momentum >= 0 ? '50%' : `${50 - Math.abs(momentum) * 50}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] mt-2 pt-1.5 border-t border-panel-border/30">
                      <span className="text-text-secondary">{op.participating_brigade_count} brigades</span>
                      {op.objectives && op.current_objective_index !== undefined && (
                        <span className="text-accent-gold">
                          Obj: <span className="text-text-primary tabular-nums">{op.current_objective_index}/{op.objectives.length}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}

            <div className="pt-1 border-t border-panel-border">
              <button
                type="button"
                onClick={handleOpenOpsPlanning}
                className="w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover transition-colors"
              >
                Prepare Operation
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                Corps Stance
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['defensive', 'balanced', 'offensive', 'reorganize'] as const).map((stance) => {
                  const isActive = (corpsFormation.corpsStance ?? 'balanced') === stance;
                  return (
                    <button
                      key={stance}
                      type="button"
                      onClick={() => void stageCorpsStance(stance)}
                      className={`px-2 py-2 rounded border text-[11px] font-semibold capitalize transition-colors ${
                        isActive
                          ? 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                          : 'border-panel-border text-interactive hover:bg-panel-hover'
                      }`}
                    >
                      {stance}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-panel-border pt-4">
              <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                Operations
              </div>
              <button
                type="button"
                onClick={handleOpenOpsPlanning}
                className="w-full text-xs font-sans px-2 py-2.5 rounded border border-panel-border text-interactive hover:bg-panel-hover transition-colors"
              >
                Prepare Operation
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
