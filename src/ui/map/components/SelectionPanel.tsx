import { useGameStore } from '../store/gameStore';
import { getByOsid } from '../utils/osidLookup';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';

export function SelectionPanel() {
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);

  if (!selectedOsid) return null;

  const controller = getByOsid(loadedGameState?.controlBySettlement, selectedOsid);
  const status = getByOsid(loadedGameState?.statusBySettlement, selectedOsid);
  const formations = getFormationsAtOsid(loadedGameState?.formations, selectedOsid);

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

      <div className="p-4 space-y-3 overflow-auto">
        <div className="font-mono text-sm text-text-primary" title={selectedOsid}>
          {getOsidDisplayName(selectedOsid, osidDisplayNames)}
        </div>

        {controller && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Controller:</span>
            <span className={`text-xs font-medium ${FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'}`}>
              {controller}
            </span>
            {status && (
              <span className="text-xs text-text-secondary uppercase">{status}</span>
            )}
          </div>
        )}

        {formations.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-panel-border">
            <span className="text-xs text-text-secondary">
              Formations ({formations.length}):
            </span>
            {formations.slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs py-0.5">
                <span className={FACTION_COLORS_SUBTLE[f.faction] ?? 'text-text-primary'}>●</span>
                <span className="text-text-primary truncate">{f.name}</span>
                <span className="text-text-secondary ml-auto">{f.kind}</span>
                {f.personnel != null && (
                  <span className="text-text-secondary">{f.personnel.toLocaleString()}</span>
                )}
              </div>
            ))}
            {formations.length > 8 && (
              <div className="text-xs text-text-secondary pt-0.5">
                +{formations.length - 8} more
              </div>
            )}
          </div>
        )}

        {!controller && !loadedGameState && (
          <div className="text-xs text-text-secondary italic">
            Load a save file to see control and formation data.
          </div>
        )}
      </div>
    </div>
  );
}
