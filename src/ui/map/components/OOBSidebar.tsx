import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CorpsCard } from './CorpsCard';
import { BrigadeRow } from './BrigadeRow';
import { FACTION_COLORS } from '../utils/theme';
import type { FormationView, LoadedGameState, OperationView } from '../data/types';
import { SituationTab } from './SituationTab';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';

const FACTION_ORDER = ['RS', 'RBiH', 'HRHB'] as const;

function getFormationOsids(formation: FormationView): string[] {
  const values = formation.aorSettlementIds ?? (formation.location_osid ? [formation.location_osid] : []);
  return [...new Set(values)].filter((osid) => typeof osid === 'string' && osid.length > 0).sort((a, b) => a.localeCompare(b));
}

function groupFormationsByCorps(formations: FormationView[]): Map<string, FormationView[]> {
  const byCorps = new Map<string, FormationView[]>();
  for (const f of formations) {
    const key = f.corps_id ?? '_ungrouped';
    const list = byCorps.get(key) ?? [];
    list.push(f);
    byCorps.set(key, list);
  }
  for (const list of byCorps.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  return byCorps;
}

function frontNameLookup(state: LoadedGameState): Map<string, string> {
  const out = new Map<string, string>();
  for (const segment of state.assignableFrontSegments ?? []) {
    out.set(segment.front_id, segment.name ?? segment.front_id);
  }
  return out;
}

function getCorpsFrontAssignment(
  brigades: FormationView[],
  state: LoadedGameState,
  namesByFrontId: Map<string, string>
): string | null {
  const assignment = state.brigadeFrontAssignment;
  if (!assignment) return null;
  const counts = new Map<string, number>();
  for (const brigade of brigades) {
    const frontId = assignment[brigade.id];
    if (!frontId) continue;
    counts.set(frontId, (counts.get(frontId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const [bestFrontId] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return namesByFrontId.get(bestFrontId) ?? bestFrontId;
}

// ─────────────────────────────────────────────────────
// Accordion section header
// ─────────────────────────────────────────────────────

function AccordionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 bg-panel-card border-b border-panel-border text-left hover:bg-panel-hover transition-colors shrink-0"
    >
      <span className="font-sans text-[11px] uppercase tracking-wide font-semibold text-accent-gold">
        {label}
      </span>
      <span className="flex items-center gap-2">
        {count != null && (
          <span className="text-[10px] text-text-secondary tabular-nums">{count}</span>
        )}
        <span className="text-text-secondary text-[10px]">{expanded ? '\u25BC' : '\u25B6'}</span>
      </span>
    </button>
  );
}

/**
 * Left sidebar: Collapsible accordion sections — Situation, Army, Sectors.
 */
export function OOBSidebar() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
  const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    situation: false,
    army: true,
    operations: false,
    sectors: false,
  });
  const [corpsStanceOverrides, setCorpsStanceOverrides] = useState<Record<string, string>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const namesByFrontId = useMemo(
    () => (loadedGameState ? frontNameLookup(loadedGameState) : new Map<string, string>()),
    [loadedGameState]
  );
  const corpsFormationById = useMemo(() => {
    const map = new Map<string, FormationView>();
    if (!loadedGameState?.formations) return map;
    for (const formation of loadedGameState.formations) {
      if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        map.set(formation.id, formation);
      }
    }
    return map;
  }, [loadedGameState?.formations]);

  const reserveByFaction = useMemo(() => {
    const map = new Map<string, FormationView[]>();
    if (!loadedGameState?.formations?.length) return map;
    const hasFrontAssignments = Boolean(loadedGameState.brigadeFrontAssignment);
    for (const formation of loadedGameState.formations) {
      if (formation.kind !== 'brigade') continue;
      const frontAssignment = loadedGameState.brigadeFrontAssignment?.[formation.id] ?? null;
      const isReserve = hasFrontAssignments ? !frontAssignment : !formation.corps_id;
      if (!isReserve) continue;
      const list = map.get(formation.faction) ?? [];
      list.push(formation);
      map.set(formation.faction, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return map;
  }, [loadedGameState]);

  const armyByFaction = useMemo(() => {
    if (!loadedGameState?.formations?.length) return null;
    const map = new Map<string, FormationView[]>();
    const reserveIds = new Set(Array.from(reserveByFaction.values()).flatMap((formations) => formations.map((f) => f.id)));
    for (const f of loadedGameState.formations) {
      if (f.kind !== 'brigade') continue;
      if (reserveIds.has(f.id)) continue;
      const list = map.get(f.faction) ?? [];
      list.push(f);
      map.set(f.faction, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.corps_id ?? '').localeCompare(b.corps_id ?? '', undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return map;
  }, [loadedGameState, reserveByFaction]);

  const highlightedFormationIds = useMemo(() => {
    const ids = new Set<string>();
    if (!loadedGameState) return ids;
    if (selectedFormationId) ids.add(selectedFormationId);
    if (!selectedOsid) return ids;
    const formations = getFormationsAtOsid(loadedGameState.formations, selectedOsid);
    for (const formation of formations) ids.add(formation.id);
    return ids;
  }, [loadedGameState, selectedFormationId, selectedOsid]);

  const corpsColorMap = useMemo(
    () => (loadedGameState?.corpsFrontSectors ? buildCorpsColorMap(loadedGameState.corpsFrontSectors) : {}),
    [loadedGameState?.corpsFrontSectors]
  );

  // Group operations by faction
  const operationsByFaction = useMemo(() => {
    const ops = loadedGameState?.operations;
    if (!ops || ops.length === 0) return null;
    const map = new Map<string, OperationView[]>();
    for (const op of ops) {
      const list = map.get(op.faction) ?? [];
      list.push(op);
      map.set(op.faction, list);
    }
    return map;
  }, [loadedGameState?.operations]);

  // Group sectors by faction for the Sectors accordion
  const sectorsByFaction = useMemo(() => {
    const sectors = loadedGameState?.corpsFrontSectors;
    if (!sectors || sectors.length === 0) return null;
    const map = new Map<string, typeof sectors>();
    for (const s of sectors) {
      const list = map.get(s.faction) ?? [];
      list.push(s);
      map.set(s.faction, list);
    }
    return map;
  }, [loadedGameState?.corpsFrontSectors]);

  useEffect(() => {
    if (!expandedSections.army) return;
    const root = sidebarRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [expandedSections.army, selectedFormationId, selectedOsid]);

  // C.2: Auto-expand Sectors accordion + scroll to selected sector
  useEffect(() => {
    if (!selectedCorpsFrontSectorId) return;
    setExpandedSections((prev) => (prev.sectors ? prev : { ...prev, sectors: true }));
    // Defer scroll to allow DOM to update after expansion
    requestAnimationFrame(() => {
      const root = sidebarRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-sector-id="${selectedCorpsFrontSectorId}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }, [selectedCorpsFrontSectorId]);

  const toggle = (faction: string) => {
    setCollapsed((prev) => ({ ...prev, [faction]: !prev[faction] }));
  };

  const setCorpsStance = (corpsId: string, nextStance: string) => {
    setCorpsStanceOverrides((prev) => ({ ...prev, [corpsId]: nextStance }));
  };

  const getCorpsStance = (corpsId: string, faction: string) => {
    if (corpsStanceOverrides[corpsId]) return corpsStanceOverrides[corpsId];
    const corpsFormation = corpsFormationById.get(corpsId);
    return corpsFormation?.corpsStance ?? loadedGameState?.armyStance?.[faction] ?? 'balanced';
  };

  /** Select brigade + its sector atomically (C.1: brigade click → sector on map). */
  const selectBrigadeWithSector = (brigadeId: string) => {
    const sectors = loadedGameState?.corpsFrontSectors;
    const sectorId = sectors?.find(
      (s) => s.assigned_brigade_ids.includes(brigadeId) || s.reserve_brigade_ids.includes(brigadeId)
    )?.sector_id ?? null;
    // Atomic: set both without mutual-exclusion clearing
    useGameStore.setState({
      selectedFormationId: brigadeId,
      selectedCorpsFrontSectorId: sectorId,
      selectedOsid: null,
    });
  };

  const hoverBrigade = (formation: FormationView, hovered: boolean, e?: React.MouseEvent) => {
    setHoveredOsids(hovered ? getFormationOsids(formation) : []);
    if (hovered) {
      setTooltipTargetWithPosition(
        { type: 'formation', id: formation.id },
        e ? { x: e.clientX, y: e.clientY } : undefined
      );
    } else {
      clearTooltipTarget();
    }
  };

  const totalFormations = useMemo(() => {
    let n = 0;
    if (armyByFaction) for (const list of armyByFaction.values()) n += list.length;
    for (const list of reserveByFaction.values()) n += list.length;
    return n;
  }, [armyByFaction, reserveByFaction]);
  const totalOperations = loadedGameState?.operations?.length ?? 0;
  const totalSectors = loadedGameState?.corpsFrontSectors?.length ?? 0;

  if (!loadedGameState) {
    return (
      <div
        className="absolute left-0 top-14 bottom-8 z-10 w-72 flex flex-col bg-panel-bg/95 backdrop-blur-sm border-r border-panel-border overflow-hidden"
        style={{ direction: 'ltr' }}
      >
        <div className="px-3 py-3 font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold border-b border-panel-border">
          Command
        </div>
        <div className="p-3 text-xs text-text-secondary italic">Load a save to see army and situation views.</div>
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 top-14 bottom-8 z-10 w-72 flex flex-col bg-panel-bg/95 backdrop-blur-sm border-r border-panel-border overflow-hidden"
      style={{ direction: 'ltr' }}
    >
      <div className="px-3 py-2 font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold border-b border-panel-border shrink-0">
        Command
      </div>

      <div className="flex-1 overflow-auto" ref={sidebarRef}>
        {/* ── Situation ── */}
        <AccordionHeader
          label="Situation"
          expanded={expandedSections.situation}
          onToggle={() => toggleSection('situation')}
        />
        {expandedSections.situation && (
          <SituationTab state={loadedGameState} />
        )}

        {/* ── Army ── */}
        <AccordionHeader
          label="Army"
          count={totalFormations}
          expanded={expandedSections.army}
          onToggle={() => toggleSection('army')}
        />
        {expandedSections.army && (
          <div className="p-2 space-y-3">
            {!armyByFaction || armyByFaction.size === 0 ? (
              <div className="text-xs text-text-secondary italic">No formations.</div>
            ) : (
              FACTION_ORDER.filter((f) => armyByFaction.has(f) || reserveByFaction.has(f)).map((faction) => {
                const formations = armyByFaction.get(faction) ?? [];
                const reserves = reserveByFaction.get(faction) ?? [];
                const isCollapsed = collapsed[faction];
                const byCorps = groupFormationsByCorps(formations);
                const corpsEntries = Array.from(byCorps.entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                return (
                  <div key={faction} className="space-y-2">
                    <div
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded font-mono text-xs font-medium bg-panel-card border border-panel-border text-left hover:bg-panel-hover transition-colors"
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedArmyId(faction); }}
                        className={`${FACTION_COLORS[faction] ?? 'text-text-primary'} hover:underline`}
                        title={`View ${faction} army summary`}
                      >
                        {faction}
                      </button>
                      <span className="text-text-secondary tabular-nums">{formations.length + reserves.length} formations</span>
                      <button
                        type="button"
                        onClick={() => toggle(faction)}
                        className="text-text-secondary hover:text-text-primary"
                      >
                        {isCollapsed ? '\u25B6' : '\u25BC'}
                      </button>
                    </div>
                    {!isCollapsed && (
                      <>
                        {corpsEntries.map(([corpsId, brigades]) => (
                          <CorpsCard
                            key={corpsId}
                            corpsId={corpsId}
                            corpsName={corpsId === '_ungrouped' ? 'Ungrouped' : undefined}
                            brigades={brigades}
                            faction={faction}
                            frontAssignment={getCorpsFrontAssignment(brigades, loadedGameState, namesByFrontId)}
                            stance={getCorpsStance(corpsId, faction)}
                            onStanceChange={(next) => setCorpsStance(corpsId, next)}
                            onHeaderClick={() => {
                              if (corpsId !== '_ungrouped') {
                                setSelectedCorpsId(corpsId);
                              } else {
                                const first = [...brigades].sort((a, b) => a.id.localeCompare(b.id))[0];
                                if (first) setSelectedFormationId(first.id);
                              }
                            }}
                            onHoverOsidsChange={(osids) => setHoveredOsids(osids)}
                            onBrigadeSelect={(formationId) => selectBrigadeWithSector(formationId)}
                            highlightedFormationIds={highlightedFormationIds}
                            onBrigadeHoverOsids={hoverBrigade}
                          />
                        ))}
                        {reserves.length > 0 && (
                          <div className="rounded-lg border border-panel-border bg-panel-card/90 overflow-hidden">
                            <div className="px-3 py-2 bg-panel-bg border-b border-panel-border flex items-center justify-between gap-2">
                              <span className="font-sans text-xs font-semibold uppercase tracking-wide text-accent-gold">Reserve</span>
                              <button
                                type="button"
                                className="text-[10px] font-mono uppercase bg-panel-card hover:bg-panel-hover text-text-secondary px-1.5 py-0.5 rounded border border-panel-border"
                              >
                                Assign To Front
                              </button>
                            </div>
                            <div className="divide-y divide-panel-border/50">
                              {reserves.map((brigade) => (
                                <BrigadeRow
                                  key={`reserve-${brigade.id}`}
                                  formation={brigade}
                                  compact
                                  highlighted={highlightedFormationIds.has(brigade.id)}
                                  onClick={() => selectBrigadeWithSector(brigade.id)}
                                  onHoverChange={(hovered, e) => hoverBrigade(brigade, hovered, e)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Operations ── */}
        <AccordionHeader
          label="Operations"
          count={totalOperations > 0 ? totalOperations : undefined}
          expanded={expandedSections.operations}
          onToggle={() => toggleSection('operations')}
        />
        {expandedSections.operations && (
          <div className="p-2 space-y-2 text-xs">
            {!operationsByFaction ? (
              <div className="text-text-secondary italic px-1">No active operations.</div>
            ) : (
              FACTION_ORDER.filter((f) => operationsByFaction.has(f)).map((faction) => {
                const ops = operationsByFaction.get(faction)!;
                return (
                  <div key={faction} className="space-y-1">
                    <div className={`font-mono text-[11px] font-medium px-1 ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                      {faction}
                    </div>
                    {ops.map((op) => {
                      const phaseBg = op.phase === 'execution' ? 'bg-red-800/60' : op.phase === 'planning' ? 'bg-yellow-700/60' : 'bg-neutral-600/60';
                      const objTotal = op.objectives?.length ?? 0;
                      const objCurrent = op.current_objective_index ?? 0;
                      return (
                        <div
                          key={`${op.corps_id}-${op.name}`}
                          className="rounded border border-panel-border bg-panel-card p-2 space-y-1"
                        >
                          <div className={`font-sans text-[11px] font-semibold ${FACTION_COLORS[op.faction] ?? 'text-text-primary'}`}>
                            {op.name}
                          </div>
                          <div className="text-text-secondary text-[10px]">
                            {op.corps_name} &middot; {op.faction}
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded text-white uppercase font-semibold ${phaseBg}`}>
                              {op.phase}
                            </span>
                            {op.momentum != null && (
                              <span className="text-text-secondary">Mom: {op.momentum}</span>
                            )}
                          </div>
                          <div className="text-text-secondary text-[10px] tabular-nums">
                            {objTotal > 0 && `Obj: ${objCurrent}/${objTotal}`}
                            {op.supply_readiness != null && ` · Supply: ${(op.supply_readiness * 100).toFixed(0)}%`}
                            {` · ${op.participating_brigade_count} brigades`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Sectors ── */}
        <AccordionHeader
          label="Sectors"
          count={totalSectors > 0 ? totalSectors : undefined}
          expanded={expandedSections.sectors}
          onToggle={() => toggleSection('sectors')}
        />
        {expandedSections.sectors && (
          <div className="p-2 space-y-2 text-xs">
            {!sectorsByFaction ? (
              <div className="text-text-secondary italic px-1">No sector data.</div>
            ) : (
              FACTION_ORDER.filter((f) => sectorsByFaction.has(f)).map((faction) => {
                const sectors = sectorsByFaction.get(faction)!;
                return (
                  <div key={faction} className="space-y-1">
                    <div className={`font-mono text-[11px] font-medium px-1 ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                      {faction}
                    </div>
                    {sectors.map((sector) => {
                      const color = corpsColorMap[sector.corps_id] ?? '#888';
                      return (
                        <button
                          key={sector.sector_id}
                          type="button"
                          data-sector-id={sector.sector_id}
                          onClick={() => setSelectedCorpsFrontSectorId(sector.sector_id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition-colors text-left ${
                            selectedCorpsFrontSectorId === sector.sector_id
                              ? 'border-accent-gold bg-panel-active'
                              : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                          }`}
                        >
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-text-primary truncate text-[11px]">
                              {sector.display_name}
                            </div>
                            <div className="text-text-secondary text-[10px] tabular-nums">
                              {sector.assigned_brigade_ids.length} assigned
                              {sector.reserve_brigade_ids.length > 0 && ` + ${sector.reserve_brigade_ids.length} reserve`}
                              {' \u00B7 '}{sector.length_edges} edges
                              {' \u00B7 d='}{sector.density.toFixed(2)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
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
