'use strict';

/**
 * Shared semantic boundary for direct Ring-3 player choices.
 *
 * The checks are deliberately limited to player-facing response-option prose.
 * Contextual historical narration, provenance notes, and future guard text are
 * not inputs. The exact paramilitary-policy surface remains the sole canon
 * exception under Sensitive History Design Gate section 3.
 */

const CANON_ALLOWED_PARAMILITARY_CHOICES = new Map([
  ['rbih_paramilitary_policy_1992', Object.freeze({
    family: 'rbih_paramilitary_policy',
    labels: Object.freeze({
      always_allow: 'Authorize paramilitary standing orders',
      always_deny: 'Refuse paramilitary deployment',
      ask: 'Review each deployment',
    }),
  })],
  ['rs_paramilitary_policy_1992', Object.freeze({
    family: 'rs_paramilitary_policy',
    labels: Object.freeze({
      always_allow: 'Always allow paramilitary deployment',
      always_deny: 'Always deny paramilitary deployment',
      ask: 'Ask per deployment',
    }),
  })],
]);

const STANDALONE_REFUSED_PATTERNS = Object.freeze([
  /\bsystematic\s+(?:ethnic\s+)?cleansing\b/i,
  /\bmaximum\s+displacement\b/i,
]);

const DIRECT_REFUSED_PATTERNS = Object.freeze([
  /\bgenocide\b[\s\S]{0,96}\bproceed\b/i,
  /\bproceed\b[\s\S]{0,96}\bgenocide\b/i,
  /\b(?:expel|deport)\s+(?:the\s+)?(?:civilian\s+)?(?:population|civilians?|people|residents?)\b/i,
  /\b(?:kill|murder|execute|target)\s+(?:the\s+)?(?:(?:civilian|displaced|non-[a-z]+)\s+){0,2}(?:population|civilians?|people|residents?|famil(?:y|ies))\b/i,
  /\border\s+(?:the\s+)?(?:(?:civilian|displaced|non-[a-z]+)\s+){0,2}(?:population|civilians?|people|residents?|famil(?:y|ies))\s+(?:killed|murdered|executed|targeted)\b/i,
]);

const REFUSED_ACTION_PATTERN = /\b(?:allow|approve|authorize|begin|commit|conduct|continue|create|deploy\w*|deport\w*|displace\w*|establish|execute|expel\w*|implement|kill\w*|murder\w*|operate|order|proceed|pursue|target\w*)\b/i;
const REFUSED_ACT_PATTERN = /\b(?:ethnic\s+cleansing|cleansing|forced\s+displacement|deport(?:ation|ing)s?|expulsions?|expelling|(?:civilian|mass)\s+killings?|massacres?|genocide|concentration\s+camps?|detention\s+camps?|paramilitar(?:y|ies)(?:\s+(?:deployment|standing\s+orders))?)\b/i;
const INTERVENING_ACCOUNTABILITY_PATTERN = /\b(?:documentation|exposure|investigation|inspection|prosecution|report|review)\w*\b/i;
const NEGATED_ACTION_PREFIX_PATTERN = /(?:\bnever|\bnot(?:\s+\w+){0,2}|\brefus(?:e|es|ed)\s+to)\s*$/i;
const CONTEXTUAL_STANDALONE_PREFIX_PATTERN = /\b(?:ban|document|expose|forbid|investigate|oppose|prevent|prosecute|record|reject|report|review|stop)\s+(?:(?:the\s+)?(?:allegations?|evidence|findings?|reports?)\s+(?:about|of)\s+)?$/i;

function isCanonAllowedParamilitaryChoice(eventId, family, optionId, text) {
  const contract = CANON_ALLOWED_PARAMILITARY_CHOICES.get(eventId ?? '');
  if (!contract || contract.family !== family || typeof text !== 'string') return false;
  const expected = contract.labels[optionId ?? ''];
  return expected !== undefined && text.replace(/\s+/g, ' ').trim() === expected;
}

function isDirectRefusedSensitiveChoice(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  if (STANDALONE_REFUSED_PATTERNS.some((pattern) => {
    const match = text.match(pattern);
    if (!match || match.index === undefined) return false;
    const beforeMatch = text.slice(Math.max(0, match.index - 48), match.index);
    return !CONTEXTUAL_STANDALONE_PREFIX_PATTERN.test(beforeMatch);
  })) return true;
  const action = text.match(REFUSED_ACTION_PATTERN);
  if (!action || action.index === undefined) return false;
  const beforeAction = text.slice(Math.max(0, action.index - 32), action.index);
  if (NEGATED_ACTION_PREFIX_PATTERN.test(beforeAction)) return false;
  if (DIRECT_REFUSED_PATTERNS.some((pattern) => pattern.test(text))) return true;
  const afterAction = text.slice(action.index + action[0].length);
  const act = afterAction.match(REFUSED_ACT_PATTERN);
  if (!act || act.index === undefined || act.index > 64) return false;
  const between = afterAction.slice(0, act.index);
  return !INTERVENING_ACCOUNTABILITY_PATTERN.test(between);
}

module.exports = {
  isCanonAllowedParamilitaryChoice,
  isDirectRefusedSensitiveChoice,
};
