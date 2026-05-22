import { useGameStore } from '../store/gameStore';

interface LegendStop {
  color: string;
  label: string;
  value?: string;
}

const LEGENDS: Record<string, { title: string; stops: LegendStop[] } | null> = {
  political: null,
  ethnic: { title: 'Majority Ethnicity', stops: [
    { color: '#8B3232', label: 'Serb' },
    { color: '#378C4B', label: 'Bosniak' },
    { color: '#326EAA', label: 'Croat' },
  ]},
  supply: { title: 'Supply Status', stops: [
    { color: '#1a4a1a', label: 'Critical', value: '<20' },
    { color: '#4aaa4a', label: 'Adequate', value: '20-60' },
    { color: '#6ddd6d', label: 'Surplus', value: '>60' },
  ]},
  casualties: { title: 'Civilian Casualties', stops: [
    { color: 'rgba(255,220,200,0.3)', label: 'None', value: '0' },
    { color: 'rgba(200,50,50,0.6)', label: 'Severe', value: '100+' },
  ]},
  morale: { title: 'Average Morale', stops: [
    { color: '#aa2222', label: 'Broken', value: '<30' },
    { color: '#ddaa33', label: 'Shaky', value: '30-60' },
    { color: '#44aa44', label: 'Steady', value: '>60' },
  ]},
  operations: { title: 'Operational Effort', stops: [
    { color: 'rgba(80,124,173,0.4)', label: 'Holding' },
    { color: 'rgba(209,139,53,0.45)', label: 'Supporting' },
    { color: 'rgba(191,57,43,0.5)', label: 'Main Effort' },
  ]},
  defense: { title: 'Defense Density', stops: [
    { color: '#44aa44', label: 'Dense', value: '>1.0' },
    { color: '#ddaa33', label: 'Moderate', value: '0.5-1.0' },
    { color: '#aa2222', label: 'Thin', value: '<0.5' },
  ]},
  authority: { title: 'Authority', stops: [
    { color: '#7f1d1d', label: 'Weak', value: '<35' },
    { color: '#a16207', label: 'Contested', value: '35-69' },
    { color: '#166534', label: 'Firm', value: '70+' },
  ]},
  legitimacy: { title: 'Legitimacy', stops: [
    { color: '#7f1d1d', label: 'Coerced', value: '<35' },
    { color: '#a16207', label: 'Uneasy', value: '35-69' },
    { color: '#166534', label: 'Accepted', value: '70+' },
  ]},
};

export function MapModeLegend() {
  const mapMode = useGameStore((s) => s.mapMode);
  const faction = useGameStore((s) => s.loadedGameState?.player_faction);
  const legend = LEGENDS[mapMode];
  if (!legend) return null;

  return (
    <div
      data-testid="map-mode-legend"
      className="absolute bottom-24 z-10 bg-panel/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 shadow-lg"
      style={{ left: 'calc(15.5rem + 1rem)', minWidth: 140 }}
    >
      <div className="text-[9px] uppercase tracking-widest text-accent-gold/80 mb-1.5 font-semibold">{legend.title}</div>
      <div className="flex flex-col gap-1">
        {legend.stops.map((stop) => (
          <div key={stop.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-white/10 shrink-0" style={{ backgroundColor: stop.color }} />
            <span className="text-[10px] text-text-secondary flex-1">{stop.label}</span>
            {stop.value && (
              <span className="text-[9px] text-text-secondary/60 tabular-nums font-mono">{stop.value}</span>
            )}
          </div>
        ))}
      </div>
      {faction && mapMode === 'political' && null /* political mode has no legend */}
    </div>
  );
}
