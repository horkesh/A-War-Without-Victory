#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEMA_VERSION = 3;
const EXCERPT_CHARS = 160;

// The runtime Codex panel (src/ui/map/components/CodexPanel.tsx) imports
// data/scenarios/essays/essay_index.json and serves its `dynamic_sections`
// (the A1c response-morphing prose) directly to the player. The per-essay
// JSON files carry the canonical body but NOT the dynamic morphing sections,
// so the index's dynamic_sections are the only place that runtime-served
// morphing prose lives. We scan that ONE slice of the index — the
// dynamic_sections arrays only — so sensitive claims in morphing prose are
// covered by this inventory, while the canonical body (already covered via the
// per-essay files) is not double-counted. The rest of essay_index.json stays
// excluded (it duplicates the per-essay bodies).
const ESSAY_INDEX_RELATIVE = toPosixPath(
  path.join('data', 'scenarios', 'essays', 'essay_index.json'),
);
const SOURCE_FLOORS = Object.freeze({
  diplomatic: 2,
  humanitarian: 2,
  military: 2,
  political: 2,
});

const TERM_SETS = Object.freeze({
  operational_overclaim: Object.freeze([
    '5th Corps sweeps west',
    'breaks through',
    'captured',
    'captures',
    'clears',
    'falls',
    'liberated',
    'liberates',
    'overruns',
    'seizes',
    'sweep',
    'sweeps',
    'sweeps west',
  ]),
  sensitive_history: Object.freeze([
    'atrocity',
    'camp',
    'civilian',
    'civilians',
    'cleanses',
    'cleansing',
    'concentration camp',
    'deportation',
    'detention',
    'displacement',
    'ethnic cleansing',
    'expulsion',
    'forced displacement',
    'genocide',
    'massacre',
    'refugees',
  ]),
  forbidden_scaffold: Object.freeze([
    'FIXME',
    'TODO',
    'atrocity lever',
    'cleansing lever',
    'placeholder',
  ]),
});

const CITATION_KEYS = Object.freeze([
  'citation',
  'citations',
  'historical_source',
  'historical_sources',
  'reference',
  'references',
  'source',
  'sources',
]);
const SOURCE_KEYS = Object.freeze([
  ...CITATION_KEYS,
  'source_note',
  'source_notes',
]);

// These are authored player-facing prose fields. JSON identifiers, trigger
// predicates, source metadata, and mechanical effect values are deliberately
// excluded. The inventory must not depend on a sensitive-word dictionary:
// ordinary historical prose can still contain an unsupported factual claim.
const CLAIM_PROSE_KEYS = new Set([
  'after_action',
  'body',
  'content',
  'copy',
  'description',
  'detail',
  'effect',
  'effects',
  'explanation',
  'headline',
  'historical_context',
  'label',
  'message',
  'narrative',
  'note',
  'outcome',
  'rationale',
  'staff_assessment',
  'summary',
  'text',
  'title',
  'tooltip',
  'trigger_evidence',
]);

const GENERIC_SYMMETRY_PATTERN = /\b(?:both|all) sides\b|\bno faction\b.{0,48}\bclean hands\b/i;
const DIRECT_CHOICE_FIELDS_PATTERN = /\.response_options\[\d+\]\.(?:description|label|narrative|text)$/;
const PROHIBITED_ACT_PATTERN = /\b(?:ethnic cleansing|cleansing|forced displacement|deportation|expulsion|massacre|genocide)\b/i;
const PROHIBITED_ACTION_PATTERN = /\b(?:allow|approve|authorize|begin|commit|conduct|continue|execute|implement|order|proceed|pursue)\b/i;
const CANON_ALLOWED_PARAMILITARY_IDS = new Set([
  'rbih_paramilitary_policy_1992',
  'rs_paramilitary_policy_1992',
]);
const CANON_ALLOWED_PARAMILITARY_FAMILIES = new Set([
  'rbih_paramilitary_policy',
  'rs_paramilitary_policy',
]);

const SRC_PATH_KEYWORDS = Object.freeze([
  'codex',
  'chronicle',
  'consequence',
  'notification',
]);

const SRC_TEXT_EXTENSIONS = Object.freeze([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function sortedCounts(counts) {
  const result = {};
  for (const key of Object.keys(counts).sort(compareText)) {
    result[key] = counts[key];
  }
  return result;
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort(compareText)) {
    sorted[key] = sortObject(value[key]);
  }
  return sorted;
}

function stableStringify(value) {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesInDir(rootDir, relativeDir, predicate) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!(await pathExists(absoluteDir))) {
    return [];
  }
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => toPosixPath(path.join(relativeDir, entry.name)))
    .sort(compareText);
}

async function walkFiles(rootDir, relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!(await pathExists(absoluteDir))) {
    return [];
  }
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => compareText(a.name, b.name))) {
    const childRelative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(rootDir, childRelative));
    } else if (entry.isFile()) {
      files.push(toPosixPath(childRelative));
    }
  }
  return files.sort(compareText);
}

async function indexHasDynamicSections(rootDir) {
  const absolute = path.join(rootDir, ESSAY_INDEX_RELATIVE);
  if (!(await pathExists(absolute))) {
    return false;
  }
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(absolute, 'utf8'));
  } catch {
    return false;
  }
  const essays = Array.isArray(parsed?.essays) ? parsed.essays : [];
  return essays.some((essay) => (
    essay && Array.isArray(essay.dynamic_sections) && essay.dynamic_sections.length > 0
  ));
}

async function listInputFiles(rootDir) {
  const essayFiles = await listFilesInDir(
    rootDir,
    path.join('data', 'scenarios', 'essays'),
    (name) => name.endsWith('.json') && name !== 'essay_index.json',
  );
  const ghostFiles = await listFilesInDir(
    rootDir,
    path.join('data', 'codex', 'ghost_entries'),
    (name) => name.endsWith('.md'),
  );
  const ghostBcsFiles = await listFilesInDir(
    rootDir,
    path.join('data', 'codex', 'ghost_entries_bcs'),
    (name) => name.endsWith('.md'),
  );
  const eventFiles = await listFilesInDir(
    rootDir,
    path.join('data', 'scenarios', 'events'),
    (name) => name.endsWith('.json'),
  );
  const srcFiles = (await walkFiles(rootDir, 'src'))
    .filter((file) => {
      const lower = file.toLowerCase();
      const extension = path.extname(file).toLowerCase();
      return SRC_TEXT_EXTENSIONS.includes(extension)
        && !lower.includes('/_archived/')
        && SRC_PATH_KEYWORDS.some((keyword) => lower.includes(keyword));
    });

  // essay_index.json is included ONLY for its dynamic_sections slice (see
  // ESSAY_INDEX_RELATIVE comment). scanJsonFile() restricts the walk for this
  // file to dynamic_sections; the per-essay files above cover the bodies. The
  // file is listed only when at least one essay actually carries a non-empty
  // dynamic_sections array — an index without morphing prose contributes
  // nothing and stays out of scan_scope (matching its body-only exclusion).
  const indexFiles = (await indexHasDynamicSections(rootDir))
    ? [ESSAY_INDEX_RELATIVE]
    : [];

  return [
    ...ghostFiles,
    ...ghostBcsFiles,
    ...essayFiles,
    ...indexFiles,
    ...eventFiles,
    ...srcFiles,
  ].sort(compareText);
}

function classifySurface(relativeFile) {
  if (relativeFile === ESSAY_INDEX_RELATIVE) {
    return 'essay_dynamic_section';
  }
  if (relativeFile.startsWith('data/scenarios/essays/')) {
    return 'essay';
  }
  if (relativeFile.startsWith('data/codex/ghost_entries_bcs/')) {
    return 'ghost_entry_bcs';
  }
  if (relativeFile.startsWith('data/codex/ghost_entries/')) {
    return 'ghost_entry';
  }
  if (relativeFile === 'data/scenarios/events/consequences.json') {
    return 'event_consequence';
  }
  if (relativeFile.startsWith('data/scenarios/events/')) {
    return 'event';
  }

  const lower = relativeFile.toLowerCase();
  if (lower.includes('consequence')) {
    return 'src_consequence_read_model';
  }
  if (lower.includes('codex')) {
    return 'src_codex_read_model';
  }
  if (lower.includes('chronicle')) {
    return 'src_chronicle_read_model';
  }
  if (lower.includes('notification')) {
    return 'src_notification_read_model';
  }
  return 'src_read_model';
}

function isAlphaNumeric(char) {
  return typeof char === 'string' && /^[a-z0-9_]$/i.test(char);
}

function hasTerm(text, term) {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let index = lowerText.indexOf(lowerTerm);
  while (index >= 0) {
    const before = index > 0 ? lowerText[index - 1] : '';
    const after = index + lowerTerm.length < lowerText.length ? lowerText[index + lowerTerm.length] : '';
    if (!isAlphaNumeric(before) && !isAlphaNumeric(after)) {
      return true;
    }
    index = lowerText.indexOf(lowerTerm, index + 1);
  }
  return false;
}

function findMatchedTerms(text) {
  const matches = new Set();
  for (const terms of Object.values(TERM_SETS)) {
    for (const term of terms) {
      if (hasTerm(text, term)) {
        matches.add(term);
      }
    }
  }
  const matchedTerms = Array.from(matches);
  return matchedTerms
    .filter((term) => !matchedTerms.some((other) => (
      other !== term
      && other.length > term.length
      && hasTerm(other, term)
    )))
    .sort(compareText);
}

function termSetMatches(matchedTerms, setName) {
  const set = new Set(TERM_SETS[setName]);
  return matchedTerms.some((term) => set.has(term));
}

function buildJsonStringLineMap(raw) {
  const linesByPath = new Map();
  let index = 0;
  let line = 1;

  const skipWhitespace = () => {
    while (index < raw.length && /\s/.test(raw[index])) {
      if (raw[index] === '\n') line += 1;
      index += 1;
    }
  };

  const parseString = () => {
    if (raw[index] !== '"') throw new Error(`Expected JSON string at line ${line}`);
    const start = index;
    const tokenLine = line;
    index += 1;
    let escaped = false;
    while (index < raw.length) {
      const char = raw[index];
      if (char === '\n') line += 1;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        index += 1;
        break;
      }
      index += 1;
    }
    return { value: JSON.parse(raw.slice(start, index)), line: tokenLine };
  };

  const parseValue = (pathParts) => {
    skipWhitespace();
    if (raw[index] === '"') {
      const token = parseString();
      linesByPath.set(pathParts.join(''), token.line);
      return;
    }
    if (raw[index] === '{') {
      index += 1;
      skipWhitespace();
      if (raw[index] === '}') {
        index += 1;
        return;
      }
      while (index < raw.length) {
        const key = parseString().value;
        skipWhitespace();
        if (raw[index] !== ':') throw new Error(`Expected ':' after JSON key at line ${line}`);
        index += 1;
        parseValue([...pathParts, `.${key}`]);
        skipWhitespace();
        if (raw[index] === '}') {
          index += 1;
          return;
        }
        if (raw[index] !== ',') throw new Error(`Expected ',' in JSON object at line ${line}`);
        index += 1;
        skipWhitespace();
      }
      throw new Error('Unterminated JSON object');
    }
    if (raw[index] === '[') {
      index += 1;
      skipWhitespace();
      if (raw[index] === ']') {
        index += 1;
        return;
      }
      let arrayIndex = 0;
      while (index < raw.length) {
        parseValue([...pathParts, `[${arrayIndex}]`]);
        arrayIndex += 1;
        skipWhitespace();
        if (raw[index] === ']') {
          index += 1;
          return;
        }
        if (raw[index] !== ',') throw new Error(`Expected ',' in JSON array at line ${line}`);
        index += 1;
      }
      throw new Error('Unterminated JSON array');
    }
    const primitiveStart = index;
    while (index < raw.length && !/[\s,}\]]/.test(raw[index])) index += 1;
    if (index === primitiveStart) {
      throw new Error(`Expected JSON value at line ${line}`);
    }
  };

  parseValue(['$']);
  skipWhitespace();
  if (index !== raw.length) {
    throw new Error(`Unexpected JSON input at line ${line}`);
  }
  return linesByPath;
}

function normalizeExcerpt(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function makeExcerpt(text, matchedTerms) {
  const normalized = normalizeExcerpt(text);
  const lower = normalized.toLowerCase();
  const firstOffsets = matchedTerms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((offset) => offset >= 0)
    .sort((a, b) => a - b);
  const center = firstOffsets.length > 0 ? firstOffsets[0] : 0;
  const start = Math.max(0, center - Math.floor(EXCERPT_CHARS / 3));
  const end = Math.min(normalized.length, start + EXCERPT_CHARS);
  const excerpt = normalized.slice(start, end);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < normalized.length ? '...' : '';
  return `${prefix}${excerpt}${suffix}`;
}

function hasSourceValue(value) {
  if (Array.isArray(value)) {
    return value.some(hasSourceValue);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(hasSourceValue);
  }
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function flattenSourceValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap(flattenSourceValues);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort(compareText).flatMap((key) => flattenSourceValues(value[key]));
  }
  const text = asNonEmptyString(value);
  return text ? [text] : [];
}

function nearestSourceObject(ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const value = ancestors[index];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    for (const key of SOURCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return value;
      }
    }
  }
  return null;
}

function nearestSubjectObject(ancestors, rootValue) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const value = ancestors[index];
    if (value && typeof value === 'object' && !Array.isArray(value) && asNonEmptyString(value.id)
      && (value.trigger || value.category || value.event_id || value.content || value.narrative
        || value.title || Array.isArray(value.response_options))) {
      return value;
    }
  }
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const value = ancestors[index];
    if (value && typeof value === 'object' && !Array.isArray(value) && asNonEmptyString(value.id)) return value;
  }
  return rootValue && typeof rootValue === 'object' && !Array.isArray(rootValue)
    ? rootValue
    : null;
}

function sourceDetailsFor(ancestors, rootValue) {
  const sourceObject = nearestSourceObject(ancestors) ?? nearestSubjectObject(ancestors, rootValue);
  if (!sourceObject) {
    return { citation: null, sourceTier: null, sourceNote: null };
  }
  const citations = CITATION_KEYS.flatMap((key) => flattenSourceValues(sourceObject[key]));
  return {
    citation: citations.length > 0 ? [...new Set(citations)].sort(compareText).join(' | ') : null,
    sourceTier: asNonEmptyString(sourceObject.source_tier),
    sourceNote: asNonEmptyString(sourceObject.source_note),
  };
}

function essayFloorStatus(rootValue) {
  if (!rootValue || typeof rootValue !== 'object' || Array.isArray(rootValue)) {
    return null;
  }
  const category = typeof rootValue.category === 'string' ? rootValue.category : null;
  const floor = category ? SOURCE_FLOORS[category] : undefined;
  if (typeof floor !== 'number') {
    return null;
  }
  const sources = Array.isArray(rootValue.sources) ? rootValue.sources : [];
  if (sources.length < floor) {
    return {
      category,
      floor,
      sourceCount: sources.length,
    };
  }
  return null;
}

function sourceStatusFor(surface, rootValue, ancestors) {
  // Codex #338 P2: dynamic-section claims (`essay_dynamic_section`) are scanned
  // with their PARENT essay seeded as `rootValue` (see scanJsonFile), so the
  // same two-source editorial floor that gates the canonical essay body must
  // also gate the runtime morphing prose. Without this, a one-source
  // diplomatic/military/etc. parent in essay_index.json would report its
  // dynamic-section claims as `cited` (via the parent's `sources` fallback),
  // silently bypassing the floor exception — and no other source-quality audit
  // scans the index dynamic sections.
  if (surface === 'essay' || surface === 'essay_dynamic_section') {
    const floorStatus = essayFloorStatus(rootValue);
    if (floorStatus) {
      return {
        status: 'source_floor_exception',
        floorStatus,
      };
    }
  }

  const sourceObject = nearestSourceObject(ancestors);
  if (!sourceObject) {
    return { status: 'uncited', floorStatus: null };
  }
  const cited = CITATION_KEYS.some((key) => (
    Object.prototype.hasOwnProperty.call(sourceObject, key) && hasSourceValue(sourceObject[key])
  ));
  return { status: cited ? 'cited' : 'uncited', floorStatus: null };
}

function actorFactionFor(text) {
  if (/\b(5th Corps|ARBiH|RBiH|Bosnian Army)\b/i.test(text)) {
    return 'RBiH';
  }
  if (/\b(VRS|RS|Bosnian Serb)\b/i.test(text)) {
    return 'RS';
  }
  if (/\b(HVO|HRHB|HV|Croat)\b/i.test(text)) {
    return 'HRHB';
  }
  if (/\b(JNA|Yugoslav)\b/i.test(text)) {
    return 'JNA';
  }
  return null;
}

function dateWindowFor(relativeFile, ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const value = ancestors[index];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    for (const key of ['date_window', 'dateWindow', 'date', 'window', 'turn_window']) {
      if (typeof value[key] === 'string' && value[key].trim().length > 0) {
        return value[key].trim();
      }
    }
    const trigger = value.trigger;
    if (trigger && typeof trigger === 'object' && !Array.isArray(trigger)) {
      const turnMin = Number.isInteger(trigger.turn_min) ? trigger.turn_min : null;
      const turnMax = Number.isInteger(trigger.turn_max) ? trigger.turn_max : turnMin;
      if (turnMin !== null) {
        return turnMax === turnMin ? `turn ${turnMin}` : `turns ${turnMin}-${turnMax}`;
      }
    }
  }
  const fileYear = relativeFile.match(/\b(199[2-5])\b/);
  return fileYear ? fileYear[1] : null;
}

function stableInline(value) {
  if (Array.isArray(value)) {
    return value.map(stableInline);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort(compareText)) sorted[key] = stableInline(value[key]);
  return sorted;
}

function statePredicateFor(ancestors, rootValue) {
  const subject = nearestSubjectObject(ancestors, rootValue);
  const trigger = subject?.trigger;
  if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) return null;
  const parts = [];
  if (asNonEmptyString(trigger.phase)) parts.push(`phase=${trigger.phase.trim()}`);
  if (Array.isArray(trigger.requires_events) && trigger.requires_events.length > 0) {
    parts.push(`requires_events=${trigger.requires_events.filter((value) => typeof value === 'string').sort(compareText).join(',')}`);
  }
  if (trigger.condition && typeof trigger.condition === 'object') {
    parts.push(`condition=${JSON.stringify(stableInline(trigger.condition))}`);
  }
  if (Array.isArray(trigger.conditions) && trigger.conditions.length > 0) {
    parts.push(`conditions=${JSON.stringify(stableInline(trigger.conditions))}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

function subjectIdFor(ancestors, rootValue, relativeFile) {
  const subject = nearestSubjectObject(ancestors, rootValue);
  return asNonEmptyString(subject?.id) ?? path.basename(relativeFile, path.extname(relativeFile));
}

function respondentFor(ancestors, rootValue) {
  const subject = nearestSubjectObject(ancestors, rootValue);
  if (!subject) return null;
  for (const key of ['responding_faction', 'respondent', 'player_faction', 'faction']) {
    const value = asNonEmptyString(subject[key]);
    if (value) return value;
  }
  return null;
}

function isCanonAllowedParamilitaryChoice(ancestors, rootValue) {
  const subject = nearestSubjectObject(ancestors, rootValue);
  const id = asNonEmptyString(subject?.id) ?? '';
  const family = asNonEmptyString(subject?.family) ?? '';
  return CANON_ALLOWED_PARAMILITARY_IDS.has(id) || CANON_ALLOWED_PARAMILITARY_FAMILIES.has(family);
}

function isDirectProhibitedChoice(text) {
  if (/\bsystematic\s+(?:ethnic\s+)?cleansing\b/i.test(text)) return true;
  if (/\bmaximum\s+displacement\b/i.test(text)) return true;
  if (/\bgenocide\b[\s\S]{0,96}\bproceed\b/i.test(text)) return true;
  return (PROHIBITED_ACTION_PATTERN.test(text) && PROHIBITED_ACT_PATTERN.test(text));
}

function playerInteractionTypeFor(fieldPath, text, ancestors, rootValue) {
  if (DIRECT_CHOICE_FIELDS_PATTERN.test(fieldPath)
    && isDirectProhibitedChoice(text)
    && !isCanonAllowedParamilitaryChoice(ancestors, rootValue)) {
    return 'player_choice';
  }
  if (fieldPath.includes('.response_options[')) return 'decision_context';
  const subject = nearestSubjectObject(ancestors, rootValue);
  if (Array.isArray(subject?.response_options) && subject.response_options.length > 0) return 'decision_context';
  return 'informational';
}

function ringFor(playerInteractionType) {
  return playerInteractionType === 'player_choice'
    ? 'ring_3_refused_candidate'
    : 'ring_2_informational';
}

function provenanceGapsFor(sourceInfo, sourceDetails) {
  const gaps = [];
  if (sourceInfo.status === 'source_floor_exception') gaps.push('source_floor');
  if (!sourceDetails.citation) gaps.push('citation');
  if (!sourceDetails.sourceNote) gaps.push('source_note');
  if (!sourceDetails.sourceTier) gaps.push('source_tier');
  return gaps;
}

function statusAndOwnerFor({ ring, sourceInfo, sourceDetails, riskClass, statePredicate, text }) {
  if (ring === 'ring_3_refused_candidate' && riskClass === 'sensitive_history_gated') {
    return { status: 'blocked_sensitive_player_choice', owner: 'historian+game-designer' };
  }
  if (GENERIC_SYMMETRY_PATTERN.test(text)) {
    return { status: 'needs_actor_specificity', owner: 'historian' };
  }
  if (sourceInfo.status === 'source_floor_exception') {
    return { status: 'needs_source_floor', owner: 'historian' };
  }
  if (sourceInfo.status !== 'cited' || !sourceDetails.citation || !sourceDetails.sourceNote) {
    return { status: 'needs_source_note', owner: 'historian' };
  }
  if (!sourceDetails.sourceTier) {
    return { status: 'needs_source_tier', owner: 'historian' };
  }
  if (riskClass === 'dynamic_state_candidate' && !statePredicate) {
    return { status: 'needs_state_predicate', owner: 'gameplay-programmer+historian' };
  }
  return { status: 'documented', owner: 'historian' };
}

function isDynamicConsequenceClaim(surface, text) {
  if (surface !== 'event_consequence' && surface !== 'src_consequence_read_model') {
    return false;
  }
  return /\b(if|unless|when|without|should|would|could)\b/i.test(text)
    && !/\b(predicate|state\.|live state|live predicate|gameState|selector)\b/i.test(text);
}

function riskFor(surface, text, matchedTerms) {
  if (termSetMatches(matchedTerms, 'forbidden_scaffold')) {
    return 'unsupported_remove';
  }
  if (isDynamicConsequenceClaim(surface, text)) {
    return 'dynamic_state_candidate';
  }
  if (termSetMatches(matchedTerms, 'sensitive_history')) {
    return 'sensitive_history_gated';
  }
  if (termSetMatches(matchedTerms, 'operational_overclaim')) {
    return 'safe_factual_correction';
  }
  return 'needs_source_note';
}

function stopGateFor(riskClass) {
  if (riskClass === 'safe_factual_correction') {
    return 'none';
  }
  if (riskClass === 'unsupported_remove') {
    return 'canon';
  }
  if (riskClass === 'dynamic_state_candidate') {
    return 'mechanics';
  }
  if (riskClass === 'sensitive_history_gated') {
    return 'sensitive_history';
  }
  return 'historian';
}

function notesFor(riskClass, sourceInfo) {
  const notes = [];
  if (sourceInfo.floorStatus) {
    notes.push(`Essay category ${sourceInfo.floorStatus.category} has ${sourceInfo.floorStatus.sourceCount} source(s), below floor ${sourceInfo.floorStatus.floor}.`);
  }
  if (riskClass === 'unsupported_remove') {
    notes.push('Forbidden scaffold or player-lever wording must not ship in runtime content.');
  } else if (riskClass === 'dynamic_state_candidate') {
    notes.push('Counterfactual consequence phrasing should be tied to a live predicate before runtime use.');
  } else if (riskClass === 'sensitive_history_gated') {
    notes.push('Sensitive-history term requires review before prose changes.');
  } else if (riskClass === 'safe_factual_correction') {
    notes.push('Operational wording may overclaim outcome or agency; verify against source/state.');
  }
  return notes.sort(compareText);
}

function makeClaimId(file, line, fieldPath, matchedTerms) {
  const basis = [file, String(line), fieldPath, matchedTerms.join('|')].join('\n');
  return `sci_${crypto.createHash('sha256').update(basis).digest('hex').slice(0, 16)}`;
}

function makeClaim({ surface, file, line, fieldPath, text, matchedTerms, sourceInfo, dateWindow, ancestors, rootValue }) {
  const riskClass = riskFor(surface, text, matchedTerms);
  const sourceDetails = sourceDetailsFor(ancestors, rootValue);
  const statePredicate = statePredicateFor(ancestors, rootValue);
  const playerInteractionType = playerInteractionTypeFor(fieldPath, text, ancestors, rootValue);
  const ring = ringFor(playerInteractionType);
  const disposition = statusAndOwnerFor({ ring, sourceInfo, sourceDetails, riskClass, statePredicate, text });
  return {
    claim_id: makeClaimId(file, line, fieldPath, matchedTerms),
    surface,
    file,
    line,
    field_path: fieldPath,
    excerpt: makeExcerpt(text, matchedTerms),
    claim: makeExcerpt(text, matchedTerms),
    matched_terms: matchedTerms,
    subject_id: subjectIdFor(ancestors, rootValue, file),
    ring,
    actor_faction: actorFactionFor(text),
    date_window: dateWindow,
    state_predicate: statePredicate,
    source_status: sourceInfo.status,
    source_tier: sourceDetails.sourceTier,
    citation: sourceDetails.citation,
    source_note: sourceDetails.sourceNote,
    provenance_gaps: provenanceGapsFor(sourceInfo, sourceDetails),
    respondent: respondentFor(ancestors, rootValue),
    player_interaction_type: playerInteractionType,
    risk_class: riskClass,
    stop_gate: stopGateFor(riskClass),
    status: disposition.status,
    owner: disposition.owner,
    notes: notesFor(riskClass, sourceInfo),
  };
}

function walkJsonStrings(value, visitor, ancestors = [], pathParts = ['$']) {
  if (typeof value === 'string') {
    visitor(value, pathParts.join(''), ancestors);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkJsonStrings(entry, visitor, [...ancestors, value], [...pathParts, `[${index}]`]);
    });
    return;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort(compareText);
    for (const key of keys) {
      walkJsonStrings(value[key], visitor, [...ancestors, value], [...pathParts, `.${key}`]);
    }
  }
}

function isClaimProseField(fieldPath) {
  const match = fieldPath.match(/\.([A-Za-z0-9_]+)(?:\[\d+\])?$/);
  return match ? CLAIM_PROSE_KEYS.has(match[1]) : false;
}

function sortClaims(claims) {
  return claims.sort((a, b) => (
    compareText(a.file, b.file)
    || a.line - b.line
    || compareText(a.field_path, b.field_path)
    || compareText(a.matched_terms.join('|'), b.matched_terms.join('|'))
    || compareText(a.excerpt, b.excerpt)
  ));
}

async function scanJsonFile(rootDir, relativeFile, surface) {
  const absoluteFile = path.join(rootDir, relativeFile);
  const raw = await fs.readFile(absoluteFile, 'utf8');
  const parsed = JSON.parse(raw);
  const linesByPath = buildJsonStringLineMap(raw);
  const claims = [];

  const collect = (text, fieldPath, ancestors, rootValue, sourceFieldPath = fieldPath) => {
    if (/\.(?:citation|citations|historical_source|historical_sources|reference|references|source|source_note|source_notes|sources)(?:\[|$)/.test(fieldPath)) {
      return;
    }
    const matchedTerms = findMatchedTerms(text);
    if (matchedTerms.length === 0 && !isClaimProseField(fieldPath)) {
      return;
    }
    const sourceInfo = sourceStatusFor(surface, rootValue, ancestors);
    const line = linesByPath.get(sourceFieldPath);
    if (!Number.isInteger(line)) throw new Error(`Missing JSON line for ${relativeFile}:${sourceFieldPath}`);
    claims.push(makeClaim({
      surface,
      file: relativeFile,
      line,
      fieldPath,
      text,
      matchedTerms,
      sourceInfo,
      dateWindow: dateWindowFor(relativeFile, ancestors),
      ancestors,
      rootValue,
    }));
  };

  // essay_index.json is scanned for its dynamic_sections slice only — the
  // runtime morphing prose the Codex panel serves. Each section's source
  // status falls back to its parent essay's `sources` via nearestSourceObject
  // (the essay object is seeded as an ancestor). The canonical essay bodies are
  // covered by the per-essay files and are deliberately NOT re-scanned here.
  if (surface === 'essay_dynamic_section') {
    const essays = Array.isArray(parsed?.essays) ? parsed.essays : [];
    essays.forEach((essay, essayIndex) => {
      const sections = essay && Array.isArray(essay.dynamic_sections)
        ? essay.dynamic_sections
        : null;
      if (!sections) {
        return;
      }
      const essayKey = typeof essay.id === 'string' && essay.id.length > 0
        ? essay.id
        : `[${essayIndex}]`;
      walkJsonStrings(
        sections,
        (text, sourceFieldPath, ancestors) => {
          const fieldPath = sourceFieldPath.replace(
            `$.essays[${essayIndex}]`,
            `$.${essayKey}`,
          );
          collect(text, fieldPath, ancestors, essay, sourceFieldPath);
        },
        [parsed, essay],
        ['$', '.essays', `[${essayIndex}]`, '.dynamic_sections'],
      );
    });
    return claims;
  }

  walkJsonStrings(parsed, (text, fieldPath, ancestors) => {
    collect(text, fieldPath, ancestors, parsed);
  }, [parsed], ['$']);

  return claims;
}

async function scanTextFile(rootDir, relativeFile, surface) {
  const absoluteFile = path.join(rootDir, relativeFile);
  const raw = await fs.readFile(absoluteFile, 'utf8');
  const claims = [];
  const lines = raw.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    const matchedTerms = findMatchedTerms(lineText);
    if (matchedTerms.length === 0) {
      return;
    }
    const sourceInfo = { status: 'uncited', floorStatus: null };
    claims.push(makeClaim({
      surface,
      file: relativeFile,
      line: index + 1,
      fieldPath: '$.line',
      text: lineText,
      matchedTerms,
      sourceInfo,
      dateWindow: dateWindowFor(relativeFile, []),
      ancestors: [],
      rootValue: null,
    }));
  });
  return claims;
}

function summarize(files, claims) {
  const riskClassCounts = {};
  const sourceStatusCounts = {};
  const surfaceCounts = {};
  const statusCounts = {};
  const ownerCounts = {};
  for (const claim of claims) {
    riskClassCounts[claim.risk_class] = (riskClassCounts[claim.risk_class] ?? 0) + 1;
    sourceStatusCounts[claim.source_status] = (sourceStatusCounts[claim.source_status] ?? 0) + 1;
    surfaceCounts[claim.surface] = (surfaceCounts[claim.surface] ?? 0) + 1;
    statusCounts[claim.status] = (statusCounts[claim.status] ?? 0) + 1;
    ownerCounts[claim.owner] = (ownerCounts[claim.owner] ?? 0) + 1;
  }
  return {
    file_count: files.length,
    claim_count: claims.length,
    stop_gate_count: claims.filter((claim) => claim.stop_gate !== 'none').length,
    risk_class_counts: sortedCounts(riskClassCounts),
    source_status_counts: sortedCounts(sourceStatusCounts),
    surface_counts: sortedCounts(surfaceCounts),
    status_counts: sortedCounts(statusCounts),
    owner_counts: sortedCounts(ownerCounts),
  };
}

const HISTORICAL_ANCHORS = Object.freeze([
  Object.freeze({
    anchor_id: 'grabovica_uzdol_massacres_1993',
    event_file: 'data/scenarios/events/war_1993.json',
    essay_file: 'data/scenarios/essays/grabovica_uzdol_massacres_1993.json',
    expected_turn_min: 74,
    expected_turn_max: 76,
  }),
  Object.freeze({
    anchor_id: 'operation_neretva_93_1993',
    event_file: 'data/scenarios/events/war_1993.json',
    essay_file: 'data/scenarios/essays/operation_neretva_93_1993.json',
    expected_turn_min: 74,
    expected_turn_max: 76,
  }),
]);

async function buildHistoricalAnchors(rootDir) {
  const anchors = [];
  for (const contract of HISTORICAL_ANCHORS) {
    const eventAbsolute = path.join(rootDir, contract.event_file);
    const essayAbsolute = path.join(rootDir, contract.essay_file);
    const eventExists = await pathExists(eventAbsolute);
    const essayExists = await pathExists(essayAbsolute);
    let event = null;
    let essay = null;
    if (eventExists) {
      const rows = JSON.parse(await fs.readFile(eventAbsolute, 'utf8'));
      event = Array.isArray(rows) ? rows.find((row) => row?.id === contract.anchor_id) ?? null : null;
    }
    if (essayExists) essay = JSON.parse(await fs.readFile(essayAbsolute, 'utf8'));
    const actualMin = Number.isInteger(event?.trigger?.turn_min) ? event.trigger.turn_min : null;
    const actualMax = Number.isInteger(event?.trigger?.turn_max) ? event.trigger.turn_max : actualMin;
    const eventWindow = actualMin === null
      ? null
      : actualMin === actualMax ? `turn ${actualMin}` : `turns ${actualMin}-${actualMax}`;
    const checks = {
      event_in_1993_file: eventExists && event !== null && contract.event_file.endsWith('war_1993.json'),
      essay_in_1993_file: essayExists && essay?.event_id === contract.anchor_id && contract.essay_file.endsWith('_1993.json'),
      september_window: actualMin === contract.expected_turn_min && actualMax === contract.expected_turn_max,
    };
    const eventCitation = event
      ? CITATION_KEYS.flatMap((key) => flattenSourceValues(event[key])).filter(Boolean)
      : [];
    const essayCitations = Array.isArray(essay?.sources)
      ? essay.sources.flatMap(flattenSourceValues)
      : [];
    const essayCategory = asNonEmptyString(essay?.category);
    const essaySourceFloor = essayCategory ? SOURCE_FLOORS[essayCategory] ?? null : null;
    const authoredProvenance = {
      event_citations: [...new Set(eventCitation)].sort(compareText),
      event_source_tier: asNonEmptyString(event?.source_tier),
      event_source_note: asNonEmptyString(event?.source_note),
      essay_citations: [...new Set(essayCitations)].sort(compareText),
      essay_source_tier: asNonEmptyString(essay?.source_tier),
      essay_category: essayCategory,
      required_essay_source_floor: essaySourceFloor,
    };
    const provenanceGaps = [];
    if (authoredProvenance.event_citations.length === 0) provenanceGaps.push('event_citation');
    if (!authoredProvenance.event_source_note) provenanceGaps.push('event_source_note');
    if (!authoredProvenance.event_source_tier) provenanceGaps.push('event_source_tier');
    if (authoredProvenance.essay_citations.length === 0) provenanceGaps.push('essay_citation');
    if (!authoredProvenance.essay_source_tier) provenanceGaps.push('essay_source_tier');
    if (typeof essaySourceFloor === 'number' && authoredProvenance.essay_citations.length < essaySourceFloor) {
      provenanceGaps.push('essay_source_floor');
    }
    const chronologyStatus = Object.values(checks).every(Boolean) ? 'pass' : 'blocked';
    const provenanceStatus = provenanceGaps.length === 0 ? 'pass' : 'blocked';
    anchors.push({
      anchor_id: contract.anchor_id,
      event_file: contract.event_file,
      essay_file: contract.essay_file,
      event_window: eventWindow,
      expected_window: `turns ${contract.expected_turn_min}-${contract.expected_turn_max}`,
      checks,
      chronology_status: chronologyStatus,
      provenance_status: provenanceStatus,
      status: chronologyStatus === 'pass' && provenanceStatus === 'pass' ? 'pass' : 'blocked',
      owner: 'historian',
      authored_provenance: authoredProvenance,
      provenance_gaps: provenanceGaps.sort(compareText),
    });
  }
  return anchors.sort((a, b) => compareText(a.anchor_id, b.anchor_id));
}

function yearFromText(value) {
  const match = asNonEmptyString(value)?.match(/(?:^|[^0-9])(199[2-5])(?:$|[^0-9])/);
  return match ? Number(match[1]) : null;
}

async function buildContentDateMismatches(rootDir, files) {
  const mismatches = [];
  const eventYears = new Map();
  for (const relativeFile of files.filter((file) => (
    file.startsWith('data/scenarios/events/') || file.startsWith('data/scenarios/essays/')
  ))) {
    const fileYear = yearFromText(relativeFile);
    if (fileYear === null || relativeFile === ESSAY_INDEX_RELATIVE) continue;
    const parsed = JSON.parse(await fs.readFile(path.join(rootDir, relativeFile), 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const subjectId = asNonEmptyString(row.id) ?? path.basename(relativeFile, '.json');
      const statedYear = Number.isInteger(row.year) ? row.year : yearFromText(subjectId);
      if (relativeFile.startsWith('data/scenarios/events/') && asNonEmptyString(row.id)) {
        eventYears.set(row.id, { year: statedYear ?? fileYear, file: relativeFile });
      }
      if (statedYear !== null && statedYear !== fileYear) {
        mismatches.push({
          code: 'event_essay_date_mismatch',
          file: relativeFile,
          subject_id: subjectId,
          file_year: fileYear,
          claim_year: statedYear,
          related_file: null,
          status: 'blocked',
          owner: 'historian',
        });
      }
    }
  }
  for (const relativeFile of files.filter((file) => (
    file.startsWith('data/scenarios/essays/') && file !== ESSAY_INDEX_RELATIVE
  ))) {
    const parsed = JSON.parse(await fs.readFile(path.join(rootDir, relativeFile), 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    const eventId = asNonEmptyString(parsed.event_id);
    if (!eventId) continue;
    const event = eventYears.get(eventId);
    const essayYear = Number.isInteger(parsed.year) ? parsed.year : yearFromText(parsed.id) ?? yearFromText(relativeFile);
    if (event && essayYear !== null && event.year !== essayYear) {
      mismatches.push({
        code: 'event_essay_date_mismatch',
        file: relativeFile,
        subject_id: asNonEmptyString(parsed.id) ?? path.basename(relativeFile, '.json'),
        file_year: essayYear,
        claim_year: event.year,
        related_file: event.file,
        status: 'blocked',
        owner: 'historian',
      });
    }
  }
  return mismatches.sort((a, b) => (
    compareText(a.file, b.file)
    || compareText(a.subject_id, b.subject_id)
    || compareText(a.related_file ?? '', b.related_file ?? '')
  ));
}

async function scanSensitiveClaimInventory(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const files = await listInputFiles(rootDir);
  const claims = [];

  for (const file of files) {
    const surface = classifySurface(file);
    if (file.endsWith('.json')) {
      claims.push(...await scanJsonFile(rootDir, file, surface));
    } else {
      claims.push(...await scanTextFile(rootDir, file, surface));
    }
  }

  sortClaims(claims);
  const historicalAnchors = await buildHistoricalAnchors(rootDir);
  const dateMismatches = await buildContentDateMismatches(rootDir, files);

  return {
    schema_version: SCHEMA_VERSION,
    scan_scope: {
      files,
      src_path_keywords: Array.from(SRC_PATH_KEYWORDS),
      text_extensions: Array.from(SRC_TEXT_EXTENSIONS),
    },
    summary: summarize(files, claims),
    claims,
    historical_anchors: historicalAnchors,
    date_mismatches: dateMismatches,
    policy: {
      excerpt_chars: EXCERPT_CHARS,
      source_floors: SOURCE_FLOORS,
      citation_keys: Array.from(CITATION_KEYS),
      source_keys: Array.from(SOURCE_KEYS),
      claim_prose_keys: Array.from(CLAIM_PROSE_KEYS).sort(compareText),
      term_sets: {
        forbidden_scaffold: Array.from(TERM_SETS.forbidden_scaffold),
        operational_overclaim: Array.from(TERM_SETS.operational_overclaim),
        sensitive_history: Array.from(TERM_SETS.sensitive_history),
      },
      historical_anchor_contracts: HISTORICAL_ANCHORS,
    },
  };
}

function formatMarkdown(result) {
  const lines = [
    '# Codex Sensitive-History Claim Inventory',
    '',
    `Files scanned: ${result.summary.file_count}`,
    `Claims found: ${result.summary.claim_count}`,
    `Stop-gated claims: ${result.summary.stop_gate_count}`,
    '',
    '## Risk Classes',
    '',
    '| Risk Class | Claims |',
    '|---|---:|',
  ];

  const riskKeys = Object.keys(result.summary.risk_class_counts).sort(compareText);
  if (riskKeys.length === 0) {
    lines.push('| none | 0 |');
  } else {
    for (const key of riskKeys) {
      lines.push(`| ${key} | ${result.summary.risk_class_counts[key]} |`);
    }
  }

  lines.push(
    '',
    '## Claims',
    '',
    '| Claim ID | Subject | Ring | File | Line | Source | Status | Owner | Interaction | Claim |',
    '|---|---|---|---|---:|---|---|---|---|---|',
  );
  if (result.claims.length === 0) {
    lines.push('| - | - | - | - | - | - | - | - | - | No claims found. |');
  } else {
    for (const claim of result.claims) {
      lines.push(`| ${claim.claim_id} | ${claim.subject_id} | ${claim.ring} | ${claim.file} | ${claim.line} | ${claim.source_status} | ${claim.status} | ${claim.owner} | ${claim.player_interaction_type} | ${claim.claim.replace(/\|/g, '\\|')} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function argValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const markdown = args.includes('--markdown');
  const rootDir = argValue(args, '--root', argValue(args, '--root-dir', process.cwd()));
  const outPath = argValue(args, '--out');
  const result = await scanSensitiveClaimInventory({ rootDir });
  const content = json && !markdown
    ? stableStringify(result)
    : formatMarkdown(result);

  if (outPath) {
    await fs.writeFile(outPath, content);
  } else {
    process.stdout.write(content);
  }
  if (args.includes('--strict')) {
    const blockedClaims = result.claims.filter((claim) => claim.status !== 'documented').length;
    const failedAnchors = result.historical_anchors.filter((anchor) => anchor.status !== 'pass').length;
    if (blockedClaims > 0 || failedAnchors > 0 || result.date_mismatches.length > 0) process.exitCode = 2;
  }
}

module.exports = {
  classifySurface,
  findMatchedTerms,
  formatMarkdown,
  listInputFiles,
  makeClaimId,
  scanSensitiveClaimInventory,
  stableStringify,
  buildHistoricalAnchors,
  buildContentDateMismatches,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
