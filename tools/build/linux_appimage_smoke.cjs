'use strict';

/**
 * Linux AppImage smoke verifier.
 *
 * Verifies that the produced Linux AppImage artifact exists, is executable,
 * and has the expected ELF/AppImage magic header. Optionally invokes the
 * AppImage with --appimage-extract-and-run --no-sandbox if AWWV_SMOKE_LAUNCH=1
 * and the host environment supports it (Linux + xvfb or display).
 *
 * Determinism: this script reads file metadata and a small fixed-size header
 * window only. It does not introduce randomness, timestamps, or network I/O.
 *
 * Exit codes:
 *   0 — verification passed (or --report-only succeeded with file missing)
 *   1 — file missing or not executable when verification expected
 *   2 — header check failed
 *   3 — launch attempt failed (only when AWWV_SMOKE_LAUNCH=1)
 *
 * Usage:
 *   node tools/build/linux_appimage_smoke.cjs <pathToAppImage>
 *   node tools/build/linux_appimage_smoke.cjs --report-only
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // 0x7F 'E' 'L' 'F'
const APPIMAGE_TYPE2_OFFSET = 8;
const APPIMAGE_TYPE2_MAGIC = Buffer.from([0x41, 0x49, 0x02]); // 'A' 'I' 0x02

function parseArgs(argv) {
  const args = { reportOnly: false, target: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--report-only') args.reportOnly = true;
    else if (!a.startsWith('--')) args.target = a;
  }
  return args;
}

function findDefaultAppImage(rootDir) {
  const packagedDir = path.join(rootDir, 'dist-packaged');
  if (!fs.existsSync(packagedDir)) return null;
  const entries = fs.readdirSync(packagedDir).filter((name) => name.toLowerCase().endsWith('.appimage'));
  entries.sort(); // deterministic ordering
  return entries.length > 0 ? path.join(packagedDir, entries[0]) : null;
}

function checkHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buf, 0, 16, 0);
    if (bytesRead < 11) return { ok: false, reason: 'file too small for ELF/AppImage header' };
    const elfOk = buf.slice(0, 4).equals(ELF_MAGIC);
    const aiOk = buf.slice(APPIMAGE_TYPE2_OFFSET, APPIMAGE_TYPE2_OFFSET + 3).equals(APPIMAGE_TYPE2_MAGIC);
    return {
      ok: elfOk && aiOk,
      elfOk,
      aiOk,
      reason: elfOk && aiOk ? 'ok' : `elf=${elfOk} appimage=${aiOk}`,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function isExecutable(filePath) {
  // On Windows the executable bit is not meaningful; we report mode metadata only.
  // On Unix we check user-executable bit (0o100).
  const st = fs.statSync(filePath);
  if (process.platform === 'win32') return { ok: true, mode: st.mode, note: 'win32: x-bit not enforced' };
  return { ok: (st.mode & 0o100) !== 0, mode: st.mode };
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function tryLaunch(filePath) {
  if (process.platform !== 'linux') {
    return { ok: false, skipped: true, reason: 'launch requires linux host' };
  }
  const result = spawnSync(filePath, ['--appimage-extract-and-run', '--no-sandbox', '--version'], {
    timeout: 30_000,
    encoding: 'utf8',
  });
  return {
    ok: result.status === 0,
    skipped: false,
    status: result.status,
    stdout: (result.stdout || '').slice(0, 512),
    stderr: (result.stderr || '').slice(0, 512),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(__dirname, '..', '..');
  const target = args.target || findDefaultAppImage(rootDir);

  const report = {
    tool: 'linux_appimage_smoke',
    target: target ? path.relative(rootDir, target) : null,
    exists: false,
    sizeBytes: null,
    sha256: null,
    releaseLog: null,
    executable: null,
    header: null,
    launch: null,
  };

  if (!target || !fs.existsSync(target)) {
    report.exists = false;
    if (args.reportOnly) {
      process.stdout.write(JSON.stringify(report) + '\n');
      process.exit(0);
      return;
    }
    process.stderr.write(`linux_appimage_smoke: AppImage not found at ${target || '(none)'}\n`);
    process.stdout.write(JSON.stringify(report) + '\n');
    process.exit(1);
    return;
  }

  report.exists = true;
  const st = fs.statSync(target);
  report.sizeBytes = st.size;
  report.sha256 = sha256File(target);
  report.releaseLog = `linux_appimage target=${report.target} sizeBytes=${report.sizeBytes} sha256=${report.sha256}`;
  report.executable = isExecutable(target);
  report.header = checkHeader(target);

  if (process.env.AWWV_SMOKE_LAUNCH === '1') {
    report.launch = tryLaunch(target);
  }

  process.stdout.write(JSON.stringify(report) + '\n');

  if (!report.header.ok) {
    process.exit(2);
    return;
  }
  if (!report.executable.ok) {
    process.exit(1);
    return;
  }
  if (report.launch && !report.launch.ok && !report.launch.skipped) {
    process.exit(3);
    return;
  }
  process.exit(0);
}

main();
