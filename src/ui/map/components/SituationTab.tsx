/**
 * Situation tab — strategic / casualty / pressure / convoy / security overview.
 *
 * A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C — verified clean of clickable-div
 * anti-pattern: every interactive element here is a real <button>. The lane
 * keeps SituationTab in scope for static-grep guards that prevent the
 * anti-pattern from regressing during future feature work. See
 * `tests/v093_a11y_lane_c_warroom_decision_room.test.ts`.
 */
import { useState, useEffect } from 'react';
import type { LoadedGameState, SummaryFocusSection } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { DiplomacyOverview } from './DiplomacyOverview';
import { filterPlayerFacingOperations, getPlayerFacingFaction } from '../../shared/playerVisibility';
import {
  getPlayerSafeCorridorLabel,
  getPlayerSafeEnclaveName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
} from '../utils/playerSafeText';
import { getLocalizedMunicipalitySupportLabel } from '../utils/municipalitySupportLabels';
import { getPlayerSafeThreatPresentation } from '../utils/playerSafeThreat';
import { getOsidDisplayName, humanizeOsid } from '../utils/osidDisplayName';
import {
    getIvpComponentContributions,
    formatIvpConsequenceLabel,
    ivpComponentLabel,
    sortIvpConsequenceIds,
} from '../../../state/patron_pressure.js';
import { EmptyState } from './EmptyState';
import { resolveWarroomActivityArt } from '../data/warroomActivityArt';
import {
  deriveSarajevoSiegeStateFromGameState,
  sarajevoSiegeGloss,
  sarajevoSiegeTitle,
  type SiegeFaction,
} from '../data/sarajevoSiege';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import { localizedOperationalSitrepCopy } from '../utils/operationalSitrepCopy';

const FACTIONS: Array<'RS' | 'RBiH' | 'HRHB'> = ['RS', 'RBiH', 'HRHB'];

interface OsidAreasFile {
  total_area_km2: number;
  areas: Record<string, number>;
}

/** Load osid_areas.json once (browser fetch). Cached in module scope. */
let cachedAreas: OsidAreasFile | null = null;
let areaLoadAttempted = false;

function useOsidAreas(): OsidAreasFile | null {
  const [areas, setAreas] = useState<OsidAreasFile | null>(cachedAreas);
  useEffect(() => {
    if (cachedAreas || areaLoadAttempted) return;
    areaLoadAttempted = true;
    // Try data server first (Electron), then relative path (dev server)
    const baseUrl = (window as Window & { __DATA_BASE_URL?: string }).__DATA_BASE_URL;
    const url = baseUrl
      ? `${baseUrl}/derived/operational/osid_areas.json`
      : '/data/derived/operational/osid_areas.json';
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { cachedAreas = data; setAreas(data); } })
      .catch(() => { /* area data unavailable — degrade to count-based */ });
  }, []);
  return areas;
}

function computeTerritoryPercentages(
  controlBySettlement: Record<string, string | null>,
  osidAreas?: { total_area_km2: number; areas: Record<string, number> }
): Record<string, number> {
  const totals: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
  if (osidAreas && osidAreas.total_area_km2 > 0) {
    // Area-weighted percentages
    for (const [osid, controller] of Object.entries(controlBySettlement)) {
      if (controller === 'RS' || controller === 'RBiH' || controller === 'HRHB') {
        totals[controller] += osidAreas.areas[osid] ?? 0;
      }
    }
    for (const faction of FACTIONS) {
      totals[faction] = (totals[faction] / osidAreas.total_area_km2) * 100;
    }
  } else {
    // Count-based fallback
    const values = Object.values(controlBySettlement);
    const totalCount = values.length;
    if (totalCount === 0) return totals;
    for (const controller of values) {
      if (controller === 'RS' || controller === 'RBiH' || controller === 'HRHB') {
        totals[controller] += 1;
      }
    }
    for (const faction of FACTIONS) {
      totals[faction] = (totals[faction] / totalCount) * 100;
    }
  }
  return totals;
}

function computeIvpScore(state: LoadedGameState): number {
  const ivp = state.internationalVisibilityPressure;
  if (!ivp) return 0;
  if (typeof ivp.composite_ivp === 'number') {
    return Math.max(0, Math.min(100, ivp.composite_ivp * 100));
  }
  const raw =
    (ivp.atrocity_visibility ?? 0) +
    (ivp.enclave_humanitarian_pressure ?? 0) +
    (ivp.sarajevo_siege_visibility ?? 0) +
    (ivp.negotiation_momentum ?? 0);
  return Math.max(0, Math.min(100, raw * 20));
}

function pressureBand(score: number): string {
  if (score >= 80) return 'extreme';
  if (score >= 60) return 'severe';
  if (score >= 35) return 'elevated';
  if (score > 0) return 'limited';
  return 'quiet';
}

function pressureDriverLabel(raw: number): string {
  if (raw >= 0.75) return 'dominant';
  if (raw >= 0.5) return 'strong';
  if (raw >= 0.25) return 'visible';
  if (raw > 0) return 'minor';
  return 'quiet';
}

function contactBandKey(count: number): MessageKey {
  if (count >= 150) return 'situation.contactBand.widespread';
  if (count >= 50) return 'situation.contactBand.broad';
  if (count >= 12) return 'situation.contactBand.several';
  if (count > 0) return 'situation.contactBand.limited';
  return 'situation.contactBand.quiet';
}

function thinFrontBandKey(count: number): MessageKey {
  if (count >= 100) return 'situation.thinFrontBand.widespread';
  if (count >= 25) return 'situation.thinFrontBand.many';
  if (count >= 6) return 'situation.thinFrontBand.several';
  if (count > 0) return 'situation.thinFrontBand.isolated';
  return 'situation.thinFrontBand.none';
}

function alliancePostureKey(alliance: number): MessageKey {
  if (alliance <= 0.10) return 'situation.alliancePosture.openConflict';
  if (alliance <= 0.20) return 'situation.alliancePosture.mobilizing';
  if (alliance <= 0.45) return 'situation.alliancePosture.strained';
  if (alliance <= 0.70) return 'situation.alliancePosture.working';
  return 'situation.alliancePosture.close';
}

function legacySitrepTokenForOsid(osid: string): string {
  const raw = osid.startsWith('op:')
    ? osid.split(':').slice(1).join(' ')
    : osid.replace(/[:-]/g, ' ');
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSitrepFrontLabel(label: string, osidDisplayNames: Record<string, string> | null): string {
  const displayEntries = osidDisplayNames
    ? Object.keys(osidDisplayNames)
      .sort((a, b) => legacySitrepTokenForOsid(b).length - legacySitrepTokenForOsid(a).length || a.localeCompare(b))
      .map((osid) => ({
        osid,
        legacyToken: legacySitrepTokenForOsid(osid),
        displayName: getOsidDisplayName(osid, osidDisplayNames),
      }))
    : [];

  return label
    .split(/\s+-\s+/)
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return trimmed;
      if (trimmed.startsWith('op:')) return getOsidDisplayName(trimmed, osidDisplayNames);
      const match = displayEntries.find((entry) => entry.legacyToken.toLowerCase() === trimmed.toLowerCase());
      if (match) return match.displayName;
      return humanizeOsid(trimmed);
    })
    .join(' - ');
}

export function SituationTab({ state, focusSection }: { state: LoadedGameState; focusSection?: SummaryFocusSection }) {
  const ipc = useIPC();
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidAreas = useOsidAreas();
  const playerFaction = getPlayerFacingFaction(state);
  const territoryPct = computeTerritoryPercentages(state.controlBySettlement, osidAreas ?? undefined);
  const sitrep = state.operationalSitrep;
  const ivpScore = computeIvpScore(state);
  const playerMilitaryLabel = playerFaction ? getPlayerSafeMilitaryFactionName(playerFaction) : null;
  const activeMunicipalitySupport = playerFaction
    ? state.municipalitySupportOrders?.[playerFaction]
    : undefined;
  const alliance = state.war_alliance_rbih_hrhb ?? 0;
  const alliancePct = Math.max(0, Math.min(100, ((alliance + 1) / 2) * 100));
  const alerts: string[] = [];
  const [convoyMessage, setConvoyMessage] = useState<string | null>(null);
  const playerOperations = [...filterPlayerFacingOperations(state)]
    .sort((a, b) => a.name.localeCompare(b.name) || a.corps_id.localeCompare(b.corps_id));
  const fragileOperations = playerOperations
    .filter((operation) => (
      (operation.supply_readiness ?? 1) < 0.6
      || (operation.avg_cohesion ?? 100) < 70
      || (operation.failure_count ?? 0) > 0
      || (operation.consecutive_failures_on_current ?? 0) > 0
    ))
    .slice(0, 3);
  const activeOpsecSectors = [...(state.corpsFrontSectors ?? [])]
    .filter((sector) => sector.faction === playerFaction && sector.opsec_active)
    .sort((a, b) => b.threat_ratio - a.threat_ratio || a.display_name.localeCompare(b.display_name));
  const focusedMode = !!focusSection && focusSection !== 'overview';
  const showSection = (section: SummaryFocusSection): boolean => !focusedMode || focusSection === section;

  // Faction-tagged documentary stills for the convoy + patron activity lanes
  // ("Car 4" §4 activity art). Resolve to null when no asset matches — the lane
  // then renders text-only exactly as before (graceful fallback, never a broken
  // image). Read-model/UI only; calibration-inert.
  const convoyArt = resolveWarroomActivityArt('convoy', playerFaction);
  const patronArt = resolveWarroomActivityArt('patron', playerFaction);

  // Sarajevo-siege legibility (D2 task #41): while the SRK strangles the urban
  // core (encirclement + bombardment, the city NOT stormed; Galić §389), surface a
  // somber, faction-aware "besieged, not captured" indicator. Pure read of the
  // per-turn strangle field (last_contained_osids_by_faction.RS ∩ Sarajevo core)
  // off the raw GameState. Null when the posture is off / the core isn't strangled
  // → no indicator. The core HOLDING is the §6-correct outcome; read-model only.
  const sarajevoSiege = deriveSarajevoSiegeStateFromGameState(state.rawGameState);
  const siegePlayerFaction: SiegeFaction | null =
    playerFaction === 'RBiH' || playerFaction === 'RS' || playerFaction === 'HRHB'
      ? playerFaction
      : null;

  if (alliance < -0.25) alerts.push(t('situation.alertAllianceStrain'));
  if (ivpScore >= 60) alerts.push(t('situation.alertIvpElevated'));

  useEffect(() => {
    if (!focusedMode || !focusSection) return;
    const section = document.querySelector<HTMLElement>(`[data-summary-section="${focusSection}"]`);
    if (typeof section?.scrollIntoView === 'function') {
      section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [focusedMode, focusSection]);

  const handleConvoyDecision = async (convoyId: string, decision: 'allow' | 'block' | 'divert') => {
    const result = await ipc.stageConvoyDecision(convoyId, decision);
    setConvoyMessage(result.ok
      ? t('situation.convoyStaged', { decision })
      : (result.error ?? t('situation.convoyStageFailed')));
  };

  return (
    <div className="p-3 space-y-3 text-xs">
      {!focusedMode && (
      <section data-summary-section="overview" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('warSummary.section.territory')}</div>
        {playerFaction ? (
          <div className="flex items-center justify-between">
            <span className={FACTION_COLORS[playerFaction]}>{playerMilitaryLabel}</span>
            <span className="text-text-secondary tabular-nums">
              {(sitrep?.territory.territoryPercent ?? territoryPct[playerFaction]).toFixed(1)}%
            </span>
          </div>
        ) : (
          <div className="text-text-secondary">{t('situation.territoryUnavailable')}</div>
        )}
      </section>
      )}

      {!focusedMode && sitrep && (
      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.operationalSitrep')}</div>
        <div className="text-text-secondary">{localizedOperationalSitrepCopy(sitrep.headlineToken, sitrep.headline)}</div>
        <div className="text-text-secondary">
          {t('situation.frontsLine', {
            contactBand: t(contactBandKey(sitrep.front.engagedCount)),
            thinBand: t(thinFrontBandKey(sitrep.front.exposedCount)),
          })}
        </div>
        <div className="text-text-secondary">
          {t('situation.sustainmentLine', { critical: sitrep.sustainment.criticalCount, strained: sitrep.sustainment.strainedCount })}
          {sitrep.sustainment.collapsedMunicipalities.length > 0 ? t('situation.sustainmentCollapsed', { count: sitrep.sustainment.collapsedMunicipalities.length }) : ''}
        </div>
        <div className="text-text-secondary">
          {t('situation.operationsLine', {
            count: sitrep.operations.activeCount,
            commandWord: t(sitrep.operations.activeCount === 1 ? 'situation.command.one' : 'situation.command.many'),
          })}
        </div>
        {sitrep.front.edges.length > 0 && (
          <div className="text-text-secondary text-[10px]">
            {t('situation.priorityFronts', {
              items: sitrep.front.edges
                .slice(0, 2)
                .map((edge) => formatSitrepFrontLabel(edge.label, osidDisplayNames))
                .join('; '),
            })}
          </div>
        )}
        {sitrep.readiness.weakestBrigades.length > 0 && (
          <div className="text-text-secondary text-[10px]">
            {t('situation.weakestBrigades', { items: sitrep.readiness.weakestBrigades.slice(0, 2).map((brigade) => brigade.label).join('; ') })}
          </div>
        )}
      </section>
      )}

      {showSection('casualties') && (
      <section data-summary-section="casualties" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.casualties')}</div>
        {playerFaction ? (() => {
          const row = state.casualtyLedger?.[playerFaction];
          const military = row
            ? t('situation.casualtyBreakdown', {
              killed: row.killed.toLocaleString(),
              wounded: row.wounded.toLocaleString(),
              missing: row.missing_captured.toLocaleString(),
            })
            : t('situation.noData');
          return (
            <div className="flex items-center justify-between gap-2">
              <span className={FACTION_COLORS[playerFaction]}>{playerMilitaryLabel}</span>
              <span className="text-text-secondary text-right">{military}</span>
            </div>
          );
        })() : (
          <div className="text-text-secondary">{t('situation.casualtyUnavailable')}</div>
        )}
      </section>
      )}

      {!focusedMode && (
      <section data-summary-section="alliance" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.allianceGauge')}</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-interactive" style={{ width: `${alliancePct}%` }} />
        </div>
        <div className="text-text-secondary">{t('situation.alliancePosture', { posture: t(alliancePostureKey(alliance)) })}</div>
      </section>
      )}

      {showSection('ivp') && (
      <section data-summary-section="ivp" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.ivp')}</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-accent-gold/80" style={{ width: `${ivpScore}%` }} />
        </div>
        <div className="text-text-secondary">{t('situation.pressureCurrent', { band: pressureBand(ivpScore), score: ivpScore.toFixed(0) })}</div>
        <div className="text-text-secondary text-[10px] space-y-0.5">
          {getIvpComponentContributions(state.internationalVisibilityPressure).map((row) => (
            <div key={row.key} className="flex justify-between gap-2">
              <span>{ivpComponentLabel(row.key)}</span>
              <span className="text-right">{pressureDriverLabel(row.raw)}</span>
            </div>
          ))}
        </div>
        <div className="text-text-secondary text-[10px]">{t('situation.pressureThresholds')}</div>
        <div className="text-text-secondary">
          {t('situation.consequences')}{' '}
          {state.ivpConsequencesActive?.length
            ? sortIvpConsequenceIds(state.ivpConsequencesActive).map(formatIvpConsequenceLabel).join('; ')
            : t('situation.none')}
        </div>
        {state.sarajevoTunnelOperational && (
          <div className="text-text-secondary">{t('situation.sarajevoTunnel')}</div>
        )}
        {sarajevoSiege && (
          <div
            data-testid="sarajevo-siege-indicator"
            className="mt-1 rounded border border-panel-border bg-panel-bg/60 p-2 space-y-1"
          >
            <div className="text-[10px] uppercase tracking-wide text-accent-gold">
              {sarajevoSiegeTitle()}
            </div>
            <div className="text-text-secondary">{sarajevoSiegeGloss(siegePlayerFaction)}</div>
          </div>
        )}
      </section>
      )}

      {showSection('convoys') && (
        <section data-summary-section="convoys" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.humanitarianConvoys')}</div>
          {convoyArt && (
            <figure className="m-0">
              <img
                src={convoyArt}
                alt=""
                aria-hidden="true"
                data-testid="convoy-activity-art"
                className="h-20 w-full rounded border border-panel-border object-cover"
              />
              <figcaption className="sr-only">{t('situation.convoyArtCaption')}</figcaption>
            </figure>
          )}
          {state.pendingConvoyDecisions && state.pendingConvoyDecisions.length > 0 ? (
            state.pendingConvoyDecisions.map((convoy) => (
              <div key={convoy.id} className="rounded border border-panel-border bg-panel-bg/60 p-2 space-y-1">
                <div className="text-text-secondary">
                  {t('situation.convoyLine', {
                    target: getPlayerSafeEnclaveName(convoy.target_enclave),
                    route: getPlayerSafeCorridorLabel(convoy.route_faction),
                    supply: convoy.supply_amount.toFixed(2),
                  })}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'allow')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    {t('situation.allow')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'block')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    {t('situation.block')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'divert')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    {t('situation.divert')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message={t('situation.emptyConvoys')} />
          )}
          {convoyMessage && <div className="text-text-secondary">{convoyMessage}</div>}
        </section>
      )}

      {showSection('support') && (
        <section data-summary-section="support" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.localSupport')}</div>
          {activeMunicipalitySupport && activeMunicipalitySupport.staged_turn === state.turn ? (
            <>
              <div className="text-text-secondary">
                {getLocalizedMunicipalitySupportLabel(activeMunicipalitySupport.type)}
              </div>
              <div className="text-text-secondary">
                {t('situation.targetMunicipality', { name: getPlayerSafeMunicipalityName(activeMunicipalitySupport.mun_id) })}
              </div>
            </>
          ) : (
            <EmptyState message={t('situation.emptySupport')} />
          )}
        </section>
      )}

      {showSection('opsec') && (
      <section data-summary-section="opsec" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.operationalPosture')}</div>
        {activeOpsecSectors.length > 0 ? (
          <div className="space-y-1.5">
            {activeOpsecSectors.map((sector) => (
              <div key={sector.sector_id} className="rounded border border-panel-border bg-panel-bg/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-primary">{sector.display_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-accent-gold">{t('situation.opsecActive')}</span>
                </div>
                <div className="text-text-secondary">
                  Pressure {getPlayerSafeThreatPresentation(sector.threat_ratio).summary} · Intel {(sector.intel_confidence * 100).toFixed(0)}%
                  {sector.offensive_signs ? ' · Offensive signs detected' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
            <EmptyState message={t('situation.emptyOpsec')} />
        )}
        {fragileOperations.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-panel-border">
            <div className="text-[10px] uppercase tracking-wide text-text-secondary">
              {t('situation.flaggedHealth', { flagged: fragileOperations.length, total: playerOperations.length })}
            </div>
            {fragileOperations.map((operation) => (
              <div key={`${operation.corps_id}|${operation.name}`} className="flex items-center justify-between gap-2 text-text-secondary">
                <span>{operation.display_name}</span>
                <span className="text-right">
                  {t('situation.operationHealthLine', {
                    supply: typeof operation.supply_readiness === 'number' && Number.isFinite(operation.supply_readiness)
                      ? `${Math.round(operation.supply_readiness * 100)}%`
                      : t('operationsPanel.na'),
                    failures: operation.failure_count ?? 0,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Negotiation Capital & Patron Pressure (v0.5.0) */}
      {showSection('capital') && (
        <section data-summary-section="capital" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.diplomacy')}</div>
          {patronArt && (
            <figure className="m-0">
              <img
                src={patronArt}
                alt=""
                aria-hidden="true"
                data-testid="patron-activity-art"
                className="h-20 w-full rounded border border-panel-border object-cover"
              />
              <figcaption className="sr-only">{t('situation.patronArtCaption')}</figcaption>
            </figure>
          )}
          {state.strategicDimensions || state.patronOverrideAuthority ? (
            <DiplomacyOverview
              strategicDimensions={state.strategicDimensions}
              negotiatingCapital={state.negotiatingCapital}
              patronOverride={state.patronOverrideAuthority}
              playerFaction={playerFaction ?? undefined}
            />
          ) : (
            <EmptyState message={t('situation.emptyCapital')} />
          )}
        </section>
      )}

      {!focusedMode && (
      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('situation.alerts')}</div>
        {((sitrep?.alerts.length ?? 0) === 0) && alerts.length === 0 ? (
          <div className="text-text-secondary">{t('situation.noAlerts')}</div>
        ) : (
          <>
            {(sitrep?.alerts ?? []).map((alert) => (
              <div key={alert.id} className="text-text-secondary">- {localizedOperationalSitrepCopy(alert.textToken, alert.text)}</div>
            ))}
            {alerts.sort((a, b) => a.localeCompare(b)).map((alert) => (
              <div key={alert} className="text-text-secondary">- {alert}</div>
            ))}
          </>
        )}
      </section>
      )}
    </div>
  );
}
