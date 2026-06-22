import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { assignBrigadeToSectorOverrideAction } from '../desktop/orderActions';
import { getPanelRailStyle } from './panelRail';
import { turnToDateString } from '../utils/formatters';
import { getArmyCrest } from '../utils/factionAssets';
import { getFormationCommander, resolveCorpsCommanderDisplay } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { CommanderDisplayPanel } from './CommanderDisplayPanel';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import type { FormationView } from '../data/types';
import { getPrestigeTier, getPrestigeTierColor, getHighestTier, getDecorationName } from '../utils/decorationUtils';
import { TabBar } from './TabBar';
import { computeBrigadeEffectiveness } from '../utils/combatEffectiveness';
import { Icon } from './icons/Icon';
import { getPlayerFacingCorpsName, getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import {
  getPlayerSafeFormationPostureLabel,
  getPlayerSafeFormationReadinessLabel,
  getPlayerSafeFormationNarrativeArcLabel,
  getPlayerSafeMunicipalityName,
  getPlayerSafeSectorStanceLabel,
} from '../utils/playerSafeText';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { inspectOnField } from '../utils/shellNavigation';
import { buildSectorFormationAssignment } from '../utils/sectorUtils';
import { isFieldedBrigade } from '../../shared/playerVisibility';


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

function formatHistoryMomentDate(turn: number): string {
  if (!Number.isFinite(turn) || turn <= 0) return t('formationDetail.undated');
  return turnToDateString(turn);
}

const ENGAGEMENT_ROLE_LABELS: Record<string, string> = {
  attacker: 'attacker',
  defender: 'defender',
};

const MOVEMENT_STATUS_LABEL_KEYS: Record<NonNullable<FormationView['movementStatus']>, MessageKey> = {
  deployed: 'formationDetail.movementStatus.deployed',
  packing: 'formationDetail.movementStatus.packing',
  in_transit: 'formationDetail.movementStatus.inTransit',
  unpacking: 'formationDetail.movementStatus.unpacking',
};

const ENGAGEMENT_OUTCOME_LABEL_KEYS: Record<string, MessageKey> = {
  decisive_victory: 'aar.outcome.decisive',
  victory: 'aar.outcome.victory',
  costly_victory: 'aar.outcome.costly',
  stalemate: 'aar.outcome.stalemate',
  repulsed: 'aar.outcome.repulsed',
  catastrophic: 'aar.outcome.collapse',
};

function formatNarrativeArcLabel(arc: string): string {
  return getPlayerSafeFormationNarrativeArcLabel(arc, t('formationDetail.campaignHistory'));
}

function formatMovementStatusLabel(status: FormationView['movementStatus']): string {
  const key = status ? MOVEMENT_STATUS_LABEL_KEYS[status] : null;
  return key ? t(key) : t('formationDetail.movement');
}

function formatEngagementOutcomeLabel(outcome: string): string {
  const key = ENGAGEMENT_OUTCOME_LABEL_KEYS[outcome];
  return key ? t(key) : t('aar.outcome.recorded');
}

function formatEngagementRole(role: string): string {
  return ENGAGEMENT_ROLE_LABELS[role] ?? t('formationDetail.participant');
}

function sanitizeHistoryMoment(description: string, osidDisplayNames: Record<string, string> | null): string {
  return description
    .replace(/op:[a-z0-9_]+:[a-z0-9_]+/gi, (match) => getOsidDisplayName(match, osidDisplayNames))
    .replace(/\b[a-z]{2,}_[a-z0-9_]*\b/gi, t('formationDetail.staffRecord'));
}

function isUnsafeRawLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(?:[a-z]{2,}_[a-z0-9_]+|[:|])/.test(value);
}

function safeCorpsLabel(corpsId: string, formations: FormationView[]): string {
  const label = getPlayerFacingCorpsName(corpsId, formations, t('formationDetail.assignedCommand'));
  return isUnsafeRawLabel(label) ? t('formationDetail.assignedCommand') : label;
}

function safeSectorLabel(sectorId: string, sectors: Array<{ sector_id?: string | null; display_name?: string | null }>): string {
  const label = getPlayerFacingSectorName(sectorId, sectors, t('formationDetail.assignedSector'));
  return isUnsafeRawLabel(label) ? t('formationDetail.assignedSector') : label;
}

const EFFECTIVENESS_MODIFIER_LABELS: Record<string, string> = {
  fatigue: 'Fatigue',
  officer: 'Officer cadre',
  homeDistance: 'Distance from home',
  morale: 'Morale',
  disruption: 'Disruption',
  supply: 'Supply',
};

function formatEffectivenessModifierLabel(key: string): string {
  return EFFECTIVENESS_MODIFIER_LABELS[key] ?? t('formationDetail.staffRecord');
}

/**
 * Right panel when a formation marker is clicked: name, kind, faction, strength, fatigue, orders.
 */
interface FormationDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function FormationDetail({ railSlot }: FormationDetailProps) {
  const ipc = useIPC();
  const [locale] = useLocale();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
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
        <div className="p-3 space-y-3">
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
  const isFieldedSelectedBrigade = isFieldedBrigade(formation);
  const postureValue = (() => {
    if (isBrigade) return getPlayerSafeFormationPostureLabel(formation.posture);
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
      return formation.corpsStance
        ? getPlayerSafeSectorStanceLabel(formation.corpsStance)
        : t('formationDetail.corpsStanceUnreported');
    }
    if (formation.kind === 'army_hq') return t('formationDetail.commandPostureUnreported');
    return formation.posture ? getPlayerSafeFormationPostureLabel(formation.posture) : t('formationDetail.commandPostureUnreported');
  })();
  const formationName = getLocalizedFormationName(formation, locale);

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
  const automaticSector = isBrigade && formation.corps_id
    ? sectors.find(s => s.corps_id === formation.corps_id &&
        (
          s.assigned_brigade_ids.includes(formation.id)
          || s.reserve_brigade_ids.includes(formation.id)
          || (s.rear_brigade_ids ?? []).includes(formation.id)
        ))
    : null;
  const sameSectorList = isBrigade && formation.corps_id
    ? sectors.filter(s => s.corps_id === formation.corps_id)
    : [];
  const sectorOverrideId = formation.sectorOverrideId;
  const overrideSector = isBrigade && formation.corps_id && sectorOverrideId
    ? sectors.find(s => s.corps_id === formation.corps_id && s.sector_id === sectorOverrideId)
    : null;
  const currentSector = overrideSector ?? automaticSector;
  const currentSectorIsOverride = Boolean(overrideSector);
  const sectorAssignmentById = new Map(
    sameSectorList.map((sector) => [
      sector.sector_id,
      buildSectorFormationAssignment(sector, loadedGameState.formations, sameSectorList),
    ]),
  );

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: t('formationDetail.overview') },
    { id: 'record', label: t('formationDetail.record') },
    { id: 'orders', label: t('formationDetail.orders') },
  ];

  return (
    <div
      data-testid="formation-detail-panel"
      data-formation-id={formation.id}
      className={`panel-power-on weathered-panel panel-slide-in-right flex flex-col rounded-lg shadow-xl overflow-hidden ${prestigeRingClass}`}
      style={getPanelRailStyle(railSlot, '24rem', 'left')}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${headerBgClass} rounded-t-lg border-b border-panel-border shrink-0`}>
        <div className="flex items-center gap-2">
          {getArmyCrest(formation.faction) && (
            <img src={getArmyCrest(formation.faction)} alt="" className="w-4 h-4 object-contain" />
          )}
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            {t('formationDetail.formation')}
          </span>
          {isBrigade && decorations.length > 0 && (
            <div className="flex items-center gap-px ml-0.5" title={t('formationDetail.decorationsEarned', { count: decorations.length })}>
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
            aria-label={t('formationDetail.closePanel')}
            title={t('formationDetail.closePanel')}
            className="text-text-secondary hover:text-interactive text-sm leading-none p-1 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} idPrefix="formation-detail" />

      <div className="p-3 flex-1 space-y-2.5 overflow-auto min-h-0 min-w-0 relative">
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
              {formationName}
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
                    inspectOnField(useGameStore.getState(), isArmyHq
                      ? { kind: 'field-formation-in-army-reserve', formationId: formation.id, armyHqId: parent.id }
                      : { kind: 'field-formation-in-corps', formationId: formation.id, corpsId: parent.id });
                  }}
                  className="w-full text-left px-2 py-1.5 bg-accent-blue/5 border border-accent-blue/20 rounded-md flex items-center justify-between text-[11px] hover:bg-accent-blue/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-accent-blue/60 uppercase font-bold tracking-tighter">
                      {isArmyHq ? t('formationDetail.subordinatedTo') : t('formationDetail.corps')}
                    </span>
                    <span className="text-accent-blue font-bold uppercase group-hover:underline">
                      {isArmyHq ? getLocalizedFormationName(parent, locale) : safeCorpsLabel(parent.id, loadedGameState.formations)}
                    </span>
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
                    onClick={() => inspectOnField(useGameStore.getState(), {
                      kind: 'field-formation-in-sector',
                      formationId: selectedFormationId,
                      sectorId: currentSector.sector_id,
                      corpsId: currentSector.corps_id ?? formation.corps_id ?? null,
                    })}
                    className="w-full text-left px-2 py-1.5 bg-accent-gold/5 border border-accent-gold/20 rounded-md flex items-center justify-between text-[11px] hover:bg-accent-gold/10 transition-colors group"
                    title={getPlayerFacingSectorName(currentSector.sector_id, sectors)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-accent-gold/60 uppercase font-bold tracking-tighter">{t('formationDetail.sector')}</span>
                      <span className="text-accent-gold font-bold uppercase group-hover:underline">
                        {safeSectorLabel(currentSector.sector_id, sectors)}
                      </span>
                      {currentSectorIsOverride && (
                        <span className="px-1 py-0 bg-accent-gold/20 text-accent-gold text-[9px] uppercase rounded border border-accent-gold/30 font-bold">
                          {t('formationDetail.override')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary italic">
                        {currentSectorIsOverride
                          ? t('formationDetail.override')
                          : currentSector.assigned_brigade_ids.includes(formation.id)
                            ? t('formationDetail.frontline')
                            : (currentSector.rear_brigade_ids ?? []).includes(formation.id)
                              ? t('formationDetail.rearSupport')
                              : t('formationDetail.reserve')}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-gold/40 group-hover:bg-accent-gold transition-colors" />
                    </div>
                  </button>
                );
              }
              if (isBrigade) {
                return (
                  <div className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-secondary uppercase font-bold tracking-tighter">
                        {t('formationDetail.sector')}
                      </span>
                      <span className="text-text-secondary italic">
                        {t('formationDetail.noActiveSector')}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-secondary/80">
                      {t('formationDetail.noActiveSectorHelp')}
                    </div>
                  </div>
                );
              }
              if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
                const corpsSectors = sectors.filter(s => s.corps_id === formation.id);
                if (corpsSectors.length > 0) {
                  return (
                    <div className="px-2 py-1 bg-white/5 border border-white/10 rounded flex items-center justify-between text-[10px]">
                      <span className="text-text-secondary uppercase">{t('formationDetail.operationalSectors')}</span>
                      <span className="text-text-primary font-bold">{t('formationDetail.activeCount', { count: corpsSectors.length })}</span>
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Posture & readiness */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1 bg-black/20 rounded border border-panel-border/30">
              <span className="text-text-secondary">{t('formationDetail.posture')}</span>
              <span className="text-text-primary font-semibold">{postureValue}</span>
              <span className="text-text-secondary ml-1">{t('formationDetail.readiness')}</span>
              <span className="text-text-primary">{getPlayerSafeFormationReadinessLabel(formation.readiness)}</span>
            </div>

            {/* Stranded (Isolated) indicator */}
            {formation.strandedStatus === 'holding' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 border border-red-500/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">{t('formationDetail.isolated')}</span>
                {formation.strandedSinceTurn != null && (
                  <span className="text-[9px] text-red-400/60">
                    {t('formationDetail.sinceDate', { date: turnToDateString(formation.strandedSinceTurn) })}
                  </span>
                )}
              </div>
            )}
            {formation.strandedStatus === 'reconnected' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-900/30 border border-green-500/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">{t('formationDetail.reconnected')}</span>
              </div>
            )}

            {/* Officer info */}
            {(() => {
              const commander = getFormationCommander(formation, loadedGameState);
              if (commander) {
                const isArmy = formation.kind === 'army_hq' || formation.kind === 'army';
                const label = isArmy ? t('formationDetail.armyCommander') : t('formationDetail.corpsCommander');
                return (
                  <div className="pt-2 border-t border-panel-border">
                    <OfficerProfile officer={commander} label={label} compact emphasis={isArmy ? 'defense' : 'aggression'} />
                  </div>
                );
              }
              if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
                const commanderDisplay = resolveCorpsCommanderDisplay(formation.id, formation.faction, loadedGameState);
                if (commanderDisplay) {
                  return (
                    <div className="pt-2 border-t border-panel-border">
                      <CommanderDisplayPanel display={commanderDisplay} label={t('formationDetail.corpsCommander')} compact />
                    </div>
                  );
                }
              }
              if (isBrigade && formation.officer_quality != null) {
                return (
                  <div className="pt-2 border-t border-panel-border flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{t('formationDetail.officerCadreQuality')}</span>
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
                  <span className="text-xs text-text-secondary">{t('formationDetail.unitDistinction')}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border ${tierColor}`}>
                    ★ {displayName}
                  </span>
                </div>
              );
            })()}

            {formation.honor && (
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-text-secondary">{t('formationDetail.historicalHonor')}</span>
                <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[10px] font-semibold uppercase tracking-wider rounded border border-accent-gold/30">
                  {formation.honor}
                </span>
              </div>
            )}

            {/* TO&E */}
            {formation.composition && (
              <div className="pt-2 border-t border-panel-border space-y-2">
                <div className="text-xs text-text-secondary">{t('formationDetail.toeEquipment')}</div>
                <div className="space-y-1.5 text-xs">
                  {formation.composition.tanks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">{t('formationDetail.tanks')}</span>
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
                      <span className="text-text-secondary w-16">{t('formationDetail.artillery')}</span>
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
                      <span className="text-text-secondary w-16">{t('formationDetail.aaSysShort')}</span>
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
                      <span className="text-text-secondary">{t('formationDetail.overallSupplyEffectiveness')}</span>
                      <span className="text-text-primary font-mono">{Math.round(formation.equipment_decay * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-2 py-1 bg-black/10 rounded">
              <span className="text-text-secondary flex items-center gap-1"><Icon name="cohesion" size={12} /> {t('formationDetail.cohesion')}</span>
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
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="morale" size={12} /> {t('formationDetail.morale')}</span>
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
              <span className="text-text-secondary flex items-center gap-1"><Icon name="fatigue" size={12} /> {t('formationDetail.fatigue')}</span>
              <span className="text-text-primary tabular-nums">{Math.round(formation.fatigue)}</span>
              {formation.personnel != null && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="personnel" size={12} /> {t('formationDetail.personnel')}</span>
                  <span className="text-text-primary tabular-nums">{t('formationDetail.personnelMen', { count: formation.personnel.toLocaleString() })}</span>
                </>
              )}
              {formation.kind === 'brigade' && formation.personnel != null && (() => {
                const eff = computeBrigadeEffectiveness(formation);
                const color = eff.value >= 600 ? '#56d364' : eff.value >= 300 ? '#e8a838' : '#f47068';
                // Find the worst modifier to highlight
                const mods = eff.modifiers;
                const worst = Object.entries(mods).reduce((a, b) => b[1] < a[1] ? b : a);
                const worstLabel = worst[1] < 0.85
                  ? ` (${formatEffectivenessModifierLabel(worst[0])} ${Math.round(worst[1] * 100)}%)`
                  : '';
                return (
                  <>
                    <span className="text-text-secondary flex items-center gap-1"><Icon name="star" size={12} /> {t('formationDetail.effectiveness')}</span>
                    <span className="tabular-nums font-semibold" style={{ color }}>
                      {Math.round(eff.value).toLocaleString()}
                      <span className="text-[9px] font-normal text-text-secondary">{worstLabel}</span>
                    </span>
                  </>
                );
              })()}
              {formation.entrenchment_turns != null && formation.entrenchment_turns > 0 && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="entrenchment" size={12} /> {t('formationDetail.entrenched')}</span>
                  <span className="text-text-primary tabular-nums">{t('formationDetail.turnCount', { count: Math.round(formation.entrenchment_turns!).toString() })}</span>
                </>
              )}
              {formation.dig_in_progress != null && formation.dig_in_progress > 0 && (
                <>
                  <span className="text-text-secondary">{t('formationDetail.digInProgress')}</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.dig_in_progress * 100)}%</span>
                </>
              )}
              {formation.disrupted_turns != null && formation.disrupted_turns > 0 && (
                <>
                  <span className="font-bold uppercase flex items-center gap-1" style={{ color: '#d45555' }}><Icon name="disrupted" size={12} /> {t('formationDetail.disrupted')}</span>
                  <span className="tabular-nums font-semibold" style={{ color: '#d45555' }}>
                    {t('formationDetail.turnsRemaining', { count: formation.disrupted_turns.toString() })}
                  </span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsExhaustion != null && (
                <>
                  <span className="text-text-secondary flex items-center gap-1"><Icon name="fatigue" size={12} /> {t('formationDetail.exhaustion')}</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.corpsExhaustion)}%</span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsCommandSpan != null && (
                <>
                  <span className="text-text-secondary">{t('formationDetail.commandSpan')}</span>
                  <span className="text-text-primary tabular-nums">{formation.corpsCommandSpan.toFixed(1)}x</span>
                </>
              )}
            </div>

            {formation.movementStatus && formation.movementStatus !== 'deployed' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1.5 bg-black/20 rounded border border-panel-border/40">
                <span className="text-text-secondary uppercase font-bold text-[10px]">{t('formationDetail.movement')}</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${
                  formation.movementStatus === 'in_transit'
                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                    : 'bg-[#d4a055]/20 text-[#d4a055] border-[#d4a055]/40'
                }`}>
                  {formatMovementStatusLabel(formation.movementStatus)}
                </span>
                {formation.movementStance && (
                  <span className="text-text-secondary lowercase italic">({getPlayerSafeSectorStanceLabel(formation.movementStance)} march)</span>
                )}
              </div>
            )}

            {formation.location_osid && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">{t('formationDetail.location')} </span>
                <button
                  type="button"
                  data-testid="formation-location-link"
                  data-osid={formation.location_osid}
                  onClick={() => inspectOnField(useGameStore.getState(), { kind: 'field-formation-at-settlement', formationId: formation.id, osid: formation.location_osid! })}
                  className="text-left text-text-primary break-all underline decoration-dotted underline-offset-2 hover:text-interactive"
                >
                  {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                </button>
              </div>
            )}

            {isBrigade && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">{t('formationDetail.homeMunicipality')} </span>
                <span className="text-text-primary break-all">
                      {formation.municipalityId ? getPlayerSafeMunicipalityName(formation.municipalityId, '—') : '—'}
                </span>
              </div>
            )}

            {/* Narrative arc badge (brief — full history on Record tab) */}
            {formation.narrativeArc && (
              <div className="pt-2 border-t border-panel-border flex items-center justify-between">
                <span className="text-xs text-text-secondary">{t('formationDetail.narrativeArc')}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  formation.narrativeArc === 'veteran' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
                  : formation.narrativeArc === 'bloodied' ? 'text-[#d45555] border-[#d45555]/30 bg-[#d45555]/10'
                  : formation.narrativeArc === 'risen' ? 'text-[#55d48a] border-[#55d48a]/30 bg-[#55d48a]/10'
                  : formation.narrativeArc === 'shattered' ? 'text-slate-400 border-slate-400/30 bg-slate-700/20'
                  : formation.narrativeArc === 'garrison' ? 'text-accent-blue border-accent-blue/30 bg-accent-blue/10'
                  : 'text-text-primary border-panel-border bg-black/20'
                }`}>
                  {formatNarrativeArcLabel(formation.narrativeArc)}
                </span>
              </div>
            )}
          </>
        )}

        {/* ────────── RECORD TAB ────────── */}
        {activeTab === 'record' && (
          <>
            {/* Campaign Losses — top of Record tab. campaignKia/Wia/Mia are
                supplied by GameStateAdapter: either from the casualty ledger or,
                when that is empty, from a canonical-fraction fallback split of
                the combat-summary total (killed 0.22 / wounded 0.74 / missing remainder, not
                the legacy 0.30/0.55/0.15). The split lives in the adapter so this
                component never runtime-imports from src/sim/combat/ (#73). */}
            {isBrigade && (
              <div className="p-2 bg-black/20 rounded border border-panel-border/40 space-y-1.5">
                <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{t('formationDetail.campaignLosses')}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">{t('formationDetail.kia')}</div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#d45555' }}>
                      {(formation.campaignKia ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">{t('formationDetail.wia')}</div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#d4d455' }}>
                      {(formation.campaignWia ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-secondary uppercase">{t('formationDetail.miaPow')}</div>
                    <div className="text-sm font-mono font-bold text-text-secondary">
                      {(formation.campaignMia ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formation.last_repulsed_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>{t('formationDetail.lastRepulsedFrom')} </span>
                <span className="font-mono text-text-primary break-all">{getOsidDisplayName(formation.last_repulsed_from.osid, osidDisplayNames)}</span>
                <span> {t('formationDetail.dateParen', { date: turnToDateString(formation.last_repulsed_from.turn) })}</span>
              </div>
            )}
            {formation.last_retreat_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>{t('formationDetail.retreatedFrom')} </span>
                <span className="font-mono text-text-primary break-all">{getOsidDisplayName(formation.last_retreat_from.osid, osidDisplayNames)}</span>
                <span> {t('formationDetail.dateParen', { date: turnToDateString(formation.last_retreat_from.turn) })}</span>
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
                          <span className="text-text-secondary">{t('formationDetail.highestWinStreak')}</span>
                          <span className="text-accent-gold tabular-nums font-semibold">{formation.brigade_history.longest_victory_streak}</span>
                        </>
                      )}
                      {formation.brigade_history.turns_under_siege > 0 && (
                        <>
                          <span className="text-text-secondary">{t('formationDetail.turnsUnderSiege')}</span>
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
                      <span className="text-[10px] text-[#55d48a] uppercase font-semibold">{t('formationDetail.equipmentDestroyed')}</span>
                      <div className="flex gap-2 text-xs font-mono">
                        {formation.brigade_history.total_equipment_destroyed.tanks > 0 && (
                          <span title={t('formationDetail.tanksApcsKnockedOut')}>🛻 {formation.brigade_history.total_equipment_destroyed.tanks}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.artillery > 0 && (
                          <span title={t('formationDetail.artilleryDestroyed')}>💥 {formation.brigade_history.total_equipment_destroyed.artillery}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.aa_systems > 0 && (
                          <span title={t('formationDetail.aaSystemsDestroyed')}>🎯 {formation.brigade_history.total_equipment_destroyed.aa_systems}</span>
                        )}
                      </div>
                    </div>
                  )}

                {formation.recent_engagements && formation.recent_engagements.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-text-secondary mb-1">{t('formationDetail.recentEngagements')}</div>
                    <div className="space-y-1">
                      {[...formation.recent_engagements]
                        .sort((a, b) => a.turn - b.turn)
                        .map((engagement, idx) => (
                        <div key={`${engagement.turn}-${engagement.osid}-${engagement.role}-${idx}`} className="text-[11px] leading-4 border-l-2 pl-1.5 border-panel-border/30">
                          <span className="text-text-secondary">{turnToDateString(engagement.turn)} </span>
                          <span className="text-text-primary">{formatEngagementOutcomeLabel(engagement.outcome)}</span>
                          <span className="text-text-secondary"> {t('formationDetail.asRoleAt', { role: formatEngagementRole(engagement.role) })} </span>
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
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{t('formationDetail.unitHistory')}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                    formation.narrativeArc === 'veteran' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
                    : formation.narrativeArc === 'bloodied' ? 'text-[#d45555] border-[#d45555]/30 bg-[#d45555]/10'
                    : formation.narrativeArc === 'risen' ? 'text-[#55d48a] border-[#55d48a]/30 bg-[#55d48a]/10'
                    : formation.narrativeArc === 'shattered' ? 'text-slate-400 border-slate-400/30 bg-slate-700/20'
                    : formation.narrativeArc === 'garrison' ? 'text-accent-blue border-accent-blue/30 bg-accent-blue/10'
                    : 'text-text-primary border-panel-border bg-black/20'
                  }`}>
                    {formatNarrativeArcLabel(formation.narrativeArc)}
                  </span>
                </div>
                {formation.warNarrative && (
                  <div className="text-[11px] text-text-primary leading-4 italic whitespace-pre-wrap break-words">{formation.warNarrative}</div>
                )}
                {formation.notableMoments && formation.notableMoments.length > 0 && (
                  <div className="space-y-0.5 pt-1 min-w-0">
                    {[...formation.notableMoments]
                      .sort((a, b) => {
                        const aTurn = Number.isFinite(a.turn) && a.turn > 0 ? a.turn : Number.POSITIVE_INFINITY;
                        const bTurn = Number.isFinite(b.turn) && b.turn > 0 ? b.turn : Number.POSITIVE_INFINITY;
                        return aTurn - bTurn;
                      })
                      .map((m, i) => (
                      <div key={i} className="text-[11px] text-text-secondary break-words">
                        <span className="text-text-primary">{formatHistoryMomentDate(m.turn)}:</span>{' '}
                        {sanitizeHistoryMoment(m.description, osidDisplayNames)}
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
                <span className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70">{t('formationDetail.armyReserveStatus')}</span>
                {formation.eliteLoanState.permanently_degraded ? (
                  <div className="px-2 py-1.5 bg-[#d45555]/10 border border-[#d45555]/30 rounded text-[11px] text-[#d45555] font-semibold">
                    {t('formationDetail.eliteDegraded')}
                  </div>
                ) : formation.eliteLoanState.on_loan ? (
                  <div className="space-y-1.5">
                    <div className="px-2 py-1.5 bg-[#d4a855]/10 border border-[#d4a855]/40 rounded text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#d4a855] font-bold uppercase text-[10px]">{t('formationDetail.onLoan')}</span>
                        <span className="text-text-secondary text-[10px]">
                          {t('formationDetail.weeksDeployed', { weeks: formation.eliteLoanState.turns_deployed.toString() })}
                        </span>
                      </div>
                      <div className="text-text-secondary">
                        → {getPlayerFacingCorpsName(
                          formation.eliteLoanState.loaned_to_corps,
                          loadedGameState.formations,
                          t('formationDetail.assignedCommand'),
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void ipc.recallEliteBrigade(formation.id).then(r => { if (!r.ok) setLoadError(r.error ?? t('formationDetail.recallFailed')); })}
                      className="w-full px-2 py-1.5 bg-[#d45555]/20 border border-[#d45555]/40 rounded text-[11px] text-[#d45555] font-bold hover:bg-[#d45555]/30 transition-colors"
                    >
                      {t('formationDetail.recallToReserve')}
                    </button>
                  </div>
                ) : formation.eliteLoanState.in_cooldown ? (
                  <div className="px-2 py-1.5 bg-black/20 border border-panel-border/40 rounded text-[11px] text-text-secondary">
                    {t('formationDetail.cooldownReturning')}
                  </div>
                ) : (
                  <div className="px-2 py-1.5 bg-[#55d48a]/10 border border-[#55d48a]/30 rounded text-[11px] text-[#55d48a] font-semibold">
                    {t('formationDetail.readyForDeployment')}
                  </div>
                )}
              </div>
            )}

            {/* Home-distance effectiveness widget (brigades only) */}
            {isBrigade && effPct != null && (
              <div className="space-y-2">
                {/* Layer 1: badge */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-black/20 rounded border border-panel-border/40">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{t('formationDetail.fieldEffectiveness')}</span>
                  {isHome ? (
                    <span className="px-1.5 py-0.5 bg-[#55d48a]/20 text-[#55d48a] text-[10px] font-bold rounded border border-[#55d48a]/30 uppercase">
                      {t('formationDetail.homeTurf')}
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase ${
                        effPct >= 90 ? 'bg-[#55d48a]/10 text-[#55d48a] border-[#55d48a]/30'
                        : effPct >= 80 ? 'bg-[#d4d455]/10 text-[#d4d455] border-[#d4d455]/30'
                        : 'bg-[#d45555]/10 text-[#d45555] border-[#d45555]/30'
                      }`}
                    >
                      {t('formationDetail.effPercent', { percent: effPct.toString(), elite: isElite ? t('formationDetail.eliteParen') : '' })}
                    </span>
                  )}
                </div>

                {/* Layer 2: dual power stats */}
                {!isHome && hops != null && (
                  <div className="px-2 py-1.5 bg-black/10 rounded border border-panel-border/20 text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">{t('formationDetail.powerAtHome')}</span>
                      <span className="text-[#55d48a] font-mono font-semibold">
                        {formation.personnel != null ? Math.round(formation.personnel).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">{t('formationDetail.powerHere', { percent: effPct.toString() })}</span>
                      <span className={`font-mono font-semibold ${effPct >= 90 ? 'text-[#d4d455]' : 'text-[#d45555]'}`}>
                        {formation.personnel != null ? Math.round(formation.personnel * (effPct / 100)).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary pt-0.5">
                      {t('formationDetail.hopsFromHome', { hops: hops.toString() })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Layer 3: Sector picker (brigades only, same corps) */}
            {isFieldedSelectedBrigade && sameSectorList.length > 0 && (
              <div className="pt-2 border-t border-panel-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70">{t('formationDetail.sectorAssignment')}</span>
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
                      {t('formationDetail.clearOverride')}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {sameSectorList.map(sector => {
                    const isCurrentOverride = sectorOverrideId === sector.sector_id;
                    const isCurrentAutomatic = !sectorOverrideId && automaticSector?.sector_id === sector.sector_id;
                    return (
                      <button
                        key={sector.sector_id}
                        type="button"
                        disabled={isCurrentOverride || isCurrentAutomatic}
                        onClick={() => {
                          if (isCurrentAutomatic) return;
                          void assignBrigadeToSectorOverrideAction(
                            { ipc, addStagedOrder, setLoadError },
                            formation.id,
                            sector.sector_id
                          );
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded border text-[11px] transition-colors ${
                          isCurrentOverride
                            ? 'bg-accent-gold/10 border-accent-gold/50 text-accent-gold cursor-default'
                          : isCurrentAutomatic
                            ? 'bg-white/5 border-white/20 text-text-primary cursor-default'
                            : 'bg-black/20 border-panel-border/30 text-text-secondary hover:bg-white/5 hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{safeSectorLabel(sector.sector_id, sameSectorList)}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isCurrentOverride && (
                              <span className="text-[9px] bg-accent-gold/20 text-accent-gold px-1 rounded border border-accent-gold/30 font-bold uppercase">{t('formationDetail.override')}</span>
                            )}
                            {isCurrentAutomatic && (
                              <span className="text-[9px] text-text-secondary italic">{t('formationDetail.current')}</span>
                            )}
                            <span className="text-[10px] text-text-secondary">
                              {t('formationDetail.sectorBrigadeCount', {
                                count: sectorAssignmentById.get(sector.sector_id)?.allCurrentIds.length ?? 0,
                              })}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-text-secondary px-1">
                  {t('formationDetail.overridePermanentHelp')}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
