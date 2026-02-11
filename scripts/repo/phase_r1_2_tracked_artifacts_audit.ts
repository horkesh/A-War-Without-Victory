/**
 * Phase R1.2 — Tracked artifacts policy audit (node_modules, dist, res).
 * Report-only: no deletions, no .gitignore changes.
 * Output: human-readable console report + optional JSON to data/derived/_debug/tracked_artifacts_audit_r1_2.json
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const R1_2_KEYS = [
  'node_modules-policy-blind',
  'dist-policy-blind',
  'res-policy-blind',
  'tracked-artifacts-silent-change',
];

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const DEBUG_JSON_PATH = resolve(REPO_ROOT, 'data/derived/_debug/tracked_artifacts_audit_r1_2.json');

interface FileEntry {
  path: string;
  bytes: number;
}

function gitLsFiles(): string[] {
  const out = execSync('git ls-files', { encoding: 'utf8', cwd: REPO_ROOT });
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getTrackedUnder(prefix: string): string[] {
  const all = gitLsFiles();
  const normalized = prefix.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  return all.filter((p) => p.replace(/\\/g, '/').startsWith(normalized)).sort();
}

function getFileSize(path: string): number {
  const full = resolve(REPO_ROOT, path);
  if (!existsSync(full)) return 0;
  try {
    const st = statSync(full, { throwIfNoEntry: false });
    return st?.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

function firstTwoSegments(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return p;
  return parts.slice(0, 2).join('/');
}

function gitEarliestCommitTouch(pathPrefix: string): { hash: string; date: string; message: string } | null {
  const prefix = pathPrefix.replace(/\\/g, '/');
  try {
    const out = execSync(
      `git log --reverse --format=%H%x00%ai%x00%s -1 -- "${prefix}"`,
      { encoding: 'utf8', cwd: REPO_ROOT, maxBuffer: 1024 * 1024 }
    );
    const [hash, date, ...msgParts] = out.trim().split('\0');
    if (!hash) return null;
    return { hash, date: date || '', message: msgParts.join('\0').trim() || '' };
  } catch {
    return null;
  }
}

function readGitignore(): string {
  const p = resolve(REPO_ROOT, '.gitignore');
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf8');
}

function main(): void {

  const tracked = gitLsFiles();
  const nodeModules = getTrackedUnder('node_modules');
  const dist = getTrackedUnder('dist');
  const res = getTrackedUnder('res');

  const gitignoreContent = readGitignore();
  const ignoresNodeModules = /^node_modules(\/|$)/m.test(gitignoreContent) || gitignoreContent.includes('node_modules/');
  const ignoresDist = /^dist(\/|$)/m.test(gitignoreContent) || gitignoreContent.includes('dist/');

  const ignoreTrackedMismatch: string[] = [];
  if (ignoresNodeModules && nodeModules.length > 0) ignoreTrackedMismatch.push('node_modules');
  if (ignoresDist && dist.length > 0) ignoreTrackedMismatch.push('dist');

  const vendorMarkers: Record<string, boolean> = {
    '.npmrc': existsSync(resolve(REPO_ROOT, '.npmrc')),
    'pnpm-lock.yaml': existsSync(resolve(REPO_ROOT, 'pnpm-lock.yaml')),
    'package-lock.json': existsSync(resolve(REPO_ROOT, 'package-lock.json')),
    'yarn.lock': existsSync(resolve(REPO_ROOT, 'yarn.lock')),
  };

  const nodeModulesWithSize: FileEntry[] = nodeModules.map((p) => ({ path: p, bytes: getFileSize(p) }));
  const distWithSize: FileEntry[] = dist.map((p) => ({ path: p, bytes: getFileSize(p) }));
  const resWithSize: FileEntry[] = res.map((p) => ({ path: p, bytes: getFileSize(p) }));

  const nodeModulesBySegment = new Map<string, number>();
  for (const e of nodeModulesWithSize) {
    const seg = firstTwoSegments(e.path);
    nodeModulesBySegment.set(seg, (nodeModulesBySegment.get(seg) ?? 0) + e.bytes);
  }
  const topNodeModulesBySegment = [...nodeModulesBySegment.entries()]
    .map(([path, bytes]) => ({ path, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 30);

  const topNodeModulesFiles = [...nodeModulesWithSize].sort((a, b) => b.bytes - a.bytes).slice(0, 30);
  const topDistFiles = [...distWithSize].sort((a, b) => b.bytes - a.bytes).slice(0, 30);

  const earliestNodeModules = gitEarliestCommitTouch('node_modules');
  const earliestDist = gitEarliestCommitTouch('dist');
  const earliestRes = gitEarliestCommitTouch('res');

  const totalNodeModulesBytes = nodeModulesWithSize.reduce((s, e) => s + e.bytes, 0);
  const totalDistBytes = distWithSize.reduce((s, e) => s + e.bytes, 0);
  const totalResBytes = resWithSize.reduce((s, e) => s + e.bytes, 0);

  // ----- Console report -----
  console.log('=== Phase R1.2 Tracked artifacts audit ===\n');

  console.log('A) Tracked counts');
  console.log(`   node_modules/: ${nodeModules.length} files, ${totalNodeModulesBytes} bytes`);
  console.log(`   dist/:         ${dist.length} files, ${totalDistBytes} bytes`);
  console.log(`   res/:         ${res.length} files, ${totalResBytes} bytes`);

  console.log('\nB) Top contributors (by size)');
  console.log('   node_modules/ by first 2 path segments (top 30):');
  for (const e of topNodeModulesBySegment) {
    console.log(`      ${e.path}: ${e.bytes} bytes`);
  }
  console.log('   node_modules/ top 30 files by bytes:');
  for (const e of topNodeModulesFiles) {
    console.log(`      ${e.path}: ${e.bytes} bytes`);
  }
  console.log('   dist/ top 30 files by bytes:');
  for (const e of topDistFiles) {
    console.log(`      ${e.path}: ${e.bytes} bytes`);
  }
  console.log('   res/ all tracked files with sizes:');
  for (const e of resWithSize) {
    console.log(`      ${e.path}: ${e.bytes} bytes`);
  }

  console.log('\nC) Tracking anomalies');
  console.log(`   .gitignore ignores node_modules: ${ignoresNodeModules}`);
  console.log(`   .gitignore ignores dist:         ${ignoresDist}`);
  if (ignoreTrackedMismatch.length > 0) {
    console.log(`   IGNORE-TRACKED MISMATCH: ${ignoreTrackedMismatch.join(', ')} (ignored by .gitignore but have tracked files)`);
  }
  console.log('   Vendor policy markers present:');
  for (const [name, present] of Object.entries(vendorMarkers)) {
    console.log(`      ${name}: ${present}`);
  }

  console.log('\nD) Earliest commit touching (suggested evidence for "why tracked")');
  if (earliestNodeModules) {
    console.log(`   node_modules: ${earliestNodeModules.hash} ${earliestNodeModules.date} ${earliestNodeModules.message}`);
  } else {
    console.log('   node_modules: (no commit found)');
  }
  if (earliestDist) {
    console.log(`   dist:         ${earliestDist.hash} ${earliestDist.date} ${earliestDist.message}`);
  } else {
    console.log('   dist: (no commit found)');
  }
  if (earliestRes) {
    console.log(`   res:          ${earliestRes.hash} ${earliestRes.date} ${earliestRes.message}`);
  } else {
    console.log('   res: (no commit found)');
  }

  // ----- JSON output (stable key order) -----
  const report = {
    phase: 'R1.2',
    tracked_counts: {
      node_modules: { files: nodeModules.length, bytes: totalNodeModulesBytes },
      dist: { files: dist.length, bytes: totalDistBytes },
      res: { files: res.length, bytes: totalResBytes },
    },
    top_node_modules_by_segment: topNodeModulesBySegment,
    top_node_modules_files: topNodeModulesFiles,
    top_dist_files: topDistFiles,
    res_all_files: resWithSize,
    gitignore_ignores_node_modules: ignoresNodeModules,
    gitignore_ignores_dist: ignoresDist,
    ignore_tracked_mismatch: ignoreTrackedMismatch,
    vendor_markers: vendorMarkers,
    earliest_commit_node_modules: earliestNodeModules,
    earliest_commit_dist: earliestDist,
    earliest_commit_res: earliestRes,
  };

  const debugDir = resolve(REPO_ROOT, 'data/derived/_debug');
  if (!existsSync(debugDir)) {
    mkdirSync(debugDir, { recursive: true });
  }
  writeFileSync(DEBUG_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nJSON report written to: ${DEBUG_JSON_PATH}`);
}

main();
