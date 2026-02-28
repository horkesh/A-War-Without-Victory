import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CorpsCard } from './CorpsCard';
import { BrigadeRow } from './BrigadeRow';
import { FACTION_COLORS } from '../utils/theme';
import type { FormationView, LoadedGameState } from '../data/types';
import { SituationTab } from './SituationTab';
import { getFormationsAtOsid } from '../utils/formationAtOsid';

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

/**
 * Left sidebar: Army/Situation tabs with OOB corps cards and reserve section.
 */
export function OOBSidebar() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'army' | 'situation'>('army');
  const [corpsStanceOverrides, setCorpsStanceOverrides] = useState<Record<string, string>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (activeTab !== 'army') return;
    const root = sidebarRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeTab, selectedFormationId, selectedOsid]);

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

  const hoverBrigade = (formation: FormationView, hovered: boolean) => {
    setHoveredOsids(hovered ? getFormationOsids(formation) : []);
  };

  const renderTabButtons = () => (
    <div className="grid grid-cols-2 gap-1 p-1 border-b border-panel-border bg-panel-bg/90 shrink-0">
      <button
        type="button"
        onClick={() => setActiveTab('army')}
        className={`px-2 py-1 text-[11px] font-sans uppercase tracking-wide border rounded transition-colors ${activeTab === 'army' ? 'bg-panel-active text-accent-gold border-panel-border' : 'bg-panel-card text-text-secondary border-panel-border hover:bg-panel-hover'}`}
      >
        Army
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('situation')}
        className={`px-2 py-1 text-[11px] font-sans uppercase tracking-wide border rounded transition-colors ${activeTab === 'situation' ? 'bg-panel-active text-accent-gold border-panel-border' : 'bg-panel-card text-text-secondary border-panel-border hover:bg-panel-hover'}`}
      >
        Situation
      </button>
    </div>
  );

  if (!loadedGameState) {
    return (
      <div
        className="absolute left-0 top-14 bottom-8 z-10 w-72 flex flex-col bg-panel-bg/95 backdrop-blur-sm border-r border-panel-border overflow-hidden"
        style={{ direction: 'ltr' }}
      >
        <div className="px-3 py-3 font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold border-b border-panel-border">
          Command
        </div>
        {renderTabButtons()}
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
      {renderTabButtons()}
      {activeTab === 'situation' ? (
        <div className="flex-1 overflow-auto" ref={sidebarRef}>
          <SituationTab state={loadedGameState} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2 space-y-3" ref={sidebarRef}>
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
                  <button
                    type="button"
                    onClick={() => toggle(faction)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded font-mono text-xs font-medium bg-panel-card border border-panel-border text-left hover:bg-panel-hover transition-colors"
                  >
                    <span className={FACTION_COLORS[faction] ?? 'text-text-primary'}>
                      {faction}
                    </span>
                    <span className="text-text-secondary tabular-nums">{formations.length + reserves.length} formations</span>
                    <span className="text-text-secondary">{isCollapsed ? '▶' : '▼'}</span>
                  </button>
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
                            const first = [...brigades].sort((a, b) => a.id.localeCompare(b.id))[0];
                            if (!first) return;
                            setSelectedFormationId(first.id);
                          }}
                          onHoverOsidsChange={(osids) => setHoveredOsids(osids)}
                          onBrigadeSelect={(formationId) => setSelectedFormationId(formationId)}
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
                                onClick={() => setSelectedFormationId(brigade.id)}
                                onHoverChange={(hovered) => hoverBrigade(brigade, hovered)}
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
    </div>
  );
}
