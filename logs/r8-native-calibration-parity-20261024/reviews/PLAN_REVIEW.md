# Native calibration parity plan review

Date: 2026-10-24  
Seat: independent review  
Verdict: **GO**, subject to the binding conditions below.

## Claim under test

The accepted calibration **outcome** must be reproduced through the visible packaged game and its normal UI/IPC `Advance` route. The target is exact controller-result parity with `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n94`, including checkpoint scores `707/707/706/706`, zero formerly-correct losses against n91/n92, protected places, native save health, and provenance.

This is not a full-state-equality claim. Normal play deliberately adds player faction, historical decision state, autonomy, receipts, notifications, and other player-facing state absent from the no-player accepted run. Every raw save and its hash must be retained, and those differences must be categorized and reported without normalization.

## Scope reviewed and approved

- Change `tools/ui/paradox_local_qa.cjs` so `--historical-choice` visibly selects and asserts the existing Historical radio before Begin on the primary `MainMenu -> FactionDossier -> ModeChoice` route.
- Correct harness provenance from the stale 52-week scenario reference to the accepted 188-week scenario and bind both scenario and startup hashes.
- Add focused harness tests proving the selection/assertion and provenance behavior.
- Add a versioned, read-only outcome comparator and focused mutation tests.
- Leave production UI and simulation/data/reference/tuning untouched. The hardcoded emergent legacy paths in `src/ui/warroom/warroom.ts` and `src/ui/map/App.tsx` remain disclosed and out of scope unless native evidence shows that the primary New War route actually uses them.
- Do not use `desktop_calibration_compare` as acceptance evidence. Do not run simulation in the renderer/comparator or synthesize a scenario `run_summary` for native evidence.

## Reference reconstruction requirement

The n94 `control_delta.json` is a net/final delta and has no turn field, so it cannot establish per-turn equality by itself. The comparator must reconstruct the accepted timeline from the byte-bound n94 initial controller map and `final_save.json.political.control_events` (268 persisted events spanning turns 1 through 188).

The reconstruction must:

1. Apply events in their persisted order, grouped only for end-of-turn observations.
2. Fail if an event's `from` controller does not equal the current reconstructed controller for that settlement.
3. Fail unless the final reconstructed controller map exactly equals the n94 final-save controller map.
4. Self-check the reconstructed maps against every available n94 checkpoint save before comparing native evidence.
5. Compare the native canonical autosave controller map exactly at every completed turn 1 through 188, including exact ordered control-event/delta history. Any transient or unexplained divergence fails.

The committed startup snapshot and n94 initial save are already byte-identical: SHA-256 `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1` (1,373,722 bytes). The comparator must prove and report this binding rather than assuming it.

## Input-policy and evidence contract

The versioned `awwv.native-calibration-outcome-compare.v1` report must fail independently on controller/timeline, score, protected-place, health/provenance, or input-policy violations. Required input provenance includes:

- accepted 188-week scenario hash and startup hash;
- requested player faction;
- `decision_mode=historical`;
- shipped autonomy level `2`;
- `headless=false`;
- `seed=harness-seed`;
- a complete visible-choice and Advance transcript;
- exact 32 authored-input/package binding;
- t0 and every completed-turn canonical autosave with full raw hashes.

Player identity, receipts, UI notification history, and other legitimate raw-state differences may be reported, but they must never be silently removed or presented as full-state equality.

## Separate gates and stopping rules

The retained two non-main-frame media `net::ERR_ABORTED` events remain a strict native/R8 **FAIL**. The owner's reprioritization permits calibration-outcome collection while this known audio failure remains separately visible. A calibration result must not be described as a native/R8 pass or an audio waiver.

Stop immediately for engine, canonical-state, capture, input-policy, controller-outcome, or provenance failure. Stop for any new, expanded, or unclassified runtime/network/media error. Do not retry an expensive stage until the failure is classified and a cheap check proves the correction.

## Staged execution approved

Use one reviewed package and fresh uniquely labelled profiles. Do not enable `--strategic` or `--auto-recruit` because those add inputs/change autonomy.

1. RBiH turn 1, capped at 15 minutes: prove packaged launch, visible Historical selection, exact input/package binding, normal IPC Advance, t0/t1 archive, and comparator operation.
2. RBiH turn 39, capped at 30 minutes: require the January score floor/target and zero formerly-correct losses before continuing.
3. RBiH turn 188: set the cap from measured earlier cost, using 35 minutes where credible; require the complete outcome contract and real Save -> Records -> Resume.
4. RS turn 188, only after the RBiH predecessor passes its calibration gates.
5. HRHB turn 188, only after the RS predecessor passes its calibration gates.

One invocation per lane is the planned evidence. Repeatability remains **NOT ESTABLISHED** unless a later concrete failure or authority requires a targeted repeat. Preserve every attempt, log, profile, autosave, report, and telemetry snapshot.

The turn-1 lane is a diagnostic prerequisite, not a full calibration acceptance run. It may proceed before the future n91/n92 four-checkpoint, protected-anchor/enclave/Farz, and full-health gates are implemented, provided those gates are explicitly **UNREACHED**. Before turn 1, evidence must already bind the reviewed package and classified 32 inputs, n94 reference replay, visible post-click Historical selection, native initial metadata, exact t0 controller state, normal UI/IPC route, and canonical capture. The turn-1 result must then prove exact t1 controller/timeline and save consistency. An existing fail-closed save reader plus a retained independent t0/t1 comparison is acceptable at this diagnostic stage if the new comparator is not yet qualified. No turn-188 GO or calibration acceptance follows from that limited result.

## Review checkpoints

Before native execution, independent review must verify the focused RED/GREEN tests, package-content/hash binding, comparator invariants and mutation coverage, and unchanged production simulation/UI/data. After native execution, review the raw retained evidence and gate classifications once; do not rerun unchanged code for reassurance.

## Bounded input-binding decision after the first cheap rejection

The first naive raw-package check correctly rejected and remains retained at `runs/native-calibration-tooling-20261024/accepted-input-binding-01/INPUT_BINDING.json`. Follow-up classification is retained at `tmp/r8-native-calibration-parity-20261024/input-binding-classification-02/INPUT_BINDING_CLASSIFICATION.json`.

For this new packaged-game parity question only, the input binding is **GO with one explicit representation caveat**:

- 25 of the 32 n94 inputs are raw-byte exact in the package.
- Six scenario/startup inputs are not loose packaged resources. Their source bytes match n94, and their initialized effect is embodied in the byte-exact startup snapshot plus the bundled simulation contract.
- `data/derived/operational/operational_settlements.geojson` is the sole packaged raw mismatch: package/source raw SHA-256 `03713c8e80ba7111ff64ad0bd69b70db4c7e2b30e22f23b8c4e2c11be60baa1a`; LF-normalized SHA-256 `c03cc9ce4286b779139ce460e5f515d67415fe633e4ed2dbda1764b9440338c8`, exactly n94. Git reports the same tracked blob, and parsed JSON content is identical. The difference is CRLF versus LF whitespace representation.

No general normalization is allowed, and the new package must not be described as raw-byte exact across all 32 inputs. This bounded representation allowance does not alter or weaken n94's historical raw-provenance record. Repackaging solely to change this line-ending representation would not answer the gameplay question and is not required. Runtime controller, timeline, score, protected-place, health, and provenance acceptance remain unchanged.
