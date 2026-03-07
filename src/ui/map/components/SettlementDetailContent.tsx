/**
 * Shared settlement detail content (HoI spec §7.1).
 * Used by Tooltip (hover) and SelectionPanel (selected OSID).
 * When displacementByMun is provided, shows current population and change.
 * Panel variant uses horizontal tabs (Overview | Military | Orders & events) like sector/operations panels.
 */
import { useState } from 'react';
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

/** Map faction or ethnicity key to nation label (e.g. RBiH/Bosniak → Bosniaks). */
function ethnicityOrFactionToNationLabel(key: string): string {
  const k = key.trim();
  if (k === 'RBiH' || k === 'Bosniak') return 'Bosniaks';
  if (k === 'RS' || k === 'Serb') return 'Serbs';
  if (k === 'HRHB' || k === 'Croat') return 'Croats';
  if (k === 'Other') return 'Others';
  return k;
}

export interface DisplacementByMunEntry {
  originalPopulation: number;
  displacedOut: number;
  displacedIn: number;
  lostPopulation: number;
  currentPopulation: number;
  /** Per-faction arrived counts (optional from engine). */
  arrivedByFaction?: Partial<Record<string, number>>;
}

/** Single recent control event for display. */
export interface RecentControlEventForSettlement {
  turn: number;
  from: string | null;
  to: string | null;
  mechanism: string;
}

export interface SettlementDetailContentProps {
  osid: string;
  osidDisplayNames: Record<string, string> | null;
  osidPropertiesMap: Record<string, Record<string, unknown>> | null;
  controlBySettlement: Record<string, string | null> | undefined;
  formationsAtOsid: {
    id: string;
    name: string;
    faction: string;
    personnel?: number;
    kind?: string;
    /** Readiness badge (e.g. ready / mobilizing). Panel only. */
    readiness?: string;
    /** Cohesion 0–100. Panel only. */
    cohesion?: number;
  }[];
  /** When provided (e.g. in SelectionPanel), show current population and change. */
  displacementByMun?: Record<string, DisplacementByMunEntry> | null;
  /** If true, show compact tooltip-style layout; if false, show full panel with population change. */
  variant?: 'tooltip' | 'panel';
  /** Pending orders affecting this settlement (attack target, move/reposition destination). Panel only. */
  pendingOrders?: {
    attack: { brigadeId: string; brigadeName?: string }[];
    move: { brigadeId: string; brigadeName?: string }[];
    reposition: { brigadeId: string; brigadeName?: string }[];
  };
  /** Militia pool(s) for this municipality (available/committed/exhausted). Panel only. */
  militiaPools?: { faction: string; available: number; committed: number; exhausted: number }[];
  /** Status label e.g. CONTESTED (from statusBySettlement). Only shown in panel variant. */
  statusLabel?: string | null;
  /** Operations that have this OSID as an objective. Only shown in panel variant. */
  operationsTargetingOsid?: { name: string; faction: string; phase: string }[];
  /** Recent control events at this settlement (turn, from, to, mechanism). Only shown in panel variant. */
  recentControlEvents?: RecentControlEventForSettlement[];
  /** Per-ethnicity departed counts from this OSID (fled). Only shown in panel variant. */
  departedByEthnicity?: Record<string, number>;
  /** Current ethnic composition (counts) for this OSID when available. Shows bar below pre-war structure. */
  currentEthnic?: { Bosniak: number; Serb: number; Croat: number; Other: number } | null;
  /** Front sector name if this OSID is in a corps front sector. Only shown in panel variant. */
  sectorName?: string | null;
  /** Faction that holds the sector (for coloring). */
  sectorFaction?: string | null;
  /** Brigade count by faction for summary line (e.g. { RBiH: 2, RS: 1 }). */
  brigadeCountByFaction?: Record<string, number>;
  /** When set (panel), formation rows call this with formation id to open formation detail. */
  onFormationClick?: (formationId: string) => void;
}

export function SettlementDetailContent({
  osid,
  osidDisplayNames,
  osidPropertiesMap,
  controlBySettlement,
  formationsAtOsid,
  displacementByMun,
  variant = 'tooltip',
  statusLabel,
  operationsTargetingOsid,
  recentControlEvents,
  departedByEthnicity,
  currentEthnic,
  sectorName,
  sectorFaction,
  brigadeCountByFaction,
  pendingOrders,
  militiaPools,
  onFormationClick,
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

  type SettlementTabId = 'overview' | 'military' | 'orders';
  const [activeTab, setActiveTab] = useState<SettlementTabId>('overview');

  const settlementTabs: { id: SettlementTabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'military', label: 'Military' },
    { id: 'orders', label: 'Orders & events' },
  ];

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

      {isPanel && (
        <div className="shrink-0 border-b border-panel-border bg-panel-card/50 flex gap-0" role="tablist" aria-label="Settlement sections">
          {settlementTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`settlement-panel-${id}`}
              id={`settlement-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`kbd-focus px-3 py-2 text-[10px] font-bold uppercase border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-accent-gold text-accent-gold bg-panel-bg'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-card/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={isPanel ? 'space-y-2.5 p-4' : 'space-y-2.5'}>
        {(!isPanel || activeTab === 'overview') && municipality && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Municipality</span>
            <span className="text-text-primary font-medium">{municipality}</span>
          </div>
        )}

        {(!isPanel || activeTab === 'overview') && controller && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Political Control</span>
            <span className={`${FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'} font-bold`}>{controller}</span>
          </div>
        )}

        {isPanel && activeTab === 'overview' && statusLabel && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Status</span>
            <span className="text-amber-400 font-semibold uppercase tracking-wide">{statusLabel}</span>
          </div>
        )}

        {(!isPanel || activeTab === 'military') && isPanel && sectorName && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">Front sector</span>
            <span className={`font-semibold ${sectorFaction ? (FACTION_COLORS_SUBTLE[sectorFaction] ?? 'text-text-primary') : 'text-text-primary'}`}>
              {sectorName}
              {sectorFaction ? ` (${sectorFaction})` : ''}
            </span>
          </div>
        )}

        {(!isPanel || activeTab === 'orders') && isPanel && operationsTargetingOsid && operationsTargetingOsid.length > 0 && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Operation target</div>
            <ul className="space-y-1">
              {operationsTargetingOsid.map((op, i) => (
                <li key={i} className="text-[11px] flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${op.faction === 'RBiH' ? 'bg-green-600' : op.faction === 'RS' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  <span className="text-text-primary font-medium truncate">{op.name}</span>
                  <span className="text-[9px] text-text-secondary">({op.phase})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(!isPanel || activeTab === 'orders') && isPanel && recentControlEvents && recentControlEvents.length > 0 && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Recent control</div>
            <ul className="space-y-1.5">
              {recentControlEvents.slice(0, 5).map((evt, i) => (
                <li key={i} className="text-[10px]">
                  <span className="text-text-secondary">T{evt.turn}</span>
                  {' '}
                  <span className={evt.from ? (FACTION_COLORS_SUBTLE[evt.from] ?? 'text-text-primary') : 'text-text-secondary'}>{evt.from ?? '—'}</span>
                  <span className="text-text-secondary mx-0.5">→</span>
                  <span className={evt.to ? (FACTION_COLORS_SUBTLE[evt.to] ?? 'text-text-primary') : 'text-text-primary'}>{evt.to ?? '—'}</span>
                  {evt.mechanism && evt.mechanism !== 'unknown' && (
                    <span className="text-text-secondary ml-1">({evt.mechanism})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending orders (attack/move/reposition affecting this settlement) */}
        {(!isPanel || activeTab === 'orders') && isPanel && pendingOrders && (pendingOrders.attack.length > 0 || pendingOrders.move.length > 0 || pendingOrders.reposition.length > 0) && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1">Pending orders</div>
            <ul className="space-y-1 text-[10px]">
              {pendingOrders.attack.map(({ brigadeId, brigadeName }) => (
                <li key={`attack-${brigadeId}`} className="text-amber-300/90">
                  Attack: {brigadeName ?? brigadeId} → this settlement
                </li>
              ))}
              {pendingOrders.move.map(({ brigadeId, brigadeName }) => (
                <li key={`move-${brigadeId}`} className="text-blue-300/90">
                  Move: {brigadeName ?? brigadeId} → here
                </li>
              ))}
              {pendingOrders.reposition.map(({ brigadeId, brigadeName }) => (
                <li key={`repos-${brigadeId}`} className="text-text-secondary">
                  Reposition: {brigadeName ?? brigadeId} → here
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Population — dramatic in panel: pre-war → now, displaced out/in/lost, arrived by faction, departed from here */}
        {(!isPanel || activeTab === 'overview') && (popOriginal > 0 || currentPop != null || (isPanel && disp)) && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5">Population</div>
            {isPanel && disp ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-text-secondary text-[10px]">Pre-war</span>
                    <span className="text-sm font-mono text-text-primary">{disp.originalPopulation.toLocaleString()}</span>
                  </div>
                  <span className="text-text-secondary">→</span>
                  <div className="flex items-baseline gap-2 text-right">
                    <span className="text-text-secondary text-[10px]">Now</span>
                    <span className="text-sm font-mono font-semibold text-text-primary">
                      {(disp.currentPopulation ?? currentPop ?? popOriginal).toLocaleString()}
                    </span>
                    {popDelta != null && popDelta !== 0 && (
                      <span className={`text-xs font-mono font-bold ${popDelta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {popDelta > 0 ? '+' : ''}{popDelta.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] mb-1.5">
                  {disp.displacedOut > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-amber-400/90">Out</span>
                      <div className="font-mono font-semibold text-amber-300">−{disp.displacedOut.toLocaleString()}</div>
                    </div>
                  )}
                  {disp.displacedIn > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-emerald-500/90">In</span>
                      <div className="font-mono font-semibold text-emerald-400">+{disp.displacedIn.toLocaleString()}</div>
                    </div>
                  )}
                  {disp.lostPopulation > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-red-400/90">Lost</span>
                      <div className="font-mono font-semibold text-red-300">−{disp.lostPopulation.toLocaleString()}</div>
                    </div>
                  )}
                </div>
                {disp.arrivedByFaction && Object.keys(disp.arrivedByFaction).length > 0 && (
                  <div className="text-[10px] mb-1">
                    <span className="text-text-secondary">Arrived: </span>
                    {Object.entries(disp.arrivedByFaction)
                      .filter(([, n]) => (n ?? 0) > 0)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([faction, n]) => (
                        <span key={faction} className={FACTION_COLORS_SUBTLE[faction] ?? 'text-text-primary'}>
                          {faction} +{(n ?? 0).toLocaleString()}{' '}
                        </span>
                      ))}
                  </div>
                )}
                {departedByEthnicity && Object.keys(departedByEthnicity).length > 0 && (
                  <div className="text-[10px] pt-1 border-t border-panel-border/20">
                    <span className="text-text-secondary">Fled from this settlement: </span>
                    {Object.entries(departedByEthnicity)
                      .filter(([, n]) => (n ?? 0) > 0)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([eth, n]) => (
                        <span key={eth} className="text-amber-300/90">
                          {ethnicityOrFactionToNationLabel(eth)} {(n ?? 0).toLocaleString()}{' '}
                        </span>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Pre-war ethnic structure */}
        {(!isPanel || activeTab === 'overview') && ethnic.some((e) => e.pct > 0) && (
          <div className="pt-1 space-y-1">
            {isPanel && <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">Pre-war ethnic structure</div>}
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

        {/* Current ethnic structure (when displacement/departures allow computation) */}
        {(!isPanel || activeTab === 'overview') && currentEthnic && (() => {
          const total = currentEthnic.Bosniak + currentEthnic.Serb + currentEthnic.Croat + currentEthnic.Other;
          if (total <= 0) return null;
          const cur = [
            { label: 'Bosniaks', count: currentEthnic.Bosniak, pct: (currentEthnic.Bosniak / total) * 100 },
            { label: 'Serbs', count: currentEthnic.Serb, pct: (currentEthnic.Serb / total) * 100 },
            { label: 'Croats', count: currentEthnic.Croat, pct: (currentEthnic.Croat / total) * 100 },
            { label: 'Others', count: currentEthnic.Other, pct: (currentEthnic.Other / total) * 100 },
          ].filter((e) => e.pct > 0.5);
          if (cur.length === 0) return null;
          return (
            <div className="pt-2 border-t border-panel-border/30 space-y-1">
              {isPanel && <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">Current ethnic structure</div>}
              {cur.map((e) => (
                <div key={e.label} className="grid grid-cols-[60px_1fr_35px] items-center gap-2 text-[10px]">
                  <span className="text-text-secondary truncate">{e.label}</span>
                  <div className="h-1 bg-black/30 rounded overflow-hidden">
                    <div
                      className="h-full bg-accent-gold/50"
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                  <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Stationed Units */}
        {(!isPanel || activeTab === 'military') && formationsAtOsid.length > 0 && (
          <div className="pt-2 border-t border-panel-border/50">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5 flex justify-between items-center">
              <span>Stationed units</span>
              {isPanel && brigadeCountByFaction && Object.keys(brigadeCountByFaction).length > 0 ? (
                <span className="text-accent-gold font-normal normal-case">
                  {formationsAtOsid.length} {formationsAtOsid.length === 1 ? 'brigade' : 'brigades'}
                  {' · '}
                  {Object.entries(brigadeCountByFaction)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([faction, count]) => (
                      <span key={faction} className={FACTION_COLORS_SUBTLE[faction] ?? ''}>
                        {faction} {count}{' '}
                      </span>
                    ))}
                </span>
              ) : (
                <span className="text-accent-gold">{formationsAtOsid.length}</span>
              )}
            </div>
            <div className="space-y-1">
              {showFormations.map((f) => (
                <div
                  key={f.id}
                  role={onFormationClick ? 'button' : undefined}
                  tabIndex={onFormationClick ? 0 : undefined}
                  onClick={onFormationClick ? () => onFormationClick(f.id) : undefined}
                  onKeyDown={onFormationClick ? (e) => e.key === 'Enter' && onFormationClick(f.id) : undefined}
                  className={`flex items-center gap-2 py-1 px-1.5 bg-black/10 rounded border border-white/5 transition-colors ${onFormationClick ? 'hover:border-white/20 hover:bg-black/20 cursor-pointer' : 'hover:border-white/10'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.faction === 'RBiH' ? 'bg-green-600' : f.faction === 'RS' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-primary font-medium truncate">{f.name}</span>
                      {isPanel && f.readiness && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-text-secondary flex-shrink-0">
                          {f.readiness}
                        </span>
                      )}
                    </div>
                    {isPanel && f.cohesion != null && Number.isFinite(f.cohesion) && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-black/30 rounded overflow-hidden max-w-[80px]">
                          <div
                            className="h-full bg-accent-gold/50 rounded"
                            style={{ width: `${Math.min(100, Math.max(0, f.cohesion))}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-text-secondary font-mono tabular-nums">{Math.round(f.cohesion)}%</span>
                      </div>
                    )}
                  </div>
                  {f.personnel != null && (
                    <span className="text-[9px] text-text-secondary font-mono tabular-nums flex-shrink-0">
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

        {/* Militia pool for this municipality (available / committed / exhausted) */}
        {(!isPanel || activeTab === 'military') && isPanel && militiaPools && militiaPools.length > 0 && (
          <div className="pt-2 border-t border-panel-border/50">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5">Militia pool</div>
            <div className="space-y-2">
              {militiaPools.map((pool) => {
                const total = pool.available + pool.committed + pool.exhausted;
                if (total <= 0) return null;
                return (
                  <div key={pool.faction} className="space-y-0.5">
                    <div className="flex justify-between text-[9px]">
                      <span className={FACTION_COLORS_SUBTLE[pool.faction] ?? 'text-text-primary'}>{pool.faction}</span>
                      <span className="text-text-secondary font-mono">
                        {pool.available} avail · {pool.committed} committed · {pool.exhausted} exhausted
                      </span>
                    </div>
                    <div className="h-2 bg-black/30 rounded overflow-hidden flex">
                      {pool.available > 0 && (
                        <div
                          className="h-full bg-emerald-600/70"
                          style={{ width: `${(pool.available / total) * 100}%` }}
                        />
                      )}
                      {pool.committed > 0 && (
                        <div
                          className="h-full bg-amber-500/70"
                          style={{ width: `${(pool.committed / total) * 100}%` }}
                        />
                      )}
                      {pool.exhausted > 0 && (
                        <div
                          className="h-full bg-red-900/60"
                          style={{ width: `${(pool.exhausted / total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!isPanel || activeTab === 'overview') && terrain && !terrainModifier && (
          <div className="pt-1 flex justify-between text-[10px] text-text-secondary italic">
            <span>Terrain Context</span>
            <span>{terrain}</span>
          </div>
        )}
      </div>
    </div>
  );
}
