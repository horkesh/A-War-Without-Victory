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
  (entry) => {
    const route = String(entry?.route || '');
    return route.includes('/?') && route.includes('desktop_window=operational') && entry?.status === 'did-finish-load';
  },
);
const tacticalSandboxWindowCheck = manifest?.window_checks?.find?.(
  (entry) => {
    const route = String(entry?.route || '');
    return route.includes('/tactical_sandbox.html?') && route.includes('desktop_window=sandbox') && entry?.status === 'did-finish-load';
  },
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
const expectedPackagedRouteInventory = [
  { route: '/data/derived/operational/operational_settlements.geojson', expected_status: 200 },
  { route: '/data/derived/terrain/settlements_terrain_scalars.json', expected_status: 200 },
  { route: '/data/derived/tiles/osm.pmtiles', expected_status: 206, range: 'bytes=0-15' },
  { route: '/font/Open%20Sans%20Bold/0-255.pbf', expected_status: 200 },
  { route: '/font/Open%20Sans%20Bold/256-511.pbf', expected_status: 200 },
  { route: '/data/ui/hq_rbih_clickable_regions.json', expected_status: 200 },
  { route: '/data/ui/hq_rs_clickable_regions.json', expected_status: 200 },
  { route: '/data/ui/hq_hrhb_clickable_regions.json', expected_status: 200 },
  { route: '/data/source/settlements_initial_master.json', expected_status: 200 },
  { route: '/assets/ui/icons/icon_warning.svg', expected_status: 200 },
];
const missingPackagedRouteInventory = expectedPackagedRouteInventory.filter((expected) => !manifest?.route_inventory_checks?.some?.(
  (entry) =>
    entry?.route === expected.route &&
    entry?.status === expected.expected_status &&
    (expected.range == null || entry?.range === expected.range),
));
const runtimeProbeTeardownSafeRoutes = new Set([
  '/data/derived/operational/operational_settlements.geojson',
]);
function isIgnorablePackagedRouteTeardownFailure(entry, url) {
  if (entry?.type !== 'request-failed') return false;
  if (entry?.error !== 'net::ERR_FAILED') return false;
  if (entry?.label !== 'webContents:unknown') return false;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') return false;
    return runtimeProbeTeardownSafeRoutes.has(decodeURIComponent(parsed.pathname));
  } catch (_error) {
    return false;
  }
}
function isIgnorableRuntimeProbeFailure(entry) {
  const url = String(entry?.url || entry?.source_id || '');
  const message = String(entry?.message || entry?.error || '');
  if (url.includes('/favicon.ico') || url.endsWith('favicon.ico')) return true;
  if (url.startsWith('data:')) return true;
  if (url.startsWith('blob:')) return true;
  if (entry?.resource_type === 'font' && /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\//.test(url)) return true;
  if (isIgnorablePackagedRouteTeardownFailure(entry, url)) return true;
  if (message.includes('data:') || message.includes('blob:')) return true;
  if (message.includes('favicon.ico')) return true;
  if (
    message.includes('ERR_ABORTED') &&
    entry?.type === 'did-fail-load' &&
    entry?.is_main_frame === false &&
    entry?.intentional_abort === true
  ) return true;
  return false;
}
const runtimeFailureChecks = Array.isArray(manifest?.runtime_failure_checks)
  ? manifest.runtime_failure_checks
  : null;
const disallowedRuntimeFailures = (runtimeFailureChecks ?? []).filter((entry) => !isIgnorableRuntimeProbeFailure(entry));
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

if (missingPackagedRouteInventory.length > 0) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing route inventory proof for: ${missingPackagedRouteInventory.map((entry) => `${entry.route}=${entry.expected_status}`).join(', ')}.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (!runtimeFailureChecks) {
  throw new Error(
    `Packaged desktop runtime probe manifest is missing runtime failure checks.\n${JSON.stringify(manifest, null, 2)}`,
  );
}

if (disallowedRuntimeFailures.length > 0) {
  throw new Error(
    `Packaged desktop runtime probe captured renderer/network failures.\n${JSON.stringify(disallowedRuntimeFailures, null, 2)}`,
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
