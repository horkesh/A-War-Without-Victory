/**
 * Corps detail panel. Shows when a corps is selected via header click.
 * Tabs: Overview · ORBAT · Sectors · Ops · Orders
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOperationId } from '../utils/operations';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { getPanelRailStyle } from './panelRail';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { getFormationCommander, resolveCorpsCommanderDisplay } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { CommanderDisplayPanel } from './CommanderDisplayPanel';
import { BrigadeRow } from './BrigadeRow';
import { TabBar } from './TabBar';
import {
  getPlayerSafeCorpsName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeOperationPhaseLabel,
} from '../utils/playerSafeText';
import { aggregateEffectiveness } from '../utils/combatEffectiveness';
import { Icon } from './icons/Icon';
import { filterPlayerFacingOperations } from '../../shared/playerVisibility';
import { chooseOpsPlanningSector } from './ops_modal/stagingChoice';
import { formatPosture } from '../utils/formatters';
import { inspectOnField } from '../utils/shellNavigation';
import { t } from '../i18n';
import { buildSectorFormationAssignment, resolveCurrentSectorForFormation } from '../utils/sectorUtils';

type CorpsTab = 'overview' | 'orbat' | 'sectors' | 'ops' | 'orders';

interface CorpsDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function CorpsDetail({ railSlot }: CorpsDetailProps) {
  const [activeTab, setActiveTab] = useState<CorpsTab>('overview');
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setOpsPlanningContext = useGameStore((s) => s.setOpsPlanningContext);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setHoveredCorpsId = useGameStore((s) => s.setHoveredCorpsId);
  const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
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
    () => filterPlayerFacingOperations(loadedGameState).filter((op) => op.corps_id === selectedCorpsId),
    [loadedGameState, selectedCorpsId]
  );

  const sectorIdByBrigadeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const brigade of subordinates) {
      const sector = resolveCurrentSectorForFormation(brigade, corpsSectors);
      if (sector) map.set(brigade.id, sector.sector_id);
    }
    return map;
  }, [corpsSectors, subordinates]);

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedCorpsId]);

  useEffect(() => {
    if (!selectedCorpsId) return;
    setHoveredCorpsId(selectedCorpsId);
    return () => {
      if (useGameStore.getState().hoveredCorpsId === selectedCorpsId) {
        setHoveredCorpsId(null);
      }
    };
  }, [selectedCorpsId, setHoveredCorpsId]);

  if (operationsPanelOpen || !selectedCorpsId) return null;

  if (!loadedGameState || !corpsFormation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={getPanelRailStyle(railSlot, '24rem', 'left')}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-3 space-y-3">
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
    ? getPlayerSafeCorpsName(null, corpsFormation.id)
    : corpsFormation.name;

  const tabs = [
    { id: 'overview' as const, label: t('settlement.tab.overview') },
    { id: 'orbat'    as const, label: 'ORBAT',   count: subordinates.length },
    { id: 'sectors'  as const, label: t('sectorsSection.title'), count: corpsSectors.length },
    { id: 'ops'      as const, label: t('corpsDetail.opsSnapshot'), count: corpsOps.length },
    { id: 'orders'   as const, label: t('corpsDetail.orders') },
  ];

  const handleOpenOpsPlanning = () => {
    const primarySector = chooseOpsPlanningSector(corpsSectors);
    if (primarySector) {
      setOpsPlanningContext(selectedCorpsId, primarySector.sector_id);
    } else {
      setLoadError(t('corpsDetail.opsPlanningRequiresSector'));
    }
  };

  const inspectFormationInCorps = (formationId: string) => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-in-corps',
      formationId,
      corpsId: selectedCorpsId,
    });
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
      style={getPanelRailStyle(railSlot, '24rem', 'left')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-panel-card border-b border-panel-border shrink-0">
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
          <div className="p-3 space-y-3">
            <div className="text-text-secondary text-[11px]">
              <span className={FACTION_COLORS[corpsFormation.faction] ?? 'text-text-primary'}>
                {getPlayerSafeMilitaryFactionName(corpsFormation.faction)}
              </span>
              {' · '}
              <span>{corpsFormation.corpsStance ? formatPosture(corpsFormation.corpsStance) : 'Unknown'}</span>
              {corpsFormation.corpsExhaustion != null && (
                <span>
                  {' · Exhaustion: '}
                  <span className={
                    corpsFormation.corpsExhaustion <= 20 ? 'text-emerald-400'
                    : corpsFormation.corpsExhaustion <= 50 ? 'text-amber-400'
                    : 'text-red-400'
                  }>
                    {Math.round(corpsFormation.corpsExhaustion)}
                  </span>
                </span>
              )}
            </div>

            {(() => {
              const commander = getFormationCommander(corpsFormation, loadedGameState);
              if (commander) return <OfficerProfile officer={commander} label={t('corpsDetail.corpsCommander')} />;
              const commanderDisplay = resolveCorpsCommanderDisplay(corpsFormation.id, corpsFormation.faction, loadedGameState);
              if (!commanderDisplay) return null;
              return <CommanderDisplayPanel display={commanderDisplay} label={t('corpsDetail.corpsCommander')} />;
            })()}

            <div className="border-t border-panel-border pt-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-secondary flex items-center gap-1"><Icon name="personnel" size={12} /> {t('corpsCard.personnel')}</span>
                <span className="text-text-primary tabular-nums">{totalPersonnel.toLocaleString()}</span>
              </div>
              {(() => {
                const agg = aggregateEffectiveness(subordinates);
                if (agg.brigadeCount === 0) return null;
                const gradeColor = agg.grade === 'A' ? '#56d364' : agg.grade === 'B' ? '#e8c56d' : agg.grade === 'C' ? '#e8a838' : '#f47068';
                return (
                  <div className="flex justify-between">
                    <span className="text-text-secondary flex items-center gap-1"><Icon name="star" size={12} /> {t('corpsDetail.combatEff')}</span>
                    <span className="tabular-nums">
                      <span className="text-text-primary">{agg.totalEffectiveness.toLocaleString()}</span>
                      <span className="text-[10px] ml-1 font-bold" style={{ color: gradeColor }}>
                        {agg.grade}
                      </span>
                      {agg.ineffectiveCount > 0 && (
                        <span className="text-[9px] text-red-400 ml-1">{t('corpsDetail.weakCount', { count: agg.ineffectiveCount })}</span>
                      )}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('corpsCard.brigades')}</span>
                <span className="text-text-primary tabular-nums">{subordinates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('sectorsSection.title')}</span>
                <span className="text-text-primary tabular-nums">{corpsSectors.length}</span>
              </div>
              {corpsFormation.corpsOgSlots != null && (
                <div className="flex justify-between">
                  <span className="text-text-secondary" title={t('corpsDetail.opSlotsTitle')}>{t('corpsDetail.opSlots')}</span>
                  <span className="text-text-primary tabular-nums">
                    {corpsFormation.corpsActiveOgIds?.length ?? 0}/{corpsFormation.corpsOgSlots}
                  </span>
                </div>
              )}
            </div>

            {/* Equipment aggregate */}
            {(() => {
              let tanks = 0, tanksOp = 0, arty = 0, artyOp = 0, aa = 0;
              for (const b of subordinates) {
                const c = b.composition;
                if (!c) continue;
                tanks += c.tanks ?? 0;
                tanksOp += Math.round((c.tanks ?? 0) * (c.tank_condition?.operational ?? 1));
                arty += c.artillery ?? 0;
                artyOp += Math.round((c.artillery ?? 0) * (c.artillery_condition?.operational ?? 1));
                aa += c.aa_systems ?? 0;
              }
              if (tanks === 0 && arty === 0 && aa === 0) return null;
              const equipHealthColor = (op: number, total: number) => {
                if (total === 0) return 'text-text-primary';
                const pct = op / total;
                return pct > 0.8 ? 'text-emerald-400' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400';
              };
              return (
                <div className="border-t border-panel-border pt-3 space-y-1.5">
                  <div className="text-text-secondary text-[10px] uppercase tracking-wider mb-1">{t('corpsDetail.equipment')}</div>
                  {tanks > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1"><Icon name="tanks" size={12} /> {t('corpsCard.tanks')}</span>
                      <span className="tabular-nums">
                        <span className={equipHealthColor(tanksOp, tanks)}>{tanksOp}</span><span className="text-text-secondary">/{tanks}</span>
                      </span>
                    </div>
                  )}
                  {arty > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1"><Icon name="artillery" size={12} /> {t('formationDetail.artillery')}</span>
                      <span className="tabular-nums">
                        <span className={equipHealthColor(artyOp, arty)}>{artyOp}</span><span className="text-text-secondary">/{arty}</span>
                      </span>
                    </div>
                  )}
                  {aa > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{t('formationDetail.aaSys')}</span>
                      <span className="text-text-primary tabular-nums">{aa}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {corpsFormation.combatSummary && (
              <div className="border-t border-panel-border pt-3">
                <CombatSummaryPanel
                  summary={corpsFormation.combatSummary}
                  formations={loadedGameState.formations}
                  onSelectFormation={inspectFormationInCorps}
                />
              </div>
            )}
          </div>
        )}

        {/* ── ORBAT ── */}
        {activeTab === 'orbat' && (
          <div className="py-1">
            {subordinates.length === 0 ? (
              <div className="p-3 text-text-secondary italic text-xs">{t('corpsDetail.noSubordinateBrigades')}</div>
            ) : (
              [...subordinates]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                .map((f) => (
                  <BrigadeRow
                    key={f.id}
                    formation={f}
                    onClick={() => inspectFormationInCorps(f.id)}
                    onHoverChange={(hovered, e) => {
                      setHoveredOsids(hovered ? (f.aorSettlementIds ?? (f.location_osid ? [f.location_osid] : [])) : []);
                      setHoveredSectorId(hovered ? (sectorIdByBrigadeId.get(f.id) ?? null) : null);
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
          <div className="p-3 space-y-1">
            {corpsSectors.length === 0 ? (
              <div className="text-text-secondary italic text-xs">{t('corpsDetail.noSectorsAssigned')}</div>
            ) : (
              corpsSectors.map((s) => {
                const sectorAssignment = buildSectorFormationAssignment(s, subordinates, corpsSectors);
                const sectorBrigadeIds = new Set(sectorAssignment.allCurrentIds);
                const sectorBrigades = subordinates.filter((b) => sectorBrigadeIds.has(b.id));
                const sectorEff = aggregateEffectiveness(sectorBrigades);
                const sectorPers = sectorBrigades.reduce((sum, b) => sum + (b.personnel ?? 0), 0);
                return (
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
                      {t('oob.sectorLineCount', { count: sectorAssignment.frontlineIds.length.toString() })}
                      {sectorAssignment.reserveIds.length > 0 && ` + ${t('oob.sectorHeldBackCount', { count: sectorAssignment.reserveIds.length.toString() })}`}
                      {sectorAssignment.overrideIds.length > 0 && ` + ${t('oob.sectorDirectedCount', { count: sectorAssignment.overrideIds.length.toString() })}`}
                      {' · '}{t('oob.sectorFrontSegments', { count: s.length_edges.toString() })}
                      {' · '}{t('corpsDetail.personnelCount', { count: sectorPers.toLocaleString() })}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <div className="text-[10px] tabular-nums">
                      <span className="text-text-secondary">{t('corpsDetail.effShort')} </span>
                      <span className="text-text-primary">{sectorEff.totalEffectiveness.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary tabular-nums">
                      {t('oob.sectorCoverage.label')}: {s.density <= 0 ? t('oob.sectorCoverage.uncovered') : s.density < 0.12 ? t('oob.sectorCoverage.thin') : s.density < 0.28 ? t('oob.sectorCoverage.held') : t('oob.sectorCoverage.dense')}
                    </div>
                    {s.sector_stance && (
                      <div className="text-[9px] uppercase text-text-secondary opacity-70">
                        {formatPosture(s.sector_stance)}
                        {s.stance_source === 'player' && <span className="ml-1 text-accent-gold">●</span>}
                      </div>
                    )}
                  </div>
                </button>
                );
              })
            )}
          </div>
        )}

        {/* ── OPS ── */}
        {activeTab === 'ops' && (
          <div className="p-3 space-y-2.5">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
              {t('corpsDetail.fieldSnapshot')}
            </div>
            <div className="text-[10px] text-text-secondary -mt-1">
              {t('corpsDetail.fieldSnapshotHelp')}
            </div>
            {corpsOps.length === 0 ? (
              <div className="text-text-secondary italic text-xs">{t('corpsDetail.noPlayerFacingOps')}</div>
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
                      <div className="font-semibold text-text-primary text-[12px] uppercase tracking-wide">{op.display_name}</div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${phaseBg}`}>
                        {getPlayerSafeOperationPhaseLabel(op.phase)}
                      </span>
                    </div>

                    {op.phase === 'execution' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-text-secondary">
                          <span>{t('operationsPanel.momentum')}</span>
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
                      <span className="text-text-secondary">{t('corpsDetail.brigadeCount', { count: op.participating_brigade_count })}</span>
                      {op.objectives && op.current_objective_index !== undefined && (
                        <span className="text-accent-gold">
                          {t('operationsPanel.objShort')} <span className="text-text-primary tabular-nums">{op.current_objective_index}/{op.objectives.length}</span>
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
                {t('corpsDetail.prepareOperationInHq')}
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <div className="p-3 space-y-3">
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                {t('operationHistory.title')}
              </div>
              <button
                type="button"
                onClick={handleOpenOpsPlanning}
                className="w-full text-xs font-sans px-2 py-2.5 rounded border border-panel-border text-interactive hover:bg-panel-hover transition-colors"
              >
                {t('corpsDetail.prepareOperationInHq')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
