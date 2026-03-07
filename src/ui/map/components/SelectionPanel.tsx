import { useGameStore } from '../store/gameStore';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { SettlementDetailContent } from './SettlementDetailContent';
import { getFactionFlag } from '../utils/factionAssets';
import { useIPC } from '../desktop/useIPC';
import { useState } from 'react';
import { getMunicipalitySupportLabel, getMunicipalitySupportTypeForFaction } from '../../../sim/combat/municipality_support.js';
import { getRightPanelStyle, getPanelRailStyle } from './panelRail';
import { buildOsidToSectorMap } from '../utils/sectorUtils';
import { getCurrentEthnicForOsid } from '../map/builders/buildEthnicGeoJSON';

interface SelectionPanelProps {
  railSlot?: 'primary' | 'secondary';
}

export function SelectionPanel({ railSlot = 'secondary' }: SelectionPanelProps) {
  const ipc = useIPC();
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  if (!selectedOsid) return null;

  if (!loadedGameState || !osidPropertiesMap?.[selectedOsid]) {
    return (
      <div
        className="panel-power-on weathered-panel panel-slide-in-right flex flex-col rounded-lg shadow-xl overflow-hidden"
        style={{ ...getPanelRailStyle(railSlot, '20rem'), direction: 'ltr' }}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-4 space-y-4">
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="h-40 w-full bg-panel-card rounded panel-shimmer" />
        </div>
      </div>
    );
  }

  const formations = getFormationsAtOsid(loadedGameState?.formations, selectedOsid);
  const playerFaction =
    loadedGameState?.player_faction === 'RBiH' || loadedGameState?.player_faction === 'RS' || loadedGameState?.player_faction === 'HRHB'
      ? loadedGameState.player_faction
      : null;
  const selectedMunId = selectedOsid.split(':')[1] ?? null;
  const rawActiveSupport = playerFaction ? loadedGameState?.municipalitySupportOrders?.[playerFaction] : undefined;
  const activeSupport = rawActiveSupport?.staged_turn === loadedGameState?.turn ? rawActiveSupport : undefined;
  const supportType = playerFaction ? getMunicipalitySupportTypeForFaction(playerFaction) : null;
  const supportLabel = playerFaction ? getMunicipalitySupportLabel(playerFaction) : 'Local support';
  const canStageSupport = Boolean(ipc.isAvailable && playerFaction && selectedMunId && supportType);
  const formationsForDetail = formations.map((f) => ({
    id: f.id,
    name: f.name,
    faction: f.faction,
    personnel: f.personnel,
    kind: f.kind,
    readiness: f.readiness,
    cohesion: f.cohesion,
  }));

  const operationsTargetingOsid =
    loadedGameState?.operations
      ?.filter((op) => op.objectives?.includes(selectedOsid))
      .map((op) => ({ name: op.name, faction: op.faction, phase: op.phase }))
    ?? [];
  const recentControlEventsForOsid =
    loadedGameState?.recentControlEvents
      ?.filter((e) => e.settlementId === selectedOsid)
      .slice(-8)
      .reverse()
      .map((e) => ({ turn: e.turn, from: e.from, to: e.to, mechanism: e.mechanism }))
    ?? [];
  const statusLabel = loadedGameState?.statusBySettlement?.[selectedOsid] ?? null;

  const sectorInfo = (() => {
    const sectors = loadedGameState?.corpsFrontSectors;
    const edgesOsid = loadedGameState?.frontEdgesOsid;
    if (!sectors?.length || !edgesOsid?.length) return { sectorName: null as string | null, sectorFaction: null as string | null };
    const osidToSector = buildOsidToSectorMap(sectors, edgesOsid);
    const sectorId = osidToSector.get(selectedOsid);
    if (!sectorId) return { sectorName: null, sectorFaction: null };
    const sector = sectors.find((s) => s.sector_id === sectorId);
    return { sectorName: sector?.display_name ?? null, sectorFaction: sector?.faction ?? null };
  })();

  const departedByEthnicity = (() => {
    const raw = loadedGameState?.departedByOsid?.[selectedOsid];
    if (!raw) return undefined;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && v > 0) out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const brigadeCountByFaction: Record<string, number> = {};
  for (const f of formationsForDetail) {
    brigadeCountByFaction[f.faction] = (brigadeCountByFaction[f.faction] ?? 0) + 1;
  }

  const pendingOrders = (() => {
    if (!loadedGameState) return undefined;
    const attack =
      loadedGameState.attackOrders?.filter((o) => o.targetSettlementId === selectedOsid).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: loadedGameState.formations?.find((fr) => fr.id === o.brigadeId)?.name,
      })) ?? [];
    const move =
      loadedGameState.movementOrdersSettlement?.filter((o) => o.targetSettlementIds?.includes(selectedOsid)).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: loadedGameState.formations?.find((fr) => fr.id === o.brigadeId)?.name,
      })) ?? [];
    const reposition =
      loadedGameState.repositionOrders?.filter((o) => o.settlementIds?.includes(selectedOsid)).map((o) => ({
        brigadeId: o.brigadeId,
        brigadeName: loadedGameState.formations?.find((fr) => fr.id === o.brigadeId)?.name,
      })) ?? [];
    if (attack.length === 0 && move.length === 0 && reposition.length === 0) return undefined;
    return { attack, move, reposition };
  })();

  const militiaPoolsForMun =
    selectedMunId && loadedGameState?.militiaPools?.length
      ? loadedGameState.militiaPools.filter(
        (p) => String(p.munId).toLowerCase().trim() === String(selectedMunId).toLowerCase().trim()
      )
      : [];
  const militiaPoolsProp =
    militiaPoolsForMun.length > 0
      ? militiaPoolsForMun.map((p) => ({
        faction: p.faction,
        available: p.available,
        committed: p.committed,
        exhausted: p.exhausted,
      }))
      : undefined;

  const currentEthnic =
    selectedOsid && osidPropertiesMap
      ? getCurrentEthnicForOsid(
        selectedOsid,
        osidPropertiesMap,
        loadedGameState?.displacementByMun ?? undefined,
        loadedGameState?.departedByOsid ?? undefined
      )
      : null;

  const handleStageSupport = async () => {
    if (!playerFaction || !selectedMunId || !supportType) return;
    const result = await ipc.stageMunicipalitySupportOrder({
      faction: playerFaction,
      munId: selectedMunId,
      type: supportType,
    });
    setSupportMessage(result.ok ? 'Local support staged for next turn resolution.' : (result.error ?? 'Failed to stage local support.'));
  };

  return (
    <div
      className="panel-power-on weathered-panel panel-slide-in-right flex flex-col rounded-lg shadow-xl"
      style={{ ...getRightPanelStyle('20rem'), direction: 'ltr' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          {loadedGameState?.controlBySettlement?.[selectedOsid] && getFactionFlag(loadedGameState.controlBySettlement[selectedOsid]) && (
            <img
              src={getFactionFlag(loadedGameState.controlBySettlement[selectedOsid])}
              alt="Faction Flag"
              className="w-5 h-3.5 object-cover rounded-sm drop-shadow-sm border border-black/20"
            />
          )}
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Settlement Info
          </span>
        </div>
        <button
          onClick={() => setSelectedOsid(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-auto">
        <SettlementDetailContent
          osid={selectedOsid}
          osidDisplayNames={osidDisplayNames}
          osidPropertiesMap={osidPropertiesMap}
          controlBySettlement={loadedGameState?.controlBySettlement}
          formationsAtOsid={formationsForDetail}
          displacementByMun={loadedGameState?.displacementByMun ?? undefined}
          variant="panel"
          statusLabel={statusLabel ?? undefined}
          operationsTargetingOsid={operationsTargetingOsid.length > 0 ? operationsTargetingOsid : undefined}
          recentControlEvents={recentControlEventsForOsid.length > 0 ? recentControlEventsForOsid : undefined}
          departedByEthnicity={departedByEthnicity && Object.keys(departedByEthnicity).length > 0 ? departedByEthnicity : undefined}
          sectorName={sectorInfo.sectorName}
          sectorFaction={sectorInfo.sectorFaction}
          brigadeCountByFaction={Object.keys(brigadeCountByFaction).length > 0 ? brigadeCountByFaction : undefined}
          pendingOrders={pendingOrders}
          militiaPools={militiaPoolsProp}
          onFormationClick={setSelectedFormationId}
          currentEthnic={currentEthnic ?? undefined}
        />
        {playerFaction && selectedMunId && (
          <div className="mt-4 rounded border border-panel-border bg-panel-card p-3 space-y-2">
            <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
              Phase E Local Support
            </div>
            <div className="text-xs text-text-secondary">
              {activeSupport?.label ?? 'Local support'} target: {activeSupport ? activeSupport.mun_id : 'none staged'}
            </div>
            <button
              type="button"
              onClick={() => void handleStageSupport()}
              disabled={!canStageSupport}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wide bg-panel-bg hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-all disabled:opacity-50"
            >
              Stage {supportLabel}
            </button>
            <div className="text-[11px] text-text-secondary">
              Target municipality: {selectedMunId}
            </div>
            {supportMessage && <div className="text-[11px] text-text-secondary">{supportMessage}</div>}
          </div>
        )}
        {!loadedGameState && (
          <div className="text-xs text-text-secondary italic mt-3">
            Load a save file to see control, formations, and population change.
          </div>
        )}
      </div>
    </div>
  );
}
