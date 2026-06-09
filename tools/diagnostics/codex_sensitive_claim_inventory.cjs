#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEMA_VERSION = 1;
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

const SOURCE_KEYS = Object.freeze([
  'citation',
  'citations',
  'historical_source',
  'historical_sources',
  'reference',
  'references',
  'source',
  'source_note',
  'source_notes',
  'sources',
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

function lineForOffset(text, offset) {
  if (offset < 0) {
    return 1;
  }
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text[index] === '\n') {
      line += 1;
    }
  }
  return line;
}

function lineForJsonString(raw, value) {
  const encoded = JSON.stringify(value);
  const offset = raw.indexOf(encoded);
  return lineForOffset(raw, offset);
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
  if (surface === 'essay') {
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
  const cited = SOURCE_KEYS.some((key) => (
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
  }
  const fileYear = relativeFile.match(/\b(199[2-5])\b/);
  return fileYear ? fileYear[1] : null;
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

function makeClaim({ surface, file, line, fieldPath, text, matchedTerms, sourceInfo, dateWindow }) {
  const riskClass = riskFor(surface, text, matchedTerms);
  return {
    claim_id: makeClaimId(file, line, fieldPath, matchedTerms),
    surface,
    file,
    line,
    field_path: fieldPath,
    excerpt: makeExcerpt(text, matchedTerms),
    matched_terms: matchedTerms,
    actor_faction: actorFactionFor(text),
    date_window: dateWindow,
    source_status: sourceInfo.status,
    risk_class: riskClass,
    stop_gate: stopGateFor(riskClass),
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
  const claims = [];

  const collect = (text, fieldPath, ancestors, rootValue) => {
    const matchedTerms = findMatchedTerms(text);
    if (matchedTerms.length === 0) {
      return;
    }
    const sourceInfo = sourceStatusFor(surface, rootValue, ancestors);
    claims.push(makeClaim({
      surface,
      file: relativeFile,
      line: lineForJsonString(raw, text),
      fieldPath,
      text,
      matchedTerms,
      sourceInfo,
      dateWindow: dateWindowFor(relativeFile, ancestors),
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
        (text, fieldPath, ancestors) => collect(text, fieldPath, ancestors, essay),
        [parsed, essay],
        ['$', `.${essayKey}`, '.dynamic_sections'],
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
    }));
  });
  return claims;
}

function summarize(files, claims) {
  const riskClassCounts = {};
  const sourceStatusCounts = {};
  const surfaceCounts = {};
  for (const claim of claims) {
    riskClassCounts[claim.risk_class] = (riskClassCounts[claim.risk_class] ?? 0) + 1;
    sourceStatusCounts[claim.source_status] = (sourceStatusCounts[claim.source_status] ?? 0) + 1;
    surfaceCounts[claim.surface] = (surfaceCounts[claim.surface] ?? 0) + 1;
  }
  return {
    file_count: files.length,
    claim_count: claims.length,
    stop_gate_count: claims.filter((claim) => claim.stop_gate !== 'none').length,
    risk_class_counts: sortedCounts(riskClassCounts),
    source_status_counts: sortedCounts(sourceStatusCounts),
    surface_counts: sortedCounts(surfaceCounts),
  };
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

  return {
    schema_version: SCHEMA_VERSION,
    scan_scope: {
      files,
      src_path_keywords: Array.from(SRC_PATH_KEYWORDS),
      text_extensions: Array.from(SRC_TEXT_EXTENSIONS),
    },
    summary: summarize(files, claims),
    claims,
    policy: {
      excerpt_chars: EXCERPT_CHARS,
      source_floors: SOURCE_FLOORS,
      source_keys: Array.from(SOURCE_KEYS),
      term_sets: {
        forbidden_scaffold: Array.from(TERM_SETS.forbidden_scaffold),
        operational_overclaim: Array.from(TERM_SETS.operational_overclaim),
        sensitive_history: Array.from(TERM_SETS.sensitive_history),
      },
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
    '| Claim ID | Surface | File | Line | Source | Risk | Terms | Excerpt |',
    '|---|---|---|---:|---|---|---|---|',
  );
  if (result.claims.length === 0) {
    lines.push('| - | - | - | - | - | - | - | No claims found. |');
  } else {
    for (const claim of result.claims) {
      lines.push(`| ${claim.claim_id} | ${claim.surface} | ${claim.file} | ${claim.line} | ${claim.source_status} | ${claim.risk_class} | ${claim.matched_terms.join(', ')} | ${claim.excerpt.replace(/\|/g, '\\|')} |`);
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
}

module.exports = {
  classifySurface,
  findMatchedTerms,
  formatMarkdown,
  listInputFiles,
  makeClaimId,
  scanSensitiveClaimInventory,
  stableStringify,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
