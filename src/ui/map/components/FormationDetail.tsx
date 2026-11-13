import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { sortRecentEngagements } from '../utils/recentEngagements';
import { useIPC } from '../desktop/useIPC';
import { getMapRailStyle } from './panelRail';
import { turnToDateString, formatCount } from '../utils/formatters';
import { getArmyCrest } from '../utils/factionAssets';
import { getFormationCommander, resolveCorpsCommanderDisplay } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { CommanderDisplayPanel } from './CommanderDisplayPanel';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { EliteCommanderSummary } from './EliteCommanderSummary';
import { OwnForceReportGapNotice } from './OwnForceReportGapNotice';
import type { FormationView } from '../data/types';
import { getPrestigeTier, getPrestigeTierColor, getHighestTier, getDecorationName } from '../utils/decorationUtils';
import { TabBar, tabId, tabPanelId } from './TabBar';
import { computeBrigadeEffectiveness, effectivenessBandLabel } from '../utils/combatEffectiveness';
import { getPlayerFacingCorpsName, getPlayerFacingSectorName } from '../../shared/playerFacingLabels';
import {
  getPlayerSafeFormationPostureLabel,
  getPlayerSafeFormationReadinessLabel,
  getPlayerSafeFormationNarrativeArcLabel,
  getPlayerSafeSectorStanceLabel,
} from '../utils/playerSafeText';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { inspectOnField, openArmyHQBriefingForCorps } from '../utils/shellNavigation';
import { resolveCurrentSectorForFormation } from '../utils/sectorUtils';
import { sectorLabelNeedsTypePrefix } from '../utils/sectorTypePrefix';
import { buildMunicipalityDisplayNameMap, getMunicipalityDisplayName } from '../utils/municipalityDisplayName';
import { SURFACE_CHIP, SURFACE_TONE, SurfaceSection } from './surface/Surface';
import {
  MAP_RAIL_BUTTON,
  MAP_RAIL_MUTED,
  MapRailBody,
  MapRailCloseButton,
  MapRailFrame,
  MapRailHeader,
  MapRailLink,
  MapRailNote,
  MapRailStat,
  MapRailStats,
} from './surface/MapRail';

type DetailTab = 'overview' | 'record' | 'orders';

function formatHistoryMomentDate(turn: number): string {
  if (!Number.isFinite(turn)) return t('formationDetail.undated');
  if (turn <= 0) return t('formationDetail.setupRecord');
  return turnToDateString(turn);
}

function formatEngagementTurnLabel(turn: number): string {
  if (!Number.isFinite(turn)) return t('formationDetail.undated');
  if (turn <= 0) return t('formationDetail.setupRecord');
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

/** Narrative arc → surface chip tone. */
const NARRATIVE_ARC_TONE: Record<string, string> = {
  veteran: SURFACE_TONE.warn,
  bloodied: SURFACE_TONE.danger,
  risen: SURFACE_TONE.good,
  shattered: SURFACE_TONE.neutral,
  garrison: SURFACE_TONE.info,
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

/** Rail rows carry the label on the left; the trailing colon of the old inline copy goes. */
function railLabel(label: string): string {
  return label.replace(/\s*:\s*$/, '');
}

function sanitizeHistoryMoment(description: string, osidDisplayNames: Record<string, string> | null): string {
  return description
    .replace(/op:[a-z0-9_]+:[a-z0-9_]+/gi, (match) => getOsidDisplayName(match, osidDisplayNames))
    .replace(/\b(?:formation|corps|sector|cmd|csq|event|evt):[a-z0-9_:-]+\b/gi, t('formationDetail.staffRecord'))
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

function formatOptionalInteger(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatCount(value) : t('corpsFront.unreported');
}

function formatCampaignLossInteger(value: number | null | undefined, derived: boolean): string {
  const formatted = formatOptionalInteger(value);
  return derived && Number.isFinite(value)
    ? t('formationDetail.estimatedValue', { value: formatted })
    : formatted;
}

function isCommandFormation(formation: FormationView): boolean {
  return formation.kind === 'corps' || formation.kind === 'corps_asset';
}

function formatReportedPercentValue(value: number | null | undefined): string {
  return Number.isFinite(value) ? `${Math.round(value as number)}%` : t('corpsFront.unreported');
}

function formatReportedCommandSpan(value: number | null | undefined): string {
  return Number.isFinite(value) ? `${(value as number).toFixed(1)}x` : t('corpsFront.unreported');
}

function formatHomePower(value: number | null | undefined): string {
  return Number.isFinite(value) ? formatCount(value) : t('corpsFront.unreported');
}

function formatLoanCommandDestination(corpsId: string | null | undefined, formations: FormationView[]): string {
  return corpsId
    ? getPlayerFacingCorpsName(corpsId, formations, t('formationDetail.assignedCommand'))
    : t('formationDetail.assignedCommandUnreported');
}

type EquipmentConditionReport = {
  operational?: number | null;
  degraded?: number | null;
  non_operational?: number | null;
} | null | undefined;

function isReportedEquipmentCondition(condition: EquipmentConditionReport): condition is {
  operational: number;
  degraded: number;
  non_operational: number;
} {
  return Number.isFinite(condition?.operational)
    && Number.isFinite(condition?.degraded)
    && Number.isFinite(condition?.non_operational);
}

/** Equipment condition in words ("80% working, 15% worn, 5% out of action"). */
function equipmentConditionText(condition: EquipmentConditionReport): string {
  if (!isReportedEquipmentCondition(condition)) return t('mapRail.equipmentConditionUnreported');
  return t('mapRail.equipmentCondition', {
    working: Math.round(condition.operational * 100).toString(),
    worn: Math.round(condition.degraded * 100).toString(),
    out: Math.round(condition.non_operational * 100).toString(),
  });
}

/** One heavy-equipment line: name and count, the condition in words underneath. */
function EquipmentRow({ label, count, condition, testId }: { label: string; count: number; condition: ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#262b35] py-2 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-[#ddd1b3]">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums text-[#f1e6c8]">{count}</span>
      </div>
      <span data-testid={testId} className="text-[14px] text-[#9c917b]">{condition}</span>
    </div>
  );
}

/** A 0–100 figure with a thin bar (cohesion, morale). */
function MeterValue({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="inline-block h-1.5 w-20 overflow-hidden rounded-full bg-[#262b35]">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span>{Math.round(value)}</span>
    </span>
  );
}

/**
 * The unit rail: opens in the one map-rail slot when a formation is selected.
 */
interface FormationDetailProps {
  railSlot?: 'primary' | 'secondary';
  breadcrumb?: ReactNode;
}

export function FormationDetail({ breadcrumb }: FormationDetailProps) {
  const ipc = useIPC();
  const [locale] = useLocale();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const municipalityDisplayNames = useMemo(
    () => buildMunicipalityDisplayNameMap(osidPropertiesMap),
    [osidPropertiesMap],
  );

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedFormationId]);

  if (operationsPanelOpen || !selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;

  if (!loadedGameState || !formation) {
    return (
      <MapRailFrame className="panel-slide-in-right" style={getMapRailStyle()}>
        <div className="h-16 border-b border-[#262b35] bg-[#141821] panel-shimmer" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-1/2 rounded bg-[#161a22] panel-shimmer" />
          <div className="h-6 w-3/4 rounded bg-[#161a22] panel-shimmer" />
          <div className="h-24 w-full rounded bg-[#161a22] panel-shimmer" />
        </div>
      </MapRailFrame>
    );
  }

  const isBrigade = formation.kind === 'brigade';
  const postureValue = (() => {
    if (isBrigade) return getPlayerSafeFormationPostureLabel(formation.posture, t('formationDetail.postureAwaitingOrder'));
    if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
      return formation.corpsStance
        ? getPlayerSafeSectorStanceLabel(formation.corpsStance)
        : t('formationDetail.postureAwaitingOrder');
    }
    if (formation.kind === 'army_hq') return t('formationDetail.postureAwaitingOrder');
    return formation.posture ? getPlayerSafeFormationPostureLabel(formation.posture) : t('formationDetail.postureAwaitingOrder');
  })();
  const lifecycleValue = formation.readiness && formation.readiness !== 'unreported'
    ? getPlayerSafeFormationReadinessLabel(formation.readiness)
    : null;
  const brigadeEffectiveness = formation.kind === 'brigade' ? computeBrigadeEffectiveness(formation) : null;
  const reportGaps = [
    // A brigade without a posture is not a missing staff return: its commander has not
    // set one yet, and the posture row already says so. Listing it here told the player a
    // posture was "expected in a coming briefing", as if the president owed an order.
    ...(!isBrigade && !formation.corpsStance ? ['posture'] : []),
    ...(lifecycleValue == null ? ['readiness'] : []),
    ...(Number.isFinite(formation.cohesion) ? [] : ['cohesion']),
    ...(Number.isFinite(formation.morale) ? [] : ['morale']),
    ...(typeof formation.fatigue === 'number' && Number.isFinite(formation.fatigue) ? [] : ['fatigue']),
    ...(formation.personnel != null ? [] : ['personnel']),
    ...(brigadeEffectiveness?.missingFields.length ? ['effectiveness'] : []),
    ...(formation.composition?.tanks && !isReportedEquipmentCondition(formation.composition.tank_condition) ? ['tank condition'] : []),
    ...(formation.composition?.artillery && !isReportedEquipmentCondition(formation.composition.artillery_condition) ? ['artillery condition'] : []),
    ...(formation.composition?.aa_systems ? ['air defense condition'] : []),
  ];
  const formationName = getLocalizedFormationName(formation, locale);
  const casualtySplitIsDerived = formation.campaignCasualtySplitProvenance === 'derived_from_total';
  const casualtySplitIsExact = formation.campaignCasualtySplitProvenance === 'exact_ledger';
  const casualtySplitProvenanceLabel = casualtySplitIsDerived
    ? t('formationDetail.campaignLossesDerived')
    : casualtySplitIsExact
      ? t('formationDetail.campaignLossesExact')
      : null;

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
    ? 'ring-1 ring-yellow-400/55'
    : prestigeTier === 2
    ? 'ring-1 ring-slate-300/45'
    : prestigeTier === 3
    ? 'ring-1 ring-amber-700/35'
    : '';

  // Sector helpers
  const sectors = loadedGameState.corpsFrontSectors ?? [];
  const sectorOverrideId = formation.sectorOverrideId;
  const currentSector = isBrigade && formation.corps_id
    ? resolveCurrentSectorForFormation(formation, sectors)
    : null;
  const currentSectorIsOverride = Boolean(sectorOverrideId && currentSector?.sector_id === sectorOverrideId);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: t('formationDetail.overview') },
    { id: 'record', label: t('formationDetail.record') },
    { id: 'orders', label: isBrigade ? t('formationDetail.command') : t('formationDetail.orders') },
  ];

  const crest = getArmyCrest(formation.faction);
  const parent = isBrigade && formation.corps_id
    ? loadedGameState.formations.find((f) => f.id === formation.corps_id) ?? null
    : null;
  const commander = getFormationCommander(formation, loadedGameState);
  const corpsCommanderDisplay = !commander && isCommandFormation(formation)
    ? resolveCorpsCommanderDisplay(formation.id, formation.faction, loadedGameState)
    : null;
  const highestTier = getHighestTier(formation.decorations);
  const hasEquipment = Boolean(formation.composition && (
    formation.composition.tanks > 0 || formation.composition.artillery > 0 || formation.composition.aa_systems > 0
  ));

  return (
    <MapRailFrame
      data-testid="formation-detail-panel"
      data-formation-id={formation.id}
      className={`panel-slide-in-right ${prestigeRingClass}`}
      style={getMapRailStyle()}
    >
      <MapRailHeader
        breadcrumb={breadcrumb}
        mark={crest ? <img src={crest} alt="" className="h-4 w-4 object-contain" /> : undefined}
        eyebrow={t('mapRail.eyebrow.unit')}
        title={formationName}
        chips={isBrigade && decorations.length > 0 ? (
          <span className="inline-flex items-center gap-px" title={t('formationDetail.decorationsEarned', { count: decorations.length })}>
            {decorations.slice(0, 5).map((dec, i) => (
              <span key={`${dec.tier}-${dec.type}-${i}`} className={`select-none text-[14px] leading-none ${getPrestigeTierColor(dec.tier === 'tier_3' ? 1 : dec.tier === 'tier_2' ? 2 : 3)}`}>★</span>
            ))}
            {decorations.length > 5 && (
              <span className="ml-0.5 text-[13px] text-[#b9ad94]">+{decorations.length - 5}</span>
            )}
          </span>
        ) : undefined}
        close={(
          <MapRailCloseButton
            onClick={() => setSelectedFormationId(null)}
            data-testid="formation-detail-close"
            aria-label={t('formationDetail.closePanel')}
            title={t('formationDetail.closePanel')}
          />
        )}
      />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} idPrefix="formation-detail" />

      <MapRailBody
        id={tabPanelId('formation-detail', activeTab)}
        role="tabpanel"
        aria-labelledby={tabId('formation-detail', activeTab)}
      >
        {/* ────────── OVERVIEW TAB ────────── */}
        {activeTab === 'overview' && (
          <>
            <SurfaceSection label={t('mapRail.section.command')}>
              {/* Parent assignment (brigades) — corps or army HQ */}
              {parent && (
                <MapRailLink
                  label={railLabel(parent.kind === 'army_hq' ? t('formationDetail.subordinatedTo') : t('formationDetail.corps'))}
                  value={parent.kind === 'army_hq' ? getLocalizedFormationName(parent, locale) : safeCorpsLabel(parent.id, loadedGameState.formations)}
                  onClick={() => {
                    inspectOnField(useGameStore.getState(), parent.kind === 'army_hq'
                      ? { kind: 'field-formation-in-army-reserve', formationId: formation.id, armyHqId: parent.id, osid: formation.location_osid }
                      : { kind: 'field-formation-in-corps', formationId: formation.id, corpsId: parent.id, osid: formation.location_osid });
                  }}
                />
              )}

              {/* Sector assignment (brigades) */}
              {(() => {
                if (isBrigade && formation.corps_id && currentSector) {
                  const sectorLabel = safeSectorLabel(currentSector.sector_id, sectors);
                  const role = currentSectorIsOverride
                    ? t('formationDetail.override')
                    : currentSector.assigned_brigade_ids.includes(formation.id)
                      ? t('formationDetail.frontline')
                      : (currentSector.rear_brigade_ids ?? []).includes(formation.id)
                        ? t('formationDetail.rearSupport')
                        : t('formationDetail.reserve');
                  return (
                    <MapRailLink
                      label={railLabel(t('formationDetail.sector'))}
                      value={sectorLabel}
                      detail={role}
                      hint={sectorLabel}
                      aria-label={sectorLabelNeedsTypePrefix(sectorLabel, (currentSector as { unheld_front?: boolean }).unheld_front === true)
                        ? t('formationDetail.inspectSector', { sector: sectorLabel })
                        : t('formationDetail.inspectSectorNamed', { sector: sectorLabel })}
                      onClick={() => inspectOnField(useGameStore.getState(), {
                        kind: 'field-formation-in-sector',
                        formationId: selectedFormationId,
                        sectorId: currentSector.sector_id,
                        corpsId: currentSector.corps_id ?? formation.corps_id ?? null,
                        osid: formation.location_osid,
                      })}
                    />
                  );
                }
                if (isBrigade) {
                  return (
                    <MapRailStats>
                      <MapRailStat label={railLabel(t('formationDetail.sector'))} value={<span className={MAP_RAIL_MUTED}>{t('formationDetail.noActiveSector')}</span>} />
                      <p className="m-0 pb-1.5 text-[14px] leading-snug text-[#9c917b]">{t('formationDetail.noActiveSectorHelp')}</p>
                    </MapRailStats>
                  );
                }
                if (isCommandFormation(formation)) {
                  const corpsSectors = sectors.filter(s => s.corps_id === formation.id);
                  if (corpsSectors.length > 0) {
                    return (
                      <MapRailStats>
                        <MapRailStat label={railLabel(t('formationDetail.operationalSectors'))} value={corpsSectors.length} />
                      </MapRailStats>
                    );
                  }
                }
                return null;
              })()}

              {/* Posture & readiness */}
              <MapRailStats>
                <MapRailStat
                  label={railLabel(isBrigade ? t('formationDetail.postureSetByCommander') : t('formationDetail.posture'))}
                  value={postureValue}
                />
                {lifecycleValue && (
                  <MapRailStat label={railLabel(t('formationDetail.readiness'))} value={lifecycleValue} />
                )}
                {formation.movementStatus && formation.movementStatus !== 'deployed' && (
                  <MapRailStat
                    label={railLabel(t('formationDetail.movement'))}
                    value={formatMovementStatusLabel(formation.movementStatus)}
                    tone={formation.movementStatus === 'in_transit' ? 'text-sky-200' : 'text-amber-200'}
                  />
                )}
                {formation.movementStatus && formation.movementStatus !== 'deployed' && formation.movementStance && (
                  <p className="m-0 pb-1.5 text-[14px] leading-snug text-[#9c917b]">
                    {t('formationDetail.movementStance', { stance: getPlayerSafeSectorStanceLabel(formation.movementStance) })}
                  </p>
                )}
              </MapRailStats>
              <OwnForceReportGapNotice fields={reportGaps} />

              {/* Stranded (Isolated) indicator */}
              {formation.strandedStatus === 'holding' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger}`}>{t('formationDetail.isolated')}</span>
                  {formation.strandedSinceTurn != null && (
                    <span className="text-[14px] text-red-200/80">
                      {t('formationDetail.sinceDate', { date: turnToDateString(formation.strandedSinceTurn) })}
                    </span>
                  )}
                </div>
              )}
              {formation.strandedStatus === 'reconnected' && (
                <span className={`${SURFACE_CHIP} ${SURFACE_TONE.good} self-start`}>{t('formationDetail.reconnected')}</span>
              )}
            </SurfaceSection>

            {/* Officer info */}
            {commander ? (
              <OfficerProfile
                officer={commander}
                label={formation.kind === 'army_hq' || formation.kind === 'army' ? t('formationDetail.armyCommander') : t('formationDetail.corpsCommander')}
                compact
                emphasis={formation.kind === 'army_hq' || formation.kind === 'army' ? 'defense' : 'aggression'}
              />
            ) : corpsCommanderDisplay ? (
              <CommanderDisplayPanel display={corpsCommanderDisplay} label={t('formationDetail.corpsCommander')} compact />
            ) : isBrigade && (formation.officer_quality != null || formation.eliteCommander) ? (
              <div className="flex flex-col gap-2">
                <EliteCommanderSummary commander={formation.eliteCommander} />
                {formation.officer_quality != null && (
                  <MapRailStats>
                    <MapRailStat label={t('formationDetail.officerCadreQuality')} value={`${Math.round(formation.officer_quality * 100)}%`} />
                  </MapRailStats>
                )}
              </div>
            ) : null}

            {/* Condition */}
            <SurfaceSection label={t('mapRail.section.condition')}>
              <MapRailStats>
                {Number.isFinite(formation.cohesion) && (() => {
                  const c = formation.cohesion as number;
                  return (
                    <MapRailStat
                      label={t('formationDetail.cohesion')}
                      value={<MeterValue value={c} color={c >= 70 ? '#d4a055' : c >= 40 ? '#d48a55' : '#d45555'} />}
                    />
                  );
                })()}
                {Number.isFinite(formation.morale) && (() => {
                  const m = formation.morale as number;
                  return (
                    <MapRailStat
                      label={t('formationDetail.morale')}
                      value={<MeterValue value={m} color={m >= 60 ? '#55d48a' : m >= 30 ? '#d4d455' : '#d45555'} />}
                    />
                  );
                })()}
                {typeof formation.fatigue === 'number' && Number.isFinite(formation.fatigue) && (
                  <MapRailStat label={t('formationDetail.fatigue')} value={Math.round(formation.fatigue)} />
                )}
                <MapRailStat
                  label={t('formationDetail.personnel')}
                  value={Number.isFinite(formation.personnel)
                    ? t('formationDetail.personnelMen', { count: formatCount(formation.personnel) })
                    : <span className={MAP_RAIL_MUTED}>{t('corpsFront.unreported')}</span>}
                />
                {formation.kind === 'brigade' && (() => {
                  const eff = brigadeEffectiveness;
                  if (!eff || eff.missingFields.length > 0) return null;
                  const band = effectivenessBandLabel(eff);
                  const color = band.grade === 'A' ? '#56d364' : band.grade === 'B' ? '#e8c56d' : band.grade === 'C' ? '#e8a838' : '#f47068';
                  // Find the worst modifier to highlight
                  const mods = eff.modifiers;
                  const worst = Object.entries(mods).reduce((a, b) => b[1] < a[1] ? b : a);
                  const worstLabel = worst[1] < 0.85
                    ? `${formatEffectivenessModifierLabel(worst[0])} ${Math.round(worst[1] * 100)}%`
                    : '';
                  const title = worstLabel
                    ? `${t('effectiveness.exactTooltip', { value: formatCount(eff.value) })} - ${worstLabel}`
                    : t('effectiveness.exactTooltip', { value: formatCount(eff.value) });
                  return (
                    <MapRailStat
                      label={t('formationDetail.effectiveness')}
                      value={(
                        <span
                          data-testid="formation-detail-effectiveness"
                          style={{ color }}
                          title={title}
                          tabIndex={0}
                          aria-label={title}
                          className="group font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-gold"
                        >
                          {band.grade} <span className="text-[#f1e6c8]">{t(band.labelKey)}</span>
                          <span className="sr-only group-focus:not-sr-only group-focus:block text-[13px] font-normal text-[#b9ad94]">{title}</span>
                        </span>
                      )}
                    />
                  );
                })()}
                {formation.entrenchment_turns != null && formation.entrenchment_turns > 0 && (
                  <MapRailStat
                    label={t('formationDetail.entrenched')}
                    value={t(formation.entrenchment_turns === 1 ? 'formationDetail.turnCount.one' : 'formationDetail.turnCount', { count: Math.round(formation.entrenchment_turns!).toString() })}
                  />
                )}
                {formation.dig_in_progress != null && formation.dig_in_progress > 0 && (
                  <MapRailStat label={t('formationDetail.digInProgress')} value={`${Math.round(formation.dig_in_progress * 100)}%`} />
                )}
                {formation.disrupted_turns != null && formation.disrupted_turns > 0 && (
                  <MapRailStat
                    label={<span className="text-red-200">{t('formationDetail.disrupted')}</span>}
                    value={t(formation.disrupted_turns === 1 ? 'formationDetail.turnsRemaining.one' : 'formationDetail.turnsRemaining', { count: formation.disrupted_turns.toString() })}
                    tone="text-red-200"
                  />
                )}
                {isCommandFormation(formation) && formation.corpsExhaustion != null && (
                  <MapRailStat label={t('formationDetail.exhaustion')} value={formatReportedPercentValue(formation.corpsExhaustion)} />
                )}
                {isCommandFormation(formation) && formation.corpsCommandSpan != null && (
                  <MapRailStat label={t('formationDetail.commandSpan')} value={formatReportedCommandSpan(formation.corpsCommandSpan)} />
                )}
              </MapRailStats>
            </SurfaceSection>

            {/* Heavy equipment: counts with the condition in words (no one-row bar chart). */}
            {formation.composition && (hasEquipment || formation.equipment_decay != null) && (
              <SurfaceSection label={t('mapRail.section.equipment')}>
                <MapRailStats>
                  {formation.composition.tanks > 0 && (
                    <EquipmentRow label={t('formationDetail.tanks')} count={formation.composition.tanks} condition={equipmentConditionText(formation.composition.tank_condition)} />
                  )}
                  {formation.composition.artillery > 0 && (
                    <EquipmentRow label={t('formationDetail.artillery')} count={formation.composition.artillery} condition={equipmentConditionText(formation.composition.artillery_condition)} />
                  )}
                  {formation.composition.aa_systems > 0 && (
                    <EquipmentRow
                      label={t('formationDetail.aaSys')}
                      count={formation.composition.aa_systems}
                      condition={t('mapRail.equipmentConditionUnreported')}
                      testId="formation-aa-condition-unreported"
                    />
                  )}
                  {formation.equipment_decay != null && (
                    <MapRailStat label={t('formationDetail.overallSupplyEffectiveness')} value={`${Math.round(formation.equipment_decay * 100)}%`} />
                  )}
                </MapRailStats>
              </SurfaceSection>
            )}

            {/* Position */}
            {(formation.location_osid || isBrigade) && (
              <SurfaceSection label={t('mapRail.section.where')}>
                <MapRailStats>
                  {formation.location_osid && (
                    <MapRailStat
                      label={railLabel(t('formationDetail.location'))}
                      value={(
                        <button
                          type="button"
                          data-testid="formation-location-link"
                          data-osid={formation.location_osid}
                          onClick={() => inspectOnField(useGameStore.getState(), { kind: 'field-formation-at-settlement', formationId: formation.id, osid: formation.location_osid! })}
                          className="kbd-focus break-words text-right text-[#f1e6c8] underline decoration-dotted underline-offset-2 hover:text-accent-gold"
                        >
                          {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                        </button>
                      )}
                    />
                  )}
                  {isBrigade && (
                    <MapRailStat
                      label={railLabel(t('formationDetail.homeMunicipality'))}
                      value={formation.municipalityId
                        ? getMunicipalityDisplayName(formation.municipalityId, municipalityDisplayNames)
                        : <span className={MAP_RAIL_MUTED}>{t('mapRail.notReportedYet')}</span>}
                    />
                  )}
                </MapRailStats>
              </SurfaceSection>
            )}

            {/* Standing: distinction, honour, narrative arc (full history on the Record tab) */}
            {(highestTier || formation.honor || formation.narrativeArc) && (
              <SurfaceSection label={t('mapRail.section.standing')}>
                <MapRailStats>
                  {highestTier && (
                    <MapRailStat
                      label={t('formationDetail.unitDistinction')}
                      value={<span className={`${SURFACE_CHIP} ${highestTier === 'tier_3' ? SURFACE_TONE.warn : SURFACE_TONE.neutral}`}>★ {getDecorationName(formation.faction ?? '', highestTier)}</span>}
                    />
                  )}
                  {formation.honor && (
                    <MapRailStat label={t('formationDetail.historicalHonor')} value={<span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>{formation.honor}</span>} />
                  )}
                  {formation.narrativeArc && (
                    <MapRailStat
                      label={t('formationDetail.narrativeArc')}
                      value={<span className={`${SURFACE_CHIP} ${NARRATIVE_ARC_TONE[formation.narrativeArc] ?? SURFACE_TONE.neutral}`}>{formatNarrativeArcLabel(formation.narrativeArc)}</span>}
                    />
                  )}
                </MapRailStats>
              </SurfaceSection>
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
              <SurfaceSection
                label={t('formationDetail.campaignLosses')}
                action={casualtySplitIsDerived ? <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>{t('formationDetail.estimatedSplit')}</span> : undefined}
              >
                {casualtySplitProvenanceLabel && (
                  <MapRailNote className={casualtySplitIsDerived ? 'text-amber-200/90' : undefined}>{casualtySplitProvenanceLabel}</MapRailNote>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['kia', t('formationDetail.kia'), formation.campaignKia, 'text-red-200'],
                    ['wia', t('formationDetail.wia'), formation.campaignWia, 'text-amber-100'],
                    ['mia', t('formationDetail.miaPow'), formation.campaignMia, 'text-[#ddd1b3]'],
                  ] as const).map(([key, label, value, tone]) => (
                    <div key={key} className="flex min-w-0 flex-col gap-1 rounded-md border border-[#2a303c] bg-[#161a22] px-3 py-2">
                      <div className="text-[13px] leading-snug text-[#b9ad94]">{label}</div>
                      <div className={`text-[16px] font-semibold tabular-nums ${casualtySplitIsDerived ? 'text-amber-200' : tone}`}>
                        {formatCampaignLossInteger(value, casualtySplitIsDerived)}
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceSection>
            )}

            {(formation.last_repulsed_from || formation.last_retreat_from) && (
              <div className="flex flex-col gap-1">
                {formation.last_repulsed_from && (
                  <MapRailNote>
                    <span>{t('formationDetail.lastRepulsedFrom')} </span>
                    <span className="font-semibold text-[#f1e6c8]">{getOsidDisplayName(formation.last_repulsed_from.osid, osidDisplayNames)}</span>
                    <span> {t('formationDetail.dateParen', { date: turnToDateString(formation.last_repulsed_from.turn) })}</span>
                  </MapRailNote>
                )}
                {formation.last_retreat_from && (
                  <MapRailNote>
                    <span>{t('formationDetail.retreatedFrom')} </span>
                    <span className="font-semibold text-[#f1e6c8]">{getOsidDisplayName(formation.last_retreat_from.osid, osidDisplayNames)}</span>
                    <span> {t('formationDetail.dateParen', { date: turnToDateString(formation.last_retreat_from.turn) })}</span>
                  </MapRailNote>
                )}
              </div>
            )}

            {isBrigade && (
              <div className="flex flex-col gap-4">
                {formation.combatSummary ? (
                  <CombatSummaryPanel summary={formation.combatSummary} compact noTopBorder />
                ) : (
                  <SurfaceSection label={t('combatRecord.emptyTitle')}>
                    <MapRailNote>{t('formationDetail.combatRecordUnavailable')}</MapRailNote>
                  </SurfaceSection>
                )}
                {formation.brigade_history && (formation.brigade_history.longest_victory_streak > 0 || formation.brigade_history.turns_under_siege > 0) && (
                  <MapRailStats>
                    {formation.brigade_history.longest_victory_streak > 0 && (
                      <MapRailStat label={t('formationDetail.highestWinStreak')} value={formation.brigade_history.longest_victory_streak} tone="text-[#e0c27a]" />
                    )}
                    {formation.brigade_history.turns_under_siege > 0 && (
                      <MapRailStat label={t('formationDetail.turnsUnderSiege')} value={formation.brigade_history.turns_under_siege} />
                    )}
                  </MapRailStats>
                )}

                {formation.brigade_history?.total_equipment_destroyed &&
                  (formation.brigade_history.total_equipment_destroyed.tanks > 0 ||
                    formation.brigade_history.total_equipment_destroyed.artillery > 0) && (
                    <SurfaceSection label={t('formationDetail.equipmentDestroyed')}>
                      <MapRailStats>
                        {formation.brigade_history.total_equipment_destroyed.tanks > 0 && (
                          <MapRailStat label={t('formationDetail.tanksApcsKnockedOut')} value={formation.brigade_history.total_equipment_destroyed.tanks} />
                        )}
                        {formation.brigade_history.total_equipment_destroyed.artillery > 0 && (
                          <MapRailStat label={t('formationDetail.artilleryDestroyed')} value={formation.brigade_history.total_equipment_destroyed.artillery} />
                        )}
                        {formation.brigade_history.total_equipment_destroyed.aa_systems > 0 && (
                          <MapRailStat label={t('formationDetail.aaSystemsDestroyed')} value={formation.brigade_history.total_equipment_destroyed.aa_systems} />
                        )}
                      </MapRailStats>
                    </SurfaceSection>
                  )}

                {formation.recent_engagements && formation.recent_engagements.length > 0 && (
                  <SurfaceSection label={t('formationDetail.recentEngagements')}>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {sortRecentEngagements(formation.recent_engagements)
                        .map((engagement, idx) => (
                        <li key={`${engagement.turn}-${engagement.osid}-${engagement.role}-${idx}`} className="border-l-2 border-[#3a4150] pl-2.5 text-[15px] leading-snug">
                          <span className="text-[#b9ad94]">{formatEngagementTurnLabel(engagement.turn)} </span>
                          <span className="text-[#f1e6c8]">{formatEngagementOutcomeLabel(engagement.outcome)}</span>
                          <span className="text-[#b9ad94]"> {t('formationDetail.asRoleAt', { role: formatEngagementRole(engagement.role) })} </span>
                          <span className="font-semibold text-[#f1e6c8]">{getOsidDisplayName(engagement.osid, osidDisplayNames)}</span>
                          {engagement.territory_flipped && <span className="ml-1 text-[#e0c27a]">⚑</span>}
                        </li>
                      ))}
                    </ul>
                  </SurfaceSection>
                )}
              </div>
            )}

            {!isBrigade && formation.combatSummary && (
              <CombatSummaryPanel summary={formation.combatSummary} compact noTopBorder />
            )}

            {/* Unit History — bottom of Record tab */}
            {formation.narrativeArc && (
              <SurfaceSection
                label={t('formationDetail.unitHistory')}
                action={<span className={`${SURFACE_CHIP} ${NARRATIVE_ARC_TONE[formation.narrativeArc] ?? SURFACE_TONE.neutral}`}>{formatNarrativeArcLabel(formation.narrativeArc)}</span>}
              >
                {formation.warNarrative && (
                  <MapRailNote className="whitespace-pre-wrap break-words text-[#ddd1b3]">
                    {sanitizeHistoryMoment(formation.warNarrative, osidDisplayNames)}
                  </MapRailNote>
                )}
                {formation.notableMoments && formation.notableMoments.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {[...formation.notableMoments]
                      .sort((a, b) => {
                        const aTurn = Number.isFinite(a.turn) && a.turn > 0 ? a.turn : Number.POSITIVE_INFINITY;
                        const bTurn = Number.isFinite(b.turn) && b.turn > 0 ? b.turn : Number.POSITIVE_INFINITY;
                        return aTurn - bTurn;
                      })
                      .map((m, i) => (
                      <li key={i} className="break-words text-[15px] leading-snug text-[#b9ad94]">
                        <span className="text-[#f1e6c8]">{formatHistoryMomentDate(m.turn)}:</span>{' '}
                        {m.turn <= 0
                          ? t('formationDetail.initialDeploymentRecord')
                          : sanitizeHistoryMoment(m.description, osidDisplayNames)}
                      </li>
                    ))}
                  </ul>
                )}
              </SurfaceSection>
            )}
          </>
        )}

        {/* ────────── COMMAND TAB ────────── */}
        {activeTab === 'orders' && (
          <>
            {/* Truthful command (owner review 2026-11-11): the president never orders a
                brigade. Say who does, and route to the directives that reach it. */}
            {isBrigade && (
              <>
                <SurfaceSection label={t('formationDetail.command.whoHeading')}>
                  <div className="text-[17px] font-semibold text-[#f1e6c8]">
                    {formatLoanCommandDestination(formation.corps_id, loadedGameState.formations)}
                  </div>
                  <MapRailNote data-testid="formation-detail-delegated-command-note">
                    {t('formationDetail.delegatedCommand')}
                  </MapRailNote>
                </SurfaceSection>
                <SurfaceSection label={t('formationDetail.command.youHeading')}>
                  {formation.corps_id && (
                    <button
                      type="button"
                      data-testid="formation-detail-open-corps-hq"
                      onClick={() => openArmyHQBriefingForCorps(useGameStore.getState(), formation.corps_id ?? null)}
                      className={`${MAP_RAIL_BUTTON} w-full justify-start border-[#c9a75c]/60 text-left`}
                    >
                      {t('formationDetail.command.openCorps')}
                    </button>
                  )}
                  <MapRailNote>{t('formationDetail.command.directives')}</MapRailNote>
                  <MapRailNote>{t('formationDetail.command.autonomyHint')}</MapRailNote>
                </SurfaceSection>
              </>
            )}
            {!ipc.isAvailable && formation.eliteLoanState && (
              <MapRailNote>{t('formationDetail.commandBridgeUnavailable')}</MapRailNote>
            )}
            {/* Elite loan status (elite brigades only) */}
            {formation.eliteLoanState && (
              <SurfaceSection label={t('formationDetail.armyReserveStatus')}>
                {formation.eliteLoanState.permanently_degraded ? (
                  <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger} self-start whitespace-normal`}>{t('formationDetail.eliteDegraded')}</span>
                ) : formation.eliteLoanState.on_loan ? (
                  <div className="flex flex-col gap-2">
                    <MapRailStats>
                      <MapRailStat
                        label={t('formationDetail.onLoan')}
                        value={t('formationDetail.weeksDeployed', { weeks: formation.eliteLoanState.turns_deployed.toString() })}
                        tone="text-amber-200"
                      />
                      <p className="m-0 pb-1.5 text-[15px] text-[#b9ad94]">
                        {'->'} {formatLoanCommandDestination(
                          formation.eliteLoanState.loaned_to_corps,
                          loadedGameState.formations,
                        )}
                      </p>
                    </MapRailStats>
                    <button
                      type="button"
                      disabled={!ipc.isAvailable}
                      onClick={() => void ipc.recallEliteBrigade(formation.id).then(r => { if (!r.ok) setLoadError(r.error ?? t('formationDetail.recallFailed')); })}
                      className={`${MAP_RAIL_BUTTON} w-full`}
                    >
                      {t('formationDetail.recallToReserve')}
                    </button>
                  </div>
                ) : formation.eliteLoanState.in_cooldown ? (
                  <MapRailNote>{t('formationDetail.cooldownReturning')}</MapRailNote>
                ) : (
                  <span className={`${SURFACE_CHIP} ${SURFACE_TONE.good} self-start`}>{t('formationDetail.readyForDeployment')}</span>
                )}
              </SurfaceSection>
            )}

            {/* Home-distance effectiveness (brigades only) */}
            {isBrigade && effPct != null && (
              <SurfaceSection
                label={t('formationDetail.fieldEffectiveness')}
                action={isHome ? (
                  <span className={`${SURFACE_CHIP} ${SURFACE_TONE.good}`}>{t('formationDetail.homeTurf')}</span>
                ) : (
                  <span className={`${SURFACE_CHIP} ${effPct >= 90 ? SURFACE_TONE.good : effPct >= 80 ? SURFACE_TONE.warn : SURFACE_TONE.danger}`}>
                    {t('formationDetail.effPercent', { percent: effPct.toString(), elite: isElite ? t('formationDetail.eliteParen') : '' })}
                  </span>
                )}
              >
                {!isHome && hops != null && (
                  <>
                    <MapRailStats>
                      <MapRailStat label={t('formationDetail.powerAtHome')} value={formatHomePower(formation.personnel)} tone="text-emerald-200" />
                      <MapRailStat
                        label={t('formationDetail.powerHere', { percent: effPct.toString() })}
                        value={formatHomePower(Number.isFinite(formation.personnel) ? (formation.personnel as number) * (effPct / 100) : null)}
                        tone={effPct >= 90 ? 'text-amber-100' : 'text-red-200'}
                      />
                    </MapRailStats>
                    <MapRailNote>{t('formationDetail.hopsFromHome', { hops: hops.toString() })}</MapRailNote>
                  </>
                )}
              </SurfaceSection>
            )}
          </>
        )}
      </MapRailBody>
    </MapRailFrame>
  );
}
