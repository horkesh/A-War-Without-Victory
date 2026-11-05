import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const evidence = import.meta.dirname;
const shared = 'F:/A-War-Without-Victory';
const backup = 'F:/AWWV-agent-setup-modernization-backup/20260912-8913cca6';
const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const inventory = json(join(backup, 'inventory.json'));
const classification = json(join(evidence, 'skill-differences.json'));
const classificationByName = new Map(classification.pairs.map(pair => [pair.name, pair]));
inventory.skills = inventory.skills.map(pair => ({ ...pair,
  semantic: classificationByName.get(pair.name) ?? { classification: 'identical', preserve: 'retain unchanged unless named adapter explicitly modernizes the process' },
}));
inventory.semantic_counts = classification.counts;
inventory.napkin_relocation = json(join(evidence, 'napkin-relocation-map.json'));
const cursorNew = ['.cursor/TASK_SUBAGENT_TYPES.md', '.cursor/rules/ui-gui-invoke-ux-developer.mdc', '.cursor/rules/napkin-session-start.mdc'];
inventory.ignored_cursor_originals = cursorNew.map(path => {
  const dest = join(backup, 'ignored-cursor-originals', path);
  if (!existsSync(dest)) { mkdirSync(resolve(dest, '..'), { recursive: true }); copyFileSync(join(shared, path), dest); }
  return { path, base: null, original_sha256: hash(dest), original_backup: dest, disposition: 'Newly authored tracked replacement in migration; existing ignored live file must be released and reconciled before integration' };
});
const names = readdirSync(join(root, '.agent/codex-skill-adapters')).filter(name => existsSync(join(root, '.agent/codex-skill-adapters', name, 'SKILL.md'))).sort();
mkdirSync(join(evidence, 'user-diffs'), { recursive: true });
const adapters = names.map(name => {
  const pair = inventory.skills.find(pair => pair.name === name);
  if (!pair) throw new Error(`No audited installed counterpart: ${name}`);
  const candidate = `.agent/codex-skill-adapters/${name}/SKILL.md`;
  const original = join(pair.original_directory, 'SKILL.md');
  const diffPath = `logs/agent-setup-modernization/user-diffs/${name}.diff`;
  const diff = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--no-textconv', '--', original, join(root, candidate)], { encoding: 'utf8' });
  if (![0,1].includes(diff.status)) throw new Error(`diff failed ${name}: ${diff.stderr}`);
  writeFileSync(join(root, diffPath), diff.stdout);
  return { name, project_source: pair.repo_path, project_source_sha256: hash(join(root, pair.repo_path)), adapter: candidate,
    adapter_sha256: hash(join(root, candidate)), installed_relative: `${name}/SKILL.md`, original_sha256: pair.user_sha256,
    original_backup: original.replaceAll('\\', '/'), diff: diffPath,
    disposition: 'Reviewed generic Codex entrypoint; routes AWWV to its current repo source; preserves support files and generic use outside AWWV; pending coordinated activation' };
});
const summaryPath=join(evidence,'codex-adapter-summary.json');
const summary=json(summaryPath);
for(const adapter of summary.adapters) {
  const body=readFileSync(join(root,'.agent/codex-skill-adapters',adapter.name,'SKILL.md'),'utf8');
  adapter.description=/^description: (.+)$/m.exec(body)[1].trim();
}
writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');
const manifest = { schema: 1, status: 'prepared; not activated', base_commit: inventory.base_commit,
  maintained_project_source: '.claude/skills', location_strategy: 'Keep existing repo and installed skill locations. No .agents same-name exposure; staged adapters update only the nine named installed SKILL.md entrypoints after handoff.',
  discovery: { cli: '0.130.0', desktop: '0.154.0-alpha.6.2', supported: '.agents/skills discovered via skills/list in disposable project/profile', duplicates: 'repo and user entries with identical names were both returned; no merge or unambiguous selection assumed', evidence: 'logs/agent-setup-modernization/duplicate-discovery-receipt.json' },
  installed_root_observed: inventory.runtime_skill_root, settings_changes: [],
  preserved_host_skills: ['orchestrator', 'code-simplifier', 'scenario-report', 'writing-skills'],
  other_pairs: 'Keep all other installed files. Per-pair semantic classifications/dispositions are retained in inventory.json; unresolved domain reconciliations are deferred, not silently selected.',
  adapters };
writeFileSync(join(root, '.agent/skill-distribution.json'), JSON.stringify(manifest, null, 2) + '\n');
const changed = git('diff', inventory.base_commit, '--name-only').split(/\r?\n/).filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split(/\r?\n/).filter(p => p && !p.startsWith('logs/'));
const paths = [...new Set([...changed, ...untracked, ...cursorNew])].filter(p => !p.startsWith('logs/')).sort();
const liveHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: shared, encoding: 'utf8' }).trim();
inventory.proposed_files = paths.map(path => {
  const base = spawnSync('git', ['rev-parse', `${inventory.base_commit}:${path}`], { cwd: root, encoding: 'utf8' });
  const live = join(shared, path);
  const old = inventory.files.find(file => file.path === path);
  return { path, owner: 'migration worktree only; shared activation requires release receipt', base_blob: base.status === 0 ? base.stdout.trim() : null,
    candidate_sha256: hash(join(root, path)), shared_exists: existsSync(live), shared_sha256: existsSync(live) ? hash(live) : null,
    shared_drift_since_capture: old && existsSync(live) ? old.observed_sha256 !== hash(live) : null };
});
const sharedGit=(...args)=>execFileSync('git',args,{cwd:shared,encoding:'utf8'}).trim();
inventory.reconciliation_observation = { live_head: liveHead, live_branch: sharedGit('branch','--show-current'), live_tree: sharedGit('rev-parse','HEAD^{tree}'), base_tree: git('rev-parse',`${inventory.base_commit}^{tree}`), live_status: sharedGit('status','--short'), tracked_changes_from_base: sharedGit('diff','--name-status',inventory.base_commit,'HEAD'), captured_utc: new Date().toISOString(), activation: 'not authorized or performed; a clean status is not a file release receipt', paths_with_observed_drift: inventory.proposed_files.filter(row => row.shared_drift_since_capture).map(row => row.path) };
inventory.user_preservation = inventory.skills.map(pair => ({ name: pair.name, current_matches_original: hash(pair.user_path) === pair.user_sha256 }));
inventory.shared_settings_preservation = inventory.shared_user_files.map(file => ({ path: file.path, unchanged: hash(file.path) === file.sha256 }));
writeFileSync(join(evidence, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({ adapters: adapters.length, proposed_files: paths.length, live_head: liveHead, observed_drift: inventory.reconciliation_observation.paths_with_observed_drift, installed_unchanged: inventory.user_preservation.every(x=>x.current_matches_original), shared_settings_unchanged: inventory.shared_settings_preservation.every(x=>x.unchanged) }, null, 2));
