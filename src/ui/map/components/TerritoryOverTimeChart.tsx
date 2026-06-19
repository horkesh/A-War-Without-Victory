/**
 * TerritoryOverTimeChart — territory-control-over-time stacked-area SVG chart.
 *
 * Hosted by the player-reachable "The War's Record" surface
 * (Army HQ RECORDS tab).
 *
 * Pure presentation: reads `loadedGameState.turnSummaries[].territory_snapshot`
 * from the game store and renders a stacked-area trend (or a single player-
 * faction trend line when a player faction is set). No engine/state writes.
 *
 * Determinism: the only ordering is the turn-ascending numeric sort of the
 * already-recorded turn summaries (numeric compare, no locale sort).
 */
import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { turnToDateString } from '../utils/formatters';
import { FACTION_HEX_COLORS } from '../utils/theme';

interface TerritoryDataPoint {
  turn: number;
  RS: number;
  RBiH: number;
  HRHB: number;
}

function formatTerritoryChartTickLabel(turn: number): string {
  const label = turnToDateString(turn);
  const parts = label.split(' ');
  return parts.length === 3 ? `${parts[1]} ${parts[2]}` : label;
}

export const TerritoryOverTimeChart = React.memo(function TerritoryOverTimeChart() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = loadedGameState?.player_faction;
  const isPlayerFaction = playerFaction === 'RS' || playerFaction === 'RBiH' || playerFaction === 'HRHB';

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
    for (let turn = minTurn; turn <= maxTurn; turn += step) {
      labels.push({ x: xScale(turn), label: formatTerritoryChartTickLabel(turn) });
    }

    return { paths: result, xLabels: labels };
  }, [hasHistory, territoryHistory, plotWidth, plotHeight, padding.left, padding.top]);

  return (
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
  );
});
