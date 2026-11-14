import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';
import {
  NOTICES_FILE,
  NOT_DECLARED,
  RUNTIME_EXTRAS,
  STATIC_SECTIONS_FILE,
  buildNoticesForRoot,
  checkNoticesCoverage,
  collectShippedPackages,
  extractCopyrightLines,
  formatAuthor,
  parseNoticePackageKeys,
} from '../tools/licensing/third_party_notices.mjs';

const root = process.cwd();
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const mapManifest = JSON.parse(readFileSync(join(root, 'src', 'ui', 'map', 'package.json'), 'utf8'));
const notices = readFileSync(join(root, NOTICES_FILE), 'utf8');
const shipped = collectShippedPackages(lock);
const shippedNames = new Set(shipped.map((pkg) => pkg.name));

describe('THIRD_PARTY_NOTICES.md npm coverage', () => {
  it('lists every shipped npm package by name and version, and no stale rows', () => {
    const coverage = checkNoticesCoverage(notices, shipped);
    expect(coverage.markersFound).toBe(true);
    expect(coverage.missing).toEqual([]);
    expect(coverage.stale).toEqual([]);
    expect(parseNoticePackageKeys(notices)).toHaveLength(shipped.length);
  });

  it('fails when a shipped dependency is missing from the file (positive control)', () => {
    const added = structuredClone(lock);
    added.packages['node_modules/awwv-positive-control'] = { version: '1.2.3', license: 'MIT' };
    expect(checkNoticesCoverage(notices, collectShippedPackages(added)).missing).toEqual(['awwv-positive-control@1.2.3']);

    const bumped = structuredClone(lock);
    bumped.packages['node_modules/maplibre-gl'].version = '99.0.0';
    const bumpedCoverage = checkNoticesCoverage(notices, collectShippedPackages(bumped));
    expect(bumpedCoverage.missing).toEqual(['maplibre-gl@99.0.0']);
    expect(bumpedCoverage.stale).toEqual(['maplibre-gl@4.7.1']);

    expect(checkNoticesCoverage('no markers here', shipped).markersFound).toBe(false);
  });

  it('treats every production and tactical-map dependency, plus the runtime extras, as shipped', () => {
    for (const name of Object.keys(rootManifest.dependencies)) expect(shippedNames, name).toContain(name);
    for (const name of Object.keys(mapManifest.dependencies)) expect(shippedNames, name).toContain(name);
    for (const extra of RUNTIME_EXTRAS) expect(shippedNames, extra.name).toContain(extra.name);
    // Dev-only tooling is not shipped.
    for (const name of ['vitest', 'electron-builder', 'playwright', 'typescript']) {
      expect(shippedNames, name).not.toContain(name);
    }
  });

  it('matches a fresh generation from the installed packages byte for byte', () => {
    expect(buildNoticesForRoot(root).markdown).toBe(notices);
  });

  it('keeps build and data-pipeline tools out of the shipped set', () => {
    // Measured 2026-11-14: nothing shipped imports these (desktop_sim.cjs bundles only
    // @anthropic-ai/sdk; the map and warroom Vite builds bundle none of them). They are
    // devDependencies, so electron-builder does not copy them into the app.
    for (const name of [
      '@modelcontextprotocol/sdk', '@napi-rs/canvas', '@turf/turf', 'adm-zip', 'deck.gl', 'geotiff',
      'jsts', 'pdfjs-dist', 'pngjs', 'three', 'topojson-client', 'xlsx',
    ]) {
      expect(shippedNames, name).not.toContain(name);
    }
  });
});

/**
 * Bare imports in shipped source that resolve to a package outside the shipped set. Such a
 * package would be bundled into the app without a row in the notices. Type-only packages are
 * accepted through their @types/ name; Node built-ins and `electron` are part of the runtime.
 */
function findUnshippedImports(files: Array<{ file: string; source: string }>, shippedSet: Set<string>) {
  const builtins = new Set(builtinModules);
  const violations: string[] = [];
  for (const { file, source } of files) {
    for (const { fileName: specifier } of ts.preProcessFile(source, true, true).importedFiles) {
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.includes(':')) continue;
      const parts = specifier.split('/');
      const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (builtins.has(name)) continue;
      const typesName = `@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`;
      if (shippedSet.has(name) || shippedSet.has(typesName)) continue;
      violations.push(`${file} imports ${name}`);
    }
  }
  return violations.sort();
}

function shippedSourceFiles(): Array<{ file: string; source: string }> {
  const files: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (['node_modules', 'stories', '__mocks__', '.storybook'].includes(name)) continue;
      const path = join(dir, name);
      const rel = path.slice(root.length + 1).replace(/\\/g, '/');
      // src/cli holds data-authoring scripts; *.config.* are build configs. Neither ships.
      if (rel === 'src/cli') continue;
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx|cjs|mjs|js)$/.test(name) && !/\.d\.ts$/.test(name)
        && !/\.(test|spec|stories)\./.test(name) && !/\.config\.(ts|js|mjs|cjs)$/.test(name)) {
        files.push({ file: rel, source: readFileSync(path, 'utf8') });
      }
    }
  };
  walk(join(root, 'src'));
  return files;
}

describe('shipped source imports', () => {
  it('imports only packages that are in the shipped set, so bundled code always has a notice', () => {
    const files = shippedSourceFiles();
    expect(files.length).toBeGreaterThan(500);
    expect(findUnshippedImports(files, shippedNames)).toEqual([]);
  });

  it('flags shipped code that imports a development-only package (positive control)', () => {
    const files = [
      { file: 'src/ui/map/example.ts', source: "import * as XLSX from 'xlsx';\nimport maplibregl from 'maplibre-gl';\nimport type { Feature } from 'geojson';\nimport { readFileSync } from 'node:fs';\nconst p = require('path');" },
    ];
    expect(findUnshippedImports(files, shippedNames)).toEqual(['src/ui/map/example.ts imports xlsx']);
  });
});

describe('THIRD_PARTY_NOTICES.md bundled content', () => {
  it('credits OpenStreetMap under ODbL 1.0 with the copyright page', () => {
    expect(notices).toContain('© OpenStreetMap contributors');
    expect(notices).toContain('Open Data Commons Open Database License (ODbL) 1.0');
    expect(notices).toContain('https://www.openstreetmap.org/copyright');
    expect(notices).toContain('data/derived/tiles/osm.pmtiles');
  });

  it('names the elevation source of terrain.pmtiles and hillshade.pmtiles from repository records', () => {
    expect(notices).toContain('data/derived/tiles/terrain.pmtiles');
    expect(notices).toContain('data/derived/tiles/hillshade.pmtiles');
    expect(notices).toContain('Copernicus GLO-30');
    expect(notices).toContain('docs/40_reports/implemented/20260320_3D_TERRAIN_DECKGL_ARROWS_COMBAT_EFFECTIVENESS.md');
    expect(notices).toContain('docs/40_reports/handovers/AWWV_GUI_REWORK_PROGRESS_20260228.md');
  });

  it('lists the UI fonts and the VSCO 2 Community Edition samples with their licences', () => {
    for (const font of ['IBM Plex Sans', 'IBM Plex Mono', 'Caveat Bold', 'Open Sans']) expect(notices).toContain(font);
    expect(notices).toContain('SIL Open Font License 1.1');
    expect(notices).toContain('VSCO 2 Community Edition');
    expect(notices).toContain('Creative Commons Zero (CC0 1.0)');
    expect(notices).toContain('`docs/audio/LICENSES/`');
  });

  it('references only repository paths that exist', () => {
    const staticSections = readFileSync(join(root, STATIC_SECTIONS_FILE), 'utf8');
    const paths = [...staticSections.matchAll(/`((?:assets|data|docs|scripts|src|tools)\/[^`\s]+)`/g)]
      .map((match) => match[1].replace(/\/$/, ''));
    expect(paths.length).toBeGreaterThan(20);
    const missing = paths.filter((path) => {
      const concrete = path.includes('*') ? dirname(path) : path;
      return !existsSync(join(root, ...concrete.split('/')));
    });
    expect(missing).toEqual([]);
  });

  it('covers every bundled font file with a font row', () => {
    const fontFiles = readdirSync(join(root, 'assets', 'ui', 'fonts'))
      .filter((file) => /\.(ttf|otf|woff2?)$/i.test(file))
      .sort();
    expect(fontFiles.length).toBeGreaterThan(40);
    const uncovered = fontFiles.filter((file) => !/^(IBMPlexSans|IBMPlexMono-|Caveat-Bold-)/.test(file));
    expect(uncovered).toEqual([]);
    const glyphDirs = readdirSync(join(root, 'src', 'ui', 'map', 'public', 'font')).sort();
    expect(glyphDirs).toEqual(['Open Sans Bold', 'Open Sans Regular']);
  });
});

describe('notices generator on a fixture tree', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'awwv-notices-'));
  afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  const write = (relative: string, text: string) => {
    const target = join(fixtureRoot, ...relative.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, 'utf8');
  };
  const fixtureLock = {
    lockfileVersion: 3,
    packages: {
      '': { name: 'fixture', version: '1.0.0' },
      'node_modules/zeta': { version: '2.0.0', license: 'ISC' },
      'node_modules/alpha': { version: '1.0.0', license: 'MIT' },
      'node_modules/alpha/node_modules/zeta': { version: '1.0.0', license: 'ISC' },
      'node_modules/alpha-linux-x64': { version: '1.0.0', license: 'MIT', os: ['linux'], cpu: ['x64'], optional: true },
      'node_modules/dev-only': { version: '3.0.0', license: 'MIT', dev: true },
      'node_modules/runtime': { version: '4.0.0', license: 'MIT', dev: true },
      'node_modules/undeclared': { version: '0.1.0' },
    },
  };
  write('package-lock.json', JSON.stringify(fixtureLock));
  write(STATIC_SECTIONS_FILE, '## 1. Fixture content\r\n\r\nNothing bundled.\r\n');
  write('node_modules/alpha/package.json', JSON.stringify({ name: 'alpha', version: '1.0.0', license: 'MIT' }));
  write('node_modules/alpha/LICENSE', 'MIT License\r\n\r\nCopyright (c) 2020 Alpha Author\r\n\r\nThe above copyright notice and this permission notice shall be included.\r\n');
  write('node_modules/zeta/package.json', JSON.stringify({ name: 'zeta', version: '2.0.0', license: 'ISC' }));
  write('node_modules/zeta/LICENSE', 'ISC License\n\nCopyright (c) 2019 Zeta\n');
  write('node_modules/alpha/node_modules/zeta/package.json', JSON.stringify({ name: 'zeta', version: '1.0.0', license: 'ISC' }));
  write('node_modules/alpha/node_modules/zeta/LICENSE', 'ISC License\n\nCopyright (c) 2015 Zeta\n');
  write('node_modules/runtime/package.json', JSON.stringify({ name: 'runtime', version: '4.0.0', license: 'MIT' }));
  write('node_modules/runtime/LICENSE.md', '# MIT\n\nCopyright 2024 Runtime Org\n');
  write('node_modules/undeclared/package.json', JSON.stringify({ name: 'undeclared', version: '0.1.0', author: 'Some One <one@example.com> (https://example.com)' }));
  const extras = [{ name: 'runtime', reason: 'Fixture runtime.' }];

  it('is deterministic, sorted, LF-only and free of timestamps and absolute paths', () => {
    const first = buildNoticesForRoot(fixtureRoot, { extras }).markdown;
    const second = buildNoticesForRoot(fixtureRoot, { extras }).markdown;
    expect(second).toBe(first);
    expect(first).not.toContain('\r');
    expect(first).not.toContain(fixtureRoot);
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
    expect(parseNoticePackageKeys(first)).toEqual([
      'alpha@1.0.0',
      'alpha-linux-x64@1.0.0',
      'runtime@4.0.0',
      'undeclared@0.1.0',
      'zeta@1.0.0',
      'zeta@2.0.0',
    ]);
  });

  it('excludes dev-only packages, inherits platform binaries and flags undeclared licences', () => {
    const { markdown } = buildNoticesForRoot(fixtureRoot, { extras });
    expect(markdown).not.toContain('dev-only');
    expect(markdown).toContain('| alpha-linux-x64 | 1.0.0 | MIT | Native binary of alpha@1.0.0; same licence and copyright. |');
    expect(markdown).toContain('| alpha | 1.0.0 | MIT | Copyright (c) 2020 Alpha Author |');
    expect(markdown).toContain(`| undeclared | 0.1.0 | ${NOT_DECLARED} | No copyright line published. Author: Some One. No licence file published. |`);
    expect(markdown).not.toContain('one@example.com');
    expect(markdown).toContain('- `runtime@4.0.0`: Fixture runtime.');
  });

  it('refuses to generate from an incomplete install', () => {
    const brokenLock = structuredClone(fixtureLock) as typeof fixtureLock & { packages: Record<string, unknown> };
    brokenLock.packages['node_modules/not-installed'] = { version: '9.9.9', license: 'MIT' };
    const brokenRoot = mkdtempSync(join(tmpdir(), 'awwv-notices-broken-'));
    try {
      writeFileSync(join(brokenRoot, 'package-lock.json'), JSON.stringify(brokenLock), 'utf8');
      expect(() => buildNoticesForRoot(brokenRoot, { extras: [] })).toThrow(/not installed/);
    } finally {
      rmSync(brokenRoot, { recursive: true, force: true });
    }
  });
});

describe('copyright line extraction', () => {
  it('keeps notices and drops licence boilerplate', () => {
    const apache = [
      '   Copyright [yyyy] [name of copyright owner]',
      '      (c) You must retain, in the Source form of any Derivative Works',
      '      copyright notice that is included in or attached to the work',
    ].join('\n');
    expect(extractCopyrightLines(apache)).toEqual([]);
    const blueOak = "software that would otherwise infringe that contributor's\ncopyright in it.";
    expect(extractCopyrightLines(blueOak)).toEqual([]);
    const mit = 'Copyright (c) 2020 A\nThe above copyright notice and this permission notice shall be included';
    expect(extractCopyrightLines(mit)).toEqual(['Copyright (c) 2020 A']);
    const pngjs = 'pngjs original work Copyright (c) 2015 Luke Page & Original Contributors';
    expect(extractCopyrightLines(pngjs)).toEqual([pngjs]);
    expect(extractCopyrightLines('© 2010 Someone')).toEqual(['© 2010 Someone']);
  });

  it('keeps author names but not e-mail addresses or URLs', () => {
    expect(formatAuthor('Jane Doe <jane@example.com> (https://example.com)')).toBe('Jane Doe');
    expect(formatAuthor({ name: 'Org', email: 'x@example.com' })).toBe('Org');
    expect(formatAuthor(undefined)).toBe('');
  });
});
