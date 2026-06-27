/**
 * Corps detail panel. Shows when a corps is selected via header click.
 * Tabs: Overview · order of battle · Sectors · Ops · Orders
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOperationId, getOperationPhaseLabel } from '../utils/operations';
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
  getPlayerSafeSectorStanceLabel,
} from '../utils/playerSafeText';
import { aggregateEffectiveness } from '../utils/combatEffectiveness';
import { Icon } from './icons/Icon';
import { filterPlayerFacingOperations, isFieldedTacticalFormation } from '../../shared/playerVisibility';
import { chooseOpsPlanningSector } from './ops_modal/stagingChoice';
import {
  addEquipmentCondition,
  emptyEquipmentConditionSummary,
  formatReportedPersonnel,
  sumReportedPersonnel,
  type EquipmentConditionSummary,
} from '../utils/reportedMetrics';
import { inspectOnField } from '../utils/shellNavigation';
import { t, useLocale } from '../i18n';
import { buildSectorFormationAssignment, getSectorCoverageTier, resolveCurrentSectorForFormation, type SectorCoverageTier } from '../utils/sectorUtils';
import { compareLocalizedFormationNames } from '../data/formationNameLocalizations';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';

type CorpsTab = 'overview' | 'orbat' | 'sectors' | 'ops' | 'orders';

const SECTOR_COVERAGE_KEYS: Record<SectorCoverageTier, Parameters<typeof t>[0]> = {
  uncovered: 'oob.sectorCoverage.uncovered',
  thin: 'oob.sectorCoverage.thin',
  held: 'oob.sectorCoverage.held',
  dense: 'oob.sectorCoverage.dense',
};

function formatEquipmentSummary(summary: EquipmentConditionSummary): string {
  if (summary.unreportedCount > 0 && summary.reportedCount === 0) return t('corpsFront.unreported');
  const value = `${Math.round(summary.operational)}/${Math.round(summary.total)}`;
  return summary.unreportedCount > 0 ? t('corpsFront.partialEquipment', { value }) : value;
}

function formatCorpsDetailStance(stance: string | null | undefined): string {
  return getPlayerSafeSectorStanceLabel(stance, t('armyHqCorps.stance.unreported'));
}

interface CorpsDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function CorpsDetail({ railSlot }: CorpsDetailProps) {
  const [activeTab, setActiveTab] = useState<CorpsTab>('overview');
  const [locale] = useLocale();
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
      (f) => f.corps_id === selectedCorpsId && isFieldedTacticalFormation(f)
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
  const totalPersonnelSummary = sumReportedPersonnel(subordinates);
  const totalPersonnelLabel = formatReportedPersonnel(totalPersonnelSummary, {
    partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
    unreported: t('corpsFront.unreported'),
  });
  const corpsDisplayName = corpsFormation.name === corpsFormation.id
    ? getPlayerSafeCorpsName(null, corpsFormation.id)
    : corpsFormation.name;

  const tabs = [
    { id: 'overview' as const, label: t('settlement.tab.overview') },
    { id: 'orbat'    as const, label: t('orbat.title'), count: subordinates.length },
    { id: 'sectors'  as const, label: t('sectorsSection.title'), count: corpsSectors.length },
    { id: 'ops'      as const, label: t('corpsDetail.opsSnapshot'), count: corpsOps.length },
    { id: 'orders'   as const, label: t('corpsDetail.orders') },
  ];
  const primaryOpsPlanningSector = chooseOpsPlanningSector(corpsSectors);
  const primaryOpsPlanningSectorLabel = primaryOpsPlanningSector
    ? getPlayerFacingSectorName(primaryOpsPlanningSector.sector_id, corpsSectors)
    : null;
  const opsPlanningLabel = primaryOpsPlanningSectorLabel
    ? t('corpsDetail.prepareOperationInHqForSector', { sector: primaryOpsPlanningSectorLabel })
    : t('corpsDetail.prepareOperationInHq');

  const handleOpenOpsPlanning = () => {
    if (primaryOpsPlanningSector) {
      setOpsPlanningContext(selectedCorpsId, primaryOpsPlanningSector.sector_id);
    } else {
      setLoadError(t('corpsDetail.opsPlanningRequiresSector'));
    }
  };

  const inspectFormationInCorps = (formationId: string) => {
    const formation = loadedGameState.formations.find((item) => item.id === formationId);
    inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-in-corps',
      formationId,
      corpsId: selectedCorpsId,
      osid: formation?.location_osid ?? null,
    });
  };

  const inspectSectorInCorps = (sectorId: string) => {
    const sector = corpsSectors.find((item) => item.sector_id === sectorId);
    const anchorOsid = sector?.sub_segments
      ?.flatMap((segment) => segment.friendly_osids ?? [])
      .find((osid): osid is string => typeof osid === 'string' && osid.length > 0) ?? null;
    inspectOnField(useGameStore.getState(), {
      kind: 'field-sector-in-corps',
      sectorId,
      corpsId: selectedCorpsId,
      osid: anchorOsid,
    });
  };

  const inspectOperationInField = (operationKey: string) => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-operation',
      operationKey,
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
          aria-label={t('corpsDetail.closePanel')}
          title={t('corpsDetail.closePanel')}
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
              <span>{formatCorpsDetailStance(corpsFormation.corpsStance)}</span>
              {corpsFormation.corpsExhaustion == null && (
                <span>
                  {' - '}
                  {t('corpsDetail.exhaustion')} {' '}
                  <span className="italic text-text-secondary/80">{t('corpsFront.unreported')}</span>
                </span>
              )}
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
                <span className="text-text-primary tabular-nums">{totalPersonnelLabel}</span>
              </div>
              {(() => {
                const agg = aggregateEffectiveness(subordinates);
                if (agg.brigadeCount === 0) return null;
                const gradeColor = agg.grade === 'A' ? '#56d364' : agg.grade === 'B' ? '#e8c56d' : agg.grade === 'C' ? '#e8a838' : agg.grade === 'UNREPORTED' ? '#9ca3af' : '#f47068';
                return (
                  <div className="flex justify-between">
                    <span className="text-text-secondary flex items-center gap-1"><Icon name="star" size={12} /> {t('corpsDetail.combatEff')}</span>
                    <span className="tabular-nums">
                      <span className="text-text-primary">
                        {agg.grade === 'UNREPORTED' ? t('corpsFront.unreported') : agg.totalEffectiveness.toLocaleString()}
                      </span>
                      <span className="text-[10px] ml-1 font-bold" style={{ color: gradeColor }}>
                        {agg.grade}
                      </span>
                      {agg.grade !== 'UNREPORTED' && agg.ineffectiveCount > 0 && (
                        <span className="text-[9px] text-red-400 ml-1">{t('corpsDetail.weakCount', { count: agg.ineffectiveCount })}</span>
                      )}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('corpsCard.fieldedBrigadesLabel')}</span>
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
              const tanks = emptyEquipmentConditionSummary();
              const arty = emptyEquipmentConditionSummary();
              let aa = 0;
              for (const b of subordinates) {
                const c = b.composition;
                if (!c) continue;
                addEquipmentCondition(tanks, c.tanks, c.tank_condition?.operational);
                addEquipmentCondition(arty, c.artillery, c.artillery_condition?.operational);
                aa += c.aa_systems ?? 0;
              }
              if (tanks.total === 0 && arty.total === 0 && aa === 0) return null;
              const equipHealthColor = (summary: EquipmentConditionSummary) => {
                const { operational, total, unreportedCount } = summary;
                if (total === 0) return 'text-text-primary';
                if (unreportedCount > 0) return 'text-amber-300';
                const pct = operational / total;
                return pct > 0.8 ? 'text-emerald-400' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400';
              };
              return (
                <div className="border-t border-panel-border pt-3 space-y-1.5">
                  <div className="text-text-secondary text-[10px] uppercase tracking-wider mb-1">{t('corpsDetail.equipment')}</div>
                  {tanks.total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1"><Icon name="tanks" size={12} /> {t('corpsCard.tanks')}</span>
                      <span className="tabular-nums">
                        <span className={equipHealthColor(tanks)}>{formatEquipmentSummary(tanks)}</span>
                      </span>
                    </div>
                  )}
                  {arty.total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary flex items-center gap-1"><Icon name="artillery" size={12} /> {t('formationDetail.artillery')}</span>
                      <span className="tabular-nums">
                        <span className={equipHealthColor(arty)}>{formatEquipmentSummary(arty)}</span>
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
                .sort((a, b) => compareLocalizedFormationNames(a, b, locale))
                .map((f) => (
                  <BrigadeRow
                    key={f.id}
                    formation={f}
                    onClick={() => inspectFormationInCorps(f.id)}
                    onHoverChange={(hovered, e) => {
                      setHoveredOsids(hovered && f.location_osid ? [f.location_osid] : []);
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
                const sectorBrigadeIds = new Set(sectorAssignment.lineHoldingIds);
                const sectorBrigades = subordinates.filter((b) => sectorBrigadeIds.has(b.id));
                const sectorEff = aggregateEffectiveness(sectorBrigades);
                const sectorPers = formatReportedPersonnel(sumReportedPersonnel(sectorBrigades), {
                  partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
                  unreported: t('corpsFront.unreported'),
                });
                const coverageTier = getSectorCoverageTier(s.density, sectorAssignment, s.length_edges);
                const sectorLabel = getPlayerFacingSectorName(s.sector_id, [s]);
                return (
                <button
                  key={s.sector_id}
                  type="button"
                  data-testid="corps-detail-sector-row"
                  data-sector-id={s.sector_id}
                  data-coverage-tier={coverageTier}
                  data-current-brigade-count={sectorAssignment.allCurrentIds.length}
                  data-frontline-brigade-count={sectorAssignment.frontlineIds.length}
                  data-reserve-brigade-count={sectorAssignment.reserveIds.length}
                  data-rear-brigade-count={sectorAssignment.rearIds.length}
                  data-command-directed-brigade-count={sectorAssignment.overrideIds.length}
                  onClick={() => inspectSectorInCorps(s.sector_id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-panel-border bg-panel-card hover:bg-panel-hover transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary text-[11px] font-medium truncate">{sectorLabel}</div>
                    <div className="text-text-secondary text-[10px] tabular-nums">
                      {t('oob.sectorLineCount', { count: sectorAssignment.frontlineIds.length.toString() })}
                      {sectorAssignment.reserveIds.length > 0 && ` + ${t('oob.sectorHeldBackCount', { count: sectorAssignment.reserveIds.length.toString() })}`}
                      {sectorAssignment.rearIds.length > 0 && ` + ${t('oob.sectorRearSupportCount', { count: sectorAssignment.rearIds.length.toString() })}`}
                      {sectorAssignment.overrideIds.length > 0 && ` + ${t('oob.sectorDirectedCount', { count: sectorAssignment.overrideIds.length.toString() })}`}
                      {' · '}{t('oob.sectorFrontSegments', { count: s.length_edges.toString() })}
                      {' · '}{t('corpsDetail.personnelCount', { count: sectorPers })}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <div className="text-[10px] tabular-nums">
                      <span className="text-text-secondary">{t('corpsDetail.effShort')} </span>
                      <span className="text-text-primary">
                        {sectorEff.grade === 'UNREPORTED' ? t('corpsFront.unreported') : sectorEff.totalEffectiveness.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary tabular-nums">
                      {t('oob.sectorCoverage.label')}: {t(SECTOR_COVERAGE_KEYS[coverageTier])}
                    </div>
                    <div className="text-[9px] uppercase text-text-secondary opacity-70">
                      {formatCorpsDetailStance(s.sector_stance)}
                      {s.stance_source === 'player' && <span className="ml-1 text-accent-gold">●</span>}
                    </div>
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
                const phaseBg = op.phase_unreported
                  ? 'bg-neutral-600/60 text-white'
                  : op.phase === 'execution'
                  ? 'bg-[#d45555]/60 text-white'
                  : op.phase === 'planning'
                  ? 'bg-[#d4a055]/60 text-white'
                  : 'bg-neutral-600/60 text-white';
                const phaseLabel = getOperationPhaseLabel(op);
                const opKey = getOperationId(op);
                const isSelected = selectedOperationKey === opKey;
                const momentum = typeof op.momentum === 'number' && Number.isFinite(op.momentum) ? op.momentum : null;

                return (
                  <button
                    key={opKey}
                    type="button"
                    data-testid="corps-detail-operation-row"
                    data-operation-key={opKey}
                    onClick={() => inspectOperationInField(opKey)}
                    className={`w-full text-left rounded border p-2 transition-colors ${
                      isSelected
                        ? 'border-accent-gold bg-panel-active shadow-[inset_0_0_10px_rgba(212,160,85,0.1)]'
                        : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-text-primary text-[12px] uppercase tracking-wide">{op.display_name}</div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${phaseBg}`}>
                        {phaseLabel}
                      </span>
                    </div>

                    {op.phase === 'execution' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-text-secondary">
                          <span>{t('operationsPanel.momentum')}</span>
                          {momentum == null ? (
                            <span className="italic text-text-secondary/80">{t('operationsSection.metricUnreported')}</span>
                          ) : (
                            <span className={momentum >= 0 ? 'text-[#55d48a]' : 'text-[#d45555]'}>
                              {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {momentum != null && (
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
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] mt-2 pt-1.5 border-t border-panel-border/30">
                      <span className="text-text-secondary">{t('corpsDetail.brigadeCount', { count: op.participating_brigade_count })}</span>
                      {Array.isArray(op.objectives) && op.objectives.length > 0 && op.current_objective_index !== undefined && (
                        <span className="text-accent-gold">
                          {t('operationsPanel.objShort')} <span className="text-text-primary tabular-nums">{Math.min(op.objectives.length, Math.max(1, op.current_objective_index + 1))}/{op.objectives.length}</span>
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
                aria-label={opsPlanningLabel}
                title={opsPlanningLabel}
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
                aria-label={opsPlanningLabel}
                title={opsPlanningLabel}
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
