/**
 * Shared settlement detail content (HoI spec §7.1).
 * Used by Tooltip (hover) and SelectionPanel (selected OSID).
 * When displacementByMun is provided, shows current population and change.
 * Panel variant uses horizontal tabs (Overview | Municipality | Timeline).
 */
import { useState, useMemo } from 'react';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getByOsid } from '../utils/osidLookup';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { toTitleCase } from '../utils/formatters';
import { SettlementTimeline } from './SettlementTimeline';
import { buildSettlementTimeline } from '../utils/buildSettlementTimeline';
import {
  getPlayerSafeBrigadeName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
} from '../utils/playerSafeText';
import { t, useLocale } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { buildOsidSupplyExplanation, type OsidSupplyTone } from '../data/osidSupplyExplanation';

/** Player-legible color per supply tone (no raw enum surfaced). */
const SUPPLY_TONE_CLASS: Record<OsidSupplyTone, string> = {
  good: 'text-emerald-400',
  caution: 'text-amber-400',
  danger: 'text-red-400',
};

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
  if (k === 'RBiH' || k === 'Bosniak') return t('settlement.ethnicity.bosniaks');
  if (k === 'RS' || k === 'Serb') return t('settlement.ethnicity.serbs');
  if (k === 'HRHB' || k === 'Croat') return t('settlement.ethnicity.croats');
  if (k === 'Other') return t('settlement.ethnicity.others');
  return k;
}

/** Bar fill color for ethnic structure charts: green Bosniaks, red Serbs, blue Croats, neutral Other. */
function ethnicBarColor(label: string): string {
  if (label === 'Bosniak' || label === 'Bosniaks') return 'bg-faction-rbih';
  if (label === 'Serb' || label === 'Serbs') return 'bg-faction-rs';
  if (label === 'Croat' || label === 'Croats') return 'bg-faction-hrhb';
  return 'bg-panel-active/40';
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
  /** When provided, use exact per-OSID out/lost/in from event log (numbers add up). */
  displacementByOsid?: Record<string, { out: number; lost: number; in: number }> | null;
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
  /** Operations that have this OSID as an objective. Only shown in panel variant. operationKey used for click-through. */
  operationsTargetingOsid?: { name: string; faction: string; phase: string; operationKey?: string }[];
  /** Recent control events at this settlement (turn, from, to, mechanism). Only shown in panel variant. */
  recentControlEvents?: RecentControlEventForSettlement[];
  /** Per-ethnicity departed counts from this OSID (fled). Only shown in panel variant. */
  departedByEthnicity?: Record<string, number>;
  /** Per-OSID departed counts by ethnicity (for municipality current ethnic computation). */
  departedByOsid?: Record<string, Record<string, number>> | null;
  /** Current ethnic composition (counts) for this OSID when available. Shows bar below pre-war structure. */
  currentEthnic?: { Bosniak: number; Serb: number; Croat: number; Other: number } | null;
  /** Front sector ID (for click-through to sector panel). Only shown in panel variant. */
  sectorId?: string | null;
  /** Front sector name if this OSID is in a corps front sector. Only shown in panel variant. */
  sectorName?: string | null;
  /** Faction that holds the sector (for coloring). */
  sectorFaction?: string | null;
  /** Brigade count by faction for summary line (e.g. { RBiH: 2, RS: 1 }). */
  brigadeCountByFaction?: Record<string, number>;
  /** When set (panel), formation rows call this with formation id to open formation detail. */
  onFormationClick?: (formationId: string) => void;
  /** Optional shell callback for front-sector drilldown. */
  onSectorClick?: (sectorId: string) => void;
  /** Optional shell callback for operation drilldown. */
  onOperationClick?: (operationKey: string) => void;
  /** Raw displacement event log for timeline. */
  displacementEventLog?: Array<{ turn: number; origin_osid?: string; dest_osid?: string; origin_mun?: string; ethnicity?: string; displaced: number; killed: number; fled_abroad: number; settled: number; caused_by?: string }>;
  /** All control events (full history, not just recent). */
  allControlEvents?: Array<{ turn: number; settlementId: string; from: string | null; to: string | null; mechanism: string }>;
  /** Completed operation history for timeline. */
  operationHistory?: Array<{ operation_name: string; corps_id: string; faction: string; started_turn: number; ended_turn: number; outcome: string; objectives_targeted: string[]; objectives_captured: string[] }>;
  /** Per-OSID battle records for timeline. */
  battlesByOsid?: Record<string, Array<{ turn: number; attacker_faction: string; defender_faction: string; outcome: string; attacker_casualties: number; defender_casualties: number; territory_flipped: boolean }>>;
  /** Per-OSID brigade movements for timeline. */
  movementsByOsid?: Record<string, Array<{ turn: number; formation_id: string; formation_name: string; type: 'arrived' | 'departed' }>>;
  /** Per-OSID supply transitions for timeline. */
  supplyTransitionsByOsid?: Record<string, Array<{ turn: number; from: string; to: string }>>;
  /** Historical events fired, for timeline. */
  historicalEventsByTurn?: Array<{ turn: number; id: string; text: string }>;
  /** Initial political controllers at scenario start (for timeline provenance). */
  initialControlBySettlement?: Record<string, string | null> | null;
  /**
   * Player-faction-scoped current supply level per controlled OSID
   * (already derived by the sim; only the player's own settlements appear).
   * Surfaced as a player-legible status line in the overview tab.
   */
  supplyStateByOsid?: Record<string, 'adequate' | 'strained' | 'critical'>;
}

export function SettlementDetailContent({
  osid,
  osidDisplayNames,
  osidPropertiesMap,
  controlBySettlement,
  formationsAtOsid,
  displacementByMun,
  displacementByOsid,
  variant = 'tooltip',
  statusLabel,
  operationsTargetingOsid,
  recentControlEvents,
  departedByEthnicity,
  departedByOsid,
  currentEthnic,
  sectorId,
  sectorName,
  sectorFaction,
  brigadeCountByFaction,
  pendingOrders,
  militiaPools,
  onFormationClick,
  onSectorClick,
  onOperationClick,
  displacementEventLog,
  allControlEvents,
  operationHistory,
  battlesByOsid,
  movementsByOsid,
  supplyTransitionsByOsid,
  historicalEventsByTurn,
  initialControlBySettlement,
  supplyStateByOsid,
}: SettlementDetailContentProps) {
  const [locale] = useLocale();
  const name = getOsidDisplayName(osid, osidDisplayNames);
  const props = osidPropertiesMap?.[osid] ?? {};
  const municipality = str(props.mun1990_name || props.mun1990_id);
  const controller = getByOsid(controlBySettlement, osid);
  // Current supply status for this settlement. `supplyStateByOsid` is already
  // player-faction-scoped by the adapter, so an entry exists only for the
  // player's own settlements — no enemy supply truth is surfaced here.
  const supplyExplanation = buildOsidSupplyExplanation(getByOsid(supplyStateByOsid, osid));
  const popOriginal = num(props.population_total) || (num(props.population_bosniaks) + num(props.population_serbs) + num(props.population_croats) + num(props.population_others));

  const terrain = toTitleCase(str(props.terrain || props.zone_type));
  const elevation = typeof props.elevation_mean_m === 'number' ? Math.round(props.elevation_mean_m) : null;
  const friction = typeof props.terrain_friction_index === 'number' ? props.terrain_friction_index : null;
  const isStrategic = props.municipal_seat === true || props.strategic === true || popOriginal > 5000;
  const isHub = props.transit_hub === true || props.junction === true;

  const terrainModifier = friction != null && friction > 0.5 ? '+50% Def'
    : friction != null && friction > 0.3 ? '+30% Def'
    : friction != null && friction > 0.15 ? '+15% Def'
    : null;

  const ethnic = [
    { label: 'Bosniak', pct: popOriginal ? (num(props.population_bosniaks) / popOriginal) * 100 : 0 },
    { label: 'Serb', pct: popOriginal ? (num(props.population_serbs) / popOriginal) * 100 : 0 },
    { label: 'Croat', pct: popOriginal ? (num(props.population_croats) / popOriginal) * 100 : 0 },
    { label: 'Other', pct: popOriginal ? (num(props.population_others) / popOriginal) * 100 : 0 },
  ];

  const munId = getMunIdForDisplacement(props);
  const disp = munId && displacementByMun?.[munId];
  const osidDisp = displacementByOsid?.[osid];

  // Municipality-level ethnic aggregation from all OSIDs in the same mun
  const munEthnicData = (() => {
    if (!munId || !osidPropertiesMap) return null;
    let bosniaks = 0, serbs = 0, croats = 0, others = 0;
    let curBosniaks = 0, curSerbs = 0, curCroats = 0, curOthers = 0;
    for (const [osidKey, p] of Object.entries(osidPropertiesMap)) {
      if (String(p.mun1990_id ?? '').toLowerCase() !== munId) continue;
      const b = num(p.population_bosniaks), s = num(p.population_serbs);
      const c = num(p.population_croats), o = num(p.population_others);
      bosniaks += b; serbs += s; croats += c; others += o;
      // Current: subtract per-ethnicity departures
      const dep = departedByOsid?.[osidKey] ?? {};
      curBosniaks += Math.max(0, b - num(dep['RBiH'] ?? dep['Bosniak']));
      curSerbs += Math.max(0, s - num(dep['RS'] ?? dep['Serb']));
      curCroats += Math.max(0, c - num(dep['HRHB'] ?? dep['Croat']));
      curOthers += Math.max(0, o - num(dep['Other']));
    }
    const total = bosniaks + serbs + croats + others;
    const curTotal = curBosniaks + curSerbs + curCroats + curOthers;
    if (total <= 0) return null;
    return {
      preWar: [
        { label: 'Bosniak', count: bosniaks, pct: (bosniaks / total) * 100 },
        { label: 'Serb', count: serbs, pct: (serbs / total) * 100 },
        { label: 'Croat', count: croats, pct: (croats / total) * 100 },
        { label: 'Other', count: others, pct: (others / total) * 100 },
      ],
      current: curTotal > 0 ? [
        { label: 'Bosniaks', count: curBosniaks, pct: (curBosniaks / curTotal) * 100 },
        { label: 'Serbs', count: curSerbs, pct: (curSerbs / curTotal) * 100 },
        { label: 'Croats', count: curCroats, pct: (curCroats / curTotal) * 100 },
        { label: 'Others', count: curOthers, pct: (curOthers / curTotal) * 100 },
      ] : null,
    };
  })();
  // osidDisp.out = displaced + killed + fled_abroad (total removals from this OSID)
  // osidDisp.lost = killed + fled_abroad (subset of out — people who left the country or died)
  // osidDisp.in = settled (arrivals from other OSIDs)
  // Formula: Now = Pre-war - out + in (out already includes lost, don't subtract twice)
  const currentPop =
    osidDisp != null
      ? Math.max(0, popOriginal - osidDisp.out + osidDisp.in)
      : disp && disp.originalPopulation > 0 && Number.isFinite(disp.currentPopulation)
        ? Math.round(popOriginal * (disp.currentPopulation / disp.originalPopulation))
        : null;
  const popDelta = currentPop != null && popOriginal > 0 ? currentPop - popOriginal : null;

  // Build settlement timeline from all available data sources
  const timelineEvents = useMemo(() => {
    if (variant !== 'panel') return [];
    return buildSettlementTimeline(
      osid,
      munId,
      displacementEventLog ?? [],
      allControlEvents ?? [],
      operationHistory ?? [],
      battlesByOsid?.[osid] ?? [],
      movementsByOsid?.[osid] ?? [],
      supplyTransitionsByOsid?.[osid] ?? [],
      (historicalEventsByTurn ?? []).filter(e => {
        // Match events to this OSID's municipality (event IDs often contain mun name)
        if (!munId) return false;
        const munSlug = munId.replace(/_/g, '');
        return e.id.replace(/_/g, '').includes(munSlug);
      }),
      popOriginal > 0 ? {
        bosniaks: num(props.population_bosniaks),
        serbs: num(props.population_serbs),
        croats: num(props.population_croats),
        others: num(props.population_others),
      } : null,
      initialControlBySettlement?.[osid] ?? null,
    );
  }, [osid, munId, displacementEventLog, allControlEvents, operationHistory, variant, popOriginal, props.population_bosniaks, props.population_serbs, props.population_croats, props.population_others, initialControlBySettlement]);
  /** Settlement-level flows: exact per-OSID when available, else municipality share. */
  const settlementShare =
    disp && disp.originalPopulation > 0 && popOriginal > 0 ? popOriginal / disp.originalPopulation : 0;
  // outSettlement = displaced alive (moved to another OSID)
  // lostSettlement = killed + fled abroad (subset of total displaced)
  // osidDisp.out = total displaced (includes killed + fled as subsets)
  // osidDisp.lost = killed + fled_abroad
  const outSettlement =
    osidDisp != null ? (osidDisp.out - osidDisp.lost) : (disp && settlementShare > 0 ? Math.round(disp.displacedOut * settlementShare) : 0);
  const lostSettlement =
    osidDisp != null ? osidDisp.lost : (disp && settlementShare > 0 ? Math.round(disp.lostPopulation * settlementShare) : 0);
  const inSettlement =
    osidDisp != null ? osidDisp.in : (currentPop != null && popOriginal > 0 && disp
      ? Math.max(0, currentPop - popOriginal + outSettlement + lostSettlement)
      : 0);

  const maxShow = variant === 'tooltip' ? 3 : 12;
  const showFormations = formationsAtOsid.slice(0, maxShow);
  const restCount = formationsAtOsid.length - maxShow;

  const isPanel = variant === 'panel';
  const sectorFactionLabel = getPlayerSafeMilitaryFactionName(sectorFaction, '');

  type SettlementTabId = 'overview' | 'municipality' | 'timeline';
  const [activeTab, setActiveTab] = useState<SettlementTabId>('overview');

  const settlementTabs: { id: SettlementTabId; label: string }[] = [
    { id: 'overview', label: t('settlement.tab.overview') },
    { id: 'municipality', label: t('settlement.tab.municipality') },
    { id: 'timeline', label: t('settlement.tab.timeline') },
  ];

  return (
    <div className={isPanel ? 'min-w-0' : 'min-w-[240px] max-w-[320px]'}>
      {/* Strategic Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {isStrategic && (
          <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[9px] font-bold uppercase tracking-tighter rounded border border-accent-gold/30">
            {t('settlement.strategicCenter')}
          </span>
        )}
        {isHub && (
          <span className="px-1.5 py-0.5 bg-interactive/20 text-interactive text-[9px] font-bold uppercase tracking-tighter rounded border border-interactive/30">
            {t('settlement.transitHub')}
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
        <div className="shrink-0 border-b border-panel-border bg-panel-card/50 flex gap-0" role="tablist" aria-label={t('settlement.sections')}>
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
            <span className="text-text-secondary">{t('settlement.municipality')}</span>
            <span className="text-text-primary font-medium">{municipality}</span>
          </div>
        )}

        {isPanel && activeTab === 'overview' && statusLabel && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">{t('settlement.status')}</span>
            <span className="text-amber-400 font-semibold uppercase tracking-wide">{statusLabel}</span>
          </div>
        )}

        {isPanel && activeTab === 'overview' && supplyExplanation && (
          <div
            data-testid="settlement-supply-status"
            className="flex justify-between items-start gap-3 text-[11px]"
          >
            <span className="text-text-secondary shrink-0">{t('settlement.supply.label')}</span>
            <span className="text-right">
              <span className={`font-semibold ${SUPPLY_TONE_CLASS[supplyExplanation.tone]}`}>
                {t(supplyExplanation.labelKey)}
              </span>
              <span className="block text-[10px] text-text-secondary/80 mt-0.5">
                {t(supplyExplanation.explanationKey)}
              </span>
            </span>
          </div>
        )}

        {(!isPanel || activeTab === 'overview') && isPanel && sectorName && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-secondary">{t('settlement.frontSector')}</span>
            {sectorId ? (
              <button
                type="button"
                onClick={() => onSectorClick?.(sectorId)}
                className={`font-semibold text-left hover:underline focus:outline-none focus:ring-1 focus:ring-accent-gold/50 rounded kbd-focus ${sectorFaction ? (FACTION_COLORS_SUBTLE[sectorFaction] ?? 'text-text-primary') : 'text-text-primary'}`}
              >
                {sectorName}
                {sectorFactionLabel ? ` (${sectorFactionLabel})` : ''}
              </button>
            ) : (
              <span className={`font-semibold ${sectorFaction ? (FACTION_COLORS_SUBTLE[sectorFaction] ?? 'text-text-primary') : 'text-text-primary'}`}>
                {sectorName}
                {sectorFactionLabel ? ` (${sectorFactionLabel})` : ''}
              </span>
            )}
          </div>
        )}

        {(!isPanel || activeTab === 'overview') && isPanel && operationsTargetingOsid && operationsTargetingOsid.length > 0 && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1">{t('settlement.operationTarget')}</div>
            <ul className="space-y-1">
              {operationsTargetingOsid.map((op, i) => {
                const isClickable = Boolean(op.operationKey);
                const content = (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${op.faction === 'RBiH' ? 'bg-green-600' : op.faction === 'RS' ? 'bg-red-600' : 'bg-blue-600'}`} />
                    <span className="text-text-primary font-medium truncate">{op.name}</span>
                    <span className="text-[9px] text-text-secondary">({op.phase})</span>
                  </>
                );
                return (
                  <li key={i} className="text-[11px] flex items-center gap-2">
                    {isClickable ? (
                      <button
                        type="button"
                        onClick={() => onOperationClick?.(op.operationKey!)}
                        className="w-full flex items-center gap-2 text-left hover:underline focus:outline-none focus:ring-1 focus:ring-accent-gold/50 rounded px-0.5 -mx-0.5 py-0.5 kbd-focus"
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Timeline tab — "The Story of This Place" */}
        {isPanel && activeTab === 'timeline' && (
          <SettlementTimeline events={timelineEvents} />
        )}

        {/* Pending orders (attack/move/reposition affecting this settlement) */}
        {(!isPanel || activeTab === 'overview') && isPanel && pendingOrders && (pendingOrders.attack.length > 0 || pendingOrders.move.length > 0 || pendingOrders.reposition.length > 0) && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1">{t('settlement.pendingOrders')}</div>
            <ul className="space-y-1 text-[10px]">
              {pendingOrders.attack.map(({ brigadeId, brigadeName }) => (
                <li key={`attack-${brigadeId}`} className="text-amber-300/90">
                  {t('settlement.order.attack', { brigade: getPlayerSafeBrigadeName(brigadeName) })}
                </li>
              ))}
              {pendingOrders.move.map(({ brigadeId, brigadeName }) => (
                <li key={`move-${brigadeId}`} className="text-blue-300/90">
                  {t('settlement.order.move', { brigade: getPlayerSafeBrigadeName(brigadeName) })}
                </li>
              ))}
              {pendingOrders.reposition.map(({ brigadeId, brigadeName }) => (
                <li key={`repos-${brigadeId}`} className="text-text-secondary">
                  {t('settlement.order.reposition', { brigade: getPlayerSafeBrigadeName(brigadeName) })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Population — dramatic in panel: pre-war → now, displaced out/in/lost, arrived by faction, departed from here */}
        {(!isPanel || activeTab === 'overview') && (popOriginal > 0 || currentPop != null || (isPanel && disp)) && (
          <div className="pt-2 border-t border-panel-border/30">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5">{t('settlement.population')}</div>
            {isPanel && disp ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-text-secondary text-[10px]">{t('settlement.preWar')}</span>
                    <span className="text-sm font-mono text-text-primary">{popOriginal.toLocaleString()}</span>
                  </div>
                  <span className="text-text-secondary">→</span>
                  <div className="flex items-baseline gap-2 text-right">
                    <span className="text-text-secondary text-[10px]">{t('settlement.now')}</span>
                    <span className="text-sm font-mono font-semibold text-text-primary">
                      {(currentPop ?? popOriginal).toLocaleString()}
                    </span>
                    {(() => {
                      const delta = popDelta;
                      if (delta == null || delta === 0) return null;
                      return (
                        <span className={`text-xs font-mono font-bold ${delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-[10px] text-text-secondary/80 mb-1.5" aria-label={t('settlement.populationFormulaAria')}>
                  {t('settlement.populationFormula')}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] mb-1.5">
                  {outSettlement > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-amber-400/90">{t('settlement.displaced')}</span>
                      <div className="font-mono font-semibold text-amber-300">−{outSettlement.toLocaleString()}</div>
                    </div>
                  )}
                  {inSettlement > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-emerald-500/90">{t('settlement.arrived')}</span>
                      <div className="font-mono font-semibold text-emerald-400">+{inSettlement.toLocaleString()}</div>
                    </div>
                  )}
                  {lostSettlement > 0 && (
                    <div className="bg-black/20 rounded px-2 py-1 text-center">
                      <span className="text-red-400/90">{t('settlement.killed')}</span>
                      <div className="font-mono font-semibold text-red-300">−{lostSettlement.toLocaleString()}</div>
                    </div>
                  )}
                </div>
                {disp.arrivedByFaction && Object.keys(disp.arrivedByFaction).length > 0 && (() => {
                  const entries = Object.entries(disp.arrivedByFaction)
                    .filter(([, n]) => (n ?? 0) > 0)
                    .sort(([a], [b]) => a.localeCompare(b));
                  if (entries.length === 0) return null;
                  const scale = settlementShare > 0 ? settlementShare : 1;
                  return (
                    <div className="text-[10px] mb-1">
                      <span className="text-text-secondary">{t('settlement.arrivedHere')}: </span>
                      {entries.map(([faction, n]) => (
                        <span key={faction} className={FACTION_COLORS_SUBTLE[faction] ?? 'text-text-primary'}>
                          {ethnicityOrFactionToNationLabel(faction)} +{Math.round((n ?? 0) * scale).toLocaleString()}{' '}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {departedByEthnicity && Object.keys(departedByEthnicity).length > 0 && (
                  <div className="text-[10px] pt-1 border-t border-panel-border/20">
                    <span className="text-text-secondary">{t('settlement.fledHere')}: </span>
                    {(() => {
                      const totalFled = Object.values(departedByEthnicity).reduce((a, n) => a + (n ?? 0), 0);
                      const totalOutPlusLost = outSettlement + lostSettlement;
                      const shouldScale = totalFled > 0 && totalOutPlusLost > 0 && totalOutPlusLost !== totalFled;
                      if (!shouldScale) {
                        return Object.entries(departedByEthnicity)
                          .filter(([, n]) => (n ?? 0) > 0)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([eth, n]) => (
                            <span key={eth} className="text-amber-300/90">
                              {ethnicityOrFactionToNationLabel(eth)} {(n ?? 0).toLocaleString()}{' '}
                            </span>
                          ));
                      }
                      const entries = Object.entries(departedByEthnicity)
                        .filter(([, n]) => (n ?? 0) > 0)
                        .sort(([a], [b]) => a.localeCompare(b));
                      const scale = totalOutPlusLost / totalFled;
                      const scaled = entries.map(([eth, n]) => ({ eth, v: Math.round((n ?? 0) * scale) }));
                      const sum = scaled.reduce((a, { v }) => a + v, 0);
                      const diff = totalOutPlusLost - sum;
                      if (diff !== 0 && scaled.length > 0) {
                        // Apply rounding correction to largest ethnicity to maintain total
                        const idx = scaled.reduce((best, cur, i) => (cur.v > (scaled[best]?.v ?? 0) ? i : best), 0);
                        scaled[idx].v = Math.max(0, scaled[idx].v + diff);
                      }
                      return scaled.map(({ eth, v }) => (
                        <span key={eth} className="text-amber-300/90">
                          {ethnicityOrFactionToNationLabel(eth)} {v.toLocaleString()}{' '}
                        </span>
                      ));
                    })()}
                  </div>
                )}
                {!(departedByEthnicity && Object.keys(departedByEthnicity).length > 0) && (outSettlement + lostSettlement) > 0 && (
                  <div className="text-[10px] pt-1 border-t border-panel-border/20">
                    <span className="text-text-secondary">{t('settlement.leftHere')}: </span>
                    <span className="text-amber-300/90">{(outSettlement + lostSettlement).toLocaleString()}</span>
                    <span className="text-text-secondary/80"> {t('settlement.breakdownNotRecorded')}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-text-secondary uppercase font-semibold">{t('settlement.population')}</span>
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
            {isPanel && <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">{t('settlement.preWarEthnicStructure')}</div>}
            {ethnic.filter((e) => e.pct > 2).map((e) => {
              const count = Math.round(popOriginal * e.pct / 100);
              return (
                <div key={e.label} className="grid grid-cols-[50px_1fr_50px_30px] items-center gap-2 text-[10px]">
                  <span className="text-text-secondary truncate">{e.label}</span>
                  <div className="h-1 bg-black/30 rounded overflow-hidden">
                    <div
                      className={`h-full ${ethnicBarColor(e.label)}`}
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                  <span className="text-text-primary font-mono text-right tabular-nums">{count.toLocaleString()}</span>
                  <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
                </div>
              );
            })}
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
              {isPanel && <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">{t('settlement.currentEthnicStructure')}</div>}
              {cur.map((e) => (
                <div key={e.label} className="grid grid-cols-[60px_1fr_50px_30px] items-center gap-2 text-[10px]">
                  <span className="text-text-secondary truncate">{e.label}</span>
                  <div className="h-1 bg-black/30 rounded overflow-hidden">
                    <div
                      className={`h-full ${ethnicBarColor(e.label)}`}
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                  <span className="text-text-primary font-mono text-right tabular-nums">{Math.round(e.count).toLocaleString()}</span>
                  <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Stationed Units */}
        {(!isPanel || activeTab === 'overview') && formationsAtOsid.length > 0 && (
          <div className="pt-2 border-t border-panel-border/50">
            <div className="text-[10px] text-text-secondary uppercase font-semibold mb-1.5 flex justify-between items-center">
              <span>{t('settlement.stationedUnits')}</span>
              {isPanel && brigadeCountByFaction && Object.keys(brigadeCountByFaction).length > 0 ? (
                <span className="text-accent-gold font-normal normal-case">
                  {t(formationsAtOsid.length === 1 ? 'settlement.brigadeSingular' : 'settlement.brigadePlural', { count: formationsAtOsid.length })}
                  {' · '}
                  {Object.entries(brigadeCountByFaction)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([faction, count]) => (
                      <span key={faction} className={FACTION_COLORS_SUBTLE[faction] ?? ''}>
                        {getPlayerSafeMilitaryFactionName(faction)} {count}{' '}
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
                  onKeyDown={onFormationClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onFormationClick(f.id);
                    }
                  } : undefined}
                  className={`flex items-center gap-2 py-1 px-1.5 bg-black/10 rounded border border-white/5 transition-colors ${onFormationClick ? 'hover:border-white/20 hover:bg-black/20 cursor-pointer' : 'hover:border-white/10'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.faction === 'RBiH' ? 'bg-green-600' : f.faction === 'RS' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-primary font-medium truncate">{getLocalizedFormationName(f, locale)}</span>
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
                <div className="text-[9px] text-text-secondary text-right italic pt-0.5">{t('settlement.additionalUnits', { count: restCount })}</div>
              )}
            </div>
          </div>
        )}

        {/* Municipality-level population and displacement summary */}
        {isPanel && activeTab === 'municipality' && disp && (
          <div className="pt-2 space-y-2">
            <div className="text-[10px] text-text-secondary uppercase font-semibold">
              {t('settlement.municipalityPopulation', { municipality: municipality || getPlayerSafeMunicipalityName(munId, t('settlement.municipality')) })}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-text-secondary">{t('settlement.preWar')}</span>
              <span className="font-mono font-bold text-text-primary">{disp.originalPopulation.toLocaleString()}</span>
              <span className="text-text-secondary">→</span>
              <span className="text-text-secondary">{t('settlement.now')}</span>
              <span className="font-mono font-bold text-text-primary">{disp.currentPopulation.toLocaleString()}</span>
              <span className={`font-mono text-[10px] ${disp.currentPopulation < disp.originalPopulation ? 'text-red-400' : 'text-emerald-400'}`}>
                {disp.currentPopulation >= disp.originalPopulation ? '+' : ''}{(disp.currentPopulation - disp.originalPopulation).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              {disp.displacedOut > 0 && (
                <div className="bg-black/20 rounded px-2 py-1 text-center flex-1">
                  <span className="text-[9px] text-red-400/80">{t('settlement.displaced')}</span>
                  <div className="font-mono font-semibold text-red-400 text-[11px]">-{disp.displacedOut.toLocaleString()}</div>
                </div>
              )}
              {disp.lostPopulation > 0 && (
                <div className="bg-black/20 rounded px-2 py-1 text-center flex-1">
                  <span className="text-[9px] text-red-300/80">{t('settlement.killedFled')}</span>
                  <div className="font-mono font-semibold text-red-300 text-[11px]">-{disp.lostPopulation.toLocaleString()}</div>
                </div>
              )}
              {disp.displacedIn > 0 && (
                <div className="bg-black/20 rounded px-2 py-1 text-center flex-1">
                  <span className="text-[9px] text-emerald-500/80">{t('settlement.arrived')}</span>
                  <div className="font-mono font-semibold text-emerald-400 text-[11px]">+{disp.displacedIn.toLocaleString()}</div>
                </div>
              )}
            </div>
            {disp.arrivedByFaction && Object.keys(disp.arrivedByFaction).length > 0 && (
              <div className="text-[10px]">
                <span className="text-text-secondary">{t('settlement.arrivedByFaction')}: </span>
                {Object.entries(disp.arrivedByFaction)
                  .filter(([, n]) => (n ?? 0) > 0)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([faction, n]) => (
                    <span key={faction} className={FACTION_COLORS_SUBTLE[faction] ?? 'text-text-primary'}>
                      {ethnicityOrFactionToNationLabel(faction)} +{(n ?? 0).toLocaleString()}{' '}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
        {isPanel && activeTab === 'municipality' && !disp && (
          <div className="pt-2 text-[10px] text-text-secondary italic">{t('settlement.noMunicipalityDisplacement')}</div>
        )}

        {/* Municipality-level ethnic structure — pre-war and current */}
        {isPanel && activeTab === 'municipality' && munEthnicData && (
          <>
            <div className="pt-2 border-t border-panel-border/30 space-y-1">
              <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">{t('settlement.preWarEthnicStructure')}</div>
              {munEthnicData.preWar.filter((e) => e.pct > 2).map((e) => (
                <div key={e.label} className="grid grid-cols-[50px_1fr_50px_30px] items-center gap-2 text-[10px]">
                  <span className="text-text-secondary truncate">{e.label}</span>
                  <div className="h-1 bg-black/30 rounded overflow-hidden">
                    <div className={`h-full ${ethnicBarColor(e.label)}`} style={{ width: `${e.pct}%` }} />
                  </div>
                  <span className="text-text-primary font-mono text-right tabular-nums">{e.count.toLocaleString()}</span>
                  <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            {munEthnicData.current && (
              <div className="pt-2 border-t border-panel-border/30 space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-semibold mb-0.5">{t('settlement.currentEthnicStructure')}</div>
                {munEthnicData.current.filter((e) => e.pct > 0.5).map((e) => (
                  <div key={e.label} className="grid grid-cols-[60px_1fr_50px_30px] items-center gap-2 text-[10px]">
                    <span className="text-text-secondary truncate">{e.label}</span>
                    <div className="h-1 bg-black/30 rounded overflow-hidden">
                      <div className={`h-full ${ethnicBarColor(e.label)}`} style={{ width: `${e.pct}%` }} />
                    </div>
                    <span className="text-text-primary font-mono text-right tabular-nums">{Math.round(e.count).toLocaleString()}</span>
                    <span className="text-text-secondary font-mono text-right">{e.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(!isPanel || activeTab === 'overview') && terrain && (
          <div className="pt-1 space-y-0.5">
            {!terrainModifier && (
              <div className="flex justify-between text-[10px] text-text-secondary italic">
                <span>{t('settlement.terrainContext')}</span>
                <span>{terrain}</span>
              </div>
            )}
            {elevation != null && (
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>{t('settlement.elevation')}</span>
                <span>{elevation}m{typeof props.river_crossing_penalty === 'number' && props.river_crossing_penalty > 0 ? ` | ${t('settlement.riverCrossing')}` : ''}</span>
              </div>
            )}
            {typeof props.road_access_index === 'number' && props.road_access_index < 0.5 && (
              <div className="flex justify-between text-[10px] text-amber-400/80">
                <span>{t('settlement.roadAccess')}</span>
                <span>{t('settlement.poorPct', { pct: Math.round(props.road_access_index as number * 100) })}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
