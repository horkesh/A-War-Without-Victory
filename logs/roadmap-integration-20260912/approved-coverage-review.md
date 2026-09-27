# Approved frontline-coverage correction review

Review base: clean checkpoint `c126ddec3`, followed by the owner-approved two-test coverage correction. Scope was limited to `tests/integration_run_diagnostics.test.ts` and `tests/integration_deployment_health.test.ts`; no source, documentation, campaign, or general-suite work was repeated.

## Verdict

**GO for the correction and clean checkpoint.** The applied diff matches the approved proposal: `git apply --reverse --check --unidiff-zero logs/roadmap-integration-20260912/proposed-coverage-contract.patch` exits 0. `git diff --check` for both affected files exits 0. No unrelated test criterion was removed or relaxed.

Both tests still identify large gaps as sectors with more than three front edges and zero assigned brigades, print the raw count and every sector, and separately require the saved `unstaffed_front:true` marker. They then delete all markers from cloned final sectors, invoke production `annotateUnstaffedFrontSectors` with the actual final state, formations, and operational contact graph, and require zero gaps that production considers reachable or staffable. A missing/empty graph is a hard failure. Proven isolation and failed recomputation have distinct log labels, so the diagnostics cannot report an unproved isolation reason.

The only retired condition is the explicitly owner-approved global `<=2` count. It is replaced by the stronger per-gap legality check; raw count visibility is preserved.

## Discrimination evidence

`tests/unstaffed_front_annotation.test.ts` directly exercises both outcomes of the production classifier. The focused control passed **1/1 file, 4/4 tests, exit 0** in 2.22 seconds (`approved-coverage-unit-control.log`, SHA-256 `09aa71c866e4ffd4047b97be6f45890d1797f9ce46abf7b6160e1ff11e60f2ab`). Its cases establish:

- a reachable legal same-corps donor leaves an empty sector unmarked;
- a disconnected sector is marked;
- a connected donor that must retain its line floor still yields a marked target;
- enclave locking yields a marked target despite graph connectivity;
- a legally reachable reserve leaves its sector unmarked.

This supplies the positive and negative control for the integration assertion: a stale saved marker cannot make a reachable gap pass because recomputation first deletes it.

## Applied integration evidence

`approved-coverage-tests.log` (SHA-256 `2bfb801de73c1fa5b9594850ced763c8c4608a4368f2d75e9204d3f3575987cb`) records **2/2 files, 17/17 tests, exit 0** in 161.44 seconds. Each independently executed 40-week integration test reported the same nine raw large gaps; every gap retained explicit truth and recomputed as `no_reachable_legal_same_corps_donor`, leaving **0 staffable violations**.

The prior full-suite result of 13,935 passing tests remains reusable for unaffected behavior. No further suite or campaign is needed for this correction before the already planned first 188-week candidate validation.
