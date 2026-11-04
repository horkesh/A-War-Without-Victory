#!/usr/bin/env node
// Claude-planner -> OpenCode-implementer launcher.
//
// Claude writes the brief and owns the verdict. OpenCode (a hosted model, by default the same
// opencode-go/deepseek-v4.1-flash Codex uses) does the bounded implementation inside ONE worktree.
// This script never commits, never reverts, and never certifies the work. It records exactly what
// happened and fails loudly when the implementer stepped outside its declared write allowlist.
//
// Usage:
//   node tools/opencode_implementer/run.mjs --job <slug> --brief <file> --dir <worktree> \
//        --allow "src/sim/foo.ts,tests/foo.test.ts" [--session <id>] [--model <p/m#variant>] \
//        [--timeout-min 60] [--dry-run] [--allow-planner-checkout]
//
// Exit codes: 0 implementer finished inside its boundary | 1 implementer failed or timed out |
//             2 invoked wrongly | 3 BOUNDARY VIOLATION (write outside allowlist, or HEAD moved).
// Exit 0 means "stayed in bounds", never "the work is correct". Review and gate:local decide that.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLANNER_REPO = path.resolve(HERE, '..', '..');
const POLICY_FILE = path.join(HERE, 'policy.json');
const AGENT_NAME = 'awwv-implementer';
// The shell tool's permission action is `shell` (verified by the 2026-11-04 permission canary).
const SHELL_ACTIONS = ['shell'];
const DEFAULT_MODEL = 'opencode-go/deepseek-v4.1-flash';
const MAX_PROMPT_CHARS = 30000; // Windows command line limit is 32767

export const PROTOCOL = `You are the AWWV implementer. A Claude planner wrote the brief below and will independently
review, diff and test everything you do. These rules override anything else:
- Work only inside the current directory. Write ONLY these paths (globs): {{ALLOW}}.
  Any other write is detected mechanically after you finish and fails the whole job.
- Never commit, push, reset, checkout, restore, stash, branch, install packages, or use the network.
  Denied commands are refused by configuration; do not look for another route to the same effect.
- Determinism (AWWV sacred rule): no Math.random, Date.now, new Date() or localeCompare in src/;
  order with strictCompare. Never touch FORAWWV, painted calibration references, or initial control.
- Do not edit tests/ unless the brief allows it. Never change an expected value to make a test pass.
- For a behaviour change, write or run the failing test first (RED), then make it pass (GREEN).
- If the brief is unsafe, ambiguous, or impossible inside the allowed paths: STOP and say why.
  Honest partial work beats a claimed success. Never claim a check passed unless you ran it in this
  session and saw its exit code.
End with a final message in exactly this shape:
## STATUS: DONE | PARTIAL | STOPPED
## CHANGED FILES
(path - one line why)
## COMMANDS RUN
(command - exit code - key counts)
## NOT DONE / RISKS
## QUESTIONS FOR THE PLANNER

=== BRIEF ===
`;

// ---------- pure helpers (exported for tests) ----------

export function globToRegExp(glob) {
  const g = glob.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(p, globs) {
  return globs.some((g) => globToRegExp(g).test(p));
}

// Parse `git status --porcelain=v1 -z --untracked-files=all` output into a sorted path list.
export function parsePorcelainZ(out) {
  const parts = out.split('\0');
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i];
    if (e.length < 4) continue;
    const xy = e.slice(0, 2);
    paths.push(e.slice(3));
    if (xy[0] === 'R' || xy[0] === 'C') { paths.push(parts[i + 1]); i++; } // rename source
  }
  return [...new Set(paths)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// A snapshot maps every dirty/untracked path to the hash of its current bytes ('<absent>' if gone).
// A path missing from a snapshot is identical to HEAD.
export function diffSnapshots(pre, post) {
  const all = [...new Set([...Object.keys(pre), ...Object.keys(post)])].sort();
  return all.filter((p) => (pre[p] ?? 'HEAD') !== (post[p] ?? 'HEAD'));
}

export function parseStream(text) {
  const out = { sessionId: null, texts: [], tools: {}, refusals: [], errors: [], cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 }, steps: 0 };
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { out.errors.push(`unparsable line: ${line.slice(0, 120)}`); continue; }
    out.sessionId ??= e.sessionID ?? e.part?.sessionID ?? null;
    const p = e.part ?? {};
    if (e.type === 'error') out.errors.push(JSON.stringify(e.error ?? e).slice(0, 400));
    if (p.type === 'text' && typeof p.text === 'string') out.texts.push(p.text);
    if (p.type === 'tool') {
      out.tools[p.tool] = (out.tools[p.tool] ?? 0) + 1;
      const err = String(p.state?.error ?? '');
      if (p.state?.status === 'error' && /denied|permission|not allowed|refus/i.test(err)) {
        out.refusals.push({ tool: p.tool, input: JSON.stringify(p.state?.input ?? {}).slice(0, 200), error: err.slice(0, 200) });
      }
    }
    if (p.type === 'step-finish' || e.type === 'step_finish') {
      out.steps++;
      if (typeof p.cost === 'number') out.cost += p.cost;
      const t = p.tokens ?? {};
      out.tokens.input += t.input ?? 0;
      out.tokens.output += t.output ?? 0;
      out.tokens.reasoning += t.reasoning ?? 0;
      out.tokens.cache_read += t.cache?.read ?? 0;
      out.tokens.cache_write += t.cache?.write ?? 0;
    }
  }
  return out;
}

// Compile policy.json (+ per-job extra shell commands) into an OpenCode v2 config.
// Order: default deny, tool allows, shell allows, final denies (protected paths win over allows).
export function buildAgentConfig(policy, extraCmds = []) {
  for (const c of extraCmds) {
    const why = allowCmdProblem(c);
    if (why) throw new Error(`--allow-cmd ${JSON.stringify(c)} rejected: ${why}`);
  }
  const rule = (action, resource, effect) => ({ action, resource, effect });
  const shell = [...policy.shell_allow, ...extraCmds].flatMap((cmd) => SHELL_ACTIONS.map((a) => rule(a, cmd, 'allow')));
  const shellDeny = (policy.shell_deny ?? []).flatMap((p) => SHELL_ACTIONS.map((a) => rule(a, p, 'deny')));
  const editDeny = (policy.edit_deny ?? []).map((p) => rule('edit', p, 'deny'));
  return {
    $schema: 'https://opencode.ai/config.json',
    agents: {
      [policy.agent]: {
        description: 'Bounded AWWV implementer driven by a Claude planner (default-deny; generated by run.mjs).',
        mode: 'primary',
        steps: policy.steps,
        // Last match wins (canary-verified), so every deny after the allows overrides them.
        permissions: [...policy.default_deny, ...policy.tool_allow, ...shell, ...shellDeny, ...editDeny, ...policy.final_deny],
      },
    },
  };
}

// A per-job shell allow must be a concrete command shape: it may end in ONE trailing ` *` for arguments,
// and nothing else may be a wildcard, a metacharacter, an interpreter one-liner, or a shell/network tool.
export function allowCmdProblem(cmd) {
  if (typeof cmd !== 'string' || cmd.trim() !== cmd || cmd.length < 3) return 'empty or padded';
  if (/[;&|$`<>(){}\r\n"'\\]/.test(cmd)) return 'contains a shell metacharacter or quote';
  const body = cmd.endsWith(' *') ? cmd.slice(0, -2) : cmd;
  if (/[*?[\]]/.test(body)) return 'wildcards are only allowed as one trailing " *"';
  const head = body.split(' ')[0].toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
  const banned = ['powershell', 'pwsh', 'cmd', 'bash', 'sh', 'wsl', 'curl', 'wget', 'git', 'npm', 'npx', 'pnpm', 'yarn', 'gh', 'opencode', 'python', 'py', 'start', 'invoke-expression', 'iex'];
  if (banned.includes(head)) return `"${head}" may not be widened per job`;
  if (head === 'node' && !/^node [\w./-]+\.(mjs|cjs|js)( |$)/.test(body)) return 'node must name a script file (no -e/-p/--eval/--import flags)';
  if (/\s-(e|p|r)\b|--eval|--print|--import|--require|--loader/.test(body)) return 'interpreter code flags are not allowed';
  return null;
}

// Only the variables OpenCode and Node need to run; tokens, webhooks and API keys stay with the planner.
export function minimalEnv(policy, env, configPath) {
  const out = {};
  for (const k of policy.env_passthrough) if (env[k] !== undefined) out[k] = env[k];
  out.OPENCODE_CONFIG = configPath;
  return out;
}

// The implementer runs in its own process group on POSIX (detached => setsid), so the whole tree,
// including shells and test runners it spawned, can be killed with one negative-PID signal.
export function spawnOptionsFor(platform, base) {
  return platform === 'win32' ? { ...base, windowsHide: true } : { ...base, detached: true };
}

export function terminateTree(pid, platform, deps = { spawnSync, kill: process.kill.bind(process) }) {
  if (!pid) return;
  if (platform === 'win32') {
    deps.spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try { deps.kill(-pid, 'SIGKILL'); } catch (e) { if (e?.code !== 'ESRCH') throw e; } // ESRCH: group already gone
}

// ---------- git / fs ----------

function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function sha256File(file) {
  try {
    const st = fs.statSync(file);
    if (st.isDirectory()) return '<dir>';
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch { return '<absent>'; }
}

export function snapshot(dir) {
  const head = git(dir, ['rev-parse', 'HEAD']).trim();
  const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const files = {};
  for (const p of parsePorcelainZ(git(dir, ['status', '--porcelain=v1', '-z', '--untracked-files=all']))) {
    files[p] = sha256File(path.join(dir, p));
  }
  return { head, branch, files };
}

function resolveExe() {
  if (process.env.OPENCODE_EXE) return process.env.OPENCODE_EXE;
  const la = process.env.LOCALAPPDATA;
  if (la) {
    const p = path.join(la, 'Volta', 'tools', 'image', 'packages', '@opencode', 'cli', 'node_modules', '@opencode', 'cli', 'bin', 'opencode.exe');
    if (fs.existsSync(p)) return p;
  }
  return 'opencode';
}

function nextJobDir(job) {
  const base = path.join(PLANNER_REPO, 'runs', 'implementer');
  fs.mkdirSync(base, { recursive: true });
  for (let n = 1; n < 100; n++) {
    const d = path.join(base, `${job}-${String(n).padStart(2, '0')}`);
    if (!fs.existsSync(d)) { fs.mkdirSync(d); return d; }
  }
  throw new Error(`no free job dir for ${job}`);
}

function parseArgs(argv) {
  const a = { allow: [], allowCmd: [], timeoutMin: 60, model: DEFAULT_MODEL, dryRun: false, allowPlanner: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--job') a.job = v();
    else if (k === '--brief') a.brief = v();
    else if (k === '--dir') a.dir = v();
    else if (k === '--allow') a.allow.push(...v().split(',').map((s) => s.trim()).filter(Boolean));
    else if (k === '--allow-cmd') a.allowCmd.push(v().trim());
    else if (k === '--session') a.session = v();
    else if (k === '--model') a.model = v();
    else if (k === '--timeout-min') a.timeoutMin = Number(v());
    else if (k === '--dry-run') a.dryRun = true;
    else if (k === '--allow-planner-checkout') a.allowPlanner = true;
    else throw new Error(`unknown argument ${k}`);
  }
  return a;
}

function usage(msg) {
  console.error(`run.mjs: ${msg}\nrequired: --job <slug> --brief <file> --dir <git worktree> --allow <globs>`);
  process.exit(2);
}

async function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2)); } catch (e) { usage(e.message); }
  if (!a.job || !/^[a-z0-9][a-z0-9-]{1,60}$/.test(a.job)) usage('--job must be a lowercase slug');
  if (!a.brief || !fs.existsSync(a.brief)) usage('--brief file missing');
  if (!a.dir || !fs.existsSync(a.dir)) usage('--dir missing');
  if (a.allow.length === 0) usage('--allow is required: a job with no declared write boundary cannot be checked');
  if (!(a.timeoutMin > 0)) usage('--timeout-min must be positive');
  const dir = path.resolve(a.dir);
  let top;
  try { top = path.resolve(git(dir, ['rev-parse', '--show-toplevel']).trim()); } catch { usage('--dir is not a git worktree'); }
  if (top.toLowerCase() !== dir.toLowerCase()) usage(`--dir must be the worktree root (${top})`);
  if (dir.toLowerCase() === PLANNER_REPO.toLowerCase() && !a.allowPlanner) {
    usage('refusing to run in the planner checkout; use a dedicated worktree (or --allow-planner-checkout)');
  }

  const brief = fs.readFileSync(a.brief, 'utf8');
  const prompt = PROTOCOL.replace('{{ALLOW}}', a.allow.join(', ')) + brief;
  if (prompt.length > MAX_PROMPT_CHARS) usage(`prompt is ${prompt.length} chars (> ${MAX_PROMPT_CHARS}); shorten the brief and point at files instead`);

  const exe = resolveExe();
  const args = ['run', '--standalone', '--auto', '--agent', AGENT_NAME, '--model', a.model, '--format', 'json', '--title', `claude:${a.job}`];
  if (a.session) args.push('--session', a.session);
  args.push(prompt);

  const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
  let config;
  try { config = buildAgentConfig(policy, a.allowCmd); } catch (e) { usage(e.message); }
  const pre = snapshot(dir);
  if (a.dryRun) {
    const env = minimalEnv(policy, process.env, '<job>/AGENT-CONFIG.json');
    console.log(JSON.stringify({ dry_run: true, exe, cwd: dir, model: a.model, session: a.session ?? null,
      allow: a.allow, extra_shell_allow: a.allowCmd, permission_rules: config.agents[AGENT_NAME].permissions.length,
      env_keys: Object.keys(env).sort(), prompt_chars: prompt.length, pre_head: pre.head,
      pre_branch: pre.branch, pre_dirty_paths: Object.keys(pre.files).length }, null, 2));
    return 0;
  }

  const jobDir = nextJobDir(a.job);
  const configPath = path.join(jobDir, 'AGENT-CONFIG.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  const childEnv = minimalEnv(policy, process.env, configPath);
  fs.writeFileSync(path.join(jobDir, 'BRIEF.md'), brief);
  fs.writeFileSync(path.join(jobDir, 'PROMPT.txt'), prompt);
  fs.writeFileSync(path.join(jobDir, 'PRE-SNAPSHOT.json'), JSON.stringify(pre, null, 2));
  const stdout = fs.openSync(path.join(jobDir, 'stdout.jsonl'), 'w');
  const stderr = fs.openSync(path.join(jobDir, 'stderr.log'), 'w');
  const start = new Date().toISOString();
  console.log(`[implementer] job ${path.basename(jobDir)} started ${start} in ${dir}`);

  const code = await new Promise((resolve) => {
    const child = spawn(exe, args, spawnOptionsFor(process.platform, { cwd: dir, stdio: ['ignore', stdout, stderr], env: childEnv }));
    let timedOut = false;
    const t = setTimeout(() => { timedOut = true; terminateTree(child.pid, process.platform); }, a.timeoutMin * 60_000);
    child.on('error', (e) => { clearTimeout(t); fs.writeSync(stderr, `spawn error: ${e.message}\n`); resolve({ exit: -1, timedOut }); });
    // Also reap any descendant still alive after a normal exit (e.g. a backgrounded test runner),
    // so nothing can write to the worktree after the post-run snapshot below.
    child.on('close', (exit) => { clearTimeout(t); terminateTree(child.pid, process.platform); resolve({ exit, timedOut }); });
  });
  fs.closeSync(stdout); fs.closeSync(stderr);
  const end = new Date().toISOString();

  const post = snapshot(dir);
  fs.writeFileSync(path.join(jobDir, 'POST-SNAPSHOT.json'), JSON.stringify(post, null, 2));
  const changed = diffSnapshots(pre.files, post.files);
  const outside = changed.filter((p) => !matchesAny(p, a.allow));
  const headMoved = pre.head !== post.head || pre.branch !== post.branch;
  const s = parseStream(fs.readFileSync(path.join(jobDir, 'stdout.jsonl'), 'utf8'));
  const finalText = s.texts.at(-1) ?? '';
  fs.writeFileSync(path.join(jobDir, 'REPORT.md'), finalText || '(implementer produced no final text)\n');
  fs.writeFileSync(path.join(jobDir, 'TRANSCRIPT.md'), s.texts.join('\n\n---\n\n'));
  if (changed.length) {
    // Tracked changes as a patch; new untracked files are listed in RECEIPT.changed_paths only.
    const d = spawnSync('git', ['-C', dir, 'diff', 'HEAD', '--', ...changed], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    fs.writeFileSync(path.join(jobDir, 'DIFF.patch'), d.stdout ?? '');
  }

  const violation = outside.length > 0 || headMoved;
  const receipt = {
    schema: 'awwv.opencode-implementer.receipt.v1', job: path.basename(jobDir), start_utc: start, end_utc: end,
    cwd: dir, model: a.model, agent: AGENT_NAME, agent_config_sha256: sha256File(configPath),
    policy_sha256: sha256File(POLICY_FILE), extra_shell_allow: a.allowCmd, env_keys: Object.keys(childEnv).sort(),
    session_id: s.sessionId, continued_session: a.session ?? null, exit_code: code.exit, timed_out: code.timedOut,
    report_status: (finalText.match(/##\s*STATUS:\s*([A-Z]+)/) ?? [])[1] ?? 'MISSING',
    allow: a.allow, changed_paths: changed, outside_allowlist: outside, head_moved: headMoved,
    pre_head: pre.head, post_head: post.head, tool_calls: s.tools, refusals: s.refusals, stream_errors: s.errors,
    steps: s.steps, reported_cost: Number(s.cost.toFixed(6)), reported_tokens: s.tokens,
    limits: 'no OS sandbox: allowed test runners execute worktree code, so network/out-of-tree effects are not contained; gitignored paths are not inspected; cost/tokens are provider counters, not verified billing',
    verdict: violation ? 'BOUNDARY_VIOLATION' : code.exit === 0 && !code.timedOut ? 'IN_BOUNDS_UNREVIEWED' : 'IMPLEMENTER_FAILED',
  };
  fs.writeFileSync(path.join(jobDir, 'RECEIPT.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ job_dir: jobDir, verdict: receipt.verdict, report_status: receipt.report_status,
    session_id: receipt.session_id, exit_code: code.exit, timed_out: code.timedOut, changed: changed.length,
    outside_allowlist: outside, head_moved: headMoved, refusals: s.refusals.length, cost: receipt.reported_cost }, null, 2));
  return violation ? 3 : code.exit === 0 && !code.timedOut ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
}
