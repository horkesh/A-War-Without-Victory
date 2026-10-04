# Independent review — named movement phase observer preparation

## Verdict

**NO-GO for using this preparation as the next phase-by-phase movement-ownership discriminator.** The default-off report plumbing is narrowly scoped and deterministic, but the current boundary model can accept an unobserved terminal mutation, the fixed five-phase subset cannot identify several real post-ordinary-pass mutation phases, and the strict reader can exit successfully without any requested coverage. The retained green receipts also predate the current observer, reader, and reader-test bytes.

This is a preparation verdict only. It does not change or re-evaluate the retained n40/n39 evidence, literal provenance guard failure, Farz/protected-control/paint/denominator/save/canon gates, or any 188-week/default-campaign acceptance gap. It does not promote the sparse fixture into historical pre-order proof.

## Blocking findings

### P0 — the terminal receipt hides the last unobserved mutation gap

`MovementPhaseObserver.finalBoundary()` builds `before` from `lastSnapshots` and `after` from the current state (`src/sim/combat/movement_phase_diagnostic.ts:121-126`). Consequently the reader's continuity check (`tools/diagnostics/movement_phase_coverage.cjs:127-135`) always sees the prior selected phase's `after` repeated as `__final__.before`. Any mutation after the last selected phase is accepted as a change inside synthetic `__final__`, rather than rejected as an unobserved gap. This directly defeats the handoff requirement that the final boundary detect an unobserved return-stage mutation.

The terminal snapshot is also taken before `runPostTurnInvariantBarrier()` (`src/sim/turn_pipeline.ts:177-188`). The barrier is assertion-only today (`src/sim/turn_phases/war_phase_reconciliation_steps.ts:35-54`), so this does not currently alter state, but the receipt is not an exact returned-state boundary by construction.

**Required correction:** make the terminal boundary an immediate fresh snapshot (or an explicit two-snapshot return boundary) and fail continuity when it differs from the last actual phase snapshot. Place terminal consistency at the true return boundary, after the invariant result is known. Do not attribute a gap to `__final__` as though it were a writer.

### P0 — the fixed subset is not phase-by-phase ownership coverage

`MOVEMENT_PHASE_MANIFEST` and `observed` admit only five production names plus `__final__` (`src/sim/combat/movement_phase_diagnostic.ts:4-11,51,108-110`). The actual pipeline has relevant mutations between those names. Examples include:

- `apply-brcko-tactical-group-relocation` directly rewrites `location_osid` (`src/sim/turn_phases/war_phases.ts:2951-2954`; `src/sim/combat/brcko_tactical_group.ts:78-89`).
- `resolve-attack-orders` applies T4 retreat/advance/displacement location writes (`src/sim/turn_phases/war_phases.ts:2958-3028`; `src/sim/combat/attack_resolution_osid.ts:1645-1705`).
- `displace-enemy-territory` invokes another location writer (`src/sim/turn_phases/war_phases.ts:3093-3100`; `src/sim/combat/attack_retreat_displacement.ts:461-495`).
- post-combat dissolution and bottom-up formation phases can change the selected formation's lifecycle/existence after ordinary order generation (`src/sim/turn_phases/war_phases.ts:3228-3242`; `src/sim/turn_pipeline.ts:151-165`).

For gaps between two selected phases, the reader may report `non_continuous_boundary`, but it cannot identify which omitted phase wrote the change. For the last gap, the defect above accepts it. This is a bounded candidate observer, not phase-by-phase ownership evidence. `MOVEMENT_AUTHORITY.md` classifies location, state, and order writers across T2–T6; observing only the candidate families from the earlier bounded inventory does not establish exhaustive post-pass ownership.

**Required correction:** once the observer is enabled for explicitly selected actors, observe every actual `NamedPhase` from the ordinary dispatcher boundary through the final pipeline phase, including executed/skipped disposition and the bottom-up loop. Derive or validate the manifest against the actual pipeline order so a newly added phase cannot become a silent gap. If scope remains a bounded subset, label it that way and do not claim it answers the requested ownership question.

### P1 — the reader is not fail-closed without expectations

`--expect-boundary` is optional (`tools/diagnostics/movement_phase_coverage.cjs:7-20`). With no expectations, a weekly file containing no diagnostic rows, or an unconfigured diagnostic with zero receipts, produces no inconsistency and no missing boundary, then exits `0` (`tools/diagnostics/movement_phase_coverage.cjs:86-111,141-158`). That is false success for a strict coverage reader. The current tests always supply an expectation through their helper (`tests/movement_phase_coverage_diagnostic.test.ts:17-25`) and do not cover this path.

**Required correction:** require at least one explicit formation/turn/phase coverage request for success, or add an explicit non-coverage inspection mode whose output and exit cannot be mistaken for coverage. A configured request must fail on absent diagnostics, unconfigured selection, missing actors, missing phases, duplicates, malformed receipts, and discontinuity.

### P1 — the production fixture proves neutrality on a sparse path, not a meaningful writer path

The `runTurn` test is real rather than mocked, but its formations omit brigade `kind`, home/corps/front topology, and operational mapping (`tests/movement_phase_diagnostic.test.ts:20-40`). The positive assertion requires only receipts for `generate-bot-brigade-orders` and `__final__` (`tests/movement_phase_diagnostic.test.ts:92-123`). It does not prove that the dispatcher, drift recall, elite tick/repair, or final distribution actually mutates a selected actor, nor that all required executed/skipped boundaries are present. Deep equality therefore demonstrates default-off neutrality for this sparse/no-op route, not neutrality under a meaningful movement-positive production route.

**Required correction:** add one real `runTurn` fixture with a genuine brigade and sufficient production topology/input to cause a known state or order mutation at an actual production phase. Assert every required phase receipt, disposition, exact before/after state and order, terminal continuity, and unchanged ordinary state/report fields between ON and OFF. Keep direct `runNamedPhase` tests for isolated skip semantics, but do not substitute them for production coverage.

### P1 — presence encoding collapses present-undefined into explicit null

Both `field()` and `recordPresence()` use `value ?? null` (`src/sim/combat/movement_phase_diagnostic.ts:70-84`). A property/key that is present with `undefined` is therefore reported as explicit `null`. Production code can assign `location_osid = undefined` (`src/sim/combat/attack_retreat_displacement.ts:443-452`), while stable serialization omits undefined object values (`src/utils/stable_json.ts:25-35`). The diagnostic currently invents a null value and loses raw in-memory/save-shape semantics.

The existing tests cover absent records and a real null `corps_id`, but not present-undefined, explicit-null movement entries, or formation removal across a phase (`tests/movement_phase_diagnostic.test.ts:53-69`). The reader also counts coverage from `before` only (`tools/diagnostics/movement_phase_coverage.cjs:72-75,136`), so a final receipt whose actor is absent/inactive in `after` can still satisfy coverage.

**Required correction:** represent absent, present-undefined, explicit-null, and present-value without conflation, or normalize present-undefined to the same absent semantics as the authoritative serializer and state that contract explicitly. Add formation removal and explicit-null state/order cases. For terminal coverage, require the actor state appropriate to the requested boundary rather than blindly using `before`.

## Evidence and claim limits

- Default-off ownership is structurally sound: `createMovementPhaseObserver()` returns before selector parsing when the topic is off (`src/sim/combat/movement_phase_diagnostic.ts:134-137`); report and weekly fields are optional and attached only when diagnostics exist (`src/sim/turn_pipeline_types.ts:217`; `src/scenario/scenario_reporting.ts:100-103,135-139`; `src/scenario/scenario_runner.ts:3112-3115`). No `GameState` or save field is added.
- Selected actors are copied, deduplicated, and sorted through `sortedIds`; snapshots copy nested destination/path arrays; phase order follows the deterministic central wrapper (`src/sim/combat/movement_phase_diagnostic.ts:54-62,75-100`; `src/sim/turn_pipeline.ts:225-242`). No engine array is reordered and no RNG, clock, or locale comparator is introduced. This is consistent with Engine Invariants deterministic post-turn handling and `DETERMINISM_TEST_MATRIX.md` serialization/ordering requirements.
- Compatibility is additive and default-absent. The `reason_code_debug.ts` prose still says “twelve topics” while the union/list now contain thirteen (`src/sim/combat/reason_code_debug.ts:1-2,54,72-137`); correct this process documentation when the implementation is revised.
- Retained executions remain accurately reported: red exit `1`; reader syntax exit `0`; focused green exit `0` with 34 tests; affected selection exit `0` with 25 tests; post-green exit `0` with 4 tests; diff-check exit `0`; OpenCode attempt exit `126` with provider quota 429. Their paths are the named `continuation4_movement_observer_20261004_*` logs.
- Those green results are stale for late hardening. The execution summary records observer `ca6767b...`, reader `0fed37d...`, and reader test `1bc5b0e...`; current hashes are observer `ee963c9216ed226b79168a0842c13bb89a7e54cc893e5bdfe16d9cb06715a092`, reader `d3f83dddb8ef30bc3e6a44bcf27fa3745b3a4cc84a7fe1c236adc920d15b2a84`, and reader test `7b2b2959cf6a6c45cbbbc27629171ecfc2b19cabe03f0126058523ef5a9ba3d9`. Exact-manifest/schema, sorted-actor, unrequested-receipt, and comma-only-selector hardening therefore has no retained execution proof for the current bytes.
- I ran no tests, typecheck, suite, consumer, simulation, or campaign. Source evidence already establishes the NO-GO, so another unchanged green selection would not answer a new question. After one consolidated correction, the smallest verification is the focused observer/reader selection plus a novel real production mutation fixture and no-expectation fail-closed reader case; root retains the single required hook typecheck.

## Integration decision

Do not integrate or use these receipts to assign historical ownership yet. After the corrections above, the tool may establish which observed production phase changed a selected actor's detached formation/state/order snapshots. It still cannot reconstruct the n39 turn-517 evaluator inputs, prove the n40 turns 137–139 historical writer without a newly configured run, close late acceptance gates, or authorize a gameplay correction.
