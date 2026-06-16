import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const packagedExePath = join(root, 'dist-packaged', 'win-unpacked', 'A War Without Victory.exe');
const manifestPath = join(root, 'dist-packaged', 'win-unpacked', 'awwv_desktop_runtime_probe_manifest.json');

if (!existsSync(packagedExePath)) {
  throw new Error(`Packaged desktop executable missing at ${packagedExePath}. Run \`npm run desktop:package:dir\` first.`);
}

function runProbe() {
  rmSync(manifestPath, { force: true });
  return new Promise((resolve, reject) => {
    const child = spawn(packagedExePath, [], {
      cwd: root,
      env: {
        ...process.env,
        AWWV_DESKTOP_RUNTIME_PROBE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const result = await runProbe();
const combinedOutput = `${result.stdout}\n${result.stderr}`;
const match = combinedOutput.match(/AWWV_DESKTOP_RUNTIME_PROBE_OK (\{.+\})/s);
const manifest = match
  ? JSON.parse(match[1])
  : (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null);

if (result.code !== 0) {
  throw new Error(`Packaged desktop runtime probe failed with exit code ${result.code}.\n${combinedOutput}`.trim());
}

if (!manifest) {
  throw new Error(`Packaged desktop runtime probe did not emit a success manifest.\n${combinedOutput}`.trim());
}
const windowCheck = manifest?.window_checks?.find?.(
  (entry) => entry?.route === 'awwv://warroom/index.html' && entry?.status === 'did-finish-load',
);
const tacticalMapWindowCheck = manifest?.window_checks?.find?.(
  (entry) => entry?.route?.endsWith?.('/?desktop_window=operational') && entry?.status === 'did-finish-load',
);
const tacticalSandboxWindowCheck = manifest?.window_checks?.find?.(
  (entry) => entry?.route?.endsWith?.('/tactical_sandbox.html?desktop_window=sandbox') && entry?.status === 'did-finish-load',
);
const expectedEventCatalogRoutes = [
  '/data/scenarios/events/war_1992.json',
  '/data/scenarios/events/war_1992_hrhb_summer.json',
  '/data/scenarios/events/war_1993.json',
  '/data/scenarios/events/war_1994.json',
  '/data/scenarios/events/war_1995.json',
  '/data/scenarios/events/consequences.json',
];
const missingEventCatalogRoutes = expectedEventCatalogRoutes.filter((route) => !manifest?.map_server_checks?.some?.(
  (entry) => entry?.route === route && entry?.status === 200,
));
const operationalInteractionCheck = manifest?.tactical_interactions?.find?.(
  (entry) =>
    entry?.route_mode === 'operational' &&
    entry?.location_path === '/' &&
    entry?.map_server_url &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0,
);
const sandboxInteractionCheck = manifest?.tactical_interactions?.find?.(
  (entry) =>
    entry?.route_mode === 'sandbox' &&
    entry?.location_path === '/tactical_sandbox.html' &&
    entry?.map_server_url &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0,
);
const operationalPushCheck = manifest?.tactical_push_checks?.find?.(
  (entry) =>
    entry?.route_mode === 'operational' &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0,
);
const sandboxPushCheck = manifest?.tactical_push_checks?.find?.(
  (entry) =>
    entry?.route_mode === 'sandbox' &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0,
);
const operationalTurnReportPushCheck = manifest?.turn_report_push_checks?.find?.(
  (entry) =>
    entry?.route_mode === 'operational' &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0 &&
    entry?.probe === 'awwv_turn_report_probe',
);
const sandboxTurnReportPushCheck = manifest?.turn_report_push_checks?.find?.(
  (entry) =>
    entry?.route_mode === 'sandbox' &&
    entry?.player_faction === 'RBiH' &&
    entry?.turn === 0 &&
    entry?.probe === 'awwv_turn_report_probe',
);
const operationalRendererReactionCheck = manifest?.renderer_reaction_checks?.find?.(
  (entry) =>
    entry?.route_mode === 'operational' &&
    entry?.game_state_updated?.fingerprint_matches_payload === true &&
    entry?.game_state_updated?.route_mode === 'operational' &&
    entry?.game_state_updated?.location_path === '/' &&
    entry?.game_state_updated?.payload_length > 0 &&
    entry?.game_state_updated?.player_faction === 'RBiH' &&
    entry?.game_state_updated?.turn === 0 &&
    entry?.turn_report_updated?.payload_matches_probe === true &&
    entry?.turn_report_updated?.player_faction === 'RBiH' &&
    entry?.turn_report_updated?.route_mode === 'operational' &&
    entry?.turn_report_updated?.probe === 'awwv_turn_report_probe' &&
    entry?.turn_report_updated?.turn === 0,
);

if (!windowCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the initial window-load proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!tacticalMapWindowCheck || tacticalMapWindowCheck.status !== 'did-finish-load') {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical-map secondary window proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!tacticalSandboxWindowCheck || tacticalSandboxWindowCheck.status !== 'did-finish-load') {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical sandbox route proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (missingEventCatalogRoutes.length > 0) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing DataLoader event catalog HTTP proof for: ${missingEventCatalogRoutes.join(', ')}.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!operationalInteractionCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical operational interaction proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!sandboxInteractionCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical sandbox interaction proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!operationalPushCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical operational state-push proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!sandboxPushCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical sandbox state-push proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!operationalTurnReportPushCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical operational turn-report push proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!sandboxTurnReportPushCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical sandbox turn-report push proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!operationalRendererReactionCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the tactical operational renderer-reaction proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

const endgameCheck = manifest?.endgame_checks;
if (!endgameCheck) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing the endgame reachability proof.\n${JSON.stringify(manifest, null, 2)}`,
  );
}
if (endgameCheck.surface_type !== 'verdict' && endgameCheck.surface_type !== 'fallback') {
  throw new Error(
    `Packaged desktop runtime probe endgame surface type is unexpected: ${endgameCheck.surface_type}.\n${JSON.stringify(manifest, null, 2)}`,
  );
}
if (!endgameCheck.has_faction_tabs) {
  throw new Error(
    `Packaged desktop runtime probe endgame surface is missing faction tabs (ARBiH/VRS/HVO).\n${JSON.stringify(manifest, null, 2)}`,
  );
}
if (!endgameCheck.has_awwv_title) {
  throw new Error(
    `Packaged desktop runtime probe endgame surface is missing the "A War Without Victory" title.\n${JSON.stringify(manifest, null, 2)}`,
  );
}
if (!endgameCheck.state_push?.game_over_state_pushed) {
  throw new Error(
    `Packaged desktop runtime probe endgame did not confirm game-over state was pushed.\n${JSON.stringify(manifest, null, 2)}`,
  );
}
if (endgameCheck.state_push?.route_mode !== 'operational') {
  throw new Error(
    `Packaged desktop runtime probe endgame state push reported unexpected route mode: ${endgameCheck.state_push?.route_mode}.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
