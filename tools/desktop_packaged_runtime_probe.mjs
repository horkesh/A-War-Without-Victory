import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const packagedExePath = join(root, 'dist-packaged', 'win-unpacked', 'A War Without Victory.exe');
const packagedResourcesPath = join(root, 'dist-packaged', 'win-unpacked', 'resources');
const packagedAppAsarPath = join(packagedResourcesPath, 'app.asar');
const manifestPath = join(root, 'dist-packaged', 'win-unpacked', 'awwv_desktop_runtime_probe_manifest.json');
const profileSuffix = process.env.AWWV_DESKTOP_RUNTIME_PROBE_PROFILE_SUFFIX || 'phase3-1';
if (!/^[A-Za-z0-9_-]+$/.test(profileSuffix)) {
  throw new Error('AWWV_DESKTOP_RUNTIME_PROBE_PROFILE_SUFFIX must contain only ASCII letters, digits, underscore, or hyphen');
}
const runtimeProbeProfilePath = join(
  root,
  'logs',
  'r9-build-preparation',
  `desktop-runtime-profile-${profileSuffix}`,
);

const strictCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function hashFileSha256(filePath) {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash('sha256');
    const input = createReadStream(filePath);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('error', rejectHash);
    input.on('end', () => resolveHash(hash.digest('hex')));
  });
}

async function readPackageIdentity() {
  return {
    app_asar_sha256: await hashFileSha256(packagedAppAsarPath),
    executable_sha256: await hashFileSha256(packagedExePath),
  };
}

if (!existsSync(packagedExePath)) {
  throw new Error(`Packaged desktop executable missing at ${packagedExePath}. Run \`npm run desktop:package:dir\` first.`);
}
if (!existsSync(packagedAppAsarPath)) {
  throw new Error(`Packaged desktop app.asar missing at ${packagedAppAsarPath}. Run \`npm run desktop:package:dir\` first.`);
}
if (existsSync(runtimeProbeProfilePath)) {
  throw new Error(`Packaged desktop runtime probe profile already exists: ${runtimeProbeProfilePath}`);
}
mkdirSync(runtimeProbeProfilePath, { recursive: true });

const packageIdentityBefore = await readPackageIdentity();

function runProbe() {
  rmSync(manifestPath, { force: true });
  return new Promise((resolve, reject) => {
    const child = spawn(packagedExePath, [`--user-data-dir=${runtimeProbeProfilePath}`], {
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
const packageIdentityAfter = await readPackageIdentity();
if (
  packageIdentityBefore.executable_sha256 !== packageIdentityAfter.executable_sha256
  || packageIdentityBefore.app_asar_sha256 !== packageIdentityAfter.app_asar_sha256
) {
  throw new Error('Packaged executable or app.asar changed while the probe was running');
}
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

manifest.package_identity = {
  app_asar_relative_path: relative(root, packagedAppAsarPath).replace(/\\/g, '/'),
  app_asar_sha256: packageIdentityAfter.app_asar_sha256,
  executable_relative_path: relative(root, packagedExePath).replace(/\\/g, '/'),
  executable_sha256: packageIdentityAfter.executable_sha256,
};
manifest.validation_profile = {
  relative_path: relative(root, runtimeProbeProfilePath).replace(/\\/g, '/'),
  suffix: profileSuffix,
};

const expectedBc09Files = [
  ['censusRolledUpWgs84', 'data/derived/census_rolled_up_wgs84.json'],
  ['municipalities1990Registry110', 'data/source/municipalities_1990_registry_110.json'],
  ['municipalityHqSettlement', 'data/derived/municipality_hq_settlement.json'],
  ['municipalityPopulation1991', 'data/derived/municipality_population_1991.json'],
  ['oobBrigades', 'data/source/oob_brigades.json'],
  ['settlementEthnicityData', 'data/derived/settlement_ethnicity_data.json'],
].sort((a, b) => strictCompare(a[0], b[0]));
const bc09ByteIdentity = [];
for (const [key, relativePath] of expectedBc09Files) {
  const sourcePath = join(root, relativePath);
  const packagedEntry = manifest?.files?.find?.(
    (entry) => entry?.key === key && entry?.relative_path === relativePath,
  );
  const sourceSha256 = await hashFileSha256(sourcePath);
  const sourceSizeBytes = statSync(sourcePath).size;
  const byteIdentical = packagedEntry?.sha256 === sourceSha256
    && packagedEntry?.size_bytes === sourceSizeBytes;
  bc09ByteIdentity.push({
    byte_identical: byteIdentical,
    key,
    packaged_sha256: packagedEntry?.sha256 ?? null,
    relative_path: relativePath,
    size_bytes: sourceSizeBytes,
    source_sha256: sourceSha256,
  });
}
const failedBc09Identity = bc09ByteIdentity.find((entry) => !entry.byte_identical);
if (failedBc09Identity) {
  throw new Error(`Packaged BC09 file is not byte-identical to source: ${failedBc09Identity.relative_path}`);
}
manifest.bc09_byte_identity = bc09ByteIdentity;

const audioAssetsSourcePath = join(root, 'src', 'ui', 'map', 'audio', 'audioAssets.ts');
const audioAssetsSource = readFileSync(audioAssetsSourcePath, 'utf8');
const sourceAudioPaths = Array.from(
  audioAssetsSource.matchAll(/^import\s+\w+Url\s+from\s+'([^']+\.ogg)';$/gm),
  (match) => join(dirname(audioAssetsSourcePath), match[1]),
).sort(strictCompare);
const sourceAudioAssets = await Promise.all(sourceAudioPaths.map(async (filePath) => ({
  relative_path: relative(root, filePath).replace(/\\/g, '/'),
  sha256: await hashFileSha256(filePath),
  size_bytes: statSync(filePath).size,
})));
const sourceAudioHashes = sourceAudioAssets.map((entry) => entry.sha256).sort(strictCompare);
const packagedAudioAssets = Array.isArray(manifest?.audio_assets) ? manifest.audio_assets : [];
const packagedAudioPaths = packagedAudioAssets.map((entry) => entry?.relative_path);
const packagedAudioHashes = packagedAudioAssets.map((entry) => entry?.sha256).sort(strictCompare);
const audioByteIdentical = sourceAudioPaths.length === 20
  && packagedAudioAssets.length === 20
  && JSON.stringify(packagedAudioPaths) === JSON.stringify([...packagedAudioPaths].sort(strictCompare))
  && JSON.stringify(sourceAudioHashes) === JSON.stringify(packagedAudioHashes);
if (!audioByteIdentical) {
  throw new Error('Packaged OGG hash multiset is not byte-identical to all 20 audioAssets.ts imports');
}
manifest.audio_identity = {
  byte_identical: true,
  packaged_hashes: packagedAudioHashes,
  packaged_ogg_count: packagedAudioAssets.length,
  source_assets: sourceAudioAssets,
  source_hashes: sourceAudioHashes,
  source_import_count: sourceAudioPaths.length,
};

const expectedExcludedResearchRoots = [
  'data/derived/scenario/baseline_ops_sensitivity',
  'data/derived/scenario/baseline_ops_sensitivity_run2',
  'data/derived/scenario/recruitment_test_matrix_2026_02_11',
  'data/derived/scenario/sweeps',
].sort(strictCompare);
const manifestExcludedResearchRoots = Array.isArray(manifest?.excluded_research_roots)
  ? manifest.excluded_research_roots
  : [];
const researchExclusions = expectedExcludedResearchRoots.map((relativePath) => {
  const manifestEntry = manifestExcludedResearchRoots.find(
    (entry) => entry?.relative_path === relativePath && entry?.absent === true,
  );
  return {
    absent: !existsSync(join(packagedResourcesPath, relativePath)),
    manifest_confirmed_absent: Boolean(manifestEntry),
    relative_path: relativePath,
  };
});
const failedResearchExclusion = researchExclusions.find(
  (entry) => !entry.absent || !entry.manifest_confirmed_absent,
);
if (failedResearchExclusion) {
  throw new Error(`Packaged research root is present or missing manifest proof: ${failedResearchExclusion.relative_path}`);
}
manifest.research_exclusions = researchExclusions;

if (
  manifest?.turn_advance?.successful !== true
  || manifest?.turn_advance?.from_turn !== 0
  || manifest?.turn_advance?.to_turn !== 1
  || manifest?.turn_advance?.input_state_unchanged !== true
  || manifest?.turn_advance?.player_faction !== 'RBiH'
) {
  throw new Error(`Packaged desktop runtime probe is missing successful production +1 turn proof.\n${JSON.stringify(manifest, null, 2)}`);
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
  { route: '/data/derived/settlements_wgs84_1990.geojson', expected_status: 200 },
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
  '/data/derived/settlements_wgs84_1990.geojson',
  '/data/source/boundaries/bih_adm3_1990.geojson',
]);
function isIgnorablePackagedRouteTeardownFailure(entry, url) {
  if (entry?.type !== 'request-failed') return false;
  if (!['net::ERR_FAILED', 'net::ERR_ABORTED'].includes(entry?.error)) return false;
  if (entry?.label !== 'webContents:unknown') return false;
  if (entry?.method !== 'GET') return false;
  if (entry?.resource_type !== 'xhr') return false;
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
