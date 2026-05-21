/**
 * Situation tab — strategic / casualty / IVP / convoy / OPSEC overview.
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
import { DiplomacyOverview } from './DiplomacyOverview';
import { filterPlayerFacingOperations, getPlayerFacingFaction } from '../../shared/playerVisibility';
import {
  getPlayerSafeCorridorLabel,
  getPlayerSafeEnclaveName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
  getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';
import { getPlayerSafeThreatPresentation } from '../utils/playerSafeThreat';
import {
    DRINA_BLOCKADE_THRESHOLD,
    INTERNATIONAL_SANCTIONS_THRESHOLD,
    NATO_INTERVENTION_THRESHOLD,
    getIvpComponentContributions,
    formatIvpConsequenceLabel,
    ivpComponentLabel,
    sortIvpConsequenceIds,
} from '../../../state/patron_pressure.js';
import { EmptyState } from './EmptyState';

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
  const raw = ivp.atrocity_visibility + ivp.enclave_humanitarian_pressure + ivp.sarajevo_siege_visibility;
  return Math.max(0, Math.min(100, raw * 20));
}

export function SituationTab({ state, focusSection }: { state: LoadedGameState; focusSection?: SummaryFocusSection }) {
  const ipc = useIPC();
  const osidAreas = useOsidAreas();
  const playerFaction = getPlayerFacingFaction(state);
  const territoryPct = computeTerritoryPercentages(state.controlBySettlement, osidAreas ?? undefined);
  const sitrep = state.operationalSitrep;
  const ivpScore = computeIvpScore(state);
  const playerMilitaryLabel = playerFaction ? getPlayerSafeMilitaryFactionName(playerFaction) : null;
  const playerPoliticalLabel = playerFaction ? getPlayerSafePoliticalFactionName(playerFaction) : null;
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

  if (alliance < -0.25) alerts.push('Bosniak-Croat alliance under strain');
  if (ivpScore >= 60) alerts.push('International visibility pressure elevated');

  useEffect(() => {
    if (!focusedMode || !focusSection) return;
    const section = document.querySelector<HTMLElement>(`[data-summary-section="${focusSection}"]`);
    if (typeof section?.scrollIntoView === 'function') {
      section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [focusedMode, focusSection]);

  const handleConvoyDecision = async (convoyId: string, decision: 'allow' | 'block' | 'divert') => {
    const result = await ipc.stageConvoyDecision(convoyId, decision);
    setConvoyMessage(result.ok ? `Convoy order staged: ${decision}.` : (result.error ?? 'Failed to stage convoy decision.'));
  };

  return (
    <div className="p-3 space-y-3 text-xs">
      {!focusedMode && (
      <section data-summary-section="overview" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Territory</div>
        {playerFaction ? (
          <div className="flex items-center justify-between">
            <span className={FACTION_COLORS[playerFaction]}>{playerMilitaryLabel}</span>
            <span className="text-text-secondary tabular-nums">
              {(sitrep?.territory.territoryPercent ?? territoryPct[playerFaction]).toFixed(1)}%
            </span>
          </div>
        ) : (
          <div className="text-text-secondary">Territory summary unavailable.</div>
        )}
      </section>
      )}

      {!focusedMode && sitrep && (
      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Operational SITREP</div>
        <div className="text-text-secondary">{sitrep.headline}</div>
        <div className="text-text-secondary">
          Fronts: {sitrep.front.engagedCount} engaged, {sitrep.front.exposedCount} exposed
        </div>
        <div className="text-text-secondary">
          Sustainment: {sitrep.sustainment.criticalCount} critical, {sitrep.sustainment.strainedCount} strained
          {sitrep.sustainment.collapsedMunicipalities.length > 0 ? `, ${sitrep.sustainment.collapsedMunicipalities.length} collapsed` : ''}
        </div>
        <div className="text-text-secondary">
          Operations: {sitrep.operations.activeCount} active command{sitrep.operations.activeCount === 1 ? '' : 's'}
        </div>
        {sitrep.front.edges.length > 0 && (
          <div className="text-text-secondary text-[10px]">
            Priority fronts: {sitrep.front.edges.slice(0, 2).map((edge) => edge.label).join('; ')}
          </div>
        )}
        {sitrep.readiness.weakestBrigades.length > 0 && (
          <div className="text-text-secondary text-[10px]">
            Weakest brigades: {sitrep.readiness.weakestBrigades.slice(0, 2).map((brigade) => brigade.label).join('; ')}
          </div>
        )}
      </section>
      )}

      {showSection('casualties') && (
      <section data-summary-section="casualties" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Casualties</div>
        {playerFaction ? (() => {
          const row = state.casualtyLedger?.[playerFaction];
          const military = row ? `${row.killed} KIA / ${row.wounded} WIA / ${row.missing_captured} MIA` : 'No data';
          return (
            <div className="flex items-center justify-between gap-2">
              <span className={FACTION_COLORS[playerFaction]}>{playerMilitaryLabel}</span>
              <span className="text-text-secondary text-right">{military}</span>
            </div>
          );
        })() : (
          <div className="text-text-secondary">Casualty summary unavailable.</div>
        )}
      </section>
      )}

      {!focusedMode && (
      <section data-summary-section="alliance" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Alliance Gauge (Bosniak-Croat)</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-interactive" style={{ width: `${alliancePct}%` }} />
        </div>
        <div className="text-text-secondary tabular-nums">{alliance.toFixed(2)}</div>
      </section>
      )}

      {showSection('ivp') && (
      <section data-summary-section="ivp" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">International Pressure (IVP)</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-accent-gold/80" style={{ width: `${ivpScore}%` }} />
        </div>
        <div className="text-text-secondary">Composite IVP: {ivpScore.toFixed(0)}</div>
        <div className="text-text-secondary text-[10px] space-y-0.5">
          {getIvpComponentContributions(state.internationalVisibilityPressure).map((row) => (
            <div key={row.key} className="flex justify-between gap-2 tabular-nums">
              <span>{ivpComponentLabel(row.key)}</span>
              <span>
                {Math.round(row.raw * 100)}% × {Math.round(row.weight * 100)}% → +{Math.round(row.contribution * 100)}%
              </span>
            </div>
          ))}
        </div>
        <div className="text-text-secondary text-[10px]">
          Thresholds: {Math.round(DRINA_BLOCKADE_THRESHOLD * 100)}% Drina · {Math.round(INTERNATIONAL_SANCTIONS_THRESHOLD * 100)}% sanctions · {Math.round(NATO_INTERVENTION_THRESHOLD * 100)}% NATO threat
        </div>
        <div className="text-text-secondary">
          Consequences:{' '}
          {state.ivpConsequencesActive?.length
            ? sortIvpConsequenceIds(state.ivpConsequencesActive).map(formatIvpConsequenceLabel).join('; ')
            : 'none'}
        </div>
        {state.sarajevoTunnelOperational && (
          <div className="text-text-secondary">Sarajevo tunnel operational.</div>
        )}
      </section>
      )}

      {showSection('convoys') && (
        <section data-summary-section="convoys" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Humanitarian Convoys</div>
          {state.pendingConvoyDecisions && state.pendingConvoyDecisions.length > 0 ? (
            state.pendingConvoyDecisions.map((convoy) => (
              <div key={convoy.id} className="rounded border border-panel-border bg-panel-bg/60 p-2 space-y-1">
                <div className="text-text-secondary">
                  {getPlayerSafeEnclaveName(convoy.target_enclave)} via {getPlayerSafeCorridorLabel(convoy.route_faction)}, {convoy.supply_amount.toFixed(2)} supply
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'allow')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'block')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConvoyDecision(convoy.id, 'divert')}
                    className="px-2 py-1 text-[10px] border border-panel-border rounded text-text-primary hover:bg-panel-hover"
                  >
                    Divert
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No convoy decisions are pending." />
          )}
          {convoyMessage && <div className="text-text-secondary">{convoyMessage}</div>}
        </section>
      )}

      {showSection('support') && (
        <section data-summary-section="support" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Phase E Local Support</div>
          {activeMunicipalitySupport && activeMunicipalitySupport.staged_turn === state.turn ? (
            <>
              <div className="text-text-secondary">
                {activeMunicipalitySupport.label.replace(/\bRBiH\b/g, playerPoliticalLabel ?? 'friendly authorities')}
              </div>
              <div className="text-text-secondary">
                Target municipality: {getPlayerSafeMunicipalityName(activeMunicipalitySupport.mun_id)}
              </div>
            </>
          ) : (
            <EmptyState message="No local support order is staged this turn." />
          )}
        </section>
      )}

      {showSection('opsec') && (
      <section data-summary-section="opsec" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Operational Posture</div>
        {activeOpsecSectors.length > 0 ? (
          <div className="space-y-1.5">
            {activeOpsecSectors.map((sector) => (
              <div key={sector.sector_id} className="rounded border border-panel-border bg-panel-bg/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-primary">{sector.display_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-accent-gold">OPSEC active</span>
                </div>
                <div className="text-text-secondary">
                  Pressure {getPlayerSafeThreatPresentation(sector.threat_ratio).summary} · Intel {(sector.intel_confidence * 100).toFixed(0)}%
                  {sector.offensive_signs ? ' · Offensive signs detected' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No sectors are currently running OPSEC." />
        )}
        {fragileOperations.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-panel-border">
            <div className="text-[10px] uppercase tracking-wide text-text-secondary">
              Flagged operation health ({fragileOperations.length} of {playerOperations.length} active operations)
            </div>
            {fragileOperations.map((operation) => (
              <div key={`${operation.corps_id}|${operation.name}`} className="flex items-center justify-between gap-2 text-text-secondary">
                <span>{operation.name}</span>
                <span className="text-right">
                  Supply {Math.round((operation.supply_readiness ?? 0) * 100)}% · Failures {operation.failure_count ?? 0}
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
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Diplomacy</div>
          {state.strategicDimensions || state.patronOverrideAuthority ? (
            <DiplomacyOverview
              strategicDimensions={state.strategicDimensions}
              negotiatingCapital={state.negotiatingCapital}
              patronOverride={state.patronOverrideAuthority}
              playerFaction={playerFaction ?? undefined}
            />
          ) : (
            <EmptyState message="Diplomacy capital is not available in this view." />
          )}
        </section>
      )}

      {!focusedMode && (
      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Alerts</div>
        {((sitrep?.alerts.length ?? 0) === 0) && alerts.length === 0 ? (
          <div className="text-text-secondary">No active alerts.</div>
        ) : (
          <>
            {(sitrep?.alerts ?? []).map((alert) => (
              <div key={alert.id} className="text-text-secondary">- {alert.text}</div>
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
