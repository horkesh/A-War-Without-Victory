/**
 * ExhaustionClock — candle visual for war exhaustion.
 * Placed in the Army HQ BRIEFING tab grid between Army Crest and Strategic Position.
 * The candle burns down as exhaustion accumulates (irreversible).
 */

interface ExhaustionClockProps {
  /** Raw exhaustion value (0 = fresh, monotonically increasing). */
  exhaustion: number;
  /** Faction ID for thematic color accent. */
  faction: string;
}

export function ExhaustionClock({ exhaustion, faction }: ExhaustionClockProps) {
  const DISPLAY_MAX = 800;
  const remaining = Math.max(0, Math.min(1, 1 - (exhaustion / DISPLAY_MAX)));
  const heightPct = `${Math.round(remaining * 100)}%`;

  const state =
    remaining > 0.75 ? 'strong' :
    remaining > 0.50 ? 'steady' :
    remaining > 0.25 ? 'waning' :
    remaining > 0.05 ? 'critical' : 'spent';

  const waxColor: string = {
    strong:   'bg-amber-200',
    steady:   'bg-amber-300',
    waning:   'bg-orange-400',
    critical: 'bg-red-500',
    spent:    'bg-red-900/50',
  }[state];

  const flameColor: string = {
    strong:   'bg-amber-400',
    steady:   'bg-amber-500',
    waning:   'bg-orange-500',
    critical: 'bg-red-400',
    spent:    'bg-transparent',
  }[state];

  const shouldPulse = state === 'waning' || state === 'critical';

  const tooltip = `War Exhaustion: ${Math.round(exhaustion)}\nState: ${state.toUpperCase()}\nExhaustion is irreversible. Every turn of war,\nevery static front, every supply crisis adds to it.\nWhen it runs out, your faction cannot fight.`;

  // faction is available for future thematic accent; currently unused
  void faction;

  return (
    <div
      className="bg-panel-card border border-panel-border rounded-lg p-3 flex flex-col items-center justify-between h-full min-h-[160px]"
      title={tooltip}
    >
      {/* Title */}
      <div className="text-[8px] uppercase tracking-[0.25em] text-text-secondary font-bold text-center">
        WAR
        <br />
        EXHAUSTION
      </div>

      {/* Candle container */}
      <div className="relative flex-1 w-[20px] my-2 flex flex-col justify-end">
        {/* Wax */}
        <div
          className={`w-full rounded-sm ${waxColor} transition-all duration-1000 ease-out`}
          style={{ height: heightPct }}
        >
          {/* Flame cap */}
          {state !== 'spent' && (
            <div
              className={`absolute -top-3 left-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full ${flameColor} blur-[3px] ${shouldPulse ? 'animate-pulse' : ''}`}
            />
          )}
        </div>
        {/* Candlestick base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28px] h-[4px] bg-amber-900/60 rounded-sm" />
      </div>

      {/* State label */}
      <div className={`text-[9px] font-bold uppercase tracking-wide ${
        state === 'critical' || state === 'spent' ? 'text-red-400' :
        state === 'waning' ? 'text-orange-400' : 'text-amber-400/70'
      }`}>
        {state.toUpperCase()}
      </div>

      {/* Numeric value */}
      <div className="text-[10px] font-mono tabular-nums text-text-secondary">
        {Math.round(exhaustion)}
      </div>
    </div>
  );
}
