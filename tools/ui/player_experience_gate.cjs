const { spawn } = require('node:child_process');

const PLAYER_EXPERIENCE_GATE_STEPS = [
  { label: 'TypeScript typecheck', script: 'typecheck' },
  { label: 'Desktop release build', script: 'desktop:release:check' },
  { label: 'Electron runtime contracts', script: 'qa:electron-runtime-contracts' },
  { label: 'Player journey UI regressions', script: 'qa:player-journeys' },
  { label: 'First-hour browser proof', script: 'qa:first-hour:browser' },
  { label: 'Live surface browser proof', script: 'qa:live-surface:browser' },
];

const BLOCKED_OUTPUT_PATTERNS = [
  { label: 'build warning', pattern: /\[WARNING\]/ },
  { label: 'desktop sim CJS import.meta warning', pattern: /empty-import-meta/ },
  { label: 'browser externalized Node module warning', pattern: /__vite-browser-external/ },
  { label: 'Vite chunk-size warning', pattern: /Some chunks are larger than/i },
  { label: 'missing runtime module', pattern: /Cannot find module/i },
  { label: 'Node process warning', pattern: /\b(?:DeprecationWarning|\[DEP\d+\])/ },
  { label: 'PATH-dependent Vite command', pattern: /(?:'vite' is not recognized|vite: command not found)/i },
];

function findPlayerExperienceGateFailures(output) {
  return BLOCKED_OUTPUT_PATTERNS.flatMap(({ label, pattern }) => {
    const match = output.match(pattern);
    return match ? [{ label, match: match[0] }] : [];
  });
}

function buildNpmRunInvocation(script, platform = process.platform) {
  const isWindows = platform === 'win32';
  if (isWindows) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npm.cmd run ${script}`],
      shell: false,
    };
  }

  return {
    command: 'npm',
    args: ['run', script],
    shell: false,
  };
}

function runNpmScript(script, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const invocation = buildNpmRunInvocation(script);
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env: process.env,
      shell: invocation.shell,
      windowsHide: true,
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });
    child.on('error', (error) => {
      const text = `${error.stack ?? error.message}\n`;
      output += text;
      process.stderr.write(text);
      resolve({ status: 1, output });
    });
    child.on('close', (status) => {
      resolve({ status: status ?? 1, output });
    });
  });
}

async function runPlayerExperienceGate(cwd = process.cwd()) {
  let combinedOutput = '';

  for (const step of PLAYER_EXPERIENCE_GATE_STEPS) {
    console.log(`[player-experience-gate] ${step.label}: npm run ${step.script}`);
    const result = await runNpmScript(step.script, cwd);
    combinedOutput += result.output;
    if (result.status !== 0) {
      console.error(`[player-experience-gate] ${step.script} failed with exit code ${result.status}`);
      return result.status;
    }
  }

  const failures = findPlayerExperienceGateFailures(combinedOutput);
  if (failures.length > 0) {
    console.error('[player-experience-gate] blocked output signatures found:');
    for (const failure of failures) {
      console.error(`- ${failure.label}: ${failure.match}`);
    }
    return 1;
  }

  console.log('[player-experience-gate] output scan clean');
  return 0;
}

if (require.main === module) {
  runPlayerExperienceGate()
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  PLAYER_EXPERIENCE_GATE_STEPS,
  buildNpmRunInvocation,
  findPlayerExperienceGateFailures,
  runPlayerExperienceGate,
};
