# Prelaunch review history

No diagnostic attempt has run.

1. **V1 NO-GO — stale production bundle.** The bound `dist/desktop/desktop_sim.cjs` still had the pre-`33f99fc5` selector. V1 was preserved without execution. V2 uses current source through a frozen TSX runtime.
2. **V1 NO-GO — wrong scoring cohort.** The V1 `player-parity-rbih-t39-20261025-04` turn-39 state scores 705/712, so it cannot stand for the retained 704 result. V2 uses the exact `fractional-fatigue-p03-rbih-t39-01` T16/T17/final cohort and retains the 705 state only as an explicitly rejected provenance comparator.
3. **V2 correction set.** Query purity now compares the queried clone itself; baseline mismatch paths are complete and uncapped; the launcher hard-binds reviewed scripts/runtime and rejects `src/` or `data/` drift before import; early wrapper-126 semantics are explicit; actual event timing and predictor vocabulary are frozen; the official 704 score and its three n91/n92 losses are asserted.

The corrected packet still requires a fresh independent GO before root may launch it.
