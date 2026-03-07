/**
 * Shared settlement detail content (HoI spec §7.1).
 * Used by Tooltip (hover) and SelectionPanel (selected OSID).
 * When displacementByMun is provided, shows current population and change.
 */
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getByOsid } from '../utils/osidLookup';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { toTitleCase } from '../utils/formatters';

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function getMunIdForDisplacement(props: Record<string, unknown>): string | null {
  const raw =
    (typeof props.mun1990_id === 'string' && props.mun1990_id) ||
    (typeof props.mun_id === 'string' && props.mun_id) ||
    (typeof (props as Record<string, unknown>).municipality_id === 'string' &&
      (props as Record<string, unknown>).municipality_id);
  return raw ? String(raw).toLowerCase().trim() || null : null;
}

export interface DisplacementByMunEntry {
  originalPopulation: number;
  displacedOut: number;
  displacedIn: number;
  lostPopulation: number;
  currentPopulation: number;
}

export interface SettlementDetailContentProps {
  osid: string;
  osidDisplayNames: Record<string, string> | null;
  osidPropertiesMap: Record<string, Record<string, unknown>> | null;
  controlBySettlement: Record<string, string | null> | undefined;
  formationsAtOsid: { id: string; name: string; faction: string; personnel?: number; kind?: string }[];
  /** When provided (e.g. in SelectionPanel), show current population and change. */
  displacementByMun?: Record<string, DisplacementByMunEntry> | null;
  /** If true, show compact tooltip-style layout; if false, show full panel with population change. */
  variant?: 'tooltip' | 'panel';
}

export function SettlementDetailContent({
  osid,
  osidDisplayNames,
  osidPropertiesMap,
  controlBySettlement,
  formationsAtOsid,
  displacementByMun,
  variant = 'tooltip',
}: SettlementDetailContentProps) {
  const name = getOsidDisplayName(osid, osidDisplayNames);
  const props = osidPropertiesMap?.[osid] ?? {};
  const municipality = str(props.mun1990_name || props.mun1990_id);
  const controller = getByOsid(controlBySettlement, osid);
  const popOriginal = num(props.population_total) || (num(props.population_bosniaks) + num(props.population_serbs) + num(props.population_croats) + num(props.population_others));

  const terrain = toTitleCase(str(props.terrain || props.zone_type));
  const isStrategic = props.municipal_seat === true || props.strategic === true || popOriginal > 5000;
  const isHub = props.transit_hub === true || props.junction === true;

  const terrainModifier = terrain === 'Urban' ? '+25% Def' : terrain === 'Mountain' ? '+40% Def' : terrain === 'Forest' ? '+15% Def' : null;

  const ethnic = [
    { label: 'Bosniak', pct: popOriginal ? (num(props.population_bosniaks) / popOriginal) * 100 : 0 },
    { label: 'Serb', pct: popOriginal ? (num(props.population_serbs) / popOriginal) * 100 : 0 },
    { label: 'Croat', pct: popOriginal ? (num(props.population_croats) / popOriginal) * 100 : 0 },
    { label: 'Other', pct: popOriginal ? (num(props.population_others) / popOriginal) * 100 : 0 },
  ];

  const munId = getMunIdForDisplacement(props);
  const disp = munId && displacementByMun?.[munId];
  const currentPop =
    disp && disp.originalPopulation > 0 && Number.isFinite(disp.currentPopulation)
      ? Math.round(popOriginal * (disp.currentPopulation / disp.originalPopulation))
      : null;
  const popDelta = currentPop != null && popOriginal > 0 ? currentPop - popOriginal : null;

  const maxShow = variant === 'tooltip' ? 3 : 12;
  const showFormations = formationsAtOsid.slice(0, maxShow);
  const restCount = formationsAtOsid.length - maxShow;

  const isPanel = variant === 'panel';

  return (
    <div className={isPanel ? 'min-w-0' : 'min-w-[240px] max-w-[320px]'}>
      {/* Strategic Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {isStrategic && (
          <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[9px] font-bold uppercase tracking-tighter rounded border border-accent-gold/30">
            Strategic Center
          </span>
        )}
        {isHub && (
          <span className="px-1.5 py-0.5 bg-interactive/20 text-interactive text-[9px] font-bold uppercase tracking-tighter rounded border border-interactive/30">
            Transit Hub
          </span>
        )}
        {terrainModifier && (
          <span className="px-1.5 py-0.5 bg-white/5 text-text-secondary text-[9px] font-bold uppercase tracking-tighter rounded border border-white/10">
            {terrain}: {terrainModifier}
          </span>
        )}
      </div>

      <div className={isPanel ? 'font-sans text-sm text-accent-gold uppercase tracking-wide font-bold border-b border-panel-border pb-2 mb-3' : 'font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2'}>
        {name}
      </div>

      <div className="space-y-2.5">
        {municipality && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Municipality</span>
            <span className="text-text-primary font-medium">{municipality}</span>
          </div>
        )}

        {controller && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Political Control</span>
            <span className={`${FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'} font-bold`}>{controller}</span>
          </div>
        )}

        {/* Population Visualization */}
        {(popOriginal > 0 || currentPop != null) && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] text-text-secondary uppercase font-semibold">Population</span>
              <div className="text-right">
                <span className="text-xs font-mono text-text-primary">{(currentPop ?? popOriginal).toLocaleString()}</span>
                {popDelta != null && popDelta !== 0 && (
                  <span className={`ml-1.5 text-[10px] font-mono ${popDelta < 0 ? 'text-alert' : 'text-success'}`}>
                    {popDelta > 0 ? '+' : ''}{popDelta.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {currentPop != null && popOriginal > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-black/40 rounded overflow-hidden flex">
                  <div
                    className="h-full bg-accent-gold/60"
                    style={{ width: `${Math.min(100, (currentPop / popOriginal) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-secondary font-mono w-7 text-right">
                  {Math.round((currentPop / popOriginal) * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Demographics Bars */}
        {ethnic.some((e) => e.pct > 0) && (
          <div className="pt-1 space-y-1">
            {ethnic.filter((e) => e.pct > 2).map((e) => (
              <div key={e.label} className="grid grid-cols-[50px_1fr_30px] items-center gap-2 text-[10px]">
                <span className="text-text-secondary truncate">{e.label}</span>
                <div className="h-1 bg-black/30 rounded overflow-hidden">
                  <div
                    className="h-full bg-panel-active/40"
                    style={{ width: `${e.pct}%` }}
                  />
                </div>
                <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Stationed Units - Enhanced Rendering */}
        {formationsAtOsid.length > 0 && (
          <div className="pt-2 border-t border-panel-border/50">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5 flex justify-between">
              <span>Stationed Units</span>
              <span className="text-accent-gold">{formationsAtOsid.length}</span>
            </div>
            <div className="space-y-1">
              {showFormations.map((f) => (
                <div key={f.id} className="flex items-center gap-2 py-1 px-1.5 bg-black/10 rounded border border-white/5 hover:border-white/10 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${f.faction === 'RBiH' ? 'bg-green-600' : f.faction === 'RS' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  <span className="text-[10px] text-text-primary font-medium truncate flex-1">{f.name}</span>
                  {f.personnel != null && (
                    <span className="text-[9px] text-text-secondary font-mono tabular-nums">
                      {f.personnel > 1000 ? `${(f.personnel / 1000).toFixed(1)}k` : f.personnel}
                    </span>
                  )}
                </div>
              ))}
              {restCount > 0 && (
                <div className="text-[9px] text-text-secondary text-right italic pt-0.5">+{restCount} additional units</div>
              )}
            </div>
          </div>
        )}

        {terrain && !terrainModifier && (
          <div className="pt-1 flex justify-between text-[10px] text-text-secondary italic">
            <span>Terrain Context</span>
            <span>{terrain}</span>
          </div>
        )}
      </div>
    </div>
  );
}
