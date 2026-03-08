/**
 * SupplyPanel — shown when supply map mode is active.
 * Displays per-faction reserve bars (general supply + heavy munitions)
 * and corridor/isolation summary derived from faction supply pressure.
 */
import type { LoadedGameState } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

interface SupplyPanelProps {
  state: LoadedGameState;
}

function ReserveBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor =
    pct >= 50 ? 'bg-green-500' :
    pct >= 20 ? 'bg-yellow-400' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`w-[42px] shrink-0 text-[10px] ${color}`}>{label}</span>
      <div className="relative flex-1 h-1.5 bg-panel-border/40 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-text-secondary">{Math.round(pct)}</span>
    </div>
  );
}

function pressureClass(pressure: number): 'open' | 'strained' | 'cut' {
  if (pressure >= 80) return 'open';
  if (pressure >= 50) return 'strained';
  return 'cut';
}

export function SupplyPanel({ state }: SupplyPanelProps) {
  const reserves = state.factionReserves;
  const pressure = state.warPhaseSupplyPressure ?? {};

  // Corridor summary: count factions by pressure class
  let open = 0, strained = 0, cut = 0;
  for (const val of Object.values(pressure)) {
    const cls = pressureClass(val);
    if (cls === 'open') open++;
    else if (cls === 'strained') strained++;
    else cut++;
  }

  return (
    <div
      className="absolute z-20 rounded border border-panel-border bg-panel-card/95 backdrop-blur-sm p-2.5 space-y-2 text-xs font-mono"
      style={{ bottom: '36px', left: '12px', minWidth: '200px', direction: 'ltr' }}
    >
      <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
        Logistics
      </div>

      {/* Reserve bars per faction */}
      {reserves ? (
        <div className="space-y-2">
          {FACTIONS.map((faction) => {
            const r = reserves[faction];
            const color = FACTION_COLORS[faction] ?? 'text-text-primary';
            return (
              <div key={faction} className="space-y-0.5">
                <span className={`text-[10px] font-semibold ${color}`}>{faction}</span>
                <ReserveBar label="Supply" value={r?.generalSupply ?? 0} color="text-text-secondary" />
                <ReserveBar label="Ammo" value={r?.heavyMunitions ?? 0} color="text-text-secondary" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-text-secondary text-[10px] italic">Reserves disabled</div>
      )}

      {/* Corridor summary */}
      <div className="border-t border-panel-border/50 pt-1.5 text-[10px] text-text-secondary space-x-2">
        <span className="text-green-400">{open} open</span>
        <span className="text-yellow-400">{strained} strained</span>
        <span className="text-red-400">{cut} cut</span>
      </div>
    </div>
  );
}
