import { useGameStore } from '../store/gameStore';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { SettlementDetailContent } from './SettlementDetailContent';

export function SelectionPanel() {
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);

  // Lowest-priority panel: hide when any higher-priority selection is active.
  if (!selectedOsid || selectedFormationId || selectedSectorId) return null;

  const formations = getFormationsAtOsid(loadedGameState?.formations, selectedOsid);
  const formationsForDetail = formations.map((f) => ({
    id: f.id,
    name: f.name,
    faction: f.faction,
    personnel: f.personnel,
    kind: f.kind,
  }));

  return (
    <div
      className="flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={{
        position: 'absolute',
        left: 'auto',
        right: '1rem',
        top: '3.5rem',
        bottom: '1rem',
        width: '20rem',
        zIndex: 50,
        direction: 'ltr',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Settlement Info
        </span>
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
        {!loadedGameState && (
          <div className="text-xs text-text-secondary italic mt-3">
            Load a save file to see control, formations, and population change.
          </div>
        )}
      </div>
    </div>
  );
}
