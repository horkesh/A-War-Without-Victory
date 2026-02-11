# Tracked artifacts policy — decision memo (Phase R1.2)

Report-only. No migration is executed in R1.2.

## Current state (from audit)

- **node_modules/:** 2,813 tracked files, ~95.8 MB. `.gitignore` lists `node_modules/` but these files are still tracked (ignore–tracked mismatch). Earliest commit touching: "Recovery" (2026-02-01). Top contributors by size: typescript, vite, jsts, @esbuild, xlsx, codepage, @turf, @rollup, rollup, @types, etc.
- **dist/:** 6 tracked files, ~24.6 KB. `.gitignore` lists `dist/` but files are tracked (ignore–tracked mismatch). Earliest commit: "v0.5.3" (2026-01-28). `package.json` `"main": "dist/index.js"` implies a packaging/deployment expectation; defer actual policy change to a later phase unless the project moves to TS-runtime execution only.
- **res/:** 4 tracked files (~17.3 KB), Godot `.gd` scripts; not in `.gitignore`. Earliest commit: "A War Without Victory" (2026-01-25). Intentionally tracked project resources.
- **Vendor markers:** `package-lock.json` present; `.npmrc`, `pnpm-lock.yaml`, `yarn.lock` absent.

## Why this matters

- **Repo size and diffs:** Tracked `node_modules` and `dist` inflate clone size and diff noise; CI and contributors pay the cost.
- **Determinism:** Lockfile + clean installs give reproducible dependency trees; vendor-in-repo can drift if not updated under a clear procedure.
- **CI portability:** Build-from-source (install from lockfile) is more portable than reusing committed vendor trees.
- **Contributor experience:** Clear policy avoids confusion (e.g. "do I commit node_modules or not?").

## Options (minimum three)

### Option 1: Keep vendor-in-repo (status quo) but formalize it

- **Description:** Leave `node_modules` and `dist` tracked; document rules, update procedure, and CI expectations.
- **Pros:** No migration; behavior unchanged; single source of truth in repo.
- **Cons:** Repo stays large; ignore–tracked mismatch remains unless policy is clarified (e.g. "we intentionally track them" and remove from .gitignore, or stop tracking and fix history).
- **Risks to determinism / map pipeline:** Medium — drift if updates are ad hoc; need a formal "when and how to update vendor" and CI that validates.
- **Preconditions:** Decide whether .gitignore should be aligned (either stop ignoring and document, or untrack and use lockfile).
- **Verification checklist:** (1) Document update procedure in repo docs. (2) CI runs against committed vendor or runs `npm ci` and fails on diff. (3) Ledger/CHANGELOG note policy.

### Option 2: Unvendor node_modules (migrate to lockfile + clean installs)

- **Description:** Stop tracking `node_modules`; rely on `package-lock.json` and `npm ci` (or equivalent); remove `node_modules/` from index; optionally clean history.
- **Pros:** Smaller repo; standard Node workflow; CI and locals install from lockfile; no ignore–tracked mismatch for node_modules.
- **Cons:** Migration and possibly history rewrite; CI and docs must require `npm ci`; first-time clone needs network.
- **Risks to determinism / map pipeline:** Low if lockfile is committed and CI uses `npm ci`; map pipeline does not depend on committed node_modules.
- **Preconditions:** (1) Lockfile is authoritative and complete. (2) All consumers (CI, contributors) use `npm ci` or equivalent. (3) No hard dependency on committed node_modules in scripts.
- **Verification checklist:** (1) `git rm -r --cached node_modules` (or equivalent). (2) .gitignore already ignores node_modules. (3) CI: `npm ci && npm run typecheck && npm test`. (4) Docs: "Clone then run npm install / npm ci."

### Option 3: Hybrid (vendor only select artifacts; or submodule; or offline cache)

- **Description:** e.g. (a) Track only a subset of packages (e.g. patched or offline-only); or (b) Put vendor in a git submodule; or (c) Use an offline/cache store (e.g. npm cache, internal registry) and install from lockfile.
- **Pros:** Balances size vs. offline or patching needs; submodule isolates vendor from main history.
- **Cons:** More complex; submodules add workflow overhead; "select artifacts" requires clear criteria.
- **Risks to determinism / map pipeline:** Medium — depends on how selective tracking or cache is applied; must document what is vendored and why.
- **Preconditions:** Clear list of what is vendored (if any) and why; CI and docs updated.
- **Verification checklist:** (1) Document hybrid policy. (2) Only listed paths or submodule are tracked. (3) CI reproduces install (cache or submodule). (4) Map pipeline unchanged or explicitly documented.

## dist/ semantics (deferred)

- **dist/** is currently tracked and `package.json` `"main": "dist/index.js"` points at it. That implies a packaging/deployment expectation (built output in repo).
- **R1.2 does not change dist/ policy.** A later phase can decide: e.g. stop tracking dist and build in CI only; or keep tracking and document; or move to TS-runtime entry only.

## Recommendation

- **R1.2 does not execute any migration.** This memo records the audit and options only.
- **Recommended next step:** Choose one of the three options (or a variant) in a follow-up phase; then update .gitignore and tracking only as part of that chosen plan, with preconditions and verification checklist applied.

## Reproducing the audit

```bash
npx tsx scripts/repo/phase_r1_2_tracked_artifacts_audit.ts
```

Optional npm script (if added): `npm run phase:r1.2:audit`.  
JSON report (if generated): `data/derived/_debug/tracked_artifacts_audit_r1_2.json` (not committed; _debug is gitignored).
