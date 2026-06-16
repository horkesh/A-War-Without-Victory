# CI Triage Playbook

## Baseline Regression

Use this sequence when Baseline Regression fails:

1. Check the latest run and failing job.

```bash
gh auth status
gh run list --branch main --limit 10
gh run view <run-id> --jobs
gh run view <run-id> --log-failed
```

2. Reproduce locally from the narrowest failed signal first.

```bash
npm.cmd run desktop:startup-snapshot:build
npm.cmd run test:vitest:scenario:anchors
npm.cmd run test:vitest:fast
npm.cmd run test:vitest:scenario
```

For `engine-health-188w`, first check whether the failure is its own 188w gate or the explicit `Require upstream scenario gate` step. If the upstream guard failed, triage the `scenarios` job first; the engine-health job is intentionally red so a required check never disappears behind a skipped dependency.

3. If `gh auth status` reports an invalid token, use the GitHub connector to inspect workflow jobs, failed steps, and logs. Public REST metadata can identify run/job status, but failed log download usually needs Actions permission.

## Desktop Release Guard

Use this sequence when Desktop Release Guard fails:

```bash
npm.cmd run desktop:release:check
npm.cmd run desktop:package:probe
```

If the package probe fails only in GitHub, compare Node version, OS image, generated startup snapshot step, and packaged artifact path before changing runtime code.

## Windows Notes

- In PowerShell, prefer `npm.cmd` over `npm` if script execution policy blocks `npm.ps1`.
- For non-browser CI/test slices, set `PUPPETEER_SKIP_DOWNLOAD=1` when a local Puppeteer browser cache is corrupt or incomplete.
- Preserve unrelated dirty worktree changes. Stage only files owned by the failing CI lane.

## Closeout Evidence

Every CI repair closeout should record:

- first failing GitHub run ID and job name;
- local reproduction command and result;
- exact file that owned the fix;
- final Baseline Regression and Desktop Release Guard run IDs;
- confirmation that no scenario gates were skipped or weakened.
