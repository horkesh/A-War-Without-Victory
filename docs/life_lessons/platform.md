# Life Lessons — Platform, Tooling
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Tooling] Grep for unused files misses .js extension imports — always tsc after bulk deletions (2026-03-21) — NEW
- **Context**: Agent-driven dead code scan grepped for `from.*filename` to find imports. TypeScript uses `.js` extensions in import paths (`from './foo.js'` resolves to `foo.ts`). The grep pattern didn't match these, flagging 18 actively-imported files as "orphaned."
- **Wrong approach**: Trusting grep results for unused file detection without compilation verification. Deleted 18 files that were actively imported, causing tsc errors.
- **Right approach**: After ANY bulk deletion, run `npx tsc --noEmit` immediately before committing. Restore files that cause import errors. Only commit after clean typecheck.
- **Do instead**: For dead code detection, use `tsc` as the source of truth, not grep. Grep is a fast first pass; tsc is the verification gate. Never commit bulk deletions without a clean typecheck + test run.

### [Platform] Git worktrees do NOT isolate tsx module resolution — always merge to main and run there (2026-03-21) — NEW
- **Context**: 14 scenario runs in the `.worktrees/zepa-calibration` worktree all used the MAIN tree's source code despite the worktree having different committed files. File hashes differed between worktree and main. `npm install` in the worktree didn't help.
- **Root cause**: tsx resolves imports through node_modules which can chain back to the main tree. Worktrees share the git repo but import resolution follows filesystem symlinks and module resolution algorithms that cross worktree boundaries.
- **Impact**: Wasted hours of investigation — every "fix" appeared to have no effect because the runner was executing the old code from main.
- **Do instead**: For calibration work, ALWAYS merge the branch to main and run from the main working directory. Use worktrees only for code editing isolation, not for running scenarios. Verify with file hash comparison: `md5sum <worktree/file> <main/file>`.

### [Tooling] weekly_report.jsonl uses `week_index` not `week` (2026-03-10)
- **Context**: Extraction scripts used `w.week` and got `undefined` for all entries. Field name is `week_index`.
- **Do instead**: For weekly report extraction, always use `week_index`. Check field names with `Object.keys(line)` before writing extraction scripts.

### [Platform] Windows shell uses semicolons (2026-02-07)
- PowerShell: `;` not `&&`. No recent violations.
