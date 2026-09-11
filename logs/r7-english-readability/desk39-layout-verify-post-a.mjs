import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [run, pre, expectedCommit, output] = process.argv.slice(2);
if (!output) throw new Error('Usage: POST-A PRE expectedCommit output');
const meta = JSON.parse(fs.readFileSync(path.join(run, 'run_meta.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(run, 'run_summary.json'), 'utf8'));
async function streamStats(file) {
  const h = crypto.createHash('sha256');
  let lines = 0, bytes = 0, finalByte;
  for await (const chunk of fs.createReadStream(file)) {
    h.update(chunk); bytes += chunk.length;
    for (let i = chunk.indexOf(10); i !== -1; i = chunk.indexOf(10, i + 1)) lines++;
    finalByte = chunk.at(-1);
  }
  if (bytes && finalByte !== 10) lines++;
  return { sha256: h.digest('hex'), bytes, lines };
}
const replay = await streamStats(path.join(run, 'replay_sequence.jsonl'));
const preReplay = await streamStats(path.join(pre, 'replay_sequence.jsonl'));
const save = await streamStats(path.join(run, 'final_save.json'));
const preSave = await streamStats(path.join(pre, 'final_save.json'));
const checks = {
  clean: meta.provenance.git_dirty === false,
  commit: meta.provenance.git_commit === expectedCommit,
  node: meta.provenance.node_version === 'v22.23.2',
  metaWeeks: meta.weeks === 188,
  summaryWeeks: summary.weeks === 188,
  replayFrames: replay.lines === 188,
  replayIdentical: replay.sha256 === preReplay.sha256,
  finalSaveIdentical: save.sha256 === preSave.sha256,
};
const result = { run, pre, expectedCommit, provenance: meta.provenance, checks,
  replay, preReplay, finalSaveSha256: save.sha256, finalStateFingerprint: save.sha256.slice(0, 16),
  pass: Object.values(checks).every(Boolean) };
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checks, replay, finalStateFingerprint: result.finalStateFingerprint, pass: result.pass }));
if (!result.pass) process.exitCode = 1;
