/**
 * Player-facing copy for stance matters (posture model option 2), entry-chunk core: what lists
 * and Records need, so the wording cannot drift between the Command Surface card, the inbox
 * and Records. The commander's reasoning, staff assessment, overrule costs, answer and hold
 * lines and the sector stance step live in `stanceMatterDetail.ts`, which only the lazily
 * loaded StanceMatterActions / SectorStanceStep import (the map entry chunk is at its limit).
 *
 * Copy rules (panel 2026-11-12): institutional names only ("Main Staff", "Zagreb"); a
 * delayed overrule states the stance actually in force during the delay; nothing says or
 * implies the president "tried to stop" anything; OG Active Defense is "local
 * counterattacks", never independent brigade attacks.
 */

import { t, type MessageKey } from '../i18n';
import type { StanceMatterReceiptView, StanceMatterView } from './types';
import { turnToDateString } from '../utils/formatters';

const CORPS_STANCE_KEYS: Record<string, MessageKey> = {
  offensive: 'corpsCard.stance.offensive',
  balanced: 'corpsCard.stance.balanced',
  defensive: 'corpsCard.stance.defensive',
  reorganize: 'corpsCard.stance.reorganize',
};

const OG_STANCE_KEYS: Record<string, MessageKey> = {
  fortify: 'stanceMatter.ogStance.fortify',
  defend: 'stanceMatter.ogStance.defend',
  elastic: 'stanceMatter.ogStance.elastic',
  active_defense: 'stanceMatter.ogStance.activeDefense',
  screening: 'stanceMatter.ogStance.screening',
};

const CONSTRAINT_KEYS: Record<string, MessageKey> = {
  ceiling_balanced: 'stanceMatter.constraint.ceilingBalanced',
  ceiling_defensive: 'stanceMatter.constraint.ceilingDefensive',
  no_active_defense: 'stanceMatter.constraint.noActiveDefense',
  hold_no_counterattacks: 'stanceMatter.constraint.holdNoCounterattacks',
};

/** Stance label for either echelon; unknown values read as "unreported". */
export function stanceMatterStanceLabel(stance: string | null | undefined, scope: 'corps' | 'og'): string {
  const key = (scope === 'og' ? OG_STANCE_KEYS : CORPS_STANCE_KEYS)[stance ?? ''];
  return key ? t(key) : t('corpsCard.stance.unreported');
}

export function stanceMatterConstraintLabel(constraint: string | null | undefined): string {
  const key = CONSTRAINT_KEYS[constraint ?? ''];
  return key ? t(key) : '';
}

/** "1st Corps" or "OG Majevica (1st Corps)". */
export function stanceMatterSubject(matter: Pick<StanceMatterView, 'scope' | 'corpsName' | 'ogName'>): string {
  return matter.scope === 'og'
    ? t('stanceMatter.subject.og', { og: matter.ogName ?? t('stanceMatter.subject.ogFallback'), corps: matter.corpsName })
    : matter.corpsName;
}

export function stanceMatterTitle(matter: StanceMatterView): string {
  return t('stanceMatter.title', {
    subject: stanceMatterSubject(matter),
    from: stanceMatterStanceLabel(matter.fromStance, matter.scope),
    to: stanceMatterStanceLabel(matter.toStance, matter.scope),
  });
}

/** One line for list views: the change is in force and stands unless answered. */
export function stanceMatterSummary(matter: StanceMatterView): string {
  return matter.answer ? t('stanceMatter.summaryAnswered') : t('stanceMatter.summary');
}

const NOT_PUT_KEYS: Record<string, MessageKey> = {
  cap: 'stanceMatter.notPut.cap',
  cooldown: 'stanceMatter.notPut.cooldown',
  held: 'stanceMatter.notPut.held',
  army_stance: 'stanceMatter.notPut.armyStance',
};

const LAPSE_KEYS: Record<string, MessageKey> = {
  og_dissolved: 'stanceMatter.lapse.ogDissolved',
  presidential_operation: 'stanceMatter.lapse.presidentialOperation',
  autonomy_changed: 'stanceMatter.lapse.autonomyChanged',
};

/** One Records line per receipt. */
export function stanceMatterReceiptLine(receipt: StanceMatterReceiptView): string {
  const scope = receipt.scope;
  const params = {
    subject: receipt.corpsName,
    from: stanceMatterStanceLabel(receipt.fromStance, scope),
    to: stanceMatterStanceLabel(receipt.toStance, scope),
    weeks: receipt.untilTurn !== null && receipt.effectiveFromTurn !== null
      ? receipt.untilTurn - receipt.effectiveFromTurn + 1
      : 0,
    constraint: stanceMatterConstraintLabel(receipt.constraint),
    // A delayed order is written as pending: it takes effect on this date (Codex #580).
    date: receipt.effectiveFromTurn !== null ? turnToDateString(receipt.effectiveFromTurn) : '',
    until: receipt.untilTurn !== null ? turnToDateString(receipt.untilTurn) : '',
  };
  switch (receipt.outcome) {
    case 'stood': return t('stanceMatter.receipt.stood', params);
    case 'confirmed': return t('stanceMatter.receipt.confirmed', params);
    case 'countermanded':
      return receipt.mainStaffDelayTurns > 0
        ? t('stanceMatter.receipt.countermandedDelayed', params)
        : t('stanceMatter.receipt.countermanded', params);
    case 'constrained':
      return receipt.mainStaffDelayTurns > 0
        ? t('stanceMatter.receipt.constrainedDelayed', params)
        : t('stanceMatter.receipt.constrained', params);
    case 'not_put': {
      const reason = t(NOT_PUT_KEYS[receipt.notPutReason ?? ''] ?? NOT_PUT_KEYS.cap!);
      return receipt.notPutCount > 1
        ? t(receipt.scope === 'og' ? 'stanceMatter.receipt.notPutManyOg' : 'stanceMatter.receipt.notPutMany', { subject: receipt.corpsName, count: receipt.notPutCount, reason })
        : t('stanceMatter.receipt.notPut', { ...params, reason });
    }
    case 'hold_lapsed':
      // A lapse receipt carries the hold's first turn: resolved before it means it never took effect.
      return t(receipt.resolvedTurn < receipt.turn ? 'stanceMatter.receipt.holdLapsedPending' : 'stanceMatter.receipt.holdLapsed', { ...params, reason: t(LAPSE_KEYS[receipt.lapseReason ?? ''] ?? LAPSE_KEYS.autonomy_changed!) });
    case 'answered_lapsed': return t('stanceMatter.receipt.answeredLapsed', params);
    case 'hold_in_force':
      return receipt.constraint
        ? t('stanceMatter.receipt.inForceConstrained', params)
        : t('stanceMatter.receipt.inForceCountermanded', params);
    default: return t('stanceMatter.receipt.stood', params);
  }
}
