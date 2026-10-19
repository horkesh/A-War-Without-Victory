import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

function shouldSkipDir(name) {
  return name === 'node_modules' || name === 'dist' || name === '.git';
}

export function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (shouldSkipDir(entry)) continue;
      out.push(...listTsFiles(full));
      continue;
    }
    if (extname(full) === '.ts' && basename(full).endsWith('.test.ts')) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function fileUsesVitest(path) {
  const content = readFileSync(path, 'utf8');
  return /from\s+['"]vitest['"]/.test(content) || /from\s+['"]@vitest\//.test(content);
}

export function fileNeedsJsdom(path) {
  const content = readFileSync(path, 'utf8');
  const base = basename(path);
  if (/@vitest-environment\s+jsdom/.test(content)) return true;
  if (base.endsWith('.browser.test.ts')) return true;
  return base === 'warroom_smoke.test.ts' || base === 'warroom_player_visibility.test.ts';
}

export function fileRunsScenario(path) {
  const content = readFileSync(path, 'utf8');
  return (
    /\brunScenario\s*\(/.test(content) ||
    /\brunScenarioDeterministic\s*\(/.test(content) ||
    /\brunProbeCompare\s*\(/.test(content) ||
    /\bcompareAgainstBaselines\s*\(/.test(content) ||
    /\brunSensitivityHarness\s*\(/.test(content)
  );
}

// Opt-in startup test: it needs AWWV_READ_WIRING_CASE (off|on|failing) and rejects anything else
// before starting. Default discovery therefore omits exactly this file while the variable is ABSENT
// (undefined). A present value, including empty or unknown, keeps it discovered so the test's own
// pre-startup selector rejection fires. No other file's membership depends on this.
export const OPT_IN_WIRING_TEST = 'tests/scenario_runner_read_context_wiring.test.ts';
export const OPT_IN_WIRING_ENV_VAR = 'AWWV_READ_WIRING_CASE';

export function discoverTests(rootDir, env = process.env) {
  const testsDir = join(rootDir, 'tests');
  const omitOptIn = env[OPT_IN_WIRING_ENV_VAR] === undefined;
  const files = listTsFiles(testsDir).filter(
    (file) => !(omitOptIn && relative(rootDir, file).replaceAll('\\', '/') === OPT_IN_WIRING_TEST),
  );
  const vitestFiles = [];
  const fastVitestFiles = [];
  const scenarioVitestFiles = [];
  const nodeTestFiles = [];
  const jsdomVitestFiles = [];

  for (const file of files) {
    if (fileUsesVitest(file)) {
      vitestFiles.push(file);
      if (fileRunsScenario(file)) {
        scenarioVitestFiles.push(file);
      } else {
        fastVitestFiles.push(file);
      }
      if (fileNeedsJsdom(file)) jsdomVitestFiles.push(file);
    } else {
      nodeTestFiles.push(file);
    }
  }

  return {
    vitestFiles,
    fastVitestFiles,
    scenarioVitestFiles,
    nodeTestFiles,
    jsdomVitestFiles,
  };
}

export function toRepoRelative(rootDir, files) {
  return files.map((file) => relative(rootDir, file).replaceAll('\\', '/'));
}
