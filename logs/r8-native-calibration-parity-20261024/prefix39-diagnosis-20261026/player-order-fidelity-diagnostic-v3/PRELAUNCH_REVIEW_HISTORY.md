# Prelaunch review history

No diagnostic attempt has run.

1. **V1 NO-GO — stale production bundle.** The bound `dist/desktop/desktop_sim.cjs` still had the pre-`33f99fc5` selector. V1 was preserved without execution. V2 uses current source through a frozen TSX runtime.
2. **V1 NO-GO — wrong scoring cohort.** The V1 `player-parity-rbih-t39-20261025-04` turn-39 state scores 705/712, so it cannot stand for the retained 704 result. V2 uses the exact `fractional-fatigue-p03-rbih-t39-01` T16/T17/final cohort and retains the 705 state only as an explicitly rejected provenance comparator.
3. **V2 NO-GO — loader provenance.** Its child argv named a TSX loader in another C worktree while aggregate verification named packages under the authorized October root. V2 remains frozen with that block and was not run.
4. **V3 literal-runtime correction.** V3 is fidelity-only. Loader argv, loader binding, and all transitive package aggregates use the same literal authorized October root. The only mode allows one T16→17 advance; no fork launcher exists.

V3 still requires a fresh independent GO before root may launch it.
