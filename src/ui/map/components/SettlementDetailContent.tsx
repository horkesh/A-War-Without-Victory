/**
 * Shared settlement detail content (HoI spec §7.1).
 * Used by Tooltip (hover) and SelectionPanel (selected OSID).
 * When displacementByMun is provided, shows current population and change.
 */
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getByOsid } from '../utils/osidLookup';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';

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
  const ethnic = [
    { label: 'Bosniak', pct: popOriginal ? (num(props.population_bosniaks) / popOriginal) * 100 : 0 },
    { label: 'Serb', pct: popOriginal ? (num(props.population_serbs) / popOriginal) * 100 : 0 },
    { label: 'Croat', pct: popOriginal ? (num(props.population_croats) / popOriginal) * 100 : 0 },
    { label: 'Other', pct: popOriginal ? (num(props.population_others) / popOriginal) * 100 : 0 },
  ];
  const terrain = str(props.terrain || props.zone_type);
  const strategic = props.municipal_seat === true || props.strategic === true;

  const munId = getMunIdForDisplacement(props);
  const disp = munId && displacementByMun?.[munId];
  const currentPop =
    disp && disp.originalPopulation > 0 && Number.isFinite(disp.currentPopulation)
      ? Math.round(popOriginal * (disp.currentPopulation / disp.originalPopulation))
      : null;
  const popDelta = currentPop != null && popOriginal > 0 ? currentPop - popOriginal : null;

  const maxShow = variant === 'tooltip' ? 3 : 8;
  const showFormations = formationsAtOsid.slice(0, maxShow);
  const restCount = formationsAtOsid.length - maxShow;

  const isPanel = variant === 'panel';
  const titleClass = isPanel ? 'font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold border-b border-panel-border pb-2 mb-3' : 'font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2';
  const rowClass = isPanel ? 'text-xs text-text-secondary mb-2' : 'text-[11px] text-text-secondary mb-1';
  const rowClassLast = isPanel ? 'text-xs text-text-secondary mb-0' : 'text-[11px] text-text-secondary mt-1';

  return (
    <div className={isPanel ? 'min-w-0' : 'min-w-[200px] max-w-[280px]'}>
      <div className={titleClass}>{name}</div>
      {municipality && (
        <div className={rowClass}>Municipality: {municipality}</div>
      )}
      {controller && (
        <div className={rowClass}>
          <span className="text-text-secondary">Controller: </span>
          <span className={FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'}>{controller}</span>
        </div>
      )}

      {/* Population: original and (when loaded) current + change */}
      {(popOriginal > 0 || currentPop != null) && (
        <div className="space-y-1.5 mb-3">
          <div className={rowClass}>
            {currentPop != null ? (
              <>
                <span className="text-text-secondary">Pop (1991): </span>
                <span className="text-text-primary">{popOriginal.toLocaleString()}</span>
                <span className="text-text-secondary mx-2">→</span>
                <span className="text-text-primary font-medium">{currentPop.toLocaleString()}</span>
                {popDelta != null && popDelta !== 0 && (
                  <span className={`ml-2 ${popDelta < 0 ? 'text-alert' : 'text-success'}`}>
                    {popDelta > 0 ? '+' : ''}{popDelta.toLocaleString()}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-text-secondary">Pop: </span>
                <span className="text-text-primary">{popOriginal.toLocaleString()}</span>
              </>
            )}
          </div>
          {currentPop != null && popOriginal > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-panel-card rounded overflow-hidden flex">
                <div
                  className="h-full bg-panel-active rounded-l"
                  style={{ width: `${Math.min(100, (currentPop / popOriginal) * 100)}%` }}
                  title="Current vs original"
                />
                <div
                  className="h-full bg-panel-border"
                  style={{ width: `${Math.max(0, 100 - (currentPop / popOriginal) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-text-secondary tabular-nums shrink-0">
                {popOriginal > 0 ? Math.round((currentPop / popOriginal) * 100) : 0}%
              </span>
            </div>
          )}
        </div>
      )}

      {ethnic.some((e) => e.pct > 0) && (
        <div className="space-y-0.5 mb-3">
          {ethnic.filter((e) => e.pct > 0).map((e) => (
            <div key={e.label} className="flex items-center gap-2 text-[11px]">
              <span className="text-text-secondary w-14 shrink-0">{e.label}</span>
              <div className="flex-1 h-1.5 bg-panel-card rounded overflow-hidden">
                <div
                  className="h-full bg-panel-active rounded"
                  style={{ width: `${Math.min(100, e.pct)}%` }}
                />
              </div>
              <span className="tabular-nums w-8 text-right">{e.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {showFormations.length > 0 && (
        <div className={`text-[11px] text-text-secondary ${isPanel ? 'border-t border-panel-border pt-2' : 'border-t border-panel-border pt-1'}`}>
          <span className="text-text-secondary">
            Brigade{formationsAtOsid.length !== 1 ? 's' : ''} ({formationsAtOsid.length}):
          </span>
          {showFormations.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-0.5">
              <span className={FACTION_COLORS_SUBTLE[f.faction] ?? 'text-text-primary'}>●</span>
              <span className="text-text-primary truncate">{f.name}</span>
              {f.kind && <span className="text-text-secondary shrink-0">{f.kind}</span>}
              {f.personnel != null && (
                <span className="text-text-secondary ml-auto tabular-nums">{f.personnel.toLocaleString()}</span>
              )}
            </div>
          ))}
          {restCount > 0 && (
            <div className="text-text-secondary pt-0.5">+{restCount} more</div>
          )}
        </div>
      )}
      {terrain && (
        <div className={rowClass}>Terrain: {terrain}</div>
      )}
      {strategic && (
        <div className={`${rowClassLast} text-accent-gold`}>◆ Municipal Seat</div>
      )}
    </div>
  );
}
