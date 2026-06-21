import { useGameStore } from '../store/gameStore';
import { t, type MessageKey } from '../i18n';

interface LegendStop {
  color: string;
  labelKey: MessageKey;
  value?: string;
}

const LEGENDS: Record<string, { titleKey: MessageKey; stops: LegendStop[] } | null> = {
  political: null,
  ethnic: { titleKey: 'map.legend.ethnic.title', stops: [
    { color: '#8B3232', labelKey: 'map.legend.ethnic.serb' },
    { color: '#378C4B', labelKey: 'map.legend.ethnic.bosniak' },
    { color: '#326EAA', labelKey: 'map.legend.ethnic.croat' },
  ]},
  supply: { titleKey: 'map.legend.supply.title', stops: [
    { color: 'rgba(74, 222, 128, 0.45)', labelKey: 'map.legend.supply.adequate' },
    { color: 'rgba(251, 191, 36, 0.50)', labelKey: 'map.legend.supply.strained' },
    { color: 'rgba(248, 113, 113, 0.60)', labelKey: 'map.legend.supply.critical' },
    { color: 'rgba(156, 163, 175, 0.35)', labelKey: 'map.legend.supply.unknown' },
  ]},
  casualties: { titleKey: 'map.legend.casualties.title', stops: [
    { color: 'rgba(255,220,200,0.3)', labelKey: 'map.legend.casualties.none', value: '0' },
    { color: 'rgba(200,50,50,0.6)', labelKey: 'map.legend.casualties.severe', value: '100+' },
  ]},
  morale: { titleKey: 'map.legend.morale.title', stops: [
    { color: '#aa2222', labelKey: 'map.legend.morale.broken', value: '<30' },
    { color: '#ddaa33', labelKey: 'map.legend.morale.shaky', value: '30-60' },
    { color: '#44aa44', labelKey: 'map.legend.morale.steady', value: '>60' },
  ]},
  operations: { titleKey: 'map.legend.operations.title', stops: [
    { color: 'rgba(80,124,173,0.4)', labelKey: 'map.legend.operations.holding' },
    { color: 'rgba(209,139,53,0.45)', labelKey: 'map.legend.operations.supporting' },
    { color: 'rgba(191,57,43,0.5)', labelKey: 'map.legend.operations.mainEffort' },
  ]},
  defense: { titleKey: 'map.legend.defense.title', stops: [
    { color: '#44aa44', labelKey: 'map.legend.defense.dense', value: '>1.0' },
    { color: '#ddaa33', labelKey: 'map.legend.defense.moderate', value: '0.5-1.0' },
    { color: '#aa2222', labelKey: 'map.legend.defense.thin', value: '<0.5' },
  ]},
  authority: { titleKey: 'map.legend.authority.title', stops: [
    { color: '#7f1d1d', labelKey: 'map.legend.authority.weak', value: '<35' },
    { color: '#a16207', labelKey: 'map.legend.authority.contested', value: '35-69' },
    { color: '#166534', labelKey: 'map.legend.authority.firm', value: '70+' },
  ]},
  legitimacy: { titleKey: 'map.legend.legitimacy.title', stops: [
    { color: '#7f1d1d', labelKey: 'map.legend.legitimacy.coerced', value: '<35' },
    { color: '#a16207', labelKey: 'map.legend.legitimacy.uneasy', value: '35-69' },
    { color: '#166534', labelKey: 'map.legend.legitimacy.accepted', value: '70+' },
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
      <div className="text-[9px] uppercase tracking-widest text-accent-gold/80 mb-1.5 font-semibold">{t(legend.titleKey)}</div>
      <div className="flex flex-col gap-1">
        {legend.stops.map((stop) => (
          <div key={stop.labelKey} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-white/10 shrink-0" style={{ backgroundColor: stop.color }} />
            <span className="text-[10px] text-text-secondary flex-1">{t(stop.labelKey)}</span>
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
