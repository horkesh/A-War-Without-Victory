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

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
