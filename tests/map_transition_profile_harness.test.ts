import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const harnessPath = 'tools/ui/map_transition_profile.cjs';

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
});
