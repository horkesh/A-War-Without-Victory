import type { LoadedGameState } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

function computeTerritoryPercentages(controlBySettlement: Record<string, string | null>): Record<string, number> {
  const totals: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
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
  const values = Object.values(state.phaseIiSupplyPressure ?? {});
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
  const raw = ivp.atrocity_visibility + ivp.enclave_humanitarian_pressure + ivp.sarajevo_siege_visibility;
  return Math.max(0, Math.min(100, raw * 20));
}

export function SituationTab({ state }: { state: LoadedGameState }) {
  const territoryPct = computeTerritoryPercentages(state.controlBySettlement);
  const front = computeFrontSummary(state);
  const supply = computeSupplySummary(state);
  const ivpScore = computeIvpScore(state);
  const alliance = state.war_alliance_rbih_hrhb ?? 0;
  const alliancePct = Math.max(0, Math.min(100, ((alliance + 1) / 2) * 100));
  const alerts: string[] = [];

  if (supply.cut > 0) alerts.push(`${supply.cut} supply channel(s) cut`);
  if (alliance < -0.25) alerts.push('RBiH-HRHB alliance under strain');
  if (ivpScore >= 60) alerts.push('International visibility pressure elevated');

  return (
    <div className="p-3 space-y-3 text-xs">
      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-2">
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

      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
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

      <section className="rounded border border-panel-border bg-panel-card p-2 space-y-1.5">
        <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">Alliance Gauge (RBiH-HRHB)</div>
        <div className="h-2 rounded bg-panel-bg overflow-hidden">
          <div className="h-full bg-interactive" style={{ width: `${alliancePct}%` }} />
        </div>
        <div className="text-text-secondary tabular-nums">{alliance.toFixed(2)}</div>
      </section>

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

