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
const REFUSAL_SCOPE_PATTERN = /\b(?:(?:do|does|did|must|shall|should|will|would|can|could|may|might)\s+not|cannot|never|refus(?:e|es|ed)\s+to|declin(?:e|es|ed)\s+to|forbid(?:s|ding)?|forbade)\b/i;
const CLAUSE_BOUNDARY_PATTERN = /(?:[.;!?]+|:(?=\s|$)|\s+[–—]\s+|[\r\n]+|(?:,\s*)?\b(?:and\s+then|then|but|however|yet|instead|afterwards?|subsequently|finally)\b(?:\s*,)?)/i;
const CONTEXTUAL_STANDALONE_PREFIX_PATTERN = /\b(?:ban|document|expose|forbid|investigate|oppose|prevent|prosecute|record|reject|report|review|stop)\s+(?:(?:the\s+)?(?:allegations?|evidence|findings?|reports?)\s+(?:about|of)\s+)?$/i;
const SENSITIVE_WARNING_PATTERN = /\b(?:caution(?:s|ed|ing)?|object(?:s|ed|ing)?|objection\w*|oppos(?:e|es|ed|ing)|reject(?:s|ed|ing)?|warn(?:s|ed|ing)?)\b/i;
const CONTINUATION_ACTION_PATTERN = /\b(?:continue|proceed)\b/i;
const ANAPHORIC_MARKER_PATTERN = /\b(?:anyway|regardless)\b/i;
const OPERATIVE_PURPOSE_PATTERN = /\b(?:attacks?|assaults?|campaigns?|combat|direct\s+action|offensives?|operations?|strikes?)\b/i;
const SUBCLAUSE_BOUNDARY_PATTERN = /,\s*/i;
const LOCAL_NEGATION_PATTERN = /\b(?:(?:do|does|did|must|shall|should|will|would|can|could|may|might)\s+not|cannot|never|refus(?:e|es|ed)\s+to|declin(?:e|es|ed)\s+to)\s+(?:[a-z]+ly\s+)*$/i;

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

function subclausesFor(clauseText) {
  const subclauses = [];
  let start = 0;
  for (const boundary of matchesFor(SUBCLAUSE_BOUNDARY_PATTERN, clauseText)) {
    if (boundary.index === undefined) continue;
    subclauses.push({ start, text: clauseText.slice(start, boundary.index) });
    start = boundary.index + boundary[0].length;
  }
  subclauses.push({ start, text: clauseText.slice(start) });
  return subclauses;
}

function subclauseForOffset(subclauses, offset) {
  for (let index = subclauses.length - 1; index >= 0; index -= 1) {
    if (subclauses[index].start <= offset) return subclauses[index];
  }
  return subclauses[0];
}

function localNegationApplies(subclause, clauseOffset) {
  const localOffset = clauseOffset - subclause.start;
  return LOCAL_NEGATION_PATTERN.test(subclause.text.slice(0, localOffset));
}

function nonNegatedSensitiveWarningOffsets(clauseText, subclauses) {
  if (!REFUSED_ACT_PATTERN.test(clauseText)) return [];
  const offsets = [];
  for (const subclause of subclauses) {
    for (const warning of matchesFor(SENSITIVE_WARNING_PATTERN, subclause.text)) {
      if (warning.index === undefined || localNegationApplies(subclause, subclause.start + warning.index)) continue;
      offsets.push(subclause.start + warning.index);
    }
  }
  return offsets;
}

function hasDirectWarningContinuation(clauses) {
  let hasSensitiveWarningAntecedent = false;
  for (const clause of clauses) {
    const subclauses = subclausesFor(clause.text);
    const warningOffsets = nonNegatedSensitiveWarningOffsets(clause.text, subclauses);
    const continuations = [...matchesFor(CONTINUATION_ACTION_PATTERN, clause.text)]
      .filter((match) => match.index !== undefined);
    let warningIndex = 0;
    for (let continuationIndex = 0; continuationIndex < continuations.length; continuationIndex += 1) {
      const continuation = continuations[continuationIndex];
      while (
        warningIndex < warningOffsets.length
        && warningOffsets[warningIndex] < continuation.index
      ) {
        hasSensitiveWarningAntecedent = true;
        warningIndex += 1;
      }
      if (!hasSensitiveWarningAntecedent) continue;
      const subclause = subclauseForOffset(subclauses, continuation.index);
      if (localNegationApplies(subclause, continuation.index)) continue;
      const nextContinuation = continuations[continuationIndex + 1];
      const ownedStart = subclause.start;
      const ownedEnd = nextContinuation?.index ?? clause.text.length;
      const ownedSegment = clause.text.slice(ownedStart, ownedEnd);
      if (!ANAPHORIC_MARKER_PATTERN.test(ownedSegment)) continue;
      if (OPERATIVE_PURPOSE_PATTERN.test(ownedSegment)) return true;
      if (!ACCOUNTABILITY_PATTERN.test(ownedSegment)) return true;
    }
    if (warningIndex < warningOffsets.length) hasSensitiveWarningAntecedent = true;
  }
  return false;
}

function isCanonAllowedParamilitaryChoice(eventId, family, optionId, text) {
  const contract = CANON_ALLOWED_PARAMILITARY_CHOICES.get(eventId ?? '');
  if (!contract || contract.family !== family || typeof text !== 'string') return false;
  const expected = contract.labels[optionId ?? ''];
  return expected !== undefined && text.replace(/\s+/g, ' ').trim() === expected;
}

function isDirectRefusedSensitiveChoice(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  const clauses = clausesFor(text);
  if (hasDirectWarningContinuation(clauses)) return true;
  for (let clauseIndex = 0; clauseIndex < clauses.length; clauseIndex += 1) {
    const clause = clauses[clauseIndex];
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
      if (directPatternCoversAction(clause.text, action.index)) return true;
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
