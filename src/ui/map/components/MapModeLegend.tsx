import { useGameStore } from '../store/gameStore';

const LEGENDS: Record<string, { title: string; stops: { color: string; label: string }[] } | null> = {
  political: null,
  ethnic: { title: 'Majority Ethnicity', stops: [
    { color: '#8B3232', label: 'Serb' },
    { color: '#378C4B', label: 'Bosniak' },
    { color: '#326EAA', label: 'Croat' },
  ]},
  supply: { title: 'Supply Status', stops: [
    { color: '#1a4a1a', label: 'Critical' },
    { color: '#4aaa4a', label: 'Adequate' },
    { color: '#6ddd6d', label: 'Surplus' },
  ]},
  casualties: { title: 'Civilian Casualties', stops: [
    { color: 'rgba(255,220,200,0.3)', label: 'None' },
    { color: 'rgba(200,50,50,0.6)', label: 'Severe' },
  ]},
  morale: { title: 'Average Morale', stops: [
    { color: '#aa2222', label: 'Broken' },
    { color: '#ddaa33', label: 'Shaky' },
    { color: '#44aa44', label: 'Steady' },
  ]},
  operations: { title: 'Operational Effort', stops: [
    { color: 'rgba(80,124,173,0.4)', label: 'Holding' },
    { color: 'rgba(209,139,53,0.45)', label: 'Supporting' },
    { color: 'rgba(191,57,43,0.5)', label: 'Main Effort' },
  ]},
  defense: { title: 'Defense Density', stops: [
    { color: '#44aa44', label: 'Dense' },
    { color: '#ddaa33', label: 'Moderate' },
    { color: '#aa2222', label: 'Thin' },
  ]},
};

export function MapModeLegend() {
  const mapMode = useGameStore((s) => s.mapMode);
  const legend = LEGENDS[mapMode];
  if (!legend) return null;

  return (
    <div className="absolute bottom-24 left-4 z-10 bg-panel/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 shadow-lg" style={{ minWidth: 120 }}>
      <div className="text-[9px] uppercase tracking-widest text-accent-gold/80 mb-1.5 font-semibold">{legend.title}</div>
      <div className="flex flex-col gap-1">
        {legend.stops.map((stop) => (
          <div key={stop.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-white/10 shrink-0" style={{ backgroundColor: stop.color }} />
            <span className="text-[10px] text-text-secondary">{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
