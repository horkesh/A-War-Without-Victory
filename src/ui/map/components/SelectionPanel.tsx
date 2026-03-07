import { useGameStore } from '../store/gameStore';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { SettlementDetailContent } from './SettlementDetailContent';
import { getFactionFlag } from '../utils/factionAssets';
import { useIPC } from '../desktop/useIPC';
import { useState } from 'react';
import { getMunicipalitySupportLabel, getMunicipalitySupportTypeForFaction } from '../../../sim/combat/municipality_support.js';

export function SelectionPanel() {
  const ipc = useIPC();
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  // Lowest-priority panel: hide when any higher-priority selection is active.
  if (!selectedOsid || selectedFormationId || selectedSectorId) return null;

  if (!loadedGameState || !osidPropertiesMap?.[selectedOsid]) {
    return (
      <div
        className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden"
        style={{
          position: 'absolute',
          left: 'auto',
          right: '1rem',
          top: '3.5rem',
          bottom: '2rem',
          width: '20rem',
          zIndex: 50,
          direction: 'ltr',
        }}
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
  }));

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
      className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl"
      style={{
        position: 'absolute',
        left: 'auto',
        right: '1rem',
        top: '3.5rem',
        bottom: '2rem',
        width: '20rem',
        zIndex: 50,
        direction: 'ltr',
      }}
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
