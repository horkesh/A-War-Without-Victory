/**
 * Command loop L6 (2026-11-14): visible Authority regeneration.
 *
 * Next week's income is read from the last weekly recovery the engine recorded
 * (`command_authority.last_recovery_breakdown`, live campaigns only; `last_recovery` as a
 * fallback). The income model is unchanged (base, political standing, quiet-front
 * dividend, intervention penalty); this only shows it where Authority is spent: the
 * Desk header and every priced directive ("You have 34 · +4 next week").
 *
 * Canonical owner: src/ui/map/utils/authorityIncome.ts
 */
import type { LoadedGameState } from '../data/types';
import { t } from '../i18n';

type CommandAuthorityView = NonNullable<LoadedGameState['commandAuthority']>;

export interface NextWeekIncome {
  amount: number;
  /** Localized, non-zero sources in fixed order: base, political standing, quiet front, interventions. */
  sources: string[];
}

/** Authority amounts are quarter points; show them without trailing zeros. */
export function formatAuthorityAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function signed(value: number): string {
  return value > 0 ? `+${formatAuthorityAmount(value)}` : `−${formatAuthorityAmount(Math.abs(value))}`;
}

export function nextWeekIncome(ca: CommandAuthorityView | undefined | null): NextWeekIncome | null {
  if (!ca) return null;
  const breakdown = ca.lastRecoveryBreakdown;
  const amount = breakdown?.recovery ?? ca.lastRecovery;
  if (amount === undefined || !(amount > 0)) return null;
  const sources: string[] = [];
  if (breakdown) {
    sources.push(t('authority.source.base', { value: formatAuthorityAmount(breakdown.base) }));
    if (breakdown.politicalBonus !== 0) sources.push(t('authority.source.political', { value: signed(breakdown.politicalBonus) }));
    if (breakdown.quietFrontDividend > 0) sources.push(t('authority.source.quietFront', { value: signed(breakdown.quietFrontDividend) }));
    if (breakdown.frictionPenalty > 0) sources.push(t('authority.source.interventions', { value: signed(-breakdown.frictionPenalty) }));
  }
  return { amount, sources };
}
