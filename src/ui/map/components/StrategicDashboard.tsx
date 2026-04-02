/**
 * Strategic Dashboard Overlay (R14).
 *
 * Shows territory control over time as a stacked area chart,
 * plus current-turn snapshot data. Opens from territory percentages in BottomStatusStrip.
 *
 * Uses real data from turnSummaries[].territory_snapshot when available.
 */
import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_HEX_COLORS } from '../utils/theme';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

const FACTION_LABEL: Record<string, string> = {
  RS: 'VRS',
  RBiH: 'ARBiH',
  HRHB: 'HVO',
};

const FACTIONS: Array<'RS' | 'RBiH' | 'HRHB'> = ['RS', 'RBiH', 'HRHB'];

interface TerritoryDataPoint {
  turn: number;
  RS: number;
  RBiH: number;
  HRHB: number;
}

export const StrategicDashboard = React.memo(function StrategicDashboard() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setStrategicDashboardOpen = useGameStore((s) => s.setStrategicDashboardOpen);
  const playerFaction = loadedGameState?.player_faction;
  const isPlayerFaction = playerFaction === 'RS' || playerFaction === 'RBiH' || playerFaction === 'HRHB';
  const playerMilitaryLabel = isPlayerFaction
    ? getPlayerSafeMilitaryFactionName(playerFaction)
    : null;

  // Build territory history from turn summaries
  const territoryHistory = useMemo<TerritoryDataPoint[]>(() => {
    if (!loadedGameState?.turnSummaries) return [];
    return loadedGameState.turnSummaries
      .filter((s) => s.territory_snapshot && Object.keys(s.territory_snapshot).length > 0)
      .map((s) => ({
        turn: s.turn,
        RS: (s.territory_snapshot?.RS ?? 0) * 100,
        RBiH: (s.territory_snapshot?.RBiH ?? 0) * 100,
        HRHB: (s.territory_snapshot?.HRHB ?? 0) * 100,
      }))
      .sort((a, b) => a.turn - b.turn);
  }, [loadedGameState?.turnSummaries]);

  // Current territory (area-weighted from controlBySettlement)
  const currentTerritory = useMemo(() => {
    const cbs = loadedGameState?.controlBySettlement ?? {};
    const totals = { RS: 0, RBiH: 0, HRHB: 0 };
    const totalArea = osidAreas.total_area_km2;
    for (const [osid, faction] of Object.entries(cbs)) {
      if (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB') {
        totals[faction] += osidAreas.areas[osid] ?? 0;
      }
    }
    return {
      RS: totalArea > 0 ? (totals.RS / totalArea) * 100 : 0,
      RBiH: totalArea > 0 ? (totals.RBiH / totalArea) * 100 : 0,
      HRHB: totalArea > 0 ? (totals.HRHB / totalArea) * 100 : 0,
    };
  }, [loadedGameState?.controlBySettlement]);

  // Current turn casualties
  const casualties = useMemo(() => {
    if (!loadedGameState?.turnSummaries) return null;
    const totals: Record<string, { kia: number; battles: number }> = {};
    for (const faction of FACTIONS) totals[faction] = { kia: 0, battles: 0 };
    for (const summary of loadedGameState.turnSummaries) {
      for (const battle of summary.battles) {
        totals[battle.attacker_faction] = totals[battle.attacker_faction] ?? { kia: 0, battles: 0 };
        totals[battle.defender_faction] = totals[battle.defender_faction] ?? { kia: 0, battles: 0 };
        totals[battle.attacker_faction].kia += battle.attacker_casualties;
        totals[battle.defender_faction].kia += battle.defender_casualties;
        totals[battle.attacker_faction].battles += 1;
      }
    }
    return totals;
  }, [loadedGameState?.turnSummaries]);

  const hasHistory = territoryHistory.length >= 2;

  // SVG chart dimensions
  const chartWidth = 560;
  const chartHeight = 200;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Build stacked area paths
  const { paths, xLabels } = useMemo(() => {
    if (!hasHistory) return { paths: {}, xLabels: [] as Array<{ x: number; label: string }> };

    const minTurn = territoryHistory[0].turn;
    const maxTurn = territoryHistory[territoryHistory.length - 1].turn;
    const turnRange = Math.max(maxTurn - minTurn, 1);

    const xScale = (turn: number) => padding.left + ((turn - minTurn) / turnRange) * plotWidth;
    const yScale = (pct: number) => padding.top + plotHeight - (pct / 100) * plotHeight;

    // Stacked: HRHB on bottom, RBiH in middle, RS on top
    const stackOrder: Array<'HRHB' | 'RBiH' | 'RS'> = ['HRHB', 'RBiH', 'RS'];
    const result: Record<string, string> = {};

    for (let i = 0; i < stackOrder.length; i++) {
      const faction = stackOrder[i];
      const topPoints: string[] = [];
      const bottomPoints: string[] = [];

      for (const dp of territoryHistory) {
        const x = xScale(dp.turn);
        let yBottom = 0;
        for (let j = 0; j < i; j++) yBottom += dp[stackOrder[j]];
        const yTop = yBottom + dp[faction];
        topPoints.push(`${x},${yScale(yTop)}`);
        bottomPoints.unshift(`${x},${yScale(yBottom)}`);
      }

      result[faction] = `M${topPoints.join('L')}L${bottomPoints.join('L')}Z`;
    }

    // X-axis labels (every ~10 turns)
    const step = Math.max(1, Math.ceil(turnRange / 8));
    const labels: Array<{ x: number; label: string }> = [];
    for (let t = minTurn; t <= maxTurn; t += step) {
      labels.push({ x: xScale(t), label: `T${t}` });
    }

    return { paths: result, xLabels: labels };
  }, [hasHistory, territoryHistory, plotWidth, plotHeight, padding.left, padding.top]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setStrategicDashboardOpen(false); }}
    >
      <div className="bg-panel-bg border border-panel-border rounded-lg shadow-2xl w-[640px] max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-panel-border">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              Strategic Dashboard
            </h2>
            <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest mt-0.5">
              {loadedGameState?.label ? `${loadedGameState.label}` : 'No game loaded'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStrategicDashboardOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded border border-panel-border bg-panel-bg hover:bg-panel-hover text-text-secondary transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Territory snapshot */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
              Current Territory Control (Area-Weighted)
            </h3>
            {isPlayerFaction ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: FACTION_HEX_COLORS[playerFaction] }}
                    />
                    <span className="text-xs font-mono text-text-primary">
                      {playerMilitaryLabel}: <span className="font-bold tabular-nums">{currentTerritory[playerFaction].toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-white/20" />
                    <span className="text-xs font-mono text-text-secondary">
                      Hostile-held: <span className="font-bold tabular-nums">{(100 - currentTerritory[playerFaction]).toFixed(1)}%</span>
                    </span>
                  </div>
                </div>

                <div className="flex h-5 rounded-sm overflow-hidden border border-white/10 mt-2">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${currentTerritory[playerFaction]}%`,
                      backgroundColor: FACTION_HEX_COLORS[playerFaction],
                    }}
                  />
                  <div
                    className="h-full transition-all duration-500 bg-white/10"
                    style={{ width: `${Math.max(0, 100 - currentTerritory[playerFaction])}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-text-secondary leading-snug">
                  Enemy control remains aggregated here. Exact all-faction totals belong to staff/debug surfaces, not the live player dashboard.
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  {FACTIONS.map((faction) => (
                    <div key={faction} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: FACTION_HEX_COLORS[faction] }}
                      />
                      <span className="text-xs font-mono text-text-primary">
                        {FACTION_LABEL[faction]}: <span className="font-bold tabular-nums">{currentTerritory[faction].toFixed(1)}%</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex h-5 rounded-sm overflow-hidden border border-white/10 mt-2">
                  {FACTIONS.map((faction) => (
                    <div
                      key={faction}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${currentTerritory[faction]}%`,
                        backgroundColor: FACTION_HEX_COLORS[faction],
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Territory over time */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
              Territory Over Time
            </h3>
            {hasHistory ? (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto bg-black/20 rounded border border-white/5"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = padding.top + plotHeight - (pct / 100) * plotHeight;
                  return (
                    <g key={pct}>
                      <line
                        x1={padding.left} y1={y}
                        x2={chartWidth - padding.right} y2={y}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                      />
                      <text
                        x={padding.left - 4} y={y + 3}
                        textAnchor="end" fill="rgba(255,255,255,0.3)"
                        fontSize={9} fontFamily="monospace"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Trend layers */}
                {isPlayerFaction ? (
                  <path
                    d={territoryHistory
                      .map((dp, index) => {
                        const minTurn = territoryHistory[0].turn;
                        const maxTurn = territoryHistory[territoryHistory.length - 1].turn;
                        const turnRange = Math.max(maxTurn - minTurn, 1);
                        const x = padding.left + ((dp.turn - minTurn) / turnRange) * plotWidth;
                        const y = padding.top + plotHeight - (dp[playerFaction] / 100) * plotHeight;
                        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke={FACTION_HEX_COLORS[playerFaction]}
                    strokeWidth={2}
                    strokeOpacity={0.95}
                  />
                ) : (
                  (['HRHB', 'RBiH', 'RS'] as const).map((faction) => (
                    <path
                      key={faction}
                      d={paths[faction] ?? ''}
                      fill={FACTION_HEX_COLORS[faction]}
                      fillOpacity={0.7}
                      stroke={FACTION_HEX_COLORS[faction]}
                      strokeWidth={0.5}
                      strokeOpacity={0.9}
                    />
                  ))
                )}

                {/* X-axis labels */}
                {xLabels.map((l, i) => (
                  <text
                    key={i}
                    x={l.x} y={chartHeight - 4}
                    textAnchor="middle" fill="rgba(255,255,255,0.3)"
                    fontSize={9} fontFamily="monospace"
                  >
                    {l.label}
                  </text>
                ))}
              </svg>
            ) : (
              <div className="text-center py-8 text-text-muted text-xs font-mono">
                {territoryHistory.length === 0
                  ? 'No turn history available yet. Advance a few turns to see territory trends.'
                  : 'Insufficient data points. Advance more turns to build the trend chart.'
                }
              </div>
            )}
          </div>

          {/* Cumulative casualties */}
          {casualties && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                Cumulative War Casualties
              </h3>
              {isPlayerFaction ? (
                <div className="p-2.5 bg-black/15 rounded border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: FACTION_HEX_COLORS[playerFaction] }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      {playerMilitaryLabel}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-text-primary font-bold tabular-nums">
                    {(casualties[playerFaction] ?? { kia: 0 }).kia.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-text-muted font-mono">
                    casualties across {(casualties[playerFaction] ?? { battles: 0 }).battles} engagements
                  </div>
                  <div className="mt-2 text-[10px] text-text-secondary leading-snug">
                    Enemy losses remain part of staff reporting and records, not a live exact scoreboard here.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {FACTIONS.map((faction) => {
                    const c = casualties[faction] ?? { kia: 0, battles: 0 };
                    return (
                      <div
                        key={faction}
                        className="p-2.5 bg-black/15 rounded border border-white/5"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: FACTION_HEX_COLORS[faction] }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                            {FACTION_LABEL[faction]}
                          </span>
                        </div>
                        <div className="text-sm font-mono text-text-primary font-bold tabular-nums">
                          {c.kia.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-text-muted font-mono">
                          casualties across {c.battles} engagements
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Supply snapshot */}
          {loadedGameState?.factionReserves && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                Supply Reserves
              </h3>
              {isPlayerFaction ? (
                <div className="p-2.5 bg-black/15 rounded border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: FACTION_HEX_COLORS[playerFaction] }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      {playerMilitaryLabel}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-text-primary tabular-nums">
                    General: {((loadedGameState.factionReserves as Record<string, { general_supply_reserve?: number } | undefined>)?.[playerFaction]?.general_supply_reserve ?? 0).toFixed(1)}
                  </div>
                  <div className="text-[11px] font-mono text-text-primary tabular-nums">
                    Heavy: {((loadedGameState.factionReserves as Record<string, { heavy_munitions_reserve?: number } | undefined>)?.[playerFaction]?.heavy_munitions_reserve ?? 0).toFixed(1)}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {FACTIONS.map((faction) => {
                    const reserves = (loadedGameState.factionReserves as Record<string, { general_supply_reserve?: number; heavy_munitions_reserve?: number } | undefined>)?.[faction];
                    return (
                      <div
                        key={faction}
                        className="p-2.5 bg-black/15 rounded border border-white/5"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className="w-2 h-2 rounded-sm"
                            style={{ backgroundColor: FACTION_HEX_COLORS[faction] }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                            {FACTION_LABEL[faction]}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-text-primary tabular-nums">
                          General: {reserves?.general_supply_reserve?.toFixed(1) ?? 'N/A'}
                        </div>
                        <div className="text-[11px] font-mono text-text-primary tabular-nums">
                          Heavy: {reserves?.heavy_munitions_reserve?.toFixed(1) ?? 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-panel-border bg-black/20">
          <span className="text-[9px] text-text-muted font-mono uppercase tracking-widest">
            Data from {territoryHistory.length} recorded turns
          </span>
        </div>
      </div>
    </div>
  );
});
