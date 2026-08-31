# Calibration Reopen and Canonical Rebaseline

**Date:** 2026-08-31  
**Status:** implemented by owner direction  
**Branch:** `codex/ui-typography-overhaul`

## Decision

Calibration is open. The 2026-08-28 RE-dependent pause is no longer current authority. Historical
phase closures remain historical records, while the canonical 188-week master is again available
for calibration. Engine defects retain priority over tuning.

## Measured evidence

The authoritative artifact is
`F:\A-War-Without-Victory\runs\apr1992_definitive_188w__46834a3b41033bff__w188_n387`.
It was produced at `ed6d8af8d792add2b4bf84b767729959f5bbe3db`, with `git_dirty:false`, Node
22.23.2, scenario hash `46834a3b41033bff`, and final-state hash `a29714d7dabc2d9f`.

- Checkpoints: January 1993 697, April 1994 677, April 1995 671, October 1995 644.
- Military losses: 51,309 killed, 194,456 wounded, 19,785 missing/captured; K:W 3.790.
- Combat: 781 attack orders, 545 battles, 0 invalid operations, 0 zero-eligible operations.
- Hard health: 0 invalid-op weeks, 0 ghost destructions, 13 stranded brigades, 0 consistency failures.
- Canon guard: 9/9 enclave cells. The verifier's remaining red is the known Farz discriminator,
  not a §6 breach.
- Advisory debt: 12/46 operations and 16/67 axes recorded zero attacks; planning deaths were
  44/200 probes and 16/50 sector attacks. These figures were documented, not blessed.

## Reconciliation

The standard engine-health updater rebased the 188-week band to the current measured engine:
terminal floor 644; checkpoint floors 694/674/668/641; stranded ceiling 16; zero/invalid/ghost and
consistency ceilings 3; K:W advisory band 3.221–4.358. These are regression rails, not historical
targets. In particular, the historical military-death target remains roughly 57–62k; the current
51,309 is below it.

The standard baseline owner regenerated the manifest on Node 22.23.2. Twenty-four artifact hashes
changed across the four owned scenarios: all eight artifacts for the 188-week and 52-week war
scenarios, and four serialized/report artifacts in each four-week fixture. No scenario source,
painted control, canon, or initial-control source was changed by the reconciliation.

Housekeeping also closed two stale strict-null inventory failures left by the earlier cut-off-pocket
and local-operation work. Two unnecessary non-null assertions in the pocket BFS were replaced by
explicit impossible-state guards, and the optional-field ratchet now records
`CorpsOperation.minimum_viable_participants` (540 total / 343 sim-domain fields). This is
behavior-inert: the complete four-scenario baseline regression remained hash-identical afterward.

## Remaining work

REAL_WAR_MASTER #40 remains open because the corrected AAR view exposes operations that never
attack even while legacy hard counters read zero. Farz timing/signature calibration also remains
open but is explicitly outside the enclave guard. The current casualty output under-runs the working
military-death target and requires mechanism-first investigation before any lethality tuning.

## Verification

- TypeScript `--noEmit`: pass.
- Strict-null inventory plus baseline ownership guardrails: 93/93 pass.
- Desktop tactical-map production build: pass.
- Complete baseline regression on Node 22.23.2 after the type-hygiene edit: all scenarios match.
- `git diff --check`: pass.
