const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const tracked = cp.execFileSync('git', ['diff', '--name-only', '--', 'docs'], {encoding: 'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const staged = cp.execFileSync('git', ['diff', '--cached', '--name-only', '--', 'docs'], {encoding: 'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const untracked = cp.execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'docs'], {encoding: 'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const files = [...new Set([...tracked, ...staged, ...untracked])].filter(f => f.endsWith('.md')).sort();
if (!files.length) throw new Error('No changed Markdown files selected; empty scope is not verification.');
const missing = [];
let links = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:|app:|codex:)/.test(target)) continue;
    links++;
    const full = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(full)) missing.push({file, target});
  }
}
console.log(JSON.stringify({files: files.length, links, missing}, null, 2));
process.exitCode = missing.length ? 1 : 0;
