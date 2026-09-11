import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = 'F:/A-War-Without-Victory';
const base = '997b2fb6c559c933203bae070dfba7b7299660f3';
const snapshot = path.join(root, 'logs/r7-english-readability/closeout-audit-start.json');
const allowed = new Set([
  'docs/plans/2026-07-31-content-history-localization-audio-plan.md',
  'docs/40_reports/implemented/20260905_R7_PRESENTATION_ENGLISH_READABILITY.md',
  'docs/plans/COMMAND_BOARD.md',
  'docs/plans/MASTER_ROADMAP.md',
  'docs/PROJECT_LEDGER.md',
]);
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  console.log(JSON.stringify({ command: ['git', ...args], exitCode: result.status }));
  if (result.status !== 0) throw new Error(result.stderr || 'git failed');
  return result.stdout;
}
const branch = git(['branch', '--show-current']).trim();
const head = git(['rev-parse', 'HEAD']).trim();
const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
if (process.argv[2] === 'start') {
  if (branch !== 'codex/r7-english-readability' || head !== base) throw new Error('Unexpected starting checkout');
  const tracked = git(['status', '--short', '--untracked-files=no']);
  fs.writeFileSync(snapshot, JSON.stringify({ base, branch, head, tracked, untracked }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ branch, head, untrackedCount: untracked.length, snapshot }));
} else {
  const before = JSON.parse(fs.readFileSync(snapshot, 'utf8'));
  git(['merge-base', '--is-ancestor', base, 'HEAD']);
  const trackedStatus = git(['status', '--short', '--untracked-files=no']);
  const changed = git(['diff', '--name-only', base]).trim().split('\n').filter(Boolean);
  const unexpected = changed.filter(file => !allowed.has(file));
  const lost = before.untracked.filter(file => !fs.existsSync(path.join(root, file)));
  const whitespace = git(['diff', '--check', base]);
  const linkResults = [];
  for (const file of changed) {
    const patch = git(['diff', '--unified=0', base, '--', file]);
    for (const line of patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'))) {
      for (const match of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].replace(/^<|>$/g, '').split('#')[0];
        if (!target || /^[a-z]+:\/\//i.test(target)) continue;
        const resolved = path.resolve(root, path.dirname(file), decodeURIComponent(target));
        linkResults.push({ file, target, exists: fs.existsSync(resolved) });
      }
    }
  }
  const failedLinks = linkResults.filter(row => !row.exists);
  const result = { branch, head, base, trackedStatus, changed, unexpected, missingPreservedEvidence: lost, addedLocalLinks: linkResults, whitespaceClean: !whitespace, roadmapChars: fs.readFileSync(path.join(root, 'docs/plans/MASTER_ROADMAP.md'), 'utf8').length };
  console.log(JSON.stringify(result, null, 2));
  if (branch !== before.branch || unexpected.length || lost.length || failedLinks.length) process.exitCode = 1;
}
