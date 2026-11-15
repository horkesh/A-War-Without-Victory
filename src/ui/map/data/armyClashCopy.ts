// Command loop L7: the few army-clash strings the map entry chunk needs (card title, summary,
// inbox subtitle). The facts and the three answers render in the lazily loaded
// ArmyClashActions, which keeps detail copy out of the entry chunk.
import { t } from '../i18n';
import type { ArmyClashView } from './types';
import { getOsidDisplayName } from '../utils/osidDisplayName';

/** "halt Operation Vozuća", "an operation toward Doboj", "withholding the 2nd Corps plan", ... */
export function armyClashOrderPhrase(clash: ArmyClashView, osidNameMap: Record<string, string> | null = null): string {
  switch (clash.act) {
    case 'stop_op':
      return t('clash.order.stopOp', { operation: clash.orderName ?? t('clash.order.theOperation') });
    case 'request_op':
      return t('clash.order.requestOp', { place: getOsidDisplayName(clash.orderRef, osidNameMap) });
    case 'withhold_plan':
      return t('clash.order.withholdPlan', { corps: clash.corpsName });
    case 'decline_opportunity':
      return t('clash.order.declineOpportunity', { operation: clash.orderName ?? t('clash.order.theOperation') });
  }
}

/** "Delić objects to: halt Operation Vozuća". */
export function armyClashTitle(clash: ArmyClashView, osidNameMap: Record<string, string> | null = null): string {
  return t('clash.title', {
    officer: clash.armyCommanderName ?? t('clash.armyCommanderFallback'),
    order: armyClashOrderPhrase(clash, osidNameMap),
  });
}

/** One line for the card and rail: what happens if he does not answer (the facts carry the rest). */
export function armyClashSummary(clash: ArmyClashView): string {
  return t('clash.summary', { corps: clash.corpsName });
}
