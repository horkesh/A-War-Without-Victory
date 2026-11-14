/**
 * Third-party notices: deterministic collection and rendering.
 *
 * The shipped npm set is read from package-lock.json, never from whatever happens
 * to be installed: every non-dev lockfile entry (root production dependencies and
 * the `awwv-map` workspace's dependencies, which Vite bundles into the tactical
 * map), plus the build/runtime packages listed in RUNTIME_EXTRAS. Licence and
 * copyright text comes from each installed package's own files.
 *
 * Determinism: output is sorted with strictCompare, carries no timestamps or
 * absolute paths, and normalises line endings. Platform-specific native packages
 * (lockfile `os`/`cpu`) are never read from node_modules, because only the host
 * platform's variant is installed; they inherit their parent package's licence
 * record instead, so the file is identical on Windows, Linux and macOS.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const NOTICES_FILE = 'THIRD_PARTY_NOTICES.md';
export const STATIC_SECTIONS_FILE = 'tools/licensing/third_party_notices_static.md';
export const GENERATOR_COMMAND = 'node tools/licensing/generate_third_party_notices.mjs';
export const PACKAGES_START = '<!-- npm-packages:start -->';
export const PACKAGES_END = '<!-- npm-packages:end -->';

/**
 * Packages the lockfile marks as dev-only that nevertheless ship.
 * - electron: the packaged app is the Electron runtime (Chromium + Node.js).
 * - tailwindcss: its generated base layer (Preflight) is emitted into the tactical-map CSS.
 */
export const RUNTIME_EXTRAS = Object.freeze([
  { name: 'electron', reason: 'Desktop runtime. Packaged builds also carry Electron\'s own `LICENSE` and `LICENSES.chromium.html`.' },
  { name: 'tailwindcss', reason: 'Build tool. Its generated base CSS (Preflight) ships in the tactical-map stylesheet.' },
]);

const MAX_TABLE_COPYRIGHT_LINES = 3;
/** Licence label for a package whose lockfile entry and package.json declare none. */
export const NOT_DECLARED = 'NOT DECLARED';

export function strictCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normaliseText(text) {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}

function packageNameFromPath(lockPath, entry) {
  if (entry?.name) return entry.name;
  const marker = 'node_modules/';
  const index = lockPath.lastIndexOf(marker);
  return index === -1 ? lockPath : lockPath.slice(index + marker.length);
}

export function normaliseLicenseField(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const parts = value.map((item) => normaliseLicenseField(item)).filter(Boolean);
    return parts.length > 1 ? `(${parts.join(' OR ')})` : (parts[0] ?? '');
  }
  if (typeof value === 'object' && typeof value.type === 'string') return value.type.trim();
  return '';
}

/**
 * Every package that ships in the app, keyed by name@version, from the lockfile alone.
 * @returns {Array<{ key: string, name: string, version: string, lockLicense: string,
 *   lockPaths: string[], platformSpecific: boolean, extraReason: string | null }>}
 */
export function collectShippedPackages(lock, extras = RUNTIME_EXTRAS) {
  const packages = lock?.packages;
  if (!packages || typeof packages !== 'object') {
    throw new Error('package-lock.json has no "packages" map (lockfileVersion 2+ required).');
  }
  const byKey = new Map();
  const add = (lockPath, entry, extraReason) => {
    const name = packageNameFromPath(lockPath, entry);
    const version = entry.version ?? '';
    if (!version) throw new Error(`Lockfile entry ${lockPath} has no version.`);
    const key = `${name}@${version}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.lockPaths.push(lockPath);
      if (extraReason && !existing.extraReason) existing.extraReason = extraReason;
      return;
    }
    byKey.set(key, {
      key,
      name,
      version,
      lockLicense: normaliseLicenseField(entry.license),
      lockPaths: [lockPath],
      platformSpecific: Boolean(entry.os || entry.cpu),
      extraReason: extraReason ?? null,
    });
  };

  for (const lockPath of Object.keys(packages).sort(strictCompare)) {
    const entry = packages[lockPath];
    if (!lockPath.includes('node_modules/')) continue; // root project and workspace sources are first-party
    if (entry.link) continue; // workspace symlink; its dependencies have their own entries
    if (entry.dev === true) continue; // reachable only from devDependencies
    add(lockPath, entry, null);
  }
  for (const extra of extras) {
    const lockPath = `node_modules/${extra.name}`;
    const entry = packages[lockPath];
    if (!entry) throw new Error(`Runtime extra ${extra.name} is not in package-lock.json.`);
    add(lockPath, entry, extra.reason);
  }
  for (const record of byKey.values()) record.lockPaths.sort(strictCompare);
  return [...byKey.values()].sort((a, b) => strictCompare(a.name, b.name) || strictCompare(a.version, b.version));
}

const LICENSE_FILE_PATTERN = /^(licen[cs]e|copying|unlicense)([.\-_].*)?$/i;
const NOTICE_FILE_PATTERN = /^notice([.\-_].*)?$/i;
const TEMPLATE_COPYRIGHT = /\[yyyy\]|\{yyyy\}|<year>|\[year\]|\{year\}|\[name of copyright owner\]|<copyright holders?>|\[fullname\]|<owner>/i;
const NON_NOTICE_COPYRIGHT = /copyright (notice|license|owner|holder|statement|and (related|license))|copyright\s*$|copyright law/i;

// A notice line starts with a capitalised "Copyright" (lower-case "copyright" at line start is a
// wrapped sentence, e.g. Blue Oak's "...infringe that contributor's / copyright in it."), or with
// "(c)"/"©" followed by a year (Apache-2.0 §4 item "(c) You must retain ..." is not a notice), or
// carries "Copyright (c) <year>" mid-line ("pngjs original work Copyright (c) 2015 ...").
const LINE_START_COPYRIGHT = /^(Portions )?(Copyright\b|COPYRIGHT\b)|^(\([cC]\)|©)\s*\d{4}/;
const MID_LINE_COPYRIGHT = /\bCopyright\s*(\([cC]\)|©)?\s*\d{4}/;

/** Copyright lines from a licence text, in file order, de-duplicated. */
export function extractCopyrightLines(text) {
  const lines = normaliseText(text).split('\n');
  const found = [];
  for (const raw of lines) {
    const line = raw.replace(/^[\s#*>\-/]+/, '').replace(/\s+/g, ' ').trim();
    if (!LINE_START_COPYRIGHT.test(line) && !MID_LINE_COPYRIGHT.test(line)) continue;
    if (TEMPLATE_COPYRIGHT.test(line) || NON_NOTICE_COPYRIGHT.test(line)) continue;
    if (!found.includes(line)) found.push(line);
  }
  return found;
}

/** Author name only: e-mail addresses and URLs from package.json are not reproduced. */
export function formatAuthor(author) {
  let name = '';
  if (typeof author === 'string') name = author;
  else if (author && typeof author === 'object' && author.name) name = String(author.name);
  return name.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function readTextFiles(dir, pattern) {
  return readdirSync(dir)
    .filter((file) => pattern.test(file))
    .sort(strictCompare)
    .map((file) => ({ file, text: normaliseText(readFileSync(join(dir, file), 'utf8')) }))
    .filter((entry) => entry.text.length > 0);
}

/**
 * Licence record for one package, read from its first installed lockfile path.
 * Platform-specific packages are resolved later from their parent package.
 */
export function readInstalledLicenseRecord(rootDir, pkg) {
  const lockPath = pkg.lockPaths[0];
  const dir = join(rootDir, ...lockPath.split('/'));
  if (!existsSync(join(dir, 'package.json'))) {
    throw new Error(
      `${pkg.key} is in package-lock.json but not installed at ${lockPath}. Run \`npm ci\` before generating notices.`,
    );
  }
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const licenseFiles = readTextFiles(dir, LICENSE_FILE_PATTERN);
  const noticeFiles = readTextFiles(dir, NOTICE_FILE_PATTERN);
  const license = pkg.lockLicense || normaliseLicenseField(manifest.license) || normaliseLicenseField(manifest.licenses);
  const copyright = [];
  for (const entry of [...licenseFiles, ...noticeFiles]) {
    for (const line of extractCopyrightLines(entry.text)) if (!copyright.includes(line)) copyright.push(line);
  }
  return {
    license: license || NOT_DECLARED,
    copyright,
    author: formatAuthor(manifest.author),
    licenseTexts: licenseFiles.map((entry) => entry.text),
    noticeTexts: noticeFiles.map((entry) => entry.text),
    inheritedFrom: null,
  };
}

/** Parent for a platform-specific native package, e.g. @napi-rs/canvas-win32-x64-msvc -> @napi-rs/canvas. */
export function findPlatformParent(pkg, packages) {
  const candidates = packages
    .filter((other) => !other.platformSpecific && other.version === pkg.version && pkg.name.startsWith(`${other.name}-`))
    .sort((a, b) => b.name.length - a.name.length || strictCompare(a.name, b.name));
  return candidates[0] ?? null;
}

/** Full licence records for the shipped set. Throws if anything required is missing. */
export function resolveLicenseRecords(rootDir, packages) {
  const records = new Map();
  for (const pkg of packages) {
    if (pkg.platformSpecific) continue;
    records.set(pkg.key, readInstalledLicenseRecord(rootDir, pkg));
  }
  for (const pkg of packages) {
    if (!pkg.platformSpecific) continue;
    const parent = findPlatformParent(pkg, packages);
    if (!parent) {
      throw new Error(`${pkg.key} is platform-specific but no same-version parent package ships; add a parent rule.`);
    }
    const parentRecord = records.get(parent.key);
    records.set(pkg.key, {
      ...parentRecord,
      license: pkg.lockLicense || parentRecord.license,
      inheritedFrom: parent.key,
    });
  }
  return records;
}

function escapeCell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function copyrightCell(record) {
  if (record.inheritedFrom) {
    return `Native binary of ${record.inheritedFrom}; same licence and copyright.`;
  }
  if (record.copyright.length === 0) {
    const author = record.author ? ` Author: ${record.author}.` : '';
    const file = record.licenseTexts.length === 0 ? ' No licence file published.' : '';
    return `No copyright line published.${author}${file}`.trim();
  }
  const shown = record.copyright.slice(0, MAX_TABLE_COPYRIGHT_LINES);
  const more = record.copyright.length - shown.length;
  return more > 0 ? `${shown.join('; ')}; and ${more} more in the licence text` : shown.join('; ');
}

function fenceFor(text) {
  let longest = 2;
  for (const match of text.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  return '`'.repeat(longest + 1);
}

function textBlocks(packages, records, selector) {
  const groups = new Map();
  for (const pkg of packages) {
    const record = records.get(pkg.key);
    if (record.inheritedFrom) continue;
    for (const text of selector(record)) {
      const digest = createHash('sha256').update(text).digest('hex');
      const group = groups.get(digest) ?? { text, keys: [] };
      if (!group.keys.includes(pkg.key)) group.keys.push(pkg.key);
      groups.set(digest, group);
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, keys: [...group.keys].sort(strictCompare) }))
    .sort((a, b) => strictCompare(a.keys[0], b.keys[0]) || strictCompare(a.text, b.text));
}

function renderTextBlocks(blocks, label) {
  const out = [];
  blocks.forEach((block, index) => {
    const fence = fenceFor(block.text);
    out.push(`### ${label} ${String(index + 1).padStart(3, '0')}`, '');
    out.push(`Applies to: ${block.keys.map((key) => `\`${key}\``).join(', ')}`, '');
    out.push(`${fence}text`, block.text, fence, '');
  });
  return out;
}

/** The complete notices document. Pure: same inputs, same bytes. */
export function renderNotices({ packages, records, staticSections }) {
  const licenseCounts = new Map();
  for (const pkg of packages) {
    const license = records.get(pkg.key).license;
    licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1);
  }
  const noLicenseFile = packages.filter((pkg) => {
    const record = records.get(pkg.key);
    return !record.inheritedFrom && record.licenseTexts.length === 0;
  });

  const out = [];
  out.push('# Third-Party Notices', '');
  out.push(
    'A War Without Victory is proprietary software of Pyrrhic Games (see `LICENSE`). It includes third-party',
    'software, fonts, map and elevation data, and recorded audio samples. Each keeps its own licence, and',
    'those terms govern that component. This file lists them.',
    '',
  );
  out.push(
    `> Generated by \`${GENERATOR_COMMAND}\``,
    `> from \`package-lock.json\`, the installed packages' own licence files and`,
    `> \`${STATIC_SECTIONS_FILE}\`. Do not edit it by hand: change those inputs and`,
    '> regenerate. `tests/third_party_notices.test.ts` fails when a shipped npm package is missing.',
    '',
  );
  out.push('## Contents', '');
  out.push('1. Fonts, map and elevation data, audio samples and other bundled content');
  out.push('2. npm packages that ship in the app');
  out.push('3. Licence and notice texts for those packages', '');
  out.push(normaliseText(staticSections), '');

  out.push('## 2. npm packages that ship in the app', '');
  out.push(
    'The shipped set is every non-development entry in `package-lock.json`: the root production',
    'dependencies (copied into the packaged app), the tactical-map workspace dependencies (bundled by',
    'Vite), their transitive dependencies, and the runtime/build packages noted below. One row per',
    'name and version. Platform-specific native binaries are listed for every platform; a build',
    'carries only its own. Build, test and data-pipeline tools are development dependencies: they',
    'do not ship and are not listed.',
    '',
  );
  const extras = packages.filter((pkg) => pkg.extraReason);
  if (extras.length > 0) {
    out.push('Shipped although the lockfile marks them as development packages:', '');
    for (const pkg of extras) out.push(`- \`${pkg.key}\`: ${pkg.extraReason}`);
    out.push('');
  }
  out.push(`Packages: ${packages.length}.`, '');
  out.push('| Licence | Packages |', '| --- | ---: |');
  for (const [license, count] of [...licenseCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
    out.push(`| ${escapeCell(license)} | ${count} |`);
  }
  out.push('');
  out.push(
    'Where a package offers a choice of licences (for example `MIT OR GPL-3.0-or-later`), Pyrrhic Games',
    'uses it under the first permissive option listed.',
    '',
  );
  out.push(PACKAGES_START);
  out.push('| Package | Version | Licence | Copyright |', '| --- | --- | --- | --- |');
  for (const pkg of packages) {
    const record = records.get(pkg.key);
    out.push(`| ${escapeCell(pkg.name)} | ${escapeCell(pkg.version)} | ${escapeCell(record.license)} | ${escapeCell(copyrightCell(record))} |`);
  }
  out.push(PACKAGES_END, '');
  const declared = noLicenseFile.filter((pkg) => records.get(pkg.key).license !== NOT_DECLARED);
  const undeclared = packages.filter((pkg) => records.get(pkg.key).license === NOT_DECLARED);
  if (declared.length > 0) {
    out.push(
      'These packages publish no licence file. They are used under the licence their `package.json`',
      `declares: ${declared.map((pkg) => `\`${pkg.key}\``).join(', ')}.`,
      '',
    );
  }
  if (undeclared.length > 0) {
    out.push(
      `These packages declare no licence in \`package.json\` and publish no licence file, so their terms are`,
      `not confirmed: ${undeclared.map((pkg) => `\`${pkg.key}\``).join(', ')}.`,
      '',
    );
  }

  out.push('## 3. Licence and notice texts', '');
  out.push(
    'Each distinct licence text appears once, with the packages it applies to. Apache-2.0 `NOTICE`',
    'files follow the licence texts.',
    '',
  );
  out.push(...renderTextBlocks(textBlocks(packages, records, (record) => record.licenseTexts), 'Licence text'));
  const notices = textBlocks(packages, records, (record) => record.noticeTexts);
  if (notices.length > 0) out.push(...renderTextBlocks(notices, 'Notice'));

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** Package rows (name@version) recorded between the package markers of a notices document. */
export function parseNoticePackageKeys(markdown) {
  const start = markdown.indexOf(PACKAGES_START);
  const end = markdown.indexOf(PACKAGES_END);
  if (start === -1 || end === -1 || end < start) return null;
  const keys = [];
  for (const line of markdown.slice(start + PACKAGES_START.length, end).split('\n')) {
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replace(/\\\|/g, '|').replace(/\\\\/g, '\\'));
    if (cells.length < 4 || cells[0] === 'Package' || /^-+$/.test(cells[0])) continue;
    keys.push(`${cells[0]}@${cells[1]}`);
  }
  return keys;
}

/** Shipped packages missing from, and stale rows present in, a notices document. */
export function checkNoticesCoverage(markdown, packages) {
  const recorded = parseNoticePackageKeys(markdown);
  if (recorded === null) {
    return { missing: packages.map((pkg) => pkg.key), stale: [], markersFound: false };
  }
  const recordedSet = new Set(recorded);
  const shippedSet = new Set(packages.map((pkg) => pkg.key));
  return {
    missing: packages.map((pkg) => pkg.key).filter((key) => !recordedSet.has(key)),
    stale: [...recordedSet].filter((key) => !shippedSet.has(key)).sort(strictCompare),
    markersFound: true,
  };
}

/** Generate the notices document for a repository root. */
export function buildNoticesForRoot(rootDir, { extras = RUNTIME_EXTRAS } = {}) {
  const lock = JSON.parse(readFileSync(join(rootDir, 'package-lock.json'), 'utf8'));
  const packages = collectShippedPackages(lock, extras);
  const records = resolveLicenseRecords(rootDir, packages);
  const staticSections = readFileSync(join(rootDir, ...STATIC_SECTIONS_FILE.split('/')), 'utf8');
  return { packages, records, markdown: renderNotices({ packages, records, staticSections }) };
}
