import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Roadmap, plan, ledger and report pinning tests were retired when the working docs
// moved out of the repo until 1.0 (owner ruling 2026-11-18). Only canon and
// engineering truth stays pinned here. tests/docs_truth_no_skip_guard.test.ts requires
// at least one tests/docs_*truth*.test.ts file to exist.

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('desktop and canon truth docs', () => {
  it('keeps desktop startup docs aligned with the baked apr_1992 artifact path', () => {
    const playbook = readRepoFile('docs', '20_engineering', 'GUI_PLAYBOOK_DESKTOP.md');
    const ipcContract = readRepoFile('docs', '20_engineering', 'DESKTOP_GUI_IPC_CONTRACT.md');

    expect(playbook).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(playbook).toContain('one-way derived copy of canonical builder truth');
    expect(playbook).not.toContain('apr1992_historical_52w.json');

    expect(ipcContract).toContain('loadStartupSnapshotState(...)');
    expect(ipcContract).toContain('data/derived/startup/apr_1992_initial_save.json');
    expect(ipcContract).toContain('data/scenarios/apr1992_definitive_188w.json');
  });

  it('keeps canonical directive truth in its owning documents', () => {
    const fora = readRepoFile('docs', '10_canon', 'FORAWWV.md');
    const systems = readRepoFile('docs', '10_canon', 'Systems_Manual_v0_9_0.md');
    const bible = readRepoFile('docs', '10_canon', 'Game_Bible_v0_9_0.md');

    expect(fora).toContain('PRESIDENT_TO_CANONICAL_DIRECTIVE');
    expect(fora).toContain('permission_flags');
    expect(systems).toContain('displacement_recent_by_turn');
    expect(bible).toContain('v0.9.1 is agent-closed with sixty authored `v091_` consumers');
  });
});
