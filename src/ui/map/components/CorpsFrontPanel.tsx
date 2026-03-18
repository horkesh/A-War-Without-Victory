import { useEffect, useMemo, useState } from 'react';
import type { OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { getOperationId, getOperationPhaseBadgeClass } from '../utils/operations';
import { getPanelRailStyle } from './panelRail';
import { useIPC } from '../desktop/useIPC';

/** Strength class badge with color coding. */
function StrengthBadge({ strengthClass }: { strengthClass?: 'fortress' | 'strong' | 'adequate' | 'thin' | 'critical' }) {
  switch (strengthClass) {
    case 'fortress': return <span className="text-green-700 font-bold bg-green-100 px-1 rounded">FORTRESS</span>;
    case 'strong': return <span className="text-green-600 font-semibold">STRONG</span>;
    case 'adequate': return <span className="text-amber-600 font-semibold">ADEQUATE</span>;
    case 'thin': return <span className="text-orange-600 font-semibold">THIN</span>;
    case 'critical': return <span className="text-red-600 font-bold bg-red-100 px-1 rounded">CRITICAL</span>;
    default: return <span className="text-neutral-400">—</span>;
  }
}

/** Threat ratio badge with descriptive balance labels. */
function ThreatBadge({ ratio }: { ratio: number }) {
  let label = 'BALANCED';
  let color = 'text-green-400';

  if (ratio > 2.0) { label = 'OVERMATCHED'; color = 'text-red-500 font-black'; }
  else if (ratio > 1.5) { label = 'VULNERABLE'; color = 'text-red-400 font-bold'; }
  else if (ratio > 1.2) { label = 'PRESSURE'; color = 'text-amber-500'; }
  else if (ratio < 0.5) { label = 'SUPERIOR'; color = 'text-emerald-500 font-bold'; }
  else if (ratio < 0.8) { label = 'FAVORABLE'; color = 'text-green-500'; }

  return (
    <div className="flex flex-col">
      <span className={`${color} text-[10px] tracking-tighter leading-none mb-0.5`}>{label}</span>
      <span className={`${color} font-mono`}>{ratio.toFixed(2)}:1</span>
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
    return <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">REDACTED</span>;
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
const STANCE_LABELS: Record<SectorStanceType, string> = {
  fortify: 'Fortify', defend: 'Defend', elastic: 'Elastic',
  active_defense: 'Active Def', screening: 'Screening',
};
const STANCE_DESCRIPTIONS: Record<SectorStanceType, string> = {
  fortify: 'All hands digging. Max entrenchment. +30% reactive.',
  defend: 'Standard defense. Moderate entrenchment. +15% reactive.',
  elastic: 'Defense in depth. Large reserve for counterattack.',
  active_defense: 'Aggressive patrolling, raids. -15% reactive.',
  screening: 'Tripwire. No entrenchment. -50% reactive.',
};
const CORPS_STANCE_ALLOWED: Record<string, readonly SectorStanceType[]> = {
  offensive: ['active_defense', 'elastic', 'defend'],
  balanced: SECTOR_STANCES,
  defensive: ['fortify', 'defend', 'elastic'],
  reorganize: ['fortify', 'defend', 'screening'],
};

const PREP_SUB_PHASES = ['intel_gathering', 'force_staging', 'supply_check', 'assessment', 'ready'] as const;
const PREP_LABELS: Record<string, string> = {
  intel_gathering: 'INTEL', force_staging: 'STAGING', supply_check: 'SUPPLY', assessment: 'ASSESS', ready: 'READY',
};

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
            title={PREP_LABELS[phase]}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-neutral-500">
        <span className="uppercase font-bold">{PREP_LABELS[subPhase] ?? subPhase}</span>
        <span>{turnsElapsed}/{maxTurns}t ({Math.round(timeProgress * 100)}%)</span>
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
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const setSelectedSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
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
  }, [selectedSectorId]);

  const _sector = loadedGameState?.corpsFrontSectors?.find((s) => s.sector_id === selectedSectorId) ?? null;
  const sectorFriendlyOsids = useMemo(
    () => _sector ? collectSectorFriendlyOsids(_sector, loadedGameState!.frontEdgesOsid) : [],
    [_sector, loadedGameState?.frontEdgesOsid]
  );
  const sectorFriendlySet = useMemo(() => new Set(sectorFriendlyOsids), [sectorFriendlyOsids]);
  const relatedOperations = useMemo(
    () => {
      if (!_sector) return [];
      return [...(loadedGameState?.operations ?? [])]
        .filter((op) => {
          if (op.corps_id !== _sector.corps_id) return false;
          if (op.sector_id === _sector.sector_id) return true;
          if (!op.objectives || op.objectives.length === 0) return false;
          return op.objectives.some((osid) => sectorFriendlySet.has(osid));
        })
        .sort(compareOperations);
    },
    [loadedGameState?.operations, _sector, sectorFriendlySet]
  );

  if (operationsPanelOpen || !selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;

  const sector = _sector;
  if (!sector) return null;

  const corpsFormation = loadedGameState.formations.find((f) => f.id === sector.corps_id);
  const corpsStance = corpsFormation?.corpsStance ?? 'unknown';
  const corpsColorMap = buildCorpsColorMap(loadedGameState.corpsFrontSectors);
  const corpsColor = corpsColorMap[sector.corps_id] ?? '#888';

  const assignedFormations = sector.assigned_brigade_ids
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const reserveFormations = sector.reserve_brigade_ids
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const assignedPersonnel = assignedFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const reservePersonnel = reserveFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const totalSectorPersonnel = assignedPersonnel + reservePersonnel;
  const reserveRatio = totalSectorPersonnel > 0 ? reservePersonnel / totalSectorPersonnel : 0;
  const avgOperationSupply = relatedOperations.length > 0
    ? relatedOperations.reduce((sum, op) => sum + (op.supply_readiness ?? 0), 0) / relatedOperations.length
    : null;
  const entrenchmentSummary = loadedGameState.sectorEntrenchmentSummary?.[sector.sector_id];
  const allowedStances = new Set(CORPS_STANCE_ALLOWED[corpsStance] ?? SECTOR_STANCES);
  const currentSectorStance = (sector.sector_stance ?? 'defend') as SectorStanceType;
  const currentStanceSource = sector.stance_source ?? 'bot';
  const sectorStanceLabel = STANCE_LABELS[currentSectorStance] ?? currentSectorStance.replace(/_/g, ' ');

  const issueSectorStance = async (stance: SectorStanceType) => {
    const result = await ipc.stageSectorStanceOrder(sector.sector_id, stance);
    setSectorActionMessage(result.ok ? `Sector stance staged: ${STANCE_LABELS[stance]}` : (result.error ?? 'Failed to stage sector stance'));
  };

  const resetToAI = async () => {
    const result = await ipc.resetSectorStanceToBot(sector.sector_id);
    setSectorActionMessage(result.ok ? 'Stance returned to AI control' : (result.error ?? 'Failed to reset stance'));
  };

  const issueLogisticsPriority = async (priority: number) => {
    const result = await ipc.stageLogisticsPriority(sector.faction, sector.sector_id, priority);
    setSectorActionMessage(result.ok ? `Priority staged: ${priority.toFixed(1)}x` : (result.error ?? 'Failed to stage logistics priority'));
  };

  const toggleOpsec = async () => {
    const result = await ipc.stageOpsecToggle(sector.sector_id, !(sector.opsec_active ?? false));
    setSectorActionMessage(result.ok
      ? `OPSEC ${(sector.opsec_active ?? false) ? 'disabled' : 'enabled'}.`
      : (result.error ?? 'Failed to toggle OPSEC'));
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
            Sector Intelligence
          </span>
          {sector.opsec_active && (
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-500/50 text-amber-400">
              OPSEC
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedSectorId(null)}
          aria-label="Close sector intelligence panel"
          className="kbd-focus text-text-secondary hover:text-interactive text-sm leading-none rounded"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-[#faf9f6]/95 text-neutral-800 font-mono text-[11px] shadow-inner relative flex flex-col">
        {/* Background watermark */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center -rotate-12 select-none">
          <span className="text-8xl font-black tracking-widest uppercase">SECRET</span>
        </div>

        {/* Threat Warning Banner */}
        {sector.offensive_signs && (
          <div className="bg-red-600 text-white font-bold p-2 text-center text-[10px] sm:text-xs uppercase tracking-widest animate-pulse shadow-md relative z-10 border-y border-red-800">
            ⚠️ IMMINENT ENEMY OFFENSIVE DETECTED ⚠️
          </div>
        )}

        {/* Dossier Header */}
        <div className="p-4 pb-3 border-b-2 border-neutral-300 relative z-10 shrink-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Subject</span>
              <span className="font-bold text-[14px] uppercase tracking-wide">
                {sector.display_name}
              </span>
            </div>
            <div className="flex flex-col items-end text-[9px] text-neutral-500">
              <div className="uppercase"><span className="font-bold">Date:</span> {loadedGameState.metadata?.date ?? 'UNKNOWN'}</div>
              <div className="uppercase"><span className="font-bold">Turn:</span> {loadedGameState.metadata?.turn ?? 'UNKNOWN'}</div>
            </div>
          </div>
          <div className="text-neutral-600 mt-2 text-[10px] space-y-0.5 uppercase">
            <div><span className="font-bold text-neutral-800">FACTION:</span> <span className={FACTION_COLORS[sector.faction] ?? 'text-neutral-800'}>{sector.faction}</span></div>
            <div><span className="font-bold text-neutral-800">CORPS STANCE:</span> {corpsStance}</div>
            <div><span className="font-bold text-neutral-800">SECTOR STANCE:</span> {sectorStanceLabel}{currentStanceSource === 'player' ? ' (MANUAL)' : ''}</div>
            <div>
              <span className="font-bold text-neutral-800">OPSEC:</span>{' '}
              <span className={sector.opsec_active ? 'text-amber-700 font-bold' : 'text-neutral-700'}>
                {sector.opsec_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-neutral-300/50 flex items-center justify-between">
              <span><span className="font-bold text-neutral-800">CONFIDENCE:</span> {(sector.intel_confidence * 100).toFixed(0)}%</span>
              {sector.intel_confidence < 0.3 && <span className="text-red-700 font-bold bg-red-100 px-1 rounded">LOW</span>}
              {sector.intel_confidence >= 0.3 && sector.intel_confidence < 0.7 && <span className="text-amber-700 font-bold bg-amber-100 px-1 rounded">MED</span>}
              {sector.intel_confidence >= 0.7 && <span className="text-green-700 font-bold bg-green-100 px-1 rounded">HIGH</span>}
            </div>
          </div>
        </div>

        {/* Tabs: one section visible at a time (no stacking) */}
        <div className="shrink-0 border-b border-neutral-300 bg-neutral-100/80 relative z-10 flex flex-wrap gap-0" role="tablist" aria-label="Sector intelligence sections">
          {([
            ['overview', 'Overview'],
            ['forces', 'ORBAT'],
            ['logistics', 'Logistics'],
            ['ops', 'Operations'],
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
                    <span>Combat Power Assessment</span>
                    <span className="text-[8px] font-normal text-neutral-400 normal-case">Baseline: 1.0 = Standard Brigade</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Strength</span>
                      <div className="font-medium">
                        {sector.intel_confidence < 0.3 ? (
                          <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">REDACTED</span>
                        ) : (
                          <StrengthBadge strengthClass={sector.combat_strength_class} />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Personnel</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_personnel} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col" title={`Equivalency: ~${((sector.combat_offensive_power ?? 0) / 1000).toFixed(1)} Standard Brigades`}>
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Offensive Power</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_offensive_power} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col" title={`Equivalency: ~${((sector.combat_defensive_power ?? sector.defensive_power ?? 0) / 1000).toFixed(1)} Standard Brigades`}>
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Defensive Power</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_defensive_power ?? sector.defensive_power} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Def/Edge</span>
                      <div className="font-medium tabular-nums">
                        <FuzzyIntel value={sector.combat_defense_per_edge} confidence={sector.intel_confidence} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Force Balance</span>
                      <div className="pt-0.5">
                        {sector.intel_confidence < 0.4 ? (
                          <span className="bg-neutral-800 text-neutral-800 select-none px-1 rounded-sm">REDACTED</span>
                        ) : (
                          <ThreatBadge ratio={sector.threat_ratio} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unit Condition */}
                <div className="mb-2 p-2 bg-neutral-100 border border-neutral-300 rounded">
                  <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1.5 border-b border-neutral-300 pb-1">Unit Condition</div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Morale</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_morale_avg ?? 50) < 25 ? 'text-red-600' : (sector.combat_morale_avg ?? 50) < 50 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_morale_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Cohesion</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_cohesion_avg ?? 50) < 25 ? 'text-red-600' : (sector.combat_cohesion_avg ?? 50) < 50 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_cohesion_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-neutral-500">Fatigue</span>
                      <div className={`font-medium tabular-nums ${(sector.combat_fatigue_avg ?? 0) > 20 ? 'text-red-600' : (sector.combat_fatigue_avg ?? 0) > 10 ? 'text-amber-600' : ''}`}>
                        <FuzzyIntel value={sector.combat_fatigue_avg} confidence={sector.intel_confidence} fuzzyThreshold={0.4} redactThreshold={0.4} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sector Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Front Length</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.2 ? <span className="bg-black text-black select-none">REDACTED</span> : `~${sector.length_edges} km`}
                    </span>
                    <span className="text-[9px] text-neutral-500">[{sector.sub_segment_count === 1 ? 'Contiguous' : `${sector.sub_segment_count} Segments`}]</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Brigades</span>
                    <span className="font-medium">{sector.assigned_brigade_ids.length} Front / {sector.reserve_brigade_ids.length} Reserve</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Sector Stance</span>
                    <span className="font-medium uppercase">
                      {sectorStanceLabel}
                      {currentStanceSource === 'player' && <span className="ml-1 text-[8px] text-amber-700 bg-amber-100 px-0.5 rounded font-bold">MANUAL</span>}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Supply Priority</span>
                    <span className="font-medium">{(sector.logistics_priority ?? 1).toFixed(1)}x</span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Linked Settlements</span>
                    <span className="font-medium">{sectorFriendlyOsids.length}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-neutral-300 space-y-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Sector Stance Orders</span>
                    <div className="grid grid-cols-3 gap-1">
                      {SECTOR_STANCES.map((stance) => {
                        const isAllowed = allowedStances.has(stance);
                        const isActive = currentSectorStance === stance;
                        return (
                          <button
                            key={stance}
                            type="button"
                            disabled={!isAllowed}
                            onClick={() => void issueSectorStance(stance)}
                            title={isAllowed ? STANCE_DESCRIPTIONS[stance] : `Not allowed under ${corpsStance} corps stance`}
                            className={`kbd-focus px-1.5 py-1 rounded border text-[9px] font-bold uppercase transition-colors ${!isAllowed
                                ? 'border-neutral-200 bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                : isActive
                                  ? 'border-accent-gold bg-amber-50 text-amber-800 ring-1 ring-accent-gold'
                                  : 'border-neutral-400 bg-neutral-200/50 hover:bg-neutral-300/60 text-neutral-700'
                              }`}
                          >
                            {STANCE_LABELS[stance]}
                          </button>
                        );
                      })}
                    </div>
                    {currentStanceSource === 'player' && (
                      <button
                        type="button"
                        onClick={() => void resetToAI()}
                        className="kbd-focus mt-1 w-full px-2 py-0.5 rounded border border-neutral-300 bg-neutral-50 hover:bg-neutral-300/50 text-[9px] text-neutral-600 font-semibold uppercase"
                      >
                        Return to AI Control
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Reinforcement Priority</span>
                    <div className="flex gap-1">
                      {[0.5, 1, 2].map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => void issueLogisticsPriority(priority)}
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
                    {sector.opsec_active ? 'Disable OPSEC' : 'Enable OPSEC'}
                  </button>
                  {sectorActionMessage && (
                    <div className="text-[10px] text-neutral-600 italic">{sectorActionMessage}</div>
                  )}
                </div>

                {sector.opposing_factions.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-neutral-300">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Identified Hostiles</span>
                    <div className="flex flex-wrap gap-2">
                      {sector.opposing_factions.map((f) => (
                        <span key={f} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FACTION_COLORS[f]?.replace('text-', 'bg-').replace('-400', '-900') ?? 'bg-neutral-800'} text-white`}>
                          {f}
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
                      Active Frontline Elements ({assignedFormations.length})
                    </div>
                    <div className="space-y-[1px] max-h-[200px] overflow-auto">
                      {assignedFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-label={`Assigned brigade ${f.name}${f.personnel != null ? `, personnel ${f.personnel.toLocaleString()}` : ''}`}
                          className="kbd-focus w-full flex justify-between items-center bg-neutral-200/40 hover:bg-neutral-300/50 transition-colors text-left px-1 py-0.5 rounded"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                          onMouseLeave={() => setHoveredOsids([])}
                        >
                          <span className="truncate mr-2 font-medium">{f.name}</span>
                          <span className="text-neutral-500 text-[10px] tabular-nums shrink-0">
                            {sector.intel_confidence < 0.5 ? <span className="bg-black text-black select-none px-1">RED</span> : (f.personnel != null ? `${f.personnel.toLocaleString()} PAX` : '—')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {reserveFormations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[9px] uppercase font-bold text-neutral-500 mb-2 border-b border-neutral-300 pb-1">
                      Deployed Reserves ({reserveFormations.length})
                    </div>
                    <div className="space-y-[1px] max-h-[120px] overflow-auto opacity-80 hover:opacity-100 transition-opacity">
                      {reserveFormations.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-label={`Reserve brigade ${f.name}${f.personnel != null ? `, personnel ${f.personnel.toLocaleString()}` : ''}`}
                          className="kbd-focus w-full flex justify-between items-center hover:bg-neutral-300/50 transition-colors text-left px-1 py-0.5 rounded"
                          onClick={() => useGameStore.setState({
                            selectedCorpsId,
                            selectedCorpsFrontSectorId: selectedSectorId,
                            selectedFormationId: f.id,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                          onMouseLeave={() => setHoveredOsids([])}
                        >
                          <span className="truncate mr-2 text-neutral-600 italic leading-none">{f.name}</span>
                          <span className="text-neutral-400 text-[9px] tabular-nums shrink-0 leading-none">
                            {sector.intel_confidence < 0.6 ? <span className="bg-black text-black select-none px-1">RED</span> : (f.personnel != null ? `${f.personnel.toLocaleString()} PAX` : '—')}
                          </span>
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
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Total Manpower</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.4 ? <span className="bg-black text-black select-none">REDACTED</span> : totalSectorPersonnel.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Reserve Ratio</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.5 ? <span className="bg-black text-black select-none">REDACTED</span> : `${Math.round(reserveRatio * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Ops Supply Readiness</span>
                  <span className="font-medium">
                    {sector.intel_confidence < 0.6 ? <span className="bg-black text-black select-none">REDACTED</span> : (avgOperationSupply != null ? `${Math.round(avgOperationSupply * 100)}%` : '—')}
                  </span>
                </div>
                {entrenchmentSummary && (
                  <>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">Avg Entrenchment</span>
                      <span className="font-medium">{entrenchmentSummary.avgEntrenchment.toFixed(1)} turns</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">Avg Dig-in</span>
                      <span className="font-medium">{Math.round(entrenchmentSummary.avgDigIn * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-neutral-300/50 pb-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">Dig-in Posture</span>
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
                {relatedOperations.length === 0 ? (
                  <div className="text-[10px] text-neutral-500 italic uppercase">/// NO ACTIVE DIRECTIVES IDENTIFIED ///</div>
                ) : (
                  relatedOperations.map((op) => {
                    const phaseBg = getOperationPhaseBadgeClass(op.phase);
                    const operationId = getOperationId(op);
                    const objective = op.objectives?.[op.current_objective_index ?? 0] ?? op.objectives?.[0];
                    return (
                      <div key={operationId} className="bg-neutral-100 border-2 border-neutral-300 p-2 relative shadow-sm">
                        {/* Stamp effect */}
                        <div className={`absolute top-1 right-2 opacity-20 font-black text-xl -rotate-12 select-none uppercase ${op.phase === 'execution' ? 'text-red-600' : 'text-amber-600'}`}>
                          {op.phase}
                        </div>

                        <div className="font-bold text-[12px] uppercase tracking-wide mb-1 flex items-center gap-2">
                          <span>{sector.intel_confidence < 0.2 ? <span className="bg-black text-black select-none">OP. REDACTED</span> : op.name}</span>
                          <span className={`px-1 rounded text-[8px] text-white ${phaseBg}`}>{op.phase}</span>
                        </div>

                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-0.5 mt-2">Forces Committed</div>
                        <div className="text-[10px]">{sector.intel_confidence < 0.4 ? <span className="bg-black text-black select-none">REDACTED</span> : `${op.participating_brigade_count} Brigades`}</div>

                        {op.supply_readiness != null && (
                          <>
                            <div className="text-[9px] uppercase font-bold text-neutral-500 mt-2 mb-0.5">Supply Status</div>
                            <div className="text-[10px]">{sector.intel_confidence < 0.7 ? <span className="bg-black text-black select-none">REDACTED</span> : `${Math.round(op.supply_readiness * 100)}% Readiness`}</div>
                          </>
                        )}

                        {op.preparation_sub_phase && op.phase === 'planning' && (
                          <div className="mt-2 pt-2 border-t border-neutral-200 border-dashed">
                            <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">Preparation</div>
                            <PreparationProgressBar subPhase={op.preparation_sub_phase} turnsElapsed={op.preparation_turns_elapsed ?? 0} maxTurns={op.preparation_max_turns ?? 8} />
                            {op.commander_assessment && (
                              <div className={`text-[9px] mt-1 font-bold uppercase ${op.commander_assessment === 'launch' ? 'text-green-700' : op.commander_assessment === 'abort' ? 'text-red-700' : 'text-amber-700'}`}>
                                Cdr Assessment: {op.commander_assessment}
                              </div>
                            )}
                            {op.has_active_probe && (
                              <div className="text-[9px] mt-0.5 text-blue-700 font-semibold uppercase">Probe in progress</div>
                            )}
                            {op.force_ratio_estimate != null && (
                              <div className="text-[9px] mt-0.5 text-neutral-600">Force Ratio Est: {op.force_ratio_estimate.toFixed(2)}</div>
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
                                {op.preparation_sub_phase === 'assessment' ? 'Assessment Ready \u2014 Review' : 'Review Briefing'}
                              </button>
                            )}
                          </div>
                        )}

                        {objective && (
                          <div className="mt-3 pt-2 border-t border-neutral-300 border-dashed">
                            <button
                              type="button"
                              aria-label={`Focus map on objective ${osidDisplayNames?.[objective] ?? objective}`}
                              onClick={() => panToOsid?.(objective)}
                              className="kbd-focus text-[9px] uppercase font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                            >
                              <span className="text-[11px]">⌖</span> Focus Obj: {sector.intel_confidence < 0.3 ? <span className="bg-black text-black select-none">REDACT</span> : (osidDisplayNames?.[objective] ?? objective)}
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
                    Draft New Directive (Ops Planning)
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
