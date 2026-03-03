import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { getOperationId, getOperationPhaseBadgeClass } from '../utils/operations';
import { DETAIL_PANEL_STYLE } from './panelRail';

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

const SECTOR_TABS = ['overview', 'forces', 'logistics', 'ops'] as const;
type SectorTab = (typeof SECTOR_TABS)[number];

function compareOperations(a: OperationView, b: OperationView): number {
  return (
    a.phase.localeCompare(b.phase) ||
    a.name.localeCompare(b.name) ||
    a.started_turn - b.started_turn
  );
}

export function CorpsFrontPanel() {
  const operationsPanelOpen = useGameStore((s) => s.operationsPanelOpen);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setOperationsPanelOpen = useGameStore((s) => s.setOperationsPanelOpen);
  const setSelectedOperationId = useGameStore((s) => s.setSelectedOperationId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const panToOsid = useGameStore((s) => s.panToOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const [activeTab, setActiveTab] = useState<SectorTab>('overview');
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Formation detail takes priority — hide sector panel when a formation is selected
  if (operationsPanelOpen || selectedFormationId || !selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;

  const sector = loadedGameState.corpsFrontSectors.find((s) => s.sector_id === selectedSectorId);
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

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedSectorId]);

  const assignedPersonnel = assignedFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const reservePersonnel = reserveFormations.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
  const totalSectorPersonnel = assignedPersonnel + reservePersonnel;
  const reserveRatio = totalSectorPersonnel > 0 ? reservePersonnel / totalSectorPersonnel : 0;
  const frontlineCoverage = sector.length_edges > 0 ? sector.assigned_brigade_ids.length / sector.length_edges : 0;
  const sectorFriendlyOsids = useMemo(
    () => collectSectorFriendlyOsids(sector, loadedGameState.frontEdgesOsid),
    [sector, loadedGameState.frontEdgesOsid]
  );
  const sectorFriendlySet = useMemo(() => new Set(sectorFriendlyOsids), [sectorFriendlyOsids]);
  const relatedOperations = useMemo(
    () =>
      [...(loadedGameState.operations ?? [])]
        .filter((op) => {
          if (op.corps_id !== sector.corps_id) return false;
          if (op.sector_id === sector.sector_id) return true;
          if (!op.objectives || op.objectives.length === 0) return false;
          return op.objectives.some((osid) => sectorFriendlySet.has(osid));
        })
        .sort(compareOperations),
    [loadedGameState.operations, sector.corps_id, sector.sector_id, sectorFriendlySet]
  );
  const avgOperationSupply = relatedOperations.length > 0
    ? relatedOperations.reduce((sum, op) => sum + (op.supply_readiness ?? 0), 0) / relatedOperations.length
    : null;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % SECTOR_TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + SECTOR_TABS.length) % SECTOR_TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = SECTOR_TABS.length - 1;
    const nextTab = SECTOR_TABS[nextIndex];
    setActiveTab(nextTab);
    tabButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={DETAIL_PANEL_STYLE}
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

      <div className="p-4 overflow-auto text-[12px]">
        <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Sector intelligence tabs">
          {SECTOR_TABS.map((tab, index) => {
            const active = activeTab === tab;
            const tabId = `sector-intel-tab-${tab}`;
            const tabPanelId = `sector-intel-panel-${tab}`;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={tabId}
                aria-controls={tabPanelId}
                aria-selected={active}
                ref={(el) => {
                  tabButtonRefs.current[index] = el;
                }}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`kbd-focus px-2 py-1 rounded border text-[10px] uppercase tracking-wide transition-all duration-200 ${
                  active
                    ? 'border-accent-gold bg-panel-active text-accent-gold'
                    : 'border-panel-border bg-panel-card text-text-secondary hover:bg-panel-hover'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Corps identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">
            {sector.display_name}
          </div>
          <div className="text-text-secondary mt-0.5">
            <span className={FACTION_COLORS[sector.faction] ?? 'text-text-primary'}>
              {sector.faction}
            </span>
            {' · '}
            <span className="capitalize">{corpsStance}</span>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div role="tabpanel" id="sector-intel-panel-overview" aria-labelledby="sector-intel-tab-overview">
            <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Front length</span>
                <span className="text-text-primary tabular-nums">
                  {sector.length_edges} edges · {sector.sub_segment_count} segment{sector.sub_segment_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Density</span>
                <span className="text-text-primary tabular-nums">
                  {sector.density.toFixed(2)} <DensityBadge density={sector.density} /> <span className="text-text-secondary">({sector.assigned_brigade_ids.length}/{sector.length_edges})</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Threat ratio</span>
                <span className="tabular-nums"><ThreatBadge ratio={sector.threat_ratio} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Def. power</span>
                <span className="text-text-primary tabular-nums">{Math.round(sector.defensive_power).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Linked settlements</span>
                <span className="text-text-primary tabular-nums">{sectorFriendlyOsids.length}</span>
              </div>
            </div>
            {sector.opposing_factions.length > 0 && (
              <div className="border-t border-panel-border pt-2 mb-3">
                <span className="text-text-secondary">Opposing: </span>
                {sector.opposing_factions.map((f, i) => (
                  <span key={f}>
                    {i > 0 && ', '}
                    <span className={FACTION_COLORS[f] ?? 'text-text-primary'}>{f}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'forces' && (
          <div role="tabpanel" id="sector-intel-panel-forces" aria-labelledby="sector-intel-tab-forces">
            {assignedFormations.length > 0 && (
              <div className="border-t border-panel-border pt-2 mb-3">
                <div className="text-text-secondary mb-1">
                  Assigned ({assignedFormations.length}):
                </div>
                <div className="space-y-0.5 max-h-[200px] overflow-auto">
                  {assignedFormations.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-label={`Assigned brigade ${f.name}${f.personnel != null ? `, personnel ${f.personnel.toLocaleString()}` : ''}`}
                      className="kbd-focus w-full flex justify-between text-text-primary hover:text-interactive transition-colors text-left rounded"
                      onClick={() => setSelectedFormationId(f.id)}
                      onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                      onMouseLeave={() => setHoveredOsids([])}
                    >
                      <span className="truncate mr-2">{f.name}</span>
                      <span className="text-text-secondary tabular-nums shrink-0">
                        {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {reserveFormations.length > 0 && (
              <div className="border-t border-panel-border pt-2">
                <div className="text-text-secondary mb-1">
                  Reserve ({reserveFormations.length}):
                </div>
                <div className="space-y-0.5 max-h-[120px] overflow-auto">
                  {reserveFormations.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-label={`Reserve brigade ${f.name}${f.personnel != null ? `, personnel ${f.personnel.toLocaleString()}` : ''}`}
                      className="kbd-focus w-full flex justify-between text-text-primary/70 hover:text-interactive transition-colors text-left rounded"
                      onClick={() => setSelectedFormationId(f.id)}
                      onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                      onMouseLeave={() => setHoveredOsids([])}
                    >
                      <span className="truncate mr-2">{f.name}</span>
                      <span className="text-text-secondary tabular-nums shrink-0">
                        {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logistics' && (
          <div
            role="tabpanel"
            id="sector-intel-panel-logistics"
            aria-labelledby="sector-intel-tab-logistics"
            className="border-t border-panel-border pt-2 space-y-1"
          >
            <div className="flex justify-between">
              <span className="text-text-secondary">Assigned manpower</span>
              <span className="text-text-primary tabular-nums">{assignedPersonnel.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Reserve manpower</span>
              <span className="text-text-primary tabular-nums">{reservePersonnel.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Reserve ratio</span>
              <span className="text-text-primary tabular-nums">{Math.round(reserveRatio * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Frontline coverage</span>
              <span className="text-text-primary tabular-nums">{Math.round(frontlineCoverage * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Ops supply readiness</span>
              <span className="text-text-primary tabular-nums">
                {avgOperationSupply != null ? `${Math.round(avgOperationSupply * 100)}%` : '—'}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'ops' && (
          <div
            role="tabpanel"
            id="sector-intel-panel-ops"
            aria-labelledby="sector-intel-tab-ops"
            className="border-t border-panel-border pt-2 space-y-1"
          >
            {relatedOperations.length === 0 ? (
              <div className="text-xs text-text-secondary italic">No linked operations for this sector.</div>
            ) : (
              relatedOperations.map((op) => {
                const phaseBg = getOperationPhaseBadgeClass(op.phase);
                const operationId = getOperationId(op);
                const objective = op.objectives?.[op.current_objective_index ?? 0] ?? op.objectives?.[0];
                return (
                  <div key={operationId} className="rounded border border-panel-border bg-panel-card p-2 space-y-1 transition-all duration-200 hover:bg-panel-hover/70">
                    <div className={`text-[11px] font-semibold ${FACTION_COLORS[op.faction] ?? 'text-text-primary'}`}>
                      {op.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1 py-0.5 rounded text-white uppercase font-semibold ${phaseBg}`}>
                        {op.phase}
                      </span>
                      <span className="text-text-secondary">{op.participating_brigade_count} brigades</span>
                      {op.supply_readiness != null && (
                        <span className="text-text-secondary tabular-nums">
                          supply {Math.round(op.supply_readiness * 100)}%
                        </span>
                      )}
                    </div>
                    {objective && (
                      <button
                        type="button"
                        aria-label={`Focus map on objective ${osidDisplayNames?.[objective] ?? objective}`}
                        onClick={() => panToOsid?.(objective)}
                        className="kbd-focus text-[10px] text-interactive hover:underline rounded px-1 py-0.5"
                      >
                        Focus: {osidDisplayNames?.[objective] ?? objective}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Open operation ${op.name} in operations panel`}
                      onClick={() => {
                        setSelectedOperationId(operationId);
                        setOperationsPanelOpen(true);
                      }}
                      className="kbd-focus w-full text-[11px] px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                    >
                      Open in Operations Panel
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
