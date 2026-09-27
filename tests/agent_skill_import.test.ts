import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];
const installer = resolve('tools/install_superpowers.ps1');
function fixture(existing = false) {
  const root = mkdtempSync(join(tmpdir(), 'awwv-skill-import-'));
  fixtures.push(root);
  const source = join(root, 'source');
  const target = join(root, 'target');
  const review = join(root, 'review.json');
  const backup = join(root, 'backup');
  mkdirSync(join(source, 'sample'), { recursive: true });
  mkdirSync(target);
  writeFileSync(join(source, 'sample/SKILL.md'), '---\nname: sample\ndescription: Use for the disposable import test.\n---\nNew instructions.\n');
  mkdirSync(join(source, 'sample/references'));
  writeFileSync(join(source, 'sample/references/detail.md'), 'New detail.\n');
  if (existing) {
    mkdirSync(join(target, 'sample'));
    writeFileSync(join(target, 'sample/SKILL.md'), 'Locally edited instructions.\n');
    writeFileSync(join(target, 'sample/local-only.md'), 'Local detail.\n');
  }
  // The legacy script ignores parameters. Copy it into this disposable fake repo
  // so even the red phase can never invoke its defaults against live skills.
  mkdirSync(join(root, 'tools'));
  cpSync(installer, join(root, 'tools/install_superpowers.ps1'));
  mkdirSync(join(root, '.agent/superpowers-repo'), { recursive: true });
  cpSync(source, join(root, '.agent/superpowers-repo/skills'), { recursive: true });
  mkdirSync(join(root, '.claude'));
  cpSync(target, join(root, '.claude/skills'), { recursive: true });
  const run = (...args: string[]) => spawnSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'tools/install_superpowers.ps1'),
    ...[['-Name', 'sample'], ['-SourceRoot', source], ['-DestinationRoot', target], ['-ReviewPath', review]]
      .filter(([key]) => !args.includes(key)).flat(), ...args,
  ], { cwd: root, encoding: 'utf8', timeout: 15_000, env: {
    ...process.env,
    // npm launched from PowerShell 7 can inherit only its module directories.
    // Give the Windows PowerShell child its own built-in modules; no host setting changes.
    ...(process.platform === 'win32' ? { PSModulePath: [
      join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/Modules'),
      process.env.PSModulePath ?? '',
    ].join(';') } : {}),
  } });
  return { root, source, target, review, backup, run };
}
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('explicit skill import in disposable paths', () => {
  it('previews a named import without writing any destination', () => {
    const f = fixture();
    const result = f.run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(readdirSync(f.target)).toEqual([]);
    expect(readdirSync(join(f.root, '.claude/skills'))).toEqual([]);
    expect(existsSync(f.review)).toBe(true);
    expect(readFileSync(`${f.review}.diff`, 'utf8')).toContain('New instructions.');
  });
  it('requires a preview receipt before applying', () => {
    const f = fixture();
    expect(f.run('-Apply').status).not.toBe(0);
    expect(readdirSync(f.target)).toEqual([]);
  });
  it('applies only the named skill after review, including its support files', () => {
    const f = fixture();
    mkdirSync(join(f.source, 'unselected'));
    writeFileSync(join(f.source, 'unselected/SKILL.md'), 'Must stay uninstalled.');
    expect(f.run().status).toBe(0);
    const result = f.run('-Apply');
    expect(result.status, result.stderr).toBe(0);
    expect(readdirSync(f.target)).toEqual(['sample']);
    expect(readFileSync(join(f.target, 'sample/references/detail.md'), 'utf8')).toBe('New detail.\n');
  });
  it('refuses replacement of locally edited skills by default', () => {
    const f = fixture(true);
    f.run();
    expect(f.run('-Apply').status).not.toBe(0);
    expect(readFileSync(join(f.target, 'sample/SKILL.md'), 'utf8')).toBe('Locally edited instructions.\n');
  });
  it('requires a backup for explicit replacement', () => {
    const f = fixture(true);
    expect(f.run('-Replace').status).toBe(0);
    expect(f.run('-Apply', '-Replace').status).not.toBe(0);
    expect(readFileSync(join(f.target, 'sample/local-only.md'), 'utf8')).toBe('Local detail.\n');
  });
  it('replaces with a reviewed diff and preserves the full old directory', () => {
    const f = fixture(true);
    expect(f.run('-Replace').status).toBe(0);
    const diff = readFileSync(`${f.review}.diff`, 'utf8');
    expect(diff).toContain('Locally edited instructions.');
    expect(diff).toContain('New instructions.');
    expect(diff).toContain('local-only.md');
    const result = f.run('-Apply', '-Replace', '-BackupRoot', f.backup);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(f.backup, 'sample/SKILL.md'), 'utf8')).toBe('Locally edited instructions.\n');
    expect(readFileSync(join(f.backup, 'sample/local-only.md'), 'utf8')).toBe('Local detail.\n');
    expect(existsSync(join(f.target, 'sample/local-only.md'))).toBe(false);
  });
  it.each(['source', 'target'] as const)('rejects %s drift after preview', (side) => {
    const f = fixture(true);
    expect(f.run('-Replace').status).toBe(0);
    writeFileSync(join(f[side], 'sample/SKILL.md'), 'Intervening edit.\n');
    expect(f.run('-Apply', '-Replace', '-BackupRoot', f.backup).status).not.toBe(0);
    expect(existsSync(f.backup)).toBe(false);
  });
  it('rejects a modified review diff', () => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    writeFileSync(`${f.review}.diff`, 'Unreviewed replacement.');
    expect(f.run('-Apply').status).not.toBe(0);
    expect(readdirSync(f.target)).toEqual([]);
  });
  it('rejects nested source/destination trees', () => {
    const f = fixture();
    const result = f.run('-DestinationRoot', join(f.source, 'nested'));
    expect(result.status).not.toBe(0);
    expect(existsSync(join(f.source, 'nested'))).toBe(false);
  });
  it('refuses reused backup paths without losing local edits', () => {
    const f = fixture(true);
    f.run('-Replace');
    mkdirSync(join(f.backup, 'sample'), { recursive: true });
    writeFileSync(join(f.backup, 'sample/prior.md'), 'Retained backup.');
    expect(f.run('-Apply', '-Replace', '-BackupRoot', f.backup).status).not.toBe(0);
    expect(readFileSync(join(f.target, 'sample/SKILL.md'), 'utf8')).toBe('Locally edited instructions.\n');
    expect(readFileSync(join(f.backup, 'sample/prior.md'), 'utf8')).toBe('Retained backup.');
  });
  it('rejects linked source directories before traversing them', () => {
    const f = fixture();
    mkdirSync(join(f.root, 'external'));
    symlinkSync(join(f.root, 'external'), join(f.source, 'sample/linked'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(f.run().status).not.toBe(0);
    expect(readdirSync(f.target)).toEqual([]);
  });
});
