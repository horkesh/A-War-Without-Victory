import { useGameStore } from '../store/gameStore';
import { getByOsid } from '../utils/osidLookup';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getFormationsAtOsid } from '../utils/formationAtOsid';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';

/**
 * One-line status bar at the bottom: selected OSID summary or empty state.
 */
export function BottomStatusStrip() {
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  const controller = selectedOsid
    ? getByOsid(loadedGameState?.controlBySettlement, selectedOsid)
    : null;
  const formationsAtOsid = getFormationsAtOsid(loadedGameState?.formations, selectedOsid ?? '');
  const formationCount = formationsAtOsid.length;

  const line = !selectedOsid
    ? 'No selection — click a settlement on the map'
    : loadedGameState
      ? `${getOsidDisplayName(selectedOsid, osidDisplayNames)} · ${controller ?? '—'}${formationCount > 0 ? ` · ${formationCount} formation${formationCount !== 1 ? 's' : ''}` : ''}`
      : `${getOsidDisplayName(selectedOsid, osidDisplayNames)} — load a save for control and formation data`;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center px-4 py-1.5 font-mono text-xs text-text-secondary bg-panel-card/90 backdrop-blur-sm border-t border-panel-border"
      style={{ direction: 'ltr' }}
    >
      {controller && selectedOsid ? (
        <>
          <span className="text-text-primary" title={selectedOsid}>
            {getOsidDisplayName(selectedOsid, osidDisplayNames)}
          </span>
          <span className="mx-2 text-panel-border">·</span>
          <span className={FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'}>
            {controller}
          </span>
          {formationCount > 0 && (
            <>
              <span className="mx-2 text-panel-border">·</span>
              <span className="text-text-secondary">
                {formationCount} formation{formationCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </>
      ) : (
        <span>{line}</span>
      )}
    </div>
  );
}
