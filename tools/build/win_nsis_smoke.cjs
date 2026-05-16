'use strict';

/**
 * Windows NSIS installer smoke verifier.
 *
 * Verifies that the produced Win NSIS installer exists, has a plausible size
 * floor (>= 4 MiB to rule out empty stubs), and starts with a valid PE/MZ
 * header so we know it is actually an executable installer rather than a
 * truncated artifact.
 *
 * Determinism: this script reads file metadata and a small fixed-size header
 * window only. It does not introduce randomness, timestamps, or network I/O.
 *
 * Exit codes:
 *   0 — verification passed (or --report-only succeeded with file missing)
 *   1 — file missing when verification expected
 *   2 — header check failed (not a PE file)
 *   3 — size below floor
 *
 * Usage:
 *   node tools/build/win_nsis_smoke.cjs <pathToInstallerExe>
 *   node tools/build/win_nsis_smoke.cjs --report-only
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MZ_MAGIC = Buffer.from([0x4d, 0x5a]); // 'MZ'
const PE_MAGIC = Buffer.from([0x50, 0x45, 0x00, 0x00]); // 'PE\0\0'
const MIN_INSTALLER_BYTES = 4 * 1024 * 1024; // 4 MiB floor

function parseArgs(argv) {
  const args = { reportOnly: false, target: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--report-only') args.reportOnly = true;
    else if (!a.startsWith('--')) args.target = a;
  }
  return args;
}

function findDefaultInstaller(rootDir) {
  const packagedDir = path.join(rootDir, 'dist-packaged');
  if (!fs.existsSync(packagedDir)) return null;
  const entries = fs.readdirSync(packagedDir)
    .filter((name) => name.toLowerCase().endsWith('.exe') && /setup|install/i.test(name));
  entries.sort();
  return entries.length > 0 ? path.join(packagedDir, entries[0]) : null;
}

function checkPeHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, head, 0, 64, 0);
    if (bytesRead < 64) return { ok: false, reason: 'file too small for MZ stub' };
    const mzOk = head.slice(0, 2).equals(MZ_MAGIC);
    if (!mzOk) return { ok: false, mzOk: false, reason: 'missing MZ magic' };
    const peOffset = head.readUInt32LE(0x3c);
    if (peOffset <= 0 || peOffset > 64 * 1024) {
      return { ok: false, mzOk, peOk: false, peOffset, reason: 'PE offset out of range' };
    }
    const peBuf = Buffer.alloc(4);
    const peRead = fs.readSync(fd, peBuf, 0, 4, peOffset);
    const peOk = peRead === 4 && peBuf.equals(PE_MAGIC);
    return { ok: mzOk && peOk, mzOk, peOk, peOffset, reason: mzOk && peOk ? 'ok' : 'pe magic mismatch' };
  } finally {
    fs.closeSync(fd);
  }
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(__dirname, '..', '..');
  const target = args.target || findDefaultInstaller(rootDir);

  const report = {
    tool: 'win_nsis_smoke',
    target: target ? path.relative(rootDir, target) : null,
    exists: false,
    sizeBytes: null,
    sha256: null,
    releaseLog: null,
    sizeFloorBytes: MIN_INSTALLER_BYTES,
    header: null,
  };

  if (!target || !fs.existsSync(target)) {
    report.exists = false;
    if (args.reportOnly) {
      process.stdout.write(JSON.stringify(report) + '\n');
      process.exit(0);
      return;
    }
    process.stderr.write(`win_nsis_smoke: installer not found at ${target || '(none)'}\n`);
    process.stdout.write(JSON.stringify(report) + '\n');
    process.exit(1);
    return;
  }

  report.exists = true;
  const st = fs.statSync(target);
  report.sizeBytes = st.size;
  report.sha256 = sha256File(target);
  report.releaseLog = `win_nsis target=${report.target} sizeBytes=${report.sizeBytes} sha256=${report.sha256}`;
  report.header = checkPeHeader(target);

  process.stdout.write(JSON.stringify(report) + '\n');

  if (!report.header.ok) {
    process.exit(2);
    return;
  }
  if (st.size < MIN_INSTALLER_BYTES) {
    process.exit(3);
    return;
  }
  process.exit(0);
}

main();
