'use strict';

/**
 * Shared semantic boundary for direct Ring-3 player choices.
 *
 * The checks are deliberately limited to player-facing response-option prose.
 * Contextual historical narration, provenance notes, and future guard text are
 * not inputs. The exact paramilitary-policy surface remains the sole canon
 * exception under Sensitive History Design Gate section 3.
 */

const CANON_ALLOWED_PARAMILITARY_IDS = new Set([
  'rbih_paramilitary_policy_1992',
  'rs_paramilitary_policy_1992',
]);

const CANON_ALLOWED_PARAMILITARY_FAMILIES = new Set([
  'rbih_paramilitary_policy',
  'rs_paramilitary_policy',
]);

const STANDALONE_REFUSED_PATTERNS = Object.freeze([
  /\bsystematic\s+(?:ethnic\s+)?cleansing\b/i,
  /\bmaximum\s+displacement\b/i,
]);

const DIRECT_REFUSED_PATTERNS = Object.freeze([
  /\bgenocide\b[\s\S]{0,96}\bproceed\b/i,
  /\bproceed\b[\s\S]{0,96}\bgenocide\b/i,
  /\b(?:expel|deport)\s+(?:the\s+)?(?:civilian\s+)?(?:population|civilians?|people|residents?)\b/i,
  /\b(?:kill|murder|execute|target)\s+(?:the\s+)?civilians?\b/i,
  /\border\s+(?:the\s+)?civilians?\s+(?:killed|murdered|executed|targeted)\b/i,
]);

const REFUSED_ACTION_PATTERN = /\b(?:allow|approve|authorize|begin|commit|conduct|continue|create|deport\w*|displace\w*|establish|execute|expel\w*|implement|kill\w*|murder\w*|operate|order|proceed|pursue|target\w*)\b/i;
const REFUSED_ACT_PATTERN = /\b(?:ethnic\s+cleansing|cleansing|forced\s+displacement|deport(?:ation|ing)s?|expulsions?|expelling|(?:civilian|mass)\s+killings?|massacres?|genocide|concentration\s+camps?|detention\s+camps?)\b/i;
const INTERVENING_ACCOUNTABILITY_PATTERN = /\b(?:documentation|exposure|investigation|inspection|prosecution|report|review)\w*\b/i;
const NEGATED_ACTION_PREFIX_PATTERN = /(?:\bnever|\bnot(?:\s+\w+){0,2}|\brefus(?:e|es|ed)\s+to)\s*$/i;
const CONTEXTUAL_STANDALONE_PREFIX_PATTERN = /\b(?:ban|document|expose|forbid|investigate|oppose|prevent|prosecute|reject|report|review|stop)\s*$/i;

function isCanonAllowedParamilitaryChoice(eventId, family) {
  return CANON_ALLOWED_PARAMILITARY_IDS.has(eventId ?? '')
    || CANON_ALLOWED_PARAMILITARY_FAMILIES.has(family ?? '');
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
