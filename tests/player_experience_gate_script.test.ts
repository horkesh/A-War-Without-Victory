import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const gatePath = join(process.cwd(), 'tools', 'ui', 'player_experience_gate.cjs');

type GateModule = {
  PLAYER_EXPERIENCE_GATE_STEPS?: Array<{ script: string }>;
  findPlayerExperienceGateFailures?: (output: string) => Array<{ label: string; match: string }>;
  buildNpmRunInvocation?: (script: string, platform?: NodeJS.Platform) => { command: string; args: string[]; shell: boolean };
};

function loadGateModule(): GateModule {
  if (!existsSync(gatePath)) return {};
  return require(gatePath) as GateModule;
}

describe('player experience gate wrapper', () => {
  it('runs the broad player-facing gate steps in release order', () => {
    const mod = loadGateModule();

    expect(mod.PLAYER_EXPERIENCE_GATE_STEPS?.map((step) => step.script)).toEqual([
      'typecheck',
      'desktop:release:check',
      'qa:electron-runtime-contracts',
      'qa:player-journeys',
      'qa:first-hour:browser',
      'qa:live-surface:browser',
    ]);
  });

  it('fails on shipped-build warning signatures instead of leaving them for manual log review', () => {
    const mod = loadGateModule();
    const findFailures = mod.findPlayerExperienceGateFailures;

    expect(typeof findFailures).toBe('function');
    expect(
      findFailures?.(`
        ▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]
        src/ui/map/node_modules/@loaders.gl/worker-utils/dist/lib/process-utils/child-process-proxy.js (56:50): "spawn" is not exported by "__vite-browser-external"
        (!) Some chunks are larger than 500 kB after minification.
        Error: Cannot find module 'F:\\A-War-Without-Victory\\src\\sim\\events\\resolve_decision.js'
        (node:69068) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true
        'vite' is not recognized as an internal or external command,
      `).map((failure) => failure.label),
    ).toEqual([
      'build warning',
      'desktop sim CJS import.meta warning',
      'browser externalized Node module warning',
      'Vite chunk-size warning',
      'missing runtime module',
      'Node process warning',
      'PATH-dependent Vite command',
    ]);
  });

  it('allows expected malformed-save and desktop-bridge fallback stderr from existing tests', () => {
    const mod = loadGateModule();

    expect(
      mod.findPlayerExperienceGateFailures?.(`
        stderr | tests/ui/gamestore_load_reset.test.ts > sets loadError for non-JSON string input
        [gameStore] Failed to parse save: SyntaxError: Unexpected token 'o', "not json at all" is not valid JSON
        [dev-map] Desktop bridge unavailable, using baked startup snapshot fallback for scenario: apr_1992
      `),
    ).toEqual([]);
  });

  it('launches npm scripts without shell-args warnings on Windows', () => {
    const mod = loadGateModule();

    expect(mod.buildNpmRunInvocation?.('typecheck', 'win32')).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd run typecheck'],
      shell: false,
    });
    expect(mod.buildNpmRunInvocation?.('typecheck', 'linux')).toEqual({
      command: 'npm',
      args: ['run', 'typecheck'],
      shell: false,
    });
  });
});
