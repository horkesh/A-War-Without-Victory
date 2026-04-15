import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

test('package.json exposes one canonical packaged runtime probe command', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
    };

    assert.strictEqual(
        packageJson.scripts?.['desktop:package:probe'],
        'npm run desktop:package:dir && node tools\\desktop_packaged_runtime_probe.mjs',
        'packaged runtime probing should transitively inherit the canonical packaged-desktop contract',
    );
});

test('electron main exposes a packaged runtime probe mode instead of a second launch path', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');

    assert.match(
        source,
        /const RUNTIME_PROBE_MODE = process\.env\.AWWV_DESKTOP_RUNTIME_PROBE === '1';/,
        'packaged runtime probe should use an explicit env-controlled probe mode',
    );
    assert.match(
        source,
        /runPackagedRuntimeProbe\(\)/,
        'electron main should own the packaged runtime probe branch',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE_OK/,
        'probe mode should emit a stable success manifest for the external probe command',
    );
    assert.match(
        source,
        /waitForWindowLoad\(/,
        'packaged runtime probe should wait for the real main window load event',
    );
    assert.match(
        source,
        /window_checks:\s*\[/,
        'packaged runtime probe manifest should record the packaged main window load contract',
    );
    assert.match(
        source,
        /route:\s*warroomUrl[\s\S]*status:\s*'did-finish-load'/,
        'packaged runtime probe should assert the real packaged warroom window reaches did-finish-load',
    );
    assert.match(
        source,
        /app\.whenReady\(\)\.then\(\s*\(\)\s*=>\s*\{\s*registerProtocol\(\);[\s\S]*if \(RUNTIME_PROBE_MODE\)/,
        'probe mode must register the awwv protocol before trying to load the packaged main window',
    );
    assert.match(
        source,
        /getTacticalMapWindowUrl\(/,
        'secondary tactical-map window URLs should be built through one deterministic helper',
    );
    assert.doesNotMatch(
        source,
        /Date\.now\(/,
        'desktop tactical-map window routing should not depend on a timestamp cache buster',
    );
    assert.match(
        source,
        /packaged tactical map window/,
        'packaged runtime probe should exercise the real secondary tactical-map window path',
    );
    assert.match(
        source,
        /desktop_window=operational/,
        'secondary tactical-map probe should use a deterministic operational route marker',
    );
    assert.match(
        source,
        /packaged tactical sandbox window/,
        'packaged runtime probe should exercise the real tactical sandbox window path',
    );
    assert.match(
        source,
        /desktop_window=sandbox/,
        'tactical sandbox probe should use a deterministic sandbox route marker',
    );
    assert.match(
        source,
        /waitForDesktopSessionReady\(/,
        'packaged runtime probe should wait for the real tactical-map desktop session hook before sending probe traffic',
    );
    assert.match(
        source,
        /awwvDesktopSessionReady/,
        'packaged runtime probe should require an explicit renderer-ready marker from the operational tactical-map session hook',
    );
    assert.match(
        source,
        /waitForTacticalMapInteraction\(/,
        'packaged runtime probe should prove a minimal tactical-map interaction contract, not just route load',
    );
    assert.match(
        source,
        /getMapServerUrl !== 'function' \|\| typeof bridge\.getCurrentGameState !== 'function'/,
        'packaged tactical-map probe should require the real preload bridge functions',
    );
    assert.match(
        source,
        /tactical_interactions:\s*\[/,
        'packaged runtime probe manifest should record tactical interaction proofs',
    );
    assert.match(
        source,
        /armGameStatePushProbe\(/,
        'packaged runtime probe should prove the real tactical-map game-state push path',
    );
    assert.match(
        source,
        /collectGameStatePushProbe\(/,
        'packaged runtime probe should collect the armed tactical-map game-state push proof deterministically',
    );
    assert.match(
        source,
        /subscribeGameStateUpdated !== 'function'/,
        'packaged tactical-map push proof should require the real preload subscription bridge',
    );
    assert.match(
        source,
        /tactical_push_checks:\s*\[/,
        'packaged runtime probe manifest should record tactical state-push proofs',
    );
    assert.match(
        source,
        /sendGameStateToRenderer\(currentGameStateJson\)/,
        'packaged runtime probe should trigger the real desktop game-state push channel',
    );
    assert.match(
        source,
        /armTurnReportPushProbe\(/,
        'packaged runtime probe should prove the real turn-report push path',
    );
    assert.match(
        source,
        /collectTurnReportPushProbe\(/,
        'packaged runtime probe should collect the armed turn-report push proof deterministically',
    );
    assert.match(
        source,
        /subscribeTurnReportUpdated !== 'function'/,
        'packaged turn-report push proof should require the real preload subscription bridge',
    );
    assert.match(
        source,
        /turn_report_push_checks:\s*\[/,
        'packaged runtime probe manifest should record turn-report push proofs',
    );
    assert.match(
        source,
        /sendTurnReportToRenderer\(probeTurnReport\)/,
        'packaged runtime probe should trigger the real desktop turn-report push channel',
    );
    assert.match(
        source,
        /armRendererReactionProbe\(/,
        'packaged runtime probe should arm a probe-safe renderer reaction contract on the real tactical-map windows',
    );
    assert.match(
        source,
        /collectRendererReactionProbe\(/,
        'packaged runtime probe should collect the renderer-side reaction proof deterministically',
    );
    assert.match(
        source,
        /renderer_reaction_checks:\s*\[/,
        'packaged runtime probe manifest should record renderer-side reaction proofs',
    );
    assert.match(
        source,
        /document\.documentElement/,
        'packaged runtime probe should observe a renderer-owned DOM surface for reaction proof',
    );
    assert.match(
        source,
        /awwvProbeGameStateRouteMode/,
        'packaged runtime probe should require deterministic game-state reaction dataset fields',
    );
    assert.match(
        source,
        /awwvProbeGameStateFingerprintMatchesPayload/,
        'packaged runtime probe should require a renderer-side exact payload identity proof for game-state reactions',
    );
    assert.match(
        source,
        /awwvProbeGameStatePayloadLength/,
        'packaged runtime probe should require a deterministic payload-length proof for game-state reactions',
    );
    assert.match(
        source,
        /awwvProbeTurnReportProbe/,
        'packaged runtime probe should require deterministic turn-report reaction dataset fields',
    );
    assert.match(
        source,
        /awwvProbeTurnReportPayloadMatchesProbe/,
        'packaged runtime probe should require a renderer-side exact payload identity proof for turn-report reactions',
    );
    assert.match(
        source,
        /awwvProbeTurnReportPlayerFaction/,
        'packaged runtime probe should require deterministic turn-report player-faction reaction fields',
    );
    assert.doesNotMatch(
        source,
        /Date\.now\(/,
        'renderer reaction probing should not depend on timestamps',
    );
    assert.match(
        source,
        /tacticalWindowInteraction\.location_path[\s\S]*tacticalWindowInteraction\.map_server_url[\s\S]*tacticalWindowInteraction\.player_faction[\s\S]*tacticalWindowInteraction\.route_mode[\s\S]*tacticalWindowInteraction\.turn/s,
        'packaged runtime probe should record deterministic operational interaction details',
    );
    assert.match(
        source,
        /state\.meta\.game_over = true/,
        'packaged runtime probe should mutate the raw state to set game_over for endgame proof',
    );
    assert.match(
        source,
        /state\.meta\.outcome = 'timeout_stalemate'/,
        'packaged runtime probe should set a deterministic outcome type for endgame proof',
    );
    assert.match(
        source,
        /endgameStateJson/,
        'packaged runtime probe should serialize a distinct endgame state payload',
    );
    assert.match(
        source,
        /packaged endgame tactical map window/,
        'packaged runtime probe should create a fresh tactical-map window for endgame proof',
    );
    assert.match(
        source,
        /data-awwv-endgame-surface/,
        'packaged endgame probe should poll for the VerdictScreen data attribute',
    );
    assert.match(
        source,
        /endgame_checks:/,
        'packaged runtime probe manifest should record endgame reachability proof',
    );
    assert.match(
        source,
        /surface_type:[\s\S]*outcome_label:[\s\S]*has_pyrrhic_score:[\s\S]*has_war_cost:[\s\S]*has_faction_tabs:[\s\S]*has_awwv_title:/s,
        'packaged runtime probe endgame checks should record verdict surface DOM observations',
    );
    assert.match(
        source,
        /game_over_state_pushed:\s*true/,
        'packaged runtime probe endgame should confirm game-over state was pushed to renderer',
    );
    assert.match(
        source,
        /endgamePush\.player_faction/,
        'packaged runtime probe endgame should record player faction from the state push proof',
    );
});

test('probe tool launches the unpacked packaged executable with the runtime probe env', async () => {
    const source = await readFile(join(process.cwd(), 'tools', 'desktop_packaged_runtime_probe.mjs'), 'utf8');

    assert.match(
        source,
        /dist-packaged.*win-unpacked.*A War Without Victory\.exe/s,
        'probe tool should target the canonical unpacked packaged executable',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE: '1'/,
        'probe tool should launch the packaged executable in dedicated probe mode',
    );
    assert.match(
        source,
        /AWWV_DESKTOP_RUNTIME_PROBE_OK/,
        'probe tool should require the stable success manifest from the packaged executable',
    );
    assert.match(
        source,
        /window_checks[\s\S]*awwv:\/\/warroom\/index\.html[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the initial main-window load proof',
    );
    assert.match(
        source,
        /window_checks[\s\S]*desktop_window=operational[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the tactical-map secondary window proof',
    );
    assert.match(
        source,
        /window_checks[\s\S]*tactical_sandbox\.html\?desktop_window=sandbox[\s\S]*did-finish-load/s,
        'probe tool should fail if the packaged manifest omits the tactical sandbox route proof',
    );
    assert.match(
        source,
        /tactical_interactions[\s\S]*route_mode === 'operational'[\s\S]*location_path === '\/'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0/s,
        'probe tool should fail if the packaged manifest omits the tactical operational interaction proof',
    );
    assert.match(
        source,
        /tactical_interactions[\s\S]*route_mode === 'sandbox'[\s\S]*location_path === '\/tactical_sandbox\.html'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0/s,
        'probe tool should fail if the packaged manifest omits the tactical sandbox interaction proof',
    );
    assert.match(
        source,
        /tactical_push_checks[\s\S]*route_mode === 'operational'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0/s,
        'probe tool should fail if the packaged manifest omits the tactical operational state-push proof',
    );
    assert.match(
        source,
        /tactical_push_checks[\s\S]*route_mode === 'sandbox'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0/s,
        'probe tool should fail if the packaged manifest omits the tactical sandbox state-push proof',
    );
    assert.match(
        source,
        /turn_report_push_checks[\s\S]*route_mode === 'operational'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0[\s\S]*probe === 'awwv_turn_report_probe'/s,
        'probe tool should fail if the packaged manifest omits the tactical operational turn-report push proof',
    );
    assert.match(
        source,
        /turn_report_push_checks[\s\S]*route_mode === 'sandbox'[\s\S]*player_faction === 'RBiH'[\s\S]*turn === 0[\s\S]*probe === 'awwv_turn_report_probe'/s,
        'probe tool should fail if the packaged manifest omits the tactical sandbox turn-report push proof',
    );
    assert.match(
        source,
        /renderer_reaction_checks[\s\S]*route_mode === 'operational'[\s\S]*game_state_updated\?\.fingerprint_matches_payload === true[\s\S]*game_state_updated\?\.route_mode === 'operational'[\s\S]*game_state_updated\?\.location_path === '\/'[\s\S]*game_state_updated\?\.payload_length > 0[\s\S]*turn_report_updated\?\.payload_matches_probe === true[\s\S]*turn_report_updated\?\.player_faction === 'RBiH'[\s\S]*turn_report_updated\?\.probe === 'awwv_turn_report_probe'/s,
        'probe tool should fail if the packaged manifest omits the tactical operational renderer freshness proof',
    );
    assert.match(
        source,
        /awwv_desktop_runtime_probe_manifest\.json/,
        'probe tool should have a deterministic packaged-manifest fallback instead of relying only on GUI stdout',
    );
    assert.match(
        source,
        /endgame_checks/,
        'probe tool should fail if the packaged manifest omits the endgame reachability proof',
    );
    assert.match(
        source,
        /surface_type !== 'verdict' && endgameCheck\.surface_type !== 'fallback'/,
        'probe tool should validate that the endgame surface type is either verdict or fallback',
    );
    assert.match(
        source,
        /has_faction_tabs/,
        'probe tool should assert endgame surface contains faction tabs',
    );
    assert.match(
        source,
        /has_awwv_title/,
        'probe tool should assert endgame surface contains the A War Without Victory title',
    );
    assert.match(
        source,
        /game_over_state_pushed/,
        'probe tool should assert endgame game-over state was pushed',
    );
    assert.match(
        source,
        /route_mode !== 'operational'/,
        'probe tool should assert endgame state push used the operational route mode',
    );
});

test('renderer reaction proof instruments the real tactical-map session/store path in probe-safe form', async () => {
    const useDesktopSession = await readFile(join(process.cwd(), 'src', 'ui', 'map', 'hooks', 'useDesktopSession.ts'), 'utf8');
    const gameStore = await readFile(join(process.cwd(), 'src', 'ui', 'map', 'store', 'gameStore.ts'), 'utf8');

    assert.match(
        useDesktopSession,
        /recordDesktopProbeReaction\(/,
        'renderer reaction proof should instrument the existing tactical-map session hook, not a parallel probe-only renderer',
    );
    assert.match(
        useDesktopSession,
        /awwvDesktopSessionReady/,
        'renderer reaction proof should expose a deterministic tactical-map session readiness marker',
    );
    assert.match(
        useDesktopSession,
        /document\.documentElement/,
        'renderer reaction proof should write to a renderer-owned DOM surface that the packaged window probe can observe deterministically',
    );
    assert.match(
        useDesktopSession,
        /awwvProbeGameState/,
        'renderer reaction proof should record the store-backed game-state reaction',
    );
    assert.match(
        useDesktopSession,
        /fingerprint_matches_payload:\s*storeState\.lastLoadedStateFingerprint === stateJson/s,
        'renderer reaction proof should confirm the store preserved the exact pushed game-state payload',
    );
    assert.match(
        useDesktopSession,
        /awwvProbeTurnReport/,
        'renderer reaction proof should record the store-backed turn-report reaction',
    );
    assert.match(
        useDesktopSession,
        /payload_matches_probe:\s*lastTurnReport\?\.probe ===/s,
        'renderer reaction proof should confirm the store preserved the exact pushed turn-report marker',
    );
    assert.match(
        gameStore,
        /isRuntimeProbeActive\(/,
        'packaged renderer reaction proof should have an explicit probe-safe store scheduling gate',
    );
    assert.match(
        gameStore,
        /if \(isRuntimeProbeActive\(\)\) \{\s*queueMicrotask\(fn\);/s,
        'probe-safe renderer reaction scheduling should avoid hidden-window timer starvation without changing normal runtime flow',
    );

    const verdictScreen = await readFile(join(process.cwd(), 'src', 'ui', 'map', 'components', 'VerdictScreen.tsx'), 'utf8');
    assert.match(
        verdictScreen,
        /data-awwv-endgame-surface="verdict"/,
        'VerdictScreen verdict path should expose a probe-observable data attribute for packaged endgame proof',
    );
    assert.match(
        verdictScreen,
        /data-awwv-endgame-surface="fallback"/,
        'VerdictScreen fallback path should expose a probe-observable data attribute for packaged endgame proof',
    );
    assert.match(
        verdictScreen,
        /data-awwv-endgame-outcome/,
        'VerdictScreen should expose the outcome label as a probe-observable data attribute',
    );
});
