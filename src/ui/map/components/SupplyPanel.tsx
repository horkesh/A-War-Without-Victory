/**
 * SupplyPanel — shown when supply map mode is active.
 * Displays per-faction reserve bars (general supply + heavy munitions)
 * and corridor/isolation summary derived from faction supply pressure.
 */
import type { LoadedGameState } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { t } from '../i18n';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;
type MilitaryFactionId = typeof FACTIONS[number];

interface SupplyPanelProps {
  state: LoadedGameState;
}

function ReserveBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor =
    pct >= 50 ? 'bg-green-500' :
    pct >= 20 ? 'bg-yellow-400' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`w-[42px] shrink-0 text-[10px] ${color}`}>{label}</span>
      <div className="relative flex-1 h-1.5 bg-panel-border/40 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-text-secondary">{Math.round(pct)}</span>
    </div>
  );
}

function isMilitaryFactionId(value: unknown): value is MilitaryFactionId {
  return value === 'RS' || value === 'RBiH' || value === 'HRHB';
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function SupplyPanel({ state }: SupplyPanelProps) {
  const reserves = state.factionReserves;
  const supplySummary = state.supplySummaryByFaction ?? {};
  const pressure = state.warPhaseSupplyPressure ?? {};
  const condition = state.warPhaseSupplyCondition ?? {};
  const playerFaction = state.player_faction;
  const isPlayerFaction = isMilitaryFactionId(playerFaction);

  const visibleSummaries = Object.entries(supplySummary)
    .filter(([factionId]) => !isPlayerFaction || factionId === playerFaction)
    .sort(([a], [b]) => strictCompare(a, b));
  const visibleStateTotals = visibleSummaries.reduce((acc, [, summary]) => ({
    adequate: acc.adequate + summary.adequate_count,
    strained: acc.strained + summary.strained_count,
    critical: acc.critical + summary.critical_count,
  }), { adequate: 0, strained: 0, critical: 0 });
  let corridorTotals = visibleSummaries.reduce((acc, [, summary]) => ({
    open: acc.open + summary.corridor_open_count,
    brittle: acc.brittle + summary.corridor_brittle_count,
    cut: acc.cut + summary.corridor_cut_count,
  }), { open: 0, brittle: 0, cut: 0 });
  if (visibleSummaries.length === 0) {
    const legacyFactionIds = isPlayerFaction
      ? [playerFaction].filter((factionId) => pressure[factionId] != null || condition[factionId] != null)
      : Array.from(new Set([...Object.keys(pressure), ...Object.keys(condition)]))
        .filter(isMilitaryFactionId)
        .sort();
    corridorTotals = legacyFactionIds.reduce((acc, factionId) => {
      const live = condition[factionId];
      const legacy = pressure[factionId];
      const score = typeof live === 'number' && Number.isFinite(live) ? live : 100 - (typeof legacy === 'number' && Number.isFinite(legacy) ? legacy : 0);
      if (score >= 80) acc.open++;
      else if (score >= 50) acc.brittle++;
      else acc.cut++;
      return acc;
    }, { open: 0, brittle: 0, cut: 0 });
  }

  return (
    <div
      data-testid="supply-logistics-panel"
      className="absolute z-20 rounded border border-panel-border bg-panel-card/95 backdrop-blur-sm p-2.5 space-y-2 text-xs font-mono"
      style={{ bottom: '36px', left: 'calc(15.5rem + 12px)', minWidth: '200px', direction: 'ltr' }}
    >
      <div className="font-sans text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
        {t('supply.logistics')}
      </div>

      {/* Reserve bars */}
      {reserves ? (
        <div className="space-y-2">
          {(isPlayerFaction ? [playerFaction] : FACTIONS).map((faction) => {
            const r = reserves[faction];
            const color = FACTION_COLORS[faction] ?? 'text-text-primary';
            return (
              <div key={faction} className="space-y-0.5">
                <span className={`text-[10px] font-semibold ${color}`}>{getPlayerSafeMilitaryFactionName(faction, faction)}</span>
                <ReserveBar label={t('economy.supply')} value={r?.generalSupply ?? 0} color="text-text-secondary" />
                <ReserveBar label={t('economy.ammo')} value={r?.heavyMunitions ?? 0} color="text-text-secondary" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-text-secondary text-[10px] italic">{t('supply.reservesDisabled')}</div>
      )}

      {/* Corridor summary */}
      <div className="border-t border-panel-border/50 pt-1.5 text-[10px] text-text-secondary space-y-1">
        {visibleSummaries.length > 0 && (
          <div className="flex gap-2">
            <span className="text-green-400">{t('supply.stateAdequateCount', { count: visibleStateTotals.adequate })}</span>
            <span className="text-yellow-400">{t('supply.stateStrainedCount', { count: visibleStateTotals.strained })}</span>
            <span className="text-red-400">{t('supply.stateCriticalCount', { count: visibleStateTotals.critical })}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="text-green-400">{t('supply.corridorOpenCount', { count: corridorTotals.open })}</span>
          <span className="text-yellow-400">{t('supply.corridorStrainedCount', { count: corridorTotals.brittle })}</span>
          <span className="text-red-400">{t('supply.corridorCutCount', { count: corridorTotals.cut })}</span>
        </div>
      </div>
    </div>
  );
}
