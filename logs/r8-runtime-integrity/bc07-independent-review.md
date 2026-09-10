# BC07 stability-data disposition — independent Systems/QA review

**Date:** 2026-09-08
**Scope:** documentation plus one characterization test; no production/data edits,
generator run, repaint, campaign, or baseline change.
**Verdict:** **GO — RETAIN the committed operational initial master.**

## Basis

- The accepted apr1992 definitive 188-week scenario selects hybrid_1992.
  initializePoliticalControllers returns from ethnic_1991 or hybrid_1992 at
  src/state/political_control_init.ts:855-876, before the mode-less master selection
  and stability copy at lines 894-995.
- Scenario startup passes its selected mode. Desktop April 1992 starts use the startup
  snapshot built from that scenario. Disputed operational-master stability buckets
  therefore do not establish the same number of effects in the normal hybrid campaign.
- Mode-less callers remain real consumers. The default settlement graph is operational
  (src/map/settlements.ts:48-54); src/cli/sim_run.ts:81 and src/index.ts:71-72 call
  prepareNewGameState without a mode. For an all-op graph, the initializer selects
  data/derived/operational/operational_initial_master.json and copies municipal
  stability_score at political_control_init.ts:894-995.
- Early-war control flip reads municipal stability, defaults an absent value to 50, and
  uses it in eligibility/order (src/sim/early_war/control_flip.ts:381-391,577-600).
  Regeneration could change supported mode-less behavior without correcting a
  demonstrated normal-campaign defect.
- contested_control has initialization, promotion, and validation owners, but no
  separate war-rule reader was found in the scoped source search. Hybrid/ethnic
  initialization constructs its own value. It supplies no basis for a control repaint.

## Characterization evidence

logs/r8-runtime-integrity/bc07-consumption-final.log records 3/3 tests passed, exit 0.
The test drives the real prepareNewGameState initializer with paired stability sentinels
37 and 83:

- mode-less initialization produces RBiH control, materializes the municipality, and
  copies the corresponding 37/83 stability value;
- ethnic_1991 and hybrid_1992 produce initialized RBiH control and municipality state
  with no copied stability; their complete initialized states are deep-equal across the
  two sentinel inputs.

This is a discriminating positive/negative contract: an always-ignore or
always-consume implementation cannot pass. tests/bc07_operational_initial_master_consumption.test.ts
is the only code-like addition; production source and data are unchanged.

Supporting gates also pass: logs/r8-runtime-integrity/bc07-typecheck.log records
TypeScript exit 0, and bc07-docs-tests.log records 13/13 documentation tests passed,
exit 0.

## Policy and limits

Retaining the committed artifact is the conservative compatibility disposition. It
does not certify every retained bucket's historical accuracy, declare the derive
script inert, or authorize regeneration. A future replacement requires a separate
provenance/mode-impact decision and applicable controlled evidence.

The R8 plan, ledger, command board, master roadmap, and calibration header accurately
separate this startup-path finding from campaign results and preserve the existing
sequence. Final calibration, packaged three-faction diaries, cleanup, other scheduled
behavior work, and R9 build preparation remain required. BC09/R8 are not closed by
this disposition; BC10 is not activated.

No determinism risks found in this documentation/test-only disposition. The test uses
fixed inputs and the production initializer's strict ordering; it adds no RNG,
timestamp, state writer, or serialization change (Code Canon determinism contract;
Engine Invariants sections 11.1-11.5). No canon conflict was found: preserving an
existing consumed input and the normal campaign's established initialization path
respects deterministic initial conditions and avoids an unsupported historical-data
rewrite (Game Bible section 18 mechanical integrity).
