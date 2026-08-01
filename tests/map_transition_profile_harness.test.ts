import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
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

  it('keeps player-visible evidence opt-in and records the complete interaction matrix', () => {
    const { parseOptions } = require('../tools/ui/map_transition_profile.cjs');
    const source = readFileSync(harnessPath, 'utf8');

    expect(parseOptions(['--label=plain', '--cycles=1', '--warmups=0']).playerEvidence).toBe(false);
    expect(parseOptions(['--label=proof', '--cycles=1', '--warmups=0', '--player-evidence']).playerEvidence).toBe(true);
    expect(source).toContain('runPlayerInteractionEvidence');
    expect(source).toContain('hidden_shortcut_ownership');
    expect(source).toContain('camera_interaction');
    expect(source).toContain('formation_selection');
    expect(source).toContain('settlement_selection');
    expect(source).toContain('post_advance_current_state');
    expect(source).toContain('resolveHistoricalDecisionFromCatalog');
    expect(source).toContain('historical_default_response_id');
    expect(source).toContain("historical_marker !== 'historical_default'");
    expect(source).toContain('warroom-toolbar-advance');
    expect(source).not.toContain('window.awwv.advanceTurn()');
    expect(source).toContain('Review Later');
    expect(source).toContain('command-room.png');
    expect(source).toContain('cold-map.png');
    expect(source).toContain('warm-map.png');
  });

  it('proves map camera input from bounded telemetry and rejects unchanged or wrong-direction motion', () => {
    const { buildCameraInteractionProof } = require('../tools/ui/map_transition_profile.cjs');
    const baseline = { longitude: 17.85, latitude: 44.15, zoom: 8.2, pitch: 30 };
    const panned = { longitude: 18.05, latitude: 44.15, zoom: 8.2, pitch: 30 };
    const zoomed = { longitude: 18.05, latitude: 44.15, zoom: 9.2, pitch: 30 };
    const restored = { ...baseline };

    expect(buildCameraInteractionProof({ baseline, panned, zoomed, restored })).toEqual({
      pan: {
        direction: 'east',
        longitude_delta: 0.2,
      },
      zoom: {
        zoom_delta: 1,
      },
      home_restore: {
        longitude_delta: 0,
        latitude_delta: 0,
        zoom_delta: 0,
        pitch_delta: 0,
      },
    });
    expect(() => buildCameraInteractionProof({
      baseline,
      panned: baseline,
      zoomed,
      restored,
    })).toThrow(/ArrowRight.*east/i);
    expect(() => buildCameraInteractionProof({
      baseline,
      panned: { ...panned, longitude: 17.65 },
      zoomed,
      restored,
    })).toThrow(/ArrowRight.*east/i);
    expect(() => buildCameraInteractionProof({
      baseline,
      panned,
      zoomed: panned,
      restored,
    })).toThrow(/zoom.*increase/i);
    expect(() => buildCameraInteractionProof({
      baseline,
      panned,
      zoomed,
      restored: { ...baseline, longitude: 18.2 },
    })).toThrow(/Home.*restore/i);
  });

  it('proves hidden map ownership before and after the desk-scoped H shortcut', () => {
    const { buildHiddenShortcutProof } = require('../tools/ui/map_transition_profile.cjs');
    const hidden = {
      warroom_visible: true,
      army_hq_visible: false,
      map_visible: false,
      viewport_aria_hidden: 'true',
      viewport_inert: true,
    };
    expect(buildHiddenShortcutProof(hidden, hidden)).toEqual({
      before: { viewport_aria_hidden: 'true', viewport_inert: true },
      after: { viewport_aria_hidden: 'true', viewport_inert: true },
      escaped: false,
    });
    expect(() => buildHiddenShortcutProof(hidden, { ...hidden, viewport_inert: false }))
      .toThrow(/input ownership/i);
    expect(() => buildHiddenShortcutProof(hidden, { ...hidden, viewport_aria_hidden: 'false' }))
      .toThrow(/input ownership/i);
  });

  it('binds the clean RBiH choice to the event catalog historical default marker', () => {
    const { resolveHistoricalDecisionFromCatalog } = require('../tools/ui/map_transition_profile.cjs');
    const catalog = JSON.parse(readFileSync('data/scenarios/events/war_1992.json', 'utf8'));
    expect(resolveHistoricalDecisionFromCatalog(catalog, 'rbih_state_identity')).toEqual({
      event_id: 'rbih_state_identity',
      response_id: 'civic',
      response_label: 'Civic multi-ethnic republic',
    });
    expect(() => resolveHistoricalDecisionFromCatalog([
      {
        id: 'rbih_state_identity',
        historical_default_response_id: 'civic',
        response_options: [{ id: 'civic', label: 'Civic', historical_marker: 'counterfactual' }],
      },
    ], 'rbih_state_identity')).toThrow(/historical_default marker/i);
    expect(() => resolveHistoricalDecisionFromCatalog([], 'rbih_state_identity'))
      .toThrow(/catalog event/i);
  });

  it('builds a bounded player-evidence schema without raw state, paths, or screenshot hashes', () => {
    const { buildPlayerInteractionRecord } = require('../tools/ui/map_transition_profile.cjs');
    const result = buildPlayerInteractionRecord({
      hiddenShortcutProof: {
        before: { viewport_aria_hidden: 'true', viewport_inert: true },
        after: { viewport_aria_hidden: 'true', viewport_inert: true },
        escaped: false,
      },
      cameraInteraction: {
        pan: { direction: 'east', longitude_delta: 0.2 },
        zoom: { zoom_delta: 1 },
        home_restore: { longitude_delta: 0, latitude_delta: 0, zoom_delta: 0, pitch_delta: 0 },
      },
      formationSelection: { counter_id: 'arbih_1', opened_formation_id: 'arbih_1' },
      settlementSelection: { osid: 'sarajevo', position: { x_ratio: 0.5, y_ratio: 0.5 } },
      commandRoomReturn: { visible: true, hidden_map_inert: true },
      historicalDecision: {
        event_id: 'rbih_state_identity',
        response_id: 'civic',
        response_label: 'Civic multi-ethnic republic',
      },
      deferredModal: { action: 'review-later', resolved: false },
      informationalAcknowledgements: 1,
      postAdvanceCurrentState: {
        expected_turn: 1,
        loaded_turn: 1,
        fingerprint_matches: true,
        current_state_ready: true,
      },
      raw_state: { player_name: 'Ana' },
      screenshot_hash: 'private-hash',
      output_path: String.raw`F:\private\evidence`,
    });

    expect(Object.keys(result)).toEqual([
      'hidden_shortcut_ownership',
      'camera_interaction',
      'formation_selection',
      'settlement_selection',
      'command_room_return',
      'historical_decision',
      'deferred_modal',
      'informational_acknowledgements',
      'post_advance_current_state',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/raw_state|player_name|screenshot_hash|private-hash|output_path|F:\\private/i);
  });

  it('accepts only the visible Advance route confirmation or exact next turn', () => {
    const { classifyVisibleAdvanceOutcome } = require('../tools/ui/map_transition_profile.cjs');
    expect(classifyVisibleAdvanceOutcome(0, 0, false)).toBe('pending');
    expect(classifyVisibleAdvanceOutcome(0, 0, true)).toBe('confirmation');
    expect(classifyVisibleAdvanceOutcome(1, 0, false)).toBe('advanced');
    expect(() => classifyVisibleAdvanceOutcome(2, 0, false)).toThrow(/exactly one turn/i);
  });

  it('allows only neutral deferral and informational acknowledgement after Advance', () => {
    const { classifyApprovedPostAdvanceAction } = require('../tools/ui/map_transition_profile.cjs');
    expect(classifyApprovedPostAdvanceAction({
      modalVisible: false,
      reviewLaterHitTestable: false,
      acknowledgedHitTestable: false,
    })).toBe('none');
    expect(classifyApprovedPostAdvanceAction({
      modalVisible: true,
      reviewLaterHitTestable: true,
      acknowledgedHitTestable: false,
    })).toBe('review-later');
    expect(classifyApprovedPostAdvanceAction({
      modalVisible: true,
      reviewLaterHitTestable: false,
      acknowledgedHitTestable: true,
    })).toBe('acknowledged');
    expect(classifyApprovedPostAdvanceAction({
      modalVisible: true,
      reviewLaterHitTestable: false,
      acknowledgedHitTestable: false,
    })).toBe('pending');
    expect(() => classifyApprovedPostAdvanceAction({
      modalVisible: true,
      reviewLaterHitTestable: true,
      acknowledgedHitTestable: true,
    })).toThrow(/ambiguous/i);
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
    expect(source).toMatch(/profile\.debugState\(\)/);
    expect(source).toMatch(/marks=\$\{debug\.marks\.join\(','\)\}/);
    expect(source).toMatch(/Timed out waiting for current tactical map/);
    expect(source).toMatch(/map_style_ready=\$\{dom\.map_style_ready\}/);
    expect(source).toMatch(/map_reveal_painted=\$\{dom\.map_reveal_painted\}/);
    expect(source).toMatch(/map_revision_ready=\$\{dom\.map_revision_ready\}/);
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

  it('selects only the enabled topmost startup control when a visible match is occluded', () => {
    const { pickTopmostStartupControlIndex } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof pickTopmostStartupControlIndex).toBe('function');
    if (typeof pickTopmostStartupControlIndex !== 'function') return;

    expect(pickTopmostStartupControlIndex([
      { visible: true, enabled: true, hitTestable: false },
      { visible: true, enabled: true, hitTestable: true },
    ])).toBe(1);
    expect(pickTopmostStartupControlIndex([
      { visible: true, enabled: false, hitTestable: true },
      { visible: false, enabled: true, hitTestable: true },
    ])).toBe(-1);
  });

  it('retains bounded startup diagnostics and a screenshot when setup exhausts', () => {
    const source = readFileSync(harnessPath, 'utf8');

    expect(source).toMatch(/function clickTopmostVisibleButton/);
    expect(source).toMatch(/document\.elementFromPoint/);
    expect(source).toMatch(/button === topmost \|\| button\.contains\(topmost\)/);
    expect(source).toMatch(/button\.getAttribute\('aria-disabled'\) !== 'true'/);
    expect(source).not.toMatch(/getByRole\('button', \{ name: \/Acknowledge\/i \}\)\.first\(\)/);
    expect(source).toMatch(/describeStartupSurface/);
    expect(source).toMatch(/launch-\$\{launchIndex\}-failed\.png/);
  });

  it('reports Deck owner construction and release deltas separately from MapLibre', () => {
    const { counterDelta } = require('../tools/ui/map_transition_profile.cjs');

    expect(counterDelta(
      {
        map_constructions: 2,
        webgl_releases: 0,
        deck_constructions: 1,
        deck_releases: 0,
        static_resource_requests: {},
      },
      {
        map_constructions: 2,
        webgl_releases: 0,
        deck_constructions: 1,
        deck_releases: 0,
        static_resource_requests: {},
      },
    )).toEqual({
      map_constructions: 0,
      webgl_releases: 0,
      deck_constructions: 0,
      deck_releases: 0,
      static_resource_requests: {},
    });
  });

  it('allowlists startup diagnostic categories without persisting player-facing copy', () => {
    const { buildStartupSurfaceDiagnostic } = require('../tools/ui/map_transition_profile.cjs');
    const diagnostic = buildStartupSurfaceDiagnostic({
      dialog_count: 2,
      button_count: 7,
      visible_button_count: 3,
      role_counts: { dialog: 2, alert: 1, malicious_role: 99 },
      test_ids: ['tactical-map-loading', 'private-player-secret'],
      title: 'Ana Player secret campaign',
      text: 'The private choice and local path must not persist',
    });

    expect(diagnostic).toEqual({
      dialog_count: 2,
      button_count: 7,
      visible_button_count: 3,
      role_counts: { alert: 1, dialog: 2 },
      known_test_ids: ['tactical-map-loading'],
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(/Ana|secret|private|campaign|path/i);
  });

  it('retains screenshot/diagnostic state and cleanup proof for an injected post-launch failure', async () => {
    const { settlePostLaunchEvidence } = require('../tools/ui/map_transition_profile.cjs');
    const cleanup = {
      graceful_close: true,
      forced_kill: false,
      process_exit_verified: true,
    };
    const outcome = await settlePostLaunchEvidence(
      async () => { throw new Error('post-launch failure'); },
      async () => ({
        capture_status: 'captured',
        screenshot: { attempted: true, captured: true, file: 'launch-2-failed.png' },
        readiness: { debug: { marks: ['command', 'viewport-visible'] } },
        startup_surface: { dialog_count: 1, button_count: 2 },
      }),
      async () => cleanup,
    );

    expect(outcome.failure).toBeInstanceOf(Error);
    expect(outcome.failedEvidence).toMatchObject({
      capture_status: 'captured',
      screenshot: { captured: true },
      readiness: { debug: { marks: ['command', 'viewport-visible'] } },
    });
    expect(outcome.cleanup).toEqual(cleanup);
  });

  it('normalizes rejected failure capture with screenshot status and a safe error category', async () => {
    const { settlePostLaunchEvidence } = require('../tools/ui/map_transition_profile.cjs');
    const outcome = await settlePostLaunchEvidence(
      async () => { throw new Error('launch failed'); },
      async () => { throw new Error('Ana secret campaign screenshot path'); },
      async () => ({ process_exit_verified: true }),
    );

    expect(outcome.failedEvidence).toEqual({
      capture_status: 'unavailable',
      screenshot: { attempted: true, captured: false, file: null },
      capture_error_category: 'capture_error',
    });
    expect(JSON.stringify(outcome.failedEvidence)).not.toMatch(/Ana|secret|campaign|path/i);
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

  it('categorizes deterministic turn-pipeline rehome diagnostics without persisting formation identity', () => {
    const { classifyMainProcessStdout } = require('../tools/ui/map_transition_profile.cjs');
    const result = classifyMainProcessStdout([
      '[brigade_assignment] Rehomed rs_1st_vlasenica into truthful sector owner sector:vrs_drina:3 (front)',
    ]);

    expect(result).toEqual({
      expected_categories: { routine_brigade_rehome: 1 },
      unexpected_lines: [],
    });
    expect(JSON.stringify(result)).not.toContain('rs_1st_vlasenica');
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

  it('sanitizes every persisted page, request, and HTTP diagnostic field', () => {
    const { sanitizeDiagnosticPayload } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof sanitizeDiagnosticPayload).toBe('function');
    if (typeof sanitizeDiagnosticPayload !== 'function') return;
    const outputDirectory = String.raw`F:\AWWV-worktrees\r1-map-transition\tmp-map-transition-perf\diagnostics-test`;
    const userRoot = process.env.USERPROFILE;
    const result = sanitizeDiagnosticPayload({
      type: 'warning from https://example.test/type',
      message: `http://localhost:53728/private/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818 ${outputDirectory} ${userRoot} D:\\private\\run.log /home/test/run.log`,
      method: 'GET https://example.test/method',
      resource_type: String.raw`script D:\private\resource.js`,
      resource_key: 'https://example.test/private/5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818?port=53728',
      error: 'failed at /home/test/error.log on port 53728',
      nested: ['ws://127.0.0.1:58250/private'],
      status: 503,
    }, outputDirectory);

    expect(result).toEqual({
      type: 'warning from <url>',
      message: '<loopback-http-endpoint> <evidence> <user> <absolute-path> <absolute-path>',
      method: 'GET <url>',
      resource_type: 'script <absolute-path>',
      resource_key: '<url> <ephemeral-port>',
      error: 'failed at <absolute-path> on port <ephemeral-port>',
      nested: ['<inspector-endpoint>'],
      status: 503,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/(?:https?|wss?|file):\/\//i);
    expect(serialized).not.toMatch(/[A-Za-z]:[\\/]|\/home\/|5a65bc3b|53728|58250/);
    if (userRoot) expect(serialized).not.toContain(userRoot);
  });

  it('fails the evidence outcome for every unexpected diagnostic but permits startup categories', () => {
    const { unexpectedDiagnosticsFailure } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof unexpectedDiagnosticsFailure).toBe('function');
    if (typeof unexpectedDiagnosticsFailure !== 'function') return;
    const clean = {
      runtime_diagnostics: {
        console_errors_and_warnings: 0,
        page_errors: 0,
        request_failures: 0,
        http_errors: 0,
        main_process_stdout: 0,
        main_process_stderr: 0,
      },
      expected_main_process_stdout: { tactical_map_server_started: 3 },
      expected_main_process_stderr: { inspector_shutdown: 3 },
    };

    expect(unexpectedDiagnosticsFailure(clean)).toBeNull();
    for (const key of Object.keys(clean.runtime_diagnostics)) {
      const failing = {
        ...clean,
        runtime_diagnostics: { ...clean.runtime_diagnostics, [key]: 1 },
      };
      expect(unexpectedDiagnosticsFailure(failing)).toContain(`${key}=1`);
    }
    const source = readFileSync(harnessPath, 'utf8');
    expect(source).toMatch(/failure\s*\?\?=\s*unexpectedDiagnosticsFailure\(summary\)/);
  });

  it('builds and serializes failed evidence without leaking a malicious stack', () => {
    const {
      buildEvidenceOutcome,
      formatFatalError,
    } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof buildEvidenceOutcome).toBe('function');
    expect(typeof formatFatalError).toBe('function');
    if (typeof buildEvidenceOutcome !== 'function' || typeof formatFatalError !== 'function') return;
    const outputDirectory = String.raw`F:\AWWV-worktrees\r1-map-transition\tmp-map-transition-perf\failure-test`;
    const failure = new Error('malicious failure');
    failure.stack = [
      'Error: failed at https://example.test/private',
      String.raw`    at D:\private\failure.cjs:42:7`,
      '    at /home/test/private.mjs:9:2',
      '    at wrapped (/home/user/file.js:9:2)',
      '    at quoted "/srv/private/file.js:7:3"',
      "    at single '/opt/private/file.js:5:1'",
      'token 5a65bc3b-f23d-4fab-a12b-0c2e8ae8a818 on port 53728',
    ].join('\n');
    const expectedError = [
      'Error: failed at <url>',
      '    at <absolute-path>:42:7',
      '    at <absolute-path>',
      '    at wrapped (<absolute-path>)',
      '    at quoted "<absolute-path>"',
      "    at single '<absolute-path>'",
      'token <uuid> on port <ephemeral-port>',
    ].join('\n');
    const evidence = {
      schema_version: 4,
      summary: {
        runtime_diagnostics: { page_errors: 1 },
        expected_main_process_stdout: { tactical_map_server_started: 3 },
      },
      ...buildEvidenceOutcome(failure, outputDirectory),
    };

    expect(buildEvidenceOutcome(null, outputDirectory)).toEqual({ ok: true, error: null });
    expect(evidence).toEqual({
      schema_version: 4,
      summary: {
        runtime_diagnostics: { page_errors: 1 },
        expected_main_process_stdout: { tactical_map_server_started: 3 },
      },
      ok: false,
      error: expectedError,
    });
    expect(formatFatalError(failure)).toBe(`${expectedError}\n`);
    const serialized = JSON.stringify(evidence);
    expect(serialized).toContain('<url>');
    expect(serialized).toContain('<absolute-path>');
    expect(serialized).toContain('<uuid>');
    expect(serialized).toContain('<ephemeral-port>');
    expect(serialized).toContain('tactical_map_server_started');
    expect(serialized).not.toMatch(/(?:https?|wss?|file):\/\//i);
    expect(serialized).not.toMatch(/[A-Za-z]:[\\/]|\/home\/|5a65bc3b|53728/);
    const source = readFileSync(harnessPath, 'utf8');
    expect(source).toMatch(/\.\.\.buildEvidenceOutcome\(failure, outputDirectory\)/);
    expect(source).toMatch(/process\.stderr\.write\(formatFatalError\(error\)\)/);
  });

  it('starts protected cleanup before application setup and verifies a forced exit', async () => {
    const { closeElectronApplication } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof closeElectronApplication).toBe('function');
    if (typeof closeElectronApplication !== 'function') return;
    const processHandle = new EventEmitter() as EventEmitter & {
      exitCode: number | null;
      signalCode: string | null;
      kill: () => boolean;
    };
    processHandle.exitCode = null;
    processHandle.signalCode = null;
    processHandle.kill = () => {
      processHandle.signalCode = 'SIGKILL';
      queueMicrotask(() => processHandle.emit('exit', null, 'SIGKILL'));
      return true;
    };
    const application = {
      process: () => processHandle,
      close: async () => { throw new Error('close failed'); },
    };

    await expect(closeElectronApplication(application, { timeoutMs: 20 })).resolves.toEqual({
      graceful_close: false,
      forced_kill: true,
      process_exit_verified: true,
    });
    const source = readFileSync(harnessPath, 'utf8');
    const launch = source.indexOf('const application = await electron.launch(');
    const guarded = source.indexOf('const settled = await settlePostLaunchEvidence(', launch);
    const evaluate = source.indexOf('application.evaluate(', launch);
    const listener = source.indexOf("application.on('window'", launch);
    const cleanup = source.indexOf('() => closeElectronApplication(application)', guarded);
    expect(guarded).toBeGreaterThan(launch);
    expect(guarded).toBeLessThan(evaluate);
    expect(guarded).toBeLessThan(listener);
    expect(cleanup).toBeGreaterThan(listener);
  });

  it('rejects cleanup when a killed process does not confirm exit within the bound', async () => {
    const { closeElectronApplication } = require('../tools/ui/map_transition_profile.cjs');
    expect(typeof closeElectronApplication).toBe('function');
    if (typeof closeElectronApplication !== 'function') return;
    const processHandle = new EventEmitter() as EventEmitter & {
      exitCode: number | null;
      signalCode: string | null;
      kill: () => boolean;
    };
    processHandle.exitCode = null;
    processHandle.signalCode = null;
    processHandle.kill = () => true;
    const application = {
      process: () => processHandle,
      close: () => new Promise<void>(() => undefined),
    };

    await expect(closeElectronApplication(application, { timeoutMs: 5 }))
      .rejects.toThrow(/did not exit after forced kill/i);
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
