/**
 * Phase R1.3 — Equivalence harness: fingerprint canonical artifacts for migration comparison.
 * Environment A = current repo (tracked node_modules); Environment B = after migration (untracked + install).
 * No network calls; no repo mutations except writing report under data/derived/_debug (gitignored).
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';


const R1_3_KEYS = [
  'vendor-migration-without-decision',
  'node_modules-unvendor-without-harness',
  'equivalence-check-too-shallow',
  'ignore-tracked-mismatch-left-ambiguous',
];

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const DEBUG_DIR = resolve(REPO_ROOT, 'data/derived/_debug');
const MANIFEST_PATH = resolve(DEBUG_DIR, 'equivalence_manifest_r1_3.json');

const DEFAULT_CANONICAL_PATHS: string[] = [
  'data/derived/settlements_substrate.geojson',
  'data/derived/substrate_viewer/data_index.json',
  'data/derived/data_index.json',
  'data/derived/settlement_contact_graph.json',
  'data/derived/municipality_borders_from_settlements.geojson',
  'data/derived/mun1990_adjacency_graph.json',
  'package-lock.json',
];

interface ArtifactEntry {
  path: string;
  bytes: number;
  sha256: string;
}

interface Manifest {
  phase: string;
  paths: string[];
  artifacts: Record<string, { bytes: number; sha256: string }>;
  pipeline_run?: { commands: string[]; stdout_stderr_summary: string[] };
}

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function fingerprintPath(repoRoot: string, relPath: string): ArtifactEntry | null {
  const full = resolve(repoRoot, relPath);
  if (!existsSync(full)) return null;
  try {
    const buf = readFileSync(full);
    return {
      path: relPath,
      bytes: buf.length,
      sha256: sha256Hex(buf),
    };
  } catch {
    return null;
  }
}

function loadPathsFile(repoRoot: string, pathsFile: string): string[] {
  const full = resolve(repoRoot, pathsFile);
  const content = readFileSync(full, 'utf8');
  return content
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function runPipeline(repoRoot: string): { commands: string[]; stdout_stderr_summary: string[] } {
  const commands: string[] = [];
  const summary: string[] = [];
  const run = (command: string): void => {
    commands.push(command);
    try {
      const out = execSync(command, {
        encoding: 'utf8',
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      summary.push(`OK: ${command} (stdout ${(out?.length ?? 0)} chars)`);
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string };
      const stdoutLen = (e.stdout?.length ?? 0);
      const stderrLen = (e.stderr?.length ?? 0);
      summary.push(`FAIL: ${command} (stdout ${stdoutLen} chars, stderr ${stderrLen} chars)`);
    }
  };
  run('npm run map:validate');
  run('npm run sim:mapcheck');
  return { commands, stdout_stderr_summary: summary };
}

function buildManifest(
  repoRoot: string,
  paths: string[],
  pipelineRun?: { commands: string[]; stdout_stderr_summary: string[] }
): Manifest {
  const sortedPaths = [...paths].sort();
  const artifacts: Record<string, { bytes: number; sha256: string }> = {};
  for (const p of sortedPaths) {
    const entry = fingerprintPath(repoRoot, p);
    if (entry) {
      artifacts[p] = { bytes: entry.bytes, sha256: entry.sha256 };
    }
  }
  const manifest: Manifest = {
    phase: 'R1.3',
    paths: sortedPaths,
    artifacts,
    ...(pipelineRun && { pipeline_run: pipelineRun }),
  };
  return manifest;
}

function compareManifests(current: Manifest, prior: Manifest): void {
  const curKeys = new Set(Object.keys(current.artifacts));
  const priorKeys = new Set(Object.keys(prior.artifacts));
  const missing: string[] = [...priorKeys].filter((k) => !curKeys.has(k)).sort();
  const newFiles: string[] = [...curKeys].filter((k) => !priorKeys.has(k)).sort();
  const changed: string[] = [];
  for (const k of curKeys) {
    if (prior.artifacts[k] && prior.artifacts[k].sha256 !== current.artifacts[k].sha256) {
      changed.push(k);
    }
  }
  changed.sort();

  if (missing.length === 0 && newFiles.length === 0 && changed.length === 0) {
    console.log('Comparison result: identical');
    return;
  }
  if (missing.length > 0) console.log('Missing (in prior, absent in current):', missing.join(', '));
  if (newFiles.length > 0) console.log('New (in current, absent in prior):', newFiles.join(', '));
  if (changed.length > 0) console.log('Changed (hash differs):', changed.join(', '));
}

function main(): void {

  const args = process.argv.slice(2);
  let pathsFile: string | null = null;
  let runPipelineFlag = false;
  let compareTo: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pathsFile' && args[i + 1]) {
      pathsFile = args[++i];
    } else if (args[i] === '--runPipeline') {
      runPipelineFlag = true;
    } else if (args[i] === '--compareTo' && args[i + 1]) {
      compareTo = args[++i];
    }
  }

  const paths = pathsFile ? loadPathsFile(REPO_ROOT, pathsFile) : DEFAULT_CANONICAL_PATHS;

  let pipelineRun: { commands: string[]; stdout_stderr_summary: string[] } | undefined;
  if (runPipelineFlag) {
    pipelineRun = runPipeline(REPO_ROOT);
    console.log('Pipeline run:', pipelineRun.commands.join('; '));
    for (const s of pipelineRun.stdout_stderr_summary) console.log(' ', s);
  }

  const manifest = buildManifest(REPO_ROOT, paths, pipelineRun);

  if (!existsSync(DEBUG_DIR)) mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest written to:', MANIFEST_PATH);

  if (compareTo) {
    const priorPath = resolve(REPO_ROOT, compareTo);
    if (!existsSync(priorPath)) {
      console.error('Prior manifest not found:', priorPath);
      process.exitCode = 1;
      return;
    }
    const prior: Manifest = JSON.parse(readFileSync(priorPath, 'utf8'));
    compareManifests(manifest, prior);
  }
}

main();
