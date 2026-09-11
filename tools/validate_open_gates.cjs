#!/usr/bin/env node
/**
 * Validate docs/open_gates.yml.
 *
 * The register's whole value is that it is checkable: a gate must name the evidence that
 * would close it, and a gate claimed closed must point at evidence that actually exists.
 * Prose registers rot silently; this one fails a test instead.
 *
 * Usage:
 *   node tools/validate_open_gates.cjs            validate, exit non-zero on any error
 *   node tools/validate_open_gates.cjs --list     print the currently-open rows
 *
 * Deterministic: no wall-clock reads beyond the explicit `--today` override used by tests,
 * no randomness, sorted iteration throughout.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTER_PATH = path.join(REPO_ROOT, 'docs', 'open_gates.yml');

const ALLOWED_STATUS = ['open', 'blocked', 'closed'];
const ALLOWED_KIND = ['acceptance', 'bug', 'friction', 'propagation'];
const REQUIRED_FIELDS = [
  'id', 'lane', 'title', 'status', 'kind', 'opened', 'blocks', 'evidence_required', 'source',
];
const ID_PATTERN = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Read and parse the register. Throws with a useful message if it is unparseable.
 *
 * Parsed under JSON_SCHEMA deliberately: it admits only null/bool/number/string, so no
 * YAML tag can construct a typed object, and unquoted ISO dates arrive as plain strings
 * rather than Date instances. This file is data; nothing in it should ever be evaluated.
 */
function loadRegister(registerPath = REGISTER_PATH) {
  const raw = fs.readFileSync(registerPath, 'utf8');
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${registerPath} did not parse to an object`);
  }
  return parsed;
}

/**
 * Validate a parsed register. Returns a sorted array of human-readable error strings;
 * empty means valid. `today` is injected so the test does not depend on the wall clock.
 */
function validateRegister(register, options = {}) {
  const { today = null, repoRoot = REPO_ROOT } = options;
  const errors = [];
  const push = (message) => errors.push(message);

  if (register.version !== 1) push(`version must be 1, got ${JSON.stringify(register.version)}`);

  const lanes = Array.isArray(register.lanes) ? register.lanes : null;
  if (!lanes || lanes.length === 0) push('lanes must be a non-empty array');

  if (typeof register.updated !== 'string' || !DATE_PATTERN.test(register.updated)) {
    push(`updated must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(register.updated)}`);
  }

  const gates = Array.isArray(register.gates) ? register.gates : null;
  if (!gates) {
    push('gates must be an array');
    return errors.sort();
  }

  const seenIds = new Set();
  const allIds = new Set(gates.map((gate) => gate && gate.id).filter((id) => typeof id === 'string'));

  for (const gate of gates) {
    if (!gate || typeof gate !== 'object') {
      push('encountered a gate entry that is not an object');
      continue;
    }
    const label = typeof gate.id === 'string' ? gate.id : '(missing id)';

    for (const field of REQUIRED_FIELDS) {
      if (gate[field] === undefined) push(`${label}: missing required field \`${field}\``);
    }

    if (typeof gate.id === 'string') {
      if (!ID_PATTERN.test(gate.id)) {
        push(`${label}: id must be SCREAMING-KEBAB-CASE with at least one hyphen`);
      }
      if (seenIds.has(gate.id)) push(`${label}: duplicate id`);
      seenIds.add(gate.id);
    }

    if (lanes && typeof gate.lane === 'string' && !lanes.includes(gate.lane)) {
      push(`${label}: lane \`${gate.lane}\` is not in the declared lanes list`);
    }

    if (typeof gate.status === 'string' && !ALLOWED_STATUS.includes(gate.status)) {
      push(`${label}: status must be one of ${ALLOWED_STATUS.join(' | ')}, got \`${gate.status}\``);
    }

    if (typeof gate.kind === 'string' && !ALLOWED_KIND.includes(gate.kind)) {
      push(`${label}: kind must be one of ${ALLOWED_KIND.join(' | ')}, got \`${gate.kind}\``);
    }

    for (const dateField of ['opened', 'closed']) {
      const value = gate[dateField];
      if (value === undefined || value === null) continue;
      const asString = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
      if (!DATE_PATTERN.test(asString)) {
        push(`${label}: ${dateField} must be an ISO date (YYYY-MM-DD), got \`${asString}\``);
        continue;
      }
      if (today && asString > today) {
        push(`${label}: ${dateField} \`${asString}\` is in the future (today is ${today})`);
      }
    }

    if (typeof gate.evidence_required === 'string' && gate.evidence_required.trim().length < 20) {
      push(`${label}: evidence_required must describe an observable artifact, not a placeholder`);
    }

    if (gate.blocks !== undefined) {
      if (!Array.isArray(gate.blocks)) {
        push(`${label}: blocks must be an array (use [] for none)`);
      } else if (lanes) {
        for (const blocked of gate.blocks) {
          if (!lanes.includes(blocked)) {
            push(`${label}: blocks references unknown lane \`${blocked}\``);
          }
        }
      }
    }

    // A gate is only closed if you can point at what closed it, and that thing exists.
    if (gate.status === 'closed') {
      if (!gate.evidence_path) {
        push(`${label}: status is closed but evidence_path is null`);
      } else if (!fs.existsSync(path.join(repoRoot, gate.evidence_path))) {
        push(`${label}: evidence_path \`${gate.evidence_path}\` does not exist`);
      }
      if (!gate.closed) push(`${label}: status is closed but no \`closed\` date is recorded`);
    } else if (gate.evidence_path) {
      // An open gate may cite partial evidence, but the path still has to be real.
      if (!fs.existsSync(path.join(repoRoot, gate.evidence_path))) {
        push(`${label}: evidence_path \`${gate.evidence_path}\` does not exist`);
      }
    }

    if (typeof gate.source === 'string' && !fs.existsSync(path.join(repoRoot, gate.source))) {
      push(`${label}: source \`${gate.source}\` does not exist`);
    }
  }

  // Roll-up gates must not claim to be closable while something they depend on is open.
  const rollUp = gates.find((gate) => gate && gate.id === 'R7-ACCEPTANCE-ALL-GREEN');
  if (rollUp && rollUp.status === 'closed') {
    const stillOpen = gates
      .filter((gate) => gate && gate.lane === 'R7' && gate.id !== rollUp.id && gate.status !== 'closed')
      .map((gate) => gate.id)
      .sort();
    if (stillOpen.length > 0) {
      push(`R7-ACCEPTANCE-ALL-GREEN is closed while these R7 gates are not: ${stillOpen.join(', ')}`);
    }
  }

  void allIds;
  return errors.sort();
}

/** Rows a human wants when they ask "what is open right now?" */
function openGates(register) {
  return register.gates
    .filter((gate) => gate && gate.status !== 'closed')
    .slice()
    .sort((a, b) => (a.lane === b.lane ? a.id.localeCompare(b.id) : a.lane.localeCompare(b.lane)));
}

function formatList(register) {
  const rows = openGates(register);
  const lines = [`${rows.length} open gate(s) as of ${register.updated}:`, ''];
  for (const gate of rows) {
    const blocks = Array.isArray(gate.blocks) && gate.blocks.length > 0
      ? ` blocks ${gate.blocks.join(',')}`
      : '';
    lines.push(`  [${gate.status.toUpperCase().padEnd(7)}] ${gate.lane.padEnd(4)} ${gate.id}${blocks}`);
    lines.push(`            ${gate.title}`);
  }
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const todayArg = args.find((arg) => arg.startsWith('--today='));
  const today = todayArg ? todayArg.slice('--today='.length) : null;

  let register;
  try {
    register = loadRegister();
  } catch (error) {
    console.error(`open_gates: ${error.message}`);
    process.exit(1);
  }

  const errors = validateRegister(register, { today });
  if (errors.length > 0) {
    console.error(`open_gates: ${errors.length} validation error(s)`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  // --json wins over --list so the two are compatible rather than order-dependent.
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      updated: register.updated,
      total: register.gates.length,
      open: openGates(register).length,
      gates: openGates(register).map((gate) => ({
        id: gate.id,
        lane: gate.lane,
        status: gate.status,
        title: gate.title,
        blocks: Array.isArray(gate.blocks) ? gate.blocks : [],
      })),
    }));
  } else if (args.includes('--list')) {
    console.log(formatList(register));
  } else {
    console.log(`open_gates: OK — ${register.gates.length} gate(s), ${openGates(register).length} open`);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { loadRegister, validateRegister, openGates, formatList, REGISTER_PATH };
