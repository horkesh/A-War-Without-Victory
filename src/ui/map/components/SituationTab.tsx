import { useState, useEffect } from 'react';
import type { LoadedGameState, SummaryFocusSection } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { DiplomacyOverview } from './DiplomacyOverview';
import {
    DRINA_BLOCKADE_THRESHOLD,
    INTERNATIONAL_SANCTIONS_THRESHOLD,
    NATO_INTERVENTION_THRESHOLD,
    getIvpComponentContributions,
    formatIvpConsequenceLabel,
    ivpComponentLabel,
    sortIvpConsequenceIds,
} from '../../../state/patron_pressure.js';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

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
    const baseUrl = (window as unknown as Record<string, unknown>).__DATA_BASE_URL as string | undefined;
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

function computeFrontSummary(state: LoadedGameState): { static: number; fluid: number; oscillating: number } {
  const pressureEntries = Object.values(state.frontPressureByEdge ?? {});
  if (pressureEntries.length === 0) {
    const fallback = state.assignableFrontSegments?.length ?? 0;
    return { static: fallback, fluid: 0, oscillating: 0 };
  }
  let stat = 0;
  let fluid = 0;
  let oscillating = 0;
  for (const edge of pressureEntries) {
    const intensity = Math.abs(edge.value) / Math.max(1, edge.max_abs);
    if (intensity <= 0.33) stat += 1;
    else if (intensity <= 0.66) fluid += 1;
    else oscillating += 1;
  }
  return { static: stat, fluid, oscillating };
}

function computeSupplySummary(state: LoadedGameState): { open: number; strained: number; cut: number } {
  const values = Object.values(state.warPhaseSupplyPressure ?? {});
  let open = 0;
  let strained = 0;
  let cut = 0;
  for (const value of values) {
    if (value >= 80) open += 1;
    else if (value >= 50) strained += 1;
    else cut += 1;
  }
  return { open, strained, cut };
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
  const territoryPct = computeTerritoryPercentages(state.controlBySettlement, osidAreas ?? undefined);
  const front = computeFrontSummary(state);
  const supply = computeSupplySummary(state);
  const ivpScore = computeIvpScore(state);
  const playerFaction =
    state.player_faction === 'RBiH' || state.player_faction === 'RS' || state.player_faction === 'HRHB'
      ? state.player_faction
      : null;
  const activeMunicipalitySupport = playerFaction
    ? state.municipalitySupportOrders?.[playerFaction]
    : undefined;
  const alliance = state.war_alliance_rbih_hrhb ?? 0;
  const alliancePct = Math.max(0, Math.min(100, ((alliance + 1) / 2) * 100));
  const alerts: string[] = [];
  const [convoyMessage, setConvoyMessage] = useState<string | null>(null);
  const playerOperations = [...(state.operations ?? [])]
    .filter((operation) => operation.faction === playerFaction)
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

  if (supply.cut > 0) alerts.push(`${supply.cut} supply channel(s) cut`);
  if (alliance < -0.25) alerts.push('RBiH-HRHB alliance under strain');
  if (ivpScore >= 60) alerts.push('International visibility pressure elevated');

  useEffect(() => {
    if (!focusSection || focusSection === 'overview') return;
    const section = document.querySelector<HTMLElement>(`[data-summary-section="${focusSection}"]`);
    section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusSection]);

  const handleConvoyDecision = async (convoyId: string, decision: 'allow' | 'block' | 'divert') => {
    const result = await ipc.stageConvoyDecision(convoyId, decision);
    setConvoyMessage(result.ok ? `Convoy order staged: ${decision}.` : (result.error ?? 'Failed to stage convoy decision.'));
  };

  return (
    <div className="p-3 space-y-3 text-xs">
      <section data-summary-section="overview" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Territory</div>
        {FACTIONS.map((faction) => (
          <div key={faction} className="flex items-center justify-between">
            <span className={FACTION_COLORS[faction]}>{faction}</span>
            <span className="text-text-secondary tabular-nums">{territoryPct[faction].toFixed(1)}%</span>
          </div>
        ))}
      </section>

      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">War Snapshot</div>
        <div className="text-text-secondary">Fronts: {front.static} static, {front.fluid} fluid, {front.oscillating} oscillating</div>
        <div className="text-text-secondary">Supply: {supply.open} open, {supply.strained} strained, {supply.cut} cut</div>
        <div className="text-text-secondary">IVP: {ivpScore.toFixed(0)}</div>
      </section>

      <section data-summary-section="casualties" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Casualties</div>
        {FACTIONS.map((faction) => {
          const row = state.casualtyLedger?.[faction];
          const military = row ? `${row.killed} KIA / ${row.wounded} WIA / ${row.missing_captured} MIA` : 'No data';
          return (
            <div key={faction} className="flex items-center justify-between gap-2">
              <span className={FACTION_COLORS[faction]}>{faction}</span>
              <span className="text-text-secondary text-right">{military}</span>
            </div>
          );
        })}
      </section>

      <section data-summary-section="alliance" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Alliance Gauge (RBiH-HRHB)</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-interactive" style={{ width: `${alliancePct}%` }} />
        </div>
        <div className="text-text-secondary tabular-nums">{alliance.toFixed(2)}</div>
      </section>

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

      {(state.pendingConvoyDecisions && state.pendingConvoyDecisions.length > 0) && (
        <section data-summary-section="convoys" className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Humanitarian Convoys</div>
          {state.pendingConvoyDecisions.map((convoy) => (
            <div key={convoy.id} className="rounded border border-panel-border bg-panel-bg/60 p-2 space-y-1">
              <div className="text-text-secondary">
                {convoy.target_enclave} via {convoy.route_faction} corridor, {convoy.supply_amount.toFixed(2)} supply
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
          ))}
          {convoyMessage && <div className="text-text-secondary">{convoyMessage}</div>}
        </section>
      )}

      {activeMunicipalitySupport && activeMunicipalitySupport.staged_turn === state.turn && (
        <section data-summary-section="support" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Phase E Local Support</div>
          <div className="text-text-secondary">{activeMunicipalitySupport.label}</div>
          <div className="text-text-secondary">Target municipality: {activeMunicipalitySupport.mun_id}</div>
        </section>
      )}

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
                  Threat {sector.threat_ratio.toFixed(2)} · Intel {(sector.intel_confidence * 100).toFixed(0)}%
                  {sector.offensive_signs ? ' · Offensive signs detected' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-secondary">No sectors are currently running OPSEC.</div>
        )}
        {fragileOperations.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-panel-border">
            <div className="text-[10px] uppercase tracking-wide text-text-secondary">Operation health</div>
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

      {/* Negotiation Capital & Patron Pressure (v0.5.0) */}
      {(state.negotiationCapital || state.patronOverrideAuthority) && (
        <section data-summary-section="capital" className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
          <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Diplomacy</div>
          <DiplomacyOverview
            capital={state.negotiationCapital}
            patronOverride={state.patronOverrideAuthority}
            playerFaction={playerFaction ?? undefined}
          />
        </section>
      )}

      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Alerts</div>
        {alerts.length === 0 ? (
          <div className="text-text-secondary">No critical alerts.</div>
        ) : (
          alerts.sort((a, b) => a.localeCompare(b)).map((alert) => (
            <div key={alert} className="text-text-secondary">- {alert}</div>
          ))
        )}
      </section>
    </div>
  );
}
