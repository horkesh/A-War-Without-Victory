/**
 * Player-facing copy for stance matters (posture model option 2). One owner for the
 * Command Surface card, the sector panel stance step, the inbox and Records, so the
 * wording cannot drift between surfaces. EN and BCS through i18n keys `stanceMatter.*`.
 *
 * Copy rules (panel 2026-11-12): institutional names only ("Main Staff", "Zagreb"); a
 * delayed overrule states the stance actually in force during the delay; nothing says
 * or implies the president "tried to stop" anything; OG Active Defense is "local
 * counterattacks", never independent brigade attacks.
 */

import { t, type MessageKey } from '../i18n';
import type { StanceHoldView, StanceMatterReceiptView, StanceMatterView } from './types';

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

const REASON_KEYS: Record<string, MessageKey> = {
  reorganize_critical: 'stanceMatter.reason.reorganizeCritical',
  threat_high: 'stanceMatter.reason.threatHigh',
  readiness_low: 'stanceMatter.reason.readinessLow',
  opportunity: 'stanceMatter.reason.opportunity',
  doctrine: 'stanceMatter.reason.doctrine',
  campaign_plan: 'stanceMatter.reason.campaignPlan',
  army_directive: 'stanceMatter.reason.armyDirective',
  alliance_front: 'stanceMatter.reason.allianceFront',
  patron_ceiling: 'stanceMatter.reason.patronCeiling',
  enemy_massing: 'stanceMatter.reason.enemyMassing',
  situation_eased: 'stanceMatter.reason.situationEased',
  other: 'stanceMatter.reason.other',
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

function subjectName(matter: Pick<StanceMatterView, 'scope' | 'corpsName' | 'ogName'>): string {
  return matter.scope === 'og'
    ? t('stanceMatter.subject.og', { og: matter.ogName ?? t('stanceMatter.subject.ogFallback'), corps: matter.corpsName })
    : matter.corpsName;
}

export function stanceMatterTitle(matter: StanceMatterView): string {
  return t('stanceMatter.title', {
    subject: subjectName(matter),
    from: stanceMatterStanceLabel(matter.fromStance, matter.scope),
    to: stanceMatterStanceLabel(matter.toStance, matter.scope),
  });
}

/** What happened and what silence means. */
export function stanceMatterExplanation(matter: StanceMatterView): string {
  const commander = matter.commanderName ?? t('stanceMatter.commanderFallback');
  return t('stanceMatter.explanation', {
    commander,
    subject: subjectName(matter),
    from: stanceMatterStanceLabel(matter.fromStance, matter.scope),
    to: stanceMatterStanceLabel(matter.toStance, matter.scope),
  });
}

function pressureLabel(threat: number): string {
  if (threat < 0.5) return t('stanceMatter.pressure.light');
  if (threat <= 1.5) return t('stanceMatter.pressure.moderate');
  return t('stanceMatter.pressure.heavy');
}

/** Commander's reasoning, staff assessment and the cost of overruling, as short lines. */
export function stanceMatterEvidence(matter: StanceMatterView): string[] {
  const lines: string[] = [];
  lines.push(t('stanceMatter.evidence.reason', { reason: t(REASON_KEYS[matter.reason] ?? REASON_KEYS.other!) }));
  if (matter.avgStrength !== null && matter.avgCohesion !== null) {
    lines.push(t('stanceMatter.evidence.staffCorps', {
      strength: Math.round(matter.avgStrength * 100),
      cohesion: Math.round(matter.avgCohesion),
      pressure: pressureLabel(matter.sectorThreat ?? 1),
    }));
  } else if (matter.sectorThreat !== null) {
    lines.push(t('stanceMatter.evidence.staffOg', { pressure: pressureLabel(matter.sectorThreat) }));
  }
  if (matter.patronCeiling) {
    lines.push(t('stanceMatter.evidence.patronCeiling', { stance: stanceMatterStanceLabel(matter.patronCeiling, 'corps') }));
  }
  if (!matter.countermandAllowed) {
    lines.push(t('stanceMatter.evidence.windowClosed'));
    return lines;
  }
  lines.push(t('stanceMatter.evidence.overruleCost'));
  if (matter.mainStaffDelayTurns > 0) {
    lines.push(t(matter.mainStaffDelayTurns === 1 ? 'stanceMatter.evidence.mainStaffDelay.one' : 'stanceMatter.evidence.mainStaffDelay.many', {
      weeks: matter.mainStaffDelayTurns,
      stance: stanceMatterStanceLabel(matter.toStance, matter.scope),
    }));
  }
  if (matter.patronShift !== 0) lines.push(t('stanceMatter.evidence.patronCost'));
  return lines;
}

/** The president's recorded answer, if any. */
export function stanceMatterAnswerLine(matter: StanceMatterView): string | null {
  if (matter.answer === 'confirm') return t('stanceMatter.answer.confirm');
  if (matter.answer === 'countermand') return t('stanceMatter.answer.countermand');
  if (matter.answer === 'constrain') return t('stanceMatter.answer.constrain', { constraint: stanceMatterConstraintLabel(matter.constraint) });
  return null;
}

/** A hold as the sector/corps panels show it. */
export function stanceHoldLine(hold: StanceHoldView, currentTurn: number): string {
  if (currentTurn < hold.effectiveFromTurn) {
    return t('stanceMatter.hold.pending', { weeks: hold.effectiveFromTurn - currentTurn });
  }
  if (hold.suspendedTurn !== null && hold.suspendedTurn >= currentTurn - 1) {
    return t('stanceMatter.hold.suspended');
  }
  const weeks = Math.max(1, hold.untilTurn - currentTurn + 1);
  const what = hold.mode === 'fixed'
    ? stanceMatterStanceLabel(hold.stance, hold.scope)
    : hold.scope === 'corps'
      ? t('stanceMatter.hold.atMost', { stance: stanceMatterStanceLabel(hold.stance, 'corps') })
      : hold.allowed.map((s) => stanceMatterStanceLabel(s, 'og')).join(', ');
  return t('stanceMatter.hold.active', { what, weeks });
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
    case 'not_put':
      return t('stanceMatter.receipt.notPut', { ...params, reason: t(NOT_PUT_KEYS[receipt.notPutReason ?? ''] ?? NOT_PUT_KEYS.cap!) });
    case 'hold_lapsed':
      return t('stanceMatter.receipt.holdLapsed', { ...params, reason: t(LAPSE_KEYS[receipt.lapseReason ?? ''] ?? LAPSE_KEYS.autonomy_changed!) });
    case 'answered_lapsed': return t('stanceMatter.receipt.answeredLapsed', params);
    default: return t('stanceMatter.receipt.stood', params);
  }
}
