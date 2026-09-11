#!/usr/bin/env node
/**
 * Validate the life-lessons index's own pointers.
 *
 * An index entry may say `see docs/life_lessons/process.md`. That is a promise: the full lesson
 * lives there. When it does not, the pointer is worse than absent — a reader follows it, finds
 * nothing, and concludes the lesson does not exist. The body is usually still in the index, so
 * nothing is lost except the reader's time and their trust in every other pointer on the page.
 *
 * THE COUNT THIS REPLACES, AND THE CORRECTION TO THE CORRECTION.
 * `docs/open_gates.yml` recorded "160 of 244 entries carry a broken pointer". Scanning only the
 * index gave 23 pointers, which made 160 look invented — and that conclusion was itself wrong,
 * because the archive carries another 141. There are 164 pointers across the corpus. So the
 * register was counting the right corpus and was wrong about how many were BROKEN: 49, not 160.
 *
 * Both errors have the same cause and it is the one worth remembering: a number nobody
 * recomputes. The first was written from a pattern that over-counted; the second from a scan of
 * half the corpus. Checking half and calling the other half a phantom is the same mistake facing
 * the other way. This tool exists so the figure is a command, not a memory.
 *
 * MATCHING IS DELIBERATELY LOOSE. Titles drift — punctuation, an added star, a reworded clause.
 * Comparison is on letters and digits only, against the first 60 characters of the title, so a
 * lesson that was genuinely moved still counts as present after light editing. A checker that
 * cries wolf over a comma gets switched off.
 *
 * Usage:
 *   node tools/validate_lesson_pointers.cjs           exit 1 if any pointer is broken
 *   node tools/validate_lesson_pointers.cjs --list    show every pointer and its verdict
 *   node tools/validate_lesson_pointers.cjs --json    machine-readable
 *
 * Deterministic: no wall-clock reads, no randomness, sorted output.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX = 'docs/life_lessons.md';

/**
 * Both files that CITE topic files, not just the index.
 *
 * Scanning the index alone gave 23 pointers and made the register's "160" look fabricated. The
 * archive carries 141 more, so 164 pointers exist and the original figure was counting the whole
 * corpus — it was wrong about how many were BROKEN (49, not 160), not invented. Checking half a
 * corpus and reporting the other half as a phantom is the same error in the opposite direction,
 * which is why the scan is now the full set.
 */
const SCANNED = [INDEX, 'docs/life_lessons/session_archive.md'];
const POINTER = /see\s+`?(docs\/life_lessons\/[a-z_]+\.md)`?/i;

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Letters and digits only, so punctuation drift does not break a real match. */
function normalise(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** The distinctive part of a heading: no [Tag], no stars, no trailing pointer. */
function titleOf(heading) {
  return heading
    .replace(/^#+\s*/, '')
    .replace(/^-\s*/, '')
    .replace(/^\*\*/, '')
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^[★☆\s]+/, '')
    .replace(/\s*[—-]\s*see\s+`?docs\/life_lessons\/[a-z_]+\.md`?.*$/i, '')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * Every line of the index that promises a topic file, with the title it promises.
 *
 * A pointer can sit in a BULLET under a heading rather than in the heading itself, and then the
 * lesson it names is the HEADING's, not the bullet's. Attributing it to the bullet produced a
 * false positive on the only such case in the file: the bullet reads "RESOLVED — fix confirmed
 * committed…", which is a status note, and the lesson was sitting in calibration.md all along.
 */
function collectPointers(repoRoot = REPO_ROOT) {
  const rows = [];
  for (const file of SCANNED) {
    const full = path.join(repoRoot, file);
    if (!fs.existsSync(full)) continue;
    let lastHeading = '';
    fs.readFileSync(full, 'utf8').split('\n').forEach((line, index) => {
      if (/^#{1,6}\s/.test(line)) lastHeading = line;
      const match = POINTER.exec(line);
      if (!match) return;
      const isHeading = /^#{1,6}\s/.test(line);
      rows.push({
        file,
        line: index + 1,
        topic: match[1],
        title: titleOf(isHeading || !lastHeading ? line : lastHeading),
      });
    });
  }
  return rows.sort((a, b) => (a.file === b.file
    ? a.line - b.line
    : strictCompare(a.file, b.file)));
}

/**
 * Is this pointer's lesson actually in the topic file it names?
 *
 * Two-tier prefix match. A title can be REWORDED when it moves — "Slot cap must exclude
 * recovery-phase ops" became "Slot cap must exclude completed (recovery-phase) ops" — and a
 * 60-character prefix cannot survive a word inserted in the middle. So a shorter 25-character
 * prefix is tried as a fallback: still distinctive enough to mean something, short enough to
 * survive ordinary editing. The alternative, scoring shared words, matches almost anything
 * against a large topic file and would quietly stop catching real breaks.
 */
function pointerResolves(row, repoRoot = REPO_ROOT) {
  const target = path.join(repoRoot, row.topic);
  if (!fs.existsSync(target)) return false;
  if (row.title.length < 8) return true; // nothing distinctive to look for; not a failure
  const haystack = normalise(fs.readFileSync(target, 'utf8'));
  const title = normalise(row.title);
  return haystack.includes(title.slice(0, 60)) || haystack.includes(title.slice(0, 25));
}

/** Sorted human-readable errors; empty means every pointer keeps its promise. */
function validatePointers(repoRoot = REPO_ROOT) {
  return collectPointers(repoRoot)
    .filter((row) => !pointerResolves(row, repoRoot))
    .map((row) => `${row.file}:${row.line}: points at ${row.topic}, which does not contain "${row.title.slice(0, 60)}"`)
    .sort(strictCompare);
}

/**
 * The known-broken set, recorded 2026-09-11. A RATCHET, not an allowance.
 *
 * Fifteen pointers promise a topic file that never held the lesson — the bodies live in the index.
 * Making each one true means moving a lesson or dropping its pointer, which is a curation
 * judgement about the corpus rather than a mechanical rewrite, so the backlog stands. What is
 * mechanical, and what this enforces, is that the backlog may not GROW.
 */
function loadBaseline(repoRoot = REPO_ROOT) {
  const file = path.join(repoRoot, 'tools', 'lesson_pointer_baseline.json');
  if (!fs.existsSync(file)) return new Set();
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Set((parsed.broken ?? []).map((row) => `${row.topic}::${row.title}`));
}

/** Broken pointers that are NOT already in the baseline — the only ones that should fail a build. */
function newlyBroken(repoRoot = REPO_ROOT) {
  const baseline = loadBaseline(repoRoot);
  return collectPointers(repoRoot)
    .filter((row) => !pointerResolves(row, repoRoot))
    .filter((row) => !baseline.has(`${row.topic}::${row.title.slice(0, 90)}`))
    .map((row) => `${row.file}:${row.line}: NEW broken pointer to ${row.topic} — "${row.title.slice(0, 60)}"`)
    .sort(strictCompare);
}

/** Baseline entries that now resolve: the list must shrink when someone fixes one. */
function staleBaseline(repoRoot = REPO_ROOT) {
  const stillBroken = new Set(
    collectPointers(repoRoot)
      .filter((row) => !pointerResolves(row, repoRoot))
      .map((row) => `${row.topic}::${row.title.slice(0, 90)}`),
  );
  return [...loadBaseline(repoRoot)]
    .filter((key) => !stillBroken.has(key))
    .map((key) => `baseline lists "${key.split('::')[1]}" as broken, but it now resolves — remove it`)
    .sort(strictCompare);
}

function main() {
  const args = process.argv.slice(2);
  const rows = collectPointers().map((row) => ({ ...row, resolves: pointerResolves(row) }));
  const broken = rows.filter((row) => !row.resolves);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ total: rows.length, broken: broken.length, pointers: rows }));
    process.exit(0);
  }

  if (args.includes('--list')) {
    for (const row of rows) {
      console.log(`${row.resolves ? "[ OK ]" : "[MISS]"} ${row.file}:${String(row.line).padStart(4)}  ${row.topic}`);
      console.log(`        ${row.title.slice(0, 92)}`);
    }
    console.log(`\n${rows.length} pointer(s), ${broken.length} broken`);
    process.exit(0);
  }

  // The mode CI uses: the backlog may not grow, and must shrink when someone fixes one.
  if (args.includes('--ratchet')) {
    const added = newlyBroken();
    const stale = staleBaseline();
    if (added.length === 0 && stale.length === 0) {
      console.log(`lesson pointers: ratchet OK — ${broken.length} known-broken, none new`);
      process.exit(0);
    }
    for (const message of [...added, ...stale]) console.error(`  - ${message}`);
    console.error(
      added.length > 0
        ? '\nA NEW pointer promises a topic file that does not contain it. Move the lesson, or\n'
          + 'do not write the pointer. The backlog in tools/lesson_pointer_baseline.json may shrink,\n'
          + 'never grow.'
        : '\nA baseline entry now resolves — delete its line from tools/lesson_pointer_baseline.json\n'
          + 'so the remaining count stays honest.',
    );
    process.exit(1);
  }

  if (broken.length > 0) {
    console.error(`lesson pointers: ${broken.length} of ${rows.length} broken`);
    for (const row of broken) {
      console.error(`  - ${row.file}:${row.line} -> ${row.topic}`);
      console.error(`      "${row.title.slice(0, 80)}"`);
    }
    console.error('\nEither move the lesson body into that topic file, or drop the pointer.');
    console.error('A pointer that leads nowhere costs more than no pointer: the reader concludes');
    console.error('the lesson does not exist, and trusts the others less.');
    process.exit(1);
  }

  console.log(`lesson pointers: OK — ${rows.length} pointer(s), all resolve`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  collectPointers, pointerResolves, validatePointers,
  loadBaseline, newlyBroken, staleBaseline,
  titleOf, normalise, INDEX,
};
