import { useEffect, useMemo, useState } from 'react';
import type { OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { getOperationId, getOperationPhaseBadgeClass } from '../utils/operations';
import { getPanelRailStyle } from './panelRail';
import { useIPC } from '../desktop/useIPC';

/** Density badge with color coding. */
function DensityBadge({ density }: { density: number }) {
  if (density < 0.5) return <span className="text-red-400 font-semibold">THIN</span>;
  if (density > 1.0) return <span className="text-green-400 font-semibold">DENSE</span>;
  return <span className="text-amber-300">Normal</span>;
}

/** Threat ratio badge with color coding. */
function ThreatBadge({ ratio }: { ratio: number }) {
  if (ratio > 1.5) return <span className="text-red-400 font-semibold">{ratio.toFixed(2)}</span>;
  if (ratio > 0.8) return <span className="text-amber-300">{ratio.toFixed(2)}</span>;
  return <span className="text-green-400">{ratio.toFixed(2)}</span>;
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
  const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
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

  const corpsFormation = loadedGameState.military.formations.find((f) => f.id === sector.corps_id);
  const corpsStance = corpsFormation?.corpsStance ?? 'unknown';
  const corpsColorMap = buildCorpsColorMap(loadedGameState.corpsFrontSectors);
  const corpsColor = corpsColorMap[sector.corps_id] ?? '#888';

  const assignedFormations = sector.assigned_brigade_ids
    .map((id) => loadedGameState.military.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const reserveFormations = sector.reserve_brigade_ids
    .map((id) => loadedGameState.military.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const assignedPersonnel = assignedFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const reservePersonnel = reserveFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const totalSectorPersonnel = assignedPersonnel + reservePersonnel;
  const reserveRatio = totalSectorPersonnel > 0 ? reservePersonnel / totalSectorPersonnel : 0;
  const avgOperationSupply = relatedOperations.length > 0
    ? relatedOperations.reduce((sum, op) => sum + (op.supply_readiness ?? 0), 0) / relatedOperations.length
    : null;
  const entrenchmentSummary = loadedGameState.sectorEntrenchmentSummary?.[sector.sector_id];
  const postureCounts = assignedFormations.reduce<Record<string, number>>((acc, formation) => {
    const posture = formation.posture ?? 'hold';
    acc[posture] = (acc[posture] ?? 0) + 1;
    return acc;
  }, {});
  const effectiveSectorStance = Object.entries(postureCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'hold';

  const issueSectorStance = async (stance: 'dig_in' | 'elastic_defense' | 'defend_at_all_costs' | 'hold') => {
    const result = await ipc.stageSectorStanceOrder(sector.sector_id, stance);
    setSectorActionMessage(result.ok ? `Sector stance staged: ${stance}` : (result.error ?? 'Failed to stage sector stance'));
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
            <div><span className="font-bold text-neutral-800">STANCE:</span> {corpsStance}</div>
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
                ? 'border-accent-gold text-neutral-900 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
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
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Front Length</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.2 ? <span className="bg-black text-black select-none">REDACTED</span> : `~${sector.length_edges} km`}
                    </span>
                    <span className="text-[9px] text-neutral-500">[{sector.sub_segment_count === 1 ? 'Contiguous' : `${sector.sub_segment_count} Segments`}]</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Density</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.25 ? <span className="bg-black text-black select-none">REDACTED</span> : (
                        <>
                          {sector.density.toFixed(2)} <DensityBadge density={sector.density} />
                        </>
                      )}
                    </span>
                    <span className="text-[9px] text-neutral-500">[{sector.assigned_brigade_ids.length} Frontline]</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Risk Ratio</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.4 ? <span className="bg-black text-black select-none">REDACTED</span> : <ThreatBadge ratio={sector.threat_ratio} />}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Defensive Power</span>
                    <span className="font-medium">
                      {sector.intel_confidence < 0.3 ? <span className="bg-black text-black select-none">REDACTED</span> : Math.round(sector.defensive_power).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Linked Settlements</span>
                    <span className="font-medium">{sectorFriendlyOsids.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Sector Stance</span>
                    <span className="font-medium uppercase">{effectiveSectorStance.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Supply Priority</span>
                    <span className="font-medium">{(sector.logistics_priority ?? 1).toFixed(1)}x</span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">OPSEC</span>
                    <span className="font-medium uppercase">{sector.opsec_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-neutral-300 space-y-2">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Sector Orders</span>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        ['dig_in', 'Dig In'],
                        ['elastic_defense', 'Elastic'],
                        ['defend_at_all_costs', 'At All Costs'],
                        ['hold', 'Hold'],
                      ] as const).map(([stance, label]) => (
                        <button
                          key={stance}
                          type="button"
                          onClick={() => void issueSectorStance(stance)}
                          className="kbd-focus px-2 py-1 rounded border border-neutral-400 bg-white/80 hover:bg-neutral-200 text-[10px] font-bold uppercase"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Reinforcement Priority</span>
                    <div className="flex gap-1">
                      {[0.5, 1, 2].map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => void issueLogisticsPriority(priority)}
                          className="kbd-focus flex-1 px-2 py-1 rounded border border-neutral-400 bg-white/80 hover:bg-neutral-200 text-[10px] font-bold"
                        >
                          {priority.toFixed(1)}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleOpsec()}
                    className="kbd-focus w-full rounded border border-neutral-400 bg-white/80 hover:bg-neutral-200 px-2 py-1 text-[10px] font-bold uppercase"
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
                          className="kbd-focus w-full flex justify-between items-center bg-white/50 hover:bg-neutral-200 transition-colors text-left px-1 py-0.5 rounded"
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
                          className="kbd-focus w-full flex justify-between items-center hover:bg-neutral-200 transition-colors text-left px-1 py-0.5 rounded"
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
                      <div key={operationId} className="bg-white border-2 border-neutral-300 p-2 relative shadow-sm">
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
                    onClick={() => setOpsPlanningModalOpen(true)}
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
