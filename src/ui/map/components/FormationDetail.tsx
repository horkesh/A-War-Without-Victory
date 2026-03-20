import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { assignBrigadeToSectorOverrideAction } from '../desktop/orderActions';
import { getPanelRailStyle } from './panelRail';
import { turnToDateString, formatCombatOutcome, formatPosture, toTitleCase } from '../utils/formatters';
import { getArmyCrest } from '../utils/factionAssets';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import type { FormationView } from '../data/types';
import { getPrestigeTier, getPrestigeTierColor, getHighestTier, getDecorationName } from '../utils/decorationUtils';
import { TabBar } from './TabBar';
import { computeBrigadeEffectiveness } from '../utils/combatEffectiveness';
import { Icon } from './icons/Icon';


/** Zero combat summary for brigades that have not yet been in combat (so Combat Record always shows). */
const ZERO_BRIGADE_COMBAT_SUMMARY: NonNullable<FormationView['combatSummary']> = {
  battles_fought: 0,
  victories: 0,
  defeats: 0,
  stalemates: 0,
  battles_as_attacker: 0,
  battles_as_defender: 0,
  total_casualties_taken: 0,
  total_casualties_inflicted: 0,
  total_osids_captured: 0,
  total_osids_lost: 0,
  win_rate: 0,
  casualty_exchange_ratio: 0,
  current_personnel: 0,
  peak_aggregate_personnel: 0,
  nadir_aggregate_personnel: 0,
  arc_distribution: {},
  brigade_count: 1,
  active_brigade_count: 1,
  most_casualties_brigade_id: null,
  most_victories_brigade_id: null,
};

type DetailTab = 'overview' | 'record' | 'orders';

/**
 * Right panel when a formation marker is clicked: name, kind, faction, strength, fatigue, orders.
 */
interface FormationDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function FormationDetail({ railSlot }: FormationDetailProps) {
  const ipc = useIPC();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const addStagedOrder = useGameStore((s) => s.addStagedOrder);
  const setLoadError = useGameStore((s) => s.setLoadError);

  if (operationsPanelOpen || !selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;

  if (!loadedGameState || !formation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={getPanelRailStyle(railSlot, '24rem', 'left')}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-4 space-y-4">
          <div className="h-4 w-1/2 bg-panel-card rounded panel-shimmer" />
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-3 w-full bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="h-24 w-full bg-panel-card rounded panel-shimmer" />
        </div>
      </div>
    );
  }

  const isBrigade = formation.kind === 'brigade';

  // Home-distance helpers
  const hops = formation.homeHops;
  const mult = formation.homeDistanceMult;
  const isElite = formation.homeIsElite ?? false;
  const isHome = typeof hops === 'number' && hops <= 3;
  const effPct = mult != null ? Math.round(mult * 100) : null;

  // Earned-prestige tier (from in-run decorations, not OOB distinction_potential)
  const decorations = formation.decorations ?? [];
  const prestigeTier = getPrestigeTier(decorations);
  const prestigeRingClass = prestigeTier === 1
    ? 'ring-1 ring-yellow-400/55 shadow-[0_0_18px_rgba(250,204,21,0.14)]'
    : prestigeTier === 2
    ? 'ring-1 ring-slate-300/45'
    : prestigeTier === 3
    ? 'ring-1 ring-amber-700/35'
    : '';
  const headerBgClass = prestigeTier === 1
    ? 'bg-gradient-to-r from-yellow-950/60 via-panel-card to-panel-card'
    : prestigeTier === 2
    ? 'bg-gradient-to-r from-slate-700/40 via-panel-card to-panel-card'
    : 'bg-panel-card';

  // Sector helpers
  const sectors = loadedGameState.corpsFrontSectors ?? [];
  const currentSector = isBrigade && formation.corps_id
    ? sectors.find(s => s.corps_id === formation.corps_id &&
        (s.assigned_brigade_ids.includes(formation.id) || s.reserve_brigade_ids.includes(formation.id)))
    : null;
  const sameSectorList = isBrigade && formation.corps_id
    ? sectors.filter(s => s.corps_id === formation.corps_id)
    : [];
  const sectorOverrideId = formation.sectorOverrideId;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'record', label: 'Record' },
    { id: 'orders', label: 'Orders' },
  ];

  return (
    <div
      className={`panel-power-on weathered-panel panel-slide-in-right flex flex-col rounded-lg shadow-xl overflow-hidden ${prestigeRingClass}`}
      style={getPanelRailStyle(railSlot, '24rem', 'left')}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${headerBgClass} rounded-t-lg border-b border-panel-border shrink-0`}>
        <div className="flex items-center gap-2">
          {getArmyCrest(formation.faction) && (
            <img src={getArmyCrest(formation.faction)} alt="" className="w-4 h-4 object-contain" />
          )}
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Formation
          </span>
          {isBrigade && decorations.length > 0 && (
            <div className="flex items-center gap-px ml-0.5" title={`${decorations.length} decoration${decorations.length !== 1 ? 's' : ''} earned`}>
              {decorations.slice(0, 5).map((dec, i) => (
                <span key={`${dec.tier}-${dec.type}-${i}`} className={`text-[8px] leading-none select-none ${getPrestigeTierColor(dec.tier === 'tier_3' ? 1 : dec.tier === 'tier_2' ? 2 : 3)}`}>★</span>
              ))}
              {decorations.length > 5 && (
                <span className="text-[8px] text-text-secondary ml-0.5">+{decorations.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedFormationId(null)}
            className="text-text-secondary hover:text-interactive text-sm leading-none p-1 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-4 flex-1 space-y-3 overflow-auto min-h-0 min-w-0 relative">
        {/* Faction crest watermark */}
        {getArmyCrest(formation.faction) && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url(${getArmyCrest(formation.faction)})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: '180px',
              height: '180px',
            }}
          />
        )}

        {/* ────────── OVERVIEW TAB ────────── */}
        {activeTab === 'overview' && (
          <>
            <div className={`font-mono text-sm font-medium ${FACTION_COLORS_SUBTLE[formation.faction] ?? 'text-text-primary'}`}>
              {formation.name}
            </div>

            {/* Parent assignment (brigades) — corps or army HQ */}
            {isBrigade && formation.corps_id && (() => {
              const parent = loadedGameState.formations.find(f => f.id === formation.corps_id);
              if (!parent) return null;
              const isArmyHq = parent.kind === 'army_hq';
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isArmyHq) {
                      useGameStore.setState({
                        selectedArmyId: parent.id,
                        selectedCorpsId: null,
                        selectedFormationId: null,
                        selectedOperationKey: null,
                        selectedOsid: null,
                        selectedCorpsFrontSectorId: null,
                      });
                    } else {
                      useGameStore.setState({
                        selectedArmyId,
                        selectedCorpsId: parent.id,
                        selectedFormationId: parent.id,
                        selectedOperationKey: null,
                        selectedOsid: null,
                        selectedCorpsFrontSectorId: null,
                      });
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 bg-accent-blue/5 border border-accent-blue/20 rounded-md flex items-center justify-between text-[11px] hover:bg-accent-blue/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-accent-blue/60 uppercase font-bold tracking-tighter">
                      {isArmyHq ? 'Subordinated to:' : 'Corps:'}
                    </span>
                    <span className="text-accent-blue font-bold uppercase group-hover:underline">{parent.name}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/40 group-hover:bg-accent-blue transition-colors" />
                </button>
              );
            })()}

            {/* Sector assignment (brigades) */}
            {(() => {
              if (isBrigade && formation.corps_id && currentSector) {
                return (
                  <button
                    type="button"
                    onClick={() => useGameStore.setState({
                      selectedArmyId,
                      selectedCorpsId: null,
                      selectedCorpsFrontSectorId: currentSector.sector_id,
                      selectedFormationId,
                      selectedOperationKey: null,
                      selectedOsid: null,
                    })}
                    className="w-full text-left px-2 py-1.5 bg-accent-gold/5 border border-accent-gold/20 rounded-md flex items-center justify-between text-[11px] hover:bg-accent-gold/10 transition-colors group"
                    title={currentSector.sector_id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-accent-gold/60 uppercase font-bold tracking-tighter">Sector:</span>
                      <span className="text-accent-gold font-bold uppercase group-hover:underline">
                        {currentSector.display_name}
                      </span>
                      {sectorOverrideId && (
                        <span className="px-1 py-0 bg-accent-gold/20 text-accent-gold text-[9px] uppercase rounded border border-accent-gold/30 font-bold">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary italic">
                        {currentSector.assigned_brigade_ids.includes(formation.id) ? 'Frontline' : 'Reserve'}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-gold/40 group-hover:bg-accent-gold transition-colors" />
                    </div>
                  </button>
                );
              }
              if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
                const corpsSectors = sectors.filter(s => s.corps_id === formation.id);
                if (corpsSectors.length > 0) {
                  return (
                    <div className="px-2 py-1 bg-white/5 border border-white/10 rounded flex items-center justify-between text-[10px]">
                      <span className="text-text-secondary uppercase">Operational Sectors:</span>
                      <span className="text-text-primary font-bold">{corpsSectors.length} ACTIVE</span>
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Posture & readiness */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1 bg-black/20 rounded border border-panel-border/30">
              <span className="text-text-secondary">Posture:</span>
              <span className="text-text-primary font-semibold">{formatPosture(formation.posture ?? 'hold')}</span>
              <span className="text-text-secondary ml-1">Readiness:</span>
              <span className="text-text-primary">{toTitleCase(formation.readiness)}</span>
            </div>

            {/* Officer info */}
            {(() => {
              const commander = getFormationCommander(formation, loadedGameState);
              if (commander) {
                const isArmy = formation.kind === 'army_hq' || formation.kind === 'army';
                const label = isArmy ? 'Army Commander' : 'Corps Commander';
                return (
                  <div className="pt-2 border-t border-panel-border">
                    <OfficerProfile officer={commander} label={label} compact emphasis={isArmy ? 'defense' : 'aggression'} />
                  </div>
                );
              }
              if (isBrigade && formation.officer_quality != null) {
                return (
                  <div className="pt-2 border-t border-panel-border flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Officer Cadre Quality</span>
                    <span className="text-text-primary font-mono bg-black/30 px-1.5 py-0.5 rounded border border-panel-border/50">
                      {Math.round(formation.officer_quality * 100)}%
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Highest Decoration */}
            {(() => {
              const highestTier = getHighestTier(formation.decorations);
              if (!highestTier) return null;
              const faction = formation.faction ?? '';
              const displayName = getDecorationName(faction, highestTier);
              const tierColor = highestTier === 'tier_3' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
                : highestTier === 'tier_2' ? 'text-slate-300 border-slate-400/30 bg-slate-800/20'
                : 'text-amber-600 border-amber-600/30 bg-amber-900/20';
              return (
                <div className="pt-2 border-t border-panel-border flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Unit Distinction</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border ${tierColor}`}>
                    ★ {displayName}
                  </span>
                </div>
              );
            })()}

            {formation.honor && (
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-text-secondary">Historical Honor</span>
                <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[10px] font-semibold uppercase tracking-wider rounded border border-accent-gold/30">
                  {formation.honor}
                </span>
              </div>
            )}

            {/* TO&E */}
            {formation.composition && (
              <div className="pt-2 border-t border-panel-border space-y-2">
                <div className="text-xs text-text-secondary">TO&E (Equipment)</div>
                <div className="space-y-1.5 text-xs">
                  {formation.composition.tanks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">Tanks</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: `${formation.composition.tank_condition.operational * 100}%` }} className="bg-[#55d48a]" />
                          <div style={{ width: `${formation.composition.tank_condition.degraded * 100}%` }} className="bg-[#d4d455]" />
                          <div style={{ width: `${formation.composition.tank_condition.non_operational * 100}%` }} className="bg-[#d45555]" />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.tanks}</span>
                      </div>
                    </div>
                  )}
                  {formation.composition.artillery > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">Artillery</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: `${formation.composition.artillery_condition.operational * 100}%` }} className="bg-[#55d48a]" />
                          <div style={{ width: `${formation.composition.artillery_condition.degraded * 100}%` }} className="bg-[#d4d455]" />
                          <div style={{ width: `${formation.composition.artillery_condition.non_operational * 100}%` }} className="bg-[#d45555]" />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.artillery}</span>
                      </div>
                    </div>
                  )}
                  {formation.composition.aa_systems > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">AA Sys</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: '100%' }} className="bg-[#55d48a]" />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.aa_systems}</span>
                      </div>
                    </div>
                  )}
                  {formation.equipment_decay != null && (
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-text-secondary">Overall Supply Effectiveness</span>
                      <span className="text-text-primary font-mono">{Math.round(formation.equipment_decay * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-2 py-1 bg-black/10 rounded">
              <span className="text-text-secondary flex items-center gap-1"><Icon name="cohesion" size={12} /> Cohesion</span>
              <span className="text-text-primary tabular-nums flex items-center gap-1">
                {(() => {
                  const c = formation.cohesion;
                  const blocks = 10;
                  const filled = Math.round((c / 100) * blocks);
                  const color = c >= 70 ? '#d4a055' : c >= 40 ? '#d48a55' : '#d45555';
                  return (
                    <>
                      <span style={{ color, letterSpacing: '1px', fontSize: '10px' }}>
                        {'■'.repeat(filled)}<span style={{ opacity: 0.2 }}>{'■'.repeat(blocks - filled)}</span>
                      </span>
                      <span className="text-text-secondary text-[10px]">{Math.round(c)}</span>
                    </>
                  );
                })()}
              </span>
              {formation.morale != null && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="morale" size={12} /> Morale</span>
                  <span className="text-text-primary tabular-nums flex items-center gap-1">
                    {(() => {
                      const m = formation.morale!;
                      const blocks = 10;
                      const filled = Math.round((m / 100) * blocks);
                      const color = m >= 60 ? '#55d48a' : m >= 30 ? '#d4d455' : '#d45555';
                      return (
                        <>
                          <span style={{ color, letterSpacing: '1px', fontSize: '10px' }}>
                            {'■'.repeat(filled)}<span style={{ opacity: 0.2 }}>{'■'.repeat(blocks - filled)}</span>
                          </span>
                          <span className="text-text-secondary text-[10px]">{Math.round(m)}</span>
                        </>
                      );
                    })()}
                  </span>
                </>
              )}
              <span className="text-text-secondary flex items-center gap-1"><Icon name="fatigue" size={12} /> Fatigue</span>
              <span className="text-text-primary tabular-nums">{Math.round(formation.fatigue)}</span>
              {formation.personnel != null && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="personnel" size={12} /> Personnel</span>
                  <span className="text-text-primary tabular-nums">{formation.personnel.toLocaleString()} men</span>
                </>
              )}
              {formation.kind === 'brigade' && formation.personnel != null && (() => {
                const eff = computeBrigadeEffectiveness(formation);
                const color = eff.value >= 600 ? '#56d364' : eff.value >= 300 ? '#e8a838' : '#f47068';
                // Find the worst modifier to highlight
                const mods = eff.modifiers;
                const worst = Object.entries(mods).reduce((a, b) => b[1] < a[1] ? b : a);
                const worstLabel = worst[1] < 0.85
                  ? ` (${worst[0]} ${Math.round(worst[1] * 100)}%)`
                  : '';
                return (
                  <>
                    <span className="text-text-secondary flex items-center gap-1"><Icon name="star" size={12} /> Effectiveness</span>
                    <span className="tabular-nums font-semibold" style={{ color }}>
                      {Math.round(eff.value).toLocaleString()}
                      <span className="text-[9px] font-normal text-text-secondary">{worstLabel}</span>
                    </span>
                  </>
                );
              })()}
              {formation.entrenchment_turns != null && formation.entrenchment_turns > 0 && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="entrenchment" size={12} /> Entrenched</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.entrenchment_turns!)} turn{Math.round(formation.entrenchment_turns!) !== 1 ? 's' : ''}</span>
                </>
              )}
              {formation.dig_in_progress != null && formation.dig_in_progress > 0 && (
                <>
                  <span className="text-text-secondary">Dig-in Progress</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.dig_in_progress * 100)}%</span>
                </>
              )}
              {formation.disrupted_turns != null && formation.disrupted_turns > 0 && (
                <>
                  <span className="font-bold uppercase flex items-center gap-1" style={{ color: '#d45555' }}><Icon name="disrupted" size={12} /> DISRUPTED</span>
                  <span className="tabular-nums font-semibold" style={{ color: '#d45555' }}>
                    {formation.disrupted_turns} turn{formation.disrupted_turns !== 1 ? 's' : ''} remaining
                  </span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsExhaustion != null && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="fatigue" size={12} /> Exhaustion</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.corpsExhaustion * 100)}%</span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsCommandSpan != null && (
                <>
                  <span className="text-text-secondary">Command Span</span>
                  <span className="text-text-primary tabular-nums">{formation.corpsCommandSpan.toFixed(1)}x</span>
                </>
              )}
            </div>

            {formation.movementStatus && formation.movementStatus !== 'deployed' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1.5 bg-black/20 rounded border border-panel-border/40">
                <span className="text-text-secondary uppercase font-bold text-[10px]">Movement:</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${
                  formation.movementStatus === 'in_transit'
                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                    : 'bg-[#d4a055]/20 text-[#d4a055] border-[#d4a055]/40'
                }`}>
                  {toTitleCase(formation.movementStatus)}
                </span>
                {formation.movementStance && (
                  <span className="text-text-secondary lowercase italic">({formation.movementStance} march)</span>
                )}
              </div>
            )}

            {formation.location_osid && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Location: </span>
                <span className="font-mono text-text-primary break-all" title={formation.location_osid}>
                  {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                </span>
              </div>
            )}

            {isBrigade && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Home municipality: </span>
                <span className="font-mono text-text-primary break-all" title={formation.municipalityId ?? '—'}>
                  {formation.municipalityId ? toTitleCase(formation.municipalityId) : '—'}
                </span>
              </div>
            )}

            {/* Narrative arc badge (brief — full history on Record tab) */}
            {formation.narrativeArc && (
              <div className="pt-2 border-t border-panel-border flex items-center justify-between">
                <span className="text-xs text-text-secondary">Narrative Arc</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  formation.narrativeArc === 'veteran' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
                  : formation.narrativeArc === 'bloodied' ? 'text-[#d45555] border-[#d45555]/30 bg-[#d45555]/10'
                  : formation.narrativeArc === 'risen' ? 'text-[#55d48a] border-[#55d48a]/30 bg-[#55d48a]/10'
                  : formation.narrativeArc === 'shattered' ? 'text-slate-400 border-slate-400/30 bg-slate-700/20'
                  : formation.narrativeArc === 'garrison' ? 'text-accent-blue border-accent-blue/30 bg-accent-blue/10'
                  : 'text-text-primary border-panel-border bg-black/20'
                }`}>
                  {formation.narrativeArc}
                </span>
              </div>
            )}
          </>
        )}

        {/* ────────── RECORD TAB ────────── */}
        {activeTab === 'record' && (
          <>
            {/* Campaign Losses — top of Record tab */}
            {isBrigade && (
              <div className="p-2 bg-black/20 rounded border border-panel-border/40 space-y-1.5">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Campaign Losses</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">KIA</div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#d45555' }}>
                      {(formation.campaignKia ?? Math.round((formation.combatSummary?.total_casualties_taken ?? 0) * 0.30)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">WIA</div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#d4d455' }}>
                      {(formation.campaignWia ?? Math.round((formation.combatSummary?.total_casualties_taken ?? 0) * 0.55)).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">MIA/POW</div>
                    <div className="text-sm font-mono font-bold text-text-secondary">
                      {(formation.campaignMia ?? Math.round((formation.combatSummary?.total_casualties_taken ?? 0) * 0.15)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formation.last_repulsed_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>Last repulsed from: </span>
                <span className="font-mono text-text-primary break-all">{getOsidDisplayName(formation.last_repulsed_from.osid, osidDisplayNames)}</span>
                <span> (wk {formation.last_repulsed_from.turn})</span>
              </div>
            )}
            {formation.last_retreat_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>Retreated from: </span>
                <span className="font-mono text-text-primary break-all">{getOsidDisplayName(formation.last_retreat_from.osid, osidDisplayNames)}</span>
                <span> (wk {formation.last_retreat_from.turn})</span>
              </div>
            )}

            {isBrigade && (
              <div className="space-y-2">
                <CombatSummaryPanel summary={formation.combatSummary ?? ZERO_BRIGADE_COMBAT_SUMMARY} compact noTopBorder />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-1">
                  {formation.brigade_history && (
                    <>
                      {formation.brigade_history.longest_victory_streak > 0 && (
                        <>
                          <span className="text-text-secondary">Highest win streak</span>
                          <span className="text-accent-gold tabular-nums font-semibold">{formation.brigade_history.longest_victory_streak}</span>
                        </>
                      )}
                      {formation.brigade_history.turns_under_siege > 0 && (
                        <>
                          <span className="text-text-secondary">Turns under siege</span>
                          <span className="text-text-primary tabular-nums">{formation.brigade_history.turns_under_siege}</span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {formation.brigade_history?.total_equipment_destroyed &&
                  (formation.brigade_history.total_equipment_destroyed.tanks > 0 ||
                    formation.brigade_history.total_equipment_destroyed.artillery > 0) && (
                    <div className="mt-2 p-1.5 border border-dashed border-[#55d48a]/30 bg-[#55d48a]/5 rounded flex justify-between items-center">
                      <span className="text-[10px] text-[#55d48a] uppercase font-semibold">Equipment Destroyed</span>
                      <div className="flex gap-2 text-xs font-mono">
                        {formation.brigade_history.total_equipment_destroyed.tanks > 0 && (
                          <span title="Tanks/APCs Knocked Out">🛻 {formation.brigade_history.total_equipment_destroyed.tanks}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.artillery > 0 && (
                          <span title="Artillery Destroyed">💥 {formation.brigade_history.total_equipment_destroyed.artillery}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.aa_systems > 0 && (
                          <span title="AA Systems Destroyed">🎯 {formation.brigade_history.total_equipment_destroyed.aa_systems}</span>
                        )}
                      </div>
                    </div>
                  )}

                {formation.recent_engagements && formation.recent_engagements.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-text-secondary mb-1">Recent engagements</div>
                    <div className="space-y-1">
                      {formation.recent_engagements.map((engagement, idx) => (
                        <div key={`${engagement.turn}-${engagement.osid}-${engagement.role}-${idx}`} className="text-[11px] leading-4 border-l-2 pl-1.5 border-panel-border/30">
                          <span className="text-text-secondary">{turnToDateString(engagement.turn)} </span>
                          <span className="text-text-primary">{formatCombatOutcome(engagement.outcome)}</span>
                          <span className="text-text-secondary"> as {engagement.role} @ </span>
                          <span className="font-mono text-text-primary">{getOsidDisplayName(engagement.osid, osidDisplayNames)}</span>
                          {engagement.territory_flipped && <span className="text-accent-gold ml-1">⚑</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isBrigade && formation.combatSummary && (
              <CombatSummaryPanel summary={formation.combatSummary} compact noTopBorder />
            )}

            {/* Unit History — bottom of Record tab */}
            {formation.narrativeArc && (
              <div className="pt-3 border-t border-panel-border space-y-2 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Unit History</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    formation.narrativeArc === 'veteran' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
                    : formation.narrativeArc === 'bloodied' ? 'text-[#d45555] border-[#d45555]/30 bg-[#d45555]/10'
                    : formation.narrativeArc === 'risen' ? 'text-[#55d48a] border-[#55d48a]/30 bg-[#55d48a]/10'
                    : formation.narrativeArc === 'shattered' ? 'text-slate-400 border-slate-400/30 bg-slate-700/20'
                    : formation.narrativeArc === 'garrison' ? 'text-accent-blue border-accent-blue/30 bg-accent-blue/10'
                    : 'text-text-primary border-panel-border bg-black/20'
                  }`}>
                    {formation.narrativeArc}
                  </span>
                </div>
                {formation.warNarrative && (
                  <div className="text-[11px] text-text-primary leading-4 italic whitespace-pre-wrap break-words">{formation.warNarrative}</div>
                )}
                {formation.notableMoments && formation.notableMoments.length > 0 && (
                  <div className="space-y-0.5 pt-1 min-w-0">
                    {formation.notableMoments.map((m, i) => (
                      <div key={i} className="text-[11px] text-text-secondary break-words">
                        <span className="text-text-primary">{turnToDateString(m.turn)}:</span>{' '}
                        {m.description.replace(/op:[a-z0-9_]+:[a-z0-9_]+/gi, (match) => getOsidDisplayName(match, osidDisplayNames))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ────────── ORDERS TAB ────────── */}
        {activeTab === 'orders' && (
          <>
            {/* Elite loan status (elite brigades only) */}
            {formation.eliteLoanState && (
              <div className="space-y-2 pb-3 border-b border-panel-border">
                <span className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70">Army Reserve Status</span>
                {formation.eliteLoanState.permanently_degraded ? (
                  <div className="px-2 py-1.5 bg-[#d45555]/10 border border-[#d45555]/30 rounded text-[11px] text-[#d45555] font-semibold">
                    DEGRADED — Elite status permanently lost
                  </div>
                ) : formation.eliteLoanState.on_loan ? (
                  <div className="space-y-1.5">
                    <div className="px-2 py-1.5 bg-[#d4a855]/10 border border-[#d4a855]/40 rounded text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#d4a855] font-bold uppercase text-[10px]">On Loan</span>
                        <span className="text-text-secondary text-[10px]">
                          {formation.eliteLoanState.turns_deployed}w deployed
                        </span>
                      </div>
                      <div className="text-text-secondary">
                        → {loadedGameState.formations.find(f => f.id === formation.eliteLoanState!.loaned_to_corps)?.name ?? formation.eliteLoanState.loaned_to_corps}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void ipc.recallEliteBrigade(formation.id).then(r => { if (!r.ok) setLoadError(r.error ?? 'Recall failed'); })}
                      className="w-full px-2 py-1.5 bg-[#d45555]/20 border border-[#d45555]/40 rounded text-[11px] text-[#d45555] font-bold hover:bg-[#d45555]/30 transition-colors"
                    >
                      RECALL TO RESERVE
                    </button>
                  </div>
                ) : formation.eliteLoanState.in_cooldown ? (
                  <div className="px-2 py-1.5 bg-black/20 border border-panel-border/40 rounded text-[11px] text-text-secondary">
                    COOLDOWN — returning to readiness
                  </div>
                ) : (
                  <div className="px-2 py-1.5 bg-[#55d48a]/10 border border-[#55d48a]/30 rounded text-[11px] text-[#55d48a] font-semibold">
                    READY — available for deployment
                  </div>
                )}
              </div>
            )}

            {/* Home-distance effectiveness widget (brigades only) */}
            {isBrigade && effPct != null && (
              <div className="space-y-2">
                {/* Layer 1: badge */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-black/20 rounded border border-panel-border/40">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Field Effectiveness</span>
                  {isHome ? (
                    <span className="px-1.5 py-0.5 bg-[#55d48a]/20 text-[#55d48a] text-[10px] font-bold rounded border border-[#55d48a]/30 uppercase">
                      Home Turf
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase ${
                        effPct >= 90 ? 'bg-[#55d48a]/10 text-[#55d48a] border-[#55d48a]/30'
                        : effPct >= 80 ? 'bg-[#d4d455]/10 text-[#d4d455] border-[#d4d455]/30'
                        : 'bg-[#d45555]/10 text-[#d45555] border-[#d45555]/30'
                      }`}
                    >
                      {effPct}% Eff{isElite ? ' (elite)' : ''}
                    </span>
                  )}
                </div>

                {/* Layer 2: dual power stats */}
                {!isHome && hops != null && (
                  <div className="px-2 py-1.5 bg-black/10 rounded border border-panel-border/20 text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Power at home (100%)</span>
                      <span className="text-[#55d48a] font-mono font-semibold">
                        {formation.personnel != null ? Math.round(formation.personnel).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Power here ({effPct}%)</span>
                      <span className={`font-mono font-semibold ${effPct >= 90 ? 'text-[#d4d455]' : 'text-[#d45555]'}`}>
                        {formation.personnel != null ? Math.round(formation.personnel * (effPct / 100)).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary pt-0.5">
                      {hops} hop{hops !== 1 ? 's' : ''} from home — unit cohesion and motivation degrade with distance.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Layer 3: Sector picker (brigades only, same corps) */}
            {isBrigade && sameSectorList.length > 0 && (
              <div className="pt-2 border-t border-panel-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70">Sector Assignment</span>
                  {sectorOverrideId && (
                    <button
                      type="button"
                      onClick={() => void assignBrigadeToSectorOverrideAction(
                        { ipc, addStagedOrder, setLoadError },
                        formation.id,
                        null
                      )}
                      className="text-[10px] text-[#d45555] hover:underline"
                    >
                      Clear Override
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {sameSectorList.map(sector => {
                    const isCurrentOverride = sectorOverrideId === sector.sector_id;
                    const isCurrentAutomatic = !sectorOverrideId && currentSector?.sector_id === sector.sector_id;
                    return (
                      <button
                        key={sector.sector_id}
                        type="button"
                        disabled={isCurrentOverride}
                        onClick={() => void assignBrigadeToSectorOverrideAction(
                          { ipc, addStagedOrder, setLoadError },
                          formation.id,
                          sector.sector_id
                        )}
                        className={`w-full text-left px-2 py-1.5 rounded border text-[11px] transition-colors ${
                          isCurrentOverride
                            ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold cursor-default'
                            : isCurrentAutomatic
                            ? 'bg-white/5 border-white/20 text-text-primary hover:bg-accent-gold/5 hover:border-accent-gold/30'
                            : 'bg-black/20 border-panel-border/30 text-text-secondary hover:bg-white/5 hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{sector.display_name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isCurrentOverride && (
                              <span className="text-[9px] bg-accent-gold/20 text-accent-gold px-1 rounded border border-accent-gold/30 font-bold uppercase">Override</span>
                            )}
                            {isCurrentAutomatic && (
                              <span className="text-[9px] text-text-secondary italic">current</span>
                            )}
                            <span className="text-[10px] text-text-secondary">{sector.assigned_brigade_ids.length}b</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-text-secondary px-1">
                  Override is permanent. The sector commander will order the brigade to its new frontline position.
                </div>
              </div>
            )}


            {/* Non-brigade: corps stance info placeholder */}
            {!isBrigade && formation.corpsStance && (
              <div className="text-xs space-y-1">
                <span className="text-text-secondary">Corps Stance: </span>
                <span className="text-text-primary font-semibold">{toTitleCase(formation.corpsStance)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
