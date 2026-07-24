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
    { color: 'var(--cb-faction-rs)', labelKey: 'map.legend.ethnic.serb' },
    { color: 'var(--cb-faction-rbih)', labelKey: 'map.legend.ethnic.bosniak' },
    { color: 'var(--cb-faction-hrhb)', labelKey: 'map.legend.ethnic.croat' },
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
  const legend = LEGENDS[mapMode];
  if (mapMode === 'political') {
    return (
      <div
        data-testid="map-mode-legend"
        className="absolute bottom-24 z-10 rounded border border-panel-border bg-panel-bg px-3 py-2 text-text-primary shadow-lg"
        style={{ left: 'calc(15.5rem + 1rem)', minWidth: 268 }}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent-gold">
          {t('map.legend.counters.title')}
        </div>
        <div className="mb-2 flex items-center gap-3" aria-label={t('map.legend.counters.factions')}>
          {[
            ['var(--cb-faction-rbih)', 'ARBiH'],
            ['var(--cb-faction-rs)', 'VRS'],
            ['var(--cb-faction-hrhb)', 'HVO'],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <span className="h-3 w-3 rounded-sm border border-white/40" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-[4.75rem_1fr] items-center gap-2 border-t border-panel-border pt-2">
          <div
            data-testid="map-counter-legend-sample"
            className="relative h-9 w-[4.25rem] rounded border-2 border-amber-300 bg-faction-rs shadow-[0_0_0_1px_rgba(0,0,0,0.85)]"
            aria-hidden="true"
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2 text-xs font-bold leading-none text-white">X</span>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold leading-none text-white">×</span>
            <span className="absolute bottom-1 left-2 h-1 w-5 bg-emerald-300" />
            <span className="absolute bottom-1 right-2 h-1 w-4 bg-cyan-300" />
            <span
              data-testid="map-counter-stack-badge"
              className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-black px-1 text-xs font-bold leading-none text-white"
            >
              3
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-text-primary">
            <span>{t('map.legend.counters.typeEchelon')}</span>
            <span>{t('map.legend.counters.status')}</span>
            <span>{t('map.legend.counters.selected')}</span>
            <span>{t('map.legend.counters.stackSize')}</span>
          </div>
        </div>
      </div>
    );
  }
  if (!legend) return null;

  return (
    <div
      data-testid="map-mode-legend"
      className="absolute bottom-24 z-10 rounded border border-panel-border bg-panel-bg px-3 py-2 text-text-primary shadow-lg"
      style={{ left: 'calc(15.5rem + 1rem)', minWidth: 140 }}
    >
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-accent-gold">{t(legend.titleKey)}</div>
      <div className="flex flex-col gap-1">
        {legend.stops.map((stop) => (
          <div key={stop.labelKey} className="flex items-center gap-2">
            <div className="h-3 w-3 shrink-0 rounded-sm border border-white/30" style={{ backgroundColor: stop.color }} />
            <span className="flex-1 text-[12px] text-text-primary">{t(stop.labelKey)}</span>
            {stop.value && (
              <span className="font-mono text-xs tabular-nums text-text-secondary">{stop.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
