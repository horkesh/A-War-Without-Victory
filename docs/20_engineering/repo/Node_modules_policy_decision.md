# Node_modules policy decision (Phase R1.3)

**Decision:** **B) Unvendor node_modules** — migrate to lockfile + clean installs.

R1.3 does not remove tracked node_modules yet. This document records the decision and invariants; migration (R1.4) will execute only when preconditions are met.

---

## Rationale (using R1.2 measured facts)

- **Size:** 2,813 tracked files under node_modules/, ~95.8 MB. Repo and clone cost are high; diffs are noisy.
- **Ignore–tracked mismatch:** .gitignore lists node_modules/ but files are still tracked. That is ambiguous for contributors and CI; fixing it requires either untracking (Option B) or formalizing vendor-in-repo (Option A).
- **Lockfile present:** package-lock.json exists. npm ci can reproduce the dependency tree without committed node_modules.
- **Determinism:** Lockfile + clean installs give reproducible dependency trees; vendor-in-repo can drift unless updated under a strict procedure. Option B aligns with deterministic derived artifacts.
- **CI and contributors:** Standard Node workflow is clone + npm ci; no need to commit or pull 2,800+ vendor files.

---

## Invariants (non-negotiable)

1. **Deterministic outputs** for canonical derived artifacts (e.g. settlements_substrate.geojson, map validate / sim mapcheck outputs). Same inputs + same lockfile + same install → same hashes.
2. **Repeatable setup** on Windows and Linux: npm ci (or equivalent) from repo root must succeed and produce a consistent tree.
3. **Single source of truth for dependencies:** package-lock.json (or equivalent lockfile). No committed node_modules as source of truth.
4. **Offline story:** Install without registry is possible by either (a) using a pre-populated npm cache (e.g. npm cache copy or internal mirror), or (b) retaining a one-time vendor snapshot only for offline scenarios, documented and optional. Normal workflow is online: npm ci from lockfile.

---

## Preconditions for migration phase (R1.4)

Before untracking node_modules:

1. **Lockfile authoritative:** package-lock.json is complete and committed; no dependency is resolved from registry at install time except as specified by lockfile.
2. **Install command documented:** CI and contributors use `npm ci` (or equivalent) after clone. Docs and README updated.
3. **CI updated:** Pipeline runs `npm ci && npm run typecheck && npm test` (and any other required steps); no assumption that node_modules is already present from the repo.
4. **Equivalence harness in place:** R1.3 harness exists; after migration, run harness in “install-from-lockfile” environment and compare manifest to pre-migration baseline; must report identical for canonical artifacts (or acceptable diff documented).
5. **No hard dependency on committed node_modules:** No script or tool assumes node_modules is tracked (e.g. no git ls-files under node_modules for build logic).

---

## Rollback plan (if migration breaks determinism)

1. **Immediate:** Revert the commit(s) that removed node_modules from tracking (git revert). Restore node_modules to the index from the previous commit so that clone again has vendor-in-repo.
2. **Verification:** Run equivalence harness and map validate / sim mapcheck; confirm outputs match pre-migration baseline.
3. **Decision:** If rollback is necessary, document the cause (e.g. lockfile drift, platform-specific resolution) and either fix lockfile/tooling and retry migration later, or formally adopt Option A (keep vendor-in-repo) with documented update procedure.

---

## Summary

- **Chosen option:** B) Unvendor node_modules (lockfile + clean installs).
- **R1.3 does not remove tracked node_modules yet.** Migration is deferred to R1.4 once preconditions and harness are satisfied.
