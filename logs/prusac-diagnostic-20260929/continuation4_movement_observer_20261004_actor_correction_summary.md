# Movement observer actor-boundary correction

## Result

The strict reader now validates primitive boundary types before any membership test, equality comparison, filtering, or template-key construction. Actor IDs in the requested actor manifest, phase receipts, terminal receipts, and CLI expectation must be nonempty strings. A numeric artifact actor `737` can no longer coerce to CLI string actor `737`; the valid numeric-looking string ID `"737"` remains accepted.

The same centralized pass audits every primitive boundary field once:

- row, phase-receipt, and terminal completed turns are positive safe integers;
- manifest, receipt, and terminal indexes are safe integers with their existing order/bounds checks;
- manifest and receipt phase names are nonempty strings;
- phase groups retain the serialized `war` or `early-war` schema;
- receipt disposition retains the serialized `executed` or `skipped` schema;
- receipt skip reason remains null or string;
- requested, receipt, and terminal actor IDs are nonempty strings.

Snapshot faction values remain arbitrary strings; no faction catalog, gameplay meaning, or other semantic restriction was invented. Sorted/deduplicated actor-manifest checks and unrequested-actor failures remain active after primitive validation.

## Exact evidence

- The first full reader RED, `continuation4_movement_observer_20261004_actor_red.log` and `.exit.txt`, exited `1` with 10 failures and 18 passes. It exposed a test-fixture defect: the earlier numeric-index test mutated the shared manifest array by reference, contaminating later cases. This run is preserved as a fixture failure and is not claimed as numeric-actor isolation.
- The fixture was corrected by cloning every manifest entry per diagnostic before mutation. No reader source had changed.
- The isolated numeric-actor RED command selected only `rejects numeric actor 737 before coercion can satisfy string expectation 737`. It exited `1`; the one selected test failed because the old reader returned exit `0`, and 27 tests were skipped. Evidence: `continuation4_movement_observer_20261004_isolated_actor_red.log` and `.exit.txt`.
- Reader-only GREEN command: `node node_modules/vitest/vitest.mjs run tests/movement_phase_coverage_diagnostic.test.ts`.
- GREEN result: exit `0`; 1 file passed, 28 tests passed. Evidence: `continuation4_movement_observer_20261004_actor_green.log` and `.exit.txt`.
- Current reader syntax command: `node --check tools/diagnostics/movement_phase_coverage.cjs`.
- Syntax result: exit `0`. Evidence: `continuation4_movement_observer_20261004_actor_syntax.log` and `.exit.txt`.
- No observer/status/static/skip/dispatcher test, campaign, typecheck, replay, prefix, package build, or full suite was run.

## Current hashes

```text
88cffc40abc12dcca52667f0d3293bcc3aba43f030bf8e5f65eaca614fbc474d  tools/diagnostics/movement_phase_coverage.cjs
4f56149c01cefaa0f76548f086b37f1ec69285586206d58520c6d874315097e4  tests/movement_phase_coverage_diagnostic.test.ts
```

## Preserved limitations

All earlier summaries, reviews, and raw logs remain unchanged by this correction. The initial execution summary still has no byte-for-byte backup; root's labeled readback is not recovery. The earlier correction RED reader syntax gap and the first actor RED fixture contamination remain explicitly disclosed.

This reader correction proves only typed coverage boundaries. The observer remains preparation for future measurement and establishes no historical writer, gameplay correction, turn-517 ancestry, or campaign acceptance.
