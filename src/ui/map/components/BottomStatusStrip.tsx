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


  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-6 px-4 py-1.5 bg-glass border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      <div className="absolute inset-0 scanline-texture opacity-[0.02] pointer-events-none" />

      {/* 1. SELECTION TELEMETRY */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-1 h-3 bg-interactive/60 rounded-full" />
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-interactive/70 leading-none mb-1">TARGET TELEMETRY</span>
          <div className="flex items-center gap-2 text-xs font-mono truncate">
            {selectedOsid ? (
              <>
                <span className="text-text-primary glow-text uppercase font-bold" title={selectedOsid}>
                  {getOsidDisplayName(selectedOsid, osidDisplayNames)}
                </span>
                {controller && (
                  <>
                    <span className="text-white/20">/</span>
                    <span className={`${FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'} uppercase font-bold`}>
                      {controller}
                    </span>
                  </>
                )}
                {formationCount > 0 && (
                  <>
                    <span className="text-white/10">|</span>
                    <span className="text-text-secondary">
                      {formationCount} DETACHMENTS
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-text-muted italic opacity-50 uppercase tracking-widest text-[10px]">AWAIT SELECTION</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. FRONTLINE CONTROL (Center) */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-4 px-6 border-l border-r border-white/5">
        <div className="flex flex-col items-center mr-4">
          <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-text-secondary mb-1">FRONTLINE CONTROL</span>
          <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-faction-rs/60">RS</span>
              <span className="text-text-primary">{territoryPct.RS.toFixed(1)}%</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-faction-rbih/60">RBiH</span>
              <span className="text-text-primary">{territoryPct.RBiH.toFixed(1)}%</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-faction-hrhb/60">HRHB</span>
              <span className="text-text-primary">{territoryPct.HRHB.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THEATER STATS */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-mono uppercase tracking-widest text-text-secondary">THEATER OPERATIONS</span>
          <span className="text-[11px] font-mono text-text-primary tabular-nums">{activeOps} ACTIVE</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-mono uppercase tracking-widest text-text-secondary">AGGREGATE LOSSES</span>
          <span className="text-[11px] font-mono text-red-500/80 tabular-nums glow-text">{cumulativeCasualties.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
