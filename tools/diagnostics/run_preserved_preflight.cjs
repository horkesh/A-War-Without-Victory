#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

const RESERVED_FILES = new Set([
    'entry-script.snapshot',
    'start.json',
    'stdout.log',
    'stderr.log',
    'receipt.json',
]);

function failUsage(message) {
    process.stderr.write(`${message}\n`);
    process.stderr.write('usage: run_preserved_preflight.cjs --attempt-dir DIR --entry-script FILE --timeout-ms MS [--allow-artifact RELATIVE_FILE]... -- EXECUTABLE ARG...{evidenceDir}...\n');
    process.exit(3);
}

function parseArgs(argv) {
    let attemptDir = null;
    let entryScript = null;
    let timeoutMs = null;
    const allowedArtifacts = [];
    let index = 0;
    for (; index < argv.length && argv[index] !== '--'; index += 1) {
        const option = argv[index];
        const value = argv[index + 1];
        if (!value) failUsage(`missing value for ${option}`);
        if (option === '--attempt-dir') attemptDir = value;
        else if (option === '--entry-script') entryScript = value;
        else if (option === '--timeout-ms') timeoutMs = Number(value);
        else if (option === '--allow-artifact') allowedArtifacts.push(value);
        else failUsage(`unknown option: ${option}`);
        index += 1;
    }
    const command = argv.slice(index + 1);
    if (!attemptDir || !entryScript || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || command.length < 2) {
        failUsage('missing or invalid required argument');
    }
    if (!command.some((value) => value.includes('{evidenceDir}'))) {
        failUsage('child argv must contain {evidenceDir}');
    }
    return { attemptDir, entryScript, timeoutMs, allowedArtifacts, command };
}

function safeRelativeFile(value) {
    if (typeof value !== 'string' || value.length === 0 || path.isAbsolute(value)) return null;
    const normalized = value.replaceAll('\\', '/');
    if (normalized === '.' || normalized.endsWith('/') || normalized.split('/').some((part) => part === '' || part === '.' || part === '..')) return null;
    return normalized;
}

function sha256(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

function normalizedTextSha256(bytes) {
    return sha256(bytes.toString('utf8').replace(/\r\n/g, '\n'));
}

function digestFile(file, relativePath = null) {
    const bytes = fs.readFileSync(file);
    return {
        path: relativePath ?? file.replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: sha256(bytes),
    };
}

function listFiles(root, current = root) {
    const files = [];
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) files.push(...listFiles(root, absolute));
        else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
        else files.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
    return files.sort();
}

const parsed = parseArgs(process.argv.slice(2));
const attemptDir = path.resolve(parsed.attemptDir);
const entryScript = path.resolve(parsed.entryScript);
const allowedArtifacts = parsed.allowedArtifacts.map((item) => {
    const normalized = safeRelativeFile(item);
    if (!normalized || RESERVED_FILES.has(normalized)) failUsage(`invalid allowed artifact path: ${item}`);
    return normalized;
});
if (new Set(allowedArtifacts).size !== allowedArtifacts.length) failUsage('duplicate allowed artifact path');
if (!fs.statSync(entryScript, { throwIfNoEntry: false })?.isFile()) failUsage('entry script must be an existing file');

const substitutedArgv = parsed.command.map((value) => value.replaceAll('{evidenceDir}', attemptDir));
const resolvedEntry = path.normalize(entryScript).toLowerCase();
if (!substitutedArgv.slice(1).some((value) => path.resolve(value).toLowerCase() === resolvedEntry)) {
    failUsage('entry script must appear as an exact child argument');
}

try {
    fs.mkdirSync(attemptDir);
} catch (error) {
    if (error?.code === 'EEXIST') failUsage(`attempt directory already exists: ${attemptDir}`);
    throw error;
}

const artifactPath = (name) => path.join(attemptDir, name);
const initialSource = fs.readFileSync(entryScript);
fs.writeFileSync(artifactPath('entry-script.snapshot'), initialSource, { flag: 'wx' });
const start = {
    schema: 'awwv.preserved-preflight.start.v1',
    start_utc: new Date().toISOString(),
    cwd: process.cwd().replaceAll('\\', '/'),
    attempt_dir: attemptDir.replaceAll('\\', '/'),
    timeout_ms: parsed.timeoutMs,
    original_argv: parsed.command,
    argv: substitutedArgv,
    placeholder_contract: '{evidenceDir}',
    allowed_artifacts: allowedArtifacts,
    entry_script: {
        path: entryScript.replaceAll('\\', '/'),
        bytes: initialSource.length,
        raw_sha256: sha256(initialSource),
        normalized_text_sha256: normalizedTextSha256(initialSource),
        snapshot: digestFile(artifactPath('entry-script.snapshot'), 'entry-script.snapshot'),
    },
};
fs.writeFileSync(artifactPath('start.json'), `${JSON.stringify(start, null, 2)}\n`, { flag: 'wx' });
const stdoutFd = fs.openSync(artifactPath('stdout.log'), 'wx');
const stderrFd = fs.openSync(artifactPath('stderr.log'), 'wx');

let child = null;
let timer = null;
let timedOut = false;
let timeoutCleanup = null;
let spawnError = null;
let settled = false;

function finish(code, signal) {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);

    let currentSource = null;
    let sourceReadError = null;
    try {
        currentSource = fs.readFileSync(entryScript);
    } catch (error) {
        sourceReadError = String(error?.message ?? error);
    }
    const sourceMatches = currentSource !== null && sha256(currentSource) === start.entry_script.raw_sha256;
    const files = listFiles(attemptDir);
    const permitted = new Set([...RESERVED_FILES].filter((name) => name !== 'receipt.json').concat(allowedArtifacts));
    const unexpectedArtifacts = files.filter((name) => !permitted.has(name));
    const missingAllowedArtifacts = allowedArtifacts.filter((name) => !files.includes(name));
    const childExit = timedOut ? 124 : spawnError ? 125 : Number.isInteger(code) ? code : 128;
    const contractFailed = !sourceMatches || unexpectedArtifacts.length > 0 || (!spawnError && missingAllowedArtifacts.length > 0);
    const wrapperExit = timedOut ? 124 : spawnError ? 125 : contractFailed ? 126 : childExit;
    const retainedArtifacts = allowedArtifacts
        .filter((name) => files.includes(name))
        .map((name) => digestFile(path.join(attemptDir, name), name));
    const receipt = {
        ...start,
        schema: 'awwv.preserved-preflight.receipt.v1',
        end_utc: new Date().toISOString(),
        pid: child?.pid ?? null,
        child_exit: childExit,
        wrapper_exit: wrapperExit,
        signal: signal ?? null,
        timed_out: timedOut,
        timeout_cleanup: timeoutCleanup,
        spawn_error: spawnError,
        entry_script_post: {
            path: entryScript.replaceAll('\\', '/'),
            bytes: currentSource?.length ?? null,
            raw_sha256: currentSource ? sha256(currentSource) : null,
            normalized_text_sha256: currentSource ? normalizedTextSha256(currentSource) : null,
            matches_start_raw_sha256: sourceMatches,
            read_error: sourceReadError,
        },
        stdout: digestFile(artifactPath('stdout.log'), 'stdout.log'),
        stderr: digestFile(artifactPath('stderr.log'), 'stderr.log'),
        retained_artifacts: retainedArtifacts,
        artifact_contract: {
            pass: unexpectedArtifacts.length === 0 && (spawnError !== null || missingAllowedArtifacts.length === 0),
            unexpected: unexpectedArtifacts,
            missing_allowed: missingAllowedArtifacts,
        },
    };
    fs.writeFileSync(artifactPath('receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ attempt_dir: start.attempt_dir, child_exit: childExit, wrapper_exit: wrapperExit, receipt: 'receipt.json' })}\n`);
    process.exit(wrapperExit);
}

try {
    child = childProcess.spawn(substitutedArgv[0], substitutedArgv.slice(1), {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', stdoutFd, stderrFd],
        windowsHide: true,
    });
} catch (error) {
    spawnError = { code: error?.code ?? null, syscall: error?.syscall ?? null, path: error?.path ?? null, message: String(error?.message ?? error) };
    finish(null, null);
}

if (child) {
    timer = setTimeout(() => {
        timedOut = true;
        if (process.platform === 'win32') {
            const killed = childProcess.spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
            timeoutCleanup = { method: 'taskkill-tree', status: killed.status, signal: killed.signal ?? null, error_code: killed.error?.code ?? null };
        } else {
            const killed = child.kill('SIGKILL');
            timeoutCleanup = { method: 'SIGKILL', killed };
        }
    }, parsed.timeoutMs);
    child.once('error', (error) => {
        spawnError = { code: error?.code ?? null, syscall: error?.syscall ?? null, path: error?.path ?? null, message: String(error?.message ?? error) };
    });
    child.once('close', finish);
}
