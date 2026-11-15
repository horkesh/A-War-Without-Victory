/**
 * Stance-matter DETAIL copy (posture model option 2): the commander's reasoning, the staff
 * assessment, the cost of an overrule, the president's recorded answer, hold lines and the
 * sector stance step. Loaded only by the lazily imported StanceMatterActions and
 * SectorStanceStep, so none of it ships in the map entry chunk (which sits at its 3,000 kB
 * limit). The entry keeps only what lists and Records need: stance labels, the matter title,
 * a one-line card summary and the receipt lines (stanceMatterCopy.ts, i18n `stanceMatter.*`).
 *
 * EN and BCS live here as two dictionaries with the same keys; `tests/ui/stance_matter_surfaces`
 * pins that both are complete. Copy rules (panel 2026-11-12): institutional names only ("Main
 * Staff", "Zagreb"); a delayed overrule states the stance in force; nothing says or implies the
 * president "tried to stop" anything; OG Active Defense is "local counterattacks".
 */

import { getActiveLocale } from '../i18n';
import { stanceMatterConstraintLabel, stanceMatterStanceLabel, stanceMatterSubject } from './stanceMatterCopy';
import type { StanceHoldView, StanceMatterView } from './types';

export const STANCE_MATTER_DETAIL_EN = {
  explanation: '{commander} has moved {subject} from {from} to {to}. The change is already in force and stands unless you answer before you advance the turn.',
  commanderFallback: 'The commander',
  'pressure.light': 'light',
  'pressure.moderate': 'moderate',
  'pressure.heavy': 'heavy',
  'evidence.reason': "Commander's reasoning: {reason}",
  'evidence.staffCorps': 'Staff assessment: brigades at {strength}% strength, average cohesion {cohesion}, enemy pressure {pressure}.',
  'evidence.staffOg': 'Staff assessment: enemy pressure on this OG is {pressure}.',
  'evidence.patronCeiling': "Zagreb's directive limits this corps to {stance}.",
  'evidence.windowClosed': 'You overruled this commander less than eight weeks ago. You can confirm this change, but you cannot overrule him again yet.',
  'evidence.overruleCost': 'If you countermand or constrain him, the commander records it against you, and you cannot overrule him again for eight weeks. Your order holds for four weeks.',
  'evidence.mainStaffDelay.one': 'Main Staff: an overrule takes effect one week late. {stance} holds until then.',
  'evidence.mainStaffDelay.many': 'Main Staff: an overrule takes effect {weeks} weeks late. {stance} holds until then.',
  'evidence.patronCost': "Overruling a corps under Zagreb's directive strains relations with Zagreb.",
  'reason.reorganizeCritical': 'His brigades are worn out. He is taking the corps out of the fight to rebuild.',
  'reason.threatHigh': 'Enemy pressure on his front is heavy, and he wants to hold what he has.',
  'reason.readinessLow': 'He has no force fit to attack with, so he is keeping the corps on the defensive.',
  'reason.opportunity': 'His brigades are fit and he sees a chance to attack.',
  'reason.doctrine': "This follows the army's doctrine for this stage of the war.",
  'reason.campaignPlan': "This follows the army's campaign plan for his front.",
  'reason.armyDirective': 'This follows the latest army directive for his corps.',
  'reason.allianceFront': 'He is setting the corps for the front with the former ally.',
  'reason.patronCeiling': "Zagreb's directive limits how far this corps may go.",
  'reason.ceasefire': 'The ceasefire is in force, so he is holding the corps on the defensive.',
  'reason.enemyMassing': 'The enemy is massing opposite this OG. He wants active patrols and local counterattacks.',
  'reason.situationEased': 'Pressure on this OG has eased, and he is going back to a plain defense.',
  'reason.other': 'He gave no further reason.',
  'answer.confirm': 'You confirmed the change.',
  'answer.countermand': 'You countermanded the change. Your order goes out when you advance the turn.',
  'answer.constrain': 'You constrained the change: {constraint}. Your order goes out when you advance the turn.',
  'hold.pending': "Your order is still with the Main Staff. The commander's stance holds until it takes effect.",
  'hold.suspended': 'Your order is suspended this week because an operation is running here.',
  'hold.atMost': 'at most {stance}',
  'hold.active': '{what} by your order. Weeks left: {weeks}.',
  'step.whoSets': "The OG's commanders set its stance. A change comes to you as a matter on the Command Surface, and it stands unless you answer.",
  'step.holdOg': 'This OG: {line}',
  'step.holdCorps': 'Corps: {line}',
  'step.noMatter': 'No stance change is waiting for you here.',
  sent: 'Your answer is recorded.',
  'button.confirm': 'Confirm',
  'button.countermand': 'Countermand',
  'button.constrain': 'Constrain',
  constrainHeading: 'Choose a limit',
  bridgeUnavailable: 'Answers can be sent only in the desktop game.',
} as const;

export type StanceMatterDetailKey = keyof typeof STANCE_MATTER_DETAIL_EN;

export const STANCE_MATTER_DETAIL_BCS: Record<StanceMatterDetailKey, string> = {
  explanation: '{commander} je prebacio {subject} iz stava {from} u {to}. Promjena je već na snazi i ostaje ako ne odgovorite prije nego što završite potez.',
  commanderFallback: 'Komandant',
  'pressure.light': 'slab',
  'pressure.moderate': 'umjeren',
  'pressure.heavy': 'jak',
  'evidence.reason': 'Obrazloženje komandanta: {reason}',
  'evidence.staffCorps': 'Procjena štaba: brigade na {strength}% jačine, prosječna kohezija {cohesion}, neprijateljski pritisak {pressure}.',
  'evidence.staffOg': 'Procjena štaba: neprijateljski pritisak na ovu OG je {pressure}.',
  'evidence.patronCeiling': 'Direktiva iz Zagreba ograničava ovaj korpus na {stance}.',
  'evidence.windowClosed': 'Ovog komandanta ste preglasali prije manje od osam sedmica. Promjenu možete potvrditi, ali ga još ne možete ponovo preglasati.',
  'evidence.overruleCost': 'Ako ga opozovete ili ograničite, komandant će vam to zapamtiti i osam sedmica ga ne možete ponovo preglasati. Vaše naređenje važi četiri sedmice.',
  'evidence.mainStaffDelay.one': 'Glavni štab: preglasavanje stupa na snagu sedmicu kasnije. Do tada ostaje {stance}.',
  'evidence.mainStaffDelay.many': 'Glavni štab: preglasavanje stupa na snagu {weeks} sedmice kasnije. Do tada ostaje {stance}.',
  'evidence.patronCost': 'Preglasavanje korpusa pod direktivom iz Zagreba opterećuje odnose sa Zagrebom.',
  'reason.reorganizeCritical': 'Njegove brigade su iscrpljene. Izvlači korpus iz borbe da se obnovi.',
  'reason.threatHigh': 'Neprijateljski pritisak na njegovom frontu je jak i želi zadržati ono što drži.',
  'reason.readinessLow': 'Nema snage sposobne za napad, pa drži korpus u odbrani.',
  'reason.opportunity': 'Njegove brigade su spremne i vidi priliku za napad.',
  'reason.doctrine': 'Ovo slijedi doktrinu armije za ovu fazu rata.',
  'reason.campaignPlan': 'Ovo slijedi plan kampanje armije za njegov front.',
  'reason.armyDirective': 'Ovo slijedi posljednju direktivu armije za njegov korpus.',
  'reason.allianceFront': 'Postavlja korpus za front prema bivšem savezniku.',
  'reason.patronCeiling': 'Direktiva iz Zagreba ograničava koliko daleko ovaj korpus smije ići.',
  'reason.ceasefire': 'Primirje je na snazi, pa drži korpus u odbrani.',
  'reason.enemyMassing': 'Neprijatelj se gomila naspram ove OG. Želi aktivne patrole i lokalne protivnapade.',
  'reason.situationEased': 'Pritisak na ovu OG je popustio i vraća se običnoj odbrani.',
  'reason.other': 'Nije naveo drugi razlog.',
  'answer.confirm': 'Potvrdili ste promjenu.',
  'answer.countermand': 'Opozvali ste promjenu. Vaše naređenje odlazi kada završite potez.',
  'answer.constrain': 'Ograničili ste promjenu: {constraint}. Vaše naređenje odlazi kada završite potez.',
  'hold.pending': 'Vaše naređenje je još u Glavnom štabu. Stav komandanta ostaje dok naređenje ne stupi na snagu.',
  'hold.suspended': 'Vaše naređenje je ove sedmice obustavljeno jer se ovdje vodi operacija.',
  'hold.atMost': 'najviše {stance}',
  'hold.active': '{what} po vašem naređenju. Preostalo sedmica: {weeks}.',
  'step.whoSets': 'Stav OG određuju njeni komandanti. Promjena vam stiže kao pitanje na Komandnoj ploči i ostaje ako ne odgovorite.',
  'step.holdOg': 'Ova OG: {line}',
  'step.holdCorps': 'Korpus: {line}',
  'step.noMatter': 'Ovdje vas ne čeka nijedna promjena stava.',
  sent: 'Vaš odgovor je zabilježen.',
  'button.confirm': 'Potvrdi',
  'button.countermand': 'Opozovi',
  'button.constrain': 'Ograniči',
  constrainHeading: 'Izaberite ograničenje',
  bridgeUnavailable: 'Odgovori se mogu slati samo u desktop igri.',
};

/** Detail text in the active locale, with `{name}` parameters filled in. */
export function stanceDetailText(key: StanceMatterDetailKey, params: Record<string, string | number> = {}): string {
  const table = getActiveLocale() === 'bcs' ? STANCE_MATTER_DETAIL_BCS : STANCE_MATTER_DETAIL_EN;
  const template: string = table[key] ?? STANCE_MATTER_DETAIL_EN[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

const REASON_KEYS: Record<string, StanceMatterDetailKey> = {
  reorganize_critical: 'reason.reorganizeCritical',
  threat_high: 'reason.threatHigh',
  readiness_low: 'reason.readinessLow',
  opportunity: 'reason.opportunity',
  doctrine: 'reason.doctrine',
  campaign_plan: 'reason.campaignPlan',
  army_directive: 'reason.armyDirective',
  alliance_front: 'reason.allianceFront',
  patron_ceiling: 'reason.patronCeiling',
  ceasefire: 'reason.ceasefire',
  enemy_massing: 'reason.enemyMassing',
  situation_eased: 'reason.situationEased',
  other: 'reason.other',
};

/** What happened and what silence means. */
export function stanceMatterExplanation(matter: StanceMatterView): string {
  return stanceDetailText('explanation', {
    commander: matter.commanderName ?? stanceDetailText('commanderFallback'),
    subject: stanceMatterSubject(matter),
    from: stanceMatterStanceLabel(matter.fromStance, matter.scope),
    to: stanceMatterStanceLabel(matter.toStance, matter.scope),
  });
}

function pressureLabel(threat: number): string {
  if (threat < 0.5) return stanceDetailText('pressure.light');
  if (threat <= 1.5) return stanceDetailText('pressure.moderate');
  return stanceDetailText('pressure.heavy');
}

/** Commander's reasoning, staff assessment and the cost of overruling, as short lines. */
export function stanceMatterEvidence(matter: StanceMatterView): string[] {
  const lines: string[] = [];
  lines.push(stanceDetailText('evidence.reason', { reason: stanceDetailText(REASON_KEYS[matter.reason] ?? 'reason.other') }));
  if (matter.avgStrength !== null && matter.avgCohesion !== null) {
    lines.push(stanceDetailText('evidence.staffCorps', {
      strength: Math.round(matter.avgStrength * 100),
      cohesion: Math.round(matter.avgCohesion),
      pressure: pressureLabel(matter.sectorThreat ?? 1),
    }));
  } else if (matter.sectorThreat !== null) {
    lines.push(stanceDetailText('evidence.staffOg', { pressure: pressureLabel(matter.sectorThreat) }));
  }
  if (matter.patronCeiling) {
    lines.push(stanceDetailText('evidence.patronCeiling', { stance: stanceMatterStanceLabel(matter.patronCeiling, 'corps') }));
  }
  if (!matter.countermandAllowed) {
    lines.push(stanceDetailText('evidence.windowClosed'));
    return lines;
  }
  lines.push(stanceDetailText('evidence.overruleCost'));
  if (matter.mainStaffDelayTurns > 0) {
    lines.push(stanceDetailText(matter.mainStaffDelayTurns === 1 ? 'evidence.mainStaffDelay.one' : 'evidence.mainStaffDelay.many', {
      weeks: matter.mainStaffDelayTurns,
      stance: stanceMatterStanceLabel(matter.toStance, matter.scope),
    }));
  }
  if (matter.patronShift !== 0) lines.push(stanceDetailText('evidence.patronCost'));
  return lines;
}

/** The president's recorded answer, if any. */
export function stanceMatterAnswerLine(matter: StanceMatterView): string | null {
  if (matter.answer === 'confirm') return stanceDetailText('answer.confirm');
  if (matter.answer === 'countermand') return stanceDetailText('answer.countermand');
  if (matter.answer === 'constrain') return stanceDetailText('answer.constrain', { constraint: stanceMatterConstraintLabel(matter.constraint) });
  return null;
}

/** A hold as the sector/corps panels show it. */
export function stanceHoldLine(hold: StanceHoldView, currentTurn: number): string {
  if (currentTurn < hold.effectiveFromTurn) return stanceDetailText('hold.pending');
  if (hold.suspendedTurn !== null && hold.suspendedTurn >= currentTurn - 1) return stanceDetailText('hold.suspended');
  const weeks = Math.max(1, hold.untilTurn - currentTurn + 1);
  const what = hold.mode === 'fixed'
    ? stanceMatterStanceLabel(hold.stance, hold.scope)
    : hold.scope === 'corps'
      ? stanceDetailText('hold.atMost', { stance: stanceMatterStanceLabel(hold.stance, 'corps') })
      : hold.allowed.map((s) => stanceMatterStanceLabel(s, 'og')).join(', ');
  return stanceDetailText('hold.active', { what, weeks });
}
