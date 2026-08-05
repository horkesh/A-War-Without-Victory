/**
 * DeskAuthorityHeader — the "Authority & Directives" band on the Presidential Desk.
 *
 * Command-surface design (docs/plans/2026-06-01-presidential-command-surface-design.md §2):
 * the Desk is the "home of agency". This band ties the player's spendable currency
 * (Command Authority) to the levers it buys, so the cost of action is legible where
 * action is taken.
 *
 * Pure presentation, faction-agnostic:
 *  - Reads the current CA balance straight off `state.commandAuthority` (the same
 *    adapter-owned view-model the PresidentialToolbar gauge reads — current/max/
 *    spentThisTurn). No new CA source is invented.
 *  - Renders the lever-cost legend from the canonical constants in
 *    utils/commandAuthority.ts (never hardcoded numbers).
 *  - A low-CA cue appears when the balance cannot afford the cheapest override lever.
 *
 * The per-turn directive *count* is intentionally NOT shown: there is no clean,
 * non-fragile source for "directives issued this turn" without invoking the
 * Decision-Room view-model builder (owned elsewhere). Instead the band surfaces
 * `spentThisTurn` from the same CA object — a real engine-backed signal that moves
 * one-for-one with every directive issued.
 */
import type { LoadedGameState } from '../../data/types';
import { isPresidentialCadenceHold } from '../../data/presidentialCadenceHold';
import { deriveInboxItems } from '../../data/inboxItems';
import { t } from '../../i18n';
import {
  AUTHOR_OP_COST,
  REQUEST_OP_COST,
  STOP_OP_COST,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  ELITE_DEPLOY_COST,
  REPLACE_CO_COST,
  FRONT_VISIT_COST,
} from '../../utils/commandAuthority';

interface LeverCost {
  /** i18n key for the lever label. */
  labelKey: Parameters<typeof t>[0];
  /** CA cost, sourced from the canonical constant. */
  cost: number;
}

/**
 * The strategic levers and their CA costs, ordered cheapest-first so the legend
 * reads as a price ladder. Costs come from utils/commandAuthority.ts constants.
 */
const LEVER_COSTS: LeverCost[] = [
  { labelKey: 'deskAuthority.lever.frontVisit', cost: FRONT_VISIT_COST },
  { labelKey: 'deskAuthority.lever.forceLaunch', cost: FORCE_LAUNCH_COST },
  { labelKey: 'deskAuthority.lever.authorOp', cost: AUTHOR_OP_COST },
  { labelKey: 'deskAuthority.lever.requestOp', cost: REQUEST_OP_COST },
  { labelKey: 'deskAuthority.lever.stopOp', cost: STOP_OP_COST },
  { labelKey: 'deskAuthority.lever.proactiveForceLaunch', cost: PROACTIVE_FORCE_LAUNCH_COST },
  { labelKey: 'deskAuthority.lever.eliteDeploy', cost: ELITE_DEPLOY_COST },
  { labelKey: 'deskAuthority.lever.replaceCo', cost: REPLACE_CO_COST },
];

/** Cheapest lever cost — the threshold below which the player can do nothing. */
const MIN_LEVER_COST = Math.min(...LEVER_COSTS.map((l) => l.cost));

function sourceLabelKey(source: string | undefined): Parameters<typeof t>[0] {
  switch (source) {
    case 'international_standing':
      return 'deskAuthority.source.internationalStanding';
    case 'patron_confidence':
      return 'deskAuthority.source.patronConfidence';
    case 'internal_cohesion':
      return 'deskAuthority.source.internalCohesion';
    case 'quiet_front_restraint':
      return 'deskAuthority.source.quietFront';
    default:
      return 'deskAuthority.source.baseRecovery';
  }
}

export interface DeskAuthorityHeaderProps {
  state: LoadedGameState | null;
}

export function DeskAuthorityHeader({ state }: DeskAuthorityHeaderProps) {
  const ca = state?.commandAuthority;
  // The band is only meaningful with a CA-bearing state (player campaigns). When
  // CA is absent (e.g. headless/legacy saves) the desk omits the band entirely.
  if (!ca) return null;

  const { current, max, spentThisTurn } = ca;
  const reserve = ca.reserve ?? 0;
  const reserveMax = ca.reserveMax ?? 0;
  const lastRecovery = ca.lastRecovery ?? 0;
  const directiveCadence = lastRecovery > 0 ? Math.max(1, Math.ceil(REQUEST_OP_COST / lastRecovery)) : null;
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
  const lowAuthority = current < MIN_LEVER_COST;
  const atCapacity = max > 0 && current >= max;
  const nearCapacityQuiet = isPresidentialCadenceHold(state, deriveInboxItems(state, null));

  const gaugeColor = pct >= 60 ? 'bg-emerald-400/70' : pct >= 30 ? 'bg-amber-400/70' : 'bg-red-400/70';
  const valueColor = pct >= 60 ? 'text-emerald-300' : pct >= 30 ? 'text-amber-300' : 'text-red-300';

  return (
    <section
      data-testid="desk-authority-header"
      aria-label={t('deskAuthority.title')}
      className="pointer-events-auto border border-panel-border/80 bg-[#11141b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.46)]"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-panel-border/70 pb-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-gold">
            {t('deskAuthority.title')}
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">{t('deskAuthority.subtitle')}</div>
        </div>
      </div>

      {/* Current Command Authority — compact gauge + value. */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
            {t('deskAuthority.caLabel')}
          </span>
          <span
            data-testid="desk-authority-ca-value"
            className={`text-[14px] font-bold tabular-nums ${valueColor}`}
          >
            {t('deskAuthority.caValue', { current, max })}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className={`h-full ${gaugeColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
          <span data-testid="desk-authority-spent">{t('deskAuthority.spentThisTurn', { spent: spentThisTurn })}</span>
          <span data-testid="desk-authority-bank">{t('deskAuthority.bank', { reserve, max: reserveMax })}</span>
        </div>
        <div className="mt-1 grid grid-cols-1 gap-0.5 text-xs text-text-secondary">
          <span data-testid="desk-authority-income-source">
            {t('deskAuthority.incomeSource', { source: t(sourceLabelKey(ca.lastRecoverySource)) })}
          </span>
          {directiveCadence != null && (
            <span data-testid="desk-authority-cadence">
              {t('deskAuthority.cadence', { turns: directiveCadence })}
            </span>
          )}
        </div>
        {lowAuthority && (
          <div
            data-testid="desk-authority-low-cue"
            className="mt-2 border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200"
          >
            {t('deskAuthority.lowHint')}
          </div>
        )}
        {nearCapacityQuiet && (
          <div
            role="note"
            data-testid="desk-authority-cadence-hold"
            className="mt-2 border border-sky-300/30 bg-sky-500/10 px-2 py-1.5 text-xs leading-relaxed text-sky-100"
          >
            {t('deskAuthority.cadenceHold')}
          </div>
        )}
        {atCapacity && (
          <div
            data-testid="desk-authority-capacity-cue"
            className="mt-2 border border-emerald-300/30 bg-emerald-500/10 px-2 py-1.5 text-xs leading-relaxed text-emerald-100"
          >
            {t('deskAuthority.capacityHint')}
          </div>
        )}
      </div>

      {/* Lever cost legend — names + CA costs from the canonical constants. */}
      <div className="mt-3">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
          {t('deskAuthority.legendHeading')}
        </div>
        <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {LEVER_COSTS.map(({ labelKey, cost }) => {
            const affordable = current >= cost;
            return (
              <li
                key={labelKey}
                data-testid="desk-authority-lever"
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className={affordable ? 'text-text-secondary' : 'text-text-muted/60'}>
                  {t(labelKey)}
                </span>
                <span
                  className={`shrink-0 font-mono font-bold tabular-nums ${affordable ? 'text-accent-gold' : 'text-red-300/70'}`}
                >
                  {t('deskAuthority.costSuffix', { cost })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
