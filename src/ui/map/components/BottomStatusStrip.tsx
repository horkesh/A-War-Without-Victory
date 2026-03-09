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
  const formationsAtOsid = getFormationsAtOsid(loadedGameState?.military?.formations, selectedOsid ?? '');
  const formationCount = formationsAtOsid.length;
  const controlBySettlement = loadedGameState?.controlBySettlement ?? {};
  const territoryTotals = { RS: 0, RBiH: 0, HRHB: 0 };
  const controlCount = Object.keys(controlBySettlement).length;
  if (controlCount > 0) {
    for (const faction of Object.values(controlBySettlement)) {
      if (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB') territoryTotals[faction] += 1;
    }
  }
  const territoryPct = {
    RS: controlCount > 0 ? (territoryTotals.RS / controlCount) * 100 : 0,
    RBiH: controlCount > 0 ? (territoryTotals.RBiH / controlCount) * 100 : 0,
    HRHB: controlCount > 0 ? (territoryTotals.HRHB / controlCount) * 100 : 0,
  };
  const activeOps = loadedGameState?.operations?.length ?? 0;
  const cumulativeCasualties = Object.values(loadedGameState?.casualtyLedger ?? {}).reduce((sum, row) => {
    const killed = Number.isFinite(row?.killed) ? row.killed : 0;
    const wounded = Number.isFinite(row?.wounded) ? row.wounded : 0;
    const missing = Number.isFinite(row?.missing_captured) ? row.missing_captured : 0;
    return sum + killed + wounded + missing;
  }, 0);

  const line = !selectedOsid
    ? 'No selection — click a settlement on the map'
    : loadedGameState
      ? `${getOsidDisplayName(selectedOsid, osidDisplayNames)} · ${controller ?? '—'}${formationCount > 0 ? ` · ${formationCount} formation${formationCount !== 1 ? 's' : ''}` : ''}`
      : `${getOsidDisplayName(selectedOsid, osidDisplayNames)} — load a save for control and formation data`;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-4 py-1.5 font-mono text-xs text-text-secondary bg-panel-card/90 backdrop-blur-sm border-t border-panel-border"
      style={{ direction: 'ltr' }}
    >
      <div className="min-w-0 truncate">
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
      <div className="shrink-0 whitespace-nowrap">
        <span className={`${FACTION_COLORS_SUBTLE.RS ?? ''}`}>RS {territoryPct.RS.toFixed(1)}%</span>
        <span className="mx-2 text-panel-border">|</span>
        <span className={`${FACTION_COLORS_SUBTLE.RBiH ?? ''}`}>RBiH {territoryPct.RBiH.toFixed(1)}%</span>
        <span className="mx-2 text-panel-border">|</span>
        <span className={`${FACTION_COLORS_SUBTLE.HRHB ?? ''}`}>HRHB {territoryPct.HRHB.toFixed(1)}%</span>
        <span className="mx-2 text-panel-border">·</span>
        <span>{activeOps} active ops</span>
        <span className="mx-2 text-panel-border">·</span>
        <span>{cumulativeCasualties.toLocaleString()} casualties</span>
      </div>
    </div>
  );
}
