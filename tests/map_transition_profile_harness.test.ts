import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const harnessPath = 'tools/ui/map_transition_profile.cjs';
const require = createRequire(import.meta.url);

describe('map transition Electron profile harness contract', () => {
  it('provides the harness before inspecting its deterministic contract', () => {
    expect(existsSync(harnessPath)).toBe(true);
  });

  it('pins the profiling-only save root and cold-before-navigation cache contract', () => {
    const desktopMain = readFileSync('src/desktop/electron-main.cjs', 'utf8');
    const createWindowIndex = desktopMain.indexOf('function createMainWindow');
    const clearIndex = desktopMain.indexOf('clearCache()', createWindowIndex);
    const loadIndex = desktopMain.indexOf('loadURL(warroomUrl)', createWindowIndex);

    expect(desktopMain).toMatch(/MAP_TRANSITION_PROFILE_MODE/);
    expect(desktopMain).toMatch(/AWWV_MAP_TRANSITION_SAVE_ROOT/);
    expect(desktopMain).toMatch(/path\.isAbsolute/);
    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(loadIndex).toBeGreaterThan(clearIndex);
    expect(desktopMain).toMatch(/openDevTools:\s*!app\.isPackaged\s*&&\s*!MAP_TRANSITION_PROFILE_MODE/);
  });

  it('uses explicit bounded options and a non-overwriting ignored evidence root', () => {
    if (!existsSync(harnessPath)) return;
    const source = readFileSync(harnessPath, 'utf8');
    const gitignore = readFileSync('.gitignore', 'utf8');

    expect(source).toMatch(/--label/);
    expect(source).toMatch(/--cycles/);
    expect(source).toMatch(/--warmups/);
    expect(source).toMatch(/tmp-map-transition-perf/);
    expect(source).toMatch(/recursive:\s*false/);
    expect(source).toMatch(/flag:\s*'wx'/);
    expect(source).not.toMatch(/Date\.now\(|new Date\(|Math\.random\(/);
    expect(gitignore).toMatch(/^tmp-map-transition-perf\/$/m);
  });

  it('launches unpackaged Electron with isolated state and protects repository saves', () => {
    if (!existsSync(harnessPath)) return;
    const harness = readFileSync(harnessPath, 'utf8');
    const desktopMain = readFileSync('src/desktop/electron-main.cjs', 'utf8');

    expect(harness).toMatch(/electron\.launch/);
    expect(harness).toMatch(/--user-data-dir=/);
    expect(harness).toMatch(/AWWV_MAP_TRANSITION_PROFILE:\s*'1'/);
    expect(harness).toMatch(/AWWV_MAP_TRANSITION_SAVE_ROOT/);
    expect(harness).toMatch(/assertRepositorySavesUnchanged/);
    expect(desktopMain).toMatch(/AWWV_MAP_TRANSITION_SAVE_ROOT/);
    expect(desktopMain).toMatch(/MAP_TRANSITION_PROFILE_MODE/);
  });

  it('clears the cold cache before navigation and never clears it during warm cycles', () => {
    if (!existsSync(harnessPath)) return;
    const harness = readFileSync(harnessPath, 'utf8');
    const desktopMain = readFileSync('src/desktop/electron-main.cjs', 'utf8');
    const createWindowIndex = desktopMain.indexOf('function createMainWindow');
    const clearIndex = desktopMain.indexOf('clearCache()', createWindowIndex);
    const loadIndex = desktopMain.indexOf('loadURL(warroomUrl)', createWindowIndex);

    expect(harness).toMatch(/AWWV_MAP_TRANSITION_COLD_CACHE:\s*'1'/);
    expect(clearIndex).toBeGreaterThanOrEqual(0);
    expect(loadIndex).toBeGreaterThan(clearIndex);
    expect(harness.match(/clearCache/g) ?? []).toHaveLength(0);
  });

  it('starts a clean fixture, proves exact-turn readiness, and records complete diagnostics', () => {
    if (!existsSync(harnessPath)) return;
    const source = readFileSync(harnessPath, 'utf8');

    expect(source).toMatch(/mm-new-campaign/);
    expect(source).toMatch(/sp-faction-RBiH/);
    expect(source).toMatch(/data-map-ready/);
    expect(source).toMatch(/data-map-state-turn/);
    expect(source).toMatch(/waitForProfileSample/);
    expect(source).toMatch(/requiredTransitionMarks/);
    expect(source).toMatch(/Incomplete map transition sample/);
    expect(source).toMatch(/fingerprint_matches/);
    expect(source).not.toMatch(/raw_fingerprint|state_json|raw_state/);
    expect(source).toMatch(/requestfailed/);
    expect(source).toMatch(/pageerror/);
    expect(source).toMatch(/main_process_stderr/);
    expect(source).toMatch(/lifetime_counters/);
    expect(source).toMatch(/application\.evaluate/);
    expect(source).toMatch(/process\.versions\.electron/);
    expect(source).toMatch(/process\.versions\.chrome/);
    expect(source).toMatch(/cold_current_state_ms/);
    expect(source).toMatch(/warm_switch_ms/);
  });

  it('summarizes cold current-state render separately from final interactivity', () => {
    const { buildSummary } = require('../tools/ui/map_transition_profile.cjs');
    const emptyDiagnostics = {
      console_errors_and_warnings: [],
      page_errors: [],
      request_failures: [],
      http_errors: [],
      expected_main_process_stderr: {},
      main_process_stderr: [],
      main_process_stdout: [],
    };
    const summary = buildSummary([{
      cold: { durations_ms: { 'current-state-rendered': 125, interactive: 999 } },
      measured: [{ durations_ms: { 'current-state-rendered': 250, interactive: 300 } }],
      diagnostics: emptyDiagnostics,
    }]);

    expect(summary.cold_current_state_ms).toEqual({ samples: 1, p50: 125, p95: 125 });
    expect(summary.warm_switch_ms).toEqual({ samples: 1, p50: 300, p95: 300 });
  });

  it('reduces inspector shutdown lines to stable categories without raw URL data', () => {
    const { classifyMainProcessStderr } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof classifyMainProcessStderr).toBe('function');
    if (typeof classifyMainProcessStderr !== 'function') return;
    const result = classifyMainProcessStderr([
      'Debugger ending on ws://127.0.0.1:49321/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818',
      'Debugger ending on <inspector-endpoint>',
      'Debugger listening on <inspector-endpoint>',
      'For help, see: https://nodejs.org/en/docs/inspector',
      'unexpected failure',
    ]);

    expect(result).toEqual({
      expected_categories: {
        inspector_help: 1,
        inspector_shutdown: 2,
        inspector_startup: 1,
      },
      unexpected_lines: ['unexpected failure'],
    });
    expect(JSON.stringify(result)).not.toMatch(/ws:\/\/|49321|5a65bc3b|127\.0\.0\.1/);
  });

  it('serializes complete process diagnostics without ephemeral stdout or stderr data', () => {
    const { buildPersistedProcessDiagnostics } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof buildPersistedProcessDiagnostics).toBe('function');
    if (typeof buildPersistedProcessDiagnostics !== 'function') return;
    const outputDirectory = String.raw`F:\AWWV-worktrees\r1-map-transition\tmp-map-transition-perf\diagnostics-test`;
    const result = buildPersistedProcessDiagnostics({
      stdout: [
        'Tactical map server: http://127.0.0.1:58250',
        '[AWWV] Map: using built server at http://127.0.0.1:58250/',
        '[AWWV] Map: using built server at http://127.0.0.1:58250/',
        `unexpected stdout at http://localhost:53728/private/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818 and https://example.test/details from ${outputDirectory} and D:\\private\\run.log and /home/test/run.log on port 53728`,
      ],
      stderr: [
        'Debugger ending on ws://127.0.0.1:49321/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818',
        'For help, see: https://nodejs.org/en/docs/inspector',
        `unexpected stderr from ${outputDirectory}`,
      ],
      outputDirectory,
    });

    expect(result).toEqual({
      expected_main_process_stdout: {
        built_map_server_selected: 2,
        tactical_map_server_started: 1,
      },
      main_process_stdout: [
        'unexpected stdout at <loopback-http-endpoint> and <url> from <evidence> and <absolute-path> and <absolute-path> on port <ephemeral-port>',
      ],
      expected_main_process_stderr: {
        inspector_help: 1,
        inspector_shutdown: 1,
      },
      main_process_stderr: ['unexpected stderr from <evidence>'],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/(?:ws|https?):\/\/(?:127\.0\.0\.1|localhost|\[::1\])/i);
    expect(serialized).not.toMatch(/https:\/\/example\.test|D:\\\\private|\/home\/test/);
    expect(serialized).not.toMatch(/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818|49321|53728|58250/);
    expect(serialized).not.toContain(outputDirectory);
  });

  it('builds a bounded machine manifest without retaining the raw CPU model', () => {
    const { buildMachineManifest } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof buildMachineManifest).toBe('function');
    if (typeof buildMachineManifest !== 'function') return;
    const manifest = buildMachineManifest({
      platform: 'win32',
      architecture: 'x64',
      cpuModel: '13th Gen Intel(R) Core(TM) i9-13900K private suffix',
      logicalProcessors: 32,
      totalMemoryBytes: 48 * 1024 ** 3,
      viewport: { width: 1920, height: 1080, deviceScaleFactor: 1.25 },
    });

    expect(manifest).toEqual({
      platform: 'win32',
      architecture: 'x64',
      cpu_class: 'intel-x64',
      logical_processor_class: '17-32',
      memory_gib_class: '33-64',
      viewport: { width: 1920, height: 1080, device_scale_factor: 1.25 },
    });
    expect(JSON.stringify(manifest)).not.toMatch(/13900|private suffix|cpuModel/);
  });

  it('writes the bounded machine manifest and captured viewport into evidence', () => {
    const source = readFileSync(harnessPath, 'utf8');
    expect(source).toMatch(/machine:\s*buildMachineManifest\(\{/);
    expect(source).toMatch(/window\.devicePixelRatio/);
    expect(source).toMatch(/viewport:\s*launches\[0\]\?\.viewport/);
  });

  it('rejects out-of-order evidence and reports the ordered sample count', () => {
    const { hasOrderedTransitionDurations } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof hasOrderedTransitionDurations).toBe('function');
    if (typeof hasOrderedTransitionDurations !== 'function') return;
    const ordered = {
      command: 0,
      'viewport-visible': 1,
      'core-data-ready': 2,
      'map-created': 3,
      'style-loaded': 4,
      'current-state-rendered': 5,
      interactive: 6,
    };
    expect(hasOrderedTransitionDurations(ordered)).toBe(true);
    expect(hasOrderedTransitionDurations({ ...ordered, 'style-loaded': 5.5 })).toBe(false);
    const source = readFileSync(harnessPath, 'utf8');
    expect(source).toMatch(/Out-of-order map transition sample/);
    expect(source).toMatch(/complete_ordered/);
  });
});
