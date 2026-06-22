import { useEffect, useMemo, useState } from 'react';
import type { OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { buildSectorFormationAssignment, collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { getOperationId, getOperationPhaseBadgeClass } from '../utils/operations';
import { getPanelRailStyle } from './panelRail';
import { getPlayerSafeMilitaryFactionName, getPlayerSafeOperationPhaseLabel } from '../utils/playerSafeText';
import { getPlayerSafeOperationBalancePresentation } from '../../../shared/playerSafeOperationBalance';
import { getPlayerSafeThreatPresentation } from '../utils/playerSafeThreat';
import { useIPC } from '../desktop/useIPC';
import { filterPlayerFacingOperations, findPlayerFacingSectorById } from '../../shared/playerVisibility';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { formatPosture, toTitleCase, turnToDateString } from '../utils/formatters';
import { getOsidDisplayName } from '../utils/osidDisplayName';

/** Strength class badge with color coding. */
function StrengthBadge({ strengthClass }: { strengthClass?: 'fortress' | 'strong' | 'adequate' | 'thin' | 'critical' }) {
  switch (strengthClass) {
    case 'fortress': return <span className="text-green-700 font-bold bg-green-100 px-1 rounded">{t('corpsFront.strength.fortress')}</span>;
    case 'strong': return <span className="text-green-600 font-semibold">{t('corpsFront.strength.strong')}</span>;
    case 'adequate': return <span className="text-amber-600 font-semibold">{t('corpsFront.strength.adequate')}</span>;
    case 'thin': return <span className="text-orange-600 font-semibold">{t('corpsFront.strength.thin')}</span>;
    case 'critical': return <span className="text-red-600 font-bold bg-red-100 px-1 rounded">{t('corpsFront.strength.critical')}</span>;
    default: return <span className="text-neutral-400">—</span>;
  }
}

/** Threat ratio badge with descriptive balance labels. */
function ThreatBadge({ ratio }: { ratio: number }) {
  const { label, summary, toneClass } = getPlayerSafeThreatPresentation(ratio);

  return (
    <div className="flex flex-col">
      <span className={`${toneClass} text-[10px] tracking-tighter leading-none mb-0.5`}>{label}</span>
      <span className={`${toneClass} font-mono text-[10px] uppercase tracking-tight`}>{summary}</span>
    </div>
  );
}

/** Helper to render fuzzy intelligence ranges for low-confidence data. */
function FuzzyIntel({
  value,
  confidence,
  format = 'number',
  redactThreshold = 0.2,
  fuzzyThreshold = 0.5
}: {
  value?: number | string;
  confidence: number;
  format?: 'number' | 'percent' | 'string';
  redactThreshold?: number;
  fuzzyThreshold?: number;
}) {
  if (confidence < redactThreshold) {
    return <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">{t('corpsFront.redacted')}</span>;
  }

  if (value == null) return <span className="text-neutral-400">—</span>;

  if (confidence < fuzzyThreshold && typeof value === 'number') {
    const variance = (1 - confidence) * 0.4; // up to 40% variance at low confidence
    const min = Math.round(value * (1 - variance));
    const max = Math.round(value * (1 + variance));
    if (format === 'percent') return <span className="italic text-neutral-500">~{min}-{max}%?</span>;
    return <span className="italic text-neutral-500">{min.toLocaleString()}-{max.toLocaleString()}?</span>;
  }

  if (typeof value === 'number') {
    if (format === 'percent') return <span className="tabular-nums">{Math.round(value)}%</span>;
    return <span className="tabular-nums">{Math.round(value).toLocaleString()}</span>;
  }

  return <span className="truncate">{value}</span>;
}



const SECTOR_STANCES = ['fortify', 'defend', 'elastic', 'active_defense', 'screening'] as const;
type SectorStanceType = typeof SECTOR_STANCES[number];
const STANCE_LABEL_KEYS: Record<SectorStanceType, MessageKey> = {
  fortify: 'corpsFront.stance.fortify', defend: 'corpsFront.stance.defend', elastic: 'corpsFront.stance.elastic',
  active_defense: 'corpsFront.stance.activeDefense', screening: 'corpsFront.stance.screening',
};
const PREP_SUB_PHASES = ['intel_gathering', 'force_staging', 'supply_check', 'assessment', 'ready'] as const;
const PREP_LABEL_KEYS: Record<string, MessageKey> = {
  intel_gathering: 'corpsFront.prep.intelGathering',
  force_staging: 'corpsFront.prep.forceStaging',
  supply_check: 'corpsFront.prep.supplyCheck',
  assessment: 'corpsFront.prep.assessment',
  ready: 'corpsFront.prep.ready',
};

/** Player-facing phrasing for a commander's launch recommendation (raw enum: launch/postpone/abort). */
const COMMANDER_ASSESSMENT_LABELS: Record<string, string> = {
  launch: 'Recommends launch', postpone: 'Urges delay', abort: 'Advises abort',
};
function commanderAssessmentLabel(assessment: string): string {
  return COMMANDER_ASSESSMENT_LABELS[assessment] ?? toTitleCase(assessment);
}

function stanceLabel(stance: SectorStanceType): string {
  return t(STANCE_LABEL_KEYS[stance]);
}

function prepLabel(subPhase: string): string {
  const key = PREP_LABEL_KEYS[subPhase];
  return key ? t(key) : toTitleCase(subPhase);
}

function PreparationProgressBar({ subPhase, turnsElapsed, maxTurns }: { subPhase: string; turnsElapsed: number; maxTurns: number }) {
  const idx = PREP_SUB_PHASES.indexOf(subPhase as typeof PREP_SUB_PHASES[number]);
  const timeProgress = maxTurns > 0 ? Math.min(1, turnsElapsed / maxTurns) : 0;
  return (
    <div>
      <div className="flex gap-0.5 mb-0.5">
        {PREP_SUB_PHASES.map((phase, i) => (
          <div
            key={phase}
            className={`h-1.5 flex-1 rounded-sm ${i <= idx ? (phase === 'ready' ? 'bg-green-500' : 'bg-amber-500') : 'bg-neutral-200'}`}
            title={prepLabel(phase)}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-neutral-500">
        <span className="uppercase font-bold">{prepLabel(subPhase)}</span>
        <span>{t('corpsFront.prep.cycle', { elapsed: turnsElapsed.toString(), max: maxTurns.toString(), pct: Math.round(timeProgress * 100).toString() })}</span>
      </div>
    </div>
  );
}

function compareOperations(a: OperationView, b: OperationView): number {
  return (
    a.phase.localeCompare(b.phase) ||
    a.name.localeCompare(b.name) ||
    a.started_turn - b.started_turn
  );
}

interface CorpsFrontPanelProps {
  railSlot: 'primary' | 'secondary';
}

export function CorpsFrontPanel({ railSlot }: CorpsFrontPanelProps) {
  const ipc = useIPC();
  const [locale] = useLocale();
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const setSelectedSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setHoveredCorpsId = useGameStore((s) => s.setHoveredCorpsId);
  const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
  const panToOsid = useGameStore((s) => s.panToOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setOpsPlanningContext = useGameStore((s) => s.setOpsPlanningContext);
  const setOperationBriefingContext = useGameStore((s) => s.setOperationBriefingContext);
  const [activeTab, setActiveTab] = useState<'overview' | 'forces' | 'logistics' | 'ops'>('overview');
  const [sectorActionMessage, setSectorActionMessage] = useState<string | null>(null);

  // When sector changes, show Overview tab (one section visible, no stacking)
  useEffect(() => {
    setActiveTab('overview');
    setSectorActionMessage(null);
  }, [selectedSectorId]);

  useEffect(() => {
    if (!selectedCorpsId) return;
    setHoveredCorpsId(selectedCorpsId);
    return () => {
      if (useGameStore.getState().hoveredCorpsId === selectedCorpsId) {
        setHoveredCorpsId(null);
      }
    };
  }, [selectedCorpsId, setHoveredCorpsId]);

  useEffect(() => {
    if (!selectedSectorId) return;
    setHoveredSectorId(selectedSectorId);
    return () => {
      if (useGameStore.getState().hoveredSectorId === selectedSectorId) {
        setHoveredSectorId(null);
      }
    };
  }, [selectedSectorId, setHoveredSectorId]);

  const _sector = findPlayerFacingSectorById(loadedGameState, selectedSectorId);
  const sectorFriendlyOsids = useMemo(
    () => (_sector && loadedGameState) ? collectSectorFriendlyOsids(_sector, loadedGameState.frontEdgesOsid) : [],
    [_sector, loadedGameState?.frontEdgesOsid]
  );
  const sectorFriendlySet = useMemo(() => new Set(sectorFriendlyOsids), [sectorFriendlyOsids]);
  const relatedOperations = useMemo(
    () => {
      if (!_sector) return [];
      return [...filterPlayerFacingOperations(loadedGameState)]
        .filter((op) => {
          if (op.corps_id !== _sector.corps_id) return false;
          if (op.sector_id === _sector.sector_id) return true;
          if (!op.objectives || op.objectives.length === 0) return false;
          return op.objectives.some((osid) => sectorFriendlySet.has(osid));
        })
        .sort(compareOperations);
    },
    [loadedGameState, _sector, sectorFriendlySet]
  );

  if (operationsPanelOpen || !selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;

  const sector = _sector;
  if (!sector) return null;

  const corpsFormation = loadedGameState.formations.find((f) => f.id === sector.corps_id);
  const corpsStance = corpsFormation?.corpsStance ?? 'unknown';
  const corpsColorMap = buildCorpsColorMap(loadedGameState.corpsFrontSectors);
  const corpsColor = corpsColorMap[sector.corps_id] ?? '#888';

  const sectorAssignment = buildSectorFormationAssignment(sector, loadedGameState.formations, loadedGameState.corpsFrontSectors);

  const assignedFormations = sectorAssignment.frontlineIds
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const reserveFormations = sectorAssignment.reserveIds
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const overrideFormations = sectorAssignment.overrideIds
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  // Unresolved brigades: could not be placed into any sector for this corps this turn (Codex #6: unresolved is honest)
  const unresolvedFormations = (loadedGameState.unresolvedSectorBrigades ?? [])
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null && f.corps_id === sector.corps_id);

  const assignedPersonnel = assignedFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const reservePersonnel = reserveFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const totalSectorPersonnel = assignedPersonnel + reservePersonnel;
  const reserveRatio = totalSectorPersonnel > 0 ? reservePersonnel / totalSectorPersonnel : 0;
  const avgOperationSupply = relatedOperations.length > 0
    ? relatedOperations.reduce((sum, op) => sum + (op.supply_readiness ?? 0), 0) / relatedOperations.length
    : null;
  const entrenchmentSummary = loadedGameState.sectorEntrenchmentSummary?.[sector.sector_id];
  const currentSectorStance = (sector.sector_stance ?? 'defend') as SectorStanceType;
  const currentStanceSource = sector.stance_source ?? 'bot';
  const sectorStanceLabel = stanceLabel(currentSectorStance);
  const effectiveLogisticsPriority = Math.max(0.5, Math.min(1.5, sector.logistics_priority ?? 1));
  const logisticsPriorityTitle = t('corpsFront.logisticsPriorityTitle');
  const metadataDate = loadedGameState.metadata?.date?.trim();
  const displayDate = metadataDate && metadataDate !== 'UNKNOWN'
    ? metadataDate
    : turnToDateString(loadedGameState.turn);

  const issueLogisticsPriority = async (priority: number) => {
    const result = await ipc.stageLogisticsPriority(sector.faction, sector.sector_id, priority);
    const effectivePriority = Math.max(0.5, Math.min(1.5, priority));
    setSectorActionMessage(result.ok ? t('corpsFront.priorityStaged', { priority: effectivePriority.toFixed(1) }) : (result.error ?? t('corpsFront.stagePriorityFailed')));
  };

  const toggleOpsec = async () => {
    const result = await ipc.stageOpsecToggle(sector.sector_id, !(sector.opsec_active ?? false));
    setSectorActionMessage(result.ok
      ? t((sector.opsec_active ?? false) ? 'corpsFront.opsecDisabled' : 'corpsFront.opsecEnabled')
      : (result.error ?? t('corpsFront.opsecToggleFailed')));
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={getPanelRailStyle(railSlot, '24rem', 'left')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: corpsColor }}
          />
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            {t('corpsFront.title')}
          </span>
          {sector.opsec_active && (
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-500/50 text-amber-400">
              {t('corpsFront.opsec')}
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedSectorId(null)}
          aria-label={t('corpsFront.close')}
          className="kbd-focus text-text-secondary hover:text-interactive text-sm leading-none rounded"
        >
          ✕
        </button>
      </div>

      {/* Gradient bridge: dark chrome → paper */}
      <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(to bottom, #252220, #d8d0c4)' }} />

      <div className="flex-1 overflow-auto bg-[#f0e8d8]/95 text-neutral-800 font-mono text-[11px] shadow-inner relative flex flex-col">
        {/* Background watermark */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center -rotate-12 select-none">
          <span className="text-8xl font-black tracking-widest uppercase">{t('corpsFront.secret')}</span>
        </div>

        {/* Threat Warning Banner */}
        {sector.offensive_signs && (
          <div className="bg-red-600 text-white font-bold p-2 text-center text-[10px] sm:text-xs uppercase tracking-widest animate-pulse shadow-md relative z-10 border-y border-red-800">
            {t('corpsFront.offensiveDetected')}
          </div>
        )}

        {/* Dossier Header */}
        <div className="p-4 pb-3 border-b-2 border-neutral-300 relative z-10 shrink-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">{t('corpsFront.subject')}</span>
              <span className="font-bold text-[14px] uppercase tracking-wide">
                {sector.display_name}
              </span>
            </div>
            <div className="flex flex-col items-end text-[9px] text-neutral-500">
              <div className="uppercase"><span className="font-bold">{t('corpsFront.date')}:</span> {displayDate}</div>
              <div className="uppercase"><span className="font-bold">{t('corpsFront.turn')}:</span> {turnToDateString(loadedGameState.turn)}</div>
            </div>
          </div>
          <div className="text-neutral-600 mt-2 text-[10px] space-y-0.5 uppercase">
            <div><span className="font-bold text-neutral-800">{t('corpsFront.faction')}:</span> <span className={FACTION_COLORS[sector.faction] ?? 'text-neutral-800'}>{getPlayerSafeMilitaryFactionName(sector.faction)}</span></div>
            <div><span className="font-bold text-neutral-800">{t('corpsFront.corpsStance')}:</span> {corpsStance === 'unknown' ? t('corpsFront.unreported') : formatPosture(corpsStance)}</div>
            <div><span className="font-bold text-neutral-800">{t('corpsFront.sectorStance')}:</span> {sectorStanceLabel}{currentStanceSource === 'player' ? ` (${t('corpsFront.manual')})` : ''}</div>
            <div>
              <span className="font-bold text-neutral-800">{t('corpsFront.opsec')}:</span>{' '}
              <span className={sector.opsec_active ? 'text-amber-700 font-bold' : 'text-neutral-700'}>
                {sector.opsec_active ? t('corpsFront.active') : t('corpsFront.inactive')}
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-neutral-300/50 flex items-center justify-between">
              <span><span className="font-bold text-neutral-800">{t('corpsFront.confidence')}:</span> {(sector.intel_confidence * 100).toFixed(0)}%</span>
              {sector.intel_confidence < 0.3 && <span className="text-red-700 font-bold bg-red-100 px-1 rounded">{t('corpsFront.low')}</span>}
              {sector.intel_confidence >= 0.3 && sector.intel_confidence < 0.7 && <span className="text-amber-700 font-bold bg-amber-100 px-1 rounded">{t('corpsFront.med')}</span>}
              {sector.intel_confidence >= 0.7 && <span className="text-green-700 font-bold bg-green-100 px-1 rounded">{t('corpsFront.high')}</span>}
            </div>
          </div>
        </div>

        {/* Tabs: one section visible at a time (no stacking) */}
        <div className="shrink-0 border-b border-neutral-300 bg-neutral-100/80 relative z-10 flex flex-wrap gap-0" role="tablist" aria-label={t('corpsFront.sections')}>
          {([
            ['overview', t('corpsFront.tab.overview')],
            ['forces', 'ORBAT'],
            ['logistics', t('corpsFront.tab.logistics')],
            ['ops', t('corpsFront.tab.opsSnapshot')],
          ] as const).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              aria-controls={`sector-intel-panel-${tabId}`}
              id={`sector-intel-tab-${tabId}`}
              onClick={() => setActiveTab(tabId)}
              className={`kbd-focus px-3 py-2 text-[10px] font-bold uppercase border-b-2 transition-colors ${activeTab === tabId
                ? 'border-accent-gold text-neutral-900 bg-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-300/40'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Single visible panel (no stacking) */}
        <div className="flex-1 overflow-auto min-h-0 relative z-10">
          <div role="tabpanel" id="sector-intel-panel-overview" aria-labelledby="sector-intel-tab-overview" hidden={activeTab !== 'overview'} className="p-4 relative z-10">
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Combat Power Summary */}
                <div className="mb-2 p-2 bg-neutral-100 border border-neutral-300 rounded">
                  <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1.5 border-b border-neutral-300 pb-1 flex justify-between">
                    <span>{t('corpsFront.combatPowerAssessment')}</span>
                    <span className="text-[8px] font-normal text-neutral-400 normal-case">{t('corpsFront.standardBrigadeBaseline')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.strength')}</span>
                      <div className="font-medium">
                        {sector.intel_confidence < 0.3 ? (
                          <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">{t('corpsFront.redacted')}</span>
                        ) : (
                          <StrengthBadge strengthClass={sector.combat_strength_class} />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('armyReserve.personnel')}</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_personnel} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col" title={t('corpsFront.standardBrigadeEquivalency', { count: ((sector.combat_offensive_power ?? 0) / 1000).toFixed(1) })}>
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.offensivePower')}</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_offensive_power} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col" title={t('corpsFront.standardBrigadeEquivalency', { count: ((sector.combat_defensive_power ?? sector.defensive_power ?? 0) / 1000).toFixed(1) })}>
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.defensivePower')}</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_defensive_power ?? sector.defensive_power} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.defPerEdge')}</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_defense_per_edge} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.forceBalance')}</span>
                      <div className="pt-0.5">
                        {sector.intel_confidence < 0.4 ? (
                          <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">{t('corpsFront.redacted')}</span>
                        ) : (
                          <ThreatBadge ratio={sector.threat_ratio} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unit Condition */}
                <div className="mb-2 p-2 bg-neutral-100 border border-neutral-300 rounded">
                  <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1.5 border-b border-neutral-300 pb-1">{t('corpsFront.unitCondition')}</div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.morale')}</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_morale_avg ?? 50) < 25 ? 'text-red-600' : (sector.combat_morale_avg ?? 50) < 50 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_morale_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.cohesion')}</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_cohesion_avg ?? 50) < 25 ? 'text-red-600' : (sector.combat_cohesion_avg ?? 50) < 50 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_cohesion_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.fatigue')}</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_fatigue_avg ?? 0) > 20 ? 'text-red-600' : (sector.combat_fatigue_avg ?? 0) > 10 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_fatigue_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sector Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.frontLength')}</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.2 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : t('corpsFront.frontSegmentsCount', { count: sector.length_edges })}
                    </span>
                    <span className="text-[9px] text-neutral-500">[{sector.sub_segment_count === 1 ? t('corpsFront.contiguous') : t('corpsFront.segments', { count: sector.sub_segment_count })}]</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.brigades')}</span>
                    <span className="font-medium">
                      {t('corpsFront.frontReserveBrigades', { front: sectorAssignment.frontlineIds.length, reserve: sectorAssignment.reserveIds.length })}
                      {sectorAssignment.overrideIds.length > 0 && `, ${t('corpsFront.commandDirectedBrigades', { count: sectorAssignment.overrideIds.length })}`}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.sectorStance')}</span>
                    <span className="font-medium uppercase">
                      {sectorStanceLabel}
                      {currentStanceSource === 'player' && <span className="ml-1 text-[8px] text-amber-700 bg-amber-100 px-0.5 rounded font-bold">{t('corpsFront.manual')}</span>}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500" title={logisticsPriorityTitle}>{t('corpsFront.supplyPriority')}</span>
                    <span className="font-medium" title={logisticsPriorityTitle}>
                      {effectiveLogisticsPriority.toFixed(1)}x{effectiveLogisticsPriority === 1 ? ` (${t('corpsFront.neutral')})` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.linkedSettlements')}</span>
                    <span className="font-medium">{sectorFriendlyOsids.length}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-neutral-300 space-y-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1" title={logisticsPriorityTitle}>{t('corpsFront.reinforcementPriority')}</span>
                    <div className="flex gap-1">
                      {[0.5, 1, 1.5].map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => void issueLogisticsPriority(priority)}
                          title={priority === 1 ? t('corpsFront.neutralPriorityTitle', { title: logisticsPriorityTitle }) : logisticsPriorityTitle}
                          className="kbd-focus flex-1 px-2 py-1 rounded border border-neutral-400 bg-neutral-200/50 hover:bg-neutral-300/60 text-[10px] font-bold"
                        >
                          {priority.toFixed(1)}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleOpsec()}
                    className="kbd-focus w-full rounded border border-neutral-400 bg-neutral-200/50 hover:bg-neutral-300/60 px-2 py-1 text-[10px] font-bold uppercase"
                  >
                    {sector.opsec_active ? t('corpsFront.disableOpsec') : t('corpsFront.enableOpsec')}
                  </button>
                  {sectorActionMessage && (
                    <div className="text-[10px] text-neutral-600 italic">{sectorActionMessage}</div>
                  )}
                </div>

                {sector.opposing_factions.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">{t('corpsFront.identifiedHostiles')}</span>
                    <div className="flex flex-wrap gap-2">
                      {sector.opposing_factions.map((f) => (
                        <span key={f} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FACTION_COLORS[f]?.replace('text-', 'bg-').replace('-400', '-900') ?? 'bg-neutral-800'} text-white`}>
                          {getPlayerSafeMilitaryFactionName(f)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div role="tabpanel" id="sector-intel-panel-forces" aria-labelledby="sector-intel-tab-forces" hidden={activeTab !== 'forces'} className="p-4 relative z-10">
            {activeTab === 'forces' && (
              <div className="p-4 relative z-10">
                {assignedFormations.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[9px] uppercase font-bold text-neutral-500 mb-2 border-b border-neutral-300 pb-1">
                      {t('corpsFront.activeFrontlineElements', { count: assignedFormations.length })}
                    </div>
                    <div className="space-y-[1px] max-h-[200px] overflow-auto">
                      {assignedFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          data-testid="corps-front-brigade-row"
                          data-formation-id={f.id}
                          data-location-osid={f.location_osid ?? undefined}
                          aria-label={t('corpsFront.assignedBrigadeAria', { name: getLocalizedFormationName(f, locale), personnel: f.personnel != null ? `, ${t('armyReserve.personnel')} ${f.personnel.toLocaleString()}` : '' })}
                          className="kbd-focus w-full flex justify-between items-center bg-neutral-200/40 hover:bg-neutral-300/50 transition-colors text-left px-1 py-0.5 rounded"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => {
                            if (f.location_osid) setHoveredOsids([f.location_osid]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                          onMouseLeave={() => {
                            setHoveredOsids([]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                        >
                          <span className="truncate mr-2 font-medium">{getLocalizedFormationName(f, locale)}</span>
                          <span className="text-neutral-500 text-[10px] tabular-nums shrink-0">
                            {sector.intel_confidence < 0.5 ? <span className="bg-black text-black select-none px-1">{t('corpsFront.redShort')}</span> : (f.personnel != null ? t('corpsFront.pax', { count: f.personnel.toLocaleString() }) : '—')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {reserveFormations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[9px] uppercase font-bold text-neutral-500 mb-2 border-b border-neutral-300 pb-1">
                      {t('corpsFront.deployedReserves', { count: reserveFormations.length })}
                    </div>
                    <div className="space-y-[1px] max-h-[120px] overflow-auto opacity-80 hover:opacity-100 transition-opacity">
                      {reserveFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          data-testid="corps-front-brigade-row"
                          data-formation-id={f.id}
                          data-location-osid={f.location_osid ?? undefined}
                          aria-label={t('corpsFront.reserveBrigadeAria', { name: getLocalizedFormationName(f, locale), personnel: f.personnel != null ? `, ${t('armyReserve.personnel')} ${f.personnel.toLocaleString()}` : '' })}
                          className="kbd-focus w-full flex justify-between items-center hover:bg-neutral-300/50 transition-colors text-left px-1 py-0.5 rounded"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => {
                            if (f.location_osid) setHoveredOsids([f.location_osid]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                          onMouseLeave={() => {
                            setHoveredOsids([]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                        >
                          <span className="truncate mr-2 text-neutral-600 italic leading-none">{getLocalizedFormationName(f, locale)}</span>
                          <span className="text-neutral-400 text-[9px] tabular-nums shrink-0 leading-none">
                            {sector.intel_confidence < 0.6 ? <span className="bg-black text-black select-none px-1">{t('corpsFront.redShort')}</span> : (f.personnel != null ? t('corpsFront.pax', { count: f.personnel.toLocaleString() }) : '—')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {overrideFormations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[9px] uppercase font-bold text-amber-700 mb-2 border-b border-amber-300/60 pb-1">
                      {t('corpsFront.commandDirectedElements', { count: overrideFormations.length })}
                    </div>
                    <div className="space-y-[1px] max-h-[120px] overflow-auto">
                      {overrideFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          data-testid="corps-front-brigade-row"
                          data-formation-id={f.id}
                          data-location-osid={f.location_osid ?? undefined}
                          aria-label={t('corpsFront.commandDirectedBrigadeAria', { name: getLocalizedFormationName(f, locale), personnel: f.personnel != null ? `, ${t('armyReserve.personnel')} ${f.personnel.toLocaleString()}` : '' })}
                          className="kbd-focus w-full flex justify-between items-center bg-amber-100/50 hover:bg-amber-200/50 transition-colors text-left px-1 py-0.5 rounded"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => {
                            if (f.location_osid) setHoveredOsids([f.location_osid]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                          onMouseLeave={() => {
                            setHoveredOsids([]);
                            setHoveredSectorId(selectedSectorId);
                          }}
                        >
                          <span className="truncate mr-2 font-medium text-amber-800">{getLocalizedFormationName(f, locale)}</span>
                          <span className="text-amber-700 text-[9px] uppercase tracking-wide shrink-0">{t('sectorsSection.overrideBadge')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Codex principle #6: unresolved is honest — show brigades the engine could not place in any sector */}
                {unresolvedFormations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[9px] uppercase font-bold text-red-600 mb-1 border-b border-red-200 pb-1 flex items-center gap-1">
                      <span>{t('corpsFront.unassigned', { count: unresolvedFormations.length })}</span>
                      <span className="normal-case font-normal text-red-500 text-[8px]">- {t('corpsFront.notPlacedThisTurn')}</span>
                    </div>
                    <div className="space-y-[1px] max-h-[100px] overflow-auto">
                      {unresolvedFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-label={t('corpsFront.unassignedBrigadeAria', { name: getLocalizedFormationName(f, locale) })}
                          className="kbd-focus w-full flex justify-between items-center hover:bg-red-50 transition-colors text-left px-1 py-0.5 rounded border border-red-200/60"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => {
                            if (f.location_osid) setHoveredOsids([f.location_osid]);
                          }}
                          onMouseLeave={() => { setHoveredOsids([]); }}
                        >
                          <span className="truncate mr-2 text-red-700 leading-none">{getLocalizedFormationName(f, locale)}</span>
                          <span className="text-red-400 text-[9px] tabular-nums shrink-0 leading-none">{t('corpsFront.unassignedShort')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div role="tabpanel" id="sector-intel-panel-logistics" aria-labelledby="sector-intel-tab-logistics" hidden={activeTab !== 'logistics'} className="p-4 relative z-10">
            {activeTab === 'logistics' && (
              <div className="p-4 relative z-10 space-y-1">
                <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.totalManpower')}</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.4 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : totalSectorPersonnel.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.reserveRatio')}</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.5 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : `${Math.round(reserveRatio * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.opsSupplyReadiness')}</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.6 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : (avgOperationSupply != null ? `${Math.round(avgOperationSupply * 100)}%` : '—')}
                  </span>
                </div>
                {entrenchmentSummary && (
                  <>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.avgEntrenchment')}</span>
                      <span className="font-medium">{t('corpsFront.turnsValue', { count: entrenchmentSummary.avgEntrenchment.toFixed(1) })}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.avgDigIn')}</span>
                      <span className="font-medium">{Math.round(entrenchmentSummary.avgDigIn * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">{t('corpsFront.digInPosture')}</span>
                      <span className="font-medium">{entrenchmentSummary.digInCount}/{entrenchmentSummary.totalCount}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div role="tabpanel" id="sector-intel-panel-ops" aria-labelledby="sector-intel-tab-ops" hidden={activeTab !== 'ops'} className="p-4 relative z-10">
            {activeTab === 'ops' && (
              <div className="p-4 relative z-10 space-y-3">
                <div className="text-[9px] uppercase font-bold text-neutral-500">{t('corpsFront.fieldSnapshot')}</div>
                <div className="text-[10px] text-neutral-500 -mt-2">
                  {t('corpsFront.fieldSnapshotHelp')}
                </div>
                {relatedOperations.length === 0 ? (
                  <div className="text-[10px] text-neutral-500 italic uppercase">{t('corpsFront.noActiveDirectives')}</div>
                ) : (
                  relatedOperations.map((op) => {
                    const phaseBg = getOperationPhaseBadgeClass(op.phase);
                    const operationId = getOperationId(op);
                    const objective = op.objectives?.[op.current_objective_index ?? 0] ?? op.objectives?.[0];
                    const forceBalance = op.force_ratio_estimate != null
                      ? getPlayerSafeOperationBalancePresentation(op.force_ratio_estimate)
                      : null;
                    return (
                      <div key={operationId} className="bg-neutral-100 border-2 border-neutral-300 p-2 relative shadow-sm">
                        {/* Stamp effect */}
                        <div className={`absolute top-1 right-2 opacity-20 font-black text-xl -rotate-12 select-none uppercase ${op.phase === 'execution' ? 'text-red-600' : 'text-amber-600'}`}>
                          {getPlayerSafeOperationPhaseLabel(op.phase)}
                        </div>

                        <div className="font-bold text-[12px] uppercase tracking-wide mb-1 flex items-center gap-2">
                          <span>{sector.intel_confidence < 0.2 ? <span className="bg-black text-black select-none">{t('corpsFront.opRedacted')}</span> : op.display_name}</span>
                          <span className={`px-1 rounded text-[8px] text-white ${phaseBg}`}>{getPlayerSafeOperationPhaseLabel(op.phase)}</span>
                        </div>

                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-0.5 mt-2">{t('corpsFront.forcesCommitted')}</div>
                        <div className="text-[10px]">{sector.intel_confidence < 0.4 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : t('corpsFront.brigadeCount', { count: op.participating_brigade_count })}</div>

                        {op.supply_readiness != null && (
                          <>
                            <div className="text-[9px] uppercase font-bold text-neutral-500 mt-2 mb-0.5">{t('corpsFront.supplyStatus')}</div>
                            <div className="text-[10px]">{sector.intel_confidence < 0.7 ? <span className="bg-black text-black select-none">{t('corpsFront.redacted')}</span> : t('corpsFront.readinessPct', { pct: Math.round(op.supply_readiness * 100) })}</div>
                          </>
                        )}

                        {op.preparation_sub_phase && op.phase === 'planning' && (
                          <div className="mt-2 pt-2 border-t border-neutral-200 border-dashed">
                            <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">{t('corpsFront.preparation')}</div>
                            <PreparationProgressBar subPhase={op.preparation_sub_phase} turnsElapsed={op.preparation_turns_elapsed ?? 0} maxTurns={op.preparation_max_turns ?? 8} />
                            {op.commander_assessment && (
                              <div className={`text-[9px] mt-1 font-bold uppercase ${op.commander_assessment === 'launch' ? 'text-green-700' : op.commander_assessment === 'abort' ? 'text-red-700' : 'text-amber-700'}`}>
                                {t('corpsFront.cdrAssessment', { assessment: commanderAssessmentLabel(op.commander_assessment) })}
                              </div>
                            )}
                            {op.has_active_probe && (
                              <div className="text-[9px] mt-0.5 text-blue-700 font-semibold uppercase">{t('corpsFront.probeInProgress')}</div>
                            )}
                            {forceBalance && (
                              <div className="text-[9px] mt-0.5 text-neutral-600 uppercase">
                                {t('corpsFront.forceBalance')}: <span className={forceBalance.toneClass}>{forceBalance.label}</span> <span className="text-neutral-500">{forceBalance.summary}</span>
                              </div>
                            )}
                            {(op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready') && (
                              <button
                                type="button"
                                onClick={() => setOperationBriefingContext({ corpsId: op.corps_id, operationName: op.name })}
                                className={`kbd-focus mt-2 w-full text-[10px] uppercase font-bold py-1.5 border transition-colors ${op.preparation_sub_phase === 'assessment'
                                    ? 'bg-amber-400 hover:bg-amber-500 text-amber-900 border-amber-500'
                                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800 border-neutral-400'
                                  }`}
                              >
                                {op.preparation_sub_phase === 'assessment' ? t('corpsFront.assessmentReadyReview') : t('corpsFront.reviewBriefing')}
                              </button>
                            )}
                          </div>
                        )}

                        {objective && (
                          <div className="mt-3 pt-2 border-t border-neutral-300 border-dashed">
                            <button
                              type="button"
                              aria-label={t('corpsFront.focusObjectiveAria', { objective: getOsidDisplayName(objective, osidDisplayNames) })}
                              onClick={() => panToOsid?.(objective)}
                              className="kbd-focus text-[9px] uppercase font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                            >
                              <span className="text-[11px]">⌖</span> {t('corpsFront.focusObj')}: {sector.intel_confidence < 0.3 ? <span className="bg-black text-black select-none">{t('corpsFront.redact')}</span> : getOsidDisplayName(objective, osidDisplayNames)}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (sector?.corps_id) {
                        setOpsPlanningContext(sector.corps_id, sector.sector_id);
                      }
                    }}
                    className="kbd-focus w-full text-[10px] uppercase font-bold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 py-2 border border-neutral-400 transition-colors"
                  >
                    {t('corpsFront.draftNewDirective')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
