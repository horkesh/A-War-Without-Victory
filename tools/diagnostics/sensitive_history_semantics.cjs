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
const ACCOUNTABILITY_PATTERN = /\b(?:document\w*|expos\w*|investigat\w*|inspect\w*|prosecut\w*|report\w*|review\w*)\b/i;
const REFUSAL_SCOPE_PATTERN = /\b(?:(?:do|does|did|must|shall|should|will|would|can|could|may|might)\s+not|never|refus(?:e|es|ed)\s+to)\b/i;
const CLAUSE_BOUNDARY_PATTERN = /(?:[.;!?]+|[\r\n]+|(?:,\s*)?\b(?:and\s+then|then|but|however|yet|instead|afterwards?|subsequently|finally)\b(?:\s*,)?)/i;
const CONTEXTUAL_STANDALONE_PREFIX_PATTERN = /\b(?:ban|document|expose|forbid|investigate|oppose|prevent|prosecute|record|reject|report|review|stop)\s+(?:(?:the\s+)?(?:allegations?|evidence|findings?|reports?)\s+(?:about|of)\s+)?$/i;

function matchesFor(pattern, text) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return text.matchAll(new RegExp(pattern.source, flags));
}

function directPatternCoversAction(text, actionIndex) {
  return DIRECT_REFUSED_PATTERNS.some((pattern) => {
    for (const match of matchesFor(pattern, text)) {
      const start = match.index ?? -1;
      if (start <= actionIndex && actionIndex < start + match[0].length) return true;
    }
    return false;
  });
}

function clausesFor(text) {
  const clauses = [];
  let start = 0;
  for (const boundary of matchesFor(CLAUSE_BOUNDARY_PATTERN, text)) {
    if (boundary.index === undefined) continue;
    const clauseText = text.slice(start, boundary.index);
    if (clauseText.trim().length > 0) clauses.push({ start, text: clauseText });
    start = boundary.index + boundary[0].length;
  }
  const finalClause = text.slice(start);
  if (finalClause.trim().length > 0) clauses.push({ start, text: finalClause });
  return clauses;
}

function refusalApplies(clauseText, offset) {
  return REFUSAL_SCOPE_PATTERN.test(clauseText.slice(0, offset));
}

function isCanonAllowedParamilitaryChoice(eventId, family, optionId, text) {
  const contract = CANON_ALLOWED_PARAMILITARY_CHOICES.get(eventId ?? '');
  if (!contract || contract.family !== family || typeof text !== 'string') return false;
  const expected = contract.labels[optionId ?? ''];
  return expected !== undefined && text.replace(/\s+/g, ' ').trim() === expected;
}

function isDirectRefusedSensitiveChoice(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  for (const clause of clausesFor(text)) {
    if (STANDALONE_REFUSED_PATTERNS.some((pattern) => {
      for (const match of matchesFor(pattern, clause.text)) {
        if (match.index === undefined || refusalApplies(clause.text, match.index)) continue;
        const beforeMatch = clause.text.slice(0, match.index);
        if (!CONTEXTUAL_STANDALONE_PREFIX_PATTERN.test(beforeMatch)) return true;
      }
      return false;
    })) return true;
    for (const action of matchesFor(REFUSED_ACTION_PATTERN, clause.text)) {
      if (action.index === undefined || refusalApplies(clause.text, action.index)) continue;
      const absoluteActionIndex = clause.start + action.index;
      if (directPatternCoversAction(text, absoluteActionIndex)) return true;
      const afterAction = clause.text.slice(action.index + action[0].length);
      for (const act of matchesFor(REFUSED_ACT_PATTERN, afterAction)) {
        if (act.index === undefined) continue;
        const between = afterAction.slice(0, act.index);
        if (!ACCOUNTABILITY_PATTERN.test(between)) return true;
      }
    }
  }
  return false;
}

module.exports = {
  isCanonAllowedParamilitaryChoice,
  isDirectRefusedSensitiveChoice,
};
