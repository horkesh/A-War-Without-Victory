import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const [checkout, pre, expectedCommit, output] = process.argv.slice(2);
if (!output) throw new Error('Usage: checkout PRE expectedCommit output');
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8' }).trim();
const meta = JSON.parse(fs.readFileSync(path.join(pre, 'run_meta.json'), 'utf8'));
async function hash(file) {
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
const mismatches = [];
for (const input of meta.provenance.consumed_inputs.files) {
  // Match run_provenance.ts normalizeForHash; artifact comparisons remain raw bytes.
  const normalized = fs.readFileSync(path.join(checkout, input.path), 'utf8').replace(/\r\n/g, '\n');
  const actual = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  if (actual !== input.sha256) mismatches.push({ path: input.path, expected: input.sha256, actual });
}
const preCheckout = 'F:/AWWV-worktrees/r7-readability-pre';
const packageChecks = [];
for (const name of ['package.json', 'package-lock.json', 'src/ui/map/package.json']) {
  const actual = await hash(path.join(checkout, name));
  const expected = await hash(path.join(preCheckout, name));
  packageChecks.push({ path: name, actual, expected, match: actual === expected });
}
const result = { checkout, expectedCommit, commit: git('rev-parse', 'HEAD'),
  status: git('status', '--porcelain'), node: process.version,
  checkedInputs: meta.provenance.consumed_inputs.files.length, mismatches, packageChecks };
result.pass = result.commit === expectedCommit && result.status === '' && result.node === 'v22.23.2'
  && mismatches.length === 0 && packageChecks.every(p => p.match);
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
